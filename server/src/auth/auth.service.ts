import { randomInt } from 'crypto'
import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import bcrypt from 'bcryptjs'
import { UserStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from '../users/users.service'
import { AuditService } from '../common/audit/audit.service'
import { RateLimitService } from '../common/rate-limit/rate-limit.service'
import { JwtPayload } from './types/jwt-payload.interface'
import { OtpInvalidException } from './exceptions/otp-invalid.exception'
import { OtpExpiredException } from './exceptions/otp-expired.exception'
import { EmailAlreadyVerifiedException } from './exceptions/email-already-verified.exception'

const OTP_TTL_MS = 10 * 60 * 1000      // 10 phut
const OTP_RATE_LIMIT = 3               // 3 lan
const OTP_RATE_WINDOW_MS = 60 * 60 * 1000  // trong 1 gio
const OTP_MAX_ATTEMPTS = 5

export interface LoginResult {
  accessToken: string
  user: {
    userId: string
    email: string
    fullName: string
    roles: string[]
    staffId?: string   // ◄── Thêm trường này vào interface kết quả trả về
    memberId?: string  // ◄── Thêm trường này vào interface kết quả trả về
  }
}

/** Context HTTP de ghi audit (IP, User-Agent). */
export interface RequestContext {
  ip?: string
  userAgent?: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly rateLimit: RateLimitService,
  ) {}

  // ---------------------------------------------------------------------------
  // UC00 — Dang nhap
  // ---------------------------------------------------------------------------

  async login(email: string, password: string, ctx: RequestContext = {}): Promise<LoginResult> {
    const user = await this.users.findByEmailWithRoles(email)

    // Email khong ton tai — anti-enumeration: cung message voi sai password
    if (!user) {
      await this.audit.log({
        action: 'auth.login',
        resourceType: 'auth',
        afterData: { success: false, reason: 'invalid_credentials', email_attempted: email },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }

    // Kiem tra password TRUOC khi check status (spec §3.1 thu tu WHEN-THEN)
    const passwordOk = await bcrypt.compare(password, user.passwordHash)
    if (!passwordOk) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.login',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { success: false, reason: 'invalid_credentials' },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }

    if (user.status === UserStatus.locked) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.login',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { success: false, reason: 'user_disabled' },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedException('Tài khoản đã bị khoá')
    }

    if (user.status === UserStatus.pending_verification) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.login',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { success: false, reason: 'email_not_verified' },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedException('Tài khoản chưa xác thực email')
    }

    // 1. TỰ ĐỘNG TRA CỨU: Tìm kiếm song song dữ liệu liên quan dưới DB từ userId
    const [staff, memberRecord] = await Promise.all([
      this.prisma.staff.findFirst({ where: { userId: user.userId, deletedAt: null } }),
      this.prisma.member.findFirst({ where: { userId: user.userId, deletedAt: null } })
    ])

    // 2. NẠP DỮ LIỆU VÀO PAYLOAD: Đóng gói thêm staffId và memberId (đổi sang string để JWT hiểu)
    const payload: JwtPayload = {
      sub: user.userId.toString(),
      email: user.email,
      roles: user.roles,
      staffId: staff?.staffId ? staff.staffId.toString() : undefined,
      memberId: memberRecord?.memberId ? memberRecord.memberId.toString() : undefined,
    }
    const accessToken = await this.jwt.signAsync(payload)

    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.login',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { success: true },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })

    // 3. TRẢ VỀ RESPONSE: Trả thêm dữ liệu phẳng ra ngoài object user nếu client muốn dùng trực tiếp
    return {
      accessToken,
      user: {
        userId: user.userId.toString(),
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        staffId: staff?.staffId ? staff.staffId.toString() : undefined,
        memberId: memberRecord?.memberId ? memberRecord.memberId.toString() : undefined,
      },
    }
  }

  // ---------------------------------------------------------------------------
  // UC02 — Quen mat khau: yeu cau OTP
  // ---------------------------------------------------------------------------

  async forgotPassword(email: string, ctx: RequestContext = {}): Promise<{ message: string }> {
    const MSG = 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi'

    const user = await this.users.findByEmailWithRoles(email)
    if (!user) {
      // Anti-enumeration: khong tiet lo email co ton tai hay khong
      await this.audit.log({
        action: 'auth.password-reset',
        resourceType: 'auth',
        afterData: { step: 'request', email_attempted: email },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return { message: MSG }
    }

    // Rate limit: 3 request/gio/email (in-memory, single-instance)
    if (!this.rateLimit.isAllowed(`forgot-password:${email}`, OTP_RATE_LIMIT, OTP_RATE_WINDOW_MS)) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.password-reset',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { step: 'request', rate_limited: true },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return { message: MSG } // 200 silently, anti-enumeration
    }

    const otp = randomInt(100000, 1000000).toString()
    const codeHash = await bcrypt.hash(otp, 10)
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)

    // Single-active OTP invariant: DELETE cu roi INSERT moi trong 1 transaction
    await this.prisma.$transaction([
      this.prisma.otpCode.deleteMany({
        where: { userId: user.userId, purpose: 'password_reset' },
      }),
      this.prisma.otpCode.create({
        data: { userId: user.userId, codeHash, purpose: 'password_reset', expiresAt },
      }),
    ])

    // TODO: gui OTP qua email khi SMTP duoc cau hinh (Architecture §8 R8)
    this.logger.log(`[forgotPassword] OTP cho ${email}: ${otp}`)

    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.password-reset',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { step: 'request' },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })

    return { message: MSG }
  }

  // ---------------------------------------------------------------------------
  // UC02 — Dat lai mat khau bang OTP
  // ---------------------------------------------------------------------------

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
    ctx: RequestContext = {},
  ): Promise<void> {
    const INVALID_MSG = 'OTP không hợp lệ hoặc đã hết hạn'

    const user = await this.users.findByEmailWithRoles(email)
    if (!user) throw new UnauthorizedException(INVALID_MSG)

    const record = await this.prisma.otpCode.findFirst({
      where: { userId: user.userId, purpose: 'password_reset', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!record) throw new UnauthorizedException(INVALID_MSG)

    const valid = await bcrypt.compare(otp, record.codeHash)
    if (!valid) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.password-reset',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { step: 'complete', success: false },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedException(INVALID_MSG)
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { userId: user.userId }, data: { passwordHash } }),
      // Chi xoa OTP purpose='password_reset', giu nguyen OTP khac neu co
      this.prisma.otpCode.deleteMany({ where: { userId: user.userId, purpose: 'password_reset' } }),
    ])

    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.password-reset',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { step: 'complete', success: true },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })
  }

  // ---------------------------------------------------------------------------
  // UC13 — Xac thuc email lan dau (verify-email)
  // ---------------------------------------------------------------------------

  async verifyEmail(email: string, otp: string, ctx: RequestContext = {}): Promise<void> {
    const user = await this.users.findByEmailWithRoles(email)
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản hoặc mã OTP không hợp lệ')
    }

    // Da xac thuc roi
    if (user.emailVerifiedAt !== null) {
      throw new EmailAlreadyVerifiedException()
    }

    const record = await this.prisma.otpCode.findFirst({
      where: { userId: user.userId, purpose: 'email_verify' },
      orderBy: { createdAt: 'desc' },
    })
    if (!record) {
      throw new NotFoundException('Không tìm thấy mã OTP, vui lòng yêu cầu gửi lại')
    }

    // OTP het han
    if (record.expiresAt <= new Date()) {
      throw new OtpExpiredException()
    }

    // Vuot qua so lan thu toi da — force resend
    if (record.attemptCount >= OTP_MAX_ATTEMPTS) {
      await this.prisma.otpCode.delete({ where: { id: record.id } })
      throw new OtpExpiredException()
    }

    // Sai OTP — tang attempt count
    const valid = await bcrypt.compare(otp, record.codeHash)
    if (!valid) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { attemptCount: { increment: 1 } },
      })
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.email-verify',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { success: false, attempt_count: record.attemptCount + 1 },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new OtpInvalidException()
    }

    // Thanh cong: active user + xoa OTP trong 1 transaction
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { userId: user.userId },
        data: {
          status: UserStatus.active,
          emailVerifiedAt: new Date(),
        },
      }),
      this.prisma.otpCode.deleteMany({
        where: { userId: user.userId, purpose: 'email_verify' },
      }),
    ])

    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.email-verify',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { success: true },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })
  }

  // ---------------------------------------------------------------------------
  // UC13 — Gui lai OTP xac thuc email
  // ---------------------------------------------------------------------------

  async resendVerify(email: string, ctx: RequestContext = {}): Promise<{ message: string }> {
    const MSG = 'Nếu email tồn tại và chưa xác thực, mã OTP mới đã được gửi'

    const user = await this.users.findByEmailWithRoles(email)
    if (!user) return { message: MSG }

    // Da xac thuc roi — tra ve binh thuong, khong tiet lo thong tin
    if (user.emailVerifiedAt !== null) return { message: MSG }

    // Rate limit: 3 request/gio/email
    if (!this.rateLimit.isAllowed(`resend-verify:${email}`, OTP_RATE_LIMIT, OTP_RATE_WINDOW_MS)) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.email-verify',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { step: 'resend', rate_limited: true },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return { message: MSG }
    }

    const otp = randomInt(100000, 1000000).toString()
    const codeHash = await bcrypt.hash(otp, 10)
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)

    // Single-active OTP invariant: xoa cu, tao moi, reset attempt_count
    await this.prisma.$transaction([
      this.prisma.otpCode.deleteMany({
        where: { userId: user.userId, purpose: 'email_verify' },
      }),
      this.prisma.otpCode.create({
        data: {
          userId: user.userId,
          codeHash,
          purpose: 'email_verify',
          expiresAt,
          attemptCount: 0,
        },
      }),
    ])

    // TODO: gui OTP qua email khi SMTP duoc cau hinh (Architecture §8 R8)
    this.logger.log(`[resendVerify] OTP cho ${email}: ${otp}`)

    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.email-verify',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { step: 'resend', email_attempted: email },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })

    return { message: MSG }
  }
}

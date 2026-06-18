import { randomInt } from 'crypto'
import { Injectable, Logger, NotFoundException, UnauthorizedException, InternalServerErrorException, ForbiddenException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import bcrypt from 'bcryptjs'
import { UserStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService, UserWithRoles } from './users.service'
import { AuditService } from '../common/audit/audit.service'
import { RateLimitService } from '../common/rate-limit/rate-limit.service'
import { OtpStoreService } from '../common/otp-store/otp-store.service'
import { JwtPayload } from './types/jwt-payload.interface'
import { OtpInvalidException } from './exceptions/otp-invalid.exception'
import { OtpExpiredException } from './exceptions/otp-expired.exception'
import { EmailAlreadyVerifiedException } from './exceptions/email-already-verified.exception'

interface LineProfile {
  sub: string
  name: string
  email?: string
  picture?: string
}

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
    private readonly config: ConfigService,
    private readonly otpStore: OtpStoreService,
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
    if (!user.passwordHash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }
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

    // Tài khoản nhân sự được tạo bởi owner có mật khẩu mặc định, status pending_verification.
    // Lần đăng nhập đầu tiên thành công → kích hoạt tài khoản thay vì block.
    if (user.status === UserStatus.pending_verification) {
      await this.prisma.user.update({
        where: { userId: user.userId },
        data: { status: UserStatus.active, emailVerifiedAt: new Date() },
      })
      user.status = UserStatus.active
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

    this.otpStore.set(user.userId, 'password_reset', codeHash, OTP_TTL_MS)

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

    const devOtp = process.env.NODE_ENV !== 'production' ? otp : undefined
    return { message: MSG, ...(devOtp && { devOtp }) }
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

    const entry = this.otpStore.get(user.userId, 'password_reset')
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) this.otpStore.delete(user.userId, 'password_reset')
      throw new UnauthorizedException(INVALID_MSG)
    }

    const valid = await bcrypt.compare(otp, entry.codeHash)
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
    await this.prisma.user.update({ where: { userId: user.userId }, data: { passwordHash } })
    this.otpStore.delete(user.userId, 'password_reset')

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

    const entry = this.otpStore.get(user.userId, 'email_verify')
    if (!entry) {
      throw new NotFoundException('Không tìm thấy mã OTP, vui lòng yêu cầu gửi lại')
    }

    // OTP het han
    if (entry.expiresAt <= Date.now()) {
      this.otpStore.delete(user.userId, 'email_verify')
      throw new OtpExpiredException()
    }

    // Vuot qua so lan thu toi da — force resend
    if (entry.attemptCount >= OTP_MAX_ATTEMPTS) {
      this.otpStore.delete(user.userId, 'email_verify')
      throw new OtpExpiredException()
    }

    // Sai OTP — tang attempt count
    const valid = await bcrypt.compare(otp, entry.codeHash)
    if (!valid) {
      this.otpStore.incrementAttempts(user.userId, 'email_verify')
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.email-verify',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { success: false, attempt_count: entry.attemptCount + 1 },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new OtpInvalidException()
    }

    // Thanh cong: active user + xoa OTP
    await this.prisma.user.update({
      where: { userId: user.userId },
      data: { status: UserStatus.active, emailVerifiedAt: new Date() },
    })
    this.otpStore.delete(user.userId, 'email_verify')

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

    this.otpStore.set(user.userId, 'email_verify', codeHash, OTP_TTL_MS)

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

    const devOtp = process.env.NODE_ENV !== 'production' ? otp : undefined
    return { message: MSG, ...(devOtp && { devOtp }) }
  }

  // ---------------------------------------------------------------------------
  // LINE LIFF Login
  // ---------------------------------------------------------------------------

  async lineLogin(idToken: string, ctx: RequestContext = {}): Promise<LoginResult> {
    const profile = await this.verifyLineToken(idToken)

    // 1. Tim theo lineId
    let user = await this.users.findByLineIdWithRoles(profile.sub)

    // 2. Link theo email neu chua co lineId
    if (!user && profile.email) {
      const byEmail = await this.users.findByEmailWithRoles(profile.email)
      if (byEmail) {
        await this.prisma.user.update({
          where: { userId: byEmail.userId },
          data: { lineId: profile.sub },
        })
        user = { ...byEmail, lineId: profile.sub }
      }
    }

    // 3. Tao moi neu chua co tai khoan
    if (!user) {
      user = await this.createMemberFromLine(profile)
    }

    // 4. LINE login chi danh cho member
    if (user.roles.length === 0 || !user.roles.every((r) => r === 'member')) {
      throw new ForbiddenException({
        success: false,
        code: 'LINE_LOGIN_MEMBER_ONLY',
        message: 'Đăng nhập LINE chỉ dành cho Hội viên',
      })
    }

    // LINE auth = danh tinh da xac thuc qua LINE — khong yeu cau emailVerifiedAt (pending_verification duoc phep)
    // 5. Kiem tra status
    if (user.status === UserStatus.locked) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.line-login',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { success: false, reason: 'user_locked' },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedException({
        success: false,
        code: 'ACCOUNT_LOCKED',
        message: 'Tài khoản đã bị khoá',
      })
    }

    // 6. Issue JWT, including profile ids so Self-owned endpoints can enforce access.
    const [staff, memberRecord] = await Promise.all([
      this.prisma.staff.findFirst({ where: { userId: user.userId, deletedAt: null } }),
      this.prisma.member.findFirst({ where: { userId: user.userId, deletedAt: null } }),
    ])
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
      action: 'auth.line-login',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { success: true },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })

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

  private async verifyLineToken(idToken: string): Promise<LineProfile> {
    const channelId = this.config.get<string>('LINE_CHANNEL_ID')
    if (!channelId) {
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_AUTH_FAILED',
        message: 'LINE login chưa được cấu hình trên server',
      })
    }

    const body = new URLSearchParams({ id_token: idToken, client_id: channelId })
    let res: Response
    try {
      res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
    } catch {
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_AUTH_FAILED',
        message: 'Không thể kết nối đến LINE API',
      })
    }

    if (!res.ok) {
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_AUTH_FAILED',
        message: 'LINE ID token không hợp lệ hoặc đã hết hạn',
      })
    }

    let data: { sub: string; name?: string; email?: string; picture?: string }
    try {
      data = await res.json() as { sub: string; name?: string; email?: string; picture?: string }
    } catch {
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_AUTH_FAILED',
        message: 'LINE ID token không hợp lệ hoặc đã hết hạn',
      })
    }
    return { sub: data.sub, name: data.name ?? 'LINE User', email: data.email, picture: data.picture }
  }

  private async createMemberFromLine(profile: LineProfile): Promise<UserWithRoles> {
    const memberCode = await this.generateLineMemberCode()
    const email = profile.email ?? `line_${profile.sub}@line.local`

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            fullName: profile.name,
            passwordHash: null,
            lineId: profile.sub,
            status: UserStatus.active,
            emailVerifiedAt: new Date(),
          },
        })
        await tx.member.create({ data: { userId: user.userId, memberCode } })
        const memberGroup = await tx.group.findUnique({ where: { name: 'member' } })
        if (memberGroup) {
          await tx.userGroup.create({ data: { userId: user.userId, groupId: memberGroup.groupId } })
        }
        return { ...user, roles: ['member' as const] }
      })
    } catch (err) {
      // Race condition: concurrent request tao cung user (trung email hoac lineId)
      if ((err as { code?: string }).code === 'P2002') {
        if (profile.email) {
          const byEmail = await this.users.findByEmailWithRoles(profile.email)
          if (byEmail) return byEmail
        }
        const byLineId = await this.users.findByLineIdWithRoles(profile.sub)
        if (byLineId) return byLineId
      }
      throw err
    }
  }

  private async generateLineMemberCode(): Promise<string> {
    const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 4)
    for (let attempt = 0; attempt < 10; attempt++) {
      const count = await this.prisma.member.count({ where: { deletedAt: null } })
      const seq = String(count + 1 + attempt).padStart(6, '0')
      const code = `MEM-${year}-${seq}`
      const existing = await this.prisma.member.findFirst({ where: { memberCode: code } })
      if (!existing) return code
    }
    throw new InternalServerErrorException({
      success: false,
      code: 'MEMBER_CODE_GENERATION_FAILED',
      message: 'Không thể tạo memberCode sau 10 lần thử',
    })
  }

  // ---------------------------------------------------------------------------
  // Change password (authenticated user đổi mật khẩu của chính mình)
  // ---------------------------------------------------------------------------

  async changePassword(userId: bigint, currentPassword: string, newPassword: string, ctx: RequestContext = {}): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { userId } })
    if (!user || !user.passwordHash) throw new UnauthorizedException('Không tìm thấy tài khoản')

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) throw new UnauthorizedException('Mật khẩu hiện tại không đúng')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await this.prisma.user.update({ where: { userId }, data: { passwordHash } })

    await this.audit.log({
      actorUserId: userId,
      action: 'auth.change-password',
      resourceType: 'auth',
      resourceId: userId.toString(),
      afterData: { success: true },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })
  }
}

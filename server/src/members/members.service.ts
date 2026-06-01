import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { Member, Prisma, UserStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../common/audit/audit.service'
import { CreateMemberDto } from './dto/create-member.dto'
import { SelfRegisterDto } from './dto/self-register.dto'
import { ListMembersDto } from './dto/list-members.dto'
import { UpdateMemberDto } from './dto/update-member.dto'
import bcrypt from 'bcryptjs'

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** UC03A — Staff tạo hội viên tại quầy, thanh toán ngay */
  async createMember(dto: CreateMemberDto, actorUserId: bigint) {
    const pkg = await this.prisma.package.findFirst({
      where: { packageId: BigInt(dto.packageId), status: 'active', deletedAt: null },
    })
    if (!pkg) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Gói tập không tồn tại hoặc đã ngừng kinh doanh' })

    const existing = await this.prisma.user.findFirst({ where: { email: dto.email, deletedAt: null } })
    if (existing) throw new ConflictException({ success: false, code: 'DUPLICATE_VALUE', message: 'Email đã được sử dụng' })

    const memberCode = await this.generateMemberCode()
    const passwordHash = await bcrypt.hash(dto.password, 10)
    const today = todayVN()
    const endDate = addDays(today, pkg.durationDays - 1)

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            fullName: dto.fullName,
            phone: dto.phone,
            status: UserStatus.active,
            emailVerifiedAt: new Date(),
          },
        })

        const member = await tx.member.create({
          data: {
            userId: user.userId,
            memberCode,
            dateOfBirth: new Date(dto.dateOfBirth),
            address: dto.address,
          },
        })

        const memberGroup = await tx.group.findUnique({ where: { name: 'member' } })
        if (memberGroup) {
          await tx.userGroup.create({ data: { userId: user.userId, groupId: memberGroup.groupId } })
        }

        const subscription = await tx.subscription.create({
          data: {
            memberId: member.memberId,
            packageId: pkg.packageId,
            startDate: today,
            endDate,
            status: 'active',
          },
        })

        const payment = await tx.payment.create({
          data: {
            memberId: member.memberId,
            subscriptionId: subscription.subscriptionId,
            amount: pkg.price,
            method: dto.paymentMethod,
            status: 'success',
            transactionReference: dto.transactionReference,
            paidAt: new Date(),
          },
        })

        return { user, member, subscription, payment }
      })

      this.audit.log({
        actorUserId,
        action: 'member.create',
        resourceType: 'member',
        resourceId: result.member.memberId.toString(),
        afterData: { memberCode, email: dto.email, packageId: dto.packageId } as unknown as Record<string, unknown>,
      })

      return { data: this.serializeMember(result.member, result.user) }
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException({ success: false, code: 'DUPLICATE_VALUE', message: 'Email đã được sử dụng' })
      }
      throw err
    }
  }

  /** UC03B — Member tự đăng ký online, chờ verify email rồi mới thanh toán */
  async selfRegister(dto: SelfRegisterDto) {
    const pkg = await this.prisma.package.findFirst({
      where: { packageId: BigInt(dto.packageId), status: 'active', deletedAt: null },
    })
    if (!pkg) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Gói tập không tồn tại hoặc đã ngừng kinh doanh' })

    const existing = await this.prisma.user.findFirst({ where: { email: dto.email, deletedAt: null } })
    if (existing) throw new ConflictException({ success: false, code: 'DUPLICATE_VALUE', message: 'Email đã được sử dụng' })

    const memberCode = await this.generateMemberCode()
    const passwordHash = await bcrypt.hash(dto.password, 10)
    const today = todayVN()
    const endDate = addDays(today, pkg.durationDays - 1)

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            fullName: dto.fullName,
            phone: dto.phone,
            status: UserStatus.pending_verification,
          },
        })

        const member = await tx.member.create({
          data: {
            userId: user.userId,
            memberCode,
            dateOfBirth: new Date(dto.dateOfBirth),
            address: dto.address,
          },
        })

        const memberGroup = await tx.group.findUnique({ where: { name: 'member' } })
        if (memberGroup) {
          await tx.userGroup.create({ data: { userId: user.userId, groupId: memberGroup.groupId } })
        }

        const subscription = await tx.subscription.create({
          data: {
            memberId: member.memberId,
            packageId: pkg.packageId,
            startDate: today,
            endDate,
            status: 'pending',
          },
        })

        // Single-active OTP: xóa OTP cũ trước khi tạo mới
        await tx.otpCode.deleteMany({ where: { userId: user.userId, purpose: 'email_verify' } })
        const otpRaw = Math.floor(100000 + Math.random() * 900000).toString()
        const otpHash = await bcrypt.hash(otpRaw, 10)
        await tx.otpCode.create({
          data: {
            userId: user.userId,
            purpose: 'email_verify',
            codeHash: otpHash,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        })

        console.log(`[DEV] OTP email_verify for ${dto.email}: ${otpRaw}`)
        return { user, member, subscription }
      })

      return { data: this.serializeMember(result.member, result.user) }
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException({ success: false, code: 'DUPLICATE_VALUE', message: 'Email đã được sử dụng' })
      }
      throw err
    }
  }

  async listMembers(dto: ListMembersDto) {
    const { page = 1, pageSize = 20, search, status, sort = 'created_at:desc' } = dto

    const where: Prisma.MemberWhereInput = { deletedAt: null }

    if (status || search) {
      where.user = {}
      if (status) where.user.status = status
      if (search) {
        where.user.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
        where.OR = [
          { memberCode: { contains: search, mode: 'insensitive' } },
        ]
      }
    }

    const [sortField, sortDir] = sort.split(':')
    const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => (c as string).toUpperCase())
    const orderBy = { [toCamel(sortField ?? 'createdAt')]: sortDir === 'asc' ? 'asc' : 'desc' } as Prisma.MemberOrderByWithRelationInput

    const [data, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        include: {
          user: true,
          subscriptions: {
            where: { status: 'active', deletedAt: null },
            take: 1,
            include: { package: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      this.prisma.member.count({ where }),
    ])

    return {
      data: data.map((m) => this.serializeMemberWithSub(m)),
      meta: { page, pageSize, total },
    }
  }

  async getMember(memberId: bigint) {
    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      include: {
        user: true,
        primaryTrainer: { include: { user: true } },
        subscriptions: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { package: true },
        },
      },
    })
    if (!member) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Hội viên không tồn tại' })

    return { data: this.serializeMemberDetail(member) }
  }

  async updateMember(memberId: bigint, dto: UpdateMemberDto, actorUserId: bigint) {
    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      include: { user: true },
    })
    if (!member) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Hội viên không tồn tại' })

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = dto.fullName !== undefined || dto.phone !== undefined
        ? await tx.user.update({
            where: { userId: member.userId },
            data: {
              ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
              ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
            },
          })
        : member.user

      const updatedMember = dto.dateOfBirth !== undefined || dto.address !== undefined
        ? await tx.member.update({
            where: { memberId },
            data: {
              ...(dto.dateOfBirth !== undefined ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
              ...(dto.address !== undefined ? { address: dto.address } : {}),
            },
          })
        : member

      return { member: updatedMember, user }
    })

    this.audit.log({
      actorUserId,
      action: 'member.update',
      resourceType: 'member',
      resourceId: memberId.toString(),
      beforeData: { fullName: member.user.fullName, phone: member.user.phone } as unknown as Record<string, unknown>,
      afterData: dto as unknown as Record<string, unknown>,
    })

    return { data: this.serializeMember(updated.member, updated.user) }
  }

  async deleteMember(memberId: bigint, actorUserId: bigint) {
    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      include: { user: true },
    })
    if (!member) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Hội viên không tồn tại' })

    const now = new Date()
    await this.prisma.$transaction([
      this.prisma.member.update({ where: { memberId }, data: { deletedAt: now } }),
      this.prisma.user.update({ where: { userId: member.userId }, data: { deletedAt: now } }),
    ])

    this.audit.log({
      actorUserId,
      action: 'member.delete',
      resourceType: 'member',
      resourceId: memberId.toString(),
      beforeData: { memberCode: member.memberCode, email: member.user.email } as unknown as Record<string, unknown>,
    })
  }

  async assignTrainer(memberId: bigint, trainerId: number | null | undefined, actorUserId: bigint) {
    const member = await this.prisma.member.findFirst({ where: { memberId, deletedAt: null } })
    if (!member) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Hội viên không tồn tại' })

    if (trainerId != null) {
      const trainer = await this.prisma.staff.findFirst({
        where: { staffId: BigInt(trainerId), deletedAt: null, position: 'trainer' },
      })
      if (!trainer) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'PT không tồn tại' })
    }

    const updated = await this.prisma.member.update({
      where: { memberId },
      data: { primaryTrainerId: trainerId != null ? BigInt(trainerId) : null },
    })

    this.audit.log({
      actorUserId,
      action: 'member.update',
      resourceType: 'member',
      resourceId: memberId.toString(),
      beforeData: { primaryTrainerId: member.primaryTrainerId?.toString() ?? null } as unknown as Record<string, unknown>,
      afterData: { primaryTrainerId: updated.primaryTrainerId?.toString() ?? null } as unknown as Record<string, unknown>,
    })

    return { data: { memberId: memberId.toString(), primaryTrainerId: updated.primaryTrainerId?.toString() ?? null } }
  }

  private async generateMemberCode(): Promise<string> {
    const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 4)
    for (let attempt = 0; attempt < 10; attempt++) {
      const count = await this.prisma.member.count({ where: { deletedAt: null } })
      const seq = String(count + 1 + attempt).padStart(6, '0')
      const code = `MEM-${year}-${seq}`
      const existing = await this.prisma.member.findUnique({ where: { memberCode: code } })
      if (!existing) return code
    }
    throw new InternalServerErrorException({ success: false, code: 'MEMBER_CODE_GENERATION_FAILED', message: 'Không thể tạo memberCode sau 10 lần thử' })
  }

  private serializeMember(member: Member, user: { fullName: string; email: string; phone: string | null; status: string }) {
    return {
      memberId: member.memberId.toString(),
      memberCode: member.memberCode,
      userId: member.userId.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      dateOfBirth: member.dateOfBirth,
      address: member.address,
      primaryTrainerId: member.primaryTrainerId?.toString() ?? null,
      createdAt: member.createdAt,
    }
  }

  private serializeMemberWithSub(member: Prisma.MemberGetPayload<{ include: { user: true; subscriptions: { include: { package: true } } } }>) {
    return {
      ...this.serializeMember(member, member.user),
      activeSubscription: member.subscriptions[0]
        ? {
            subscriptionId: member.subscriptions[0].subscriptionId.toString(),
            packageName: member.subscriptions[0].package.name,
            endDate: member.subscriptions[0].endDate,
            status: member.subscriptions[0].status,
          }
        : null,
    }
  }

  private serializeMemberDetail(member: Prisma.MemberGetPayload<{
    include: {
      user: true
      primaryTrainer: { include: { user: true } }
      subscriptions: { include: { package: true } }
    }
  }>) {
    return {
      ...this.serializeMember(member, member.user),
      primaryTrainer: member.primaryTrainer
        ? {
            staffId: member.primaryTrainer.staffId.toString(),
            staffCode: member.primaryTrainer.staffCode,
            fullName: member.primaryTrainer.user.fullName,
          }
        : null,
      subscriptions: member.subscriptions.map((s) => ({
        subscriptionId: s.subscriptionId.toString(),
        packageId: s.packageId.toString(),
        packageName: s.package.name,
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
        createdAt: s.createdAt,
      })),
    }
  }
}

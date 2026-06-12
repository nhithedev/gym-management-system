import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, SubscriptionStatus } from '@prisma/client'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateSubscriptionDto } from './dto/create-subscription.dto'
import { ListSubscriptionsDto } from './dto/list-subscriptions.dto'
import { SwitchSubscriptionDto } from './dto/switch-subscription.dto'

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isOwnerOrStaff(user: Pick<AuthenticatedUser, 'roles'>): boolean {
  return user.roles.some((r) => r === 'owner' || r === 'staff')
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createSubscription(dto: CreateSubscriptionDto, caller: AuthenticatedUser) {
    const memberId = BigInt(dto.memberId)
    const callerMemberId = await this.resolveCallerMemberId(caller)

    if (caller.roles.includes('member') && !isOwnerOrStaff(caller) && callerMemberId !== memberId) {
      throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Member chi duoc tao subscription cho chinh minh' })
    }

    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      include: { user: true },
    })
    if (!member) throw new BadRequestException({ success: false, code: 'FK_CONSTRAINT', message: 'Hoi vien khong ton tai' })

    if (!isOwnerOrStaff(caller) && !member.user.emailVerifiedAt) {
      throw new ForbiddenException({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Hoi vien chua xac thuc email' })
    }

    const pkg = await this.prisma.package.findFirst({
      where: { packageId: BigInt(dto.packageId), status: 'active', deletedAt: null },
    })
    if (!pkg) throw new BadRequestException({ success: false, code: 'FK_CONSTRAINT', message: 'Goi tap khong ton tai hoac da ngung kinh doanh' })

    const existingPending = await this.prisma.subscription.count({
      where: { memberId, status: SubscriptionStatus.pending, deletedAt: null },
    })
    if (existingPending > 0) {
      throw new ConflictException({
        success: false,
        code: 'SUBSCRIPTION_ALREADY_PENDING',
        message: 'Hoi vien da co subscription pending chua thanh toan',
      })
    }

    const today = todayVN()
    const activeSub = await this.prisma.subscription.findFirst({
      where: { memberId, status: SubscriptionStatus.active, deletedAt: null },
      orderBy: { endDate: 'desc' },
    })

    const startDate = activeSub ? addDays(activeSub.endDate, 1) : today
    const endDate = addDays(startDate, pkg.durationDays - 1)

    const subscription = await this.prisma.subscription.create({
      data: {
        memberId,
        packageId: pkg.packageId,
        startDate,
        endDate,
        status: SubscriptionStatus.pending,
      },
      include: { member: true, package: true },
    })

    this.audit.log({
      actorUserId: caller.userId,
      action: activeSub ? 'subscription.renew' : 'subscription.create',
      resourceType: 'subscription',
      resourceId: subscription.subscriptionId.toString(),
      afterData: {
        memberId: memberId.toString(),
        packageId: dto.packageId,
        startDate,
        endDate,
        status: 'pending',
      } as unknown as Record<string, unknown>,
    })

    return { data: this.serializeSubscription(subscription) }
  }

  async listSubscriptions(dto: ListSubscriptionsDto, caller: AuthenticatedUser) {
    const { page = 1, pageSize = 20, memberId, packageId, status, from, to, sort = 'created_at:desc' } = dto
    const where: Prisma.SubscriptionWhereInput = { deletedAt: null }

    if (packageId) where.packageId = BigInt(packageId)
    if (status) where.status = status
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
      }
    }

    if (isOwnerOrStaff(caller)) {
      if (memberId) where.memberId = BigInt(memberId)
    } else if (caller.roles.includes('member')) {
      const selfMemberId = await this.resolveCallerMemberId(caller)
      if (memberId && BigInt(memberId) !== selfMemberId) {
        throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Member chi duoc xem subscription cua chinh minh' })
      }
      where.memberId = selfMemberId
    } else if (caller.roles.includes('trainer')) {
      if (!caller.staffId) throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Khong tim thay staff profile' })
      if (memberId) {
        await this.assertTrainerOwnsMember(BigInt(memberId), caller.staffId)
        where.memberId = BigInt(memberId)
      } else {
        where.member = { primaryTrainerId: caller.staffId }
      }
    } else {
      throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Khong co quyen xem subscriptions' })
    }

    const orderBy = this.buildOrder(sort)
    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: { member: true, package: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      this.prisma.subscription.count({ where }),
    ])

    return {
      data: data.map((s) => this.serializeSubscription(s)),
      meta: { page, pageSize, totalItems: total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    }
  }

  async listByMember(memberId: bigint, caller: AuthenticatedUser) {
    return this.listSubscriptions({ memberId: Number(memberId), page: 1, pageSize: 100 }, caller)
  }

  async getSubscription(subscriptionId: bigint, caller: AuthenticatedUser) {
    const sub = await this.prisma.subscription.findFirst({
      where: { subscriptionId, deletedAt: null },
      include: { member: { include: { user: true } }, package: true },
    })
    if (!sub) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Subscription khong ton tai' })
    await this.assertCanAccessSubscription(sub.memberId, sub.member.userId, caller)
    return { data: this.serializeSubscription(sub) }
  }

  async cancelSubscription(subscriptionId: bigint, caller: AuthenticatedUser, reason?: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { subscriptionId, deletedAt: null },
      include: { member: { include: { user: true } }, package: true },
    })
    if (!sub || sub.status === SubscriptionStatus.cancelled || sub.status === SubscriptionStatus.expired) {
      throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Subscription khong ton tai' })
    }

    await this.assertCanAccessSubscription(sub.memberId, sub.member.userId, caller)

    if (sub.status !== SubscriptionStatus.active && sub.status !== SubscriptionStatus.pending) {
      throw new ConflictException({
        success: false,
        code: 'SUBSCRIPTION_NOT_CANCELLABLE',
        message: `Khong the huy subscription voi trang thai ${sub.status}`,
      })
    }

    const now = new Date()
    const result = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.subscription.update({
        where: { subscriptionId },
        data: { status: SubscriptionStatus.cancelled, cancelledAt: now },
        include: { package: true },
      })

      let activated: Prisma.SubscriptionGetPayload<{ include: { package: true } }> | null = null
      if (sub.status === SubscriptionStatus.active) {
        const pendingPrepaid = await tx.subscription.findFirst({
          where: {
            memberId: sub.memberId,
            status: SubscriptionStatus.pending,
            deletedAt: null,
            subscriptionId: { not: subscriptionId },
            payments: { some: { status: 'success' } },
          },
          include: { package: true },
          orderBy: { startDate: 'asc' },
        })

        if (pendingPrepaid) {
          const today = todayVN()
          const durationDays = pendingPrepaid.package?.durationDays
            ?? Math.max(1, Math.round((pendingPrepaid.endDate.getTime() - pendingPrepaid.startDate.getTime()) / 86400000) + 1)
          activated = await tx.subscription.update({
            where: { subscriptionId: pendingPrepaid.subscriptionId },
            data: {
              status: SubscriptionStatus.active,
              startDate: today,
              endDate: addDays(today, durationDays - 1),
            },
            include: { package: true },
          })
        }
      }

      return { cancelled, activated }
    })

    this.audit.log({
      actorUserId: caller.userId,
      action: 'subscription.cancel',
      resourceType: 'subscription',
      resourceId: subscriptionId.toString(),
      beforeData: { status: sub.status, reason } as unknown as Record<string, unknown>,
      afterData: { status: 'cancelled' } as unknown as Record<string, unknown>,
    })
    if (result.activated) {
      this.audit.log({
        actorUserId: caller.userId,
        action: 'subscription.activate',
        resourceType: 'subscription',
        resourceId: result.activated.subscriptionId.toString(),
        afterData: { status: 'active', activatedFrom: 'cascade_cancel' } as unknown as Record<string, unknown>,
      })
    }

    return {
      data: {
        cancelledSubscription: {
          subscriptionId: result.cancelled.subscriptionId.toString(),
          status: result.cancelled.status,
          cancelledAt: result.cancelled.cancelledAt,
        },
        activatedSubscription: result.activated
          ? {
              subscriptionId: result.activated.subscriptionId.toString(),
              status: result.activated.status,
              startDate: result.activated.startDate,
              endDate: result.activated.endDate,
            }
          : null,
      },
    }
  }

  async switchSubscription(
    subscriptionId: bigint,
    dto: SwitchSubscriptionDto,
    caller: AuthenticatedUser,
  ) {
    const sub = await this.prisma.subscription.findFirst({
      where: { subscriptionId, deletedAt: null },
      include: { member: { include: { user: true } }, package: true },
    })
    if (!sub) {
      throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Subscription khong ton tai' })
    }
    if (sub.status !== SubscriptionStatus.active) {
      throw new ConflictException({
        success: false,
        code: 'SUBSCRIPTION_NOT_ACTIVE',
        message: 'Chi co the chuyen goi dang hoat dong',
      })
    }
    await this.assertCanAccessSubscription(sub.memberId, sub.member.userId, caller)

    const newPkg = await this.prisma.package.findFirst({
      where: { packageId: BigInt(dto.newPackageId), status: 'active', deletedAt: null },
    })
    if (!newPkg) {
      throw new BadRequestException({
        success: false,
        code: 'PACKAGE_NOT_FOUND',
        message: 'Goi tap khong ton tai hoac da ngung kinh doanh',
      })
    }

    const today = todayVN()
    const endDate = addDays(today, newPkg.durationDays - 1)

    const newSub = await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { subscriptionId },
        data: { status: SubscriptionStatus.cancelled, cancelledAt: new Date() },
      })
      return tx.subscription.create({
        data: {
          memberId: sub.memberId,
          packageId: newPkg.packageId,
          startDate: today,
          endDate,
          status: SubscriptionStatus.active,
        },
        include: { package: true },
      })
    })

    this.audit.log({
      actorUserId: caller.userId,
      action: 'subscription.switch',
      resourceType: 'subscription',
      resourceId: newSub.subscriptionId.toString(),
      afterData: {
        from: subscriptionId.toString(),
        to: newSub.subscriptionId.toString(),
        newPackageId: dto.newPackageId,
      } as unknown as Record<string, unknown>,
    })

    return { data: this.serializeSubscription(newSub) }
  }

  private async assertCanAccessSubscription(memberId: bigint, memberUserId: bigint, caller: AuthenticatedUser) {
    if (isOwnerOrStaff(caller)) return
    if (caller.roles.includes('member') && (caller.userId === memberUserId || caller.memberId === memberId)) return
    if (caller.roles.includes('trainer') && caller.staffId) {
      await this.assertTrainerOwnsMember(memberId, caller.staffId)
      return
    }
    throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Khong co quyen truy cap subscription nay' })
  }

  private async assertTrainerOwnsMember(memberId: bigint, staffId: bigint) {
    const member = await this.prisma.member.findFirst({ where: { memberId, deletedAt: null } })
    if (!member || member.primaryTrainerId !== staffId) {
      throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'PT khong phu trach member nay' })
    }
  }

  private async resolveCallerMemberId(caller: AuthenticatedUser): Promise<bigint> {
    if (caller.memberId) return caller.memberId
    const member = await this.prisma.member.findFirst({ where: { userId: caller.userId, deletedAt: null } })
    if (!member) throw new ForbiddenException({ success: false, code: 'MEMBER_PROFILE_NOT_FOUND', message: 'Khong tim thay member profile' })
    return member.memberId
  }

  private buildOrder(sort: string): Prisma.SubscriptionOrderByWithRelationInput {
    const [field, dirRaw] = sort.split(':')
    const dir = dirRaw === 'asc' ? 'asc' : 'desc'
    if (field === 'start_date') return { startDate: dir }
    if (field === 'end_date') return { endDate: dir }
    return { createdAt: dir }
  }

  private serializeSubscription(sub: {
    subscriptionId: bigint
    memberId: bigint
    packageId: bigint
    startDate: Date
    endDate: Date
    status: string
    cancelledAt: Date | null
    deletedAt: Date | null
    createdAt: Date
    member?: { memberCode?: string | null }
    package?: { packageId?: bigint; packageCode?: string; name: string; durationDays: number; price: { toFixed: (n: number) => string } }
  }) {
    const today = todayVN()
    const daysLeft = sub.status === 'active'
      ? Math.max(0, Math.ceil((sub.endDate.getTime() - today.getTime()) / 86400000))
      : null

    return {
      subscriptionId: sub.subscriptionId.toString(),
      memberId: sub.memberId.toString(),
      memberCode: sub.member?.memberCode ?? null,
      packageId: sub.packageId.toString(),
      packageName: sub.package?.name ?? null,
      package: sub.package
        ? {
            packageId: (sub.package.packageId ?? sub.packageId).toString(),
            packageCode: sub.package.packageCode ?? null,
            name: sub.package.name,
            durationDays: sub.package.durationDays,
            price: sub.package.price.toFixed(2),
          }
        : null,
      startDate: sub.startDate,
      endDate: sub.endDate,
      status: sub.status,
      daysLeft,
      cancelledAt: sub.cancelledAt,
      createdAt: sub.createdAt,
    }
  }
}

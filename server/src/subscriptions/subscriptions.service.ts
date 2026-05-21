import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../common/audit/audit.service'
import { CreateSubscriptionDto } from './dto/create-subscription.dto'
import { type Role } from '../users/users.service'

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
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** UC04A — Tạo subscription mới (gia hạn) */
  async createSubscription(dto: CreateSubscriptionDto, actorUserId: bigint) {
    const member = await this.prisma.member.findFirst({
      where: { memberId: BigInt(dto.memberId), deletedAt: null },
    })
    if (!member) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Hội viên không tồn tại' })

    const pkg = await this.prisma.package.findFirst({
      where: { packageId: BigInt(dto.packageId), status: 'active', deletedAt: null },
    })
    if (!pkg) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Gói tập không tồn tại hoặc đã ngừng kinh doanh' })

    // Max 1 pending prepaid tại 1 thời điểm
    const existingPending = await this.prisma.subscription.count({
      where: { memberId: BigInt(dto.memberId), status: 'pending', deletedAt: null },
    })
    if (existingPending > 0) {
      throw new ConflictException({
        success: false,
        code: 'PENDING_SUBSCRIPTION_EXISTS',
        message: 'Hội viên đã có một gói đang chờ kích hoạt. Vui lòng hoàn tất thanh toán hoặc hủy gói đó trước.',
      })
    }

    // Tính startDate dựa vào gói active hiện tại
    const today = todayVN()
    const activeSub = await this.prisma.subscription.findFirst({
      where: { memberId: BigInt(dto.memberId), status: 'active', deletedAt: null },
      orderBy: { endDate: 'desc' },
    })

    const startDate = activeSub ? addDays(activeSub.endDate, 1) : today
    const endDate = addDays(startDate, pkg.durationDays - 1)

    const subscription = await this.prisma.subscription.create({
      data: {
        memberId: BigInt(dto.memberId),
        packageId: pkg.packageId,
        startDate,
        endDate,
        status: 'pending',
      },
      include: { package: true },
    })

    this.audit.log({
      actorUserId,
      action: 'subscription.create',
      resourceType: 'subscription',
      resourceId: subscription.subscriptionId.toString(),
      afterData: {
        memberId: dto.memberId,
        packageId: dto.packageId,
        startDate,
        endDate,
        status: 'pending',
      } as unknown as Record<string, unknown>,
    })

    return { data: this.serializeSubscription(subscription) }
  }

  /** UC04B — Hủy gói tập, cascade activate pending prepaid nếu có */
  async cancelSubscription(subscriptionId: bigint, actorUserId: bigint, callerRoles: Role[]) {
    const sub = await this.prisma.subscription.findFirst({
      where: { subscriptionId, deletedAt: null },
      include: { member: true },
    })
    if (!sub) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Subscription không tồn tại' })

    if (sub.status !== 'active' && sub.status !== 'pending') {
      throw new ConflictException({
        success: false,
        code: 'INVALID_SUBSCRIPTION_STATUS',
        message: `Không thể hủy subscription với trạng thái ${sub.status}`,
      })
    }

    // Member chỉ hủy được gói của chính mình (kiểm tra thêm ở controller nếu cần)
    const isStaffOrOwner = callerRoles.some((r) => r === 'owner' || r === 'staff')
    if (!isStaffOrOwner) {
      // Member role: cần verify actorUserId là user của member này
      const callerMember = await this.prisma.member.findFirst({
        where: { userId: actorUserId, deletedAt: null },
      })
      if (!callerMember || callerMember.memberId !== sub.memberId) {
        throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Không có quyền hủy gói của hội viên khác' })
      }
    }

    const now = new Date()

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { subscriptionId },
        data: { status: 'cancelled', cancelledAt: now },
      })

      this.audit.log({
        actorUserId,
        action: 'subscription.cancel',
        resourceType: 'subscription',
        resourceId: subscriptionId.toString(),
        beforeData: { status: sub.status } as unknown as Record<string, unknown>,
        afterData: { status: 'cancelled' } as unknown as Record<string, unknown>,
      })

      // Cascade: nếu có pending prepaid đã thanh toán thành công → activate ngay
      const pendingPrepaid = await tx.subscription.findFirst({
        where: {
          memberId: sub.memberId,
          status: 'pending',
          deletedAt: null,
          subscriptionId: { not: subscriptionId },
          payments: { some: { status: 'success' } },
        },
      })

      if (pendingPrepaid) {
        const today = todayVN()
        await tx.subscription.update({
          where: { subscriptionId: pendingPrepaid.subscriptionId },
          data: {
            status: 'active',
            startDate: today,
            endDate: addDays(today, (pendingPrepaid.endDate.getTime() - pendingPrepaid.startDate.getTime()) / 86400000),
          },
        })

        this.audit.log({
          actorUserId,
          action: 'subscription.activate',
          resourceType: 'subscription',
          resourceId: pendingPrepaid.subscriptionId.toString(),
          afterData: { status: 'active', activatedFrom: 'cascade_cancel' } as unknown as Record<string, unknown>,
        })
      }
    })
  }

  async getSubscription(subscriptionId: bigint) {
    const sub = await this.prisma.subscription.findFirst({
      where: { subscriptionId, deletedAt: null },
      include: { package: true },
    })
    if (!sub) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Subscription không tồn tại' })
    return { data: this.serializeSubscription(sub) }
  }

  async listByMember(memberId: bigint) {
    const member = await this.prisma.member.findFirst({ where: { memberId, deletedAt: null } })
    if (!member) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Hội viên không tồn tại' })

    const subs = await this.prisma.subscription.findMany({
      where: { memberId, deletedAt: null },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    })

    return { data: subs.map((s) => this.serializeSubscription(s)) }
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
    package?: { name: string; durationDays: number; price: { toFixed: (n: number) => string } }
  }) {
    const today = todayVN()
    const daysLeft = sub.status === 'active'
      ? Math.max(0, Math.ceil((sub.endDate.getTime() - today.getTime()) / 86400000))
      : null

    return {
      subscriptionId: sub.subscriptionId.toString(),
      memberId: sub.memberId.toString(),
      packageId: sub.packageId.toString(),
      packageName: sub.package?.name ?? null,
      startDate: sub.startDate,
      endDate: sub.endDate,
      status: sub.status,
      daysLeft,
      cancelledAt: sub.cancelledAt,
      createdAt: sub.createdAt,
    }
  }
}

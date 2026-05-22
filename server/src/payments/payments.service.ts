import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../common/audit/audit.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { ListPaymentsDto } from './dto/list-payments.dto'

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Ghi nhận thanh toán cho subscription đang pending → activate nếu startDate ≤ hôm nay */
  async createPayment(dto: CreatePaymentDto, actorUserId: bigint) {
    const sub = await this.prisma.subscription.findFirst({
      where: { subscriptionId: BigInt(dto.subscriptionId), deletedAt: null },
      include: { package: true },
    })
    if (!sub) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Subscription không tồn tại' })

    if (sub.status !== 'pending') {
      throw new ConflictException({
        success: false,
        code: 'INVALID_SUBSCRIPTION_STATUS',
        message: `Subscription đang ở trạng thái ${sub.status}, không cần thanh toán thêm`,
      })
    }

    const today = todayVN()
    const shouldActivate = sub.startDate <= today

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          memberId: sub.memberId,
          subscriptionId: sub.subscriptionId,
          amount: new Prisma.Decimal(dto.amount),
          method: dto.method,
          status: 'success',
          transactionReference: dto.transactionReference,
          paidAt: new Date(),
        },
      })

      if (shouldActivate) {
        await tx.subscription.update({
          where: { subscriptionId: sub.subscriptionId },
          data: { status: 'active' },
        })
      }

      return p
    })

    this.audit.log({
      actorUserId,
      action: 'payment.create',
      resourceType: 'payment',
      resourceId: payment.paymentId.toString(),
      afterData: {
        subscriptionId: dto.subscriptionId,
        amount: dto.amount,
        method: dto.method,
        activated: shouldActivate,
      } as unknown as Record<string, unknown>,
    })

    return {
      data: {
        paymentId: payment.paymentId.toString(),
        subscriptionId: sub.subscriptionId.toString(),
        memberId: sub.memberId.toString(),
        amount: payment.amount.toFixed(2),
        method: payment.method,
        status: payment.status,
        transactionReference: payment.transactionReference,
        paidAt: payment.paidAt,
        subscriptionActivated: shouldActivate,
      },
    }
  }

  async listPayments(dto: ListPaymentsDto) {
    const { page = 1, pageSize = 20, memberId, subscriptionId, status, dateFrom, dateTo } = dto

    const where: Prisma.PaymentWhereInput = {}
    if (memberId) where.memberId = BigInt(memberId)
    if (subscriptionId) where.subscriptionId = BigInt(subscriptionId)
    if (status) where.status = status
    if (dateFrom || dateTo) {
      where.paidAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59Z') } : {}),
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { subscription: { include: { package: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { paidAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ])

    return {
      data: data.map((p) => ({
        paymentId: p.paymentId.toString(),
        memberId: p.memberId.toString(),
        subscriptionId: p.subscriptionId.toString(),
        packageName: p.subscription.package.name,
        amount: p.amount.toFixed(2),
        method: p.method,
        status: p.status,
        transactionReference: p.transactionReference,
        paidAt: p.paidAt,
      })),
      meta: { page, pageSize, total },
    }
  }
}

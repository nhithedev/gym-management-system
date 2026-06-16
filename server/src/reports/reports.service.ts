import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import {
  FeedbackSeverity,
  FeedbackType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  TrainingSessionStatus,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

interface DateRange {
  from: string
  to: string
  start: Date
  endExclusive: Date
  startDate: Date
  endDate: Date
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async revenue(from?: string, to?: string, method?: string) {
    const range = this.parseRange(from, to)
    try {
      const payments = await this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.success,
          paidAt: { gte: range.start, lt: range.endExclusive },
          ...(method ? { method: method as PaymentMethod } : {}),
        },
        select: { paidAt: true, amount: true },
      })

      const byDate = new Map<string, Prisma.Decimal>()
      let total = new Prisma.Decimal(0)
      for (const payment of payments) {
        const date = this.vnDateKey(payment.paidAt)
        const next = (byDate.get(date) ?? new Prisma.Decimal(0)).add(payment.amount)
        byDate.set(date, next)
        total = total.add(payment.amount)
      }

      return {
        data: {
          total: this.formatDecimal(total),
          currency: 'VND',
          breakdown: [...byDate.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, amount]) => ({ date, amount: this.formatDecimal(amount) })),
        },
        meta: { from: range.from, to: range.to },
      }
    } catch (err) {
      this.logger.error('Revenue report failed', err as Error)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Loi khi tong hop bao cao',
      })
    }
  }

  async members(from?: string, to?: string) {
    const range = this.parseRange(from, to)
    try {
      const members = await this.prisma.member.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: range.start, lt: range.endExclusive },
        },
        select: { createdAt: true },
      })

      const byDate = new Map<string, number>()
      for (const member of members) {
        const date = this.vnDateKey(member.createdAt)
        byDate.set(date, (byDate.get(date) ?? 0) + 1)
      }

      return {
        data: {
          total: members.length,
          breakdown: [...byDate.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count })),
        },
        meta: { from: range.from, to: range.to },
      }
    } catch (err) {
      this.logger.error('Members report failed', err as Error)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Loi khi tong hop bao cao',
      })
    }
  }

  async renewals(from?: string, to?: string) {
    const range = this.parseRange(from, to)
    try {
      const expiring = await this.prisma.subscription.findMany({
        where: {
          endDate: { gte: range.startDate, lte: range.endDate },
          member: { deletedAt: null },
        },
        select: { memberId: true, endDate: true },
      })

      const maxEndByMember = new Map<string, Date>()
      for (const sub of expiring) {
        const key = sub.memberId.toString()
        const current = maxEndByMember.get(key)
        if (!current || sub.endDate > current) maxEndByMember.set(key, sub.endDate)
      }

      let renewed = 0
      for (const [memberId, maxEndDate] of maxEndByMember) {
        const next = await this.prisma.subscription.findFirst({
          where: {
            memberId: BigInt(memberId),
            startDate: { gt: maxEndDate },
          },
          select: { subscriptionId: true },
        })
        if (next) renewed += 1
      }

      const eligible = maxEndByMember.size
      const churned = eligible - renewed
      return {
        data: {
          renewed,
          churned,
          renewalRate: eligible === 0 ? null : Math.round((renewed / eligible) * 100) / 100,
        },
        meta: { from: range.from, to: range.to },
      }
    } catch (err) {
      this.logger.error('Renewals report failed', err as Error)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Loi khi tong hop bao cao',
      })
    }
  }

  async employeePerformance(from?: string, to?: string) {
    const range = this.parseRange(from, to)
    try {
      const staff = await this.prisma.staff.findMany({
        where: { deletedAt: null, NOT: { position: 'trainer' } },
        include: { user: true },
      })

      const rows = await Promise.all(
        staff.map(async (s) => {
          const [shiftsWorked, feedback] = await Promise.all([
            this.prisma.staffSchedule.count({
              where: {
                staffId: s.staffId,
                deletedAt: null,
                workDate: { gte: range.startDate, lte: range.endDate },
              },
            }),
            this.prisma.feedback.findMany({
              where: {
                subjectStaffId: s.staffId,
                feedbackType: FeedbackType.staff,
                deletedAt: null,
                createdAt: { gte: range.start, lt: range.endExclusive },
              },
              select: { severity: true },
            }),
          ])

          const avg =
            feedback.length === 0
              ? null
              : Math.round(
                  (feedback.reduce((sum, f) => sum + this.severityScore(f.severity), 0) /
                    feedback.length) *
                    100
                ) / 100

          return {
            staffId: s.staffId.toString(),
            staffCode: s.staffCode,
            fullName: s.user.fullName,
            position: s.position,
            shiftsWorked,
            avgFeedbackSeverityScore: avg,
          }
        })
      )

      return {
        data: rows.sort(
          (a, b) => b.shiftsWorked - a.shiftsWorked || Number(BigInt(a.staffId) - BigInt(b.staffId))
        ),
        meta: { from: range.from, to: range.to },
      }
    } catch (err) {
      this.logger.error('Employee performance report failed', err as Error)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Loi khi tong hop bao cao',
      })
    }
  }

  async staffPerformance(from?: string, to?: string, staffId?: string) {
    const range = this.parseRange(from, to)
    if (staffId && !/^\d+$/.test(staffId)) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'staffId khong hop le',
      })
    }

    try {
      const staff = await this.prisma.staff.findMany({
        where: {
          deletedAt: null,
          position: 'trainer',
          ...(staffId ? { staffId: BigInt(staffId) } : {}),
        },
        include: { user: true },
      })

      const rows = await Promise.all(
        staff.map(async (s) => {
          const [completedSessions, feedback] = await Promise.all([
            this.prisma.trainingSession.count({
              where: {
                trainerStaffId: s.staffId,
                status: TrainingSessionStatus.completed,
                deletedAt: null,
                startTime: { gte: range.start, lt: range.endExclusive },
              },
            }),
            this.prisma.feedback.findMany({
              where: {
                subjectStaffId: s.staffId,
                feedbackType: FeedbackType.staff,
                deletedAt: null,
                createdAt: { gte: range.start, lt: range.endExclusive },
              },
              select: { severity: true },
            }),
          ])

          const avg =
            feedback.length === 0
              ? null
              : Math.round(
                  (feedback.reduce((sum, f) => sum + this.severityScore(f.severity), 0) /
                    feedback.length) *
                    100
                ) / 100

          return {
            staffId: s.staffId.toString(),
            staffCode: s.staffCode,
            fullName: s.user.fullName,
            completedSessions,
            avgFeedbackSeverityScore: avg,
          }
        })
      )

      return {
        data: rows.sort(
          (a, b) =>
            b.completedSessions - a.completedSessions ||
            Number(BigInt(a.staffId) - BigInt(b.staffId))
        ),
        meta: { from: range.from, to: range.to },
      }
    } catch (err) {
      this.logger.error('Staff performance report failed', err as Error)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Loi khi tong hop bao cao',
      })
    }
  }

  async topPackages(from?: string, to?: string) {
    const range = this.parseRange(from, to)
    try {
      const grouped = await this.prisma.subscription.groupBy({
        by: ['packageId'],
        where: {
          createdAt: { gte: range.start, lt: range.endExclusive },
          deletedAt: null,
        },
        _count: { subscriptionId: true },
        orderBy: { _count: { subscriptionId: 'desc' } },
      })

      if (grouped.length === 0) {
        return { data: [], meta: { from: range.from, to: range.to } }
      }

      const packageIds = grouped.map((g) => g.packageId)
      const packages = await this.prisma.package.findMany({
        where: { packageId: { in: packageIds }, deletedAt: null },
        select: { packageId: true, name: true, price: true, durationDays: true },
      })

      const packageMap = new Map(packages.map((p) => [p.packageId.toString(), p]))

      return {
        data: grouped.map((g) => {
          const pkg = packageMap.get(g.packageId.toString())
          return {
            packageId: g.packageId.toString(),
            name: pkg?.name ?? '—',
            price: pkg ? this.formatDecimal(pkg.price) : '0',
            durationDays: pkg?.durationDays ?? 0,
            count: g._count.subscriptionId,
          }
        }),
        meta: { from: range.from, to: range.to },
      }
    } catch (err) {
      this.logger.error('Top packages report failed', err as Error)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Loi khi tong hop bao cao',
      })
    }
  }

  private parseRange(from?: string, to?: string): DateRange {
    if (!from || !to || !this.isDateOnly(from) || !this.isDateOnly(to)) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_DATE_RANGE',
        message: 'from/to phai co format YYYY-MM-DD',
      })
    }
    if (from > to) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_DATE_RANGE',
        message: 'from phai truoc hoac bang to',
      })
    }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
    if (to > today) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_DATE_RANGE',
        message: 'Ngày kết thúc không được vượt quá ngày hiện tại.',
      })
    }

    const start = new Date(`${from}T00:00:00+07:00`)
    const endExclusive = new Date(`${to}T00:00:00+07:00`)
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
    return {
      from,
      to,
      start,
      endExclusive,
      startDate: new Date(from),
      endDate: new Date(to),
    }
  }

  private isDateOnly(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const d = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
  }

  private vnDateKey(date: Date): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  }

  private formatDecimal(value: Prisma.Decimal): string {
    return value.toFixed(2).replace(/\.00$/, '')
  }

  private severityScore(severity: FeedbackSeverity): number {
    if (severity === FeedbackSeverity.high) return 3
    if (severity === FeedbackSeverity.medium) return 2
    return 1
  }
}

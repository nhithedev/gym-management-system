import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ReportQueryDto, StaffPerformanceQueryDto } from './dto/report-query.dto'

// Kiểu trả về từ raw query revenue/members
type RevenueRow = { date: Date; amount: Prisma.Decimal }
type MembersRow = { date: Date; count: bigint }
type StaffRow = {
  staff_id: bigint
  staff_code: string
  full_name: string
  completed_sessions: bigint
  avg_feedback_score: string | null
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  constructor(private readonly prisma: PrismaService) {}

  // Trả ngày hiện tại theo timezone Asia/Ho_Chi_Minh, format YYYY-MM-DD
  private todayVn(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  }

  // Validate BR-R01: format đã check ở DTO, chỉ cần check from<=to và to<=today_vn
  private validateDateRange(from: string, to: string): void {
    if (from > to) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_DATE_RANGE',
        message: 'from phải trước hoặc bằng to',
      })
    }
    if (to > this.todayVn()) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_DATE_RANGE',
        message: 'to không được vượt quá ngày hiện tại',
      })
    }
  }

  async getRevenue(dto: ReportQueryDto) {
    this.validateDateRange(dto.from, dto.to)

    try {
      const rows = await this.prisma.$queryRaw<RevenueRow[]>`
        SELECT
          DATE(paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
          SUM(amount)::text AS amount
        FROM payments
        WHERE status = 'success'
          AND paid_at >= ${dto.from}::date AT TIME ZONE 'Asia/Ho_Chi_Minh'
          AND paid_at <  (${dto.to}::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh'
        GROUP BY date
        ORDER BY date ASC
      `

      const breakdown = rows.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
        amount: String(r.amount),
      }))

      const total = breakdown
        .reduce((sum, r) => sum + parseFloat(r.amount), 0)
        .toFixed(0)

      return {
        data: { total, currency: 'VND', breakdown },
        meta: { from: dto.from, to: dto.to },
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.error('Revenue report query failed', err)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Lỗi khi tổng hợp báo cáo',
      })
    }
  }

  async getMembers(dto: ReportQueryDto) {
    this.validateDateRange(dto.from, dto.to)

    try {
      const rows = await this.prisma.$queryRaw<MembersRow[]>`
        SELECT
          DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
          COUNT(*) AS count
        FROM members
        WHERE deleted_at IS NULL
          AND created_at >= ${dto.from}::date AT TIME ZONE 'Asia/Ho_Chi_Minh'
          AND created_at <  (${dto.to}::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh'
        GROUP BY date
        ORDER BY date ASC
      `

      // COUNT(*) trả BigInt từ Prisma raw query — dùng Number() để convert
      const breakdown = rows.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
        count: Number(r.count),
      }))

      const total = breakdown.reduce((sum, r) => sum + r.count, 0)

      return {
        data: { total, breakdown },
        meta: { from: dto.from, to: dto.to },
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.error('Members report query failed', err)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Lỗi khi tổng hợp báo cáo',
      })
    }
  }

  async getRenewals(dto: ReportQueryDto) {
    this.validateDateRange(dto.from, dto.to)

    try {
      // Query 1: subscriptions hết hạn trong range (join member để filter deleted_at IS NULL)
      const expiredSubs = await this.prisma.subscription.findMany({
        where: {
          endDate: {
            gte: new Date(dto.from),
            lte: new Date(dto.to + 'T23:59:59.999Z'),
          },
          member: { deletedAt: null },
        },
        select: { memberId: true, endDate: true },
      })

      // Build Map: memberId → maxEndDate
      const memberMaxEnd = new Map<string, Date>()
      for (const sub of expiredSubs) {
        const key = sub.memberId.toString()
        const cur = memberMaxEnd.get(key)
        if (!cur || sub.endDate > cur) {
          memberMaxEnd.set(key, sub.endDate)
        }
      }

      const eligibleIds = [...memberMaxEnd.keys()].map((id) => BigInt(id))

      // Early return khi không có subscription hết hạn trong range
      if (eligibleIds.length === 0) {
        return {
          data: { renewed: 0, churned: 0, renewalRate: null },
          meta: { from: dto.from, to: dto.to },
        }
      }

      // Query 2: tất cả subscriptions của eligible members để check renewal
      const allSubs = await this.prisma.subscription.findMany({
        where: { memberId: { in: eligibleIds } },
        select: { memberId: true, startDate: true },
      })

      // Xác định members đã gia hạn: startDate > maxEndDate của subscription hết hạn trong range
      const renewedSet = new Set<string>()
      for (const sub of allSubs) {
        const key = sub.memberId.toString()
        const maxEnd = memberMaxEnd.get(key)
        if (maxEnd && sub.startDate > maxEnd) {
          renewedSet.add(key)
        }
      }

      const eligible = memberMaxEnd.size
      const renewed = renewedSet.size
      const churned = eligible - renewed
      const renewalRate = eligible === 0 ? null : Math.round((renewed / eligible) * 100) / 100

      return {
        data: { renewed, churned, renewalRate },
        meta: { from: dto.from, to: dto.to },
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.error('Renewals report query failed', err)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Lỗi khi tổng hợp báo cáo',
      })
    }
  }

  async getStaffPerformance(dto: StaffPerformanceQueryDto) {
    // Validate staffId format trước khi validate date range
    if (dto.staffId !== undefined) {
      if (!/^\d+$/.test(dto.staffId)) {
        throw new BadRequestException({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'staffId phải là số nguyên hợp lệ',
        })
      }
    }

    this.validateDateRange(dto.from, dto.to)

    try {
      const staffFilter = dto.staffId
        ? Prisma.sql`AND s.staff_id = ${BigInt(dto.staffId)}`
        : Prisma.empty

      const rows = await this.prisma.$queryRaw<StaffRow[]>`
        SELECT
          s.staff_id,
          s.staff_code,
          u.full_name,
          COALESCE(COUNT(DISTINCT ts.session_id) FILTER (WHERE ts.status = 'completed'), 0) AS completed_sessions,
          AVG(
            CASE f.severity
              WHEN 'low'    THEN 1
              WHEN 'medium' THEN 2
              WHEN 'high'   THEN 3
            END
          ) AS avg_feedback_score
        FROM staff s
        JOIN users u ON s.user_id = u.user_id
        LEFT JOIN training_sessions ts
          ON ts.trainer_staff_id = s.staff_id
          AND ts.status = 'completed'
          AND ts.start_time >= ${dto.from}::date AT TIME ZONE 'Asia/Ho_Chi_Minh'
          AND ts.start_time <  (${dto.to}::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh'
          AND ts.deleted_at IS NULL
        LEFT JOIN feedback f
          ON f.subject_staff_id = s.staff_id
          AND f.feedback_type = 'staff'
          AND f.created_at >= ${dto.from}::date AT TIME ZONE 'Asia/Ho_Chi_Minh'
          AND f.created_at <  (${dto.to}::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh'
          AND f.deleted_at IS NULL
        WHERE s.position = 'trainer'
          AND s.deleted_at IS NULL
          ${staffFilter}
        GROUP BY s.staff_id, s.staff_code, u.full_name
        ORDER BY completed_sessions DESC, s.staff_id ASC
      `

      const data = rows.map((r) => ({
        staffId: r.staff_id.toString(),
        staffCode: r.staff_code,
        fullName: r.full_name,
        completedSessions: Number(r.completed_sessions),
        // AVG trả Postgres numeric → Prisma raw map về string; null nếu không có feedback
        avgFeedbackSeverityScore:
          r.avg_feedback_score != null
            ? Math.round(parseFloat(r.avg_feedback_score.toString()) * 100) / 100
            : null,
      }))

      return {
        data,
        meta: { from: dto.from, to: dto.to },
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.error('Staff performance report query failed', err)
      throw new InternalServerErrorException({
        success: false,
        code: 'REPORT_QUERY_ERROR',
        message: 'Lỗi khi tổng hợp báo cáo',
      })
    }
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AttendanceMethod, Prisma, TrainingSessionStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../common/audit/audit.service'
import { type Role } from '../users/users.service'
import { ListSessionsDto } from './dto/list-sessions.dto'
import { CreateSessionDto } from './dto/create-session.dto'
import { UpdateSessionDto } from './dto/update-session.dto'
import { CancelSessionDto } from './dto/cancel-session.dto'
import { ListAttendanceLogsDto } from './dto/list-attendance.dto'
import { ManualCheckinDto } from './dto/manual-checkin.dto'
import { CheckoutDto } from './dto/checkout.dto'
import { CreateProgressDto } from './dto/create-progress.dto'

const SLA_DAYS: Record<string, number> = { high: 1, medium: 3, low: 7 }

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Training Sessions
  // ---------------------------------------------------------------------------

  async listSessions(dto: ListSessionsDto, caller: { userId: bigint; roles: Role[]; staffId?: bigint; memberId?: bigint }) {
    const { page = 1, pageSize = 20, memberId, trainerStaffId, roomId, status, from, to, sort = 'start_time:asc' } = dto
    const { roles, staffId } = caller

    const isMember = roles.includes('member')
    const isOwnerOrStaff = roles.some((r) => r === 'owner' || r === 'staff')
    const isPT = roles.includes('trainer')

    const where: Prisma.TrainingSessionWhereInput = { deletedAt: null }

    if (isMember) {
      // Self: tự động filter theo memberId của mình
      where.memberId = caller.memberId!
    } else if (isPT && !isOwnerOrStaff) {
      where.trainerStaffId = staffId!
      if (memberId) where.memberId = BigInt(memberId)
    } else {
      if (memberId) where.memberId = BigInt(memberId)
      if (trainerStaffId) where.trainerStaffId = BigInt(trainerStaffId)
    }

    if (roomId) where.roomId = BigInt(roomId)
    if (status) where.status = status
    if (from) where.startTime = { ...where.startTime as object, gte: new Date(from) }
    if (to) where.startTime = { ...where.startTime as object, lte: new Date(to) }

    const [sortField, sortDir] = sort.split(':')
    const orderBy = { [sortField === 'start_time' ? 'startTime' : sortField === 'end_time' ? 'endTime' : 'status']: sortDir === 'asc' ? 'asc' : 'desc' } as Prisma.TrainingSessionOrderByWithRelationInput

    const [data, total] = await Promise.all([
      this.prisma.trainingSession.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          member: { select: { memberId: true, user: { select: { fullName: true } } } },
          trainer: { select: { staffId: true, user: { select: { fullName: true } } } },
          room: { select: { roomId: true, name: true } },
        },
      }),
      this.prisma.trainingSession.count({ where }),
    ])

    return {
      data: data.map((s) => this.serializeSession(s)),
      meta: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) },
    }
  }

  async getSession(id: bigint, caller: { userId: bigint; roles: Role[]; staffId?: bigint; memberId?: bigint }) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { sessionId: id, deletedAt: null },
      include: {
        member: { select: { memberId: true, user: { select: { fullName: true } } } },
        trainer: { select: { staffId: true, user: { select: { fullName: true } } } },
        room: { select: { roomId: true, name: true } },
        attendanceLogs: true,
      },
    })
    if (!session) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Session không tồn tại' })

    this.checkSessionAccess(session, caller)
    return { data: this.serializeSession(session, true) }
  }

  async createSession(dto: CreateSessionDto, caller: { userId: bigint; roles: Role[]; staffId?: bigint; memberId?: bigint }) {
    const { roles, staffId } = caller
    const isOwnerOrStaff = roles.some((r) => r === 'owner' || r === 'staff')
    const isPT = roles.includes('trainer')

    const memberId = BigInt(dto.memberId)
    const roomId = BigInt(dto.roomId)
    const startTime = new Date(dto.startTime)
    const endTime = new Date(dto.endTime)

    if (endTime <= startTime) throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'endTime phải lớn hơn startTime' })

    const now = new Date()
    const graceTime = new Date(now.getTime() + 5 * 60 * 1000)
    if (startTime < graceTime) throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'startTime phải trong tương lai hoặc hiện tại + grace 5 phút' })

    const member = await this.prisma.member.findFirst({ where: { memberId, deletedAt: null } })
    if (!member) throw new BadRequestException({ success: false, code: 'FK_CONSTRAINT', message: 'Member không tồn tại' })

    const room = await this.prisma.gymRoom.findFirst({ where: { roomId } })
    if (!room) throw new BadRequestException({ success: false, code: 'FK_CONSTRAINT', message: 'Room không tồn tại' })

    let trainerStaffId = dto.trainerStaffId ? BigInt(dto.trainerStaffId) : staffId!
    if (!dto.trainerStaffId && isPT) trainerStaffId = staffId!

    if (isPT && member.primaryTrainerId !== staffId) {
      throw new ForbiddenException({ success: false, code: 'TRAINER_NOT_ASSIGNED', message: 'PT chỉ được tạo lịch cho member có primary trainer là mình' })
    }

    const trainer = await this.prisma.staff.findFirst({ where: { staffId: trainerStaffId, deletedAt: null } })
    if (!trainer) throw new BadRequestException({ success: false, code: 'FK_CONSTRAINT', message: 'Trainer không tồn tại' })

    const sessionDate = new Date(startTime)
    sessionDate.setHours(0, 0, 0, 0)
    const activeSub = await this.prisma.subscription.findFirst({
      where: { memberId, status: 'active', deletedAt: null, startDate: { lte: sessionDate }, endDate: { gte: sessionDate } },
    })
    if (!activeSub) throw new ConflictException({ success: false, code: 'MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION', message: 'Member không có subscription active tại ngày session' })

    await this.checkOverlap(roomId, null, startTime, endTime, 'ROOM_TIME_OVERLAP')
    await this.checkOverlap(null, trainerStaffId, startTime, endTime, 'TRAINER_TIME_OVERLAP')

    const session = await this.prisma.trainingSession.create({
      data: { memberId, trainerStaffId, roomId, startTime, endTime, status: TrainingSessionStatus.scheduled },
      include: {
        member: { select: { memberId: true, user: { select: { fullName: true } } } },
        trainer: { select: { staffId: true, user: { select: { fullName: true } } } },
        room: { select: { roomId: true, name: true } },
      },
    })

    this.audit.log({ actorUserId: caller.userId, action: 'training.create', resourceType: 'training_session', resourceId: session.sessionId.toString(), afterData: this.serializeSession(session) as unknown as Record<string, unknown> })

    return { data: this.serializeSession(session) }
  }

  async updateSession(id: bigint, dto: UpdateSessionDto, caller: { userId: bigint; roles: Role[]; staffId?: bigint; memberId?: bigint }) {
    const session = await this.prisma.trainingSession.findFirst({ where: { sessionId: id, deletedAt: null } })
    if (!session) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Session không tồn tại' })

    if (session.status === 'completed' || session.status === 'cancelled' || new Date() >= session.startTime) {
      throw new ConflictException({ success: false, code: 'SESSION_ALREADY_STARTED', message: 'Session đã bắt đầu hoặc hoàn tất, không thể sửa' })
    }

    const startTime = dto.startTime ? new Date(dto.startTime) : session.startTime
    const endTime = dto.endTime ? new Date(dto.endTime) : session.endTime
    if (endTime <= startTime) throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'endTime phải lớn hơn startTime' })

    const roomId = dto.roomId ? BigInt(dto.roomId) : session.roomId
    const trainerStaffId = dto.trainerStaffId ? BigInt(dto.trainerStaffId) : session.trainerStaffId

    if (dto.roomId || dto.startTime || dto.endTime) {
      await this.checkOverlap(roomId, null, startTime, endTime, 'ROOM_TIME_OVERLAP', id)
      await this.checkOverlap(null, trainerStaffId, startTime, endTime, 'TRAINER_TIME_OVERLAP', id)
    }

    const updated = await this.prisma.trainingSession.update({
      where: { sessionId: id },
      data: {
        ...(dto.trainerStaffId ? { trainerStaffId: BigInt(dto.trainerStaffId) } : {}),
        ...(dto.roomId ? { roomId: BigInt(dto.roomId) } : {}),
        ...(dto.startTime ? { startTime } : {}),
        ...(dto.endTime ? { endTime } : {}),
      },
      include: {
        member: { select: { memberId: true, user: { select: { fullName: true } } } },
        trainer: { select: { staffId: true, user: { select: { fullName: true } } } },
        room: { select: { roomId: true, name: true } },
      },
    })

    this.audit.log({ actorUserId: caller.userId, action: 'training.update', resourceType: 'training_session', resourceId: id.toString(), beforeData: this.serializeSession(session) as unknown as Record<string, unknown>, afterData: this.serializeSession(updated) as unknown as Record<string, unknown> })

    return { data: this.serializeSession(updated) }
  }

  async cancelSession(id: bigint, dto: CancelSessionDto, caller: { userId: bigint; roles: Role[]; staffId?: bigint; memberId?: bigint }) {
    const session = await this.prisma.trainingSession.findFirst({ where: { sessionId: id, deletedAt: null } })
    if (!session) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Session không tồn tại' })

    if (session.status === 'completed' || session.status === 'cancelled') {
      throw new ConflictException({ success: false, code: 'SESSION_NOT_CANCELLABLE', message: 'Session đã hoàn tất hoặc đã hủy' })
    }

    const isPT = caller.roles.includes('trainer') && !caller.roles.some((r) => r === 'owner' || r === 'staff')
    if (isPT) {
      const twoHoursBefore = new Date(session.startTime.getTime() - 2 * 60 * 60 * 1000)
      if (new Date() > twoHoursBefore) {
        throw new ConflictException({ success: false, code: 'SESSION_CANCEL_WINDOW_CLOSED', message: 'PT chỉ được hủy trước startTime ít nhất 2 giờ' })
      }
    }

    await this.prisma.trainingSession.update({ where: { sessionId: id }, data: { status: TrainingSessionStatus.cancelled } })
    this.audit.log({ actorUserId: caller.userId, action: 'training.cancel', resourceType: 'training_session', resourceId: id.toString(), afterData: { reason: dto.reason, cancelledBy: caller.userId.toString() } })
  }

  // ---------------------------------------------------------------------------
  // Attendance
  // ---------------------------------------------------------------------------

  async listAttendance(dto: ListAttendanceLogsDto, caller: { userId: bigint; roles: Role[]; staffId?: bigint; memberId?: bigint }) {
    const { page = 1, pageSize = 20, memberId, subscriptionId, sessionId, method, from, to } = dto
    const { roles, staffId } = caller

    const isMember = roles.includes('member')
    const isOwnerOrStaff = roles.some((r) => r === 'owner' || r === 'staff')
    const isPT = roles.includes('trainer')

    const where: Prisma.AttendanceLogWhereInput = {}

    if (isMember) {
      // Self: tự động filter theo memberId của mình
      where.memberId = caller.memberId!
    } else if (isPT && !isOwnerOrStaff) {
      where.member = { primaryTrainerId: staffId! }
    } else {
      if (memberId) where.memberId = BigInt(memberId)
    }

    if (subscriptionId) where.subscriptionId = BigInt(subscriptionId)
    if (sessionId) where.sessionId = BigInt(sessionId)
    if (method) where.method = method as AttendanceMethod
    if (from) where.startTime = { ...where.startTime as object, gte: new Date(from) }
    if (to) where.startTime = { ...where.startTime as object, lte: new Date(to) }

    const [data, total] = await Promise.all([
      this.prisma.attendanceLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startTime: 'desc' },
        include: {
          member: { select: { memberId: true, memberCode: true, user: { select: { fullName: true } } } },
          subscription: { select: { subscriptionId: true, startDate: true, endDate: true } },
          session: { select: { sessionId: true, startTime: true, endTime: true } },
        },
      }),
      this.prisma.attendanceLog.count({ where }),
    ])

    return {
      data: data.map((a) => this.serializeAttendance(a)),
      meta: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) },
    }
  }

  async manualCheckin(dto: ManualCheckinDto, caller: { userId: bigint; roles: Role[]; staffId?: bigint; memberId?: bigint }) {
    const occurredAt = new Date(dto.occurredAt)

    const member = await this.prisma.member.findFirst({
      where: { memberCode: dto.memberCode, deletedAt: null },
      include: { user: { select: { fullName: true } } },
    })
    if (!member) throw new NotFoundException({ success: false, code: 'MEMBER_NOT_FOUND', message: 'Không tìm thấy member' })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sub = await this.prisma.subscription.findFirst({
      where: { memberId: member.memberId, status: 'active', deletedAt: null, startDate: { lte: today }, endDate: { gte: today } },
    })
    if (!sub) throw new ForbiddenException({ success: false, code: 'MEMBER_NO_ACTIVE_SUBSCRIPTION', message: 'Member không có subscription active' })

    const openAttendance = await this.prisma.attendanceLog.findFirst({
      where: { memberId: member.memberId, endTime: null },
    })
    if (openAttendance) throw new ConflictException({ success: false, code: 'ATTENDANCE_ALREADY_OPEN', message: 'Member đã check-in hôm nay' })

    const attendance = await this.prisma.attendanceLog.create({
      data: { memberId: member.memberId, subscriptionId: sub.subscriptionId, startTime: occurredAt, method: AttendanceMethod.manual },
      include: {
        member: { select: { memberId: true, memberCode: true, user: { select: { fullName: true } } } },
        subscription: { select: { subscriptionId: true, endDate: true } },
      },
    })

    this.audit.log({ actorUserId: caller.userId, action: 'attendance.manual-checkin', resourceType: 'attendance_log', resourceId: attendance.attendanceId.toString() })

    return { data: this.serializeAttendance(attendance) }
  }

  async checkout(id: bigint, dto: CheckoutDto, caller: { userId: bigint; roles: Role[]; staffId?: bigint; memberId?: bigint }) {
    const attendance = await this.prisma.attendanceLog.findFirst({ where: { attendanceId: id } })
    if (!attendance) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Attendance log không tồn tại' })

    if (attendance.endTime) throw new ConflictException({ success: false, code: 'ATTENDANCE_ALREADY_CLOSED', message: 'Attendance đã checkout' })

    const endedAt = new Date(dto.endedAt)
    if (endedAt <= attendance.startTime) throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'endedAt phải lớn hơn startTime' })

    const updated = await this.prisma.attendanceLog.update({
      where: { attendanceId: id },
      data: { endTime: endedAt },
      include: {
        member: { select: { memberId: true, memberCode: true, user: { select: { fullName: true } } } },
        subscription: { select: { subscriptionId: true, endDate: true } },
        session: { select: { sessionId: true, startTime: true, endTime: true } },
      },
    })

    this.audit.log({ actorUserId: caller.userId, action: 'attendance.checkout', resourceType: 'attendance_log', resourceId: id.toString(), beforeData: { endTime: null }, afterData: { endTime: endedAt } })

    return { data: this.serializeAttendance(updated) }
  }

  async deviceAccessEvent(body: { memberIdentifier: string; occurredAt: string; deviceId: string }) {
    const occurredAt = new Date(body.occurredAt)

    const member = await this.prisma.member.findFirst({
      where: { memberCode: body.memberIdentifier, deletedAt: null },
      include: { user: { select: { fullName: true, avatarFileId: true } } },
    })
    if (!member) throw new NotFoundException({ success: false, code: 'MEMBER_NOT_FOUND', message: 'Không tìm thấy member' })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sub = await this.prisma.subscription.findFirst({
      where: { memberId: member.memberId, status: 'active', deletedAt: null, startDate: { lte: today }, endDate: { gte: today } },
    })
    if (!sub) throw new ForbiddenException({ success: false, code: 'MEMBER_NO_ACTIVE_SUBSCRIPTION', message: 'Member không có subscription active' })

    const existingOpen = await this.prisma.attendanceLog.findFirst({
      where: { memberId: member.memberId, endTime: null },
    })
    if (existingOpen) throw new ConflictException({ success: false, code: 'ATTENDANCE_ALREADY_OPEN', message: 'Member đã check-in hôm nay' })

    const session = await this.prisma.trainingSession.findFirst({
      where: {
        memberId: member.memberId,
        status: { in: ['scheduled', 'in_progress'] },
        startTime: { lte: occurredAt },
        endTime: { gte: occurredAt },
        deletedAt: null,
      },
    })

    if (session) {
      await this.prisma.trainingSession.update({ where: { sessionId: session.sessionId }, data: { status: TrainingSessionStatus.in_progress } })
    }

    const attendance = await this.prisma.attendanceLog.create({
      data: {
        memberId: member.memberId,
        subscriptionId: sub.subscriptionId,
        sessionId: session?.sessionId ?? null,
        startTime: occurredAt,
        method: AttendanceMethod.realtime,
      },
    })

    this.audit.log({ actorUserId: null, action: 'attendance.realtime-checkin', resourceType: 'attendance_log', resourceId: attendance.attendanceId.toString() })

    return {
      success: true,
      data: {
        attendanceLogId: attendance.attendanceId.toString(),
        deduped: false,
        member: { memberId: member.memberId.toString(), memberCode: member.memberCode, fullName: member.user.fullName, photoUrl: null },
        subscription: { subscriptionId: sub.subscriptionId.toString(), endDate: sub.endDate.toISOString().split('T')[0] },
        sessionId: session?.sessionId.toString() ?? null,
      },
    }
  }

  // ---------------------------------------------------------------------------
  // Member Progress
  // ---------------------------------------------------------------------------

  async listProgress(memberId: bigint, query: { from?: string; to?: string; limit?: string }, caller: { userId: bigint; roles: Role[]; staffId?: bigint; memberId?: bigint }) {
    const isMember = caller.roles.includes('member')
    if (isMember && caller.memberId !== memberId) {
      throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Bạn chỉ có thể xem tiến trình của mình' })
    }

    const where: Prisma.MemberProgressWhereInput = { memberId, deletedAt: null }
    if (query.from) where.recordedAt = { ...(where.recordedAt as object ?? {}), gte: new Date(query.from) }
    if (query.to) where.recordedAt = { ...(where.recordedAt as object ?? {}), lte: new Date(query.to) }

    const limit = query.limit ? Math.min(parseInt(query.limit, 10), 100) : 50
    const records = await this.prisma.memberProgress.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: limit,
    })
    return { data: records.map((p) => this.serializeProgress(p)) }
  }

  async recordProgress(memberId: bigint, dto: CreateProgressDto, caller: { userId: bigint; roles: Role[]; staffId?: bigint; memberId?: bigint }) {
    const { roles, staffId } = caller
    const isOwnerOrStaff = roles.some((r) => r === 'owner' || r === 'staff')
    const isPT = roles.includes('trainer')

    const member = await this.prisma.member.findFirst({ where: { memberId, deletedAt: null } })
    if (!member) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Member không tồn tại' })

    if (isPT && member.primaryTrainerId !== staffId) {
      throw new ForbiddenException({ success: false, code: 'TRAINER_NOT_ASSIGNED', message: 'PT chỉ được ghi progress cho member có primary trainer là mình' })
    }

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date()
    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
    if (recordedAt > fiveMinFromNow) throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'recordedAt không được trong tương lai quá 5 phút' })

    // 1. Kiểm tra staffId, nếu undefined/null thì phải xử lý ngay để né lỗi NOT NULL dưới DB
    if (!staffId) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Tài khoản đăng nhập của bạn không gắn liền với một Staff ID hợp lệ để ghi nhận tiến trình.'
      });
    }

    // 2. Insert dữ liệu chuẩn theo đúng tên trường Prisma Client của bạn nhận diện
    const progress = await this.prisma.memberProgress.create({
      data: {
        // Nếu trong file schema.prisma bạn đặt tên trường là camelCase:
        memberId: member.memberId, // hoặc memberId (tùy biến truyền vào)
        staffId: BigInt(staffId),
        
        // Nếu TypeScript vẫn báo đỏ ở 2 dòng trên, bạn đổi vế trái thành gạch dưới:
        // member_id: member.memberId,
        // staff_id: BigInt(staffId),

        weight: dto.weight !== undefined ? new Prisma.Decimal(dto.weight) : null,
        bmi: dto.bmi !== undefined ? new Prisma.Decimal(dto.bmi) : null,
        goal: dto.goal ?? null,
        notes: dto.notes ?? null,
        recordedAt,
      },
    })

    this.audit.log({ actorUserId: caller.userId, action: 'progress.record', resourceType: 'member_progress', resourceId: progress.progressId.toString(), afterData: this.serializeProgress(progress) as unknown as Record<string, unknown> })

    return { data: this.serializeProgress(progress) }
  }

  async deleteProgress(id: bigint, caller: { userId: bigint; roles: Role[]; staffId?: bigint; memberId?: bigint }) {
    const progress = await this.prisma.memberProgress.findFirst({ where: { progressId: id, deletedAt: null } })
    if (!progress) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Progress record không tồn tại' })

    const isOwnerOrStaff = caller.roles.some((r) => r === 'owner' || r === 'staff')
    if (!isOwnerOrStaff && progress.staffId !== caller.staffId) {
      throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Không có quyền xóa progress record này' })
    }

    await this.prisma.memberProgress.update({ where: { progressId: id }, data: { deletedAt: new Date() } })
    this.audit.log({ actorUserId: caller.userId, action: 'progress.delete', resourceType: 'member_progress', resourceId: id.toString() })
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async checkOverlap(roomId: bigint | null, trainerStaffId: bigint | null, startTime: Date, endTime: Date, errorCode: string, excludeId?: bigint) {
    const where: Prisma.TrainingSessionWhereInput = {
      status: { not: 'cancelled' },
      deletedAt: null,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    }
    if (roomId) where.roomId = roomId
    if (trainerStaffId) where.trainerStaffId = trainerStaffId
    if (excludeId) where.sessionId = { not: excludeId }

    const overlap = await this.prisma.trainingSession.findFirst({ where })
    if (overlap) {
      throw new ConflictException({ success: false, code: errorCode, message: errorCode === 'ROOM_TIME_OVERLAP' ? 'Phòng đã có session overlap' : 'PT đã có session overlap' })
    }
  }

  private checkSessionAccess(session: { memberId: bigint; trainerStaffId: bigint }, caller: { userId: bigint; roles: Role[]; staffId?: bigint; memberId?: bigint }) {
    const isOwnerOrStaff = caller.roles.some((r) => r === 'owner' || r === 'staff')
    if (isOwnerOrStaff) return

    if (caller.roles.includes('trainer')) {
      if (session.trainerStaffId !== caller.staffId) {
        throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Không có quyền truy cập session này' })
      }
      return
    }

    if (caller.roles.includes('member')) {
      if (session.memberId !== caller.memberId) {
        throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Không có quyền truy cập session này' })
      }
      return
    }

    throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Không có quyền truy cập session này' })
  }

  private serializeSession(s: any, withAttendance = false) {
    const base = {
      sessionId: s.sessionId.toString(),
      memberId: s.memberId.toString(),
      memberName: s.member.user.fullName,
      trainerStaffId: s.trainerStaffId.toString(),
      trainerName: s.trainer.user.fullName,
      roomId: s.roomId.toString(),
      roomName: s.room.name,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
    }
    if (withAttendance) {
      return { ...base, attendanceLogs: s.attendanceLogs?.map((a: any) => this.serializeAttendance(a)) ?? [] }
    }
    return base
  }

  private serializeAttendance(a: any) {
    return {
      attendanceId: a.attendanceId.toString(),
      memberId: a.memberId.toString(),
      memberCode: a.member.memberCode,
      memberName: a.member.user.fullName,
      subscriptionId: a.subscriptionId.toString(),
      sessionId: a.sessionId?.toString() ?? null,
      startTime: a.startTime,
      endTime: a.endTime,
      method: a.method,
    }
  }

  private serializeProgress(p: Prisma.MemberProgressGetPayload<object>) {
    return {
      progressId: p.progressId.toString(),
      memberId: p.memberId.toString(),
      staffId: p.staffId.toString(),
      weight: p.weight?.toString() ?? null,
      bmi: p.bmi?.toString() ?? null,
      goal: p.goal,
      notes: p.notes,
      recordedAt: p.recordedAt,
      deletedAt: p.deletedAt,
    }
  }
}

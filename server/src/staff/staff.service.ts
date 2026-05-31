import { ConflictException, Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../common/audit/audit.service'
import { CreateStaffDto } from './dto/create-staff.dto'
import { UpdateStaffDto } from './dto/update-staff.dto'
import { CreateScheduleDto } from './dto/create-schedule.dto'

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async generateStaffCode(tx: any): Promise<string> {
    const year = new Date().getFullYear()
    for (let attempt = 0; attempt < 5; attempt++) {
      const seq = Math.floor(Math.random() * 900000) + 100000
      const code = `STF-${year}-${String(seq).padStart(6, '0')}`
      const existing = await tx.staff.findFirst({ where: { staffCode: code } })
      if (!existing) return code
    }
    throw new InternalServerErrorException({ success: false, code: 'STAFF_CODE_GENERATION_FAILED', message: 'Không thể tạo staffCode' })
  }

  async create(dto: CreateStaffDto, actorUserId: bigint) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email, deletedAt: null } })
    if (existing) throw new ConflictException({ success: false, code: 'DUPLICATE_VALUE', message: 'Email đã được sử dụng' })

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { email: dto.email, fullName: dto.fullName, phone: dto.phone ?? null, passwordHash: null, status: 'pending_verification', emailVerifiedAt: null } })
        const staffCode = await this.generateStaffCode(tx)
        const staff = await tx.staff.create({ data: { userId: user.userId, position: dto.position, staffCode } })

        if (dto.groupIds && dto.groupIds.length > 0) {
          for (const gid of dto.groupIds) {
            await tx.userGroup.create({ data: { userId: user.userId, groupId: BigInt(gid) } })
          }
        } else {
          const staffGroup = await tx.group.findUnique({ where: { name: 'staff' } })
          if (staffGroup) await tx.userGroup.create({ data: { userId: user.userId, groupId: staffGroup.groupId } })
        }

        // placeholder notify
        this.audit.log({ actorUserId, action: 'staff.create', resourceType: 'staff', resourceId: staff.staffId.toString(), afterData: { email: dto.email, staffCode } as unknown as Record<string, unknown> })

        return { user, staff }
      })

      return { data: { staffId: result.staff.staffId.toString(), userId: result.user.userId.toString(), staffCode: result.staff.staffCode, position: result.staff.position, fullName: result.user.fullName, email: result.user.email } }
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException({ success: false, code: 'DUPLICATE_VALUE', message: 'Email đã được sử dụng' })
      }
      throw err
    }
  }

  async list(query: any) {
    const { page = 1, pageSize = 20, position, status, search, sort = 'staff_code:asc' } = query
    const where: any = { deletedAt: null }
    if (position) where.position = position
    if (status) where.user = { status }
    if (search) {
      where.OR = [{ staffCode: { contains: search, mode: 'insensitive' } }]
      where.user = where.user ?? {}
      where.user.OR = [{ fullName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }]
    }

    const [sortField, sortDir] = sort.split(':')
    const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => (c as string).toUpperCase())
    const orderBy = { [toCamel(sortField ?? 'staffCode')]: sortDir === 'asc' ? 'asc' : 'desc' }

    const [data, total] = await Promise.all([
      this.prisma.staff.findMany({ where, include: { user: true }, skip: (page - 1) * pageSize, take: pageSize, orderBy }),
      this.prisma.staff.count({ where }),
    ])

    return { data: data.map((s) => ({ staffId: s.staffId.toString(), userId: s.userId.toString(), staffCode: s.staffCode, position: s.position, fullName: s.user.fullName, email: s.user.email })), meta: { page, pageSize, total } }
  }

  async get(staffId: bigint) {
    const s = await this.prisma.staff.findFirst({ where: { staffId }, include: { user: true } })
    if (!s) throw new NotFoundException({ success: false, code: 'STAFF_NOT_FOUND', message: 'Staff không tồn tại' })
    return { staffId: s.staffId.toString(), userId: s.userId.toString(), staffCode: s.staffCode, position: s.position, fullName: s.user.fullName, email: s.user.email, phone: s.user.phone }
  }

  async update(staffId: bigint, dto: UpdateStaffDto, actorUserId: bigint) {
    const s = await this.prisma.staff.findFirst({ where: { staffId, deletedAt: null }, include: { user: true } })
    if (!s) throw new NotFoundException({ success: false, code: 'STAFF_NOT_FOUND', message: 'Staff không tồn tại' })

    const userUpdates: any = {}
    const staffUpdates: any = {}
    if (dto.fullName !== undefined) userUpdates.fullName = dto.fullName
    if (dto.phone !== undefined) userUpdates.phone = dto.phone
    if (dto.position !== undefined) staffUpdates.position = dto.position

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdates).length > 0) await tx.user.update({ where: { userId: s.userId }, data: userUpdates })
      if (Object.keys(staffUpdates).length > 0) await tx.staff.update({ where: { staffId }, data: staffUpdates })
    })

    this.audit.log({ actorUserId, action: 'staff.update', resourceType: 'staff', resourceId: staffId.toString(), afterData: dto as unknown as Record<string, unknown> })
    return this.get(staffId)
  }

  async delete(staffId: bigint, actorUserId: bigint) {
    const s = await this.prisma.staff.findFirst({ where: { staffId, deletedAt: null } })
    if (!s) throw new NotFoundException({ success: false, code: 'STAFF_NOT_FOUND', message: 'Staff không tồn tại' })

    await this.prisma.$transaction([this.prisma.staff.update({ where: { staffId }, data: { deletedAt: new Date() } }), this.prisma.user.update({ where: { userId: s.userId }, data: { deletedAt: new Date() } })])

    this.audit.log({ actorUserId, action: 'staff.delete', resourceType: 'staff', resourceId: staffId.toString(), beforeData: s as unknown as Record<string, unknown> })
    return { success: true }
  }

  // schedules
  async listSchedules(staffId: bigint) {
    const rows = await this.prisma.staffSchedule.findMany({ where: { staffId, deletedAt: null }, orderBy: { workDate: 'asc' } })
    return rows.map((r) => ({ scheduleId: r.scheduleId.toString(), staffId: r.staffId.toString(), shift: r.shift, workDate: r.workDate.toISOString().slice(0, 10) }))
  }

  async createSchedule(staffId: bigint, dto: CreateScheduleDto, actorUserId: bigint) {
    // enforce unique (staffId, shift, workDate) WHERE deletedAt IS NULL via check
    const exists = await this.prisma.staffSchedule.findFirst({ where: { staffId, shift: dto.shift, workDate: new Date(dto.workDate), deletedAt: null } })
    if (exists) throw new ConflictException({ success: false, code: 'SCHEDULE_CONFLICT', message: 'Lịch đã tồn tại' })

    const row = await this.prisma.staffSchedule.create({ data: { staffId, shift: dto.shift, workDate: new Date(dto.workDate) } })
    this.audit.log({ actorUserId, action: 'staff.schedule.create', resourceType: 'staff_schedule', resourceId: row.scheduleId.toString(), afterData: row as unknown as Record<string, unknown> })
    return { scheduleId: row.scheduleId.toString() }
  }

  async deleteSchedule(staffId: bigint, scheduleId: bigint, actorUserId: bigint) {
    const row = await this.prisma.staffSchedule.findFirst({ where: { scheduleId, staffId, deletedAt: null } })
    if (!row) throw new NotFoundException({ success: false, code: 'SCHEDULE_NOT_FOUND', message: 'Lịch không tồn tại' })
    await this.prisma.staffSchedule.update({ where: { scheduleId }, data: { deletedAt: new Date() } })
    this.audit.log({ actorUserId, action: 'staff.schedule.delete', resourceType: 'staff_schedule', resourceId: scheduleId.toString(), beforeData: row as unknown as Record<string, unknown> })
    return { success: true }
  }
}

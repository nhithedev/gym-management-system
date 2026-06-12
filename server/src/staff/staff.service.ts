import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { Prisma, StaffShift } from '@prisma/client'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateStaffDto } from './dto/create-staff.dto'
import { UpdateStaffDto } from './dto/update-staff.dto'
import { CreateScheduleDto } from './dto/create-schedule.dto'

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

function parseDateOnly(value: string): Date {
  return new Date(value)
}

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async generateStaffCode(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear()
    for (let attempt = 0; attempt < 5; attempt++) {
      const seq = Math.floor(Math.random() * 900000) + 100000
      const code = `STF-${year}-${String(seq).padStart(6, '0')}`
      const existing = await tx.staff.findFirst({ where: { staffCode: code } })
      if (!existing) return code
    }
    throw new InternalServerErrorException({ success: false, code: 'STAFF_CODE_GENERATION_FAILED', message: 'Khong the tao staffCode' })
  }

  async create(dto: CreateStaffDto, actorUserId: bigint) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email, deletedAt: null } })
    if (existing) throw new ConflictException({ success: false, code: 'DUPLICATE_VALUE', message: 'Email da duoc su dung' })

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            fullName: dto.fullName,
            phone: dto.phone ?? null,
            passwordHash: null,
            status: 'pending_verification',
            emailVerifiedAt: null,
          },
        })
        const staffCode = await this.generateStaffCode(tx)
        const staff = await tx.staff.create({ data: { userId: user.userId, position: dto.position, staffCode } })

        if (dto.groupIds && dto.groupIds.length > 0) {
          await tx.userGroup.createMany({
            data: dto.groupIds.map((gid) => ({ userId: user.userId, groupId: BigInt(gid) })),
            skipDuplicates: true,
          })
        } else {
          const staffGroup = await tx.group.findUnique({ where: { name: dto.position === 'trainer' ? 'trainer' : 'staff' } })
          if (staffGroup) await tx.userGroup.create({ data: { userId: user.userId, groupId: staffGroup.groupId } })
        }

        return { user, staff }
      })

      this.audit.log({
        actorUserId,
        action: 'staff.create',
        resourceType: 'staff',
        resourceId: result.staff.staffId.toString(),
        afterData: { email: dto.email, staffCode: result.staff.staffCode } as unknown as Record<string, unknown>,
      })

      return this.serializeStaff(result.staff, result.user)
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException({ success: false, code: 'DUPLICATE_VALUE', message: 'Email hoac phone da duoc su dung' })
      }
      throw err
    }
  }

  async list(query: any, caller?: AuthenticatedUser) {
    const { page = 1, pageSize = 20, position, status, search, sort = 'staff_code:asc' } = query
    const where: Prisma.StaffWhereInput = {}
    if (status === 'deleted') {
      if (!caller?.roles.includes('owner')) {
        throw new BadRequestException({ success: false, code: 'FORBIDDEN', message: 'Chi owner duoc xem staff da xoa' })
      }
      where.deletedAt = { not: null }
    } else {
      where.deletedAt = null
      if (status && status !== 'active') where.user = { status }
    }
    if (position) where.position = position
    if (search) {
      where.OR = [
        { staffCode: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        include: { user: true },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: this.buildStaffOrder(sort),
      }),
      this.prisma.staff.count({ where }),
    ])

    return {
      data: data.map((s) => this.serializeStaff(s, s.user)),
      meta: { page: Number(page), pageSize: Number(pageSize), totalItems: total, totalPages: Math.max(1, Math.ceil(total / Number(pageSize))) },
    }
  }

  async listTrainers(): Promise<{ staffId: string; fullName: string; position: string }[]> {
    const trainers = await this.prisma.staff.findMany({
      where: { deletedAt: null, position: { in: ['trainer', 'pt'] } },
      include: { user: { select: { fullName: true } } },
      orderBy: { staffCode: 'asc' },
    })
    return trainers.map((t) => ({
      staffId: t.staffId.toString(),
      fullName: t.user.fullName,
      position: t.position,
    }))
  }

  async get(staffId: bigint) {
    const s = await this.prisma.staff.findFirst({ where: { staffId }, include: { user: true } })
    if (!s) throw new NotFoundException({ success: false, code: 'STAFF_NOT_FOUND', message: 'Staff khong ton tai' })
    return this.serializeStaff(s, s.user)
  }

  async update(staffId: bigint, dto: UpdateStaffDto, actorUserId: bigint) {
    const s = await this.prisma.staff.findFirst({ where: { staffId, deletedAt: null }, include: { user: true } })
    if (!s) throw new NotFoundException({ success: false, code: 'STAFF_NOT_FOUND', message: 'Staff khong ton tai' })

    const userUpdates: Prisma.UserUpdateInput = {}
    const staffUpdates: Prisma.StaffUpdateInput = {}
    if (dto.fullName !== undefined) {
      if (dto.fullName === null) throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'fullName khong duoc null' })
      userUpdates.fullName = dto.fullName
    }
    if (dto.phone !== undefined) userUpdates.phone = dto.phone
    if (dto.position !== undefined) {
      if (dto.position === null) throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'position khong duoc null' })
      staffUpdates.position = dto.position
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdates).length > 0) await tx.user.update({ where: { userId: s.userId }, data: userUpdates })
      if (Object.keys(staffUpdates).length > 0) await tx.staff.update({ where: { staffId }, data: staffUpdates })
    })

    this.audit.log({
      actorUserId,
      action: 'staff.update',
      resourceType: 'staff',
      resourceId: staffId.toString(),
      beforeData: this.serializeStaff(s, s.user) as unknown as Record<string, unknown>,
      afterData: dto as unknown as Record<string, unknown>,
    })
    return this.get(staffId)
  }

  async delete(staffId: bigint, actorUserId: bigint) {
    const s = await this.prisma.staff.findFirst({ where: { staffId, deletedAt: null }, include: { user: true } })
    if (!s) throw new NotFoundException({ success: false, code: 'STAFF_NOT_FOUND', message: 'Staff khong ton tai' })

    const now = new Date()
    await this.prisma.$transaction([
      this.prisma.staff.update({ where: { staffId }, data: { deletedAt: now } }),
      this.prisma.user.update({ where: { userId: s.userId }, data: { deletedAt: now } }),
    ])

    this.audit.log({
      actorUserId,
      action: 'staff.delete',
      resourceType: 'staff',
      resourceId: staffId.toString(),
      beforeData: this.serializeStaff(s, s.user) as unknown as Record<string, unknown>,
    })
    return { success: true }
  }

  async listSchedules(staffId: bigint) {
    const staff = await this.prisma.staff.findFirst({ where: { staffId, deletedAt: null } })
    if (!staff) throw new NotFoundException({ success: false, code: 'STAFF_NOT_FOUND', message: 'Staff khong ton tai' })

    const rows = await this.prisma.staffSchedule.findMany({
      where: { staffId, deletedAt: null },
      orderBy: [{ workDate: 'asc' }, { shift: 'asc' }],
    })
    return rows.map((r) => this.serializeSchedule(r))
  }

  async createSchedule(staffId: bigint, dto: CreateScheduleDto, actorUserId: bigint) {
    const staff = await this.prisma.staff.findFirst({ where: { staffId, deletedAt: null } })
    if (!staff) throw new NotFoundException({ success: false, code: 'STAFF_NOT_FOUND', message: 'Staff khong ton tai' })

    const today = todayVN()
    const seen = new Set<string>()
    const schedules = dto.schedules.map((entry) => {
      const workDate = parseDateOnly(entry.workDate)
      if (workDate < today) {
        throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'workDate khong duoc o qua khu' })
      }
      const key = `${entry.shift}:${entry.workDate}`
      if (seen.has(key)) {
        throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'Batch chua entry trung lap' })
      }
      seen.add(key)
      return { staffId, shift: entry.shift, workDate }
    })

    const conflicts = await this.prisma.staffSchedule.findMany({
      where: {
        staffId,
        deletedAt: null,
        OR: schedules.map((s) => ({ shift: s.shift, workDate: s.workDate })),
      },
    })
    if (conflicts.length > 0) {
      throw new ConflictException({
        success: false,
        code: 'SCHEDULE_CONFLICT',
        message: 'Lich da ton tai',
        details: { conflicts: conflicts.map((c) => ({ shift: c.shift, workDate: c.workDate.toISOString().slice(0, 10) })) },
      })
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.staffSchedule.createMany({ data: schedules })
      return tx.staffSchedule.findMany({
        where: {
          staffId,
          deletedAt: null,
          OR: schedules.map((s) => ({ shift: s.shift, workDate: s.workDate })),
        },
        orderBy: [{ workDate: 'asc' }, { shift: 'asc' }],
      })
    })

    this.audit.log({
      actorUserId,
      action: 'schedule.assign',
      resourceType: 'staff_schedule',
      resourceId: staffId.toString(),
      afterData: { staffId: staffId.toString(), created: created.length, schedules: created.map((r) => this.serializeSchedule(r)) } as unknown as Record<string, unknown>,
    })
    return { created: created.length, schedules: created.map((r) => this.serializeSchedule(r)) }
  }

  async deleteSchedule(staffId: bigint, scheduleId: bigint, actorUserId: bigint) {
    const row = await this.prisma.staffSchedule.findFirst({ where: { scheduleId, staffId, deletedAt: null } })
    if (!row) throw new NotFoundException({ success: false, code: 'SCHEDULE_NOT_FOUND', message: 'Lich khong ton tai' })
    await this.prisma.staffSchedule.update({ where: { scheduleId }, data: { deletedAt: new Date() } })
    this.audit.log({
      actorUserId,
      action: 'schedule.remove',
      resourceType: 'staff_schedule',
      resourceId: scheduleId.toString(),
      beforeData: this.serializeSchedule(row) as unknown as Record<string, unknown>,
    })
    return { success: true }
  }

  private serializeStaff(s: { staffId: bigint; userId: bigint; staffCode: string; position: string; deletedAt?: Date | null }, user: { fullName: string; email: string; phone?: string | null; status?: string }) {
    return {
      staffId: s.staffId.toString(),
      userId: s.userId.toString(),
      staffCode: s.staffCode,
      position: s.position,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? null,
      status: user.status,
      deletedAt: s.deletedAt ?? null,
    }
  }

  private serializeSchedule(r: { scheduleId: bigint; staffId: bigint; shift: StaffShift; workDate: Date }) {
    return {
      scheduleId: r.scheduleId.toString(),
      staffId: r.staffId.toString(),
      shift: r.shift,
      workDate: r.workDate.toISOString().slice(0, 10),
    }
  }

  private buildStaffOrder(sort: string): Prisma.StaffOrderByWithRelationInput {
    const [field, dirRaw] = sort.split(':')
    const dir = dirRaw === 'desc' ? 'desc' : 'asc'
    if (field === 'fullName' || field === 'full_name') return { user: { fullName: dir } }
    return { staffCode: dir }
  }
}

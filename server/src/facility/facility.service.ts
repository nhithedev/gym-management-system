import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { EquipmentStatus, MaintenanceStatus, Prisma } from '@prisma/client'
import { type Role } from '../auth/users.service'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateEquipmentDto } from './dto/create-equipment.dto'
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto'
import { CreateRoomDto } from './dto/create-room.dto'
import { ListEquipmentDto } from './dto/list-equipment.dto'
import { ListMaintenanceLogsDto } from './dto/list-maintenance-logs.dto'
import { ListRoomsDto } from './dto/list-rooms.dto'
import { UpdateEquipmentDto } from './dto/update-equipment.dto'
import { UpdateMaintenanceLogDto } from './dto/update-maintenance-log.dto'
import { UpdateRoomDto } from './dto/update-room.dto'

function todayVN(): Date {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  return new Date(s)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function toCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function parseDateOnly(value: string): Date {
  return new Date(value)
}

@Injectable()
export class FacilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listRooms(query: ListRoomsDto) {
    const { page = 1, pageSize = 20, roomType, search, sort = 'room_code:asc' } = query
    const where: Prisma.GymRoomWhereInput = {}

    if (roomType) where.roomType = roomType
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { roomCode: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [sortField, sortDir] = sort.split(':')
    const orderBy = { [toCamel(sortField ?? 'roomCode')]: sortDir === 'asc' ? 'asc' : 'desc' } as Prisma.GymRoomOrderByWithRelationInput

    const [data, totalItems] = await Promise.all([
      this.prisma.gymRoom.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy }),
      this.prisma.gymRoom.count({ where }),
    ])

    return {
      data: data.map((room) => this.serializeRoom(room)),
      meta: this.buildMeta(page, pageSize, totalItems),
    }
  }

  async getRoom(roomId: bigint) {
    const room = await this.prisma.gymRoom.findFirst({ where: { roomId } })
    if (!room) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Room không tồn tại' })

    const [equipmentCount, activeSessionsCount] = await Promise.all([
      this.prisma.equipment.count({ where: { roomId } }),
      this.prisma.trainingSession.count({ where: { roomId, deletedAt: null, endTime: { gt: new Date() } } }),
    ])

    return {
      data: {
        ...this.serializeRoom(room),
        stats: { equipmentCount, activeSessionsCount },
      },
    }
  }

  async createRoom(dto: CreateRoomDto, actorUserId: bigint) {
    const roomCode = dto.roomCode ?? (await this.generateRoomCode())

    try {
      const room = await this.prisma.gymRoom.create({
        data: {
          roomCode,
          name: dto.name,
          roomType: dto.roomType ?? null,
          capacity: dto.capacity,
          description: dto.description ?? null,
        },
      })

      this.audit.log({
        actorUserId,
        action: 'room.create',
        resourceType: 'room',
        resourceId: room.roomId.toString(),
        afterData: this.serializeRoom(room) as unknown as Record<string, unknown>,
      })

      return { data: this.serializeRoom(room) }
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException({ success: false, code: 'DUPLICATE_VALUE', message: 'roomCode đã tồn tại' })
      }
      throw error
    }
  }

  async updateRoom(roomId: bigint, dto: UpdateRoomDto, actorUserId: bigint) {
    const existing = await this.prisma.gymRoom.findFirst({ where: { roomId } })
    if (!existing) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Room không tồn tại' })

    if (!this.hasAnyField(dto)) {
      throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'Phải truyền ít nhất một trường để cập nhật' })
    }

    try {
      const updated = await this.prisma.gymRoom.update({
        where: { roomId },
        data: {
          ...(dto.roomCode !== undefined ? { roomCode: dto.roomCode } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.roomType !== undefined ? { roomType: dto.roomType } : {}),
          ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
        },
      })

      this.audit.log({
        actorUserId,
        action: 'room.update',
        resourceType: 'room',
        resourceId: roomId.toString(),
        beforeData: this.serializeRoom(existing) as unknown as Record<string, unknown>,
        afterData: this.serializeRoom(updated) as unknown as Record<string, unknown>,
      })

      return { data: this.serializeRoom(updated) }
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException({ success: false, code: 'DUPLICATE_VALUE', message: 'roomCode đã tồn tại' })
      }
      throw error
    }
  }

  async deleteRoom(roomId: bigint, actorUserId: bigint) {
    const existing = await this.prisma.gymRoom.findFirst({ where: { roomId } })
    if (!existing) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Room không tồn tại' })

    const [equipmentCount, activeSessionsCount] = await Promise.all([
      this.prisma.equipment.count({ where: { roomId } }),
      this.prisma.trainingSession.count({ where: { roomId, deletedAt: null, endTime: { gt: new Date() } } }),
    ])

    if (equipmentCount > 0) {
      throw new ConflictException({
        success: false,
        code: 'ROOM_HAS_EQUIPMENT',
        message: 'Phòng còn thiết bị tham chiếu, không thể xóa',
        details: { equipmentCount },
      })
    }

    if (activeSessionsCount > 0) {
      throw new ConflictException({
        success: false,
        code: 'ROOM_HAS_ACTIVE_SESSIONS',
        message: 'Phòng còn lịch tập chưa kết thúc, không thể xóa',
        details: { upcomingSessionCount: activeSessionsCount },
      })
    }

    await this.prisma.gymRoom.delete({ where: { roomId } })

    this.audit.log({
      actorUserId,
      action: 'room.delete',
      resourceType: 'room',
      resourceId: roomId.toString(),
      beforeData: this.serializeRoom(existing) as unknown as Record<string, unknown>,
    })
  }

  async listEquipment(query: ListEquipmentDto) {
    const { page = 1, pageSize = 20, roomId, status, search, warrantyExpiring = false, sort = 'equipment_code:asc' } = query
    const where: Prisma.EquipmentWhereInput = {}

    if (roomId !== undefined) where.roomId = BigInt(roomId)
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { equipmentCode: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (warrantyExpiring) {
      where.warrantyUntil = { not: null, lte: addDays(todayVN(), 30) }
    }

    const [sortField, sortDir] = sort.split(':')
    const orderBy = { [toCamel(sortField ?? 'equipmentCode')]: sortDir === 'asc' ? 'asc' : 'desc' } as Prisma.EquipmentOrderByWithRelationInput

    const [data, totalItems] = await Promise.all([
      this.prisma.equipment.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy, include: { room: true } }),
      this.prisma.equipment.count({ where }),
    ])

    return {
      data: data.map((equipment) => this.serializeEquipment(equipment)),
      meta: this.buildMeta(page, pageSize, totalItems),
    }
  }

  async getEquipment(equipmentId: bigint) {
    const equipment = await this.prisma.equipment.findFirst({ where: { equipmentId }, include: { room: true } })
    if (!equipment) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Equipment không tồn tại' })

    const [openMaintenance, totalMaintenanceLogs, lastResolved] = await Promise.all([
      this.prisma.maintenanceLog.findFirst({
        where: { equipmentId, status: { in: [MaintenanceStatus.reported, MaintenanceStatus.repairing] } },
        orderBy: { reportedAt: 'desc' },
        include: { reportedByStaff: { include: { user: true } } },
      }),
      this.prisma.maintenanceLog.count({ where: { equipmentId } }),
      this.prisma.maintenanceLog.findFirst({
        where: { equipmentId, status: { in: [MaintenanceStatus.resolved, MaintenanceStatus.failed] } },
        orderBy: { resolvedAt: 'desc' },
        select: { resolvedAt: true },
      }),
    ])

    return {
      data: this.serializeEquipmentDetail(equipment, openMaintenance, totalMaintenanceLogs, lastResolved?.resolvedAt ?? null),
    }
  }

  async createEquipment(dto: CreateEquipmentDto, actorUserId: bigint) {
    if (!dto.roomId) {
      throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'roomId là bắt buộc' })
    }

    const room = await this.prisma.gymRoom.findFirst({ where: { roomId: BigInt(dto.roomId) } })
    if (!room) {
      throw new BadRequestException({ success: false, code: 'FK_CONSTRAINT', message: 'roomId không tồn tại' })
    }

    const importDate = dto.importDate ? parseDateOnly(dto.importDate) : todayVN()
    if (importDate > todayVN()) {
      throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'Ngày nhập không được ở tương lai' })
    }

    const warrantyUntil = dto.warrantyUntil ? parseDateOnly(dto.warrantyUntil) : null
    if (warrantyUntil && warrantyUntil < importDate) {
      throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'warrantyUntil phải lớn hơn hoặc bằng importDate' })
    }

    const equipmentCode = dto.equipmentCode ?? (await this.generateEquipmentCode())

    try {
      const equipment = await this.prisma.equipment.create({
        data: {
          roomId: room.roomId,
          equipmentCode,
          name: dto.name,
          importDate,
          warrantyUntil,
          status: EquipmentStatus.active,
        },
        include: { room: true },
      })

      this.audit.log({
        actorUserId,
        action: 'equipment.create',
        resourceType: 'equipment',
        resourceId: equipment.equipmentId.toString(),
        afterData: this.serializeEquipmentDetail(equipment, null, 0, null) as unknown as Record<string, unknown>,
      })

      return { data: this.serializeEquipmentDetail(equipment, null, 0, null) }
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException({ success: false, code: 'DUPLICATE_VALUE', message: 'equipmentCode đã tồn tại' })
      }
      throw error
    }
  }

  async updateEquipment(equipmentId: bigint, dto: UpdateEquipmentDto, actorUserId: bigint) {
    const existing = await this.prisma.equipment.findFirst({ where: { equipmentId }, include: { room: true } })
    if (!existing) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Equipment không tồn tại' })

    if (!this.hasAnyField(dto)) {
      throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'Phải truyền ít nhất một trường để cập nhật' })
    }

    const mergedRoomId = dto.roomId !== undefined ? BigInt(dto.roomId) : existing.roomId
    if (dto.roomId !== undefined) {
      const room = await this.prisma.gymRoom.findFirst({ where: { roomId: mergedRoomId } })
      if (!room) {
        throw new BadRequestException({ success: false, code: 'FK_CONSTRAINT', message: 'roomId không tồn tại' })
      }
    }

    const mergedImportDate = dto.importDate !== undefined ? parseDateOnly(dto.importDate) : existing.importDate
    const mergedWarrantyUntil = dto.warrantyUntil !== undefined ? (dto.warrantyUntil ? parseDateOnly(dto.warrantyUntil) : null) : existing.warrantyUntil

    if (mergedImportDate > todayVN()) {
      throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'Ngày nhập không được ở tương lai' })
    }
    if (mergedWarrantyUntil && mergedWarrantyUntil < mergedImportDate) {
      throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'warrantyUntil phải lớn hơn hoặc bằng importDate' })
    }

    if (dto.status === EquipmentStatus.broken) {
      throw new ConflictException({
        success: false,
        code: 'USE_MAINTENANCE_LOG_ENDPOINT',
        message: 'Thiết bị hỏng phải báo qua maintenance log, không patch status trực tiếp',
      })
    }

    if (existing.status === EquipmentStatus.retired && dto.status !== undefined && dto.status !== EquipmentStatus.retired) {
      throw new ConflictException({
        success: false,
        code: 'EQUIPMENT_INVALID_STATE_TRANSITION',
        message: 'Không thể khôi phục thiết bị đã thanh lý',
      })
    }

    if (dto.status !== undefined) {
      const openCount = await this.prisma.maintenanceLog.count({ where: { equipmentId, status: { in: [MaintenanceStatus.reported, MaintenanceStatus.repairing] } } })
      if (openCount > 0) {
        throw new ConflictException({
          success: false,
          code: 'EQUIPMENT_HAS_OPEN_MAINTENANCE',
          message: 'Thiết bị đang có maintenance mở, không thể đổi status',
          details: { openMaintenanceCount: openCount },
        })
      }
    }

    try {
      const updated = await this.prisma.equipment.update({
        where: { equipmentId },
        data: {
          roomId: mergedRoomId,
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          importDate: mergedImportDate,
          warrantyUntil: mergedWarrantyUntil,
          ...(dto.status !== undefined ? { status: dto.status } : {}),
        },
        include: { room: true },
      })

      this.audit.log({
        actorUserId,
        action: 'equipment.update',
        resourceType: 'equipment',
        resourceId: equipmentId.toString(),
        beforeData: this.serializeEquipmentDetail(existing, null, 0, null) as unknown as Record<string, unknown>,
        afterData: this.serializeEquipmentDetail(updated, null, 0, null) as unknown as Record<string, unknown>,
      })

      return { data: this.serializeEquipmentDetail(updated, null, 0, null) }
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException({ success: false, code: 'DUPLICATE_VALUE', message: 'equipmentCode đã tồn tại' })
      }
      throw error
    }
  }

  async deleteEquipment(equipmentId: bigint, actorUserId: bigint, callerRoles: Role[], force = false) {
    const existing = await this.prisma.equipment.findFirst({ where: { equipmentId }, include: { room: true } })
    if (!existing) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Equipment không tồn tại' })

    if (force && !callerRoles.includes('owner')) {
      throw new ForbiddenException({ success: false, code: 'FORCE_DELETE_REQUIRES_OWNER', message: 'Chỉ owner mới được force delete equipment' })
    }

    const [openCount, resolvedCount] = await Promise.all([
      this.prisma.maintenanceLog.count({ where: { equipmentId, status: { in: [MaintenanceStatus.reported, MaintenanceStatus.repairing] } } }),
      this.prisma.maintenanceLog.count({ where: { equipmentId, status: { in: [MaintenanceStatus.resolved, MaintenanceStatus.failed] } } }),
    ])

    if (openCount > 0) {
      throw new ConflictException({
        success: false,
        code: 'EQUIPMENT_HAS_OPEN_MAINTENANCE',
        message: 'Thiết bị đang có maintenance mở, không thể xóa',
        details: { openMaintenanceCount: openCount },
      })
    }

    if (resolvedCount > 0 && !force) {
      throw new ConflictException({
        success: false,
        code: 'EQUIPMENT_HAS_RESOLVED_MAINTENANCE',
        message: 'Thiết bị đã có lịch sử bảo trì, hãy dùng status=retired thay vì xóa',
        details: { resolvedMaintenanceCount: resolvedCount },
      })
    }

    await this.prisma.$transaction(async (tx) => {
      if (resolvedCount > 0) {
        await tx.maintenanceLog.deleteMany({ where: { equipmentId, status: { in: [MaintenanceStatus.resolved, MaintenanceStatus.failed] } } })
      }
      await tx.equipment.delete({ where: { equipmentId } })
    })

    this.audit.log({
      actorUserId,
      action: 'equipment.delete',
      resourceType: 'equipment',
      resourceId: equipmentId.toString(),
      beforeData: this.serializeEquipmentDetail(existing, null, 0, null) as unknown as Record<string, unknown>,
    })
  }

  async listMaintenanceLogs(equipmentId: bigint, query: ListMaintenanceLogsDto) {
    const equipment = await this.prisma.equipment.findFirst({ where: { equipmentId } })
    if (!equipment) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Equipment không tồn tại' })

    const { page = 1, pageSize = 20, status, from, to } = query
    const where: Prisma.MaintenanceLogWhereInput = { equipmentId }

    if (status) where.status = status
    if (from || to) {
      where.reportedAt = {
        ...(from ? { gte: parseDateOnly(from) } : {}),
        ...(to ? { lt: addDays(parseDateOnly(to), 1) } : {}),
      }
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.maintenanceLog.findMany({
        where,
        include: { reportedByStaff: { include: { user: true } } },
        orderBy: { reportedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.maintenanceLog.count({ where }),
    ])

    return { data: data.map((row) => this.serializeMaintenanceLog(row)), meta: this.buildMeta(page, pageSize, totalItems) }
  }

  async createMaintenanceLog(equipmentId: bigint, dto: CreateMaintenanceLogDto, actorUserId: bigint) {
    const equipment = await this.prisma.equipment.findFirst({ where: { equipmentId }, include: { room: true } })
    if (!equipment) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Equipment không tồn tại' })

    if (equipment.status === EquipmentStatus.retired) {
      throw new ConflictException({ success: false, code: 'EQUIPMENT_RETIRED', message: 'Thiết bị đã thanh lý, không thể tạo maintenance log mới' })
    }

    const openCount = await this.prisma.maintenanceLog.count({ where: { equipmentId, status: { in: [MaintenanceStatus.reported, MaintenanceStatus.repairing] } } })
    if (openCount > 0) {
      throw new ConflictException({ success: false, code: 'EQUIPMENT_HAS_OPEN_MAINTENANCE', message: 'Thiết bị đã có maintenance mở, không thể báo thêm' })
    }

    const reporterStaff = await this.prisma.staff.findFirst({ where: { userId: actorUserId, deletedAt: null } })
    if (!reporterStaff) {
      throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Người báo hỏng phải có hồ sơ staff' })
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const log = await tx.maintenanceLog.create({
        data: {
          equipmentId,
          reportedByStaffId: reporterStaff.staffId,
          description: dto.description,
          status: MaintenanceStatus.reported,
          reportedAt: new Date(),
        },
        include: { reportedByStaff: { include: { user: true } } },
      })

      let equipmentUpdated = equipment
      if (equipment.status === EquipmentStatus.active) {
        equipmentUpdated = await tx.equipment.update({ where: { equipmentId }, data: { status: EquipmentStatus.broken }, include: { room: true } })
      }

      return { log, equipmentUpdated }
    })

    this.audit.log({
      actorUserId,
      action: 'maintenance.create',
      resourceType: 'maintenance_log',
      resourceId: result.log.maintenanceId.toString(),
      afterData: {
        ...this.serializeMaintenanceLog(result.log),
        equipment_status_change: equipment.status === EquipmentStatus.active ? { from: 'active', to: 'broken' } : null,
      } as unknown as Record<string, unknown>,
    })

    return {
      data: {
        maintenance: this.serializeMaintenanceLog(result.log),
        equipment: { equipmentId: result.equipmentUpdated.equipmentId.toString(), equipmentCode: result.equipmentUpdated.equipmentCode, status: result.equipmentUpdated.status },
      },
    }
  }

  async updateMaintenanceLog(maintenanceId: bigint, dto: UpdateMaintenanceLogDto, actorUserId: bigint) {
    const existing = await this.prisma.maintenanceLog.findFirst({
      where: { maintenanceId },
      include: { equipment: { include: { room: true } }, reportedByStaff: { include: { user: true } } },
    })
    if (!existing) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Maintenance log không tồn tại' })

    if (existing.status === MaintenanceStatus.resolved || existing.status === MaintenanceStatus.failed) {
      throw new ConflictException({ success: false, code: 'MAINTENANCE_ALREADY_CLOSED', message: 'Maintenance log đã đóng, không thể cập nhật tiếp' })
    }

    const nextStatus = dto.status
    if (nextStatus === MaintenanceStatus.repairing && existing.status !== MaintenanceStatus.reported) {
      throw new ConflictException({ success: false, code: 'MAINTENANCE_INVALID_STATE_TRANSITION', message: 'Chỉ có thể chuyển reported -> repairing' })
    }
    if ((nextStatus === MaintenanceStatus.resolved || nextStatus === MaintenanceStatus.failed) && existing.status !== MaintenanceStatus.repairing) {
      throw new ConflictException({ success: false, code: 'MAINTENANCE_INVALID_STATE_TRANSITION', message: 'Chỉ có thể chuyển repairing -> resolved/failed' })
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.MaintenanceLogUpdateInput = { status: nextStatus }
      if (nextStatus === MaintenanceStatus.resolved || nextStatus === MaintenanceStatus.failed) {
        updateData.resolvedAt = new Date()
      }

      const log = await tx.maintenanceLog.update({ where: { maintenanceId }, data: updateData, include: { reportedByStaff: { include: { user: true } } } })

      const equipmentStatus = nextStatus === MaintenanceStatus.repairing ? EquipmentStatus.repairing : nextStatus === MaintenanceStatus.resolved ? EquipmentStatus.active : EquipmentStatus.retired
      const equipment = await tx.equipment.update({ where: { equipmentId: existing.equipmentId }, data: { status: equipmentStatus }, include: { room: true } })

      return { log, equipment }
    })

    this.audit.log({
      actorUserId,
      action: nextStatus === MaintenanceStatus.repairing ? 'maintenance.update' : 'maintenance.resolve',
      resourceType: 'maintenance_log',
      resourceId: maintenanceId.toString(),
      beforeData: this.serializeMaintenanceLog(existing) as unknown as Record<string, unknown>,
      afterData: { ...this.serializeMaintenanceLog(result.log), equipment_status: result.equipment.status } as unknown as Record<string, unknown>,
    })

    return {
      data: {
        maintenance: this.serializeMaintenanceLog(result.log),
        equipment: { equipmentId: result.equipment.equipmentId.toString(), equipmentCode: result.equipment.equipmentCode, status: result.equipment.status },
      },
    }
  }

  private serializeRoom(room: { roomId: bigint; roomCode: string; name: string; roomType: string | null; capacity: number; description: string | null }) {
    return { roomId: room.roomId.toString(), roomCode: room.roomCode, name: room.name, roomType: room.roomType, capacity: room.capacity, description: room.description }
  }

  private serializeEquipment(equipment: { equipmentId: bigint; roomId: bigint | null; equipmentCode: string; name: string; importDate: Date; warrantyUntil: Date | null; status: EquipmentStatus | string; room?: { name: string } | null }) {
    return { equipmentId: equipment.equipmentId.toString(), roomId: equipment.roomId?.toString() ?? null, roomName: equipment.room?.name ?? null, equipmentCode: equipment.equipmentCode, name: equipment.name, importDate: equipment.importDate, warrantyUntil: equipment.warrantyUntil, status: equipment.status }
  }

  private serializeEquipmentDetail(
    equipment: { equipmentId: bigint; roomId: bigint; equipmentCode: string; name: string; importDate: Date; warrantyUntil: Date | null; status: EquipmentStatus | string; room?: { roomCode: string; name: string } },
    openMaintenance: { maintenanceId: bigint; equipmentId: bigint; description: string; status: MaintenanceStatus | string; reportedAt: Date; resolvedAt: Date | null; reportedByStaff: { staffId: bigint; staffCode: string; user: { fullName: string } } } | null,
    totalMaintenanceLogs: number,
    lastResolvedAt: Date | null,
  ) {
    return {
      equipmentId: equipment.equipmentId.toString(),
      equipmentCode: equipment.equipmentCode,
      roomId: equipment.roomId.toString(),
      roomName: equipment.room?.name ?? null,
      room: equipment.room ? { roomCode: equipment.room.roomCode, name: equipment.room.name } : undefined,
      name: equipment.name,
      importDate: equipment.importDate,
      warrantyUntil: equipment.warrantyUntil,
      status: equipment.status,
      openMaintenance: openMaintenance ? { maintenanceId: openMaintenance.maintenanceId.toString(), equipmentId: openMaintenance.equipmentId.toString(), reportedByStaff: { staffId: openMaintenance.reportedByStaff.staffId.toString(), staffCode: openMaintenance.reportedByStaff.staffCode, fullName: openMaintenance.reportedByStaff.user.fullName }, description: openMaintenance.description, status: openMaintenance.status, reportedAt: openMaintenance.reportedAt, resolvedAt: openMaintenance.resolvedAt } : null,
      stats: totalMaintenanceLogs > 0 || lastResolvedAt !== null ? { totalMaintenanceLogs, lastResolvedAt } : undefined,
    }
  }

  private serializeMaintenanceLog(log: { maintenanceId: bigint; equipmentId: bigint; reportedByStaffId: bigint; description: string; status: MaintenanceStatus | string; reportedAt: Date; resolvedAt: Date | null; reportedByStaff?: { staffId: bigint; staffCode: string; user: { fullName: string } } }) {
    return {
      maintenanceId: log.maintenanceId.toString(),
      equipmentId: log.equipmentId.toString(),
      reportedByStaff: log.reportedByStaff ? { staffId: log.reportedByStaff.staffId.toString(), staffCode: log.reportedByStaff.staffCode, fullName: log.reportedByStaff.user.fullName } : { staffId: log.reportedByStaffId.toString() },
      description: log.description,
      status: log.status,
      reportedAt: log.reportedAt,
      resolvedAt: log.resolvedAt,
    }
  }

  private buildMeta(page: number, pageSize: number, totalItems: number) {
    return { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) }
  }

  private hasAnyField(dto: object): boolean {
    return Object.values(dto as Record<string, unknown>).some((value) => value !== undefined)
  }

  private async generateRoomCode(): Promise<string> {
    const rows = await this.prisma.gymRoom.findMany({ select: { roomCode: true } })
    const maxNum = rows.reduce((max, { roomCode }) => {
      const n = Number.parseInt(roomCode.replace(/^ROOM-0*/, ''), 10)
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)
    for (let i = 1; i <= 20; i++) {
      const code = `ROOM-${String(maxNum + i).padStart(3, '0')}`
      const exists = await this.prisma.gymRoom.findFirst({ where: { roomCode: code } })
      if (!exists) return code
    }
    throw new InternalServerErrorException({ success: false, code: 'ROOM_CODE_GENERATION_FAILED', message: 'Không thể tự sinh roomCode' })
  }

  private async generateEquipmentCode(): Promise<string> {
    const rows = await this.prisma.equipment.findMany({ select: { equipmentCode: true } })
    const maxNum = rows.reduce((max, { equipmentCode }) => {
      const n = Number.parseInt(equipmentCode.replace(/^EQP-0*/, ''), 10)
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)
    for (let i = 1; i <= 20; i++) {
      const code = `EQP-${String(maxNum + i).padStart(6, '0')}`
      const exists = await this.prisma.equipment.findFirst({ where: { equipmentCode: code } })
      if (!exists) return code
    }
    throw new InternalServerErrorException({ success: false, code: 'EQUIPMENT_CODE_GENERATION_FAILED', message: 'Không thể tự sinh equipmentCode' })
  }
}
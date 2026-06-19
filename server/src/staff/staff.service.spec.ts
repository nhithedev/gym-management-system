import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { StaffShift } from '@prisma/client'
import { StaffService } from './staff.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: object = {}) {
  return {
    userId: 1n,
    email: 'staff@gym.local',
    fullName: 'Nguyen Van A',
    phone: '0900000000',
    status: 'pending_verification',
    deletedAt: null,
    ...overrides,
  }
}

function makeStaff(overrides: object = {}) {
  return {
    staffId: 10n,
    userId: 1n,
    staffCode: 'STF-2024-100001',
    position: 'staff',
    deletedAt: null,
    user: makeUser(),
    ...overrides,
  }
}

function makeSchedule(overrides: object = {}) {
  return {
    scheduleId: 100n,
    staffId: 10n,
    shift: StaffShift.morning,
    workDate: new Date('2099-12-01'),
    deletedAt: null,
    ...overrides,
  }
}

function makeAttendanceLog(overrides: object = {}) {
  return {
    logId: 200n,
    staffId: 10n,
    checkIn: new Date('2026-06-19T01:00:00.000Z'),
    checkOut: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeTx() {
  return {
    user: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    staff: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null), // default: no collision
      update: jest.fn(),
      delete: jest.fn(),
    },
    userGroup: {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    group: {
      findUnique: jest.fn(),
    },
    staffSchedule: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    trainingSession: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
    },
    attendanceLog: {
      updateMany: jest.fn(),
    },
    maintenanceLog: {
      deleteMany: jest.fn(),
    },
    staffAttendanceLog: {
      deleteMany: jest.fn(),
    },
    member: {
      updateMany: jest.fn(),
    },
    subscription: {
      updateMany: jest.fn(),
    },
    memberProgress: {
      updateMany: jest.fn(),
    },
    exercise: {
      updateMany: jest.fn(),
    },
    workoutPlan: {
      updateMany: jest.fn(),
    },
    memberWorkoutPlan: {
      updateMany: jest.fn(),
    },
    feedback: {
      updateMany: jest.fn(),
    },
    auditLog: {
      updateMany: jest.fn(),
    },
    file: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
    },
  }
}

// ---------------------------------------------------------------------------
// Mock objects
// ---------------------------------------------------------------------------

let tx: ReturnType<typeof makeTx>

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  staff: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  staffSchedule: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  staffAttendanceLog: {
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockAudit = {
  log: jest.fn(),
}

const mockScheduleService = {
  listSchedules: jest.fn(),
  createSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  listAllSchedules: jest.fn(),
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('StaffService', () => {
  let service: StaffService

  beforeEach(() => {
    tx = makeTx()
    service = new StaffService(mockPrisma as any, mockAudit as any, mockScheduleService as any)
    jest.clearAllMocks()
    // default: $transaction runs callback with tx object
    mockPrisma.$transaction.mockImplementation((arg: any) => {
      if (typeof arg === 'function') return arg(tx)
      // array form: just resolve all
      return Promise.all(arg)
    })
  })

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    const dto = {
      email: 'new@gym.local',
      fullName: 'Tran Thi B',
      phone: '0911111111',
      position: 'staff' as const,
    }

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser())

      await expect(service.create(dto, 1n)).rejects.toThrow(ConflictException)
    })

    it('happy path without groupIds: creates user + staff + assigns default group', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)
      const createdUser = makeUser({ userId: 2n, email: dto.email })
      const createdStaff = makeStaff({ staffId: 20n, userId: 2n })
      tx.user.create.mockResolvedValue(createdUser)
      tx.staff.findFirst.mockResolvedValue(null) // generateStaffCode loop
      tx.staff.create.mockResolvedValue(createdStaff)
      tx.group.findUnique.mockResolvedValue({ groupId: 5n, name: 'staff' })
      tx.userGroup.create.mockResolvedValue({})

      const result = await service.create(dto, 1n)

      expect(tx.user.create).toHaveBeenCalledTimes(1)
      expect(tx.staff.create).toHaveBeenCalledTimes(1)
      expect(tx.group.findUnique).toHaveBeenCalledWith({ where: { name: 'staff' } })
      expect(tx.userGroup.create).toHaveBeenCalledTimes(1)
      expect(result.staffId).toBe('20')
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'staff.create' })
      )
    })

    it('happy path with groupIds: calls createMany for custom groups', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)
      const createdUser = makeUser({ userId: 3n })
      const createdStaff = makeStaff({ staffId: 30n, userId: 3n })
      tx.user.create.mockResolvedValue(createdUser)
      tx.staff.findFirst.mockResolvedValue(null)
      tx.staff.create.mockResolvedValue(createdStaff)
      tx.userGroup.createMany.mockResolvedValue({ count: 2 })

      const dtoWithGroups = { ...dto, groupIds: ['1', '2'] }
      await service.create(dtoWithGroups, 1n)

      expect(tx.userGroup.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ groupId: 1n }),
            expect.objectContaining({ groupId: 2n }),
          ]),
        })
      )
      expect(tx.group.findUnique).not.toHaveBeenCalled()
    })

    it('throws ConflictException on Prisma P2002', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockPrisma.$transaction.mockRejectedValue({ code: 'P2002' })

      await expect(service.create(dto, 1n)).rejects.toThrow(ConflictException)
    })
  })

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  describe('list', () => {
    it('status=deleted and caller is not owner → BadRequestException', async () => {
      const caller = { roles: ['staff'] } as any

      await expect(service.list({ status: 'deleted' }, caller)).rejects.toThrow(BadRequestException)
    })

    it('status=deleted and caller is owner → queries deletedAt not null', async () => {
      const caller = { roles: ['owner'] } as any
      mockPrisma.staff.findMany.mockResolvedValue([])
      mockPrisma.staff.count.mockResolvedValue(0)

      await service.list({ status: 'deleted' }, caller)

      const whereArg = mockPrisma.staff.findMany.mock.calls[0][0].where
      expect(whereArg.deletedAt).toEqual({ not: null })
    })

    it('no filter → normal list, returns meta', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([makeStaff()])
      mockPrisma.staff.count.mockResolvedValue(1)

      const result = await service.list({})

      expect(result.data).toHaveLength(1)
      expect(result.meta).toMatchObject({ page: 1, pageSize: 20, totalItems: 1 })
    })

    it('position and search filters apply correct where clauses', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([])
      mockPrisma.staff.count.mockResolvedValue(0)

      await service.list({ position: 'trainer', search: 'nguyen' })

      const whereArg = mockPrisma.staff.findMany.mock.calls[0][0].where
      expect(whereArg.position).toBe('trainer')
      expect(whereArg.OR).toBeDefined()
      expect(whereArg.OR).toHaveLength(3)
    })
  })

  // -------------------------------------------------------------------------
  // get
  // -------------------------------------------------------------------------

  describe('get', () => {
    it('throws NotFoundException when staff not found', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      await expect(service.get(99n)).rejects.toThrow(NotFoundException)
    })

    it('returns serialized staff when found', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())

      const result = await service.get(10n)

      expect(result.staffId).toBe('10')
      expect(typeof result.staffId).toBe('string')
    })
  })

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe('update', () => {
    it('throws NotFoundException when staff not found', async () => {
      mockPrisma.staff.findFirst.mockResolvedValueOnce(null)

      await expect(service.update(99n, { fullName: 'X' }, 1n)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when fullName is null', async () => {
      mockPrisma.staff.findFirst.mockResolvedValueOnce(makeStaff())

      await expect(service.update(10n, { fullName: null }, 1n)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when position is null', async () => {
      mockPrisma.staff.findFirst.mockResolvedValueOnce(makeStaff())

      await expect(service.update(10n, { position: null }, 1n)).rejects.toThrow(BadRequestException)
    })

    it('happy path → runs transaction, calls get, calls audit', async () => {
      const existing = makeStaff()
      mockPrisma.staff.findFirst
        .mockResolvedValueOnce(existing) // initial findFirst in update()
        .mockResolvedValueOnce(makeStaff({ position: 'trainer' })) // called by get() at end
      tx.user.update.mockResolvedValue({})
      tx.staff.update.mockResolvedValue({})

      const result = await service.update(10n, { fullName: 'New Name', position: 'trainer' }, 1n)

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { fullName: 'New Name' } })
      )
      expect(tx.staff.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { position: 'trainer' } })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'staff.update', actorUserId: 1n })
      )
      expect(result.staffId).toBe('10')
    })
  })

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  describe('delete', () => {
    it('throws NotFoundException when staff not found', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      await expect(service.delete(99n, 1n)).rejects.toThrow(NotFoundException)
    })

    it('happy path → hard deletes staff and all related data, calls audit', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())

      // actorUserId = 2n để không bị self-delete guard (staff.userId = 1n)
      const result = await service.delete(10n, 2n)

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ success: true })
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'staff.delete', actorUserId: 2n })
      )
    })
  })

  // -------------------------------------------------------------------------
  // listTrainers
  // -------------------------------------------------------------------------

  describe('listTrainers', () => {
    it('queries only trainer and pt positions', async () => {
      const trainerStaff = makeStaff({
        staffId: 50n,
        position: 'trainer',
        user: makeUser({ fullName: 'Coach A' }),
      })
      mockPrisma.staff.findMany.mockResolvedValue([trainerStaff])

      const result = await service.listTrainers()

      const whereArg = mockPrisma.staff.findMany.mock.calls[0][0].where
      expect(whereArg.position).toEqual({ in: ['trainer', 'pt'] })
      expect(result).toHaveLength(1)
      expect(result[0].position).toBe('trainer')
      expect(result[0].staffId).toBe('50')
    })
  })

  // -------------------------------------------------------------------------
  // listSchedules — delegates to StaffScheduleService
  // -------------------------------------------------------------------------

  describe('listSchedules', () => {
    it('delegates to scheduleService and returns its result', async () => {
      const expected = [makeSchedule()]
      mockScheduleService.listSchedules.mockResolvedValue(expected)

      const result = await service.listSchedules(10n)

      expect(mockScheduleService.listSchedules).toHaveBeenCalledWith(10n)
      expect(result).toBe(expected)
    })
  })

  // -------------------------------------------------------------------------
  // createSchedule — delegates to StaffScheduleService
  // -------------------------------------------------------------------------

  describe('createSchedule', () => {
    it('delegates to scheduleService and returns its result', async () => {
      const dto = { schedules: [{ shift: StaffShift.morning, workDate: '2099-12-15' }] }
      const expected = { created: 1, schedules: [makeSchedule()] }
      mockScheduleService.createSchedule.mockResolvedValue(expected)

      const result = await service.createSchedule(10n, dto, 1n)

      expect(mockScheduleService.createSchedule).toHaveBeenCalledWith(10n, dto, 1n)
      expect(result).toBe(expected)
    })
  })

  describe('listAllSchedules', () => {
    it('delegates to scheduleService and returns its result', async () => {
      const expected = [{ staffCode: 'STF-STA-001', fullName: 'Le Thi Linh' }]
      mockScheduleService.listAllSchedules.mockResolvedValue(expected)

      const result = await service.listAllSchedules('2099-12-01', '2099-12-31')

      expect(mockScheduleService.listAllSchedules).toHaveBeenCalledWith('2099-12-01', '2099-12-31')
      expect(result).toBe(expected)
    })
  })

  // -------------------------------------------------------------------------
  // deleteSchedule — delegates to StaffScheduleService
  // -------------------------------------------------------------------------

  describe('deleteSchedule', () => {
    it('delegates to scheduleService and returns its result', async () => {
      const expected = { success: true }
      mockScheduleService.deleteSchedule.mockResolvedValue(expected)

      const result = await service.deleteSchedule(10n, 100n, 1n)

      expect(mockScheduleService.deleteSchedule).toHaveBeenCalledWith(10n, 100n, 1n)
      expect(result).toBe(expected)
    })
  })

  describe('attendanceCheckIn', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-19T03:00:00.000Z'))
    })

    afterEach(() => jest.useRealTimers())

    it('rejects a second check-in on the same Vietnam calendar day', async () => {
      mockPrisma.staffAttendanceLog.findFirst.mockResolvedValue(makeAttendanceLog())

      await expect(service.attendanceCheckIn(10n)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'ALREADY_CHECKED_IN' }),
      })
      expect(mockPrisma.staffAttendanceLog.delete).not.toHaveBeenCalled()
      expect(mockPrisma.staffAttendanceLog.create).not.toHaveBeenCalled()
    })

    it('deletes a stale open attendance before creating the new check-in', async () => {
      mockPrisma.staffAttendanceLog.findFirst.mockResolvedValue(
        makeAttendanceLog({ checkIn: new Date('2026-06-18T01:00:00.000Z') })
      )
      mockPrisma.staffAttendanceLog.create.mockResolvedValue(
        makeAttendanceLog({ checkIn: new Date('2026-06-19T03:00:00.000Z') })
      )

      const result = await service.attendanceCheckIn(10n)

      expect(mockPrisma.staffAttendanceLog.delete).toHaveBeenCalledWith({ where: { logId: 200n } })
      expect(mockPrisma.staffAttendanceLog.create).toHaveBeenCalledWith({
        data: { staffId: 10n, checkIn: new Date('2026-06-19T03:00:00.000Z') },
      })
      expect(result).toEqual({
        logId: '200',
        staffId: '10',
        checkIn: '2026-06-19T03:00:00.000Z',
        checkOut: null,
        durationMinutes: null,
      })
    })

    it('creates a check-in directly when there is no open attendance', async () => {
      mockPrisma.staffAttendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.staffAttendanceLog.create.mockResolvedValue(makeAttendanceLog())

      await service.attendanceCheckIn(10n)

      expect(mockPrisma.staffAttendanceLog.delete).not.toHaveBeenCalled()
      expect(mockPrisma.staffAttendanceLog.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('attendanceCheckOut', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-19T03:00:00.000Z'))
    })

    afterEach(() => jest.useRealTimers())

    it('rejects checkout when there is no open attendance', async () => {
      mockPrisma.staffAttendanceLog.findFirst.mockResolvedValue(null)

      await expect(service.attendanceCheckOut(10n)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NOT_CHECKED_IN' }),
      })
      expect(mockPrisma.staffAttendanceLog.update).not.toHaveBeenCalled()
    })

    it('voids an open attendance when checkout occurs on another Vietnam calendar day', async () => {
      mockPrisma.staffAttendanceLog.findFirst.mockResolvedValue(
        makeAttendanceLog({ checkIn: new Date('2026-06-18T01:00:00.000Z') })
      )

      await expect(service.attendanceCheckOut(10n)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'ATTENDANCE_VOIDED_DIFFERENT_DAY' }),
      })
      expect(mockPrisma.staffAttendanceLog.delete).toHaveBeenCalledWith({ where: { logId: 200n } })
      expect(mockPrisma.staffAttendanceLog.update).not.toHaveBeenCalled()
    })

    it('updates and serializes a same-day checkout with its duration', async () => {
      const open = makeAttendanceLog({ checkIn: new Date('2026-06-19T01:30:00.000Z') })
      mockPrisma.staffAttendanceLog.findFirst.mockResolvedValue(open)
      mockPrisma.staffAttendanceLog.update.mockResolvedValue({
        ...open,
        checkOut: new Date('2026-06-19T03:00:00.000Z'),
      })

      const result = await service.attendanceCheckOut(10n)

      expect(mockPrisma.staffAttendanceLog.update).toHaveBeenCalledWith({
        where: { logId: 200n },
        data: { checkOut: new Date('2026-06-19T03:00:00.000Z') },
      })
      expect(result.durationMinutes).toBe(90)
      expect(result.checkOut).toBe('2026-06-19T03:00:00.000Z')
    })
  })

  describe('getMyAttendance', () => {
    afterEach(() => jest.useRealTimers())

    it('applies explicit date filters, caps page size, and serializes records', async () => {
      mockPrisma.staffAttendanceLog.findMany.mockResolvedValue([
        makeAttendanceLog({
          checkIn: new Date('2026-06-19T01:00:00.000Z'),
          checkOut: new Date('2026-06-19T02:15:00.000Z'),
        }),
      ])
      mockPrisma.staffAttendanceLog.count.mockResolvedValue(1)

      const result = await service.getMyAttendance(10n, {
        from: '2026-06-01',
        to: '2026-06-30',
        pageSize: 999,
      })

      expect(mockPrisma.staffAttendanceLog.findMany).toHaveBeenCalledWith({
        where: {
          staffId: 10n,
          checkIn: { gte: new Date('2026-06-01'), lte: new Date('2026-06-30') },
        },
        orderBy: { checkIn: 'desc' },
        take: 200,
      })
      expect(result).toEqual({
        data: [expect.objectContaining({ logId: '200', durationMinutes: 75 })],
        total: 1,
      })
    })

    it('uses the current month and default page size when filters are omitted', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-19T03:00:00.000Z'))
      mockPrisma.staffAttendanceLog.findMany.mockResolvedValue([])
      mockPrisma.staffAttendanceLog.count.mockResolvedValue(0)

      await service.getMyAttendance(10n, {})

      expect(mockPrisma.staffAttendanceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            staffId: 10n,
            checkIn: {
              gte: new Date(2026, 5, 1),
              lte: new Date(2026, 5, 30, 23, 59, 59, 999),
            },
          },
          take: 100,
        })
      )
    })
  })
})

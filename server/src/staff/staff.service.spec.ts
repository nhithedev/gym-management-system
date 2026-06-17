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

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeTx() {
  return {
    user: {
      create: jest.fn(),
      update: jest.fn(),
    },
    staff: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null), // default: no collision
      update: jest.fn(),
    },
    userGroup: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    group: {
      findUnique: jest.fn(),
    },
    staffSchedule: {
      createMany: jest.fn(),
      findMany: jest.fn(),
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
  $transaction: jest.fn(),
}

const mockAudit = {
  log: jest.fn(),
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('StaffService', () => {
  let service: StaffService

  beforeEach(() => {
    tx = makeTx()
    service = new StaffService(mockPrisma as any, mockAudit as any)
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

    it('happy path → soft deletes user + staff in transaction, calls audit', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      // array-form transaction
      mockPrisma.staff.update.mockResolvedValue({})
      mockPrisma.user.update.mockResolvedValue({})

      const result = await service.delete(10n, 1n)

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ success: true })
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'staff.delete', actorUserId: 1n })
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
  // listSchedules
  // -------------------------------------------------------------------------

  describe('listSchedules', () => {
    it('throws NotFoundException when staff not found', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      await expect(service.listSchedules(99n)).rejects.toThrow(NotFoundException)
    })

    it('returns serialized schedules when staff found', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.staffSchedule.findMany.mockResolvedValue([makeSchedule()])

      const result = await service.listSchedules(10n)

      expect(result).toHaveLength(1)
      expect(result[0].scheduleId).toBe('100')
      expect(result[0].workDate).toBe('2099-12-01')
    })
  })

  // -------------------------------------------------------------------------
  // createSchedule
  // -------------------------------------------------------------------------

  describe('createSchedule', () => {
    const futureDate = '2099-12-15'

    it('throws NotFoundException when staff not found', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      await expect(
        service.createSchedule(
          99n,
          { schedules: [{ shift: StaffShift.morning, workDate: futureDate }] },
          1n
        )
      ).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when workDate is in the past', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())

      await expect(
        service.createSchedule(
          10n,
          { schedules: [{ shift: StaffShift.morning, workDate: '2000-01-01' }] },
          1n
        )
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when target profile is trainer', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff({ position: 'trainer' }))

      await expect(
        service.createSchedule(
          10n,
          { schedules: [{ shift: StaffShift.morning, workDate: futureDate }] },
          1n
        )
      ).rejects.toThrow(BadRequestException)
      expect(mockPrisma.staffSchedule.findMany).not.toHaveBeenCalled()
    })

    it('throws BadRequestException when batch contains duplicate shift+date', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())

      await expect(
        service.createSchedule(
          10n,
          {
            schedules: [
              { shift: StaffShift.morning, workDate: futureDate },
              { shift: StaffShift.morning, workDate: futureDate },
            ],
          },
          1n
        )
      ).rejects.toThrow(BadRequestException)
    })

    it('throws ConflictException when schedule conflicts exist in DB', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.staffSchedule.findMany.mockResolvedValue([makeSchedule()])

      await expect(
        service.createSchedule(
          10n,
          { schedules: [{ shift: StaffShift.morning, workDate: futureDate }] },
          1n
        )
      ).rejects.toThrow(ConflictException)
    })

    it('happy path → creates schedules, calls audit, returns count', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.staffSchedule.findMany.mockResolvedValue([]) // no conflicts
      const createdSchedules = [makeSchedule()]
      tx.staffSchedule.createMany.mockResolvedValue({ count: 1 })
      tx.staffSchedule.findMany.mockResolvedValue(createdSchedules)

      const result = await service.createSchedule(
        10n,
        { schedules: [{ shift: StaffShift.morning, workDate: futureDate }] },
        1n
      )

      expect(tx.staffSchedule.createMany).toHaveBeenCalledTimes(1)
      expect(result.created).toBe(1)
      expect(result.schedules).toHaveLength(1)
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'schedule.assign', actorUserId: 1n })
      )
    })

    it('allows one staff to work multiple different shifts on the same day', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.staffSchedule.findMany.mockResolvedValue([])
      const createdSchedules = [
        makeSchedule({ shift: StaffShift.morning }),
        makeSchedule({ scheduleId: 101n, shift: StaffShift.afternoon }),
      ]
      tx.staffSchedule.createMany.mockResolvedValue({ count: 2 })
      tx.staffSchedule.findMany.mockResolvedValue(createdSchedules)

      const result = await service.createSchedule(
        10n,
        {
          schedules: [
            { shift: StaffShift.morning, workDate: futureDate },
            { shift: StaffShift.afternoon, workDate: futureDate },
          ],
        },
        1n
      )

      expect(tx.staffSchedule.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ staffId: 10n, shift: StaffShift.morning }),
            expect.objectContaining({ staffId: 10n, shift: StaffShift.afternoon }),
          ]),
        })
      )
      expect(result.created).toBe(2)
      expect(result.schedules.map((schedule) => schedule.shift)).toEqual([
        StaffShift.morning,
        StaffShift.afternoon,
      ])
    })
  })

  describe('listAllSchedules', () => {
    it('returns only schedules assigned to staff position profiles', async () => {
      mockPrisma.staffSchedule.findMany.mockResolvedValue([
        {
          ...makeSchedule(),
          staff: {
            staffCode: 'STF-STA-001',
            user: { fullName: 'Le Thi Linh' },
          },
        },
      ])

      const result = await service.listAllSchedules('2099-12-01', '2099-12-31')

      expect(mockPrisma.staffSchedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            staff: { deletedAt: null, position: 'staff' },
          }),
        })
      )
      expect(result).toEqual([
        expect.objectContaining({
          staffCode: 'STF-STA-001',
          fullName: 'Le Thi Linh',
        }),
      ])
    })
  })

  // -------------------------------------------------------------------------
  // deleteSchedule
  // -------------------------------------------------------------------------

  describe('deleteSchedule', () => {
    it('throws NotFoundException when schedule not found', async () => {
      mockPrisma.staffSchedule.findFirst.mockResolvedValue(null)

      await expect(service.deleteSchedule(10n, 999n, 1n)).rejects.toThrow(NotFoundException)
    })

    it('happy path → soft deletes schedule, calls audit', async () => {
      mockPrisma.staffSchedule.findFirst.mockResolvedValue(makeSchedule())
      mockPrisma.staffSchedule.update.mockResolvedValue({})

      const result = await service.deleteSchedule(10n, 100n, 1n)

      expect(mockPrisma.staffSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scheduleId: 100n },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
      expect(result).toEqual({ success: true })
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'schedule.remove', actorUserId: 1n })
      )
    })
  })
})

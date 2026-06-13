import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { TrainingService } from './training.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function futureTime(offsetMinutes = 30): Date {
  return new Date(Date.now() + offsetMinutes * 60 * 1000)
}

function makeSession(overrides: object = {}) {
  const start = futureTime(60)
  const end = futureTime(120)
  return {
    sessionId: 1n,
    memberId: 10n,
    trainerStaffId: 5n,
    roomId: 3n,
    startTime: start,
    endTime: end,
    status: 'scheduled' as const,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    member: { memberId: 10n, user: { fullName: 'Test Member' } },
    trainer: { staffId: 5n, user: { fullName: 'Test Trainer' } },
    room: { roomId: 3n, name: 'Room A' },
    attendanceLogs: [],
    ...overrides,
  }
}

function makeMember(overrides: object = {}) {
  return {
    memberId: 10n,
    userId: 100n,
    memberCode: 'MEM-001',
    primaryTrainerId: null as bigint | null,
    deletedAt: null,
    ...overrides,
  }
}

function makeStaff(overrides: object = {}) {
  return {
    staffId: 5n,
    userId: 200n,
    staffCode: 'ST-001',
    deletedAt: null,
    ...overrides,
  }
}

function makeRoom(overrides: object = {}) {
  return {
    roomId: 3n,
    name: 'Room A',
    ...overrides,
  }
}

function makeSubscription(overrides: object = {}) {
  return {
    subscriptionId: 20n,
    memberId: 10n,
    status: 'active',
    startDate: new Date('2020-01-01'),
    endDate: new Date('2099-12-31'),
    deletedAt: null,
    ...overrides,
  }
}

function makeCaller(overrides: object = {}) {
  return {
    userId: 999n,
    roles: ['owner'] as string[],
    staffId: undefined as bigint | undefined,
    memberId: undefined as bigint | undefined,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  trainingSession: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  member: {
    findFirst: jest.fn(),
  },
  gymRoom: {
    findFirst: jest.fn(),
  },
  staff: {
    findFirst: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
  },
}

const mockAudit = {
  log: jest.fn(),
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TrainingService', () => {
  let service: TrainingService

  beforeEach(() => {
    service = new TrainingService(mockPrisma as any, mockAudit as any)
    jest.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // createSession
  // -------------------------------------------------------------------------

  describe('createSession', () => {
    function makeDto(overrides: object = {}) {
      const start = futureTime(30)
      const end = futureTime(90)
      return {
        memberId: '10',
        roomId: '3',
        trainerStaffId: '5',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        ...overrides,
      }
    }

    it('throws BadRequestException (VALIDATION_ERROR) when endTime <= startTime', async () => {
      const now = futureTime(30)
      const dto = makeDto({
        startTime: now.toISOString(),
        endTime: now.toISOString(), // equal → invalid
      })
      const caller = makeCaller()

      await expect(service.createSession(dto as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      })
      await expect(service.createSession(dto as any, caller)).rejects.toBeInstanceOf(
        BadRequestException
      )
    })

    it('throws BadRequestException (VALIDATION_ERROR) when startTime is in the past (< now + 5min)', async () => {
      const past = new Date(Date.now() - 60 * 1000) // 1 min ago
      const dto = makeDto({
        startTime: past.toISOString(),
        endTime: futureTime(60).toISOString(),
      })
      const caller = makeCaller()

      await expect(service.createSession(dto as any, caller)).rejects.toBeInstanceOf(
        BadRequestException
      )
      await expect(service.createSession(dto as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      })
    })

    it('throws BadRequestException (FK_CONSTRAINT) when member does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = makeCaller()
      const dto = makeDto()

      await expect(service.createSession(dto as any, caller)).rejects.toBeInstanceOf(
        BadRequestException
      )
      await expect(service.createSession(dto as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FK_CONSTRAINT' }),
      })
    })

    it('throws BadRequestException (FK_CONSTRAINT) when room does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.gymRoom.findFirst.mockResolvedValue(null)
      const caller = makeCaller()
      const dto = makeDto()

      await expect(service.createSession(dto as any, caller)).rejects.toBeInstanceOf(
        BadRequestException
      )
      await expect(service.createSession(dto as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FK_CONSTRAINT' }),
      })
    })

    it('throws ConflictException (MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION) when member has no active subscription', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      const caller = makeCaller()
      const dto = makeDto()

      await expect(service.createSession(dto as any, caller)).rejects.toBeInstanceOf(
        ConflictException
      )
      await expect(service.createSession(dto as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION' }),
      })
    })

    it('throws ConflictException (ROOM_TIME_OVERLAP) when room has overlapping session', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      // trainingSession.findFirst = room overlap check → returns existing session
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession())
      const caller = makeCaller()
      const dto = makeDto()

      const error: any = await service.createSession(dto as any, caller).catch((e) => e)
      expect(error).toBeInstanceOf(ConflictException)
      expect(error.response.code).toBe('ROOM_TIME_OVERLAP')
    })

    it('happy path with owner caller: creates session, calls audit.log, returns sessionId as string', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      // No overlap for room check, no overlap for trainer check
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      const createdSession = makeSession()
      mockPrisma.trainingSession.create.mockResolvedValue(createdSession)
      mockAudit.log.mockResolvedValue(undefined)

      const caller = makeCaller()
      const dto = makeDto()

      const result = await service.createSession(dto as any, caller)

      expect(mockPrisma.trainingSession.create).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'training.create' })
      )
      expect(result.data.sessionId).toBe('1')
    })
  })

  // -------------------------------------------------------------------------
  // cancelSession
  // -------------------------------------------------------------------------

  describe('cancelSession', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.cancelSession(1n, {} as any, caller)).rejects.toBeInstanceOf(
        NotFoundException
      )
    })

    it('throws ConflictException (SESSION_NOT_CANCELLABLE) when session is completed', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession({ status: 'completed' }))
      const caller = makeCaller()

      await expect(service.cancelSession(1n, {} as any, caller)).rejects.toBeInstanceOf(
        ConflictException
      )
      await expect(service.cancelSession(1n, {} as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'SESSION_NOT_CANCELLABLE' }),
      })
    })

    it('throws ForbiddenException (FORBIDDEN) when trainer is not session owner', async () => {
      // Session belongs to trainerStaffId=5n, but caller is trainer with staffId=99n
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession({ trainerStaffId: 5n }))
      const caller = makeCaller({ roles: ['trainer'], staffId: 99n })

      await expect(service.cancelSession(1n, {} as any, caller)).rejects.toBeInstanceOf(
        ForbiddenException
      )
      await expect(service.cancelSession(1n, {} as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })

    it('throws ConflictException (SESSION_CANCEL_WINDOW_CLOSED) when PT cancels within 2 hours of startTime', async () => {
      // startTime is 1 hour from now — within 2h window
      const startTime = futureTime(60)
      mockPrisma.trainingSession.findFirst.mockResolvedValue(
        makeSession({ trainerStaffId: 5n, startTime })
      )
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(service.cancelSession(1n, {} as any, caller)).rejects.toBeInstanceOf(
        ConflictException
      )
      await expect(service.cancelSession(1n, {} as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'SESSION_CANCEL_WINDOW_CLOSED' }),
      })
    })

    it('happy path with owner caller: updates status to cancelled, calls audit.log', async () => {
      const session = makeSession()
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.trainingSession.update.mockResolvedValue({ ...session, status: 'cancelled' })
      mockAudit.log.mockResolvedValue(undefined)
      const caller = makeCaller()

      await service.cancelSession(1n, {} as any, caller)

      expect(mockPrisma.trainingSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 1n },
          data: { status: 'cancelled' },
        })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'training.cancel' })
      )
    })
  })

  // -------------------------------------------------------------------------
  // listSessions
  // -------------------------------------------------------------------------

  describe('listSessions', () => {
    beforeEach(() => {
      mockPrisma.trainingSession.findMany.mockResolvedValue([])
      mockPrisma.trainingSession.count.mockResolvedValue(0)
    })

    it('member only: filters by caller memberId (resolveCallerMemberId)', async () => {
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      await service.listSessions({} as any, caller)

      const whereArg = mockPrisma.trainingSession.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBe(10n)
    })

    it('member only without memberId in caller: resolves via prisma.member.findFirst', async () => {
      const caller = makeCaller({ roles: ['member'], memberId: undefined, userId: 100n })
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n })

      await service.listSessions({} as any, caller)

      const whereArg = mockPrisma.trainingSession.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBe(10n)
    })

    it('trainer only: filters by trainerStaffId of caller', async () => {
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await service.listSessions({} as any, caller)

      const whereArg = mockPrisma.trainingSession.findMany.mock.calls[0][0].where
      expect(whereArg.trainerStaffId).toBe(5n)
    })

    it('owner: no role-based filter, returns all sessions', async () => {
      const caller = makeCaller({ roles: ['owner'] })

      await service.listSessions({} as any, caller)

      const whereArg = mockPrisma.trainingSession.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBeUndefined()
      expect(whereArg.trainerStaffId).toBeUndefined()
    })

    it('returns correct pagination meta', async () => {
      mockPrisma.trainingSession.count.mockResolvedValue(45)
      const caller = makeCaller()

      const result = await service.listSessions({ page: 2, pageSize: 10 } as any, caller)

      expect(result.meta).toEqual(
        expect.objectContaining({ page: 2, pageSize: 10, totalItems: 45, totalPages: 5 })
      )
    })
  })

  // -------------------------------------------------------------------------
  // getSession
  // -------------------------------------------------------------------------

  describe('getSession', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.getSession(999n, caller)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('owner: returns session with sessionId as string', async () => {
      const session = makeSession({ attendanceLogs: [] })
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      const caller = makeCaller({ roles: ['owner'] })

      const result = await service.getSession(1n, caller)

      expect(result.data.sessionId).toBe('1')
    })
  })

  // -------------------------------------------------------------------------
  // updateSessionStatus
  // -------------------------------------------------------------------------

  describe('updateSessionStatus', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.updateSessionStatus(999n, 'in_progress', caller)).rejects.toBeInstanceOf(
        NotFoundException
      )
    })

    it('throws ConflictException (SESSION_ALREADY_FINISHED) when session is completed', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession({ status: 'completed' }))
      const caller = makeCaller()

      await expect(service.updateSessionStatus(1n, 'in_progress', caller)).rejects.toBeInstanceOf(
        ConflictException
      )
      await expect(service.updateSessionStatus(1n, 'in_progress', caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'SESSION_ALREADY_FINISHED' }),
      })
    })

    it('throws ConflictException (INVALID_STATUS_TRANSITION) when status=in_progress but session is already in_progress', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(makeSession({ status: 'in_progress' }))
      const caller = makeCaller()

      await expect(service.updateSessionStatus(1n, 'in_progress', caller)).rejects.toBeInstanceOf(
        ConflictException
      )
      await expect(service.updateSessionStatus(1n, 'in_progress', caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }),
      })
    })

    it('happy path: updates status, calls audit.log, returns sessionId as string', async () => {
      const session = makeSession({ status: 'scheduled' })
      const updatedSession = makeSession({ status: 'in_progress' })
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.trainingSession.update.mockResolvedValue(updatedSession)
      mockAudit.log.mockResolvedValue(undefined)
      const caller = makeCaller()

      const result = await service.updateSessionStatus(1n, 'in_progress', caller)

      expect(mockPrisma.trainingSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 1n },
          data: { status: 'in_progress' },
        })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'training.status.in_progress' })
      )
      expect(result.data.sessionId).toBe('1')
    })
  })
})

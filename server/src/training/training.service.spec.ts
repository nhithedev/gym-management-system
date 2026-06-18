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
    assignmentId: null as bigint | null,
    planDayId: null as bigint | null,
    startTime: start,
    endTime: end,
    status: 'scheduled' as const,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    member: { memberId: 10n, user: { fullName: 'Test Member' } },
    trainer: { staffId: 5n, user: { fullName: 'Test Trainer' } },
    room: { roomId: 3n, name: 'Room A' },
    assignment: null,
    planDay: null,
    attendanceLogs: [],
    ...overrides,
  }
}

function makeLinkedSession(overrides: object = {}) {
  return makeSession({
    assignmentId: 100n,
    planDayId: 10n,
    assignment: {
      assignmentId: 100n,
      planId: 1n,
      plan: { planId: 1n, name: 'Strength Plan', description: null, status: 'active' },
    },
    planDay: {
      planDayId: 10n,
      planId: 1n,
      dayNumber: 1,
      weekNumber: 1,
      dayOfWeek: 2,
      name: 'Upper Body',
      notes: null,
      exercises: [],
    },
    ...overrides,
  })
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
  memberWorkoutPlan: {
    findFirst: jest.fn(),
  },
  workoutPlanDay: {
    findFirst: jest.fn(),
  },
  attendanceLog: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  memberProgress: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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

    it('owner: returns session with linked workout plan details', async () => {
      const session = makeLinkedSession({
        attendanceLogs: [],
        planDay: {
          planDayId: 10n,
          planId: 1n,
          dayNumber: 1,
          weekNumber: 1,
          dayOfWeek: 2,
          name: 'Upper Body',
          notes: 'Warm up carefully',
          exercises: [
            {
              planExerciseId: 50n,
              planDayId: 10n,
              exerciseId: 7n,
              orderIndex: 1,
              targetSets: 3,
              targetReps: 12,
              targetDurationSec: null,
              targetWeightKg: null,
              restSeconds: 60,
              notes: null,
              exercise: {
                exerciseId: 7n,
                name: 'Push-up',
                category: 'strength',
                muscleGroup: 'Chest',
                equipmentNeeded: null,
                description: null,
                imageUrl: null,
                createdByStaffId: 5n,
                createdAt: new Date(),
                deletedAt: null,
              },
            },
          ],
        },
      })
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      const caller = makeCaller({ roles: ['owner'] })

      const result = await service.getSession(1n, caller)

      expect(result.data.sessionId).toBe('1')
      expect(result.data.workoutPlan?.name).toBe('Strength Plan')
      expect(result.data.planDay?.exercises).toHaveLength(1)
      expect(result.data.planDay?.exercises[0].exercise?.name).toBe('Push-up')
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

  // -------------------------------------------------------------------------
  // listSessions — missing error paths (Phase 10)
  // -------------------------------------------------------------------------

  describe('listSessions — error paths', () => {
    it('member only without memberId: throws ForbiddenException when no member profile', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['member'], memberId: undefined })

      await expect(service.listSessions({} as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })

    it('trainer only without staffId: throws ForbiddenException when no staff profile', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['trainer'], staffId: undefined })

      await expect(service.listSessions({} as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })

    it('trainer only with staffId: filters sessions by trainerStaffId', async () => {
      mockPrisma.trainingSession.findMany.mockResolvedValue([])
      mockPrisma.trainingSession.count.mockResolvedValue(0)
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await service.listSessions({} as any, caller)

      const callArg = (mockPrisma.trainingSession.findMany as jest.Mock).mock.calls[0][0]
      expect(callArg.where.trainerStaffId).toBe(5n)
    })

    it('returns serialized sessions with data map', async () => {
      const session = makeLinkedSession()
      mockPrisma.trainingSession.findMany.mockResolvedValue([session])
      mockPrisma.trainingSession.count.mockResolvedValue(1)
      const caller = makeCaller()

      const result = await service.listSessions({} as any, caller)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].sessionId).toBe('1')
      expect(result.data[0].assignmentId).toBe('100')
      expect(result.data[0].workoutPlan?.name).toBe('Strength Plan')
      expect(result.data[0].planDay?.name).toBe('Upper Body')
    })
  })

  // -------------------------------------------------------------------------
  // createSession — trainer caller path (Phase 10)
  // -------------------------------------------------------------------------

  describe('createSession — trainer caller paths', () => {
    function makeDto(overrides: object = {}) {
      const start = futureTime(30)
      const end = futureTime(90)
      return { memberId: '10', roomId: '3', startTime: start.toISOString(), endTime: end.toISOString(), ...overrides }
    }

    it('trainer caller must provide workout assignment and plan day', async () => {
      const member = makeMember({ primaryTrainerId: 5n })
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(service.createSession(makeDto() as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'WORKOUT_PLAN_REQUIRED' }),
      })
    })

    it('rejects assignment that is not active or does not belong to the member', async () => {
      const member = makeMember({ primaryTrainerId: 5n })
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(
        service.createSession(
          makeDto({ assignmentId: '100', planDayId: '10' }) as any,
          caller
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'WORKOUT_ASSIGNMENT_INVALID' }),
      })
    })

    it('rejects plan day that does not belong to the assignment plan', async () => {
      const member = makeMember({ primaryTrainerId: 5n })
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue({ assignmentId: 100n, planId: 1n })
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(
        service.createSession(
          makeDto({ assignmentId: '100', planDayId: '999' }) as any,
          caller
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'WORKOUT_PLAN_DAY_INVALID' }),
      })
    })

    it('trainer caller auto-assigns self as trainer', async () => {
      const member = makeMember({ primaryTrainerId: 5n })
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      mockPrisma.memberWorkoutPlan.findFirst.mockResolvedValue({ assignmentId: 100n, planId: 1n })
      mockPrisma.workoutPlanDay.findFirst.mockResolvedValue({ planDayId: 10n })
      const created = makeSession({ trainerStaffId: 5n, assignmentId: 100n, planDayId: 10n })
      mockPrisma.trainingSession.create.mockResolvedValue(created)
      mockAudit.log.mockResolvedValue(undefined)
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      const result = await service.createSession(
        makeDto({ assignmentId: '100', planDayId: '10' }) as any,
        caller
      )

      expect(mockPrisma.trainingSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ assignmentId: 100n, planDayId: 10n }),
        })
      )
      expect(result.data.sessionId).toBe('1')
    })

    it('trainer caller with no staff profile throws BadRequestException', async () => {
      const member = makeMember({ primaryTrainerId: null })
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['trainer'], staffId: undefined })

      await expect(service.createSession(makeDto() as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FK_CONSTRAINT' }),
      })
    })
  })

  // -------------------------------------------------------------------------
  // updateSession (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('updateSession', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.updateSession(999n, {} as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NOT_FOUND' }),
      })
    })

    it('throws ConflictException when session is already completed', async () => {
      const session = makeSession({ status: 'completed' })
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      const caller = makeCaller()

      await expect(service.updateSession(1n, { startTime: futureTime(30).toISOString() } as any, caller))
        .rejects.toMatchObject({ response: expect.objectContaining({ code: 'SESSION_ALREADY_STARTED' }) })
    })

    it('throws BadRequestException when endTime <= startTime after update', async () => {
      const session = makeSession({ status: 'scheduled' })
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      const caller = makeCaller()
      const sameTime = futureTime(60).toISOString()

      await expect(
        service.updateSession(1n, { startTime: sameTime, endTime: sameTime } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'VALIDATION_ERROR' }) })
    })

    it('happy path: updates session fields and calls audit.log', async () => {
      const session = makeSession({ status: 'scheduled' })
      const updated = makeSession({ status: 'scheduled', startTime: futureTime(90), endTime: futureTime(150) })
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.trainingSession.count.mockResolvedValue(0)
      mockPrisma.trainingSession.update.mockResolvedValue(updated)
      const caller = makeCaller()

      const result = await service.updateSession(1n, {} as any, caller)

      expect(mockPrisma.trainingSession.update).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'training.update' })
      )
      expect(result.data.sessionId).toBe('1')
    })

    it('triggers checkOverlap when roomId is updated — throws ConflictException on overlap', async () => {
      const session = makeSession({ status: 'scheduled' })
      const overlap = makeSession({ sessionId: 99n })
      mockPrisma.trainingSession.findFirst
        .mockResolvedValueOnce(session)
        .mockResolvedValue(overlap)
      const caller = makeCaller()

      await expect(
        service.updateSession(1n, { roomId: '4' } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'ROOM_TIME_OVERLAP' }) })
    })
  })

  // -------------------------------------------------------------------------
  // listAttendance (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // updateSessionStatus — trainer forbidden path (Phase 10)
  // -------------------------------------------------------------------------

  describe('updateSessionStatus — trainer forbidden', () => {
    it('trainer who is not the session trainer gets ForbiddenException', async () => {
      const session = makeSession({ status: 'scheduled', trainerStaffId: 99n })
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff({ staffId: 5n }))
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(service.updateSessionStatus(1n, 'in_progress', caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })
  })

  describe('listAttendance', () => {
    it('owner: returns paginated attendance list', async () => {
      const log = {
        attendanceId: 1n, memberId: 10n, subscriptionId: 20n, sessionId: null,
        startTime: new Date(), endTime: null, method: 'manual',
        member: { memberId: 10n, memberCode: 'MEM-001', user: { fullName: 'Test' } },
        subscription: { subscriptionId: 20n, startDate: new Date(), endDate: new Date() },
        session: null,
      }
      mockPrisma.attendanceLog.findMany.mockResolvedValue([log])
      mockPrisma.attendanceLog.count.mockResolvedValue(1)
      const caller = makeCaller()

      const result = await service.listAttendance({ page: 1, pageSize: 20 } as any, caller)

      expect(result.data).toHaveLength(1)
      expect(result.meta.totalItems).toBe(1)
    })

    it('member only: filters attendance to self memberId', async () => {
      mockPrisma.attendanceLog.findMany.mockResolvedValue([])
      mockPrisma.attendanceLog.count.mockResolvedValue(0)
      mockPrisma.member.findFirst.mockResolvedValue(makeMember({ memberId: 10n }))
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      await service.listAttendance({} as any, caller)

      const callArg = (mockPrisma.attendanceLog.findMany as jest.Mock).mock.calls[0][0]
      expect(callArg.where.memberId).toBe(10n)
    })

    it('member only without memberId: throws ForbiddenException', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['member'], memberId: undefined })

      await expect(service.listAttendance({} as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })

    it('trainer only with staffId: filters by primary trainer', async () => {
      mockPrisma.attendanceLog.findMany.mockResolvedValue([])
      mockPrisma.attendanceLog.count.mockResolvedValue(0)
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff({ staffId: 5n }))
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await service.listAttendance({} as any, caller)

      const callArg = (mockPrisma.attendanceLog.findMany as jest.Mock).mock.calls[0][0]
      expect(callArg.where.member).toEqual({ primaryTrainerId: 5n })
    })

    it('trainer only without staffId: throws ForbiddenException', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['trainer'], staffId: undefined })

      await expect(service.listAttendance({} as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })
  })

  // -------------------------------------------------------------------------
  // manualCheckin (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('manualCheckin', () => {
    function makeDto() {
      return { memberCode: 'MEM-001', occurredAt: new Date().toISOString() }
    }

    it('throws NotFoundException when member not found by memberCode', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.manualCheckin(makeDto() as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_NOT_FOUND' }),
      })
    })

    it('throws ForbiddenException when member has no active subscription', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.manualCheckin(makeDto() as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_NO_ACTIVE_SUBSCRIPTION' }),
      })
    })

    it('throws ConflictException when member has open attendance', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({ attendanceId: 1n, endTime: null })
      const caller = makeCaller()

      await expect(service.manualCheckin(makeDto() as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'ATTENDANCE_ALREADY_OPEN' }),
      })
    })

    it('happy path: creates attendance log and calls audit.log', async () => {
      const member = makeMember()
      const sub = makeSubscription()
      const created = {
        attendanceId: 1n, memberId: 10n, subscriptionId: 20n, sessionId: null,
        startTime: new Date(), endTime: null, method: 'manual',
        member: { memberId: 10n, memberCode: 'MEM-001', user: { fullName: 'Test' } },
        subscription: { subscriptionId: 20n, endDate: new Date() },
      }
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.subscription.findFirst.mockResolvedValue(sub)
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.attendanceLog.create.mockResolvedValue(created)
      const caller = makeCaller()

      const result = await service.manualCheckin(makeDto() as any, caller)

      expect(mockPrisma.attendanceLog.create).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'attendance.manual-checkin' })
      )
      expect(result.data.attendanceId).toBe('1')
    })
  })

  // -------------------------------------------------------------------------
  // checkout (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('checkout', () => {
    it('throws NotFoundException when attendance log does not exist', async () => {
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(
        service.checkout(1n, { endedAt: new Date().toISOString() } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'NOT_FOUND' }) })
    })

    it('throws ConflictException when already checked out', async () => {
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({
        attendanceId: 1n, startTime: new Date(Date.now() - 3600_000), endTime: new Date(),
      })
      const caller = makeCaller()

      await expect(
        service.checkout(1n, { endedAt: new Date().toISOString() } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'ATTENDANCE_ALREADY_CLOSED' }) })
    })

    it('throws BadRequestException when endedAt <= startTime', async () => {
      const start = new Date()
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({
        attendanceId: 1n, startTime: start, endTime: null,
      })
      const caller = makeCaller()

      await expect(
        service.checkout(1n, { endedAt: new Date(start.getTime() - 1000).toISOString() } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'VALIDATION_ERROR' }) })
    })

    it('happy path: updates endTime and logs audit', async () => {
      const start = new Date(Date.now() - 3600_000)
      const end = new Date()
      const updated = {
        attendanceId: 1n, memberId: 10n, subscriptionId: 20n, sessionId: null,
        startTime: start, endTime: end, method: 'manual',
        member: { memberId: 10n, memberCode: 'MEM-001', user: { fullName: 'Test' } },
        subscription: { subscriptionId: 20n, endDate: new Date() },
        session: null,
      }
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({ attendanceId: 1n, startTime: start, endTime: null })
      mockPrisma.attendanceLog.update.mockResolvedValue(updated)
      const caller = makeCaller()

      const result = await service.checkout(1n, { endedAt: end.toISOString() } as any, caller)

      expect(mockPrisma.attendanceLog.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { attendanceId: 1n }, data: { endTime: expect.any(Date) } })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'attendance.checkout' })
      )
      expect(result.data.attendanceId).toBe('1')
    })
  })

  // -------------------------------------------------------------------------
  // listProgress (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('listProgress', () => {
    it('owner: returns progress list for given member', async () => {
      const progress = {
        progressId: 1n, memberId: 10n, staffId: 5n, weight: null, bmi: null,
        goal: null, notes: null, recordedAt: new Date(), deletedAt: null, createdAt: new Date(),
      }
      mockPrisma.memberProgress.findMany.mockResolvedValue([progress])
      const caller = makeCaller()

      const result = await service.listProgress(10n, {}, caller)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].progressId).toBe('1')
    })

    it('member only: throws ForbiddenException when viewing another member progress', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      await expect(
        service.listProgress(999n, {}, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'FORBIDDEN' }) })
    })

    it('trainer only: throws ForbiddenException when member has different primary trainer', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember({ primaryTrainerId: 99n }))
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff({ staffId: 5n }))
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(
        service.listProgress(10n, {}, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'FORBIDDEN' }) })
    })
  })

  // -------------------------------------------------------------------------
  // recordProgress (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('recordProgress', () => {
    it('throws NotFoundException when member does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(
        service.recordProgress(999n, { recordedAt: new Date().toISOString() } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'NOT_FOUND' }) })
    })

    it('throws BadRequestException when recordedAt is far in the future', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      const caller = makeCaller()
      const future = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      await expect(
        service.recordProgress(10n, { recordedAt: future } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'VALIDATION_ERROR' }) })
    })

    it('happy path with staff caller: creates progress and logs audit', async () => {
      const member = makeMember({ primaryTrainerId: 5n })
      const progress = {
        progressId: 1n, memberId: 10n, staffId: 5n, weight: null, bmi: null,
        goal: null, notes: null, recordedAt: new Date(), deletedAt: null, createdAt: new Date(),
      }
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff())
      mockPrisma.memberProgress.create.mockResolvedValue(progress)
      const caller = makeCaller({ roles: ['staff'], staffId: 5n })

      const result = await service.recordProgress(10n, { recordedAt: new Date().toISOString() } as any, caller)

      expect(mockPrisma.memberProgress.create).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'progress.record' })
      )
      expect(result.data.progressId).toBe('1')
    })
  })

  // -------------------------------------------------------------------------
  // deleteProgress (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // deviceAccessEvent (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('deviceAccessEvent', () => {
    const ts = new Date().toISOString()

    it('processes checkin via device and creates attendance log', async () => {
      const body = { memberIdentifier: 'MEM-001', occurredAt: ts, deviceId: 'DEVICE-A1' }
      const member = { ...makeMember(), user: { fullName: 'Test Member', avatarFileId: null } }
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      mockPrisma.attendanceLog.create.mockResolvedValue({ attendanceId: 1n })

      const result = await service.deviceAccessEvent(body)

      expect(result.data.attendanceLogId).toBe('1')
      expect(result.data.deduped).toBe(false)
    })

    it('throws NotFoundException when member not found via device', async () => {
      const body = { memberIdentifier: 'UNKNOWN', occurredAt: ts, deviceId: 'DEVICE-A2' }
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await expect(service.deviceAccessEvent(body)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_NOT_FOUND' }),
      })
    })

    it('throws ForbiddenException when member has no active subscription', async () => {
      const body = { memberIdentifier: 'MEM-001', occurredAt: ts, deviceId: 'DEVICE-A3' }
      mockPrisma.member.findFirst.mockResolvedValue({ ...makeMember(), user: { fullName: 'Test', avatarFileId: null } })
      mockPrisma.subscription.findFirst.mockResolvedValue(null)

      await expect(service.deviceAccessEvent(body)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_NO_ACTIVE_SUBSCRIPTION' }),
      })
    })
  })

  describe('deleteProgress', () => {
    it('throws NotFoundException when progress does not exist', async () => {
      mockPrisma.memberProgress.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.deleteProgress(999n, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NOT_FOUND' }),
      })
    })

    it('throws ForbiddenException when caller is not owner/staff and did not create the record', async () => {
      const progress = { progressId: 1n, memberId: 10n, staffId: 5n, deletedAt: null }
      mockPrisma.memberProgress.findFirst.mockResolvedValue(progress)
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff({ staffId: 99n }))
      const caller = makeCaller({ roles: ['trainer'], staffId: 99n })

      await expect(service.deleteProgress(1n, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })

    it('happy path: owner soft-deletes progress and logs audit', async () => {
      const progress = { progressId: 1n, memberId: 10n, staffId: 5n, deletedAt: null }
      mockPrisma.memberProgress.findFirst.mockResolvedValue(progress)
      mockPrisma.memberProgress.update.mockResolvedValue({ ...progress, deletedAt: new Date() })
      const caller = makeCaller()

      await service.deleteProgress(1n, caller)

      expect(mockPrisma.memberProgress.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { progressId: 1n }, data: { deletedAt: expect.any(Date) } })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'progress.delete' })
      )
    })
  })

  // -------------------------------------------------------------------------
  // getSession — checkSessionAccess branches (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('getSession', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.getSession(999n, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NOT_FOUND' }),
      })
    })

    it('throws ForbiddenException when trainer tries to access another trainer session', async () => {
      const session = makeSession({ trainerStaffId: 99n, memberId: 10n })
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(service.getSession(1n, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })

    it('throws ForbiddenException when member tries to access another member session', async () => {
      const session = makeSession({ memberId: 99n, trainerStaffId: 5n })
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      await expect(service.getSession(1n, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })
  })

  // -------------------------------------------------------------------------
  // createSession — additional trainer/owner paths (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('createSession — additional coverage paths', () => {
    function makeDto(overrides: object = {}) {
      const start = futureTime(30)
      const end = futureTime(90)
      return { memberId: '10', roomId: '3', startTime: start.toISOString(), endTime: end.toISOString(), ...overrides }
    }

    it('trainer caller throws ForbiddenException when member primary trainer is different', async () => {
      const member = makeMember({ primaryTrainerId: 99n })
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(service.createSession(makeDto() as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'TRAINER_NOT_ASSIGNED' }),
      })
    })

    it('owner caller without dto.trainerStaffId and no staffId throws VALIDATION_ERROR', async () => {
      const member = makeMember()
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['owner'], staffId: undefined })

      await expect(service.createSession(makeDto() as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      })
    })

    it('throws FK_CONSTRAINT when trainerStaffId in dto resolves to non-existent trainer', async () => {
      const member = makeMember()
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.gymRoom.findFirst.mockResolvedValue(makeRoom())
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.createSession(makeDto({ trainerStaffId: '99' }) as any, caller)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FK_CONSTRAINT' }),
      })
    })
  })

  // -------------------------------------------------------------------------
  // updateSession — trainer caller paths (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('updateSession — trainer caller paths', () => {
    it('throws ForbiddenException when trainer tries to update another trainer session', async () => {
      const session = makeSession({ trainerStaffId: 99n })
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff({ staffId: 5n }))
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(
        service.updateSession(1n, { startTime: futureTime(30).toISOString() } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'FORBIDDEN' }) })
    })

    it('throws ForbiddenException when trainer tries to reassign session to different trainer', async () => {
      const session = makeSession({ trainerStaffId: 5n })
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff({ staffId: 5n }))
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(
        service.updateSession(1n, { trainerStaffId: '99' } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'FORBIDDEN' }) })
    })
  })

  // -------------------------------------------------------------------------
  // recordProgress — member + trainer paths (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('recordProgress — additional paths', () => {
    it('throws ForbiddenException when member tries to record progress for different member', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      const caller = makeCaller({ roles: ['member'], memberId: 99n })

      await expect(
        service.recordProgress(10n, { recordedAt: new Date().toISOString() } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'FORBIDDEN' }) })
    })

    it('throws ForbiddenException when trainer records for non-assigned member', async () => {
      const member = makeMember({ primaryTrainerId: 99n })
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.staff.findFirst.mockResolvedValue(makeStaff({ staffId: 5n }))
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(
        service.recordProgress(10n, { recordedAt: new Date().toISOString() } as any, caller)
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'TRAINER_NOT_ASSIGNED' }) })
    })
  })

  // -------------------------------------------------------------------------
  // listProgress — date range (Phase 10 — coverage gap)
  // -------------------------------------------------------------------------

  describe('listProgress — date range filter', () => {
    it('applies both from and to date filters', async () => {
      mockPrisma.memberProgress.findMany.mockResolvedValue([])
      const caller = makeCaller()

      await service.listProgress(10n, { from: '2024-01-01', to: '2024-12-31' }, caller)

      const whereArg = mockPrisma.memberProgress.findMany.mock.calls[0][0].where
      expect(whereArg.recordedAt).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // deviceAccessEvent — ATTENDANCE_ALREADY_OPEN + session update + deduped
  // -------------------------------------------------------------------------

  describe('deviceAccessEvent — additional paths', () => {
    it('throws ConflictException when member already has open attendance (via device)', async () => {
      const ts = new Date(Date.now() + 5000).toISOString()
      const body = { memberIdentifier: 'MEM-ADV1', occurredAt: ts, deviceId: 'DEVICE-ADV1' }
      const member = { ...makeMember(), user: { fullName: 'Test', avatarFileId: null } }
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue({ attendanceId: 5n, startTime: new Date(), endTime: null })

      await expect(service.deviceAccessEvent(body)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'ATTENDANCE_ALREADY_OPEN' }),
      })
    })

    it('updates session status to in_progress when a training session exists at checkin time', async () => {
      const ts = new Date(Date.now() + 5000).toISOString()
      const body = { memberIdentifier: 'MEM-ADV2', occurredAt: ts, deviceId: 'DEVICE-ADV2' }
      const member = { ...makeMember(), user: { fullName: 'Test', avatarFileId: null } }
      const session = makeSession({ status: 'scheduled' })
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session)
      mockPrisma.trainingSession.update.mockResolvedValue(undefined)
      mockPrisma.attendanceLog.create.mockResolvedValue({ attendanceId: 10n })

      const result = await service.deviceAccessEvent(body)

      expect(mockPrisma.trainingSession.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'in_progress' } })
      )
      expect(result.data.attendanceLogId).toBe('10')
    })

    it('returns deduped: true when same deviceId+occurredAt is called twice', async () => {
      const ts = new Date(Date.now() + 5000).toISOString()
      const body = { memberIdentifier: 'MEM-ADV3', occurredAt: ts, deviceId: 'DEVICE-ADV3' }
      const member = { ...makeMember(), user: { fullName: 'Test', avatarFileId: null } }
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      mockPrisma.attendanceLog.findFirst.mockResolvedValue(null)
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null)
      mockPrisma.attendanceLog.create.mockResolvedValue({ attendanceId: 20n })

      await service.deviceAccessEvent(body)
      const result2 = await service.deviceAccessEvent(body)

      expect(result2.data.deduped).toBe(true)
    })
  })
})

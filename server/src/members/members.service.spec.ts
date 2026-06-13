import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { MembersService } from './members.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMember(overrides: object = {}) {
  return {
    memberId: 1n,
    userId: 100n,
    memberCode: 'MEM-2024-000001',
    dateOfBirth: new Date('1990-01-01'),
    address: '123 Street',
    primaryTrainerId: null as bigint | null,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

function makeUser(overrides: object = {}) {
  return {
    userId: 100n,
    email: 'test@gym.local',
    fullName: 'Test User',
    phone: '0900000000',
    status: 'active',
    emailVerifiedAt: new Date('2024-01-01'),
    avatarFileId: null as bigint | null,
    passwordHash: 'hashed',
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

function makePackage(overrides: object = {}) {
  return {
    packageId: 1n,
    packageCode: 'PKG-001',
    name: 'Basic',
    durationDays: 30,
    price: new (class {
      toString() {
        return '500000'
      }
      toFixed(_n: number) {
        return '500000.00'
      }
    })(),
    includesPt: false,
    status: 'active',
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

function makeSubscription(overrides: object = {}) {
  return {
    subscriptionId: 10n,
    memberId: 1n,
    packageId: 1n,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-30'),
    status: 'active',
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    package: makePackage(),
    ...overrides,
  }
}

function makePayment(overrides: object = {}) {
  return {
    paymentId: 20n,
    memberId: 1n,
    subscriptionId: 10n,
    amount: { toFixed: (_n: number) => '500000.00' },
    method: 'cash',
    status: 'success',
    paidAt: new Date('2024-01-01'),
    ...overrides,
  }
}

function makeMemberDetail(overrides: object = {}) {
  const user = makeUser()
  const member = makeMember({ user })
  return {
    ...member,
    user,
    primaryTrainer: null as any,
    subscriptions: [] as any[],
    ...overrides,
  }
}

function makeCaller(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 200n,
    email: 'owner@gym.local',
    roles: ['owner'],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Mock tx object used inside $transaction callbacks
// ---------------------------------------------------------------------------

function makeTx() {
  return {
    user: {
      create: jest.fn(),
      update: jest.fn(),
    },
    member: {
      create: jest.fn(),
      update: jest.fn(),
    },
    group: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    userGroup: {
      create: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
  }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  package: {
    findFirst: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  member: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    create: jest.fn(),
  },
  payment: {
    create: jest.fn(),
  },
  staff: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockAudit = {
  log: jest.fn(),
}

const mockOtpStore = {
  set: jest.fn(),
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('MembersService', () => {
  let service: MembersService
  let tx: ReturnType<typeof makeTx>

  beforeEach(() => {
    service = new MembersService(mockPrisma as any, mockAudit as any, mockOtpStore as any)
    jest.clearAllMocks()
    tx = makeTx()
    // Default: $transaction with callback → pass tx
    mockPrisma.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(tx)
      if (Array.isArray(arg)) return Promise.all(arg.map((p: any) => p))
      return arg
    })
    // Default member count for code generation
    mockPrisma.member.count.mockResolvedValue(0)
    mockPrisma.member.findUnique.mockResolvedValue(null)
  })

  // -------------------------------------------------------------------------
  // createMember
  // -------------------------------------------------------------------------

  describe('createMember', () => {
    const dto = {
      packageId: '1',
      email: 'new@gym.local',
      phone: '0911111111',
      fullName: 'New Member',
      password: 'Password123!',
      dateOfBirth: '1990-05-15',
      address: '456 Street',
      paymentMethod: 'cash',
      transactionReference: null,
    }

    it('throws NotFoundException when package does not exist', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(null)

      await expect(service.createMember(dto as any, 1n)).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when email or phone already exists', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePackage())
      mockPrisma.user.findFirst.mockResolvedValue(makeUser())

      await expect(service.createMember(dto as any, 1n)).rejects.toThrow(ConflictException)
    })

    it('happy path: calls $transaction, creates user/member/subscription/payment, calls audit.log', async () => {
      const pkg = makePackage()
      mockPrisma.package.findFirst.mockResolvedValue(pkg)
      mockPrisma.user.findFirst.mockResolvedValue(null)

      const createdUser = makeUser({ userId: 100n })
      const createdMember = makeMember({ memberId: 1n, userId: 100n })
      const createdSubscription = makeSubscription({ subscriptionId: 10n })
      const createdPayment = makePayment({ paymentId: 20n })

      tx.user.create.mockResolvedValue(createdUser)
      tx.member.create.mockResolvedValue(createdMember)
      tx.subscription.create.mockResolvedValue(createdSubscription)
      tx.payment.create.mockResolvedValue(createdPayment)

      const result = await service.createMember(dto as any, 1n)

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(tx.user.create).toHaveBeenCalled()
      expect(tx.member.create).toHaveBeenCalled()
      expect(tx.subscription.create).toHaveBeenCalled()
      expect(tx.payment.create).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'member.create' })
      )
      expect(result.data.memberId).toBe('1')
      expect(result.data.email).toBe('test@gym.local')
    })
  })

  // -------------------------------------------------------------------------
  // selfRegister
  // -------------------------------------------------------------------------

  describe('selfRegister', () => {
    const baseDto = {
      email: 'self@gym.local',
      phone: '0922222222',
      fullName: 'Self Register',
      password: 'Password123!',
    }

    it('happy path without packageId: creates pending_verification user, calls otpStore.set, audit.log', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      const createdUser = makeUser({ userId: 200n, status: 'pending_verification' })
      const createdMember = makeMember({ memberId: 5n, userId: 200n })

      tx.user.create.mockResolvedValue(createdUser)
      tx.member.create.mockResolvedValue(createdMember)

      const result = await service.selfRegister(baseDto as any)

      expect(mockOtpStore.set).toHaveBeenCalledWith(
        200n,
        'email_verify',
        expect.any(String),
        expect.any(Number)
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'member.create' })
      )
      expect(result.data.message).toBe('Registration created. Please verify email.')
      expect(result.data.subscription).toBeNull()
    })

    it('happy path with packageId: creates pending subscription, returns subscription info', async () => {
      const pkg = makePackage({ packageId: 2n })
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockPrisma.package.findFirst.mockResolvedValue(pkg)

      const createdUser = makeUser({ userId: 201n })
      const createdMember = makeMember({ memberId: 6n, userId: 201n })
      const createdSubscription = makeSubscription({
        subscriptionId: 11n,
        memberId: 6n,
        packageId: 2n,
        status: 'pending',
        package: pkg,
      })

      tx.user.create.mockResolvedValue(createdUser)
      tx.member.create.mockResolvedValue(createdMember)
      tx.subscription.create.mockResolvedValue(createdSubscription)

      const result = await service.selfRegister({ ...baseDto, packageId: '2' } as any)

      expect(result.data.subscription).not.toBeNull()
      expect(result.data.subscription!.subscriptionId).toBe('11')
      expect(result.data.subscription!.status).toBe('pending')
      expect(mockAudit.log).toHaveBeenCalledTimes(2)
    })

    it('throws BadRequestException when packageId is provided but package does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockPrisma.package.findFirst.mockResolvedValue(null)

      await expect(service.selfRegister({ ...baseDto, packageId: '99' } as any)).rejects.toThrow(
        BadRequestException
      )
    })

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser())

      await expect(service.selfRegister(baseDto as any)).rejects.toThrow(ConflictException)
    })
  })

  // -------------------------------------------------------------------------
  // listMembers
  // -------------------------------------------------------------------------

  describe('listMembers', () => {
    beforeEach(() => {
      mockPrisma.member.findMany.mockResolvedValue([])
      mockPrisma.member.count.mockResolvedValue(0)
    })

    it('owner: calls findMany without trainer filter', async () => {
      const caller = makeCaller({ roles: ['owner'] })

      await service.listMembers({} as any, caller)

      const whereArg = mockPrisma.member.findMany.mock.calls[0][0].where
      expect(whereArg.primaryTrainerId).toBeUndefined()
    })

    it('staff: calls findMany without trainer filter', async () => {
      const caller = makeCaller({ roles: ['staff'] })

      await service.listMembers({} as any, caller)

      const whereArg = mockPrisma.member.findMany.mock.calls[0][0].where
      expect(whereArg.primaryTrainerId).toBeUndefined()
    })

    it('trainer: filters by primaryTrainerId = caller.staffId', async () => {
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await service.listMembers({} as any, caller)

      const whereArg = mockPrisma.member.findMany.mock.calls[0][0].where
      expect(whereArg.primaryTrainerId).toBe(5n)
    })

    it('trainer without staffId: throws ForbiddenException', async () => {
      const caller = makeCaller({ roles: ['trainer'], staffId: undefined })

      await expect(service.listMembers({} as any, caller)).rejects.toThrow(ForbiddenException)
    })

    it('search: applies OR filter', async () => {
      const caller = makeCaller({ roles: ['owner'] })

      await service.listMembers({ search: 'john' } as any, caller)

      const whereArg = mockPrisma.member.findMany.mock.calls[0][0].where
      expect(whereArg.OR).toBeDefined()
      expect(whereArg.OR.length).toBeGreaterThan(0)
    })

    it('returns pagination meta', async () => {
      mockPrisma.member.count.mockResolvedValue(45)
      const caller = makeCaller({ roles: ['owner'] })

      const result = await service.listMembers({ page: 2, pageSize: 10 } as any, caller)

      expect(result.meta).toEqual(
        expect.objectContaining({ page: 2, pageSize: 10, totalItems: 45 })
      )
      expect(result.meta.totalPages).toBe(5)
    })
  })

  // -------------------------------------------------------------------------
  // getMember
  // -------------------------------------------------------------------------

  describe('getMember', () => {
    it('throws NotFoundException when member does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await expect(service.getMember(999n)).rejects.toThrow(NotFoundException)
    })

    it('returns serialized member data with BigInt as string', async () => {
      const detail = makeMemberDetail()
      mockPrisma.member.findFirst.mockResolvedValue(detail)

      const result = await service.getMember(1n)

      expect(result.data.memberId).toBe('1')
      expect(result.data.userId).toBe('100')
    })
  })

  // -------------------------------------------------------------------------
  // getMemberForCaller
  // -------------------------------------------------------------------------

  describe('getMemberForCaller', () => {
    it('owner can view any member', async () => {
      const detail = makeMemberDetail()
      mockPrisma.member.findFirst.mockResolvedValue(detail)
      const caller = makeCaller({ roles: ['owner'] })

      const result = await service.getMemberForCaller(1n, caller)

      expect(result.data.memberId).toBe('1')
    })

    it('member can view own record via userId match', async () => {
      const detail = makeMemberDetail({ userId: 100n })
      mockPrisma.member.findFirst.mockResolvedValue(detail)
      const caller = makeCaller({ roles: ['member'], userId: 100n, memberId: 1n })

      await expect(service.getMemberForCaller(1n, caller)).resolves.not.toThrow()
    })

    it('trainer can view member they are assigned to', async () => {
      const detail = makeMemberDetail({ primaryTrainerId: 5n })
      mockPrisma.member.findFirst.mockResolvedValue(detail)
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(service.getMemberForCaller(1n, caller)).resolves.not.toThrow()
    })

    it('trainer not assigned to member: throws ForbiddenException', async () => {
      const detail = makeMemberDetail({ primaryTrainerId: 99n })
      mockPrisma.member.findFirst.mockResolvedValue(detail)
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(service.getMemberForCaller(1n, caller)).rejects.toThrow(ForbiddenException)
    })
  })

  // -------------------------------------------------------------------------
  // assignTrainer
  // -------------------------------------------------------------------------

  describe('assignTrainer', () => {
    it('throws NotFoundException when member does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await expect(service.assignTrainer(999n, 1, 1n)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when trainerId is provided but trainer does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      await expect(service.assignTrainer(1n, 99, 1n)).rejects.toThrow(BadRequestException)
    })

    it('happy path with trainer: updates primaryTrainerId and returns trainerName', async () => {
      const member = makeMember()
      const trainer = {
        staffId: 5n,
        staffCode: 'ST-001',
        user: { fullName: 'Trainer Name' },
      }
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.staff.findFirst.mockResolvedValue(trainer)
      mockPrisma.member.update.mockResolvedValue({ ...member, primaryTrainerId: 5n })

      const result = await service.assignTrainer(1n, 5, 1n)

      expect(mockPrisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: 1n },
          data: { primaryTrainerId: 5n },
        })
      )
      expect(result.data.primaryTrainerName).toBe('Trainer Name')
      expect(result.data.memberId).toBe('1')
    })

    it('trainerId = null: clears primaryTrainerId', async () => {
      const member = makeMember({ primaryTrainerId: 5n })
      mockPrisma.member.findFirst.mockResolvedValue(member)
      mockPrisma.member.update.mockResolvedValue({ ...member, primaryTrainerId: null })

      const result = await service.assignTrainer(1n, null, 1n)

      expect(mockPrisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { primaryTrainerId: null },
        })
      )
      expect(result.data.primaryTrainerId).toBeNull()
      expect(result.data.primaryTrainerName).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // getAvailableTrainers
  // -------------------------------------------------------------------------

  describe('getAvailableTrainers', () => {
    it('returns list of trainers with correct shape', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([
        {
          staffId: 1n,
          staffCode: 'ST-001',
          position: 'trainer',
          user: { fullName: 'Alice Trainer' },
        },
        {
          staffId: 2n,
          staffCode: 'ST-002',
          position: 'pt',
          user: { fullName: 'Bob PT' },
        },
      ])

      const result = await service.getAvailableTrainers()

      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({
        staffId: '1',
        staffCode: 'ST-001',
        fullName: 'Alice Trainer',
        position: 'trainer',
      })
      expect(result.data[1].staffId).toBe('2')
    })
  })
})

import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common'
import { PaymentMethod, PaymentStatus, SubscriptionStatus } from '@prisma/client'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { PaymentsService } from './payments.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSub(overrides: object = {}) {
  return {
    subscriptionId: 1n,
    memberId: 10n,
    packageId: 1n,
    startDate: new Date('2020-01-01'), // past date — activatable by default
    endDate: new Date('2020-01-31'),
    status: SubscriptionStatus.pending,
    deletedAt: null,
    package: { name: 'Basic', price: { toFixed: (_n: number) => '500000.00' } },
    member: { user: { fullName: 'Test Member', emailVerifiedAt: new Date() } },
    ...overrides,
  }
}

function makePayment(overrides: object = {}) {
  return {
    paymentId: 100n,
    memberId: 10n,
    subscriptionId: 1n,
    amount: { toFixed: (_n: number) => '500000.00' },
    method: PaymentMethod.cash,
    status: PaymentStatus.success,
    transactionReference: null,
    paidAt: new Date(),
    ...overrides,
  }
}

function makeCaller(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 200n,
    email: 'caller@gym.local',
    roles: ['owner'],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPayment = makePayment()
const mockSub = makeSub()

const mockPrisma = {
  member: {
    findFirst: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
  },
  payment: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockAudit = {
  log: jest.fn(),
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PaymentsService', () => {
  let service: PaymentsService

  beforeEach(() => {
    service = new PaymentsService(mockPrisma as any, mockAudit as any)
    jest.clearAllMocks()

    // Default $transaction passthrough
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const txPayment = {
        create: jest.fn().mockResolvedValue(mockPayment),
      }
      const txSubscription = {
        update: jest.fn().mockResolvedValue(mockSub),
      }
      return fn({ payment: txPayment, subscription: txSubscription })
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // createPayment
  // ─────────────────────────────────────────────────────────────────

  describe('createPayment', () => {
    const dto = {
      memberId: '10',
      subscriptionId: '1',
      amount: 500000,
      method: PaymentMethod.cash,
    }

    it('throws BadRequestException when subscription not found', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      const caller = makeCaller()

      await expect(service.createPayment(dto as any, caller)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when sub.memberId does not match dto.memberId', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(
        makeSub({ memberId: 99n }) // different member
      )
      const caller = makeCaller()

      await expect(service.createPayment(dto as any, caller)).rejects.toThrow(BadRequestException)
    })

    it('throws ConflictException when subscription is not pending — message contains current status', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(
        makeSub({ status: SubscriptionStatus.active })
      )
      const caller = makeCaller()

      const err = await service.createPayment(dto as any, caller).catch((e) => e)

      expect(err).toBeInstanceOf(ConflictException)
      const response = err.getResponse() as { message: string }
      expect(response.message).toContain('active')
    })

    it('throws ForbiddenException when member tries to pay for another member', async () => {
      // caller is member with memberId=99 — dto.memberId is 10
      const caller = makeCaller({ roles: ['member'], memberId: 99n })
      // resolveCallerMemberId returns caller.memberId directly
      mockPrisma.subscription.findFirst.mockResolvedValue(makeSub())

      await expect(service.createPayment(dto as any, caller)).rejects.toThrow(ForbiddenException)
    })

    it('happy path: payment created + subscription activated when startDate <= today and no active sub', async () => {
      mockPrisma.subscription.findFirst
        .mockResolvedValueOnce(makeSub({ startDate: new Date('2020-01-01') })) // sub lookup
        .mockResolvedValueOnce(null) // no active other sub

      const caller = makeCaller()
      const result = await service.createPayment(dto as any, caller)

      expect(result.data.subscriptionActivated).toBe(true)
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'subscription.activate' })
      )
    })

    it('happy path: payment created but NOT activated when another active subscription exists', async () => {
      mockPrisma.subscription.findFirst
        .mockResolvedValueOnce(makeSub({ startDate: new Date('2020-01-01') })) // sub lookup
        .mockResolvedValueOnce({ subscriptionId: 999n, status: 'active' }) // active other sub

      const caller = makeCaller()
      const result = await service.createPayment(dto as any, caller)

      expect(result.data.subscriptionActivated).toBe(false)
    })

    it('happy path: payment created but NOT activated when startDate is in the future', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      mockPrisma.subscription.findFirst
        .mockResolvedValueOnce(makeSub({ startDate: futureDate })) // startDate > today
        .mockResolvedValueOnce(null)

      const caller = makeCaller()
      const result = await service.createPayment(dto as any, caller)

      expect(result.data.subscriptionActivated).toBe(false)
    })

    it('throws ConflictException on P2002 (duplicate transactionReference)', async () => {
      mockPrisma.subscription.findFirst
        .mockResolvedValueOnce(makeSub({ startDate: new Date('2020-01-01') }))
        .mockResolvedValueOnce(null)

      const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' })
      mockPrisma.$transaction.mockRejectedValueOnce(p2002)

      const caller = makeCaller()
      const err = await service
        .createPayment({ ...dto, transactionReference: 'TXN-001' } as any, caller)
        .catch((e) => e)

      expect(err).toBeInstanceOf(ConflictException)
      const response = err.getResponse() as { code: string }
      expect(response.code).toBe('DUPLICATE_VALUE')
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // listPayments
  // ─────────────────────────────────────────────────────────────────

  describe('listPayments', () => {
    const mockPaymentRow = {
      paymentId: 100n,
      memberId: 10n,
      subscriptionId: 1n,
      amount: { toFixed: (_n: number) => '500000.00' },
      method: PaymentMethod.cash,
      status: PaymentStatus.success,
      transactionReference: null,
      paidAt: new Date(),
      subscription: {
        package: { name: 'Basic' },
      },
    }

    beforeEach(() => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPaymentRow])
      mockPrisma.payment.count.mockResolvedValue(1)
    })

    it('owner sees all payments without memberId filter by default', async () => {
      const caller = makeCaller({ roles: ['owner'] })

      await service.listPayments({} as any, caller)

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBeUndefined()
    })

    it('owner can filter by memberId', async () => {
      const caller = makeCaller({ roles: ['owner'] })

      await service.listPayments({ memberId: 10 } as any, caller)

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBe(10n)
    })

    it('staff sees all payments like owner', async () => {
      const caller = makeCaller({ roles: ['staff'] })

      await service.listPayments({} as any, caller)

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBeUndefined()
    })

    it('member sees only own payments — memberId forced to self', async () => {
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      await service.listPayments({} as any, caller)

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBe(10n)
    })

    it('member filtering by another memberId throws ForbiddenException', async () => {
      const caller = makeCaller({ roles: ['member'], memberId: 10n })

      await expect(service.listPayments({ memberId: 99 } as any, caller)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('trainer sees payments for members they manage', async () => {
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await service.listPayments({} as any, caller)

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where
      expect(whereArg.member).toEqual({ primaryTrainerId: 5n })
    })

    it('trainer filters by specific memberId: asserts ownership then sets filter', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n, primaryTrainerId: 5n })
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await service.listPayments({ memberId: 10 } as any, caller)

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBe(10n)
    })

    it('trainer accessing member they do not manage throws ForbiddenException', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n, primaryTrainerId: 99n })
      const caller = makeCaller({ roles: ['trainer'], staffId: 5n })

      await expect(service.listPayments({ memberId: 10 } as any, caller)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('unknown role throws ForbiddenException', async () => {
      const caller = makeCaller({ roles: ['unknown_role' as any] })

      await expect(service.listPayments({} as any, caller)).rejects.toThrow(ForbiddenException)
    })
  })
})

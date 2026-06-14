import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { PaymentAccountsService } from './payment-accounts.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAccount(overrides: object = {}) {
  return {
    accountId: 1,
    memberId: 10n,
    type: 'bank',
    provider: 'VCB',
    accountRef: '123456',
    label: 'VCB chính',
    isDefault: false,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  paymentAccount: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PaymentAccountsService', () => {
  let service: PaymentAccountsService

  beforeEach(() => {
    service = new PaymentAccountsService(mockPrisma as any)
    jest.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  describe('list', () => {
    it('returns accounts for the given memberId', async () => {
      mockPrisma.paymentAccount.findMany.mockResolvedValue([makeAccount()])

      const result = await service.list(10n)

      expect(result.accounts).toHaveLength(1)
      expect(mockPrisma.paymentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { memberId: 10n, deletedAt: null } })
      )
    })

    it('returns empty array when no accounts exist', async () => {
      mockPrisma.paymentAccount.findMany.mockResolvedValue([])

      const result = await service.list(10n)

      expect(result.accounts).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('does not call updateMany when isDefault=false', async () => {
      mockPrisma.paymentAccount.create.mockResolvedValue(makeAccount())

      await service.create(10n, {
        type: 'bank',
        provider: 'VCB',
        accountRef: '1',
        isDefault: false,
      } as any)

      expect(mockPrisma.paymentAccount.updateMany).not.toHaveBeenCalled()
    })

    it('clears all defaults before creating when isDefault=true', async () => {
      mockPrisma.paymentAccount.updateMany.mockResolvedValue({ count: 2 })
      mockPrisma.paymentAccount.create.mockResolvedValue(makeAccount({ isDefault: true }))

      await service.create(10n, {
        type: 'bank',
        provider: 'VCB',
        accountRef: '1',
        isDefault: true,
      } as any)

      expect(mockPrisma.paymentAccount.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: 10n, deletedAt: null },
          data: { isDefault: false },
        })
      )
      expect(mockPrisma.paymentAccount.create).toHaveBeenCalled()
    })

    it('returns the created account', async () => {
      mockPrisma.paymentAccount.create.mockResolvedValue(makeAccount({ accountId: 5 }))

      const result = await service.create(10n, {
        type: 'bank',
        provider: 'VCB',
        accountRef: '1',
      } as any)

      expect(result.account.accountId).toBe(5)
    })
  })

  // -------------------------------------------------------------------------
  // setDefault
  // -------------------------------------------------------------------------

  describe('setDefault', () => {
    it('clears all defaults then sets given accountId as default', async () => {
      mockPrisma.paymentAccount.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.paymentAccount.update.mockResolvedValue(makeAccount({ isDefault: true }))

      const result = await service.setDefault(10n, 1)

      expect(mockPrisma.paymentAccount.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: 10n, deletedAt: null },
          data: { isDefault: false },
        })
      )
      expect(mockPrisma.paymentAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { accountId: 1 }, data: { isDefault: true } })
      )
      expect(result.account.isDefault).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  describe('remove', () => {
    it('throws NotFoundException when account does not exist', async () => {
      mockPrisma.paymentAccount.findFirst.mockResolvedValue(null)

      await expect(service.remove(10n, 99)).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when memberId does not match', async () => {
      mockPrisma.paymentAccount.findFirst.mockResolvedValue(makeAccount({ memberId: 99n }))

      await expect(service.remove(10n, 1)).rejects.toThrow(ForbiddenException)
    })

    it('sets deletedAt on the account', async () => {
      mockPrisma.paymentAccount.findFirst.mockResolvedValue(makeAccount({ memberId: 10n }))
      mockPrisma.paymentAccount.update.mockResolvedValue(undefined)

      await service.remove(10n, 1)

      expect(mockPrisma.paymentAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })

    it('returns { success: true } on successful removal', async () => {
      mockPrisma.paymentAccount.findFirst.mockResolvedValue(makeAccount({ memberId: 10n }))
      mockPrisma.paymentAccount.update.mockResolvedValue(undefined)

      const result = await service.remove(10n, 1)

      expect(result).toEqual({ success: true })
    })
  })
})

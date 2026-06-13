import { NotFoundException } from '@nestjs/common'
import { PaymentAccountsController } from './payment-accounts.controller'
import { PaymentAccountsService } from './payment-accounts.service'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'

const mockService = {
  list: jest.fn(),
  create: jest.fn(),
  setDefault: jest.fn(),
  remove: jest.fn(),
} as unknown as PaymentAccountsService

const ctrl = new PaymentAccountsController(mockService)

const memberUser: AuthenticatedUser = {
  userId: BigInt(2),
  email: 'member@test.com',
  roles: ['member'],
  memberId: BigInt(5),
}

const staffUser: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'staff@test.com',
  roles: ['staff'],
  memberId: undefined,
}

const otherMember: AuthenticatedUser = {
  userId: BigInt(3),
  email: 'other@test.com',
  roles: ['member'],
  memberId: BigInt(99),
}

beforeEach(() => jest.clearAllMocks())

describe('PaymentAccountsController', () => {
  describe('list', () => {
    it('returns list for self (member)', async () => {
      const serviceResult = [{ id: 1, type: 'bank' }]
      ;(mockService.list as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.list(5, memberUser)
      expect(mockService.list).toHaveBeenCalledWith(BigInt(5))
      expect(res).toEqual(serviceResult)
    })

    it('allows staff to view any member accounts', async () => {
      const serviceResult = [{ id: 2, type: 'momo' }]
      ;(mockService.list as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.list(5, staffUser)
      expect(mockService.list).toHaveBeenCalledWith(BigInt(5))
      expect(res).toEqual(serviceResult)
    })

    it('throws NotFoundException when member accesses other member accounts', async () => {
      await expect(ctrl.list(5, otherMember)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('create', () => {
    it('delegates to service.create for self', async () => {
      const serviceResult = { id: 10, type: 'bank' }
      ;(mockService.create as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { type: 'bank', accountNumber: '123' } as any
      const res = await ctrl.create(5, dto, memberUser)
      expect(mockService.create).toHaveBeenCalledWith(BigInt(5), dto)
      expect(res).toEqual(serviceResult)
    })
  })

  describe('setDefault', () => {
    it('delegates to service.setDefault', async () => {
      const serviceResult = { id: 10, isDefault: true }
      ;(mockService.setDefault as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.setDefault(5, 10, memberUser)
      expect(mockService.setDefault).toHaveBeenCalledWith(BigInt(5), 10)
      expect(res).toEqual(serviceResult)
    })
  })

  describe('remove', () => {
    it('delegates to service.remove', async () => {
      (mockService.remove as jest.Mock).mockResolvedValue(undefined)
      const res = await ctrl.remove(5, 10, memberUser)
      expect(mockService.remove).toHaveBeenCalledWith(BigInt(5), 10)
      expect(res).toBeUndefined()
    })
  })
})

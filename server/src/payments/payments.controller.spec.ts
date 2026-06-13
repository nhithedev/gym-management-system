import { NotFoundException } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'

const mockService = {
  createPayment: jest.fn(),
  listPayments: jest.fn(),
} as unknown as PaymentsService

const ctrl = new PaymentsController(mockService)

const user: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'staff@test.com',
  roles: ['staff'],
}

beforeEach(() => jest.clearAllMocks())

describe('PaymentsController', () => {
  describe('create', () => {
    it('delegates to createPayment and wraps success', async () => {
      const serviceResult = { data: { id: '30', amount: '500000' } }
      ;(mockService.createPayment as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { subscriptionId: 10, amount: 500000, method: 'cash' } as any
      const res = await ctrl.create(dto, user)
      expect(mockService.createPayment).toHaveBeenCalledWith(dto, user)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException when subscription not found', async () => {
      ;(mockService.createPayment as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.create({} as any, user)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('propagates BadRequestException for duplicate payment', async () => {
      const { BadRequestException } = await import('@nestjs/common')
      ;(mockService.createPayment as jest.Mock).mockRejectedValue(new BadRequestException())
      await expect(ctrl.create({} as any, user)).rejects.toBeInstanceOf(BadRequestException)
    })
  })

  describe('list', () => {
    it('delegates to listPayments and wraps success', async () => {
      const serviceResult = { data: [{ id: '30' }], meta: { total: 1 } }
      ;(mockService.listPayments as jest.Mock).mockResolvedValue(serviceResult)
      const query = { subscriptionId: '10' } as any
      const res = await ctrl.list(query, user)
      expect(mockService.listPayments).toHaveBeenCalledWith(query, user)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('returns empty list when no payments found', async () => {
      const serviceResult = { data: [], meta: { total: 0 } }
      ;(mockService.listPayments as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.list({} as any, user)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates exception', async () => {
      const { InternalServerErrorException } = await import('@nestjs/common')
      ;(mockService.listPayments as jest.Mock).mockRejectedValue(new InternalServerErrorException())
      await expect(ctrl.list({} as any, user)).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })
})

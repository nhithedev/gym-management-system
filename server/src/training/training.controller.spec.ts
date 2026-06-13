import { NotFoundException, ForbiddenException } from '@nestjs/common'
import { TrainingController } from './training.controller'
import { TrainingService } from './training.service'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'

const mockService = {
  listSessions: jest.fn(),
  getSession: jest.fn(),
  createSession: jest.fn(),
  updateSession: jest.fn(),
  cancelSession: jest.fn(),
  updateSessionStatus: jest.fn(),
  listAttendance: jest.fn(),
  manualCheckin: jest.fn(),
  checkout: jest.fn(),
  listProgress: jest.fn(),
  recordProgress: jest.fn(),
  deleteProgress: jest.fn(),
} as unknown as TrainingService

const ctrl = new TrainingController(mockService)

const trainerUser: AuthenticatedUser = {
  userId: BigInt(5),
  email: 'trainer@test.com',
  roles: ['trainer'],
  staffId: BigInt(3),
}

const memberUser: AuthenticatedUser = {
  userId: BigInt(10),
  email: 'member@test.com',
  roles: ['member'],
  memberId: BigInt(7),
}

function ctx(u: AuthenticatedUser) {
  return { userId: u.userId, roles: u.roles, staffId: u.staffId, memberId: u.memberId }
}

beforeEach(() => jest.clearAllMocks())

describe('TrainingController', () => {
  describe('listSessions', () => {
    it('delegates to listSessions with query and caller context', async () => {
      const serviceResult = { data: [], meta: { total: 0 } }
      ;(mockService.listSessions as jest.Mock).mockResolvedValue(serviceResult)
      const query = { from: '2025-01-01' } as any
      const res = await ctrl.listSessions(query, trainerUser)
      expect(mockService.listSessions).toHaveBeenCalledWith(query, ctx(trainerUser))
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('getSession', () => {
    it('delegates to getSession with BigInt id', async () => {
      const serviceResult = { data: { id: '15', status: 'scheduled' } }
      ;(mockService.getSession as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.getSession(15, trainerUser)
      expect(mockService.getSession).toHaveBeenCalledWith(BigInt(15), ctx(trainerUser))
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException', async () => {
      ;(mockService.getSession as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.getSession(999, trainerUser)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('createSession', () => {
    it('delegates to createSession and wraps success', async () => {
      const serviceResult = { data: { id: '50' } }
      ;(mockService.createSession as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { memberId: 7, startTime: new Date().toISOString() } as any
      const res = await ctrl.createSession(dto, trainerUser)
      expect(mockService.createSession).toHaveBeenCalledWith(dto, {
        userId: trainerUser.userId,
        roles: trainerUser.roles,
        staffId: trainerUser.staffId,
      })
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates exception from service', async () => {
      const { BadRequestException } = await import('@nestjs/common')
      ;(mockService.createSession as jest.Mock).mockRejectedValue(new BadRequestException())
      await expect(ctrl.createSession({} as any, trainerUser)).rejects.toBeInstanceOf(BadRequestException)
    })
  })

  describe('updateSession', () => {
    it('delegates to updateSession and wraps success', async () => {
      const serviceResult = { data: { id: '50', notes: 'updated' } }
      ;(mockService.updateSession as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { notes: 'updated' } as any
      const res = await ctrl.updateSession(50, dto, trainerUser)
      expect(mockService.updateSession).toHaveBeenCalledWith(BigInt(50), dto, {
        userId: trainerUser.userId,
        roles: trainerUser.roles,
        staffId: trainerUser.staffId,
      })
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('cancelSession', () => {
    it('delegates to cancelSession and returns success:true', async () => {
      ;(mockService.cancelSession as jest.Mock).mockResolvedValue(undefined)
      const dto = { reason: 'sick' } as any
      const res = await ctrl.cancelSession(50, dto, trainerUser)
      expect(mockService.cancelSession).toHaveBeenCalledWith(BigInt(50), dto, ctx(trainerUser))
      expect(res).toEqual({ success: true })
    })

    it('propagates ForbiddenException', async () => {
      ;(mockService.cancelSession as jest.Mock).mockRejectedValue(new ForbiddenException())
      await expect(ctrl.cancelSession(50, {} as any, memberUser)).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('updateSessionStatus', () => {
    it('delegates to updateSessionStatus and wraps success', async () => {
      const serviceResult = { data: { id: '50', status: 'completed' } }
      ;(mockService.updateSessionStatus as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { status: 'completed' as any }
      const res = await ctrl.updateSessionStatus(50, dto, trainerUser)
      expect(mockService.updateSessionStatus).toHaveBeenCalledWith(BigInt(50), 'completed', ctx(trainerUser))
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })
})

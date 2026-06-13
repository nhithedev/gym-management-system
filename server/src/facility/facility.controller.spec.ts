import { NotFoundException } from '@nestjs/common'
import { FacilityController } from './facility.controller'
import { FacilityService } from './facility.service'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'

const mockFacility = {
  listRooms: jest.fn(),
  getRoom: jest.fn(),
  createRoom: jest.fn(),
  updateRoom: jest.fn(),
  deleteRoom: jest.fn(),
  listEquipment: jest.fn(),
  getEquipment: jest.fn(),
  createEquipment: jest.fn(),
  updateEquipment: jest.fn(),
  deleteEquipment: jest.fn(),
  listMaintenanceLogs: jest.fn(),
  createMaintenanceLog: jest.fn(),
  updateMaintenanceLog: jest.fn(),
} as unknown as FacilityService

const ctrl = new FacilityController(mockFacility)

const user: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'staff@test.com',
  roles: ['staff'],
}

beforeEach(() => jest.clearAllMocks())

describe('FacilityController', () => {
  describe('listRooms', () => {
    it('delegates to listRooms and wraps success', async () => {
      const serviceResult = { data: [{ id: '1', name: 'Phòng A' }], meta: { total: 1 } }
      ;(mockFacility.listRooms as jest.Mock).mockResolvedValue(serviceResult)
      const query = { page: 1, pageSize: 20 } as any
      const res = await ctrl.listRooms(query)
      expect(mockFacility.listRooms).toHaveBeenCalledWith(query)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('getRoom', () => {
    it('delegates to getRoom with BigInt id and wraps success', async () => {
      const serviceResult = { data: { id: '3', name: 'Phòng B' } }
      ;(mockFacility.getRoom as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.getRoom(3)
      expect(mockFacility.getRoom).toHaveBeenCalledWith(BigInt(3))
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException', async () => {
      ;(mockFacility.getRoom as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.getRoom(999)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('createRoom', () => {
    it('delegates to createRoom and wraps success', async () => {
      const serviceResult = { data: { id: '10', name: 'Phòng mới' } }
      ;(mockFacility.createRoom as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { name: 'Phòng mới', capacity: 20 } as any
      const res = await ctrl.createRoom(dto, user)
      expect(mockFacility.createRoom).toHaveBeenCalledWith(dto, user.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('updateRoom', () => {
    it('delegates to updateRoom and wraps success', async () => {
      const serviceResult = { data: { id: '3', name: 'Updated' } }
      ;(mockFacility.updateRoom as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { name: 'Updated' } as any
      const res = await ctrl.updateRoom(3, dto, user)
      expect(mockFacility.updateRoom).toHaveBeenCalledWith(BigInt(3), dto, user.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('deleteRoom', () => {
    it('delegates to deleteRoom and returns void', async () => {
      ;(mockFacility.deleteRoom as jest.Mock).mockResolvedValue(undefined)
      const res = await ctrl.deleteRoom(3, user)
      expect(mockFacility.deleteRoom).toHaveBeenCalledWith(BigInt(3), user.userId)
      expect(res).toBeUndefined()
    })
  })

  describe('createEquipment', () => {
    it('delegates to createEquipment and wraps success', async () => {
      const serviceResult = { data: { id: '5', name: 'Máy chạy bộ' } }
      ;(mockFacility.createEquipment as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { name: 'Máy chạy bộ', roomId: BigInt(1) } as any
      const res = await ctrl.createEquipment(dto, user)
      expect(mockFacility.createEquipment).toHaveBeenCalledWith(dto, user.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('deleteEquipment', () => {
    it('delegates to deleteEquipment with force flag', async () => {
      ;(mockFacility.deleteEquipment as jest.Mock).mockResolvedValue(undefined)
      const res = await ctrl.deleteEquipment(5, user, 'true')
      expect(mockFacility.deleteEquipment).toHaveBeenCalledWith(BigInt(5), user.userId, user.roles, true)
      expect(res).toBeUndefined()
    })
  })

  describe('listMaintenanceLogs', () => {
    it('delegates to listMaintenanceLogs and wraps success', async () => {
      const serviceResult = { data: [], meta: { total: 0 } }
      ;(mockFacility.listMaintenanceLogs as jest.Mock).mockResolvedValue(serviceResult)
      const query = {} as any
      const res = await ctrl.listMaintenanceLogs(5, query)
      expect(mockFacility.listMaintenanceLogs).toHaveBeenCalledWith(BigInt(5), query)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('updateMaintenanceLog', () => {
    it('delegates to updateMaintenanceLog and wraps success', async () => {
      const serviceResult = { data: { id: '1', status: 'resolved' } }
      ;(mockFacility.updateMaintenanceLog as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { status: 'resolved' } as any
      const res = await ctrl.updateMaintenanceLog(1, dto, user)
      expect(mockFacility.updateMaintenanceLog).toHaveBeenCalledWith(BigInt(1), dto, user.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })
})

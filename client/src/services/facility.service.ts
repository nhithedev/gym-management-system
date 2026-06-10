import api from './api'

export interface GymRoom {
  roomId: string
  roomCode: string
  name: string
  roomType?: string
  capacity: number
  description?: string
  stats?: { equipmentCount: number; activeSessionsCount: number }
}

export interface CreateRoomDto {
  name: string
  roomType?: string
  capacity: number
  description?: string
  roomCode?: string
}

export interface Equipment {
  equipmentId: string
  equipmentCode: string
  roomId: string
  room?: { roomCode: string; name: string }
  name: string
  importDate: string
  warrantyUntil?: string
  status: 'active' | 'broken' | 'repairing' | 'retired'
  openMaintenance?: MaintenanceLog | null
  stats?: { totalMaintenanceLogs: number; lastResolvedAt?: string }
}

export interface CreateEquipmentDto {
  roomId: string
  name: string
  importDate: string
  warrantyUntil?: string
  equipmentCode?: string
}

export interface MaintenanceLog {
  maintenanceId: string
  equipmentId: string
  reportedByStaff?: { staffId: string; staffCode: string; fullName: string }
  description: string
  status: 'reported' | 'repairing' | 'resolved' | 'failed'
  reportedAt: string
  resolvedAt?: string
}

export interface PageMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

const facilityService = {
  // --- Rooms ---
  listRooms: async (params?: {
    page?: number
    pageSize?: number
    search?: string
    roomType?: string
  }): Promise<{ data: GymRoom[]; meta: PageMeta }> => {
    const res = await api.get('/rooms', { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  getRoom: async (id: string): Promise<GymRoom> => {
    const res = await api.get(`/rooms/${id}`)
    return res.data.data
  },

  createRoom: async (dto: CreateRoomDto): Promise<GymRoom> => {
    const res = await api.post('/rooms', dto)
    return res.data.data
  },

  updateRoom: async (id: string, dto: Partial<CreateRoomDto>): Promise<GymRoom> => {
    const res = await api.patch(`/rooms/${id}`, dto)
    return res.data.data
  },

  deleteRoom: async (id: string): Promise<void> => {
    await api.delete(`/rooms/${id}`)
  },

  // --- Equipment ---
  listEquipment: async (params?: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    roomId?: string
  }): Promise<{ data: Equipment[]; meta: PageMeta }> => {
    const res = await api.get('/equipment', { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  getEquipment: async (id: string): Promise<Equipment> => {
    const res = await api.get(`/equipment/${id}`)
    return res.data.data
  },

  createEquipment: async (dto: CreateEquipmentDto): Promise<Equipment> => {
    const res = await api.post('/equipment', dto)
    return res.data.data
  },

  updateEquipment: async (
    id: string,
    dto: Partial<{ roomId: string; name: string; importDate: string; warrantyUntil: string; status: string }>,
  ): Promise<Equipment> => {
    const res = await api.patch(`/equipment/${id}`, dto)
    return res.data.data
  },

  deleteEquipment: async (id: string): Promise<void> => {
    await api.delete(`/equipment/${id}`)
  },

  // --- Maintenance ---
  listMaintenanceLogs: async (
    equipmentId: string,
    params?: { page?: number; pageSize?: number; status?: string },
  ): Promise<{ data: MaintenanceLog[]; meta: PageMeta }> => {
    const res = await api.get(`/equipment/${equipmentId}/maintenance-logs`, { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  reportBroken: async (equipmentId: string, description: string): Promise<MaintenanceLog> => {
    const res = await api.post(`/equipment/${equipmentId}/maintenance-logs`, { description })
    return res.data.data
  },

  updateMaintenanceStatus: async (
    maintenanceId: string,
    status: 'repairing' | 'resolved' | 'failed',
  ): Promise<MaintenanceLog> => {
    const res = await api.patch(`/maintenance-logs/${maintenanceId}`, { status })
    return res.data.data
  },
}

export { facilityService }

import api from './api'

export interface GymRoom {
  roomId: string
  roomCode: string
  name: string
  roomType: string | null
  capacity: number
  description: string | null
}

export interface Equipment {
  equipmentId: string
  equipmentCode: string
  roomId: string
  room?: { roomCode: string; name: string }
  name: string
  importDate: string
  warrantyUntil: string | null
  status: 'active' | 'broken' | 'repairing' | 'retired'
  openMaintenance?: {
    maintenanceId: string
    description: string
    status: string
    reportedAt: string
    reportedByStaff: { staffId: string; staffCode: string; fullName: string }
  } | null
  stats?: { totalMaintenanceLogs: number; lastResolvedAt: string | null }
}

export interface MaintenanceLog {
  maintenanceId: string
  equipmentId: string
  reportedByStaff: { staffId: string; staffCode: string; fullName: string }
  description: string
  status: 'reported' | 'repairing' | 'resolved' | 'failed'
  reportedAt: string
  resolvedAt: string | null
}

export const facilityService = {
  listRooms: async (params?: {
    search?: string
    roomType?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: GymRoom[]; total: number }> => {
    const res = await api.get<{ success: boolean; data: GymRoom[]; meta?: { totalItems: number } }>(
      '/rooms',
      { params: { pageSize: 100, ...params } },
    )
    return { data: res.data.data, total: res.data.meta?.totalItems ?? res.data.data.length }
  },

  listRoomsLookup: async (params?: { search?: string; roomType?: string }): Promise<GymRoom[]> => {
    const res = await api.get<{ success: boolean; data: GymRoom[] }>('/rooms/lookup', {
      params: { ...params, pageSize: 100 },
    })
    return res.data.data
  },

  listEquipment: async (params?: {
    page?: number
    pageSize?: number
    roomId?: string
    status?: string
    search?: string
    warrantyExpiring?: boolean
    sort?: string
  }): Promise<{ data: Equipment[]; total: number }> => {
    const res = await api.get<{ success: boolean; data: Equipment[]; meta?: { totalItems: number } }>(
      '/equipment',
      { params },
    )
    return { data: res.data.data, total: res.data.meta?.totalItems ?? res.data.data.length }
  },

  getEquipment: async (equipmentId: string): Promise<Equipment> => {
    const res = await api.get<{ success: boolean; data: Equipment }>(`/equipment/${equipmentId}`)
    return res.data.data
  },

  listMaintenanceLogs: async (
    equipmentId: string,
    params?: { page?: number; pageSize?: number; status?: string; from?: string; to?: string },
  ): Promise<{ data: MaintenanceLog[]; total: number }> => {
    const res = await api.get<{ success: boolean; data: MaintenanceLog[]; meta?: { totalItems: number } }>(
      `/equipment/${equipmentId}/maintenance-logs`,
      { params },
    )
    return { data: res.data.data, total: res.data.meta?.totalItems ?? res.data.data.length }
  },

  createMaintenanceLog: async (
    equipmentId: string,
    description: string,
  ): Promise<MaintenanceLog> => {
    const res = await api.post<{ success: boolean; data: MaintenanceLog }>(
      `/equipment/${equipmentId}/maintenance-logs`,
      { description },
    )
    return res.data.data
  },

  updateMaintenanceLog: async (
    maintenanceLogId: string,
    status: 'repairing' | 'resolved' | 'failed',
    resolutionNote?: string,
  ): Promise<MaintenanceLog> => {
    const res = await api.patch<{ success: boolean; data: MaintenanceLog }>(
      `/maintenance-logs/${maintenanceLogId}`,
      { status, ...(resolutionNote ? { resolutionNote } : {}) },
    )
    return res.data.data
  },
}

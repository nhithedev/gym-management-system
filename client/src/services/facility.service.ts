import api from './api'

export interface GymRoom {
  roomId: string
  roomCode: string
  name: string
  roomType: string | null
  capacity: number
  description: string | null
}

export const facilityService = {
  listRooms: async (params?: { search?: string; roomType?: string }): Promise<GymRoom[]> => {
    const res = await api.get<{ success: boolean; data: GymRoom[] }>('/rooms/lookup', {
      params: { ...params, pageSize: 100 },
    })
    return res.data.data
  },
}

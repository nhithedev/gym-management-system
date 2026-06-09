import api from './api'

export interface StaffProfile {
  staffId: string
  userId: string
  staffCode: string
  position: string
  fullName: string
  email: string
  phone: string | null
  status?: string
}

export interface StaffSchedule {
  scheduleId: string
  staffId: string
  shift: 'morning' | 'afternoon' | 'evening'
  workDate: string
}

export const staffService = {
  getMe: async (): Promise<StaffProfile> => {
    const res = await api.get<{ success: boolean; data: StaffProfile }>('/staff/me')
    return res.data.data
  },

  getSchedules: async (staffId: string): Promise<StaffSchedule[]> => {
    const res = await api.get<{ success: boolean; data: StaffSchedule[] }>(
      `/staff/${staffId}/schedules`
    )
    return res.data.data
  },
}

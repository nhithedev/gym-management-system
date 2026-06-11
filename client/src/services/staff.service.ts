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
  deletedAt?: string | null
}

export interface StaffSchedule {
  scheduleId: string
  staffId: string
  shift: 'morning' | 'afternoon' | 'evening'
  workDate: string
}

export interface CreateStaffDto {
  email: string
  fullName: string
  phone?: string
  position: string
  groupIds?: string[]
}

export interface UpdateStaffDto {
  fullName?: string
  phone?: string
  position?: string
}

export interface ScheduleEntry {
  shift: 'morning' | 'afternoon' | 'evening'
  workDate: string
}

export const staffService = {
  getMe: async (): Promise<StaffProfile> => {
    const res = await api.get<{ success: boolean; data: StaffProfile }>('/staff/me')
    return res.data.data
  },

  list: async (params?: {
    position?: string
    status?: string
    search?: string
    page?: number
    pageSize?: number
    sort?: string
  }): Promise<{ data: StaffProfile[]; total: number; totalPages: number }> => {
    const res = await api.get<{
      success: boolean
      data: {
        data: StaffProfile[]
        meta?: { totalItems: number; totalPages: number; page: number }
      }
    }>('/staff', { params })
    const inner = res.data.data
    return {
      data: inner.data ?? [],
      total: inner.meta?.totalItems ?? inner.data?.length ?? 0,
      totalPages: inner.meta?.totalPages ?? 1,
    }
  },

  getById: async (staffId: string): Promise<StaffProfile> => {
    const res = await api.get<{ success: boolean; data: StaffProfile }>(`/staff/${staffId}`)
    return res.data.data
  },

  create: async (dto: CreateStaffDto): Promise<StaffProfile> => {
    const res = await api.post<{ success: boolean; data: StaffProfile }>('/staff', dto)
    return res.data.data
  },

  update: async (staffId: string, dto: UpdateStaffDto): Promise<StaffProfile> => {
    const res = await api.patch<{ success: boolean; data: StaffProfile }>(`/staff/${staffId}`, dto)
    return res.data.data
  },

  delete: async (staffId: string): Promise<void> => {
    await api.delete(`/staff/${staffId}`)
  },

  getSchedules: async (staffId: string): Promise<StaffSchedule[]> => {
    const res = await api.get<{ success: boolean; data: StaffSchedule[] }>(
      `/staff/${staffId}/schedules`
    )
    return res.data.data
  },

  createSchedules: async (
    staffId: string,
    schedules: ScheduleEntry[]
  ): Promise<{ created: number; schedules: StaffSchedule[] }> => {
    const res = await api.post<{
      success: boolean
      data: { created: number; schedules: StaffSchedule[] }
    }>(`/staff/${staffId}/schedules`, { schedules })
    return res.data.data  // controller: return { success: true, data } where data = { created, schedules }
  },

  deleteSchedule: async (staffId: string, scheduleId: string): Promise<void> => {
    await api.delete(`/staff/${staffId}/schedules/${scheduleId}`)
  },
}

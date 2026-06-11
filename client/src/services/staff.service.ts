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

export interface StaffListItem {
  staffId: string
  userId: string
  staffCode: string
  position: string
  fullName: string
  email: string
  phone: string | null
  status?: string
}

export interface ListStaffParams {
  page?: number
  pageSize?: number
  search?: string
  position?: string
  status?: string
}

export const staffService = {
  getMe: async (): Promise<StaffProfile> => {
    const res = await api.get<{ success: boolean; data: StaffProfile }>('/staff/me')
    return res.data.data
  },

  list: async (
    params: ListStaffParams = {}
  ): Promise<{ data: StaffListItem[]; total: number; page: number; totalPages: number }> => {
    const res = await api.get<{
      success: boolean
      data: {
        data: StaffListItem[]
        meta: { page: number; totalItems: number; totalPages: number }
      }
    }>('/staff', { params })
    const inner = res.data.data
    return {
      data: inner.data,
      total: inner.meta?.totalItems ?? inner.data.length,
      page: inner.meta?.page ?? params.page ?? 1,
      totalPages: inner.meta?.totalPages ?? 1,
    }
  },

  getSchedules: async (staffId: string): Promise<StaffSchedule[]> => {
    const res = await api.get<{ success: boolean; data: StaffSchedule[] }>(
      `/staff/${staffId}/schedules`
    )
    return res.data.data
  },
}

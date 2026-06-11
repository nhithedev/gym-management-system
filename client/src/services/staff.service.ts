import api from './api'

export type StaffPosition = 'owner' | 'staff' | 'trainer' | 'member'

export interface StaffProfile {
  staffId: string
  userId: string
  staffCode: string
  position: StaffPosition
  fullName: string
  email: string
  phone: string | null
  status: string
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
  position: StaffPosition
  fullName: string
  email: string
  phone: string | null
  status?: string
}

export interface ListStaffParams {
  page?: number
  pageSize?: number
  search?: string
  position?: StaffPosition
  status?: string
  sort?: string
}
export interface CreateStaffDto {
  email: string
  fullName: string
  phone?: string
  position: StaffPosition
  groupIds?: string[]
}

export interface UpdateStaffDto {
  fullName?: string
  phone?: string | null
  position?: StaffPosition
}

export const staffService = {
  getMe: async (): Promise<StaffProfile> => {
    const res = await api.get<{ success: boolean; data: StaffProfile }>('/staff/me')
    return res.data.data
  },

list: async (
    params: ListStaffParams = {}
  ): Promise<{ data: StaffProfile[]; total: number; page: number; totalPages: number }> => {
    const res = await api.get<{
      success: boolean
      data: {
        data: StaffProfile[]
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

  createSchedules: async (staffId: string, schedules: { shift: string; workDate: string }[]): Promise<{ created: number }> => {
    const res = await api.post<{ success: boolean; data: { created: number } }>(
      `/staff/${staffId}/schedules`,
      { schedules }
    )
    return res.data.data
  },

  deleteSchedule: async (staffId: string, scheduleId: string): Promise<void> => {
    await api.delete(`/staff/${staffId}/schedules/${scheduleId}`)
  },
}

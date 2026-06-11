import api from './api'

export interface AttendanceLog {
  attendanceId: string
  memberId: string
  subscriptionId: string
  startTime: string
  endTime: string | null
  method: 'manual' | 'qr' | 'device'
  sessionId: string | null
  member?: { memberId: string; memberCode: string; fullName: string }
  subscription?: { subscriptionId: string; endDate: string }
}

export interface ManualCheckinResult {
  attendanceId: string
  memberId: string
  subscriptionId: string
  startTime: string
  endTime: string | null
  method: string
  member: { memberId: string; memberCode: string; fullName: string }
  subscription: { subscriptionId: string; endDate: string }
}

export const attendanceService = {
  manualCheckin: async (memberCode: string): Promise<ManualCheckinResult> => {
    const res = await api.post<{ success: boolean; data: ManualCheckinResult }>(
      '/attendance/manual-checkin',
      { memberCode, occurredAt: new Date().toISOString() },
    )
    return res.data.data
  },

  listLogs: async (params?: {
    page?: number
    pageSize?: number
    memberId?: string
    from?: string
    to?: string
  }): Promise<{ data: AttendanceLog[]; total: number }> => {
    const res = await api.get<{ success: boolean; data: AttendanceLog[]; meta?: { totalItems: number } }>(
      '/attendance-logs',
      { params },
    )
    return { data: res.data.data, total: res.data.meta?.totalItems ?? res.data.data.length }
  },

  checkout: async (attendanceId: string, endTime?: string): Promise<AttendanceLog> => {
    const res = await api.patch<{ success: boolean; data: AttendanceLog }>(
      `/attendance-logs/${attendanceId}/checkout`,
      { endTime: endTime ?? new Date().toISOString() },
    )
    return res.data.data
  },
}

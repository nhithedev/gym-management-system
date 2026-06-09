import api from './api'

export interface TrainingSession {
  sessionId: string
  memberId: string
  trainerStaffId: string | null
  trainerName: string | null
  roomId: string | null
  roomName: string | null
  startTime: string
  endTime: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
}

export interface AttendanceLog {
  attendanceId: string
  memberId: string
  sessionId: string | null
  startTime: string
  endTime: string | null
  method: 'realtime' | 'manual' | 'qr'
}

export const trainingService = {
  getSessions: async (params: {
    memberId?: string
    status?: string
    sort?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: TrainingSession[]; total: number }> => {
    const res = await api.get<{ success: boolean; data: TrainingSession[]; meta?: { totalItems: number } }>(
      '/training-sessions',
      { params },
    )
    return {
      data: res.data.data,
      total: res.data.meta?.totalItems ?? res.data.data.length,
    }
  },

  getAttendance: async (params: {
    memberId?: string
    month?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: AttendanceLog[]; total: number }> => {
    const { month, ...rest } = params
    const query: Record<string, unknown> = { ...rest }

    if (month) {
      const [yearStr, monthStr] = month.split('-')
      const lastDay = new Date(Number(yearStr), Number(monthStr), 0).getDate()
      query.from = `${yearStr}-${monthStr}-01`
      query.to = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`
    }

    const res = await api.get<{ success: boolean; data: AttendanceLog[]; meta?: { totalItems: number } }>(
      '/attendance-logs',
      { params: query },
    )
    return {
      data: res.data.data,
      total: res.data.meta?.totalItems ?? res.data.data.length,
    }
  },
}

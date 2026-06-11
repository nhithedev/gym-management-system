import api from './api'

export interface RevenueReport {
  total: string
  currency: string
  breakdown: Array<{ date: string; amount: string }>
}

export interface MembersReport {
  total: number
  breakdown: Array<{ date: string; count: number }>
}

export interface RenewalsReport {
  renewed: number
  churned: number
  renewalRate: number | null
}

export interface StaffPerformanceRow {
  staffId: string
  staffCode: string
  fullName: string
  completedSessions: number
  avgFeedbackSeverityScore: number | null
}

export const reportService = {
  revenue: async (from: string, to: string): Promise<RevenueReport> => {
    const res = await api.get<{ success: boolean; data: RevenueReport; meta: { from: string; to: string } }>(
      '/reports/revenue',
      { params: { from, to } }
    )
    return res.data.data
  },

  members: async (from: string, to: string): Promise<MembersReport> => {
    const res = await api.get<{ success: boolean; data: MembersReport; meta: { from: string; to: string } }>(
      '/reports/members',
      { params: { from, to } }
    )
    return res.data.data
  },

  renewals: async (from: string, to: string): Promise<RenewalsReport> => {
    const res = await api.get<{ success: boolean; data: RenewalsReport; meta: { from: string; to: string } }>(
      '/reports/renewals',
      { params: { from, to } }
    )
    return res.data.data
  },

  staffPerformance: async (from: string, to: string, staffId?: string): Promise<StaffPerformanceRow[]> => {
    const res = await api.get<{
      success: boolean
      data: StaffPerformanceRow[]
      meta: { from: string; to: string }
    }>('/reports/staff-performance', { params: { from, to, ...(staffId ? { staffId } : {}) } })
    return res.data.data
  },
}

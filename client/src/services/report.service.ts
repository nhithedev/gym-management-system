import api from './api'

export interface RevenueBreakdown {
  date: string
  amount: string
}

export interface RevenueData {
  total: string
  currency: string
  breakdown: RevenueBreakdown[]
}

export interface MemberBreakdown {
  date: string
  count: number
}

export interface MemberData {
  total: number
  breakdown: MemberBreakdown[]
}

export interface RenewalData {
  renewed: number
  churned: number
  renewalRate: number | null
}

export interface StaffPerformanceItem {
  staffId: string
  staffCode: string
  fullName: string
  completedSessions: number
  avgFeedbackSeverityScore: number | null
}

export interface EmployeePerformanceItem {
  staffId: string
  staffCode: string
  fullName: string
  position: string
  shiftsWorked: number
  avgFeedbackSeverityScore: number | null
}

export const reportService = {
  getRevenue: async (from: string, to: string): Promise<RevenueData> => {
    const res = await api.get<{ success: boolean; data: RevenueData }>('/reports/revenue', {
      params: { from, to },
    })
    return res.data.data
  },

  getMembers: async (from: string, to: string): Promise<MemberData> => {
    const res = await api.get<{ success: boolean; data: MemberData }>('/reports/members', {
      params: { from, to },
    })
    return res.data.data
  },

  getRenewals: async (from: string, to: string): Promise<RenewalData> => {
    const res = await api.get<{ success: boolean; data: RenewalData }>('/reports/renewals', {
      params: { from, to },
    })
    return res.data.data
  },

  getStaffPerformance: async (
    from: string,
    to: string,
    staffId?: string
  ): Promise<StaffPerformanceItem[]> => {
    const res = await api.get<{ success: boolean; data: StaffPerformanceItem[] }>(
      '/reports/staff-performance',
      {
        params: { from, to, ...(staffId ? { staffId } : {}) },
      }
    )
    return res.data.data
  },

  getEmployeePerformance: async (from: string, to: string): Promise<EmployeePerformanceItem[]> => {
    const res = await api.get<{ success: boolean; data: EmployeePerformanceItem[] }>(
      '/reports/employee-performance',
      {
        params: { from, to },
      }
    )
    return res.data.data
  },
}

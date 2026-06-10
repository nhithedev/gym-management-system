import api from './api'

export interface DateRangeParams {
  from: string
  to: string
}

export interface RevenueBreakdownItem {
  date: string
  amount: string
}

export interface RevenueReport {
  total: string
  currency: string
  breakdown: RevenueBreakdownItem[]
}

export interface MemberBreakdownItem {
  date: string
  count: number
}

export interface MembersReport {
  total: number
  breakdown: MemberBreakdownItem[]
}

export interface RenewalsReport {
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

interface ReportMeta {
  from: string
  to: string
}

const reportService = {
  async getRevenue(params: DateRangeParams): Promise<{ data: RevenueReport; meta: ReportMeta }> {
    const res = await api.get('/reports/revenue', { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  async getMembers(params: DateRangeParams): Promise<{ data: MembersReport; meta: ReportMeta }> {
    const res = await api.get('/reports/members', { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  async getRenewals(params: DateRangeParams): Promise<{ data: RenewalsReport; meta: ReportMeta }> {
    const res = await api.get('/reports/renewals', { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  async getStaffPerformance(
    params: DateRangeParams & { staffId?: string },
  ): Promise<{ data: StaffPerformanceItem[]; meta: ReportMeta }> {
    const res = await api.get('/reports/staff-performance', { params })
    return { data: res.data.data, meta: res.data.meta }
  },
}

export default reportService

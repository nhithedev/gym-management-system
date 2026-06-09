// Owner-related types

export interface Report {
  id: string
  title: string
  type: string
  generatedAt: string
  data: Record<string, unknown>
}

export interface Revenue {
  period: string
  totalRevenue: number
  membershipRevenue: number
  sessionRevenue: number
  otherRevenue: number
  memberCount: number
}

export interface StaffSchedule {
  id: string
  staffId: string
  staffName?: string
  date: string
  shiftStart: string
  shiftEnd: string
  note?: string
}

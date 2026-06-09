// Member-related types

export interface Package {
  id: string
  name: string
  durationDays: number
  sessionCount: number
  price: number
  benefits: string
  isActive: boolean
}

export interface Subscription {
  id: string
  memberId: string
  packageId: string
  packageName: string
  startDate: string
  endDate: string
  sessionsRemaining: number
  isActive: boolean
}

// MemberPackage is kept as an alias for backwards compatibility
export interface MemberPackage {
  id: string
  packageId: string
  packageName: string
  startDate: string
  endDate: string
  sessionsRemaining: number
  isPaid: boolean
}

export interface Payment {
  id: string
  memberId: string
  subscriptionId: string
  amount: number
  paidAt: string
  method: string
  note?: string
}

export interface Progress {
  id: string
  memberId: string
  recordedAt: string
  weight?: number
  height?: number
  bodyFat?: number
  note?: string
}

export interface WorkoutLog {
  id: string
  memberId: string
  sessionId?: string
  loggedAt: string
  duration: number
  note?: string
}

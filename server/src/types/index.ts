// ─── User & Auth ──────────────────────────────────────────────
export type Role = 'owner' | 'staff' | 'trainer' | 'member'

export interface User {
  id: string
  email: string
  role: Role
  firstName: string
  lastName: string
  phone: string
  isActive: boolean
  createdAt: Date
}

// ─── Member ───────────────────────────────────────────────────
export interface Member extends User {
  memberId: string
  dateOfBirth: Date
  hometown?: string
  fingerprintData?: string
  currentPackageId?: string
}

// ─── Package ──────────────────────────────────────────────────
export interface Package {
  id: string
  name: string
  durationDays: number
  sessionCount: number
  price: number
  benefits: string
  isActive: boolean
  createdAt: Date
}

export interface MemberPackage {
  id: string
  memberId: string
  packageId: string
  startDate: Date
  endDate: Date
  sessionsRemaining: number
  isPaid: boolean
  paymentMethod: 'cash' | 'card' | 'ewallet'
  createdAt: Date
}

// ─── Training ─────────────────────────────────────────────────
export interface TrainingSession {
  id: string
  memberId: string
  trainerId?: string
  startTime: Date
  endTime?: Date
  notes?: string
}

export interface ProgressRecord {
  id: string
  memberId: string
  trainerId: string
  weight?: number
  bmi?: number
  goal?: string
  trainerNote?: string
  recordedAt: Date
}

// ─── Equipment & Room ─────────────────────────────────────────
export type EquipmentStatus = 'active' | 'broken' | 'repairing' | 'inactive'

export interface Equipment {
  id: string
  code: string
  name: string
  roomId: string
  purchaseDate: Date
  warrantyDate?: Date
  status: EquipmentStatus
  lastMaintenanceAt?: Date
}

export interface Room {
  id: string
  code: string
  name: string
  capacity: number
  description?: string
}

// ─── Feedback ─────────────────────────────────────────────────
export type FeedbackCategory = 'staff' | 'equipment' | 'service'
export type FeedbackStatus = 'pending' | 'processing' | 'resolved'

export interface Feedback {
  id: string
  memberId: string
  category: FeedbackCategory
  content: string
  status: FeedbackStatus
  resolvedNote?: string
  createdAt: Date
  resolvedAt?: Date
}

// ─── API Response wrapper ──────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  code?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Mirror của server types, dùng phía client

export type Role = 'owner' | 'staff' | 'trainer' | 'member'

export interface User {
  id: string
  email: string
  role: Role
  firstName: string
  lastName: string
  phone: string
  isActive: boolean
}

export interface Package {
  id: string
  name: string
  durationDays: number
  sessionCount: number
  price: number
  benefits: string
  isActive: boolean
}

export interface MemberPackage {
  id: string
  packageId: string
  packageName: string
  startDate: string
  endDate: string
  sessionsRemaining: number
  isPaid: boolean
}

export type EquipmentStatus = 'active' | 'broken' | 'repairing' | 'inactive'

export interface Equipment {
  id: string
  code: string
  name: string
  roomId: string
  roomName?: string
  purchaseDate: string
  warrantyDate?: string
  status: EquipmentStatus
  lastMaintenanceAt?: string
}

export interface Room {
  id: string
  code: string
  name: string
  capacity: number
  description?: string
}

export type FeedbackCategory = 'staff' | 'equipment' | 'service'
export type FeedbackStatus = 'pending' | 'processing' | 'resolved'

export interface Feedback {
  id: string
  memberId: string
  category: FeedbackCategory
  content: string
  status: FeedbackStatus
  resolvedNote?: string
  createdAt: string
}

// API wrapper
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  code?: string
}

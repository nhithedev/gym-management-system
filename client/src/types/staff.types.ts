// Staff-related types

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

export interface MaintenanceLog {
  id: string
  equipmentId: string
  performedBy: string
  performedAt: string
  description: string
  cost?: number
  nextMaintenanceAt?: string
}

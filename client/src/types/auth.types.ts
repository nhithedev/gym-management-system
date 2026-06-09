// Auth-related types

export type Role = 'owner' | 'staff' | 'trainer' | 'member'

export interface AuthUser {
  id: string
  email: string
  role: Role
  firstName: string
  lastName: string
}

export interface User {
  id: string
  email: string
  role: Role
  firstName: string
  lastName: string
  phone: string
  isActive: boolean
}

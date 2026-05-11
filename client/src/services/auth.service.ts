import api from './api'
import type { AuthUser } from '@/stores/authStore'

interface LoginResponse {
  success: boolean
  data: {
    user: AuthUser
    token: string
  }
}

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/auth/login', { email, password })
    return res.data.data
  },

  logout: async () => {
    await api.post('/auth/logout')
  },

  forgotPassword: async (email: string) => {
    const res = await api.post('/auth/forgot-password', { email })
    return res.data
  },

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const res = await api.post('/auth/reset-password', { email, otp, newPassword })
    return res.data
  },

  me: async () => {
    const res = await api.get<{ success: boolean; data: AuthUser }>('/auth/me')
    return res.data.data
  },
}

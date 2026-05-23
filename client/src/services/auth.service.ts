import api from './api'
import type { AuthUser } from '@/stores/authStore'

interface ServerLoginData {
  accessToken: string
  user: {
    userId: string
    email: string
    fullName: string
    roles: string[]
  }
}

interface ServerMeData {
  userId: string
  email: string
  fullName: string
  roles: string[]
  memberId?: string | null
}

export const authService = {
  login: async (email: string, password: string): Promise<{ user: AuthUser; token: string }> => {
    const res = await api.post<{ success: boolean; data: ServerLoginData }>('/auth/login', {
      email,
      password,
    })
    const { accessToken, user } = res.data.data
    return { user: user as AuthUser, token: accessToken }
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

  me: async (): Promise<AuthUser> => {
    const res = await api.get<{ success: boolean; data: ServerMeData }>('/auth/me')
    return res.data.data as AuthUser
  },

  lineLogin: async (idToken: string): Promise<{ user: AuthUser; token: string }> => {
    const res = await api.post<{ success: boolean; data: ServerLoginData }>(
      '/auth/line-login',
      { idToken },
    )
    const { accessToken, user } = res.data.data
    return { user: user as AuthUser, token: accessToken }
  },
}

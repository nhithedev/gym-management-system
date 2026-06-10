import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'owner' | 'staff' | 'trainer' | 'member'

export interface AuthUser {
  userId: string
  email: string
  fullName: string
  roles: Role[]
  status?: string
  phone?: string | null
  memberId?: string | null
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  // viewRole: null = dùng roles[0] thực; chỉ owner mới được set khác null
  viewRole: Role | null

  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  setViewRole: (role: Role | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      viewRole: null,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true, viewRole: null }),

      clearAuth: () =>
        set({ user: null, token: null, isAuthenticated: false, viewRole: null }),

      setViewRole: (role) => set({ viewRole: role }),
    }),
    {
      name: 'gym-auth',
      // viewRole không persist — reload về lại giao diện mặc định
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

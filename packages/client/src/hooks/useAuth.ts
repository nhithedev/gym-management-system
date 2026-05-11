import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/auth.service'

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore()

  // Sync user from server on mount (refresh user data)
  useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const fresh = await authService.me()
      setAuth(fresh, token!)
      return fresh
    },
    enabled: isAuthenticated && !!token,
    staleTime: 1000 * 60 * 10,
    retry: false,
  })

  return { user, isAuthenticated, clearAuth }
}

import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const roleRouteMap: Record<string, string> = {
  member: '/member',
  staff: '/staff',
  trainer: '/trainer',
  owner: '/owner',
}

export default function AuthLayout() {
  const { isAuthenticated, user } = useAuthStore()

  if (isAuthenticated && user) {
    const destination = roleRouteMap[user.roles[0]] ?? '/'
    return <Navigate to={destination} replace />
  }

  return <Outlet />
}

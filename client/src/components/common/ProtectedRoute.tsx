import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { Role } from '@/stores/authStore'

interface Props {
  allowedRoles?: Role[]
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user) {
    // Owner có thể xem giao diện staff
    const effectiveRoles = user.roles.includes('owner')
      ? ([...user.roles, 'staff'] as Role[])
      : user.roles
    if (!effectiveRoles.some((r) => allowedRoles.includes(r))) {
      return <Navigate to="/" replace />
    }
  }

  return <Outlet />
}

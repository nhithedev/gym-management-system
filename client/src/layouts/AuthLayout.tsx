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

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">Gym Management</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Hệ thống quản lý phòng tập</p>
        </div>
        <div className="card">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Sidebar from '@/components/common/Sidebar'

export default function DashboardLayout() {
  const { user } = useAuthStore()

  if (!user) return null

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Sidebar user={user} />
      <main className="min-h-screen overflow-y-auto bg-surface-container-high px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

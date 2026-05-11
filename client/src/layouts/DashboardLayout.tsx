import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Sidebar from '@/components/common/Sidebar'
import Topbar from '@/components/common/Topbar'

export default function DashboardLayout() {
  const { user } = useAuthStore()

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

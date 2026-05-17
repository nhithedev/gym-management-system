import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import Sidebar from '@/components/common/Sidebar'

export default function TrainerLayout() {
  const { user } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  if (!user) return null

  return (
    <div className="min-h-screen bg-surface-container-high text-on-surface">
      <Sidebar
        user={user}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((prev) => !prev)}
      />

      <main
        className={`app-scrollbar max-h-screen overflow-y-auto bg-surface-container-high px-4 py-6 sm:px-6 lg:px-8 transition-[margin] duration-300 ${
          collapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

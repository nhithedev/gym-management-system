import { LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, type AuthUser } from '@/stores/authStore'
import { authService } from '@/services/auth.service'

const roleLabel: Record<string, string> = {
  owner: 'Chủ phòng tập',
  staff: 'Nhân viên quản lý',
  trainer: 'Huấn luyện viên',
  member: 'Hội viên',
}

export default function Topbar({ user }: { user: AuthUser }) {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const handleLogout = async () => {
    await authService.logout().catch(() => {})
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-outline-variant/70 bg-surface/80 px-4 backdrop-blur-sm sm:px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-primary shadow-sm shadow-black/5">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-on-surface">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-on-surface-variant">{roleLabel[user.role]}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-3 py-1.5 text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </header>
  )
}

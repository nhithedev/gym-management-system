import { useEffect, useState } from 'react'
import { User, Mail, Shield, CheckCircle, XCircle } from 'lucide-react'
import { authService } from '@/services/auth.service'
import type { AuthUser } from '@/stores/authStore'

export default function OwnerProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    authService.me()
      .then(setUser)
      .catch(() => setError('Không thể tải thông tin hồ sơ'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-on-surface-variant text-sm">
        Đang tải...
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center py-24 text-error text-sm">
        {error || 'Không tìm thấy thông tin người dùng'}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.38em] text-primary">Tài khoản</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-surface">Hồ sơ của tôi</h1>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-high p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <User className="size-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-on-surface">{user.fullName}</p>
            <p className="text-sm text-on-surface-variant capitalize">{user.roles[0]}</p>
          </div>
        </div>

        <div className="h-px bg-outline-variant" />

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="size-4 shrink-0 text-on-surface-variant" />
            <div>
              <p className="text-xs text-on-surface-variant">Email</p>
              <p className="text-sm text-on-surface">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="size-4 shrink-0 text-on-surface-variant" />
            <div>
              <p className="text-xs text-on-surface-variant">Vai trò</p>
              <p className="text-sm text-on-surface">{user.roles.join(', ')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user.status === 'active' ? (
              <CheckCircle className="size-4 shrink-0 text-green-500" />
            ) : (
              <XCircle className="size-4 shrink-0 text-error" />
            )}
            <div>
              <p className="text-xs text-on-surface-variant">Trạng thái tài khoản</p>
              <p className="text-sm text-on-surface capitalize">{user.status ?? 'active'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-high p-6">
        <p className="text-sm font-medium text-on-surface mb-2">Đổi mật khẩu</p>
        <p className="text-sm text-on-surface-variant">
          Để đổi mật khẩu, vui lòng đăng xuất và dùng chức năng{' '}
          <span className="text-primary">Quên mật khẩu</span> ở trang đăng nhập.
        </p>
      </div>
    </div>
  )
}

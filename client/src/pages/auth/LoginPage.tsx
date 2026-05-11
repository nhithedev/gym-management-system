import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/authStore'

interface FormValues {
  email: string
  password: string
}

const debugAccounts = [
  { role: 'member' as const, label: 'Vào dashboard Member', route: '/member', email: 'member@debug.local' },
  { role: 'staff' as const, label: 'Vào dashboard Staff', route: '/staff', email: 'staff@debug.local' },
  { role: 'trainer' as const, label: 'Vào dashboard Trainer', route: '/trainer', email: 'trainer@debug.local' },
  { role: 'owner' as const, label: 'Vào dashboard Owner', route: '/owner', email: 'owner@debug.local' },
] 

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError('')
      const { user, token } = await authService.login(data.email, data.password)
      setAuth(user, token)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Đăng nhập thất bại, vui lòng thử lại'
      setServerError(message)
    }
  }

  const handleDebugLogin = (role: (typeof debugAccounts)[number]['role']) => {
    const account = debugAccounts.find((item) => item.role === role)

    if (!account) {
      return
    }

    setServerError('')
    setAuth(
      {
        id: `debug-${role}`,
        email: account.email,
        role,
        firstName: role[0].toUpperCase() + role.slice(1),
        lastName: 'Debug',
      },
      `debug-token-${role}`
    )
    navigate(account.route, { replace: true })
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-on-surface">Đăng nhập</h2>

      {serverError && (
        <div className="mb-4 rounded-lg bg-error/20 p-3 text-sm text-error">{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface">Email</label>
          <input
            type="email"
            placeholder="email@example.com"
            className="input-base"
            {...register('email', {
              required: 'Email là bắt buộc',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Email không hợp lệ',
              },
            })}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-error">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Mật khẩu</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input-base pr-10"
              {...register('password', {
                required: 'Mật khẩu là bắt buộc',
                minLength: { value: 8, message: 'Mật khẩu tối thiểu 8 ký tự' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-error">{errors.password.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Quên mật khẩu?
          </Link>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Đăng nhập
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-container p-4">
        <p className="text-sm font-semibold text-on-surface">Debug nhanh</p>
        <p className="mt-1 text-xs leading-6 text-on-surface-variant">
          Dùng các nút dưới đây để vào thẳng dashboard tương ứng mà không cần nhập thông tin.
        </p>

        <div className="mt-4 grid gap-2">
          {debugAccounts.map((account) => (
            <button
              key={account.role}
              type="button"
              onClick={() => handleDebugLogin(account.role)}
              className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface px-4 py-3 text-left text-sm font-medium text-on-surface transition hover:bg-surface-container-high"
            >
              <span>{account.label}</span>
              <span className="text-xs uppercase tracking-[0.28em] text-on-surface-variant">
                {account.role}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

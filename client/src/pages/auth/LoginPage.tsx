import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import liff from '@line/liff'
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

const roleRouteMap: Record<string, string> = {
  member: '/member',
  staff: '/staff',
  trainer: '/trainer',
  owner: '/owner',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isLineLoading, setIsLineLoading] = useState(false)
  const [isLiffReady, setIsLiffReady] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError('')
      const { user, token } = await authService.login(data.email, data.password)
      setAuth(user, token)
      navigate(roleRouteMap[user.roles[0]] ?? '/', { replace: true })
    } catch (err: unknown) {
      // Ghi đè autofill của browser bằng đúng giá trị user đã gõ
      setValue('email', data.email, { shouldDirty: false })
      setValue('password', data.password, { shouldDirty: false })
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
        userId: `debug-${role}`,
        email: account.email,
        roles: [role],
        fullName: role[0].toUpperCase() + role.slice(1) + ' Debug',
      },
      `debug-token-${role}`
    )
    navigate(account.route, { replace: true })
  }

  const handleLineLoginComplete = useCallback(async () => {
    const idToken = liff.getIDToken()
    if (!idToken) return
    setIsLineLoading(true)
    setServerError('')
    try {
      const { user, token } = await authService.lineLogin(idToken)
      setAuth(user, token)
      navigate(roleRouteMap[user.roles[0]] ?? '/', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Đăng nhập LINE thất bại. Vui lòng thử lại.'
      setServerError(msg)
    } finally {
      setIsLineLoading(false)
    }
  }, [setAuth, navigate])

  useEffect(() => {
    const liffId = import.meta.env.VITE_LIFF_ID
    if (!liffId) return
    let cancelled = false
    liff
      .init({ liffId })
      .then(() => {
        if (cancelled) return
        setIsLiffReady(true)
        if (liff.isLoggedIn()) void handleLineLoginComplete()
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.error('LIFF init failed', err)
      })
    return () => {
      cancelled = true
    }
  }, [handleLineLoginComplete])

  const handleLineLogin = () => {
    const liffId = import.meta.env.VITE_LIFF_ID
    if (!liffId) {
      setServerError('Đăng nhập LINE chưa khả dụng.')
      return
    }
    if (!liff.isLoggedIn()) {
      liff.login()
      return
    }
    void handleLineLoginComplete()
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

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting || isLineLoading}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Đăng nhập
        </button>
      </form>

      {/* LINE Login */}
      <div className="flex items-center gap-3 my-4">
        <hr className="flex-1 border-outline-variant" />
        <span className="text-sm text-on-surface-variant">hoặc</span>
        <hr className="flex-1 border-outline-variant" />
      </div>

      <button
        type="button"
        onClick={handleLineLogin}
        disabled={isLineLoading || isSubmitting || (!isLiffReady && !!import.meta.env.VITE_LIFF_ID)}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-outline py-3 px-4 text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
      >
        {isLineLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#06C755" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.169 2 11.3c0 4.144 2.726 7.677 6.727 9.2.29.064.69-.022.793-.48.078-.331.503-2.097.503-2.097s-.127-.258-.127-.64c0-.6.348-1.048.78-1.048.368 0 .547.277.547.608 0 .37-.236.923-.358 1.437-.102.43.215.78.637.78.764 0 1.352-.805 1.352-1.969 0-1.028-.739-1.748-1.793-1.748-1.221 0-1.94.916-1.94 1.863 0 .368.141.764.318.98a.127.127 0 01.029.123l-.119.486c-.019.077-.063.094-.145.057-.998-.465-1.622-1.927-1.622-3.101 0-2.522 1.833-4.839 5.286-4.839 2.775 0 4.932 1.978 4.932 4.619 0 2.756-1.737 4.97-4.145 4.97-.81 0-1.571-.421-1.832-.917l-.498 1.86c-.18.694-.667 1.563-.993 2.093.748.231 1.542.355 2.364.355 5.523 0 10-4.168 10-9.3C22 6.169 17.523 2 12 2z"/>
          </svg>
        )}
        Đăng nhập bằng LINE
      </button>

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

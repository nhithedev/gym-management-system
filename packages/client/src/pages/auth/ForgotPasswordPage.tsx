import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { authService } from '@/services/auth.service'

interface FormValues { email: string }

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const onSubmit = async ({ email }: FormValues) => {
    await authService.forgotPassword(email)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="mb-2 text-base font-medium text-on-surface">Kiểm tra email của bạn</p>
        <p className="mb-6 text-sm text-on-surface-variant">
          Nếu email tồn tại, chúng tôi đã gửi mã OTP để đặt lại mật khẩu.
        </p>
        <Link to="/reset-password" className="btn-primary inline-block">
          Nhập mã OTP
        </Link>
        <p className="mt-4 text-sm">
          <Link to="/login" className="text-primary hover:underline">
            Quay về đăng nhập
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-on-surface">Quên mật khẩu</h2>
      <p className="mb-6 text-sm text-on-surface-variant">Nhập email để nhận mã OTP đặt lại mật khẩu</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface">Email</label>
          <input
            type="email"
            placeholder="email@example.com"
            className="input-base"
            {...register('email', { required: 'Email là bắt buộc' })}
          />
          {errors.email && <p className="mt-1 text-xs text-error">{errors.email.message}</p>}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Gửi mã OTP
        </button>

        <p className="text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">Quay về đăng nhập</Link>
        </p>
      </form>
    </div>
  )
}

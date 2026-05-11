import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { authService } from '@/services/auth.service'

interface FormValues {
  email: string
  otp: string
  newPassword: string
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError('')
      await authService.resetPassword(data.email, data.otp, data.newPassword)
      navigate('/login', { replace: true, state: { message: 'Đặt lại mật khẩu thành công' } })
    } catch {
      setServerError('Mã OTP không đúng hoặc đã hết hạn')
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-on-surface">Đặt lại mật khẩu</h2>
      <p className="mb-6 text-sm text-on-surface-variant">Nhập mã OTP đã nhận và mật khẩu mới</p>

      {serverError && (
        <div className="mb-4 rounded-lg bg-error/20 p-3 text-sm text-error">{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface">Email</label>
          <input type="email" className="input-base" {...register('email', { required: true })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface">Mã OTP</label>
          <input
            type="text"
            placeholder="6 chữ số"
            maxLength={6}
            className="input-base tracking-widest"
            {...register('otp', { required: 'Mã OTP là bắt buộc', minLength: 6 })}
          />
          {errors.otp && <p className="mt-1 text-xs text-error">{errors.otp.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface">Mật khẩu mới</label>
          <input
            type="password"
            className="input-base"
            {...register('newPassword', {
              required: 'Mật khẩu là bắt buộc',
              minLength: { value: 8, message: 'Tối thiểu 8 ký tự' },
            })}
          />
          {errors.newPassword && (
            <p className="mt-1 text-xs text-error">{errors.newPassword.message}</p>
          )}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Đặt lại mật khẩu
        </button>

        <p className="text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">Quay về đăng nhập</Link>
        </p>
      </form>
    </div>
  )
}

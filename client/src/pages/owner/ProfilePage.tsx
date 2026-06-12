import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, LogOut, UserRound } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { authService } from '@/services/auth.service'
import { ownerService, type OwnerProfile } from '@/services/owner.service'
import { staffService, type StaffProfile, type StaffSchedule } from '@/services/staff.service'
import { useAuthStore } from '@/stores/authStore'
import {
  StaffErrorState,
  StaffPage,
  StaffPageHeader,
  StaffSkeleton,
  SubmitButton,
} from '@/components/StaffUI'

export default function OwnerProfilePage() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [fallbackProfile, setFallbackProfile] = useState<OwnerProfile | null>(null)
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    staffService
      .getMe()
      .then(async (data) => {
        setProfile(data)
        try {
          setSchedules(await staffService.getSchedules(data.staffId))
        } catch {
          // lich lam viec khong bat buoc
        }
      })
      .catch(async (err) => {
        try {
          setFallbackProfile(await ownerService.getMe())
        } catch {
          setError(getApiError(err, 'Không thể tải hồ sơ nhân viên.'))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    if (newPassword.length < 8) {
      setError('Mật khẩu mới cần ít nhất 8 ký tự.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess('')
    try {
      await authService.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Đổi mật khẩu thành công.')
    } catch (err) {
      setError(getApiError(err, 'Không thể đổi mật khẩu.'))
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const fullName = profile?.fullName ?? fallbackProfile?.fullName ?? user?.fullName ?? '--'
  const staffCode = profile?.staffCode ?? user?.staffId ?? '--'
  const email = profile?.email ?? fallbackProfile?.email ?? user?.email ?? '--'
  const phone = profile?.phone ?? fallbackProfile?.phone ?? user?.phone ?? 'Chưa cập nhật'
  const position = profile?.position ?? 'owner'

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Tài khoản"
        title="Hồ sơ nhân viên"
        description="Thông tin nhân sự và lịch làm việc của bạn."
      />
      {loading ? (
        <StaffSkeleton rows={5} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rogym-card rogym-card--compact p-6">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] text-[var(--rogym-teal)]">
              <UserRound size={23} />
            </div>
            <Info label="Họ tên" value={fullName} />
            <Info label="Mã nhân viên" value={staffCode} />
            <Info label="Email" value={email} />
            <Info label="Điện thoại" value={phone} />
            <Info label="Chức vụ" value={position} />
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white mt-6 text-red-200"
              onClick={logout}
            >
              <LogOut size={16} /> Đăng xuất
            </button>
          </section>

          <section className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-5 text-lg font-bold text-white">Đổi mật khẩu</h2>
            {error && <StaffErrorState message={error} />}
            {success && (
              <div className="mb-4 rounded-xl border border-green-400/20 bg-green-400/10 p-3 text-sm text-green-200">
                {success}
              </div>
            )}
            <form className="space-y-4" onSubmit={changePassword}>
              <PasswordField
                label="Mật khẩu hiện tại"
                value={currentPassword}
                onChange={setCurrentPassword}
              />
              <PasswordField label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} />
              <PasswordField
                label="Xác nhận mật khẩu"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
              <SubmitButton loading={saving}>
                <KeyRound size={16} /> Cập nhật mật khẩu
              </SubmitButton>
            </form>
          </section>

          <section className="rogym-card rogym-card--compact p-6 xl:col-span-2">
            <h2 className="mb-5 text-lg font-bold text-white">Lịch làm việc</h2>
            {schedules.length === 0 ? (
              <p className="text-sm text-[var(--rogym-text-secondary)]">
                Chưa có lịch làm việc được phân công.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.scheduleId}
                    className="rounded-xl border border-white/5 bg-white/[0.025] p-4"
                  >
                    <div className="font-semibold text-white">{formatDate(schedule.workDate)}</div>
                    <div className="mt-1 text-sm capitalize text-[var(--rogym-text-secondary)]">
                      {shiftLabel(schedule.shift)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </StaffPage>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-3 text-sm">
      <span className="text-[var(--rogym-text-dim)]">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="block space-y-2">
      <span className="rogym-field-label">{label}</span>
      <span className="relative block">
        <input
          className="rogym-input pr-11"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--rogym-text-dim)] transition-colors hover:text-white"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  )
}

function shiftLabel(shift: StaffSchedule['shift']) {
  return shift === 'morning' ? 'Ca sáng' : shift === 'afternoon' ? 'Ca chiều' : 'Ca tối'
}

import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, LogOut, UserRound } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { authService } from '@/services/auth.service'
import { staffService, type StaffProfile, type StaffSchedule } from '@/services/staff.service'
import { useAuthStore } from '@/stores/authStore'
import {
  SubmitButton,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
} from '@/components/TrainerUI'

export default function TrainerProfilePage() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [profile, setProfile] = useState<StaffProfile | null>(null)
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
        setSchedules(await staffService.getSchedules(data.staffId))
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải hồ sơ trainer.')))
      .finally(() => setLoading(false))
  }, [])

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      setError(
        newPassword !== confirmPassword
          ? 'Mật khẩu xác nhận không khớp.'
          : 'Mật khẩu mới cần ít nhất 8 ký tự.'
      )
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

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Tài khoản"
        title="Hồ sơ trainer"
        description="Thông tin nhân sự và lịch làm việc của bạn."
      />
      {loading ? (
        <TrainerSkeleton rows={5} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rogym-card rogym-card--compact p-6">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] text-[var(--rogym-teal)]">
              <UserRound size={23} />
            </div>
            <Info label="Họ tên" value={profile?.fullName ?? user?.fullName ?? '--'} />
            <Info label="Mã nhân viên" value={profile?.staffCode ?? '--'} />
            <Info label="Email" value={profile?.email ?? user?.email ?? '--'} />
            <Info label="Điện thoại" value={profile?.phone ?? 'Chưa cập nhật'} />
            <Info label="Chức vụ" value={profile?.position ?? 'trainer'} />
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
            {error && <TrainerErrorState message={error} />}
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    </TrainerPage>
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
  return (
    <label className="block space-y-2">
      <span className="rogym-field-label">{label}</span>
      <input
        className="rogym-input"
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  )
}

function shiftLabel(shift: StaffSchedule['shift']) {
  return shift === 'morning' ? 'Ca sáng' : shift === 'afternoon' ? 'Ca chiều' : 'Ca tối'
}

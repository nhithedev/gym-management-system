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
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerErrorState,
} from '@/components/OwnerUI'

const G = '#06c384'

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-white/5 last:border-0">
      <span className="text-[11px] font-medium uppercase tracking-widest rogym-text-secondary">
        {label}
      </span>
      <span className="text-sm font-medium text-white">
        {value || '—'}
      </span>
    </div>
  )
}

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoComplete: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label className="rogym-field-label mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rogym-input pr-11"
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rogym-text-dim transition-colors hover:text-white"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  )
}

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
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Hồ sơ"
        title="Tài khoản Owner"
        description="Quản lý thông tin cá nhân và bảo mật."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left */}
        <div className="space-y-5">
          <form onSubmit={handleSave} className="rogym-card rogym-card--compact p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Thông tin cá nhân</h2>
              {!isEditing && (
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white rogym-btn--nav"
                  onClick={() => setIsEditing(true)}
                >
                  Chỉnh sửa
                </button>
              )}
            </div>

            {saveError && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
                {saveError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="rogym-field-label mb-1.5 block">Họ tên</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rogym-input"
                    required
                  />
                ) : (
                  <p className="py-3 text-sm font-medium text-white">{profile?.fullName}</p>
                )}
              </div>
              <div>
                <label className="rogym-field-label mb-1.5 block">Email</label>
                <p className="py-3 text-sm rogym-text-secondary">{profile?.email}</p>
              </div>
              <div>
                <label className="rogym-field-label mb-1.5 block">Số điện thoại</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="rogym-input"
                    placeholder="0901234567"
                  />
                ) : (
                  <p className="py-3 text-sm text-white">{profile?.phone || '—'}</p>
                )}
              </div>
              <div>
                <label className="rogym-field-label mb-1.5 block">Vai trò</label>
                <p className="py-3 text-sm rogym-text-accent font-semibold">Owner</p>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white"
                  onClick={() => { setIsEditing(false); setEditName(profile?.fullName ?? ''); setEditPhone(profile?.phone ?? '') }}
                >
                  Hủy
                </button>
                <button type="submit" className="rogym-btn rogym-btn--primary" disabled={saving}>
                  {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Lưu
                </button>
              </div>
            )}
          </form>

          {/* Change password */}
          <div className="rogym-card rogym-card--compact p-6">
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white mt-6 text-red-200"
              onClick={logout}
            >
              <LogOut size={16} /> Đăng xuất
            </button>

            {pwOpen && (
              <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
                {pwError && (
                  <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
                    {pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div className="rounded-xl border border-green-400/20 bg-green-400/8 px-4 py-3 text-sm" style={{ color: G }}>
                    Đổi mật khẩu thành công!
                  </div>
                )}
                <PasswordInput
                  label="Mật khẩu cũ"
                  value={currentPw}
                  onChange={setCurrentPw}
                  placeholder="Nhập mật khẩu hiện tại"
                  autoComplete="current-password"
                />
                <PasswordInput
                  label="Mật khẩu mới"
                  value={newPw}
                  onChange={setNewPw}
                  placeholder="Ít nhất 8 ký tự"
                  autoComplete="new-password"
                />
                <PasswordInput
                  label="Xác nhận mật khẩu mới"
                  value={confirmPw}
                  onChange={setConfirmPw}
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                />
                <div className="flex justify-end gap-3">
                  <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={() => setPwOpen(false)}>Hủy</button>
                  <button type="submit" className="rogym-btn rogym-btn--primary" disabled={pwSaving}>
                    {pwSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Lock size={16} />} Đổi mật khẩu
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right: avatar */}
        <aside className="rogym-card rogym-card--compact p-6 flex flex-col items-center gap-4">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full"
            style={{ background: `${G}1a`, border: `3px solid ${G}44` }}
          >
            <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 36, color: G }}>{initials}</span>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white">{profile?.fullName}</h3>
            <p className="text-sm rogym-text-secondary">{profile?.email}</p>
          </div>
          <div className="w-full border-t border-white/5 pt-4 space-y-3">
            <InfoRow label="Vai trò" value="Owner" />
            <InfoRow label="Email" value={profile?.email ?? null} />
            <InfoRow label="Điện thoại" value={profile?.phone ?? null} />
          </div>
          <button
            className="w-full rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/16"
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </aside>
      </div>
    </OwnerPage>
  )
}

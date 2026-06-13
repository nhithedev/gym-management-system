import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Lock, LoaderCircle, LogOut, Save } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { authService } from '@/services/auth.service'
import { ownerService, type OwnerProfile } from '@/services/owner.service'
import { useAuthStore } from '@/stores/authStore'
import { OwnerPage, OwnerPageHeader, OwnerSkeleton, OwnerErrorState } from '@/components/OwnerUI'

const G = '#06c384'

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-white/5 last:border-0">
      <span className="text-[11px] font-medium uppercase tracking-widest rogym-text-secondary">
        {label}
      </span>
      <span className="text-sm font-medium text-white">{value || '—'}</span>
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
  const { clearAuth } = useAuthStore()
  const [profile, setProfile] = useState<OwnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    ownerService
      .getMe()
      .then((data) => {
        setProfile(data)
        setEditName(data.fullName)
        setEditPhone(data.phone ?? '')
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải hồ sơ.')))
      .finally(() => setLoading(false))
  }, [])

  const initials = profile?.fullName
    ? profile.fullName
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : '--'

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!editName.trim()) {
      setSaveError('Họ tên không được trống.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      setProfile((prev) =>
        prev ? { ...prev, fullName: editName.trim(), phone: editPhone.trim() || null } : prev
      )
      setIsEditing(false)
    } catch (err) {
      setSaveError(getApiError(err, 'Lưu thất bại.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    if (newPw.length < 8) {
      setPwError('Mật khẩu mới cần ít nhất 8 ký tự.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Mật khẩu xác nhận không khớp.')
      return
    }
    setPwSaving(true)
    setPwError(null)
    setPwSuccess(false)
    try {
      await authService.changePassword(currentPw, newPw)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setPwSuccess(true)
    } catch (err) {
      setPwError(getApiError(err, 'Không thể đổi mật khẩu.'))
    } finally {
      setPwSaving(false)
    }
  }

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const logout = handleLogout

  if (loading)
    return (
      <OwnerPage>
        <OwnerSkeleton rows={5} />
      </OwnerPage>
    )
  if (error)
    return (
      <OwnerPage>
        <OwnerErrorState message={error} />
      </OwnerPage>
    )

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
                  onClick={() => {
                    setIsEditing(false)
                    setEditName(profile?.fullName ?? '')
                    setEditPhone(profile?.phone ?? '')
                  }}
                >
                  Hủy
                </button>
                <button type="submit" className="rogym-btn rogym-btn--primary" disabled={saving}>
                  {saving ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}{' '}
                  Lưu
                </button>
              </div>
            )}
          </form>

          {/* Đổi mật khẩu & Đăng xuất */}
          <div className="rogym-card rogym-card--compact p-6">
            <div className="flex gap-3">
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                onClick={() => {
                  setPwOpen((v) => !v)
                  setPwError(null)
                  setPwSuccess(false)
                }}
              >
                <KeyRound size={16} /> Đổi mật khẩu
              </button>
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white text-red-200"
                onClick={logout}
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>

            {pwOpen && (
              <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
                {pwError && (
                  <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
                    {pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div
                    className="rounded-xl border border-green-400/20 bg-green-400/8 px-4 py-3 text-sm"
                    style={{ color: G }}
                  >
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
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--outline-white"
                    onClick={() => setPwOpen(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rogym-btn rogym-btn--primary"
                    disabled={pwSaving}
                  >
                    {pwSaving ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Lock size={16} />
                    )}{' '}
                    Đổi mật khẩu
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
            <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 36, color: G }}>
              {initials}
            </span>
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

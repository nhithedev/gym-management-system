import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { memberService, type MemberProfile } from '@/services/member.service'
import api from '@/services/api'
import {
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
  MemberErrorState,
} from './components/MemberUI'
import { DatePickerInput } from '@/components/DatePickerInput'

const G = '#06c384'
const T = '#42e09e' // used for member code badge

function fmtDate(iso: string | null) {
  if (!iso) return 'Chưa cập nhật'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-white/5 last:border-0">
      <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--rogym-text-secondary)]">
        {label}
      </span>
      <span
        className="text-sm"
        style={{
          color:
            value === 'Chưa cập nhật' || value === 'Chưa phân công'
              ? 'var(--rogym-text-secondary)'
              : '#fff',
        }}
      >
        {value}
      </span>
    </div>
  )
}

export default function MemberProfilePage() {
  const navigate = useNavigate()
  const { user, setAuth, clearAuth, token } = useAuthStore()

  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editPhone, setEditPhone] = useState('')
  const [editDob, setEditDob] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    const memberId = user?.memberId
    if (!memberId) {
      navigate('/login', { replace: true })
      return
    }
    memberService
      .getProfile(memberId)
      .then((data) => {
        setProfile(data)
        setLoading(false)
      })
      .catch((err) => {
        const status = err?.response?.status
        if (status === 401) {
          clearAuth()
          navigate('/login')
        } else if (status === 404) {
          navigate('/member', { replace: true })
        } else setError('Không thể tải thông tin hồ sơ.')
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.memberId])

  function startEdit() {
    if (!profile) return
    setEditPhone(profile.phone ?? '')
    setEditDob(profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '')
    setEditAddress(profile.address ?? '')
    setSaveError(null)
    setIsEditing(true)
  }

  async function handleSave() {
    if (!profile || !user?.memberId) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await memberService.updateProfile(user.memberId, {
        phone: editPhone || undefined,
        dateOfBirth: editDob || undefined,
        address: editAddress || undefined,
      })
      setProfile(updated)
      if (token) setAuth({ ...user, phone: updated.phone ?? user.phone }, token)
      setIsEditing(false)
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status
      if (status === 403) setSaveError('Bạn không có quyền thực hiện thao tác này.')
      else setSaveError('Lưu thất bại. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (newPw !== confirmPw) {
      setPwError('Mật khẩu xác nhận không khớp.')
      return
    }
    if (newPw.length < 8) {
      setPwError('Mật khẩu mới phải có ít nhất 8 ký tự.')
      return
    }
    setPwLoading(true)
    setPwError(null)
    setPwSuccess(false)
    try {
      await api.post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw })
      setPwSuccess(true)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status
      if (status === 401) setPwError('Mật khẩu hiện tại không đúng.')
      else setPwError('Đổi mật khẩu thất bại. Vui lòng thử lại.')
    } finally {
      setPwLoading(false)
    }
  }

  if (loading) {
    return (
      <MemberPage>
        <MemberPageHeader eyebrow="Tài khoản" title="Hồ sơ" />
        <MemberSkeleton rows={3} />
      </MemberPage>
    )
  }

  if (error) {
    return (
      <MemberPage>
        <MemberPageHeader eyebrow="Tài khoản" title="Hồ sơ" />
        <MemberErrorState message={error} onRetry={() => navigate('/member')} />
      </MemberPage>
    )
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Tài khoản"
        title="Hồ sơ"
        description="Xem và cập nhật thông tin cá nhân của bạn."
      />

      <div className="max-w-2xl space-y-5">
        {/* Profile header card */}
        <div className="rogym-card rogym-card--compact p-6 flex items-center gap-5">
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{ width: 80, height: 80, background: `${G}22`, border: `2px solid ${G}44` }}
          >
            <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 32, color: G }}>
              {(profile?.fullName ?? user?.fullName ?? 'M')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white">{profile?.fullName ?? user?.fullName}</h2>
            <p className="text-sm text-[var(--rogym-text-secondary)] mt-0.5">
              {profile?.email ?? user?.email}
            </p>
            {profile?.memberCode && (
              <span
                className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: `${G}18`, color: T, border: `1px solid ${G}33` }}
              >
                MC-{profile.memberCode}
              </span>
            )}
          </div>
          <button
            onClick={isEditing ? () => setIsEditing(false) : startEdit}
            className="rogym-btn rogym-btn--outline-white shrink-0 flex items-center gap-1.5"
          >
            {isEditing ? <X size={14} /> : <Pencil size={14} />}
            {isEditing ? 'Hủy' : 'Chỉnh sửa'}
          </button>
        </div>

        {/* Personal info */}
        <div className="rogym-card rogym-card--compact p-5">
          <h3 className="text-base font-bold text-white mb-3">Thông tin cá nhân</h3>
          {isEditing ? (
            <div className="flex flex-col gap-3 mt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium uppercase tracking-widest text-[var(--rogym-text-secondary)]">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="rogym-input"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium uppercase tracking-widest text-[var(--rogym-text-secondary)]">
                  Ngày sinh
                </label>
                <DatePickerInput
                  value={editDob}
                  onChange={setEditDob}
                  placeholder="Chọn ngày sinh"
                  max={new Date().toISOString().slice(0, 10)}
                  aria-label="Ngày sinh"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium uppercase tracking-widest text-[var(--rogym-text-secondary)]">
                  Địa chỉ
                </label>
                <textarea
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder="Địa chỉ của bạn"
                  className="rogym-input resize-none"
                />
              </div>
              {saveError && <p className="text-sm text-red-300">{saveError}</p>}
              <div className="flex gap-3 mt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rogym-btn rogym-btn--primary"
                  style={{ opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rogym-btn rogym-btn--outline-white"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <>
              <InfoRow label="Họ và tên" value={profile?.fullName ?? '—'} />
              <InfoRow label="Email" value={profile?.email ?? user?.email ?? '—'} />
              <InfoRow label="Số điện thoại" value={profile?.phone || 'Chưa cập nhật'} />
              <InfoRow label="Ngày sinh" value={fmtDate(profile?.dateOfBirth ?? null)} />
              <InfoRow label="Địa chỉ" value={profile?.address || 'Chưa cập nhật'} />
              <InfoRow label="HLV phụ trách" value={profile?.trainerName || 'Chưa phân công'} />
              <InfoRow label="Ngày tham gia" value={fmtDate(profile?.createdAt ?? null)} />
            </>
          )}
        </div>

        {/* Change password */}
        <div className="rogym-card rogym-card--compact overflow-hidden">
          <button
            onClick={() => {
              setPwOpen((v) => !v)
              setPwError(null)
              setPwSuccess(false)
            }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
          >
            <span className="text-base font-bold text-white">Đổi mật khẩu</span>
            {pwOpen ? (
              <ChevronUp size={18} className="text-[var(--rogym-text-secondary)]" />
            ) : (
              <ChevronDown size={18} className="text-[var(--rogym-text-secondary)]" />
            )}
          </button>

          {pwOpen && (
            <div className="px-5 pb-5 flex flex-col gap-3">
              {(['Mật khẩu hiện tại', 'Mật khẩu mới', 'Xác nhận mật khẩu mới'] as const).map(
                (lbl, i) => {
                  const vals = [currentPw, newPw, confirmPw]
                  const setters = [setCurrentPw, setNewPw, setConfirmPw]
                  return (
                    <div key={lbl} className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium uppercase tracking-widest text-[var(--rogym-text-secondary)]">
                        {lbl}
                      </label>
                      <input
                        type="password"
                        value={vals[i]}
                        onChange={(e) => setters[i](e.target.value)}
                        className="rogym-input"
                      />
                    </div>
                  )
                }
              )}
              {pwError && <p className="text-sm text-red-300">{pwError}</p>}
              {pwSuccess && (
                <p className="text-sm" style={{ color: G }}>
                  Mật khẩu đã được cập nhật.
                </p>
              )}
              <button
                onClick={handleChangePassword}
                disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                className="rogym-btn rogym-btn--primary self-start mt-1"
                style={{ opacity: pwLoading || !currentPw || !newPw || !confirmPw ? 0.5 : 1 }}
              >
                {pwLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          )}
        </div>
      </div>
    </MemberPage>
  )
}

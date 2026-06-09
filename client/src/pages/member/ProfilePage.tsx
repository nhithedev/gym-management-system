import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { memberService, type MemberProfile } from '@/services/member.service'
import api from '@/services/api'

const G = '#06c384'
const T = '#42e09e'
const BG_CARD = '#0f1c16'

function fmtDate(iso: string | null) {
  if (!iso) return 'Chưa cập nhật'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 11, color: '#bbcabf', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: value === 'Chưa cập nhật' || value === 'Chưa phân công' ? '#bbcabf' : '#fff' }}>
        {value}
      </span>
    </div>
  )
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="p-5 rounded-2xl flex flex-col gap-1" style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: '#fff', letterSpacing: '0.04em' }}>{title}</span>
        {action}
      </div>
      {children}
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
    if (!memberId) { navigate('/login', { replace: true }); return }

    memberService
      .getProfile(memberId)
      .then((data) => { setProfile(data); setLoading(false) })
      .catch((err) => {
        const status = err?.response?.status
        if (status === 401) { clearAuth(); navigate('/login') }
        else if (status === 404) { navigate('/member', { replace: true }) }
        else setError('Không thể tải thông tin hồ sơ.')
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
      // sync fullName change to auth store if needed
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
    if (newPw !== confirmPw) { setPwError('Mật khẩu xác nhận không khớp.'); return }
    if (newPw.length < 8) { setPwError('Mật khẩu mới phải có ít nhất 8 ký tự.'); return }
    setPwLoading(true)
    setPwError(null)
    setPwSuccess(false)
    try {
      await api.post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw })
      setPwSuccess(true)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
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
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl" style={{ height: 120, background: `${BG_CARD}99` }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", color: '#f87171', fontSize: 14 }}>{error}</p>
        <button
          onClick={() => navigate('/member')}
          className="rogym-btn--primary px-5 py-2 rounded-full text-sm font-semibold"
          style={{ background: G, color: '#000', fontFamily: "'Be Vietnam Pro',sans-serif" }}
        >
          Về Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">

      {/* Profile header card */}
      <div className="p-6 rounded-[40px] flex items-center gap-5" style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{ width: 80, height: 80, background: `${G}22`, border: `2px solid ${G}44` }}
        >
          <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 32, color: G }}>
            {(profile?.fullName ?? user?.fullName ?? 'M')[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, color: '#fff', letterSpacing: '0.04em' }}>
            {profile?.fullName ?? user?.fullName}
          </h1>
          <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: '#bbcabf', marginTop: 2 }}>
            {profile?.email ?? user?.email}
          </p>
          {profile?.memberCode && (
            <span
              className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: `${G}18`, color: T, border: `1px solid ${G}33`, fontFamily: "'Be Vietnam Pro',sans-serif" }}
            >
              MC-{profile.memberCode}
            </span>
          )}
        </div>
        <button
          onClick={isEditing ? () => setIsEditing(false) : startEdit}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0"
          style={{ background: isEditing ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', fontFamily: "'Be Vietnam Pro',sans-serif" }}
        >
          {isEditing ? <X size={14} /> : <Pencil size={14} />}
          {isEditing ? 'Hủy' : 'Chỉnh sửa'}
        </button>
      </div>

      {/* Personal info */}
      <SectionCard title="Thông tin cá nhân">
        {isEditing ? (
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex flex-col gap-1">
              <label style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 11, color: '#bbcabf', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Số điện thoại
              </label>
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="0912 345 678"
                className="rounded-xl px-4 py-2.5 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1.5px solid rgba(255,255,255,0.12)`, color: '#fff', fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14 }}
                onFocus={(e) => { e.currentTarget.style.border = `1.5px solid ${T}` }}
                onBlur={(e) => { e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.12)' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 11, color: '#bbcabf', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ngày sinh
              </label>
              <input
                type="date"
                value={editDob}
                onChange={(e) => setEditDob(e.target.value)}
                className="rounded-xl px-4 py-2.5 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, colorScheme: 'dark' }}
                onFocus={(e) => { e.currentTarget.style.border = `1.5px solid ${T}` }}
                onBlur={(e) => { e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.12)' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 11, color: '#bbcabf', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Địa chỉ
              </label>
              <textarea
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Địa chỉ của bạn"
                className="rounded-xl px-4 py-2.5 outline-none transition-all resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14 }}
                onFocus={(e) => { e.currentTarget.style.border = `1.5px solid ${T}` }}
                onBlur={(e) => { e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.12)' }}
              />
            </div>
            {saveError && (
              <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: '#f87171' }}>{saveError}</p>
            )}
            <div className="flex gap-3 mt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rogym-btn--primary px-5 py-2 rounded-full text-sm font-semibold"
                style={{ background: G, color: '#000', fontFamily: "'Be Vietnam Pro',sans-serif", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-5 py-2 rounded-full text-sm font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontFamily: "'Be Vietnam Pro',sans-serif" }}
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
      </SectionCard>

      {/* Change password */}
      <div className="rounded-2xl overflow-hidden" style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => { setPwOpen((v) => !v); setPwError(null); setPwSuccess(false) }}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: '#fff', letterSpacing: '0.04em' }}>Đổi mật khẩu</span>
          {pwOpen ? <ChevronUp size={18} color="#bbcabf" /> : <ChevronDown size={18} color="#bbcabf" />}
        </button>

        {pwOpen && (
          <div className="px-5 pb-5 flex flex-col gap-3">
            {(['Mật khẩu hiện tại', 'Mật khẩu mới', 'Xác nhận mật khẩu mới'] as const).map((lbl, i) => {
              const vals = [currentPw, newPw, confirmPw]
              const setters = [setCurrentPw, setNewPw, setConfirmPw]
              return (
                <div key={lbl} className="flex flex-col gap-1">
                  <label style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 11, color: '#bbcabf', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {lbl}
                  </label>
                  <input
                    type="password"
                    value={vals[i]}
                    onChange={(e) => setters[i](e.target.value)}
                    className="rounded-xl px-4 py-2.5 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14 }}
                    onFocus={(e) => { e.currentTarget.style.border = `1.5px solid ${T}` }}
                    onBlur={(e) => { e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.12)' }}
                  />
                </div>
              )
            })}
            {pwError && <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: '#f87171' }}>{pwError}</p>}
            {pwSuccess && <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: G }}>Mật khẩu đã được cập nhật.</p>}
            <button
              onClick={handleChangePassword}
              disabled={pwLoading || !currentPw || !newPw || !confirmPw}
              className="rogym-btn--primary self-start px-5 py-2 rounded-full text-sm font-semibold mt-1"
              style={{ background: G, color: '#000', fontFamily: "'Be Vietnam Pro',sans-serif", opacity: (pwLoading || !currentPw || !newPw || !confirmPw) ? 0.5 : 1 }}
            >
              {pwLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

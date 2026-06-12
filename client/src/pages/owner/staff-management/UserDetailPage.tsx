import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, LoaderCircle, X } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { type StaffPosition,staffService, type StaffProfile, type StaffSchedule, type CreateStaffDto } from '@/services/staff.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerBadge,
} from '@/components/OwnerUI'

const G = '#06c384'

const POSITION_COLOR: Record<string, string> = {
  staff: '#3b82f6', trainer: '#8b5cf6', owner: '#f59e0b', member: '#06c384',
}
const SHIFT_LABEL: Record<string, string> = {
  morning: 'Ca sáng', afternoon: 'Ca chiều', evening: 'Ca tối',
}

export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [staff, setStaff] = useState<StaffProfile | null>(null)
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<CreateStaffDto>({
    email: '', fullName: '', phone: '', position: 'staff',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (isNew) { setLoading(false); return }
    staffService.get(id!)
      .then((s) => {
        setStaff(s)
        setForm({ email: s.email, fullName: s.fullName, phone: s.phone ?? '', position: s.position })
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải thông tin nhân viên.')))
      .finally(() => setLoading(false))

    staffService.getSchedules(id!)
      .then(setSchedules)
      .catch(() => {})
  }, [id, isNew])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.fullName) { setSaveError('Vui lòng điền đầy đủ thông tin.'); return }
    setSaving(true)
    setSaveError(null)
    try {
      if (isNew) {
        const created = await staffService.create(form)
        navigate(`/owner/staff/${created.staffId}`, { replace: true })
      } else {
        const updated = await staffService.update(id!, {
          fullName: form.fullName,
          phone: form.phone || null,
          position: form.position,
        })
        setStaff(updated)
      }
    } catch (err) {
      setSaveError(getApiError(err, 'Lưu thất bại.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await staffService.delete(id!)
      navigate('/owner/staff', { replace: true })
    } catch (err) {
      setError(getApiError(err, 'Xóa thất bại.'))
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) return <OwnerPage><OwnerSkeleton rows={4} /></OwnerPage>
  if (error) return <OwnerPage><OwnerErrorState message={error} onRetry={() => window.location.reload()} /></OwnerPage>

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Nhân sự"
        title={isNew ? 'Thêm nhân viên mới' : (staff?.fullName ?? 'Chi tiết nhân viên')}
        description={isNew ? 'Tạo tài khoản và hồ sơ nhân viên mới.' : `Mã: ${staff?.staffCode}`}
        actions={
          !isNew && staff ? (
            <Link className="rogym-btn rogym-btn--outline-white" to="/owner/staff">
              <ArrowLeft size={16} /> Quay lại danh sách
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: Form / Info */}
        <div className="space-y-6">
          <form onSubmit={handleSave} className="rogym-card rogym-card--compact p-6 space-y-5">
            <h2 className="text-base font-bold text-white">
              {isNew ? 'Thông tin nhân viên mới' : 'Chỉnh sửa thông tin'}
            </h2>

            {saveError && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
                {saveError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="rogym-field-label mb-1.5 block">Họ tên *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="rogym-input"
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>
              <div>
                <label className="rogym-field-label mb-1.5 block">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="rogym-input"
                  placeholder="nva@gym.local"
                  required
                  disabled={!isNew}
                />
              </div>
              <div>
                <label className="rogym-field-label mb-1.5 block">Số điện thoại</label>
                <input
                  type="tel"
                  value={form.phone ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="rogym-input"
                  placeholder="0901234567"
                />
              </div>
              <div>
                <label className="rogym-field-label mb-1.5 block">Vị trí *</label>
                <select
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value as StaffPosition }))}
                  className="rogym-select"
                >
                  <option value="staff">staff</option>
                  <option value="trainer">trainer</option>
                  <option value="owner">owner</option>
                  <option value="member">member</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {isNew ? (
                <Link className="rogym-btn rogym-btn--outline-white" to="/owner/staff">Hủy</Link>
              ) : null}
              <button
                type="submit"
                className="rogym-btn rogym-btn--primary"
                disabled={saving}
              >
                {saving && <LoaderCircle size={16} className="animate-spin" />}
                <Save size={16} /> {isNew ? 'Tạo nhân viên' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>

          {/* Schedule */}
          {!isNew && (
            <div className="rogym-card rogym-card--compact p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Lịch làm việc</h2>
              </div>
              {schedules.length === 0 ? (
                <OwnerEmptyState title="Chưa có lịch làm việc" description="Nhân viên chưa được gán ca làm việc." />
              ) : (
                <div className="space-y-2">
                  {schedules.map((s) => (
                    <div
                      key={s.scheduleId}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">{formatDate(s.workDate)}</div>
                        <div className="text-xs rogym-text-dim">
                          {SHIFT_LABEL[s.shift] ?? s.shift}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Info card */}
        {!isNew && staff && (
          <aside className="space-y-5">
            <div className="rogym-card rogym-card--compact p-6">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: `${G}1a`, border: `2px solid ${G}44` }}
              >
                <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, color: G }}>
                  {staff.fullName.split(' ').map((w) => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{staff.fullName}</h3>
              <p className="text-sm rogym-text-secondary">{staff.email}</p>
              {staff.phone && <p className="text-sm rogym-text-dim">{staff.phone}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <OwnerBadge
                  label={staff.position}
                  color={POSITION_COLOR[staff.position] ?? '#6b7280'}
                />
                <OwnerBadge
                  label={staff.status === 'active' ? 'Hoạt động' : 'Chờ xác thực'}
                  color={staff.status === 'active' ? '#22c55e' : '#f59e0b'}
                />
              </div>
            </div>

            {/* Delete */}
            <div className="rogym-card rogym-card--compact p-6">
              <h3 className="mb-3 text-sm font-semibold text-white">Hành động</h3>
              {!showDeleteConfirm ? (
                <button
                  className="rogym-btn rogym-btn--danger w-full"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <X size={16} /> Cho thôi việc
                </button>
              ) : (
                <div
                  className="space-y-3 rounded-xl p-4"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <p className="text-sm" style={{ color: '#fca5a5' }}>
                    Xác nhận cho nhân viên này thôi việc? Hành động không thể hoàn tác.
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 rounded-lg px-3 py-2 text-sm font-medium"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--rogym-text-secondary)' }}
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Hủy
                    </button>
                    <button
                      className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white"
                      style={{ background: '#ef4444' }}
                      disabled={deleting}
                      onClick={handleDelete}
                    >
                      {deleting && <LoaderCircle size={14} className="animate-spin" />}{' '}
                      Xác nhận
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </OwnerPage>
  )
}

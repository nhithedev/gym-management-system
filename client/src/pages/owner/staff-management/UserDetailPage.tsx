import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, Trash2, Plus, X, AlertCircle, CalendarDays, CheckCircle2,
} from 'lucide-react'
import { staffService, type StaffProfile, type StaffSchedule } from '@/services/staff.service'
import { Page } from '@/components/shared/PageUI'
import { formatDate } from '@/lib/date'

const G = '#06c384'
const T = '#42e09e'

const SHIFT_LABEL: Record<string, string> = {
  morning: 'Ca sáng (06:00–14:00)',
  afternoon: 'Ca chiều (14:00–22:00)',
  evening: 'Ca tối (18:00–23:00)',
}

const SHIFT_COLOR: Record<string, string> = {
  morning: '#f59e0b',
  afternoon: '#3b82f6',
  evening: '#8b5cf6',
}

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

function nextNDays(n: number): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 1; i <= n; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    days.push(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d))
  }
  return days
}

interface DeleteConfirmProps {
  name: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function DeleteConfirm({ name, onConfirm, onCancel, loading }: DeleteConfirmProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    >
      <div className="rogym-card w-full max-w-sm p-6" style={{ background: '#0f1c16' }}>
        <h2 className="text-base font-bold text-white mb-2">Xoá nhân sự?</h2>
        <p className="text-sm text-[var(--rogym-text-secondary)] mb-5">
          Tài khoản của <strong className="text-white">{name}</strong> sẽ bị xoá mềm và không thể đăng nhập.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="rogym-btn rogym-btn--outline-white px-4 py-2 text-sm">Huỷ</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rogym-btn px-4 py-2 text-sm disabled:opacity-50"
            style={{ background: '#ef4444', color: '#fff' }}
          >
            {loading ? 'Đang xoá...' : 'Xác nhận xoá'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AddScheduleModalProps {
  staffId: string
  onClose: () => void
  onAdded: (schedules: StaffSchedule[]) => void
}

function AddScheduleModal({ staffId, onClose, onAdded }: AddScheduleModalProps) {
  const days = nextNDays(14)
  const shifts = ['morning', 'afternoon', 'evening'] as const
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function toggle(date: string, shift: string) {
    const key = `${date}|${shift}`
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSave() {
    if (selected.size === 0) {
      setErr('Chọn ít nhất một ca làm việc.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const schedules = Array.from(selected).map(k => {
        const [workDate, shift] = k.split('|')
        return { workDate, shift: shift as 'morning' | 'afternoon' | 'evening' }
      })
      const result = await staffService.createSchedules(staffId, schedules)
      onAdded(result.schedules)
    } catch (e: unknown) {
      const apiErr = (e as { response?: { data?: { message?: string; details?: { conflicts?: unknown[] } } } }).response?.data
      if (apiErr?.details?.conflicts) {
        setErr(`Xung đột lịch — một số ca đã tồn tại. Vui lòng bỏ chọn ca bị xung đột.`)
      } else {
        setErr(apiErr?.message ?? 'Không thể thêm lịch.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rogym-card w-full max-w-2xl p-6 flex flex-col gap-4" style={{ background: '#0f1c16', maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Thêm lịch làm việc</h2>
          <button onClick={onClose} className="text-[var(--rogym-text-muted)] hover:text-white">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-[var(--rogym-text-muted)]">Chọn ca làm việc trong 14 ngày tới. Bấm vào ô để chọn/bỏ chọn.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left px-2 py-2 text-[var(--rogym-text-muted)] font-medium w-24">Ngày</th>
                {shifts.map(s => (
                  <th key={s} className="px-2 py-2 text-center font-medium" style={{ color: SHIFT_COLOR[s] }}>
                    {s === 'morning' ? 'Sáng' : s === 'afternoon' ? 'Chiều' : 'Tối'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(date => (
                <tr key={date} className="border-t border-white/[0.04]">
                  <td className="px-2 py-2 text-white font-mono">{date}</td>
                  {shifts.map(shift => {
                    const key = `${date}|${shift}`
                    const active = selected.has(key)
                    return (
                      <td key={shift} className="px-2 py-2 text-center">
                        <button
                          onClick={() => toggle(date, shift)}
                          className="w-8 h-8 rounded-lg text-xs font-bold transition-colors mx-auto block"
                          style={active
                            ? { background: SHIFT_COLOR[shift], color: '#fff' }
                            : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
                        >
                          {active ? '✓' : '+'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected.size > 0 && (
          <p className="text-xs" style={{ color: T }}>
            Đã chọn {selected.size} ca
          </p>
        )}

        {err && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-300">{err}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="rogym-btn rogym-btn--outline-white px-4 py-2 text-sm">Huỷ</button>
          <button
            onClick={handleSave}
            disabled={saving || selected.size === 0}
            className="rogym-btn rogym-btn--primary px-5 py-2 text-sm disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : `Lưu ${selected.size > 0 ? `(${selected.size} ca)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ fullName: '', phone: '', position: '' })
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showAddSchedule, setShowAddSchedule] = useState(false)

  const today = todayISO()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      staffService.getById(id),
      staffService.getSchedules(id),
    ])
      .then(([p, s]) => {
        setProfile(p)
        setSchedules(s.filter(x => x.workDate >= today))
        setEditForm({ fullName: p.fullName, phone: p.phone ?? '', position: p.position })
      })
      .catch(() => setError('Không thể tải thông tin nhân sự.'))
      .finally(() => setLoading(false))
  }, [id, today])

  async function handleSave() {
    if (!id || !profile) return
    setSaving(true)
    setSaveErr(null)
    setSaveOk(false)
    try {
      const updated = await staffService.update(id, {
        fullName: editForm.fullName.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        position: editForm.position || undefined,
      })
      setProfile(updated)
      setEditing(false)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch (e: unknown) {
      setSaveErr((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Lưu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    try {
      await staffService.delete(id)
      navigate('/owner/staff')
    } catch {
      setDeleting(false)
      setShowDelete(false)
    }
  }

  function handleScheduleAdded(newSchedules: StaffSchedule[]) {
    setSchedules(prev => {
      const existing = new Set(prev.map(s => `${s.workDate}|${s.shift}`))
      const fresh = newSchedules.filter(s => !existing.has(`${s.workDate}|${s.shift}`))
      return [...prev, ...fresh].sort((a, b) => a.workDate.localeCompare(b.workDate) || a.shift.localeCompare(b.shift))
    })
    setShowAddSchedule(false)
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!id) return
    try {
      await staffService.deleteSchedule(id, scheduleId)
      setSchedules(prev => prev.filter(s => s.scheduleId !== scheduleId))
    } catch {
      // show nothing — schedule stays in list
    }
  }

  if (loading) {
    return (
      <Page>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
          ))}
        </div>
      </Page>
    )
  }

  if (error || !profile) {
    return (
      <Page>
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error ?? 'Không tìm thấy nhân sự.'}</p>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      {/* Back */}
      <button
        onClick={() => navigate('/owner/staff')}
        className="flex items-center gap-2 text-sm text-[var(--rogym-text-muted)] hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Danh sách nhân sự
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[var(--rogym-border-section)] pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
            style={{ background: `${G}1a`, border: `2px solid ${G}44` }}
          >
            <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, color: G }}>
              {profile.fullName.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-xs text-[var(--rogym-text-muted)] mb-1 rogym-eyebrow">Nhân sự · {profile.staffCode}</p>
            <h1 className="text-2xl font-bold text-white">{profile.fullName}</h1>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setEditing(!editing); setSaveErr(null) }}
            className="rogym-btn rogym-btn--outline-white px-4 py-2 text-sm"
          >
            {editing ? 'Huỷ chỉnh sửa' : 'Chỉnh sửa'}
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="rogym-btn px-4 py-2 text-sm"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <Trash2 size={14} className="inline mr-1.5" />
            Xoá
          </button>
        </div>
      </div>

      {saveOk && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: `${G}15`, border: `1px solid ${G}44` }}>
          <CheckCircle2 size={14} style={{ color: G }} />
          <p className="text-xs" style={{ color: G }}>Đã lưu thay đổi.</p>
        </div>
      )}

      {/* Info card */}
      <div className="rogym-card rogym-card--compact p-5">
        <div className="rogym-eyebrow mb-4">Thông tin nhân sự</div>
        {editing ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--rogym-text-muted)] mb-1">Họ và tên</label>
              <input
                className="input-base w-full"
                value={editForm.fullName}
                onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--rogym-text-muted)] mb-1">Số điện thoại</label>
              <input
                className="input-base w-full"
                value={editForm.phone}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--rogym-text-muted)] mb-1">Vị trí</label>
              <select
                className="input-base w-full"
                value={editForm.position}
                onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))}
              >
                <option value="staff">Nhân viên (Staff)</option>
                <option value="trainer">Huấn luyện viên (Trainer)</option>
                <option value="owner">Chủ phòng (Owner)</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              {saveErr && (
                <span className="text-xs text-red-400 flex-1">{saveErr}</span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="rogym-btn rogym-btn--primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50 ml-auto"
              >
                <Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            {[
              { label: 'Họ và tên', value: profile.fullName },
              { label: 'Email', value: profile.email },
              { label: 'Điện thoại', value: profile.phone ?? 'Chưa có' },
              { label: 'Vị trí', value: profile.position },
              { label: 'Mã nhân viên', value: profile.staffCode },
              { label: 'Trạng thái', value: profile.status ?? 'active' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-[var(--rogym-text-muted)]">{label}</p>
                <p className="text-sm font-medium text-white mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedules */}
      <div className="rogym-card rogym-card--compact p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="rogym-eyebrow">Lịch làm việc sắp tới</div>
          <button
            onClick={() => setShowAddSchedule(true)}
            className="rogym-btn rogym-btn--primary flex items-center gap-2 px-3 py-1.5 text-xs"
          >
            <Plus size={13} /> Thêm lịch
          </button>
        </div>

        {schedules.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarDays size={28} className="text-[var(--rogym-text-dim)]" />
            <p className="text-sm text-[var(--rogym-text-secondary)]">Chưa có lịch làm việc sắp tới.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {schedules.map(s => (
              <div
                key={s.scheduleId}
                className="flex items-center justify-between rounded-xl px-4 py-2.5"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ background: `${SHIFT_COLOR[s.shift]}22`, color: SHIFT_COLOR[s.shift] }}
                  >
                    {s.shift === 'morning' ? 'Sáng' : s.shift === 'afternoon' ? 'Chiều' : 'Tối'}
                  </span>
                  <span className="text-sm text-white">{formatDate(s.workDate)}</span>
                  <span className="text-xs text-[var(--rogym-text-muted)]">
                    {SHIFT_LABEL[s.shift]?.split('(')[1]?.replace(')', '') ?? ''}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteSchedule(s.scheduleId)}
                  className="text-[var(--rogym-text-dim)] hover:text-red-400 transition-colors"
                  title="Xoá lịch này"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDelete && (
        <DeleteConfirm
          name={profile.fullName}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          loading={deleting}
        />
      )}

      {showAddSchedule && id && (
        <AddScheduleModal
          staffId={id}
          onClose={() => setShowAddSchedule(false)}
          onAdded={handleScheduleAdded}
        />
      )}
    </Page>
  )
}

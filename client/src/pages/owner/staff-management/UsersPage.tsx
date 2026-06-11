import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight, ChevronLeft, AlertCircle, X } from 'lucide-react'
import { staffService, type StaffProfile, type CreateStaffDto } from '@/services/staff.service'
import { Page, PageHeader, PageSkeleton } from '@/components/shared/PageUI'

const G = '#06c384'

const POSITION_MAP: Record<string, { label: string; color: string }> = {
  owner:   { label: 'Chủ phòng',  color: '#8b5cf6' },
  staff:   { label: 'Nhân viên',  color: '#3b82f6' },
  trainer: { label: 'HLV',        color: G },
  pt:      { label: 'PT',         color: '#f59e0b' },
}

function PosBadge({ position }: { position: string }) {
  const p = POSITION_MAP[position] ?? { label: position, color: '#6b7280' }
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}44` }}>
      {p.label}
    </span>
  )
}

function StatusDot({ status }: { status?: string }) {
  const active = !status || status === 'active'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: active ? G : '#6b7280' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? G : '#6b7280', display: 'inline-block' }} />
      {active ? 'Hoạt động' : status}
    </span>
  )
}

const PAGE_SIZE = 20

interface CreateModalProps {
  onClose: () => void
  onCreated: (s: StaffProfile) => void
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState<CreateStaffDto>({
    email: '',
    fullName: '',
    phone: '',
    position: 'staff',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function field(k: keyof CreateStaffDto, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim() || !form.fullName.trim()) {
      setErr('Email và họ tên là bắt buộc.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const dto: CreateStaffDto = {
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        position: form.position,
        ...(form.phone?.trim() ? { phone: form.phone.trim() } : {}),
      }
      const result = await staffService.create(dto)
      onCreated(result)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message
      setErr(msg ?? 'Tạo nhân sự thất bại.')
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
      <div className="rogym-card w-full max-w-md p-6" style={{ background: '#0f1c16' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Thêm nhân sự mới</h2>
          <button onClick={onClose} className="text-[var(--rogym-text-muted)] hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--rogym-text-muted)] mb-1">Email *</label>
            <input className="input-base w-full" type="email" value={form.email} onChange={e => field('email', e.target.value)} placeholder="vd: nguyen.van.a@gym.local" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--rogym-text-muted)] mb-1">Họ và tên *</label>
            <input className="input-base w-full" value={form.fullName} onChange={e => field('fullName', e.target.value)} placeholder="Nguyễn Văn A" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--rogym-text-muted)] mb-1">Số điện thoại</label>
            <input className="input-base w-full" value={form.phone ?? ''} onChange={e => field('phone', e.target.value)} placeholder="0901234567" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--rogym-text-muted)] mb-1">Vị trí *</label>
            <select className="input-base w-full" value={form.position} onChange={e => field('position', e.target.value)}>
              <option value="staff">Nhân viên (Staff)</option>
              <option value="trainer">Huấn luyện viên (Trainer)</option>
            </select>
          </div>

          {err && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-300">{err}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end mt-1">
            <button type="button" onClick={onClose} className="rogym-btn rogym-btn--outline-white px-4 py-2 text-sm">Huỷ</button>
            <button type="submit" disabled={saving} className="rogym-btn rogym-btn--primary px-5 py-2 text-sm disabled:opacity-50">
              {saving ? 'Đang tạo...' : 'Tạo nhân sự'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function StaffManagementPage() {
  const navigate = useNavigate()
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback((p: number, s: string, pos: string) => {
    setLoading(true)
    setError(null)
    staffService.list({
      page: p,
      pageSize: PAGE_SIZE,
      search: s || undefined,
      position: pos || undefined,
    })
      .then(res => {
        setStaff(res.data)
        setTotal(res.total)
        setTotalPages(res.totalPages)
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string }; status?: number } }).response?.data?.message
        const status = (err as { response?: { status?: number } }).response?.status
        if (status === 403) setError('Tài khoản không có quyền xem danh sách nhân sự (staff.read).')
        else setError(msg ?? 'Không thể tải danh sách nhân sự. Kiểm tra kết nối đến server.')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(1, '', '') }, [load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    load(1, search, posFilter)
  }

  function handlePosChange(pos: string) {
    setPosFilter(pos)
    setPage(1)
    load(1, search, pos)
  }

  function goPage(p: number) {
    setPage(p)
    load(p, search, posFilter)
  }

  function handleCreated(s: StaffProfile) {
    setShowCreate(false)
    load(1, search, posFilter)
    navigate(`/owner/staff/${s.staffId}`)
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Quản lý"
        title="Nhân sự"
        description={`${total} nhân sự trong hệ thống`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="rogym-btn rogym-btn--primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={15} /> Thêm nhân sự
          </button>
        }
      />

      {/* Search + filter */}
      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--rogym-text-muted)]" />
          <input
            className="input-base pl-9"
            placeholder="Tìm theo tên, email, mã NV..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-base w-auto min-w-[160px]"
          value={posFilter}
          onChange={e => handlePosChange(e.target.value)}
        >
          <option value="">Tất cả vị trí</option>
          <option value="staff">Nhân viên</option>
          <option value="trainer">Huấn luyện viên</option>
        </select>
        <button type="submit" className="rogym-btn rogym-btn--primary px-5">Tìm kiếm</button>
      </form>

      {/* Table */}
      {loading ? (
        <PageSkeleton rows={8} />
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="rogym-card rogym-card--compact flex min-h-48 flex-col items-center justify-center p-8 text-center">
          <h2 className="text-base font-semibold text-white">Không tìm thấy nhân sự</h2>
          <p className="mt-2 text-sm text-[var(--rogym-text-secondary)]">Thử thay đổi điều kiện tìm kiếm hoặc thêm nhân sự mới.</p>
        </div>
      ) : (
        <div className="rogym-card rogym-card--compact overflow-hidden p-0">
          {/* Header row */}
          <div
            className="grid items-center gap-3 px-5 py-3 text-xs font-semibold uppercase text-[var(--rogym-text-muted)] border-b border-[var(--rogym-border-section)]"
            style={{ gridTemplateColumns: '1fr 1.2fr 0.8fr 0.8fr 0.7fr auto' }}
          >
            <span>Tên</span>
            <span>Email</span>
            <span>Mã NV</span>
            <span>Vị trí</span>
            <span>Trạng thái</span>
            <span />
          </div>

          {staff.map((s, i) => (
            <div
              key={s.staffId}
              onClick={() => navigate(`/owner/staff/${s.staffId}`)}
              className="grid items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
              style={{
                gridTemplateColumns: '1fr 1.2fr 0.8fr 0.8fr 0.7fr auto',
                borderBottom: i < staff.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: `${G}1a`, color: G }}
                >
                  {s.fullName.split(' ').slice(-1)[0]?.[0]?.toUpperCase() ?? '?'}
                </div>
                <p className="text-sm font-medium text-white truncate">{s.fullName}</p>
              </div>
              <p className="text-sm text-[var(--rogym-text-secondary)] truncate">{s.email}</p>
              <p className="text-xs font-mono text-[var(--rogym-text-muted)]">{s.staffCode}</p>
              <PosBadge position={s.position} />
              <StatusDot status={s.status} />
              <ChevronRight size={16} className="text-[var(--rogym-text-dim)]" />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--rogym-text-muted)]">
            Trang {page}/{totalPages} · {total} nhân sự
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
              className="rogym-btn rogym-btn--outline-white flex items-center gap-1 px-3 py-2 text-sm disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
              className="rogym-btn rogym-btn--outline-white flex items-center gap-1 px-3 py-2 text-sm disabled:opacity-40"
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </Page>
  )
}

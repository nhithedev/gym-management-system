import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import { StaffPage, StaffPageHeader, StaffSkeleton, StaffEmptyState } from '../components/StaffUI'
import { formatDate } from '@/lib/date'

const G = '#06c384'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active:   { label: 'Hoạt động', color: G },
  inactive: { label: 'Không hoạt động', color: '#6b7280' },
  banned:   { label: 'Bị khoá', color: '#ef4444' },
}

function Badge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: '#6b7280' }
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: "'Be Vietnam Pro',sans-serif", background: `${s.color}22`, color: s.color, border: `1px solid ${s.color}44` }}>
      {s.label}
    </span>
  )
}

function SubBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    active:   { label: 'Còn hiệu lực', color: G },
    pending:  { label: 'Chờ kích hoạt', color: '#f59e0b' },
    expired:  { label: 'Hết hạn', color: '#ef4444' },
    cancelled:{ label: 'Đã huỷ', color: '#6b7280' },
  }
  const s = map[status] ?? { label: status, color: '#6b7280' }
  return (
    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, fontWeight: 600, background: `${s.color}22`, color: s.color, border: `1px solid ${s.color}33` }}>
      {s.label}
    </span>
  )
}

const PAGE_SIZE = 15

export default function StaffMembersPage() {
  const navigate = useNavigate()
  const [members, setMembers] = useState<TrainerStudentSummary[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((p: number, s: string, st: string) => {
    setLoading(true)
    setError(null)
    memberService.list({ page: p, pageSize: PAGE_SIZE, search: s || undefined, status: st || undefined })
      .then(res => {
        setMembers(res.data ?? [])
        setTotal(res.total ?? 0)
        setTotalPages(res.totalPages ?? 1)
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string }; status?: number } }).response?.data?.message
        const status = (err as { response?: { status?: number } }).response?.status
        if (status === 403) setError('Tài khoản không có quyền xem danh sách hội viên (member.read).')
        else setError(msg ?? 'Không thể tải danh sách hội viên. Kiểm tra kết nối đến server.')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(1, '', '') }, [load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    load(1, search, statusFilter)
  }

  function handleStatusChange(st: string) {
    setStatusFilter(st)
    setPage(1)
    load(1, search, st)
  }

  function goPage(p: number) {
    setPage(p)
    load(p, search, statusFilter)
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Nhân viên"
        title="Danh sách hội viên"
        description={`${total} hội viên trong hệ thống`}
      />

      {/* Search + filter */}
      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--rogym-text-muted)]" />
          <input
            className="input-base pl-9"
            placeholder="Tìm theo tên, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-base w-auto min-w-[160px]"
          value={statusFilter}
          onChange={e => handleStatusChange(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Không hoạt động</option>
          <option value="banned">Bị khoá</option>
        </select>
        <button type="submit" className="rogym-btn rogym-btn--primary px-5">Tìm kiếm</button>
      </form>

      {/* Table */}
      {loading ? (
        <StaffSkeleton rows={8} />
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : members.length === 0 ? (
        <StaffEmptyState title="Không tìm thấy hội viên" description="Thử thay đổi điều kiện tìm kiếm." />
      ) : (
        <div className="rogym-card rogym-card--compact overflow-hidden p-0">
          {/* Header row */}
          <div className="grid items-center gap-3 px-5 py-3 text-xs font-semibold uppercase text-[var(--rogym-text-muted)] border-b border-[var(--rogym-border-section)]"
            style={{ gridTemplateColumns: '1fr 1.2fr 1fr 1fr auto' }}>
            <span>Tên</span>
            <span>Email</span>
            <span>Gói tập</span>
            <span>Ngày tham gia</span>
            <span />
          </div>

          {members.map((m, i) => (
            <div
              key={m.memberId}
              onClick={() => navigate(`/staff/members/${m.memberId}`)}
              className="grid items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
              style={{ gridTemplateColumns: '1fr 1.2fr 1fr 1fr auto', borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: `${G}1a`, color: G }}>
                  {m.fullName.split(' ').slice(-1)[0]?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{m.fullName}</p>
                  <Badge status={m.status} />
                </div>
              </div>
              <p className="text-sm text-[var(--rogym-text-secondary)] truncate">{m.email}</p>
              <div>
                {m.activeSubscription ? (
                  <>
                    <p className="text-xs text-white truncate">{m.activeSubscription.packageName}</p>
                    <SubBadge status={m.activeSubscription.status} />
                  </>
                ) : (
                  <span className="text-xs text-[var(--rogym-text-dim)]">Chưa có gói</span>
                )}
              </div>
              <p className="text-sm text-[var(--rogym-text-secondary)]">{formatDate(m.createdAt)}</p>
              <ChevronRight size={16} className="text-[var(--rogym-text-dim)]" />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--rogym-text-muted)]">
            Trang {page}/{totalPages} · {total} hội viên
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
    </StaffPage>
  )
}

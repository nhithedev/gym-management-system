import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, ChevronDown, ChevronUp, AlertCircle, Search, UserCheck } from 'lucide-react'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import { StaffPage, StaffPageHeader, StaffSkeleton, StaffEmptyState } from '../components/StaffUI'
import { formatDateTime } from '@/lib/date'

const G = '#06c384'
const T = '#42e09e'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open:        { label: 'Mở',            color: '#f59e0b' },
  in_progress: { label: 'Đang xử lý',    color: '#3b82f6' },
  resolved:    { label: 'Đã giải quyết', color: G },
  rejected:    { label: 'Từ chối',       color: '#6b7280' },
}

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  staff:     { label: 'Nhân viên', color: '#8b5cf6' },
  equipment: { label: 'Thiết bị',  color: '#f59e0b' },
  service:   { label: 'Dịch vụ',   color: '#3b82f6' },
}

const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  low:    { label: 'Thấp',      color: G },
  medium: { label: 'Trung bình', color: '#f59e0b' },
  high:   { label: 'Cao',       color: '#ef4444' },
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: "'Be Vietnam Pro',sans-serif", background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {label}
    </span>
  )
}

function FeedbackCard({ fb, onUpdated }: { fb: Feedback; onUpdated: () => void }) {
  const [open, setOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const defaultNext = fb.status === 'open' ? 'in_progress' : 'resolved'
  const [newStatus, setNewStatus] = useState<'in_progress' | 'resolved' | 'rejected'>(defaultNext as 'in_progress' | 'resolved' | 'rejected')
  const [resolutionNote, setResolutionNote] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [showStatusForm, setShowStatusForm] = useState(false)

  const status = STATUS_MAP[fb.status] ?? { label: fb.status, color: '#6b7280' }
  const type   = TYPE_MAP[fb.feedbackType] ?? { label: fb.feedbackType, color: '#6b7280' }
  const sev    = SEVERITY_MAP[fb.severity] ?? { label: fb.severity, color: '#6b7280' }
  const isTerminal = fb.status === 'resolved' || fb.status === 'rejected'

  async function handleAssign() {
    setAssigning(true)
    setActionError(null)
    try {
      await feedbackService.assign(fb.feedbackId)
      onUpdated()
    } catch {
      setActionError('Không thể nhận xử lý. Vui lòng thử lại.')
    } finally {
      setAssigning(false)
    }
  }

  async function handleUpdateStatus() {
    if ((newStatus === 'resolved' || newStatus === 'rejected') && !resolutionNote.trim()) {
      setActionError('Ghi chú giải quyết là bắt buộc khi giải quyết hoặc từ chối.')
      return
    }
    setUpdatingStatus(true)
    setActionError(null)
    try {
      await feedbackService.updateStatus(fb.feedbackId, {
        status: newStatus,
        resolutionNote: resolutionNote.trim() || undefined,
      })
      setShowStatusForm(false)
      setResolutionNote('')
      onUpdated()
    } catch {
      setActionError('Không thể cập nhật trạng thái. Vui lòng thử lại.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="rogym-card rogym-card--compact overflow-hidden p-0">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Be Vietnam Pro',sans-serif" }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${type.color}1a` }}>
          <MessageSquare size={16} style={{ color: type.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge label={type.label} color={type.color} />
            <Badge label={sev.label} color={sev.color} />
            <Badge label={status.label} color={status.color} />
          </div>
          <p className="text-sm text-white truncate pr-4">{fb.content}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <p className="text-xs text-[var(--rogym-text-muted)]">{formatDateTime(fb.createdAt)}</p>
          {open ? <ChevronUp size={15} className="text-[var(--rogym-text-dim)]" /> : <ChevronDown size={15} className="text-[var(--rogym-text-dim)]" />}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-5 pb-5 pt-0 border-t border-[var(--rogym-border-section)]">
          <div className="pt-4 flex flex-col gap-3">
            <div>
              <p className="text-xs text-[var(--rogym-text-muted)] mb-1">Nội dung phản hồi</p>
              <p className="text-sm text-[var(--rogym-text-secondary)] leading-relaxed">{fb.content}</p>
            </div>
            {fb.subjectStaffName && (
              <div>
                <p className="text-xs text-[var(--rogym-text-muted)] mb-1">Nhân viên bị phản hồi</p>
                <p className="text-sm text-white">{fb.subjectStaffName}</p>
              </div>
            )}
            {fb.handledByStaffId && (
              <div>
                <p className="text-xs text-[var(--rogym-text-muted)] mb-1">Người xử lý</p>
                <p className="text-sm text-white flex items-center gap-1.5">
                  <UserCheck size={13} style={{ color: T }} /> Staff #{fb.handledByStaffId}
                  {fb.handledAt && <span className="text-[var(--rogym-text-muted)]"> · {formatDateTime(fb.handledAt)}</span>}
                </p>
              </div>
            )}
            {fb.response && (
              <div className="rounded-xl px-4 py-3" style={{ background: `${G}0a`, border: `1px solid ${G}22` }}>
                <p className="text-xs font-semibold mb-1" style={{ color: T }}>Phản hồi của nhân viên</p>
                <p className="text-sm text-[var(--rogym-text-secondary)] leading-relaxed">{fb.response}</p>
              </div>
            )}

            {/* Actions */}
            {actionError && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-300">{actionError}</p>
              </div>
            )}

            {!isTerminal && (
              <div className="flex flex-wrap gap-2 pt-1">
                {/* Assign button — only show if not yet assigned */}
                {!fb.handledByStaffId && fb.status === 'open' && (
                  <button
                    className="rogym-btn rogym-btn--primary px-4 py-2 text-xs"
                    onClick={handleAssign}
                    disabled={assigning}
                  >
                    <UserCheck size={13} className="mr-1.5 inline" />
                    {assigning ? 'Đang nhận...' : 'Nhận xử lý'}
                  </button>
                )}

                {/* Status update button */}
                <button
                  className="rogym-btn rogym-btn--outline-white px-4 py-2 text-xs"
                  onClick={() => setShowStatusForm(f => !f)}
                >
                  Cập nhật trạng thái
                </button>
              </div>
            )}

            {/* Status update form */}
            {showStatusForm && !isTerminal && (
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <p className="text-xs font-semibold text-blue-300">Cập nhật trạng thái phản hồi</p>
                <select
                  className="input-base"
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as typeof newStatus)}
                >
                  {fb.status === 'open' && <option value="in_progress">Đang xử lý</option>}
                  {fb.status === 'in_progress' && <option value="resolved">Đã giải quyết</option>}
                  {fb.status === 'in_progress' && <option value="rejected">Từ chối</option>}
                </select>
                <textarea
                  className="input-base resize-none"
                  rows={2}
                  placeholder={
                    newStatus === 'resolved' || newStatus === 'rejected'
                      ? 'Ghi chú giải quyết (bắt buộc)...'
                      : 'Ghi chú (tuỳ chọn)...'
                  }
                  value={resolutionNote}
                  onChange={e => setResolutionNote(e.target.value)}
                  required={newStatus === 'resolved' || newStatus === 'rejected'}
                />
                <div className="flex gap-2">
                  <button
                    className="rogym-btn rogym-btn--primary px-4 py-2 text-xs"
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button
                    className="rogym-btn rogym-btn--outline-white px-4 py-2 text-xs"
                    onClick={() => { setShowStatusForm(false); setResolutionNote('') }}
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const PAGE_SIZE = 15

export default function StaffFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback((p: number, status: string, type: string) => {
    setLoading(true)
    setError(null)
    feedbackService.list({
      status: status || undefined,
      feedbackType: type || undefined,
      page: p,
      pageSize: PAGE_SIZE,
      sort: 'createdAt:desc',
    }).then(res => {
      setFeedbacks(res.data)
      setTotal(res.total)
    }).catch(() => setError('Không thể tải danh sách phản hồi.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(1, '', '') }, [load])

  function handleFilter(status: string, type: string) {
    setStatusFilter(status)
    setTypeFilter(type)
    setPage(1)
    load(1, status, type)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Nhân viên"
        title="Phản hồi hội viên"
        description={`${total} phản hồi`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="input-base w-auto min-w-[160px]"
          value={statusFilter}
          onChange={e => handleFilter(e.target.value, typeFilter)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="open">Mở</option>
          <option value="in_progress">Đang xử lý</option>
          <option value="resolved">Đã giải quyết</option>
          <option value="rejected">Từ chối</option>
        </select>
        <select
          className="input-base w-auto min-w-[160px]"
          value={typeFilter}
          onChange={e => handleFilter(statusFilter, e.target.value)}
        >
          <option value="">Tất cả loại</option>
          <option value="staff">Nhân viên</option>
          <option value="equipment">Thiết bị</option>
          <option value="service">Dịch vụ</option>
        </select>

        {/* Summary badges */}
        <div className="flex items-center gap-2 ml-auto">
          {Object.entries(STATUS_MAP).map(([key, s]) => {
            const count = feedbacks.filter(f => f.status === key).length
            if (count === 0) return null
            return <Badge key={key} label={`${s.label}: ${count}`} color={s.color} />
          })}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <StaffSkeleton rows={6} />
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : feedbacks.length === 0 ? (
        <StaffEmptyState
          title="Không có phản hồi nào"
          description={statusFilter || typeFilter ? 'Thử thay đổi bộ lọc.' : 'Hội viên chưa gửi phản hồi nào.'}
          action={
            (statusFilter || typeFilter) ? (
              <button className="rogym-btn rogym-btn--outline-white text-sm px-4" onClick={() => handleFilter('', '')}>
                <Search size={14} className="mr-1.5" /> Xóa bộ lọc
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {feedbacks.map(fb => (
            <FeedbackCard
              key={fb.feedbackId}
              fb={fb}
              onUpdated={() => load(page, statusFilter, typeFilter)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--rogym-text-muted)]">Trang {page}/{totalPages} · {total} phản hồi</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p, statusFilter, typeFilter) }} className="rogym-btn rogym-btn--outline-white px-3 py-2 text-sm disabled:opacity-40">Trước</button>
            <button disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); load(p, statusFilter, typeFilter) }} className="rogym-btn rogym-btn--outline-white px-3 py-2 text-sm disabled:opacity-40">Sau</button>
          </div>
        </div>
      )}
    </StaffPage>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { MemberPage, MemberPageHeader, MemberSkeleton, MemberEmptyState, MemberErrorState } from '../components/MemberUI'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import { useAuthStore } from '@/stores/authStore'

const G = '#06c384'
const BG_CARD = '#0f1c16'
const PAGE_SIZE = 8

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open:        { label: 'Chờ xử lý',     color: '#f59e0b' },
  in_progress: { label: 'Đang xử lý',    color: '#3b82f6' },
  resolved:    { label: 'Đã giải quyết', color: G },
  rejected:    { label: 'Từ chối',       color: '#6b7280' },
}

const TYPE_MAP: Record<string, string> = {
  staff:     'Nhân viên',
  equipment: 'Thiết bị',
  service:   'Dịch vụ',
}

const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  low:    { label: 'Thấp',       color: '#22c55e' },
  medium: { label: 'Trung bình', color: '#f59e0b' },
  high:   { label: 'Cao',        color: '#ef4444' },
}

const FILTER_TABS = [
  { label: 'Tất cả',         value: '' },
  { label: 'Chờ xử lý',      value: 'open' },
  { label: 'Đang xử lý',     value: 'in_progress' },
  { label: 'Đã giải quyết',  value: 'resolved' },
  { label: 'Từ chối',        value: 'rejected' },
]

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 999,
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

const btnBase: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer',
  fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, transition: 'all 150ms',
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null

  const pages: (number | '...')[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i)
    if (page < total - 2) pages.push('...')
    pages.push(total)
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{ ...btnBase, color: page === 1 ? '#4a6654' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
      >
        <ChevronLeft size={15} />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} style={{ color: '#bbcabf', fontSize: 13, padding: '0 4px' }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            style={{
              ...btnBase,
              background: p === page ? 'rgba(6,195,132,0.15)' : 'transparent',
              color: p === page ? G : '#fff',
              borderColor: p === page ? 'rgba(6,195,132,0.3)' : 'rgba(255,255,255,0.12)',
            }}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page === total}
        style={{ ...btnBase, color: page === total ? '#4a6654' : '#fff', cursor: page === total ? 'not-allowed' : 'pointer' }}
      >
        <ChevronRight size={15} />
      </button>
    </div>
  )
}

export default function MyFeedbackPage() {
  const { user } = useAuthStore()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('')
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingSet, setDeletingSet] = useState<Set<string>>(new Set())

  function load() {
    setFetchError(null)
    setLoading(true)
    feedbackService.list({ sort: 'created_at:desc', pageSize: 50 })
      .then(({ data }) => setFeedbacks(data))
      .catch((err: { response?: { status?: number; data?: { message?: string } } }) => {
        if (err?.response?.status !== 403) {
          setFetchError(err?.response?.data?.message || 'Không thể tải danh sách phản hồi.')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user?.memberId) return
    load()
  }, [user?.memberId])

  async function handleDelete(feedbackId: string) {
    setDeletingSet(prev => new Set(prev).add(feedbackId))
    try {
      await feedbackService.delete(feedbackId)
      setFeedbacks(prev => prev.filter(f => f.feedbackId !== feedbackId))
      setDeletingId(null)
    } catch {
      // silently reset on error
    } finally {
      setDeletingSet(prev => { const s = new Set(prev); s.delete(feedbackId); return s })
    }
  }

  const countByStatus = feedbacks.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1
    return acc
  }, {})

  const filtered = activeTab ? feedbacks.filter(f => f.status === activeTab) : feedbacks
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function switchTab(val: string) {
    setActiveTab(val)
    setPage(1)
    setDeletingId(null)
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Phản hồi"
        title="Phản hồi của tôi"
        description="Theo dõi trạng thái các phản hồi bạn đã gửi"
        actions={
          <Link to="/member/feedback/send" className="rogym-btn rogym-btn--primary px-5 py-2.5 text-sm">
            Gửi phản hồi mới
          </Link>
        }
      />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map(tab => {
          const count = tab.value ? (countByStatus[tab.value] ?? 0) : feedbacks.length
          return (
            <button
              key={tab.value}
              onClick={() => switchTab(tab.value)}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: activeTab === tab.value ? '#06c38422' : 'transparent',
                color: activeTab === tab.value ? G : '#bbcabf',
                border: activeTab === tab.value ? '1px solid #06c38455' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {tab.label}
              {!loading && count > 0 && (
                <span
                  className="ml-1.5 inline-flex items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    minWidth: 18, height: 18, padding: '0 5px',
                    background: activeTab === tab.value ? G : 'rgba(255,255,255,0.12)',
                    color: activeTab === tab.value ? '#003d25' : '#bbcabf',
                    fontSize: 10,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <MemberSkeleton rows={4} />
      ) : fetchError ? (
        <MemberErrorState message={fetchError} onRetry={load} />
      ) : filtered.length === 0 ? (
        <MemberEmptyState
          title="Chưa có phản hồi nào"
          description={activeTab ? 'Không có phản hồi nào trong trạng thái này.' : 'Bạn chưa gửi phản hồi nào.'}
          action={
            !activeTab ? (
              <Link to="/member/feedback/send" className="rogym-btn rogym-btn--primary px-5 py-2.5 text-sm">
                Gửi phản hồi đầu tiên
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {paged.map(fb => {
              const status = STATUS_MAP[fb.status] ?? { label: fb.status, color: '#6b7280' }
              const severity = SEVERITY_MAP[fb.severity] ?? { label: fb.severity, color: '#6b7280' }
              const isConfirming = deletingId === fb.feedbackId
              const isDeleting = deletingSet.has(fb.feedbackId)
              return (
                <div
                  key={fb.feedbackId}
                  style={{ background: BG_CARD, border: '1px solid rgba(66,224,158,0.10)', borderRadius: 16, padding: '16px 20px' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge label={TYPE_MAP[fb.feedbackType] ?? fb.feedbackType} color="#bbcabf" />
                      <Badge label={severity.label} color={severity.color} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge label={status.label} color={status.color} />
                      {!isConfirming && (
                        <button
                          onClick={() => setDeletingId(fb.feedbackId)}
                          title="Xóa phản hồi"
                          style={{
                            width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', transition: 'all 150ms',
                            color: '#ef4444',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p
                    className="mt-3 text-sm text-white"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {fb.content}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="text-xs" style={{ color: '#bbcabf' }}>Gửi lúc {fmtDate(fb.createdAt)}</p>
                    {fb.status === 'resolved' && fb.response && (
                      <p
                        className="text-xs max-w-xs text-right"
                        style={{ color: '#8ab89c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        Phản hồi: {fb.response}
                      </p>
                    )}
                  </div>

                  {isConfirming && (
                    <div
                      className="mt-3 flex items-center gap-3 rounded-xl px-4 py-3"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      <p className="flex-1 text-xs" style={{ color: '#fca5a5' }}>Xóa phản hồi này? Hành động không thể hoàn tác.</p>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-xs font-medium"
                        style={{ color: '#bbcabf', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => handleDelete(fb.feedbackId)}
                        disabled={isDeleting}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                        style={{ background: '#ef4444', color: '#fff', border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.6 : 1 }}
                      >
                        {isDeleting ? 'Đang xóa...' : 'Xóa'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <Pagination page={page} total={totalPages} onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
        </>
      )}
    </MemberPage>
  )
}

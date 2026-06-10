import { useCallback, useEffect, useState } from 'react'
import { Clock, CheckCircle, AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { feedbackService, type Feedback } from '@/services/feedback.service'

const STATUS_TABS = ['', 'open', 'in_progress', 'resolved', 'rejected']
const STATUS_LABEL: Record<string, string> = {
  '': 'Tất cả',
  open: 'Chờ xử lý',
  in_progress: 'Đang xử lý',
  resolved: 'Đã xử lý',
  rejected: 'Từ chối',
}

const STATUS_CLASS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-primary/10 text-primary',
  resolved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-slate-100 text-slate-700',
}

const SEVERITY_LABEL: Record<string, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
}

const SEVERITY_CLASS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-error/10 text-error',
}

const TYPE_LABEL: Record<string, string> = {
  staff: 'Nhân viên',
  equipment: 'Thiết bị',
  service: 'Dịch vụ',
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusTab, setStatusTab] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Modal: 'resolve' = đánh dấu xử lý xong, 'reject' = từ chối
  const [modal, setModal] = useState<'none' | 'resolve' | 'reject'>('none')
  const [resolutionNote, setResolutionNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const selectedFeedback = feedbacks.find((f) => f.feedbackId === selectedId) ?? null

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await feedbackService.list({
        page,
        pageSize: 20,
        status: statusTab || undefined,
      })
      setFeedbacks(res.data)
      setMeta(res.meta)
      setSelectedId((prev) => prev ?? res.data[0]?.feedbackId ?? null)
    } catch {
      setError('Không thể tải danh sách phản hồi')
    } finally {
      setLoading(false)
    }
  }, [page, statusTab])

  useEffect(() => { fetchFeedbacks() }, [fetchFeedbacks])

  const handleAssign = async () => {
    if (!selectedFeedback) return
    setSubmitting(true)
    setError('')
    try {
      const updated = await feedbackService.assign(selectedFeedback.feedbackId)
      setFeedbacks((prev) => prev.map((f) => (f.feedbackId === updated.feedbackId ? updated : f)))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Tiếp nhận thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFeedback) return
    const status = modal === 'resolve' ? 'resolved' : 'rejected'
    setSubmitting(true)
    setFormError('')
    try {
      const updated = await feedbackService.updateStatus(selectedFeedback.feedbackId, {
        status,
        resolutionNote: resolutionNote.trim() || undefined,
      })
      setFeedbacks((prev) => prev.map((f) => (f.feedbackId === updated.feedbackId ? updated : f)))
      setModal('none')
      setResolutionNote('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Cập nhật thất bại, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Quản lý phản hồi</p>
        <h1 className="mt-2 text-3xl font-semibold">Đơn phản hồi</h1>
        <p className="mt-2 text-sm text-on-surface/70">Xem và xử lý phản hồi từ hội viên.</p>
      </div>

      {error && <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>}

      {/* Tab filter theo trạng thái */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusTab(s); setPage(1); setSelectedId(null) }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              statusTab === s
                ? 'bg-primary text-white'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        {/* Left — danh sách */}
        <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              Danh sách
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-xs text-on-surface-variant">
              <Clock className="w-3.5 h-3.5" /> {meta.totalItems} phản hồi
            </span>
          </div>

          {loading ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">Đang tải...</p>
          ) : feedbacks.length === 0 ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">Không có phản hồi nào</p>
          ) : (
            <>
              <div className="space-y-3">
                {feedbacks.map((item) => (
                  <button
                    key={item.feedbackId}
                    type="button"
                    onClick={() => setSelectedId(item.feedbackId)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      selectedId === item.feedbackId
                        ? 'border-primary bg-primary/5'
                        : 'border-outline hover:border-primary/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-semibold">
                        {item.member?.fullName ?? `HV ${item.memberId}`}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {item.sla?.overdue && (
                          <span className="rounded-full bg-error/10 px-2 py-0.5 text-xs font-semibold text-error">
                            SLA
                          </span>
                        )}
                        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${STATUS_CLASS[item.status] ?? ''}`}>
                          {STATUS_LABEL[item.status]}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-on-surface">{item.content}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-on-surface-variant">
                      <span>{TYPE_LABEL[item.feedbackType] ?? item.feedbackType}</span>
                      <span>·</span>
                      <span className={`rounded-full px-2 py-0.5 ${SEVERITY_CLASS[item.severity] ?? ''}`}>
                        {SEVERITY_LABEL[item.severity]}
                      </span>
                      <span>·</span>
                      <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </button>
                ))}
              </div>

              {meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">{meta.totalItems} phản hồi</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-full border border-outline p-2 disabled:opacity-40 hover:bg-surface-container-high"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>{page} / {meta.totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                      disabled={page === meta.totalPages}
                      className="rounded-full border border-outline p-2 disabled:opacity-40 hover:bg-surface-container-high"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right — chi tiết */}
        <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          {!selectedFeedback ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">
              Chọn phản hồi để xem chi tiết
            </p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Chi tiết phản hồi</p>
                  <h2 className="mt-2 text-xl font-semibold line-clamp-2">{selectedFeedback.content}</h2>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[selectedFeedback.status]}`}>
                    {STATUS_LABEL[selectedFeedback.status]}
                  </span>
                  {selectedFeedback.sla?.overdue && (
                    <span className="rounded-full bg-error/10 px-3 py-1 text-xs font-semibold text-error">
                      Quá SLA
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <Row
                  label="Hội viên"
                  value={selectedFeedback.member?.fullName ?? `ID ${selectedFeedback.memberId}`}
                />
                <Row
                  label="Loại phản hồi"
                  value={TYPE_LABEL[selectedFeedback.feedbackType] ?? selectedFeedback.feedbackType}
                />
                <Row label="Mức độ" value={SEVERITY_LABEL[selectedFeedback.severity] ?? selectedFeedback.severity} />
                <Row label="Ngày tạo" value={new Date(selectedFeedback.createdAt).toLocaleString('vi-VN')} />
                {selectedFeedback.sla && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Hạn xử lý</p>
                    <p className={`mt-1 ${selectedFeedback.sla.overdue ? 'font-semibold text-error' : 'text-on-surface'}`}>
                      {new Date(selectedFeedback.sla.dueAt).toLocaleString('vi-VN')}
                      {selectedFeedback.sla.overdue ? ' (Quá hạn)' : ''}
                    </p>
                  </div>
                )}
                {selectedFeedback.handledByStaff && (
                  <Row label="Nhân viên xử lý" value={selectedFeedback.handledByStaff.fullName} />
                )}
                {selectedFeedback.subjectStaff && (
                  <Row label="Nhân viên liên quan" value={selectedFeedback.subjectStaff.fullName} />
                )}
                {selectedFeedback.subjectEquipment && (
                  <Row
                    label="Thiết bị liên quan"
                    value={`${selectedFeedback.subjectEquipment.equipmentCode} — ${selectedFeedback.subjectEquipment.name}`}
                  />
                )}
              </div>

              {/* Nút hành động — chỉ hiện khi chưa ở terminal state */}
              {selectedFeedback.status !== 'resolved' && selectedFeedback.status !== 'rejected' && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {selectedFeedback.status === 'open' && (
                    <button
                      onClick={handleAssign}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition"
                    >
                      <CheckCircle className="w-4 h-4" /> Tiếp nhận
                    </button>
                  )}
                  {selectedFeedback.status === 'in_progress' && (
                    <button
                      onClick={() => { setResolutionNote(''); setFormError(''); setModal('resolve') }}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition"
                    >
                      <CheckCircle className="w-4 h-4" /> Đánh dấu đã xử lý
                    </button>
                  )}
                  <button
                    onClick={() => { setResolutionNote(''); setFormError(''); setModal('reject') }}
                    className="inline-flex items-center gap-2 rounded-xl border border-error px-4 py-2.5 text-sm text-error hover:bg-error/10 transition"
                  >
                    <AlertTriangle className="w-4 h-4" /> Từ chối
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal giải quyết / từ chối */}
      {(modal === 'resolve' || modal === 'reject') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {modal === 'resolve' ? 'Đánh dấu đã xử lý' : 'Từ chối phản hồi'}
              </h2>
              <button onClick={() => setModal('none')} className="rounded-full p-2 hover:bg-surface-container-high">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateStatus} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  {modal === 'resolve' ? 'Ghi chú kết quả *' : 'Lý do từ chối *'}
                </label>
                <textarea
                  required
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  rows={3}
                  className="mt-1 input-base resize-none"
                  placeholder={
                    modal === 'resolve'
                      ? 'Nhập ghi chú kết quả xử lý...'
                      : 'Nhập lý do từ chối...'
                  }
                />
              </div>
              {formError && <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal('none')} className="btn-secondary flex-1">
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 transition ${
                    modal === 'reject' ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {submitting ? 'Đang lưu...' : modal === 'resolve' ? 'Xác nhận' : 'Từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">{label}</p>
      <p className="mt-1 text-on-surface">{value}</p>
    </div>
  )
}

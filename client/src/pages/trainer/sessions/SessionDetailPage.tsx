import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, CheckCircle, MapPin, Pencil, Play, UserRound, XCircle } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/date'
import { trainingService, type TrainingSessionDetail } from '@/services/training.service'
import {
  TrainerEmptyState,
  TrainerErrorState,
  TrainerModal,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
  TrainerStatusBadge,
} from '@/components/TrainerUI'

export default function TrainerSessionDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<TrainingSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [statusTarget, setStatusTarget] = useState<'in_progress' | 'completed' | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSession(await trainingService.getSession(id))
    } catch (err) {
      setError(getApiError(err, 'Không thể tải buổi tập.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function cancelSession() {
    setCancelling(true)
    setError(null)
    try {
      await trainingService.cancelSession(id, reason.trim() || undefined)
      setCancelOpen(false)
      await load()
    } catch (err) {
      setError(
        getApiError(err, 'Không thể hủy buổi tập. Chỉ được hủy trước giờ bắt đầu ít nhất 2 giờ.')
      )
    } finally {
      setCancelling(false)
    }
  }

  async function handleStatusUpdate() {
    if (!statusTarget) return
    setUpdatingStatus(true)
    setError(null)
    try {
      await trainingService.updateSessionStatus(id, statusTarget)
      setStatusTarget(null)
      await load()
    } catch (err) {
      setError(getApiError(err, 'Không thể cập nhật trạng thái buổi tập.'))
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading)
    return (
      <TrainerPage>
        <TrainerSkeleton rows={5} />
      </TrainerPage>
    )
  if (error && !session)
    return (
      <TrainerPage>
        <TrainerErrorState message={error} onRetry={load} />
      </TrainerPage>
    )
  if (!session) return null
  const editable = session.status === 'scheduled' && new Date(session.startTime) > new Date()
  const canStart = session.status === 'scheduled'
  const canComplete = session.status === 'scheduled' || session.status === 'in_progress'

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Chi tiết buổi tập"
        title={session.memberName}
        description={`${formatDateTime(session.startTime)} - ${formatDateTime(session.endTime)}`}
        actions={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => navigate('/trainer/sessions')}
            >
              <ArrowLeft size={16} /> Danh sách
            </button>
            {canStart && (
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                onClick={() => setStatusTarget('in_progress')}
              >
                <Play size={16} /> Bắt đầu
              </button>
            )}
            {canComplete && (
              <button
                type="button"
                className="rogym-btn rogym-btn--primary"
                onClick={() => setStatusTarget('completed')}
              >
                <CheckCircle size={16} /> Hoàn thành
              </button>
            )}
            {editable && (
              <Link
                className="rogym-btn rogym-btn--outline-white"
                to={`/trainer/sessions/${id}/edit`}
              >
                <Pencil size={16} /> Chỉnh sửa
              </Link>
            )}
            {editable && (
              <button
                type="button"
                className="rogym-btn rogym-btn--danger"
                onClick={() => setCancelOpen(true)}
              >
                <XCircle size={16} /> Hủy buổi
              </button>
            )}
          </>
        }
      />
      {error && <TrainerErrorState message={error} onRetry={load} />}
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <section className="rogym-card rogym-card--compact p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Thông tin lịch</h2>
            <TrainerStatusBadge status={session.status} />
          </div>
          <Detail icon={<UserRound size={18} />} label="Học viên" value={session.memberName} />
          <Detail
            icon={<CalendarClock size={18} />}
            label="Bắt đầu"
            value={formatDateTime(session.startTime)}
          />
          <Detail
            icon={<CalendarClock size={18} />}
            label="Kết thúc"
            value={formatDateTime(session.endTime)}
          />
          <Detail
            icon={<MapPin size={18} />}
            label="Phòng"
            value={session.roomName ?? 'Chưa xếp phòng'}
          />
        </section>
        <section>
          <h2 className="mb-4 text-lg font-bold text-white">Điểm danh buổi tập</h2>
          {session.attendanceLogs?.length ? (
            <div className="space-y-3">
              {session.attendanceLogs.map((log) => (
                <div key={log.attendanceId} className="rogym-card rogym-card--compact p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-white">{formatDateTime(log.startTime)}</div>
                    <TrainerStatusBadge status={log.method} />
                  </div>
                  <div className="mt-2 text-sm text-[var(--rogym-text-dim)]">
                    Checkout: {formatDateTime(log.endTime)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <TrainerEmptyState
              title="Chưa có lượt điểm danh"
              description="Lượt check-in liên kết với session sẽ xuất hiện tại đây."
            />
          )}
        </section>
      </div>
      <TrainerModal
        open={statusTarget !== null}
        title={statusTarget === 'in_progress' ? 'Bắt đầu buổi tập' : 'Hoàn thành buổi tập'}
        onClose={() => setStatusTarget(null)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setStatusTarget(null)}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--primary"
              disabled={updatingStatus}
              onClick={handleStatusUpdate}
            >
              {updatingStatus
                ? 'Đang cập nhật...'
                : statusTarget === 'in_progress'
                  ? 'Xác nhận bắt đầu'
                  : 'Xác nhận hoàn thành'}
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 text-[var(--rogym-text-secondary)]">
          {statusTarget === 'in_progress'
            ? `Xác nhận bắt đầu buổi tập với ${session.memberName}? Trạng thái sẽ chuyển sang "Đang diễn ra".`
            : `Xác nhận hoàn thành buổi tập với ${session.memberName}? Trạng thái sẽ chuyển sang "Hoàn thành" và không thể hoàn tác.`}
        </p>
      </TrainerModal>
      <TrainerModal
        open={cancelOpen}
        title="Hủy buổi tập"
        onClose={() => setCancelOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setCancelOpen(false)}
            >
              Giữ lịch
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--danger"
              disabled={cancelling}
              onClick={cancelSession}
            >
              {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
            </button>
          </>
        }
      >
        <p className="mb-4 text-sm leading-6 text-[var(--rogym-text-secondary)]">
          Theo quy định, buổi tập chỉ được hủy trước giờ bắt đầu ít nhất 2 giờ.
        </p>
        <label className="block space-y-2">
          <span className="rogym-field-label">Lý do (không bắt buộc)</span>
          <textarea
            className="rogym-input min-h-24"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </TrainerModal>
    </TrainerPage>
  )
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-white/5 py-4 last:border-0">
      <div className="mt-0.5 text-[var(--rogym-teal)]">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider text-[var(--rogym-text-dim)]">{label}</div>
        <div className="mt-1 font-medium text-white">{value}</div>
      </div>
    </div>
  )
}

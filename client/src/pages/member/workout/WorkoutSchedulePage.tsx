import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, CalendarX } from 'lucide-react'
import { trainingService, type TrainingSession } from '@/services/training.service'
import { MemberPage, MemberPageHeader, MemberSkeleton, MemberEmptyState, MemberErrorState } from '../components/MemberUI'
import { getApiError } from '@/lib/api-error'

const G = '#06c384'

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: '#3b82f6', in_progress: '#f59e0b', completed: G, cancelled: '#ef4444',
}
const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Đã lên lịch', in_progress: 'Đang diễn ra', completed: 'Hoàn thành', cancelled: 'Đã huỷ',
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? '#6b7280'
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export default function WorkoutSchedulePage() {
  const [upcoming, setUpcoming] = useState<TrainingSession[]>([])
  const [past, setPast]         = useState<TrainingSession[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    const now = new Date().toISOString()
    Promise.all([
      trainingService.getSessions({ status: 'scheduled', pageSize: 20, sort: 'start_time:asc' }),
      trainingService.getSessions({ status: 'completed', pageSize: 10, sort: 'start_time:desc' }),
    ])
      .then(([upRes, pastRes]) => {
        setUpcoming(upRes.data)
        setPast(pastRes.data)
      })
      .catch(err => setError(getApiError(err, 'Không thể tải lịch PT.')))
      .finally(() => setLoading(false))

    void now // suppress unused var warning
  }, [])

  if (loading) return (
    <MemberPage>
      <MemberPageHeader eyebrow="Lịch tập" title="Lịch PT" />
      <MemberSkeleton rows={5} />
    </MemberPage>
  )

  if (error) return (
    <MemberPage>
      <MemberPageHeader eyebrow="Lịch tập" title="Lịch PT" />
      <MemberErrorState message={error} onRetry={() => window.location.reload()} />
    </MemberPage>
  )

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Lịch tập"
        title="Lịch PT"
        description="Các buổi tập cá nhân với huấn luyện viên."
        actions={
          <Link to="/member/workout/plan" className="rogym-btn rogym-btn--outline-white">
            Kế hoạch tập
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        {/* Upcoming sessions */}
        <section className="rogym-card rogym-card--compact p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">Lịch sắp tới</h2>
          </div>
          {upcoming.length === 0 ? (
            <MemberEmptyState title="Chưa có buổi tập nào sắp tới" description="Liên hệ huấn luyện viên để đặt lịch." />
          ) : (
            <div className="space-y-3">
              {upcoming.map(s => (
                <div
                  key={s.sessionId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.025] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: `${G}18` }}>
                      <Calendar size={16} style={{ color: G }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{fmtDatetime(s.startTime)}</p>
                      {s.trainerName && (
                        <p className="text-xs text-[var(--rogym-text-secondary)] mt-0.5">
                          HLV: {s.trainerName}{s.roomName ? ` · ${s.roomName}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Past sessions */}
        <section className="rogym-card rogym-card--compact p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">Đã hoàn thành</h2>
          </div>
          {past.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <CalendarX size={32} style={{ color: 'var(--rogym-text-secondary)' }} />
              <p className="text-sm text-[var(--rogym-text-secondary)]">Chưa có buổi tập nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {past.map(s => (
                <div
                  key={s.sessionId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/5 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{fmtDate(s.startTime)}</p>
                    {s.trainerName && (
                      <p className="text-xs text-[var(--rogym-text-secondary)] mt-0.5">
                        HLV: {s.trainerName}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </MemberPage>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, List, Plus } from 'lucide-react'
import { useTrainerSessions } from '@/hooks/useTrainerSessions'
import { formatDate, formatTime, toDateInput } from '@/lib/date'
import {
  TrainerEmptyState,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
  TrainerStatusBadge,
} from '@/components/TrainerUI'

function startOfWeek(value: Date) {
  const date = new Date(value)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

export default function CalendarPage() {
  const [anchor, setAnchor] = useState(() => new Date())
  const [view, setView] = useState<'week' | 'day'>('week')
  const range = useMemo(() => {
    const from =
      view === 'week' ? startOfWeek(anchor) : new Date(new Date(anchor).setHours(0, 0, 0, 0))
    const to = new Date(from)
    to.setDate(to.getDate() + (view === 'week' ? 7 : 1))
    return { from, to }
  }, [anchor, view])
  const { data, loading, error, reload } = useTrainerSessions({
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    pageSize: 100,
    sort: 'start_time:asc',
  })
  const days = useMemo(
    () =>
      Array.from({ length: view === 'week' ? 7 : 1 }, (_, index) => {
        const date = new Date(range.from)
        date.setDate(date.getDate() + index)
        return date
      }),
    [range.from, view]
  )

  function move(amount: number) {
    const next = new Date(anchor)
    next.setDate(next.getDate() + amount * (view === 'week' ? 7 : 1))
    setAnchor(next)
  }

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Lịch dạy"
        title="Lịch buổi tập"
        description="Theo dõi lịch theo ngày hoặc theo tuần, giờ hiển thị theo múi giờ Việt Nam."
        actions={
          <>
            <Link className="rogym-btn rogym-btn--outline-white" to="/trainer/sessions">
              <List size={16} /> Danh sách
            </Link>
            <Link className="rogym-btn rogym-btn--primary" to="/trainer/sessions/create">
              <Plus size={16} /> Tạo buổi
            </Link>
          </>
        }
      />
      <div className="rogym-card rogym-card--compact flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            onClick={() => move(-1)}
            aria-label="Kỳ trước"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            onClick={() => setAnchor(new Date())}
          >
            Hôm nay
          </button>
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            onClick={() => move(1)}
            aria-label="Kỳ sau"
          >
            <ChevronRight size={18} />
          </button>
          <span className="ml-2 text-sm font-semibold text-white">
            {formatDate(range.from)}
            {view === 'week' ? ` - ${formatDate(new Date(range.to.getTime() - 1))}` : ''}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={
              view === 'day' ? 'rogym-btn rogym-btn--primary' : 'rogym-btn rogym-btn--outline-white'
            }
            onClick={() => setView('day')}
          >
            Ngày
          </button>
          <button
            type="button"
            className={
              view === 'week'
                ? 'rogym-btn rogym-btn--primary'
                : 'rogym-btn rogym-btn--outline-white'
            }
            onClick={() => setView('week')}
          >
            Tuần
          </button>
        </div>
      </div>

      {loading ? (
        <TrainerSkeleton rows={5} />
      ) : error ? (
        <TrainerErrorState message={error} onRetry={reload} />
      ) : (
        <div className={`grid gap-3 ${view === 'week' ? 'lg:grid-cols-7' : ''}`}>
          {days.map((day) => {
            const daySessions = data.filter(
              (session) => toDateInput(session.startTime) === toDateInput(day)
            )
            return (
              <section
                key={day.toISOString()}
                className="rogym-card rogym-card--compact min-h-52 p-3"
              >
                <div className="border-b border-white/5 pb-3 text-sm font-semibold text-white">
                  {formatDate(day)}
                </div>
                <div className="mt-3 space-y-2">
                  {daySessions.map((session) => (
                    <Link
                      key={session.sessionId}
                      to={`/trainer/sessions/${session.sessionId}`}
                      className="block rounded-xl border border-white/5 bg-white/[0.03] p-3"
                    >
                      <div className="text-xs font-semibold text-[var(--rogym-teal)]">
                        {formatTime(session.startTime)}
                      </div>
                      <div className="mt-1 truncate text-sm font-medium text-white">
                        {session.memberName}
                      </div>
                      <div className="mt-1 truncate text-xs text-[var(--rogym-text-dim)]">
                        {session.roomName ?? 'Chưa xếp phòng'}
                      </div>
                      <div className="mt-2">
                        <TrainerStatusBadge status={session.status} />
                      </div>
                    </Link>
                  ))}
                  {daySessions.length === 0 && (
                    <p className="py-6 text-center text-xs text-[var(--rogym-text-dim)]">
                      Không có lịch
                    </p>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
      {!loading && !error && data.length === 0 && view === 'day' && (
        <TrainerEmptyState title="Ngày này chưa có buổi tập" />
      )}
    </TrainerPage>
  )
}

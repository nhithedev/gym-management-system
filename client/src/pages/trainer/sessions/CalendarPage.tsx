import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, List, Plus } from 'lucide-react'
import { useTrainerSessions } from '@/hooks/useTrainerSessions'
import { formatDate, formatTime, toDateInput, todayInput } from '@/lib/date'
import {
  TrainerEmptyState,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
  TrainerStatusBadge,
} from '@/components/TrainerUI'

/** Trả về ngày đầu tuần (Thứ 2) tính theo múi giờ VN (UTC+7) */
function startOfWeekVN(value: Date) {
  const vnDateStr = toDateInput(value)
  const vnDate = new Date(`${vnDateStr}T00:00:00+07:00`)
  const day = vnDate.getDay()
  vnDate.setDate(vnDate.getDate() - (day === 0 ? 6 : day - 1))
  return vnDate
}

export default function CalendarPage() {
  const [anchor, setAnchor] = useState(() => new Date())
  const [view, setView] = useState<'week' | 'day'>('week')

  const todayStr = todayInput()   // "yyyy-MM-dd" theo UTC+7

  const range = useMemo(() => {
    const from =
      view === 'week'
        ? startOfWeekVN(anchor)
        : new Date(`${toDateInput(anchor)}T00:00:00+07:00`)
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

  const sessionsByDay = useMemo(() => {
    const grouped = new Map<string, typeof data>()
    for (const session of data) {
      const key = toDateInput(session.startTime)
      const sessions = grouped.get(key)
      if (sessions) sessions.push(session)
      else grouped.set(key, [session])
    }
    return grouped
  }, [data])

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

      {/* Toolbar: navigation + view toggle */}
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
          <span className="ml-2 text-sm font-semibold rogym-text-primary">
            {formatDate(range.from)}
            {view === 'week' ? ` - ${formatDate(new Date(range.to.getTime() - 1))}` : ''}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={view === 'day' ? 'rogym-btn rogym-btn--primary' : 'rogym-btn rogym-btn--outline-white'}
            onClick={() => setView('day')}
          >
            Ngày
          </button>
          <button
            type="button"
            className={view === 'week' ? 'rogym-btn rogym-btn--primary' : 'rogym-btn rogym-btn--outline-white'}
            onClick={() => setView('week')}
          >
            Tuần
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <TrainerSkeleton rows={5} />
      ) : error ? (
        <TrainerErrorState message={error} onRetry={reload} />
      ) : (
        <div className={`grid gap-3 ${view === 'week' ? 'lg:grid-cols-7' : ''}`}>
          {days.map((day) => {
            const dayKey = toDateInput(day)
            const isToday = dayKey === todayStr
            const daySessions = sessionsByDay.get(dayKey) ?? []

            return (
              <section
                key={day.toISOString()}
                className={`rogym-card rogym-card--compact min-h-52 p-3 ${isToday ? 'rogym-today-col' : ''}`}
              >
                {/* Tiêu đề ngày */}
                <div
                  className={`border-b pb-3 text-sm font-semibold ${
                    isToday ? 'rogym-today-col__header' : 'border-white/5 rogym-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{formatDate(day)}</span>
                    {isToday && (
                      <span className="rogym-today-badge" aria-label="Hôm nay">
                        Today
                      </span>
                    )}
                  </div>
                </div>

                {/* Danh sách buổi tập trong ngày */}
                <div className="mt-3 space-y-2">
                  {daySessions.map((session) => {
                    const sessionIsToday = toDateInput(session.startTime) === todayStr
                    return (
                      <Link
                        key={session.sessionId}
                        to={`/trainer/sessions/${session.sessionId}`}
                        className={`rogym-calendar-session block rounded-xl p-3 ${sessionIsToday ? 'is-today' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold rogym-text-accent">
                            {formatTime(session.startTime)}
                          </span>
                          {sessionIsToday}
                        </div>
                        <div className="mt-1 truncate text-sm font-medium rogym-text-primary">
                          {session.memberName}
                        </div>
                        <div className="mt-1 truncate text-xs rogym-text-muted">
                          {session.roomName ?? 'Chưa xếp phòng'}
                        </div>
                        <div className="mt-2">
                          <TrainerStatusBadge status={session.status} />
                        </div>
                      </Link>
                    )
                  })}
                  {daySessions.length === 0 && (
                    <p className="py-6 text-center text-xs rogym-text-muted">
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

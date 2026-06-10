import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  MapPin,
  User,
} from 'lucide-react'
import { trainingService, type TrainingSession } from '@/services/training.service'
import {
  MemberEmptyState,
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '../components/MemberUI'
import { getApiError } from '@/lib/api-error'

const G = '#06c384'
const T = '#42e09e'
const AMBER = '#f59e0b'
const BG_CARD = '#0f1c16'

// ── Status helpers ─────────────────────────────────────────────────────────────

function sessionColor(status: string): string {
  if (status === 'completed') return 'rgba(255,255,255,0.45)'
  if (status === 'cancelled') return AMBER
  return G // scheduled / in_progress
}

function sessionBg(status: string): string {
  if (status === 'completed') return 'rgba(255,255,255,0.07)'
  if (status === 'cancelled') return `${AMBER}1a`
  return `${G}20`
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang diễn ra',
  completed: 'Hoàn thành',
  cancelled: 'Không điểm danh',
}

// ── Format helpers ─────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtMonthYear(d: Date) {
  return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
}

function dateKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function daysUntil(iso: string) {
  const s = new Date(iso)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  s.setHours(0, 0, 0, 0)
  const diff = Math.ceil((s.getTime() - now.getTime()) / 86400000)
  if (diff === 0) return 'Hôm nay'
  if (diff === 1) return 'Ngày mai'
  if (diff < 0) return 'Đã qua'
  return `Còn ${diff} ngày`
}

// ── Pill toggle ────────────────────────────────────────────────────────────────

type ViewMode = 'calendar' | 'list'

function PillToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex gap-1.5">
      {([
        { v: 'calendar' as ViewMode, label: 'Lịch', icon: <Calendar size={13} /> },
        { v: 'list' as ViewMode, label: 'Danh sách', icon: <List size={13} /> },
      ] as const).map(({ v, label, icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
          style={{
            background: value === v ? `${G}22` : 'transparent',
            color: value === v ? G : '#bbcabf',
            border: value === v ? `1px solid ${G}55` : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {icon}{label}
        </button>
      ))}
    </div>
  )
}

// ── Session tooltip bubble ─────────────────────────────────────────────────────

function SessionTooltip({ session, align = 'left' }: { session: TrainingSession; align?: 'left' | 'right' }) {
  return (
    <div
      className="pointer-events-none absolute top-full z-30 mt-1 min-w-[200px] rounded-xl p-3 shadow-2xl"
      style={{
        background: '#0a1f17',
        border: `1px solid ${G}33`,
        [align === 'right' ? 'right' : 'left']: 0,
      }}
    >
      <div className="space-y-1.5 text-xs" style={{ color: '#bbcabf' }}>
        <div className="flex items-center gap-1.5">
          <Clock size={11} style={{ color: T }} />
          <span>{fmtDatetime(session.startTime)}</span>
        </div>
        {session.trainerName && (
          <div className="flex items-center gap-1.5">
            <User size={11} style={{ color: T }} />
            <span>HLV {session.trainerName}</span>
          </div>
        )}
        {session.roomName && (
          <div className="flex items-center gap-1.5">
            <MapPin size={11} style={{ color: T }} />
            <span>{session.roomName}</span>
          </div>
        )}
        <div
          className="mt-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: `${sessionColor(session.status)}22`, color: sessionColor(session.status), display: 'inline-block' }}
        >
          {STATUS_LABEL[session.status] ?? session.status}
        </div>
      </div>
    </div>
  )
}

// ── Calendar view ──────────────────────────────────────────────────────────────

const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function CalendarView({ sessions }: { sessions: TrainingSession[] }) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [hoveredSession, setHoveredSession] = useState<string | null>(null)

  // Index sessions by date key
  const byDate = useMemo(() => {
    const map = new Map<string, TrainingSession[]>()
    for (const s of sessions) {
      const k = dateKey(s.startTime)
      const arr = map.get(k) ?? []
      arr.push(s)
      map.set(k, arr)
    }
    return map
  }, [sessions])

  // Build calendar grid (6 rows × 7 cols, Mon-first)
  const grid = useMemo(() => {
    const year = month.getFullYear()
    const mon = month.getMonth()
    const firstDay = new Date(year, mon, 1)
    // Mon=0 … Sun=6
    const startOffset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, mon + 1, 0).getDate()
    const cells: Array<{ date: Date | null; key: string | null }> = []
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, key: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, mon, d)
      const key = `${year}-${mon}-${d}`
      cells.push({ date, key })
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, key: null })
    const rows: typeof cells[] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [month])

  const today = todayKey()

  function prevMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function nextMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  return (
    <div
      className="rounded-[20px] p-5"
      style={{ background: BG_CARD, border: '1px solid rgba(66,224,158,0.08)' }}
    >
      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs" style={{ color: '#8ab89c' }}>
        {[
          { color: G, label: 'Đã lên lịch' },
          { color: 'rgba(255,255,255,0.45)', label: 'Hoàn thành' },
          { color: AMBER, label: 'Không điểm danh' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: color }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{ color: '#8ab89c' }}
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-bold text-white capitalize">{fmtMonthYear(month)}</p>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{ color: '#8ab89c' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* DOW header */}
      <div className="mb-1 grid grid-cols-7">
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[11px] font-bold uppercase tracking-wider"
            style={{ color: '#4a7060' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-0.5">
        {grid.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7">
            {row.map((cell, ci) => {
              const isToday = cell.key === today
              const cellSessions = cell.key ? (byDate.get(cell.key) ?? []) : []
              return (
                <div
                  key={ci}
                  className="relative min-h-[68px] p-1"
                  style={{
                    border: isToday
                      ? `1px solid ${T}55`
                      : '1px solid rgba(255,255,255,0.03)',
                    borderRadius: 8,
                    background: isToday ? `${T}08` : 'transparent',
                    margin: 1,
                  }}
                >
                  {cell.date && (
                    <>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isToday ? 'text-white' : ''
                        }`}
                        style={{
                          background: isToday ? T : 'transparent',
                          color: isToday ? '#001a0e' : cell.date ? '#bbcabf' : 'transparent',
                          fontSize: 12,
                        }}
                      >
                        {cell.date.getDate()}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {cellSessions.map((s) => (
                          <div
                            key={s.sessionId}
                            className="relative"
                            onMouseEnter={() => setHoveredSession(s.sessionId)}
                            onMouseLeave={() => setHoveredSession(null)}
                          >
                            <div
                              className="truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight cursor-default"
                              style={{
                                background: sessionBg(s.status),
                                color: sessionColor(s.status),
                              }}
                            >
                              {fmtTime(s.startTime)}
                              {s.trainerName ? ` · ${s.trainerName.split(' ').pop()}` : ''}
                            </div>
                            {hoveredSession === s.sessionId && (
                              <SessionTooltip
                                session={s}
                                align={ci >= 4 ? 'right' : 'left'}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── List view ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color = sessionColor(status)
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function HeroCard({ session }: { session: TrainingSession }) {
  const countdown = daysUntil(session.startTime)
  return (
    <div
      className="rogym-card rogym-card--md p-6"
      style={{
        background: 'linear-gradient(135deg, #0a1f17 0%, #0f2a1e 100%)',
        borderColor: 'rgba(6,195,132,0.25)',
        boxShadow: '0 0 40px rgba(6,195,132,0.06)',
      }}
    >
      <p className="mb-4 text-[11px] font-bold uppercase tracking-widest" style={{ color: G }}>
        Buổi tập kế tiếp
      </p>
      <div className="flex items-start gap-5">
        <div
          className="flex shrink-0 items-center justify-center rounded-[16px]"
          style={{ width: 72, height: 72, background: `${G}18`, border: `1px solid ${G}33` }}
        >
          <User size={28} style={{ color: G }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xl font-bold text-white">{fmtDatetime(session.startTime)}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm" style={{ color: '#bbcabf' }}>
                {session.trainerName && (
                  <span className="flex items-center gap-1.5">
                    <User size={13} style={{ color: T }} />
                    HLV {session.trainerName}
                  </span>
                )}
                {session.roomName && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} style={{ color: T }} />
                    {session.roomName}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p
                className="text-2xl font-bold"
                style={{ color: countdown === 'Hôm nay' ? G : T }}
              >
                {countdown}
              </p>
              <StatusBadge status={session.status} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function UpcomingRow({ session }: { session: TrainingSession }) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center justify-between gap-4 rounded-xl p-4 transition-colors"
        style={{
          border: '1px solid rgba(255,255,255,0.05)',
          background: hovered ? 'rgba(66,224,158,0.04)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${G}18` }}
          >
            <Calendar size={16} style={{ color: G }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{fmtDateShort(session.startTime)}</p>
            {session.trainerName && (
              <p className="mt-0.5 text-xs" style={{ color: '#8ab89c' }}>
                HLV: {session.trainerName}
                {session.roomName ? ` · ${session.roomName}` : ''}
              </p>
            )}
          </div>
        </div>
        <StatusBadge status={session.status} />
      </div>
      {hovered && <SessionTooltip session={session} />}
    </div>
  )
}

function PastRow({ session }: { session: TrainingSession }) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl p-4"
      style={{
        border: '1px solid rgba(255,255,255,0.04)',
        opacity: 0.55,
      }}
    >
      <div>
        <p className="text-sm font-semibold text-white">{fmtDateShort(session.startTime)}</p>
        {session.trainerName && (
          <p className="mt-0.5 text-xs" style={{ color: '#8ab89c' }}>
            HLV: {session.trainerName}
            {session.roomName ? ` · ${session.roomName}` : ''}
          </p>
        )}
      </div>
      <StatusBadge status={session.status} />
    </div>
  )
}

function ListView({
  upcoming,
  past,
}: {
  upcoming: TrainingSession[]
  past: TrainingSession[]
}) {
  const nextSession = upcoming[0]
  const upcomingRest = upcoming.slice(1)

  return (
    <div className="space-y-5">
      {/* Hero */}
      {nextSession ? (
        <HeroCard session={nextSession} />
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-[20px] p-8 text-center"
          style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <CalendarX size={36} style={{ color: '#4a7060' }} />
          <p className="text-sm font-medium text-white">Chưa có lịch tập sắp tới</p>
          <p className="text-xs" style={{ color: '#8ab89c' }}>
            Liên hệ huấn luyện viên để đặt lịch buổi tập tiếp theo.
          </p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        {/* Upcoming rest */}
        <section
          className="rounded-[20px] p-6"
          style={{ background: BG_CARD, border: '1px solid rgba(66,224,158,0.08)' }}
        >
          <h2 className="mb-4 text-base font-bold text-white">Lịch sắp tới</h2>
          {upcomingRest.length === 0 ? (
            <MemberEmptyState
              title="Không có buổi tập nào khác"
              description="Buổi kế tiếp được hiển thị ở trên."
            />
          ) : (
            <div className="space-y-2">
              {upcomingRest.map((s) => (
                <UpcomingRow key={s.sessionId} session={s} />
              ))}
            </div>
          )}
        </section>

        {/* Past */}
        <section
          className="rounded-[20px] p-6"
          style={{ background: BG_CARD, border: '1px solid rgba(66,224,158,0.08)' }}
        >
          <h2 className="mb-4 text-base font-bold text-white">Đã hoàn thành</h2>
          {past.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <CalendarX size={32} style={{ color: '#4a7060' }} />
              <p className="text-sm" style={{ color: '#8ab89c' }}>Chưa có buổi tập nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {past.map((s) => (
                <PastRow key={s.sessionId} session={s} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function WorkoutSchedulePage() {
  const [view, setView] = useState<ViewMode>('calendar')
  const [upcoming, setUpcoming] = useState<TrainingSession[]>([])
  const [past, setPast] = useState<TrainingSession[]>([])
  const [all, setAll] = useState<TrainingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      trainingService.getSessions({ status: 'scheduled', pageSize: 50, sort: 'start_time:asc' }),
      trainingService.getSessions({ status: 'completed', pageSize: 30, sort: 'start_time:desc' }),
      trainingService.getSessions({ status: 'cancelled', pageSize: 30, sort: 'start_time:desc' }),
    ])
      .then(([upRes, doneRes, cancelRes]) => {
        setUpcoming(upRes.data)
        setPast(doneRes.data)
        setAll([...upRes.data, ...doneRes.data, ...cancelRes.data])
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải lịch tập.')))
      .finally(() => setLoading(false))
  }, [])

  if (loading)
    return (
      <MemberPage>
        <MemberPageHeader eyebrow="Lịch tập" title="Lịch của tôi" />
        <MemberSkeleton rows={5} />
      </MemberPage>
    )

  if (error)
    return (
      <MemberPage>
        <MemberPageHeader eyebrow="Lịch tập" title="Lịch của tôi" />
        <MemberErrorState message={error} onRetry={() => window.location.reload()} />
      </MemberPage>
    )

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Lịch tập"
        title="Lịch của tôi"
        description="Các buổi tập cá nhân với huấn luyện viên."
        actions={<PillToggle value={view} onChange={setView} />}
      />

      {view === 'calendar' ? (
        <CalendarView sessions={all} />
      ) : (
        <ListView upcoming={upcoming} past={past} />
      )}
    </MemberPage>
  )
}

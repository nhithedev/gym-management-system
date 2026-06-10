import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock, TrendingUp } from 'lucide-react'
import {
  MemberEmptyState,
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '../components/MemberUI'
import { trainingService, type AttendanceLog } from '@/services/training.service'
import { useAuthStore } from '@/stores/authStore'

const T = '#42e09e'
const BG_CARD = '#0f1c16'

function todayYM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function durationMins(start: string, end: string | null): number | null {
  if (!end) return null
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000))
}

function fmtDuration(mins: number | null): string {
  if (mins == null) return '—'
  if (mins < 60) return `${mins} phút`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const METHOD_COLOR: Record<string, string> = {
  realtime: T,
  manual: '#bbcabf',
  qr: '#a78bfa',
}
const METHOD_LABEL: Record<string, string> = {
  realtime: 'Realtime',
  manual: 'Thủ công',
  qr: 'QR',
}

function StatCard({
  icon,
  label,
  value,
  color = T,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color?: string
}) {
  return (
    <div
      style={{
        background: BG_CARD,
        border: '1px solid rgba(66,224,158,0.10)',
        borderRadius: 20,
        padding: '20px 24px',
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <p className="text-xs font-semibold uppercase" style={{ color, letterSpacing: '0.12em' }}>
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

export default function AttendanceHistoryPage() {
  const { user } = useAuthStore()
  const memberId = user?.memberId ? String(user.memberId) : undefined

  const [month, setMonth] = useState(todayYM())
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!memberId) return
    setLoading(true)
    setError(null)
    try {
      const result = await trainingService.getAttendance({ memberId, month, pageSize: 100 })
      setLogs(result.data)
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status !== 403)
        setError('Không thể tải lịch sử điểm danh.')
    } finally {
      setLoading(false)
    }
  }, [memberId, month])

  useEffect(() => {
    void load()
  }, [load])

  const uniqueDays = useMemo(
    () => new Set(logs.map((l) => l.startTime.slice(0, 10))).size,
    [logs]
  )

  const avgDuration = useMemo(() => {
    const completed = logs.filter((l) => l.endTime)
    if (!completed.length) return null
    const total = completed.reduce(
      (s, l) => s + (durationMins(l.startTime, l.endTime) ?? 0),
      0
    )
    return Math.round(total / completed.length)
  }, [logs])

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Hoạt động"
        title="Lịch sử điểm danh"
        description="Ghi nhận các lần check-in tại phòng tập của bạn"
      />

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<CalendarDays size={18} />}
          label="Lần check-in"
          value={loading ? '—' : String(logs.length)}
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Ngày tập tháng này"
          value={loading ? '—' : `${uniqueDays} ngày`}
          color="#f59e0b"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Thời gian TB / buổi"
          value={loading ? '—' : fmtDuration(avgDuration)}
        />
      </div>

      {/* Month filter */}
      <div
        style={{
          background: BG_CARD,
          border: '1px solid rgba(66,224,158,0.08)',
          borderRadius: 20,
          padding: '16px 20px',
        }}
        className="flex items-center gap-3"
      >
        <label className="text-sm font-medium" style={{ color: '#bbcabf' }}>
          Tháng:
        </label>
        <input
          type="month"
          className="rogym-input w-auto"
          value={month}
          max={todayYM()}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      {error && <MemberErrorState message={error} onRetry={load} />}

      {loading ? (
        <MemberSkeleton rows={5} />
      ) : logs.length === 0 ? (
        <MemberEmptyState
          title="Chưa có lần check-in nào"
          description="Tháng này chưa ghi nhận buổi tập. Quẹt thẻ hoặc quét QR tại cổng phòng tập."
        />
      ) : (
        <div
          style={{
            background: BG_CARD,
            border: '1px solid rgba(66,224,158,0.10)',
            borderRadius: 20,
            padding: '20px 24px',
          }}
        >
          <p className="mb-4 text-sm font-semibold text-white">{logs.length} lần check-in</p>
          {logs.map((log, i) => (
            <div
              key={log.attendanceId}
              className="flex items-center justify-between py-3"
              style={{
                borderBottom:
                  i < logs.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <div>
                <p className="text-sm font-medium text-white">{fmtDatetime(log.startTime)}</p>
                <p className="mt-0.5 text-xs" style={{ color: '#8ab89c' }}>
                  {log.endTime
                    ? `Ra: ${fmtTime(log.endTime)} · ${fmtDuration(durationMins(log.startTime, log.endTime))}`
                    : 'Chưa checkout'}
                </p>
              </div>
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  background: `${METHOD_COLOR[log.method] ?? '#bbcabf'}22`,
                  color: METHOD_COLOR[log.method] ?? '#bbcabf',
                  border: `1px solid ${METHOD_COLOR[log.method] ?? '#bbcabf'}44`,
                }}
              >
                {METHOD_LABEL[log.method] ?? log.method}
              </span>
            </div>
          ))}
        </div>
      )}
    </MemberPage>
  )
}

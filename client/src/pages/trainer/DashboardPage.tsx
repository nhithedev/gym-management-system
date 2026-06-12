import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle, CheckCircle2, Clock3, Play, Plus, Users } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate, formatDateTime, todayInput } from '@/lib/date'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import { trainingService, type TrainingSession } from '@/services/training.service'
import {
  TrainerEmptyState,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
  TrainerStatCard,
  TrainerStatusBadge,
} from '@/components/TrainerUI'

const LOCAL_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export default function TrainerDashboardPage() {
  const [students, setStudents] = useState<TrainerStudentSummary[]>([])
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // sessionId being updated
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString()
    Promise.all([
      memberService.list({ pageSize: 100 }),
      trainingService.getSessions({
        from: monthStart,
        to: nextWeek,
        pageSize: 100,
        sort: 'start_time:asc',
      }),
    ])
      .then(([studentResult, sessionResult]) => {
        setStudents(studentResult.data)
        setSessions(sessionResult.data)
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải tổng quan trainer.')))
      .finally(() => setLoading(false))
  }, [])

  const { todaySessions, completedThisMonth, upcoming, expiringStudents } = useMemo(() => {
    const today = todayInput()
    const now = Date.now()
    const nextTodaySessions: TrainingSession[] = []
    const nextUpcoming: TrainingSession[] = []
    let nextCompletedThisMonth = 0

    for (const session of sessions) {
      if (formatLocalDay(session.startTime) === today) nextTodaySessions.push(session)
      if (session.status === 'completed') nextCompletedThisMonth += 1
      if (session.status === 'scheduled' && new Date(session.startTime).getTime() > now) {
        nextUpcoming.push(session)
      }
    }

    nextUpcoming.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    const nextExpiringStudents = students
      .filter((student) => {
        const endDate = student.activeSubscription?.endDate
        if (!endDate) return false
        const days = (new Date(endDate).getTime() - now) / 86400000
        return days >= 0 && days <= 14
      })
      .sort(
        (a, b) =>
          new Date(a.activeSubscription!.endDate).getTime() -
          new Date(b.activeSubscription!.endDate).getTime()
      )

    return {
      todaySessions: nextTodaySessions,
      completedThisMonth: nextCompletedThisMonth,
      upcoming: nextUpcoming,
      expiringStudents: nextExpiringStudents,
    }
  }, [sessions, students])

  async function handleUpdateStatus(sessionId: string, status: 'in_progress' | 'completed') {
    setActionLoading(sessionId)
    setActionError(null)
    try {
      const updated = await trainingService.updateSessionStatus(sessionId, status)
      setSessions((prev) => prev.map((s) => (s.sessionId === sessionId ? updated : s)))
    } catch (err) {
      setActionError(getApiError(err, 'Không thể cập nhật trạng thái buổi tập.'))
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Trainer workspace"
        title="Tổng quan hôm nay"
        description="Theo dõi học viên, lịch dạy và các công việc cần ưu tiên."
        actions={
          <>
            <Link className="rogym-btn rogym-btn--outline-white" to="/trainer/calendar">
              <CalendarDays size={16} /> Xem lịch
            </Link>
            <Link className="rogym-btn rogym-btn--primary" to="/trainer/sessions/create">
              <Plus size={16} /> Tạo buổi tập
            </Link>
          </>
        }
      />
      {loading ? (
        <TrainerSkeleton rows={6} />
      ) : error ? (
        <TrainerErrorState message={error} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TrainerStatCard
              icon={<Users size={20} />}
              label="Học viên đang quản lý"
              value={students.length}
            />
            <TrainerStatCard
              icon={<CalendarDays size={20} />}
              label="Buổi tập hôm nay"
              value={todaySessions.length}
            />
            <TrainerStatCard
              icon={<CheckCircle2 size={20} />}
              label="Hoàn thành tháng này"
              value={completedThisMonth}
            />
            <TrainerStatCard
              icon={<Clock3 size={20} />}
              label="Buổi sắp tới"
              value={upcoming[0] ? formatDateTime(upcoming[0].startTime) : 'Chưa có'}
            />
          </div>

          {/* Today's schedule — attendance panel */}
          <section className="rogym-card rogym-card--compact p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Lịch dạy hôm nay</h2>
                <p className="mt-0.5 text-sm text-[var(--rogym-text-dim)]">
                  Đánh dấu trạng thái từng buổi tập ngay tại đây
                </p>
              </div>
              <Link className="rogym-text-link rogym-text-link--accent" to="/trainer/sessions">
                Tất cả buổi tập
              </Link>
            </div>
            {actionError && (
              <p className="rogym-error-alert mb-4" role="alert">
                {actionError}
              </p>
            )}
            {todaySessions.length === 0 ? (
              <TrainerEmptyState
                title="Không có buổi tập nào hôm nay"
                description="Tạo buổi tập mới hoặc kiểm tra lịch tuần tới."
              />
            ) : (
              <div className="space-y-3">
                {todaySessions.map((session) => {
                  const isLoading = actionLoading === session.sessionId
                  const canStart = session.status === 'scheduled'
                  const canComplete =
                    session.status === 'scheduled' || session.status === 'in_progress'
                  const isDone =
                    session.status === 'completed' || session.status === 'cancelled'
                  return (
                    <div key={session.sessionId} className="rogym-session-row is-today">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold rogym-text-primary">{session.memberName}</div>
                        <div className="mt-1 text-xs rogym-text-muted">
                          {formatDateTime(session.startTime)}
                          {session.roomName ? ` · ${session.roomName}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrainerStatusBadge status={session.status} />
                        {!isDone && (
                          <div className="flex gap-2">
                            {canStart && (
                              <button
                                type="button"
                                aria-label={`Bắt đầu buổi tập với ${session.memberName}`}
                                disabled={isLoading}
                                onClick={() =>
                                  void handleUpdateStatus(session.sessionId, 'in_progress')
                                }
                                className="rogym-inline-action rogym-inline-action--start"
                                data-no-sweep
                              >
                                <Play size={12} />
                                Bắt đầu
                              </button>
                            )}
                            {canComplete && (
                              <button
                                type="button"
                                aria-label={`Hoàn thành buổi tập với ${session.memberName}`}
                                disabled={isLoading}
                                onClick={() =>
                                  void handleUpdateStatus(session.sessionId, 'completed')
                                }
                                className="rogym-inline-action rogym-inline-action--complete"
                                data-no-sweep
                              >
                                <CheckCircle size={12} />
                                Hoàn thành
                              </button>
                            )}
                          </div>
                        )}
                        <Link
                          to={`/trainer/sessions/${session.sessionId}`}
                          className="rogym-text-link rogym-text-link--accent text-xs"
                          aria-label={`Chi tiết buổi tập với ${session.memberName}`}
                        >
                          Chi tiết
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <section className="rogym-card rogym-card--compact p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Lịch 7 ngày tới</h2>
                <Link className="rogym-text-link rogym-text-link--accent" to="/trainer/sessions">
                  Xem tất cả
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <TrainerEmptyState title="Chưa có lịch sắp tới" />
              ) : (
                <div className="space-y-3">
                  {upcoming.slice(0, 6).map((session) => (
                    <Link
                      key={session.sessionId}
                      to={`/trainer/sessions/${session.sessionId}`}
                      className="rogym-upcoming-session flex items-center justify-between gap-4 rounded-xl p-4"
                    >
                      <div>
                        <div className="font-semibold rogym-text-primary">{session.memberName}</div>
                        <div className="mt-1 text-xs rogym-text-muted">
                          {formatDateTime(session.startTime)} · {session.roomName}
                        </div>
                      </div>
                      <TrainerStatusBadge status={session.status} />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rogym-card rogym-card--compact p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Gói sắp hết hạn</h2>
                <Link className="rogym-text-link rogym-text-link--accent" to="/trainer/students">
                  Học viên
                </Link>
              </div>
              {expiringStudents.length === 0 ? (
                <TrainerEmptyState title="Không có gói sắp hết hạn" />
              ) : (
                <div className="space-y-3">
                  {expiringStudents.slice(0, 6).map((student) => (
                    <Link
                      key={student.memberId}
                      to={`/trainer/students/${student.memberId}`}
                      className="rogym-upcoming-session block rounded-xl p-4"
                    >
                      <div className="font-semibold rogym-text-primary">{student.fullName}</div>
                      <div className="mt-1 text-xs rogym-tone-text" data-tone="warning">
                        Hết hạn {formatDate(student.activeSubscription?.endDate)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLink to="/trainer/sessions/create" label="Tạo buổi tập" />
            <QuickLink
              to={
                students[0]
                  ? `/trainer/students/${students[0].memberId}/progress`
                  : '/trainer/students'
              }
              label="Ghi tiến độ"
            />
            <QuickLink to="/trainer/plans" label="Tạo giáo án" />
            <QuickLink to="/trainer/calendar" label="Mở lịch biểu" />
          </section>
        </>
      )}
    </TrainerPage>
  )
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link className="rogym-btn rogym-btn--outline-white w-full py-4" to={to}>
      {label}
    </Link>
  )
}

function formatLocalDay(value: string): string {
  return LOCAL_DAY_FORMATTER.format(new Date(value))
}

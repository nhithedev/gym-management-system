import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle2, Clock3, Plus, Users } from 'lucide-react'
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

export default function TrainerDashboardPage() {
  const [students, setStudents] = useState<TrainerStudentSummary[]>([])
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const today = todayInput()
  const todaySessions = sessions.filter((item) => formatLocalDay(item.startTime) === today)
  const completedThisMonth = sessions.filter((item) => item.status === 'completed').length
  const upcoming = sessions
    .filter((item) => item.status === 'scheduled' && new Date(item.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  const expiringStudents = useMemo(
    () =>
      students.filter((student) => {
        const endDate = student.activeSubscription?.endDate
        if (!endDate) return false
        const days = (new Date(endDate).getTime() - Date.now()) / 86400000
        return days >= 0 && days <= 14
      }),
    [students]
  )

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
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.025] p-4"
                    >
                      <div>
                        <div className="font-semibold text-white">{session.memberName}</div>
                        <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">
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
                      className="block rounded-xl border border-white/5 p-4"
                    >
                      <div className="font-semibold text-white">{student.fullName}</div>
                      <div className="mt-1 text-xs text-amber-200">
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
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

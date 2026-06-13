import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle2, MessageSquare, Users } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { endOfLocalDayIso, formatDate, formatTime, startOfLocalDayIso, todayInput } from '@/lib/date'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import { memberService } from '@/services/member.service'
import { staffService, type StaffProfile, type StaffSchedule } from '@/services/staff.service'
import { trainingService, type AttendanceLog } from '@/services/training.service'
import {
  StaffEmptyState,
  StaffErrorState,
  StaffPage,
  StaffPageHeader,
  StaffSkeleton,
  StaffStatCard,
  StaffStatusBadge,
} from '@/components/StaffUI'

export default function StaffDashboardPage() {
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [attendance, setAttendance] = useState<AttendanceLog[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const today = todayInput()
    Promise.all([
      staffService.getMe(),
      trainingService.getAttendance({ from: startOfLocalDayIso(today), to: endOfLocalDayIso(today), pageSize: 50 }),
      feedbackService.list({ pageSize: 30, sort: 'createdAt:desc' }),
      memberService.list({ pageSize: 1 }),
    ])
      .then(async ([profileData, attendanceResult, feedbackResult, memberResult]) => {
        setProfile(profileData)
        setAttendance(attendanceResult.data)
        setFeedbacks(feedbackResult.data)
        setMemberTotal(memberResult.total)
        try {
          setSchedules(await staffService.getSchedules(profileData.staffId))
        } catch {
          // lịch làm việc không bắt buộc
        }
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải tổng quan.')))
      .finally(() => setLoading(false))
  }, [])

  const todaySchedule = useMemo(() => {
    const today = todayInput()
    return schedules.filter((s) => s.workDate.slice(0, 10) === today)
  }, [schedules])

  const pendingFeedback = useMemo(
    () => feedbacks.filter((f) => f.status === 'open' || f.status === 'in_progress'),
    [feedbacks]
  )

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Staff workspace"
        title="Tổng quan hôm nay"
        description={`Xin chào${profile ? `, ${profile.fullName}` : ''}. Đây là tình trạng hoạt động hôm nay.`}
        actions={
          <>
            <Link className="rogym-btn rogym-btn--outline-white" to="/staff/check-in">
              <CheckCircle2 size={16} /> Check-in hội viên
            </Link>
            <Link className="rogym-btn rogym-btn--primary" to="/staff/feedback">
              <MessageSquare size={16} /> Xử lý phản hồi
            </Link>
          </>
        }
      />

      {loading ? (
        <StaffSkeleton rows={6} />
      ) : error ? (
        <StaffErrorState message={error} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaffStatCard
              icon={<Users size={20} />}
              label="Tổng hội viên"
              value={memberTotal}
            />
            <StaffStatCard
              icon={<CheckCircle2 size={20} />}
              label="Check-in hôm nay"
              value={attendance.length}
              hint="Lượt vào trong ngày"
            />
            <StaffStatCard
              icon={<MessageSquare size={20} />}
              label="Phản hồi cần xử lý"
              value={pendingFeedback.length}
              hint={
                pendingFeedback.length > 0
                  ? `${feedbacks.filter(f => f.status === 'open').length} mới · ${feedbacks.filter(f => f.status === 'in_progress').length} đang xử lý`
                  : 'Tất cả đã xử lý'
              }
            />
            <StaffStatCard
              icon={<CalendarDays size={20} />}
              label="Ca làm hôm nay"
              value={todaySchedule.length > 0 ? shiftLabel(todaySchedule[0].shift) : 'Không có'}
              hint={
                todaySchedule.length > 1
                  ? todaySchedule.slice(1).map(s => shiftLabel(s.shift)).join(' · ')
                  : todaySchedule.length === 1
                    ? shiftTime(todaySchedule[0].shift)
                    : 'Không có lịch làm'
              }
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <section className="rogym-card rogym-card--compact p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Check-in hôm nay</h2>
                <Link className="rogym-text-link rogym-text-link--accent" to="/staff/check-in">
                  Xem tất cả
                </Link>
              </div>
              {attendance.length === 0 ? (
                <StaffEmptyState title="Chưa có check-in hôm nay" />
              ) : (
                <div className="space-y-2">
                  {attendance.slice(0, 8).map((log) => (
                    <div
                      key={log.attendanceId}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.025] p-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">{log.memberName}</div>
                        <div className="mt-0.5 text-xs text-[var(--rogym-text-dim)]">
                          {log.memberCode}
                        </div>
                      </div>
                      <div className="text-right text-xs text-[var(--rogym-text-secondary)]">
                        {formatTime(log.startTime)}
                        {log.endTime && ` – ${formatTime(log.endTime)}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rogym-card rogym-card--compact p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Phản hồi cần xử lý</h2>
                <Link className="rogym-text-link rogym-text-link--accent" to="/staff/feedback">
                  Xem tất cả
                </Link>
              </div>
              {pendingFeedback.length === 0 ? (
                <StaffEmptyState title="Không có phản hồi mới" />
              ) : (
                <div className="space-y-2">
                  {pendingFeedback.slice(0, 6).map((fb) => (
                    <div
                      key={fb.feedbackId}
                      className="rounded-xl border border-white/5 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-medium text-white line-clamp-2">
                          {fb.content}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StaffStatusBadge status={fb.status} />
                          <StaffStatusBadge
                            status={fb.severity}
                            tone={
                              fb.severity === 'high'
                                ? 'danger'
                                : fb.severity === 'medium'
                                  ? 'warning'
                                  : 'muted'
                            }
                          />
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">
                        {formatDate(fb.createdAt)} · {feedbackTypeLabel(fb.feedbackType)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLink to="/staff/members" label="Danh sách người dùng" />
            <QuickLink to="/staff/check-in" label="Check-in thủ công" />
            <QuickLink to="/staff/feedback" label="Xử lý phản hồi" />
            <QuickLink to="/staff/equipment" label="Báo cáo thiết bị" />
          </section>
        </>
      )}
    </StaffPage>
  )
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link className="rogym-btn rogym-btn--outline-white w-full py-4" to={to}>
      {label}
    </Link>
  )
}

function shiftLabel(shift: StaffSchedule['shift']) {
  if (shift === 'morning') return 'Ca sáng'
  if (shift === 'afternoon') return 'Ca chiều'
  return 'Ca tối'
}

function shiftTime(shift: StaffSchedule['shift']) {
  if (shift === 'morning') return '06:00 – 12:00'
  if (shift === 'afternoon') return '12:00 – 18:00'
  return '18:00 – 22:00'
}

function feedbackTypeLabel(type: string) {
  if (type === 'staff') return 'Nhân viên'
  if (type === 'equipment') return 'Thiết bị'
  return 'Dịch vụ'
}

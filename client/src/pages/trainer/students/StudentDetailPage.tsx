import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CalendarPlus, ClipboardList, Plus, TrendingUp } from 'lucide-react'
import { DatePickerInput } from '@/components/DatePickerInput'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getApiError } from '@/lib/api-error'
import { formatDate, formatDateTime, todayInput } from '@/lib/date'
import {
  memberService,
  type MemberProgress,
  type TrainerStudentDetail,
} from '@/services/member.service'
import { trainingService, type TrainingSession } from '@/services/training.service'
import workoutService, {
  type WorkoutAssignmentSummary,
  type WorkoutPlan,
} from '@/services/workout.service'
import {
  SubmitButton,
  TrainerEmptyState,
  TrainerErrorState,
  TrainerModal,
  TrainerPage,
  TrainerPageHeader,
  TrainerSelect,
  TrainerSkeleton,
  TrainerStatusBadge,
} from '@/components/TrainerUI'

type Tab = 'overview' | 'sessions' | 'progress' | 'workout'

export default function StudentDetailPage() {
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) || 'overview'
  const [student, setStudent] = useState<TrainerStudentDetail | null>(null)
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [progress, setProgress] = useState<MemberProgress[]>([])
  const [assignments, setAssignments] = useState<WorkoutAssignmentSummary[]>([])
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null)
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignPlanId, setAssignPlanId] = useState('')
  const [assignDate, setAssignDate] = useState(todayInput())
  const [assignNotes, setAssignNotes] = useState('')
  const [assigning, setAssigning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [studentData, sessionResult, progressData, assignmentData, planData] =
        await Promise.all([
          memberService.getById(id),
          trainingService.getSessions({ memberId: id, pageSize: 100, sort: 'start_time:desc' }),
          memberService.getProgress(id, { limit: 100 }),
          workoutService.getAssignments(id, { limit: 20 }),
          workoutService.getPlans(),
        ])
      setStudent(studentData)
      setSessions(sessionResult.data)
      setProgress(progressData)
      setAssignments(assignmentData)
      setPlans(planData.filter((plan) => plan.status === 'active'))
      const activeAssignment = assignmentData.find((item) => item.status === 'active')
      setActivePlan(activeAssignment ? await workoutService.getPlan(activeAssignment.planId) : null)
    } catch (err) {
      setError(getApiError(err, 'Không thể tải chi tiết học viên.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const chartData = useMemo(
    () =>
      [...progress].reverse().map((item) => ({
        date: formatDate(item.recordedAt),
        weight: item.weight ? Number(item.weight) : null,
        bmi: item.bmi ? Number(item.bmi) : null,
      })),
    [progress]
  )
  const activeSubscription = student?.subscriptions.find((item) => item.status === 'active') ?? null
  const upcomingSession = [...sessions]
    .filter((item) => item.status === 'scheduled' && new Date(item.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]
  const latestProgress = progress[0]

  function selectTab(nextTab: Tab) {
    const next = new URLSearchParams(searchParams)
    next.set('tab', nextTab)
    setSearchParams(next)
  }

  async function handleAssign(event: FormEvent) {
    event.preventDefault()
    if (!assignPlanId) return
    setAssigning(true)
    setError(null)
    try {
      await workoutService.assignPlan(id, {
        planId: Number(assignPlanId),
        startDate: assignDate,
        notes: assignNotes.trim() || undefined,
      })
      setAssignOpen(false)
      setAssignNotes('')
      await load()
      selectTab('workout')
    } catch (err) {
      setError(getApiError(err, 'Không thể gán kế hoạch tập.'))
    } finally {
      setAssigning(false)
    }
  }

  if (loading)
    return (
      <TrainerPage>
        <TrainerSkeleton rows={6} />
      </TrainerPage>
    )
  if (error && !student)
    return (
      <TrainerPage>
        <TrainerErrorState message={error} onRetry={load} />
      </TrainerPage>
    )
  if (!student) return null

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow={student.memberCode}
        title={student.fullName}
        description={`${student.email} · ${student.phone ?? 'Chưa có số điện thoại'}`}
        actions={
          <>
            <Link
              className="rogym-btn rogym-btn--outline-white"
              to={`/trainer/sessions/create?memberId=${id}`}
            >
              <CalendarPlus size={16} /> Tạo buổi tập
            </Link>
            <Link className="rogym-btn rogym-btn--primary" to={`/trainer/students/${id}/progress`}>
              <TrendingUp size={16} /> Ghi tiến độ
            </Link>
          </>
        }
      />
      {error && <TrainerErrorState message={error} onRetry={load} />}

      <div className="flex gap-2 overflow-x-auto border-b border-white/5 pb-3">
        {(
          [
            ['overview', 'Tổng quan'],
            ['sessions', 'Buổi tập'],
            ['progress', 'Tiến độ'],
            ['workout', 'Giáo án'],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={
              tab === key
                ? 'rogym-btn rogym-btn--primary whitespace-nowrap'
                : 'rogym-btn rogym-btn--outline-white whitespace-nowrap'
            }
            onClick={() => selectTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-5 text-lg font-bold text-white">Hồ sơ cá nhân</h2>
            <Info label="Mã hội viên" value={student.memberCode} />
            <Info label="Email" value={student.email} />
            <Info label="Điện thoại" value={student.phone ?? 'Chưa cập nhật'} />
            <Info label="Ngày sinh" value={formatDate(student.dateOfBirth)} />
            <Info label="Địa chỉ" value={student.address ?? 'Chưa cập nhật'} />
          </section>
          <section className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-5 text-lg font-bold text-white">Tình trạng tập luyện</h2>
            <Info
              label="Gói hiện tại"
              value={activeSubscription?.packageName ?? 'Chưa có gói active'}
            />
            <Info label="Hết hạn" value={formatDate(activeSubscription?.endDate)} />
            <Info label="Buổi tiếp theo" value={formatDateTime(upcomingSession?.startTime)} />
            <Info
              label="Cân nặng mới nhất"
              value={
                latestProgress?.weight
                  ? `${Number(latestProgress.weight).toFixed(1)} kg`
                  : 'Chưa ghi'
              }
            />
            <Info label="Mục tiêu" value={latestProgress?.goal ?? 'Chưa ghi'} />
          </section>
        </div>
      )}

      {tab === 'sessions' &&
        (sessions.length === 0 ? (
          <TrainerEmptyState
            title="Chưa có buổi tập"
            action={
              <Link
                className="rogym-btn rogym-btn--primary"
                to={`/trainer/sessions/create?memberId=${id}`}
              >
                Tạo buổi đầu tiên
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3">
            {sessions.map((session) => (
              <Link
                key={session.sessionId}
                to={`/trainer/sessions/${session.sessionId}`}
                className="rogym-card rogym-card--compact flex items-center justify-between gap-4 p-5"
              >
                <div>
                  <div className="font-semibold text-white">
                    {formatDateTime(session.startTime)}
                  </div>
                  <div className="mt-1 text-sm text-[var(--rogym-text-secondary)]">
                    {session.roomName ?? 'Chưa có phòng'}
                  </div>
                </div>
                <TrainerStatusBadge status={session.status} />
              </Link>
            ))}
          </div>
        ))}

      {tab === 'progress' && (
        <div className="space-y-5">
          <div className="flex justify-end gap-3">
            <Link
              className="rogym-text-link rogym-text-link--accent"
              to={`/trainer/students/${id}/progress/list`}
            >
              Xem bảng đầy đủ
            </Link>
            <Link className="rogym-btn rogym-btn--primary" to={`/trainer/students/${id}/progress`}>
              <Plus size={15} /> Ghi mới
            </Link>
          </div>
          {progress.length === 0 ? (
            <TrainerEmptyState title="Chưa có dữ liệu tiến độ" />
          ) : (
            <>
              <div className="rogym-card rogym-card--compact h-80 p-5">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#8ab89c" fontSize={11} />
                    <YAxis yAxisId="weight" stroke="#42e09e" fontSize={11} />
                    <YAxis yAxisId="bmi" orientation="right" stroke="#bbcabf" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f1c16',
                        border: '1px solid rgba(66,224,158,0.2)',
                        borderRadius: 12,
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="weight"
                      type="monotone"
                      dataKey="weight"
                      name="Cân nặng"
                      stroke="#42e09e"
                      strokeWidth={2}
                      connectNulls
                    />
                    <Line
                      yAxisId="bmi"
                      type="monotone"
                      dataKey="bmi"
                      name="BMI"
                      stroke="#bbcabf"
                      strokeWidth={2}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'workout' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              type="button"
              className="rogym-btn rogym-btn--primary"
              onClick={() => setAssignOpen(true)}
            >
              <ClipboardList size={16} /> Gán giáo án mới
            </button>
          </div>
          {!activePlan ? (
            <TrainerEmptyState
              title="Chưa có giáo án active"
              description="Gán một kế hoạch đang active cho học viên này."
            />
          ) : (
            <section className="rogym-card rogym-card--compact p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{activePlan.name}</h2>
                  <p className="mt-2 text-sm text-[var(--rogym-text-secondary)]">
                    {activePlan.description ?? 'Không có mô tả'}
                  </p>
                </div>
                <TrainerStatusBadge status="active" />
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {activePlan.days?.map((day) => (
                  <div
                    key={day.planDayId}
                    className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                  >
                    <div className="font-semibold text-white">
                      {day.dayNumber}. {day.name}
                    </div>
                    <div className="mt-3 space-y-2">
                      {day.exercises?.map((item) => (
                        <div
                          key={item.planExerciseId}
                          className="rounded-xl bg-black/15 p-3 text-sm"
                        >
                          <div className="font-medium text-white">
                            {item.exercise?.name ?? 'Bài tập'}
                          </div>
                          <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">
                            {item.targetSets} sets ·{' '}
                            {item.targetReps
                              ? `${item.targetReps} reps`
                              : `${item.targetDurationSec ?? 0}s`}
                            {item.targetWeightKg ? ` · ${Number(item.targetWeightKg)}kg` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {assignments.length > 1 && (
            <section className="rogym-card rogym-card--compact p-6">
              <h2 className="mb-4 text-lg font-bold text-white">Lịch sử gán giáo án</h2>
              <div className="space-y-3">
                {assignments
                  .filter((item) => item.status !== 'active')
                  .map((item) => (
                    <div
                      key={item.assignmentId}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/5 p-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">
                          {item.plan?.name ?? 'Giáo án đã xóa'}
                        </div>
                        <div className="text-xs text-[var(--rogym-text-dim)]">
                          Bắt đầu {formatDate(item.startDate)}
                        </div>
                      </div>
                      <TrainerStatusBadge status={item.status} />
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>
      )}

      <TrainerModal
        open={assignOpen}
        title="Gán giáo án"
        onClose={() => setAssignOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setAssignOpen(false)}
            >
              Hủy
            </button>
            <SubmitButton form="assign-plan-form" loading={assigning} disabled={!assignPlanId}>
              Gán giáo án
            </SubmitButton>
          </>
        }
      >
        <form id="assign-plan-form" className="space-y-4" onSubmit={handleAssign}>
          <label className="block space-y-2">
            <span className="rogym-field-label">Kế hoạch active</span>
            <TrainerSelect value={assignPlanId} onValueChange={setAssignPlanId} required>
              <option value="">Chọn kế hoạch</option>
              {plans.map((plan) => (
                <option key={plan.planId} value={plan.planId}>
                  {plan.name}
                </option>
              ))}
            </TrainerSelect>
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Ngày bắt đầu</span>
            <DatePickerInput value={assignDate} onChange={(value) => setAssignDate(value)} />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Ghi chú</span>
            <textarea
              className="rogym-input min-h-24"
              value={assignNotes}
              onChange={(event) => setAssignNotes(event.target.value)}
            />
          </label>
          <p className="text-xs leading-5 text-amber-200">
            Giáo án active hiện tại sẽ tự động chuyển sang trạng thái đã thay thế.
          </p>
          <button type="submit" className="hidden" />
        </form>
      </TrainerModal>
    </TrainerPage>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-white/5 py-3 last:border-0">
      <span className="text-sm text-[var(--rogym-text-dim)]">{label}</span>
      <span className="text-right text-sm font-medium text-white">{value}</span>
    </div>
  )
}

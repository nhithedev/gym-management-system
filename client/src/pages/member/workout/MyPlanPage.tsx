import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Dumbbell,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react'
import {
  MemberEmptyState,
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '../components/MemberUI'
import workoutService, {
  type WorkoutAssignmentSummary,
  type WorkoutPlan,
  type WorkoutLog,
} from '@/services/workout.service'
import { useAuthStore } from '@/stores/authStore'

const G = '#06c384'
const T = '#42e09e'
const BG_CARD = '#0f1c16'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        background: BG_CARD,
        border: '1px solid rgba(66,224,158,0.10)',
        borderRadius: 20,
        padding: '18px 22px',
      }}
    >
      <p className="text-xs font-semibold uppercase" style={{ color: T, letterSpacing: '0.12em' }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs" style={{ color: '#8ab89c' }}>{sub}</p>}
    </div>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: G }} />
    </div>
  )
}

export default function MyPlanPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const memberId = user?.memberId ? String(user.memberId) : undefined

  const [assignment, setAssignment] = useState<WorkoutAssignmentSummary | null>(null)
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!memberId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const assignments = await workoutService.getAssignments(memberId, {
        status: 'active',
        limit: 1,
      })
      if (assignments.length === 0) {
        setAssignment(null)
        setPlan(null)
        setLogs([])
        return
      }
      const active = assignments[0]
      setAssignment(active)
      try {
        const [fullPlan, planLogs] = await Promise.all([
          workoutService.getPlan(active.planId),
          workoutService.getLogs({ assignmentId: active.assignmentId }),
        ])
        setPlan(fullPlan)
        setLogs(planLogs)
      } catch {
        // Plan detail failed — show assignment without full plan data
        setError('Không thể tải chi tiết kế hoạch.')
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      // Treat 403/404 or no-data errors as "no active plan" instead of hard error
      if (status === 403 || status === 404) {
        setAssignment(null)
        setPlan(null)
      } else {
        setError('Không thể tải kế hoạch tập.')
      }
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load])

  const totalExercises = useMemo(
    () => plan?.days?.reduce((s, d) => s + (d.exercises?.length ?? 0), 0) ?? 0,
    [plan]
  )
  const completionPct = useMemo(() => {
    const total = plan?.days?.length ?? 0
    if (!total) return 0
    return Math.min(100, Math.round((logs.length / total) * 100))
  }, [plan, logs])

  const isPTAssigned = Boolean(assignment?.assignedByStaffId)

  function toggleDay(id: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function deletePlan() {
    if (!assignment || !plan) return
    setDeleting(true)
    try {
      await workoutService.deletePlan(plan.planId)
      setDeleteConfirm(false)
      await load()
    } catch {
      setError('Không thể xóa kế hoạch. Hãy thử lại.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Kế hoạch tập"
        title="Kế hoạch của tôi"
        description="Xem và thực hiện kế hoạch tập luyện hiện tại"
        actions={
          !loading && !isPTAssigned && plan ? (
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => navigate('/member/workout/builder')}
            >
              <Pencil size={15} /> Tạo plan mới
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <MemberSkeleton rows={6} />
      ) : error ? (
        <MemberErrorState message={error} onRetry={load} />
      ) : !assignment || !plan ? (
        <MemberEmptyState
          title="Bạn chưa có kế hoạch tập"
          description="Tạo kế hoạch cá nhân hoặc liên hệ PT để được giao kế hoạch phù hợp."
          action={
            <button
              type="button"
              className="rogym-btn rogym-btn--primary"
              onClick={() => navigate('/member/workout/builder')}
            >
              <Dumbbell size={15} /> Tạo plan cá nhân
            </button>
          }
        />
      ) : (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Ngày tập" value={plan.days?.length ?? 0} />
            <StatCard label="Tổng bài tập" value={totalExercises} />
            <StatCard label="Buổi đã log" value={logs.length} />
            <div
              style={{
                background: BG_CARD,
                border: '1px solid rgba(66,224,158,0.10)',
                borderRadius: 20,
                padding: '18px 22px',
              }}
            >
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: T, letterSpacing: '0.12em' }}
              >
                Hoàn thành
              </p>
              <p className="mt-2 text-2xl font-bold text-white">{completionPct}%</p>
              <ProgressBar value={logs.length} max={plan.days?.length ?? 1} />
            </div>
          </div>

          {/* Plan header */}
          <div
            style={{
              background: BG_CARD,
              border: '1px solid rgba(66,224,158,0.10)',
              borderRadius: 20,
              padding: '20px 24px',
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                  <span
                    style={{
                      padding: '2px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: isPTAssigned ? `${T}22` : 'rgba(255,255,255,0.08)',
                      color: isPTAssigned ? T : '#bbcabf',
                      border: `1px solid ${isPTAssigned ? T + '44' : 'rgba(255,255,255,0.15)'}`,
                    }}
                  >
                    {isPTAssigned ? 'Do PT giao' : 'Cá nhân'}
                  </span>
                </div>
                {plan.description && (
                  <p className="mt-1 text-sm" style={{ color: '#bbcabf' }}>
                    {plan.description}
                  </p>
                )}
              </div>
              {!isPTAssigned && (
                <div className="flex gap-2">
                  {!deleteConfirm ? (
                    <button
                      type="button"
                      className="rogym-btn rogym-btn--danger"
                      onClick={() => setDeleteConfirm(true)}
                    >
                      <Trash2 size={14} /> Xóa plan
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2">
                      <span className="text-xs text-red-200">Xác nhận xóa?</span>
                      <button
                        type="button"
                        className="rogym-btn rogym-btn--danger px-3 py-1 text-xs"
                        disabled={deleting}
                        onClick={() => void deletePlan()}
                      >
                        {deleting ? 'Đang xóa...' : 'Xóa'}
                      </button>
                      <button
                        type="button"
                        className="rogym-btn rogym-btn--outline-white px-3 py-1 text-xs"
                        onClick={() => setDeleteConfirm(false)}
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Days accordion */}
          <div className="space-y-3">
            {[...(plan.days ?? [])]
              .sort((a, b) => a.dayNumber - b.dayNumber)
              .map((day) => {
                const expanded = expandedDays.has(day.planDayId)
                const loggedThisDay = logs.some((l) => l.planDayId === day.planDayId)
                return (
                  <div
                    key={day.planDayId}
                    style={{
                      background: BG_CARD,
                      border: `1px solid ${loggedThisDay ? G + '33' : 'rgba(66,224,158,0.10)'}`,
                      borderRadius: 16,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Day header */}
                    <div
                      className="flex cursor-pointer items-center justify-between p-4"
                      onClick={() => toggleDay(day.planDayId)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                          style={{
                            background: loggedThisDay ? `${G}22` : 'rgba(255,255,255,0.06)',
                            color: loggedThisDay ? G : '#bbcabf',
                          }}
                        >
                          {day.dayNumber}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{day.name}</p>
                          <p className="text-xs" style={{ color: '#8ab89c' }}>
                            {day.exercises?.length ?? 0} bài tập
                            {loggedThisDay && (
                              <span style={{ color: G }} className="ml-2">
                                · Đã log
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rogym-btn rogym-btn--primary px-3 py-1.5 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/member/workout/session/${day.planDayId}`)
                          }}
                        >
                          <Play size={13} /> Bắt đầu
                        </button>
                        <span style={{ color: '#8ab89c' }}>
                          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </span>
                      </div>
                    </div>

                    {/* Day exercises */}
                    {expanded && (
                      <div
                        className="space-y-2 px-4 pb-4"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        {day.exercises?.length ? (
                          [...day.exercises]
                            .sort((a, b) => a.orderIndex - b.orderIndex)
                            .map((ex, idx) => (
                              <div
                                key={ex.planExerciseId}
                                className="flex items-center gap-3 pt-3"
                              >
                                <div
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                                  style={{
                                    background: 'rgba(66,224,158,0.10)',
                                    color: T,
                                  }}
                                >
                                  {idx + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-white">
                                    {ex.exercise?.name ?? 'Bài tập'}
                                  </p>
                                  <p className="mt-0.5 text-xs" style={{ color: '#8ab89c' }}>
                                    {ex.targetSets} sets ·{' '}
                                    {ex.targetReps
                                      ? `${ex.targetReps} reps`
                                      : `${ex.targetDurationSec ?? 0} giây`}
                                    {ex.targetWeightKg
                                      ? ` · ${Number(ex.targetWeightKg)} kg`
                                      : ''}
                                  </p>
                                </div>
                                {ex.exercise?.muscleGroup && (
                                  <span
                                    className="shrink-0 text-xs"
                                    style={{ color: '#8ab89c' }}
                                  >
                                    {ex.exercise.muscleGroup}
                                  </span>
                                )}
                              </div>
                            ))
                        ) : (
                          <p className="py-3 text-sm" style={{ color: '#8ab89c' }}>
                            Ngày này chưa có bài tập.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>

          {!plan.days?.length && (
            <div className="py-4 text-center">
              <ClipboardList size={32} className="mx-auto mb-2" style={{ color: '#8ab89c' }} />
              <p className="text-sm" style={{ color: '#8ab89c' }}>
                Kế hoạch chưa có ngày tập.
              </p>
            </div>
          )}
        </div>
      )}
    </MemberPage>
  )
}

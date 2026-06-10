import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ClipboardList,
  Dumbbell,
  List,
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
} from '@/services/workout.service'
import { useAuthStore } from '@/stores/authStore'

const G = '#06c384'
const T = '#42e09e'
const BG_CARD = '#0f1c16'

// ── Plan card ──────────────────────────────────────────────────────────────────

function PlanCard({
  assignment,
  plan,
  canEdit,
  onDelete,
}: {
  assignment: WorkoutAssignmentSummary
  plan: WorkoutPlan | null
  canEdit: boolean
  onDelete: () => void
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isPT = !!assignment.assignedByStaffId
  const totalDays = plan?.days?.length ?? assignment.plan?.days?.length ?? 0
  const totalExercises = plan?.days?.reduce((s, d) => s + (d.exercises?.length ?? 0), 0) ?? 0

  // Compute estimated minutes per day from exercise data
  const totalEstSec = plan?.days?.reduce((s, d) =>
    s + (d.exercises?.reduce((es, ex) => {
      const setTime = (ex.targetDurationSec ?? 30) * ex.targetSets
      const restTime = (ex.restSeconds ?? 60) * (ex.targetSets - 1)
      return es + setTime + restTime
    }, 0) ?? 0), 0) ?? 0
  const avgMinPerDay = totalDays > 0 ? Math.round(totalEstSec / totalDays / 60) : 0

  async function handleDelete() {
    if (!plan) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await workoutService.deletePlan(plan.planId)
      setDeleteConfirm(false)
      onDelete()
    } catch {
      setDeleteError('Không thể xóa kế hoạch.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="rogym-card rogym-card--md"
      style={{
        overflow: 'hidden',
        padding: 0,
        ...(isPT ? { borderColor: G + '33' } : {}),
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: isPT ? `${G}22` : `${T}18`,
                  color: isPT ? G : T,
                }}
              >
                {isPT ? 'PT giao' : 'Cá nhân'}
              </span>
              <h3 className="truncate font-bold text-white">
                {assignment.plan?.name ?? plan?.name ?? '—'}
              </h3>
            </div>
            {plan?.description && (
              <p className="mt-1 text-xs" style={{ color: '#8ab89c' }}>
                {plan.description}
              </p>
            )}
            <div className="mt-2 flex gap-3 text-xs" style={{ color: '#8ab89c' }}>
              <span>
                <span className="font-semibold text-white">{totalDays}</span> ngày
              </span>
              {totalExercises > 0 && (
                <span>
                  <span className="font-semibold text-white">{totalExercises}</span> bài tập
                </span>
              )}
              {avgMinPerDay > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  <span className="font-semibold text-white">{avgMinPerDay}</span> phút/ngày (ước tính)
                </span>
              )}
            </div>
          </div>

          {canEdit && !deleteConfirm && (
            <button
              type="button"
              className="rogym-btn rogym-btn--icon rogym-btn--elevated shrink-0"
              onClick={() => setDeleteConfirm(true)}
              aria-label="Xóa plan"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {deleteConfirm && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2">
            <span className="flex-1 text-xs text-red-200">Xóa kế hoạch này?</span>
            <button
              type="button"
              className="rogym-btn rogym-btn--danger px-3 py-1 text-xs"
              disabled={deleting}
              onClick={() => void handleDelete()}
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
        {deleteError && <p className="mt-2 text-xs text-red-300">{deleteError}</p>}

        <button
          type="button"
          className="rogym-text-link rogym-text-link--accent mt-3 flex items-center gap-1 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Ẩn chi tiết' : 'Xem chi tiết ngày tập'}
        </button>
      </div>

      {expanded && plan?.days && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[...plan.days]
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map((day) => (
              <div
                key={day.planDayId}
                className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div>
                  <p className="text-sm font-medium text-white">{day.name}</p>
                  <p className="text-xs" style={{ color: '#8ab89c' }}>
                    {day.exercises?.length ?? 0} bài tập
                  </p>
                </div>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary px-3 py-1.5 text-xs"
                  onClick={() => navigate(`/member/workout/session/${day.planDayId}`)}
                >
                  <Play size={12} /> Bắt đầu
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MyPlanPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const memberId = user?.memberId ? String(user.memberId) : undefined

  const [assignments, setAssignments] = useState<WorkoutAssignmentSummary[]>([])
  const [fullPlans, setFullPlans] = useState<Map<string, WorkoutPlan>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!memberId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const all = await workoutService.getAssignments(memberId)
      setAssignments(all)

      const active = all.filter((a) => a.status === 'active')
      const pairs = await Promise.all(
        active.map(async (a) => {
          try {
            const plan = await workoutService.getPlan(a.planId)
            return [a.planId, plan] as const
          } catch {
            return null
          }
        })
      )
      const planMap = new Map<string, WorkoutPlan>()
      for (const pair of pairs) {
        if (pair) planMap.set(pair[0], pair[1])
      }
      setFullPlans(planMap)
    } catch {
      setError('Không thể tải kế hoạch tập.')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => { void load() }, [load])

  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.status === 'active'),
    [assignments]
  )
  const ptPlans = useMemo(
    () => activeAssignments.filter((a) => !!a.assignedByStaffId),
    [activeAssignments]
  )
  const selfPlans = useMemo(
    () => activeAssignments.filter((a) => !a.assignedByStaffId),
    [activeAssignments]
  )

  if (loading) return (
    <MemberPage>
      <MemberPageHeader eyebrow="Kế hoạch tập" title="Kế hoạch của tôi" />
      <MemberSkeleton rows={6} />
    </MemberPage>
  )

  if (error) return (
    <MemberPage>
      <MemberPageHeader eyebrow="Kế hoạch tập" title="Kế hoạch của tôi" />
      <MemberErrorState message={error} onRetry={load} />
    </MemberPage>
  )

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Kế hoạch tập"
        title="Kế hoạch của tôi"
        description="Kế hoạch từ PT và kế hoạch tự xây dựng của bạn"
        actions={
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={() => navigate('/member/workout/builder')}
          >
            <Dumbbell size={15} /> Tạo plan mới
          </button>
        }
      />

      {activeAssignments.length === 0 ? (
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
        <div className="grid gap-6 xl:grid-cols-2">
          {/* PT assigned */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList size={16} style={{ color: G }} />
              <h2 className="text-sm font-bold text-white">Do PT giao</h2>
              <span className="text-xs" style={{ color: '#8ab89c' }}>({ptPlans.length})</span>
            </div>
            {ptPlans.length === 0 ? (
              <div
                className="rounded-[16px] p-5 text-center text-sm"
                style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.06)', color: '#8ab89c' }}
              >
                Chưa có kế hoạch nào từ PT.
              </div>
            ) : (
              <div className="space-y-4">
                {ptPlans.map((a) => (
                  <PlanCard
                    key={a.assignmentId}
                    assignment={a}
                    plan={fullPlans.get(a.planId) ?? null}
                    canEdit={false}
                    onDelete={load}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Self built */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <List size={16} style={{ color: T }} />
              <h2 className="text-sm font-bold text-white">Kế hoạch cá nhân</h2>
              <span className="text-xs" style={{ color: '#8ab89c' }}>({selfPlans.length})</span>
            </div>
            {selfPlans.length === 0 ? (
              <div
                className="rounded-[16px] p-5 text-center text-sm"
                style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.06)', color: '#8ab89c' }}
              >
                Chưa có kế hoạch tự xây dựng.
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary mt-3 mx-auto flex"
                  onClick={() => navigate('/member/workout/builder')}
                >
                  <Dumbbell size={14} /> Tạo ngay
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {selfPlans.map((a) => (
                  <PlanCard
                    key={a.assignmentId}
                    assignment={a}
                    plan={fullPlans.get(a.planId) ?? null}
                    canEdit={true}
                    onDelete={load}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </MemberPage>
  )
}

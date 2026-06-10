import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, Clock, Dumbbell, Plus, Search, SlidersHorizontal, Trash2, X, Zap } from 'lucide-react'
import {
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '../components/MemberUI'
import workoutService, {
  type Exercise,
  type WorkoutPlan,
  type WorkoutPlanDay,
} from '@/services/workout.service'
import { useAuthStore } from '@/stores/authStore'
import { ExerciseCategoryFilterPopover } from '@/components/workout/ExerciseUI'
import {
  filterExercises,
  type ExerciseCategoryFilter,
} from '@/components/workout/exercise-data'
import { ExerciseTargetFields } from '@/components/workout/PlanBuilderUI'

const T = '#42e09e'
const G = '#06c384'
const BG_CARD = '#0f1c16'

function formatSec(seconds: number | null | undefined) {
  if (!seconds) return null
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s ? `${m}p${s}s` : `${m} phút`
}

function SuggestedPlanCard({ plan, onUse }: { plan: WorkoutPlan; onUse: (p: WorkoutPlan) => void }) {
  const [expanded, setExpanded] = useState(false)
  const totalDays = plan.days?.length ?? 0
  const totalExercises = plan.days?.reduce((s, d) => s + (d.exercises?.length ?? 0), 0) ?? 0
  const totalEstMin = plan.days?.reduce((s, d) =>
    s + (d.exercises?.reduce((es, ex) => {
      const setTime = (ex.targetDurationSec ?? 30) * ex.targetSets
      const restTime = (ex.restSeconds ?? 60) * (ex.targetSets - 1)
      return es + setTime + restTime
    }, 0) ?? 0), 0) ?? 0
  const totalEstimated = Math.round(totalEstMin / 60)

  return (
    <div
      className="rogym-card rogym-card--md"
      style={{ overflow: 'hidden', padding: 0 }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: `${G}22`, color: G }}
              >
                PT
              </span>
              <h3 className="truncate font-bold text-white">{plan.name}</h3>
            </div>
            {plan.description && (
              <p className="mt-1 text-sm" style={{ color: '#bbcabf' }}>
                {plan.description}
              </p>
            )}
          </div>
          <button
            type="button"
            className="rogym-btn rogym-btn--primary shrink-0 px-4 text-sm"
            onClick={() => onUse(plan)}
          >
            Dùng plan này
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs" style={{ color: '#8ab89c' }}>
          <span>
            <span className="font-semibold text-white">{totalDays}</span> ngày
          </span>
          <span>
            <span className="font-semibold text-white">{totalExercises}</span> bài tập
          </span>
          {totalEstimated > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              <span className="font-semibold text-white">{totalEstimated}</span> phút/ngày (ước tính)
            </span>
          )}
        </div>

        {/* Toggle exercises */}
        <button
          type="button"
          className="rogym-text-link rogym-text-link--accent mt-3 flex items-center gap-1 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Ẩn chi tiết' : 'Xem chi tiết ngày tập'}
        </button>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[...(plan.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber).map((day) => (
            <div
              key={day.planDayId}
              className="px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: T }}>
                Ngày {day.dayNumber} — {day.name}
              </p>
              {[...(day.exercises ?? [])].sort((a, b) => a.orderIndex - b.orderIndex).map((ex, i) => (
                <div key={ex.planExerciseId} className="flex items-center gap-2 py-1.5">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                    style={{ background: 'rgba(66,224,158,0.10)', color: T }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-white">{ex.exercise?.name ?? '—'}</span>
                    <span className="ml-2 text-xs" style={{ color: '#8ab89c' }}>
                      {ex.targetSets} sets ·{' '}
                      {ex.targetReps ? `${ex.targetReps} reps` : formatSec(ex.targetDurationSec) ?? '—'}
                      {ex.targetWeightKg ? ` · ${Number(ex.targetWeightKg)}kg` : ''}
                      {ex.restSeconds ? ` · nghỉ ${ex.restSeconds}s` : ''}
                    </span>
                  </div>
                  {ex.exercise?.muscleGroup && (
                    <span className="shrink-0 text-xs" style={{ color: '#4a7060' }}>
                      {ex.exercise.muscleGroup}
                    </span>
                  )}
                </div>
              ))}
              {!day.exercises?.length && (
                <p className="text-xs" style={{ color: '#4a7060' }}>Chưa có bài tập.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function todayInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MemberPlanBuilderPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const memberId = user?.memberId ? String(user.memberId) : undefined

  // Phase: 'name' → user enters plan name; 'build' → plan created, user builds days
  const [phase, setPhase] = useState<'name' | 'build'>('name')
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loadingExercises, setLoadingExercises] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Suggested plans from PT
  const [suggestedPlans, setSuggestedPlans] = useState<WorkoutPlan[]>([])
  const [loadingSuggested, setLoadingSuggested] = useState(false)

  // Name form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Add day form
  const [addingDay, setAddingDay] = useState(false)
  const [dayName, setDayName] = useState('')

  // Add exercise form: key = planDayId being edited
  const [addingExerciseTo, setAddingExerciseTo] = useState<WorkoutPlanDay | null>(null)
  const [exerciseId, setExerciseId] = useState('')
  const [targetSets, setTargetSets] = useState(3)
  const [targetReps, setTargetReps] = useState(10)
  const [targetDuration, setTargetDuration] = useState(60)
  const [targetWeight, setTargetWeight] = useState('')
  const [restSeconds, setRestSeconds] = useState(60)

  // Delete confirm
  const [deleteDay, setDeleteDay] = useState<WorkoutPlanDay | null>(null)

  // Activate confirm
  const [activateConfirm, setActivateConfirm] = useState(false)

  // Suggested plan pending apply (shown in warning modal)
  const [pendingSuggestedPlan, setPendingSuggestedPlan] = useState<WorkoutPlan | null>(null)

  // Plan metadata (name phase)
  const [startDate, setStartDate] = useState(todayInput())

  // Existing active self-plan (for warning before activate)
  const [existingSelfPlan, setExistingSelfPlan] = useState<{ name: string } | null>(null)

  // Exercise picker filter (build phase)
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<ExerciseCategoryFilter>('')
  const [exerciseSearch, setExerciseSearch] = useState('')
  // Filter popup
  const [showFilterPopup, setShowFilterPopup] = useState(false)
  const [draftCategory, setDraftCategory] = useState<ExerciseCategoryFilter>('')

  const selectedExercise = exercises.find((e) => e.exerciseId === exerciseId) ?? null

  const filteredExercises = filterExercises(
    exercises,
    exerciseSearch,
    exerciseCategoryFilter,
  )

  const loadPlan = useCallback(async (planId: string) => {
    const updated = await workoutService.getPlan(planId)
    setPlan(updated)
  }, [])

  useEffect(() => {
    if (phase !== 'build') return
    setLoadingExercises(true)
    workoutService
      .getExercises()
      .then(setExercises)
      .catch(() => setError('Không thể tải thư viện bài tập.'))
      .finally(() => setLoadingExercises(false))
  }, [phase])

  useEffect(() => {
    setLoadingSuggested(true)
    workoutService
      .getSuggestedPlans()
      .then(setSuggestedPlans)
      .catch(() => {/* silent */})
      .finally(() => setLoadingSuggested(false))
  }, [])

  // Fetch existing active self-plan so we can warn before replacing
  useEffect(() => {
    if (!memberId) return
    workoutService.getAssignments(memberId, { status: 'active' })
      .then((assignments) => {
        const self = assignments.find((a) => !a.assignedByStaffId)
        setExistingSelfPlan(self ? { name: self.plan?.name ?? 'Kế hoạch hiện tại' } : null)
      })
      .catch(() => {/* silent */})
  }, [memberId])

  function handleUseSuggestedPlan(suggested: WorkoutPlan) {
    if (existingSelfPlan) {
      setPendingSuggestedPlan(suggested)
    } else {
      void applySuggestedPlan(suggested)
    }
  }

  async function applySuggestedPlan(suggested: WorkoutPlan) {
    if (!memberId) return
    setPendingSuggestedPlan(null)
    setSubmitting(true)
    setError(null)
    try {
      // PT plans are already active — only activate member-created drafts
      if (suggested.status !== 'active') {
        await workoutService.updatePlan(suggested.planId, { status: 'active' })
      }
      await workoutService.assignPlan(memberId, {
        planId: Number(suggested.planId),
        startDate: startDate || todayInput(),
      })
      navigate('/member/workout/plan')
    } catch {
      setError('Không thể áp dụng plan này. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  async function createPlan(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await workoutService.createPlan({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setPlan(created)
      setPhase('build')
    } catch {
      setError('Không thể tạo kế hoạch. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  async function addDay(e: FormEvent) {
    e.preventDefault()
    if (!plan || !dayName.trim()) return
    setSubmitting(true)
    setError(null)
    const numbers = plan.days?.map((d) => d.dayNumber) ?? []
    const nextNum = numbers.length ? Math.max(...numbers) + 1 : 1
    try {
      await workoutService.addPlanDay(plan.planId, {
        weekNumber: Math.floor((nextNum - 1) / 7) + 1,
        dayOfWeek: ((nextNum - 1) % 7) + 1,
        dayNumber: nextNum,
        name: dayName.trim(),
      })
      setAddingDay(false)
      setDayName('')
      await loadPlan(plan.planId)
    } catch {
      setError('Không thể thêm ngày tập.')
    } finally {
      setSubmitting(false)
    }
  }

  async function addExercise(e: FormEvent) {
    e.preventDefault()
    if (!plan || !addingExerciseTo || !selectedExercise) return
    setSubmitting(true)
    setError(null)
    const nextIdx = addingExerciseTo.exercises?.length
      ? Math.max(...addingExerciseTo.exercises.map((ex) => ex.orderIndex)) + 1
      : 0
    try {
      await workoutService.addPlanExercise(plan.planId, addingExerciseTo.planDayId, {
        exerciseId: Number(selectedExercise.exerciseId),
        orderIndex: nextIdx,
        targetSets,
        targetReps: selectedExercise.category === 'cardio' ? undefined : targetReps,
        targetDurationSec: selectedExercise.category === 'cardio' ? targetDuration : undefined,
        targetWeightKg: targetWeight ? Number(targetWeight) : undefined,
        restSeconds,
      })
      setAddingExerciseTo(null)
      setExerciseId('')
      await loadPlan(plan.planId)
    } catch {
      setError('Không thể thêm bài tập.')
    } finally {
      setSubmitting(false)
    }
  }

  async function removeDay(day: WorkoutPlanDay) {
    if (!plan) return
    setSubmitting(true)
    setError(null)
    try {
      await workoutService.deletePlanDay(plan.planId, day.planDayId)
      setDeleteDay(null)
      await loadPlan(plan.planId)
    } catch {
      setError('Không thể xóa ngày tập.')
    } finally {
      setSubmitting(false)
    }
  }

  async function removeExercise(dayId: string, planExerciseId: string) {
    if (!plan) return
    setError(null)
    try {
      await workoutService.deletePlanExercise(plan.planId, dayId, planExerciseId)
      await loadPlan(plan.planId)
    } catch {
      setError('Không thể xóa bài tập.')
    }
  }

  const activeFilterCount = exerciseCategoryFilter ? 1 : 0

  function openFilterPopup() {
    setDraftCategory(exerciseCategoryFilter)
    setShowFilterPopup(true)
  }

  function saveFilter() {
    setExerciseCategoryFilter(draftCategory)
    setExerciseId('')
    setShowFilterPopup(false)
  }

  async function activate() {
    if (!plan || !memberId) return
    setSubmitting(true)
    setError(null)
    try {
      await workoutService.updatePlan(plan.planId, { status: 'active' })
      await workoutService.assignPlan(memberId, {
        planId: Number(plan.planId),
        startDate: startDate || todayInput(),
      })
      navigate('/member/workout/plan')
    } catch {
      setError('Không thể kích hoạt kế hoạch. Vui lòng kiểm tra lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const exerciseCount =
    plan?.days?.reduce((s, d) => s + (d.exercises?.length ?? 0), 0) ?? 0
  const canActivate = (plan?.days?.length ?? 0) > 0 && exerciseCount > 0

  // ─── Phase: enter name ───────────────────────────────────────────────
  if (phase === 'name') {
    return (
      <MemberPage>
        <MemberPageHeader
          eyebrow="Kế hoạch cá nhân"
          title="Tạo kế hoạch tập"
          description="Đặt tên và mô tả cho kế hoạch trước khi thêm ngày tập"
          actions={
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => navigate('/member/workout/plan')}
            >
              <ArrowLeft size={15} /> Quay lại
            </button>
          }
        />
        {error && <MemberErrorState message={error} />}
        <form
          onSubmit={(e) => void createPlan(e)}
          style={{
            background: BG_CARD,
            border: '1px solid rgba(66,224,158,0.10)',
            borderRadius: 20,
            padding: '24px',
          }}
          className="space-y-4"
        >
          <label className="block space-y-2">
            <span className="rogym-field-label">Tên kế hoạch *</span>
            <input
              className="rogym-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              autoFocus
              placeholder="VD: Giảm mỡ - 4 ngày/tuần"
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Mô tả ngắn (tùy chọn)</span>
            <textarea
              className="rogym-input min-h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mục tiêu, ghi chú..."
            />
          </label>

          {/* Start date */}
          <label className="block space-y-2">
            <span className="rogym-field-label">Bắt đầu từ ngày</span>
            <input
              className="rogym-input"
              type="date"
              value={startDate}
              min={todayInput()}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rogym-btn rogym-btn--primary"
              disabled={!name.trim() || submitting}
            >
              {submitting ? 'Đang tạo...' : 'Tiếp theo — Thêm ngày tập'}
            </button>
          </div>
        </form>

        {/* Suggested plans from PT */}
        <div className="mt-2">
          <div className="mb-4 flex items-center gap-3">
            <BookOpen size={18} style={{ color: T }} />
            <h2 className="text-base font-bold text-white">Plan gợi ý từ PT</h2>
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#8ab89c' }}
            >
              Áp dụng ngay, không cần tự xây
            </span>
          </div>
          {loadingSuggested ? (
            <MemberSkeleton rows={2} />
          ) : suggestedPlans.length === 0 ? (
            <div
              className="rounded-[16px] p-5 text-center text-sm"
              style={{
                background: BG_CARD,
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#8ab89c',
              }}
            >
              <Dumbbell size={28} className="mx-auto mb-2" style={{ color: '#4a7060' }} />
              Chưa có plan gợi ý từ PT. Hãy tự tạo plan hoặc liên hệ PT của bạn.
            </div>
          ) : (
            <div className="space-y-4">
              {suggestedPlans.map((p) => (
                <SuggestedPlanCard
                  key={p.planId}
                  plan={p}
                  onUse={handleUseSuggestedPlan}
                />
              ))}
            </div>
          )}
        </div>

        {/* Replace warning modal for suggested plan */}
        {pendingSuggestedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div
              className="w-full max-w-sm space-y-4 rounded-[20px] p-6"
              style={{ background: '#0a1f17', border: '1px solid rgba(255,165,0,0.3)' }}
            >
              <p className="text-base font-bold text-white">Thay thế kế hoạch hiện tại?</p>
              <p className="text-sm" style={{ color: '#bbcabf' }}>
                Bạn đang có kế hoạch cá nhân{' '}
                <span className="font-semibold text-white">
                  &quot;{existingSelfPlan?.name}&quot;
                </span>{' '}
                đang chạy. Áp dụng plan mới sẽ kết thúc kế hoạch đó.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white px-4"
                  onClick={() => setPendingSuggestedPlan(null)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary px-4"
                  disabled={submitting}
                  onClick={() => void applySuggestedPlan(pendingSuggestedPlan)}
                >
                  {submitting ? 'Đang xử lý...' : 'Áp dụng'}
                </button>
              </div>
            </div>
          </div>
        )}
      </MemberPage>
    )
  }

  // ─── Phase: build plan ───────────────────────────────────────────────
  const sortedDays = [...(plan?.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber)

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Plan Builder"
        title={plan?.name ?? 'Kế hoạch'}
        description="Thêm bài tập vào từng ngày đã chọn"
        actions={
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            onClick={() => navigate('/member/workout/plan')}
          >
            <ArrowLeft size={15} /> Hủy
          </button>
        }
      />

      {error && <MemberErrorState message={error} />}

      {/* Stats mini row */}
      <div
        style={{
          background: BG_CARD,
          border: '1px solid rgba(66,224,158,0.08)',
          borderRadius: 16,
          padding: '14px 20px',
        }}
        className="flex items-center gap-6 text-sm"
      >
        <span style={{ color: '#bbcabf' }}>
          <span className="font-semibold text-white">{plan?.days?.length ?? 0}</span> ngày
        </span>
        <span style={{ color: '#bbcabf' }}>
          <span className="font-semibold text-white">{exerciseCount}</span> bài tập
        </span>
      </div>

      {/* Days */}
      {loadingExercises ? (
        <MemberSkeleton rows={3} />
      ) : (
        <div className="space-y-3">
          {sortedDays.map((day) => (
            <div
              key={day.planDayId}
              style={{
                background: BG_CARD,
                border: '1px solid rgba(66,224,158,0.10)',
                borderRadius: 16,
              }}
            >
              {/* Day header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div>
                  <p className="font-semibold text-white">
                    Ngày {day.dayNumber} — {day.name}
                  </p>
                  <p className="text-xs" style={{ color: '#8ab89c' }}>
                    {day.exercises?.length ?? 0} bài tập
                  </p>
                </div>
                {deleteDay?.planDayId === day.planDayId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-200">Xóa ngày này?</span>
                    <button
                      type="button"
                      className="rogym-btn rogym-btn--danger px-3 py-1 text-xs"
                      disabled={submitting}
                      onClick={() => void removeDay(day)}
                    >
                      Xóa
                    </button>
                    <button
                      type="button"
                      className="rogym-btn rogym-btn--outline-white px-3 py-1 text-xs"
                      onClick={() => setDeleteDay(null)}
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                    onClick={() => setDeleteDay(day)}
                    aria-label="Xóa ngày"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {/* Exercises */}
              <div className="p-4">
                {[...(day.exercises ?? [])]
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((ex, idx) => (
                    <div
                      key={ex.planExerciseId}
                      className="flex items-center gap-3 py-2"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                        style={{ background: 'rgba(66,224,158,0.10)', color: T }}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">
                          {ex.exercise?.name ?? 'Bài tập'}
                        </p>
                        <p className="text-xs" style={{ color: '#8ab89c' }}>
                          {ex.targetSets} sets ·{' '}
                          {ex.targetReps
                            ? `${ex.targetReps} reps`
                            : `${ex.targetDurationSec ?? 0} giây`}
                          {ex.targetWeightKg ? ` · ${Number(ex.targetWeightKg)} kg` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                        onClick={() =>
                          void removeExercise(day.planDayId, ex.planExerciseId)
                        }
                        aria-label="Xóa bài tập"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                {/* Add exercise inline */}
                {addingExerciseTo?.planDayId === day.planDayId ? (
                  <form
                    onSubmit={(e) => void addExercise(e)}
                    className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="space-y-2">
                      <span className="rogym-field-label block">Chọn bài tập</span>
                      {/* Search + Filter button */}
                      <div className="relative flex gap-2">
                        <div className="relative flex-1">
                          <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            size={13}
                            style={{ color: '#8ab89c' }}
                          />
                          <input
                            className="rogym-input pl-9 py-2 text-sm"
                            value={exerciseSearch}
                            onChange={(e) => setExerciseSearch(e.target.value)}
                            placeholder="Tìm theo tên, nhóm cơ..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={openFilterPopup}
                          className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
                          style={{
                            background: activeFilterCount > 0 ? `${T}22` : 'rgba(255,255,255,0.06)',
                            color: activeFilterCount > 0 ? T : '#8ab89c',
                            border: `1px solid ${activeFilterCount > 0 ? T + '44' : 'rgba(255,255,255,0.1)'}`,
                          }}
                        >
                          <SlidersHorizontal size={13} />
                          Lọc
                          {activeFilterCount > 0 && (
                            <span
                              className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                              style={{ background: T, color: '#0a1f17' }}
                            >
                              {activeFilterCount}
                            </span>
                          )}
                        </button>

                        <ExerciseCategoryFilterPopover
                          open={showFilterPopup}
                          value={draftCategory}
                          onChange={setDraftCategory}
                          onApply={saveFilter}
                          onClose={() => setShowFilterPopup(false)}
                        />
                      </div>
                      {/* Scrollable exercise list */}
                      <div
                        className="max-h-44 overflow-y-auto rounded-xl"
                        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)' }}
                      >
                        {filteredExercises.length === 0 ? (
                          <p className="py-4 text-center text-xs" style={{ color: '#8ab89c' }}>
                            Không tìm thấy bài tập
                          </p>
                        ) : (
                          filteredExercises.map((ex) => (
                            <button
                              key={ex.exerciseId}
                              type="button"
                              onClick={() => setExerciseId(ex.exerciseId)}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
                              style={{
                                background: exerciseId === ex.exerciseId ? `${T}10` : 'transparent',
                                color: exerciseId === ex.exerciseId ? T : '#bbcabf',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                              }}
                            >
                              <span className="flex-1 font-medium">{ex.name}</span>
                              {ex.muscleGroup && (
                                <span className="shrink-0 text-xs" style={{ color: '#8ab89c' }}>
                                  {ex.muscleGroup}
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                      {/* Selected pill */}
                      {selectedExercise && (
                        <div
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
                          style={{ background: `${T}12`, border: `1px solid ${T}33` }}
                        >
                          <span className="flex-1 font-medium" style={{ color: T }}>
                            {selectedExercise.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExerciseId('')}
                            aria-label="Bỏ chọn"
                          >
                            <X size={13} style={{ color: '#8ab89c' }} />
                          </button>
                        </div>
                      )}
                    </div>
                    <ExerciseTargetFields
                      category={selectedExercise?.category}
                      gridClassName="grid gap-3 md:grid-cols-3"
                      compact
                      restOutsideGrid
                      weightPlaceholder="Tùy chọn"
                      values={{
                        sets: targetSets,
                        reps: targetReps,
                        duration: targetDuration,
                        weight: targetWeight,
                        restSeconds,
                      }}
                      onChange={{
                        sets: setTargetSets,
                        reps: setTargetReps,
                        duration: setTargetDuration,
                        weight: setTargetWeight,
                        restSeconds: setRestSeconds,
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rogym-btn rogym-btn--outline-white"
                        onClick={() => { setAddingExerciseTo(null); setShowFilterPopup(false) }}
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="rogym-btn rogym-btn--primary"
                        disabled={!exerciseId || submitting}
                      >
                        {submitting ? 'Đang thêm...' : 'Thêm bài tập'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="rogym-text-link rogym-text-link--accent mt-3"
                    onClick={() => {
                      setAddingExerciseTo(day)
                      setExerciseId('')
                      setExerciseCategoryFilter('')
                      setExerciseSearch('')
                      setShowFilterPopup(false)
                      setTargetSets(3)
                      setTargetReps(10)
                      setTargetWeight('')
                    }}
                  >
                    + Thêm bài tập
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add day */}
          {addingDay ? (
            <form
              onSubmit={(e) => void addDay(e)}
              style={{
                background: BG_CARD,
                border: '1px solid rgba(66,224,158,0.15)',
                borderRadius: 16,
                padding: '20px',
              }}
              className="space-y-3"
            >
              <p className="text-sm font-semibold text-white">Thêm ngày tập</p>
              <label className="block space-y-1.5">
                <span className="rogym-field-label">Tên ngày tập</span>
                <input
                  className="rogym-input"
                  value={dayName}
                  onChange={(e) => setDayName(e.target.value)}
                  maxLength={100}
                  required
                  autoFocus
                  placeholder="VD: Ngực & Vai, Push day..."
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white"
                  onClick={() => {
                    setAddingDay(false)
                    setDayName('')
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rogym-btn rogym-btn--primary"
                  disabled={!dayName.trim() || submitting}
                >
                  {submitting ? 'Đang thêm...' : 'Thêm ngày'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white w-full justify-center"
              onClick={() => {
                setAddingDay(true)
                setDayName('')
              }}
            >
              <Plus size={16} /> Thêm ngày tập
            </button>
          )}
        </div>
      )}

      {/* Floating activate bar */}
      <div
        className="fixed bottom-0 left-0 right-0 flex items-center justify-between gap-4 px-6 py-4"
        style={{
          background: '#0a1710',
          borderTop: '1px solid rgba(66,224,158,0.15)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <p className="text-sm" style={{ color: '#bbcabf' }}>
          {plan?.days?.length ?? 0} ngày · {exerciseCount} bài tập
          {!canActivate && (
            <span style={{ color: '#8ab89c' }}> — Cần ít nhất 1 ngày có bài tập</span>
          )}
        </p>
        {activateConfirm ? (
          <div className="flex items-center gap-2">
            {existingSelfPlan ? (
              <span className="text-xs text-amber-200">
                Kế hoạch <strong>&quot;{existingSelfPlan.name}&quot;</strong> đang chạy sẽ bị kết thúc.
              </span>
            ) : (
              <span className="text-xs" style={{ color: '#8ab89c' }}>Xác nhận kích hoạt plan này?</span>
            )}
            <button
              type="button"
              className="rogym-btn rogym-btn--primary px-4"
              disabled={submitting}
              onClick={() => void activate()}
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white px-4"
              onClick={() => setActivateConfirm(false)}
            >
              Hủy
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="rogym-btn rogym-btn--primary px-6"
            disabled={!canActivate || submitting}
            onClick={() => setActivateConfirm(true)}
          >
            <Zap size={15} /> Kích hoạt & Áp dụng
          </button>
        )}
      </div>

      {/* Bottom padding for floating bar */}
      <div className="h-20" />
    </MemberPage>
  )
}

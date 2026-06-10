import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Zap } from 'lucide-react'
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

const T = '#42e09e'
const BG_CARD = '#0f1c16'

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

  const selectedExercise = exercises.find((e) => e.exerciseId === exerciseId) ?? null

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

  async function activate() {
    if (!plan || !memberId) return
    setSubmitting(true)
    setError(null)
    try {
      await workoutService.updatePlan(plan.planId, { status: 'active' })
      await workoutService.assignPlan(memberId, {
        planId: Number(plan.planId),
        startDate: todayInput(),
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
            <span className="rogym-field-label">Mô tả (tùy chọn)</span>
            <textarea
              className="rogym-input min-h-24"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú mục tiêu, lịch tập..."
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
        description="Thêm các ngày tập và bài tập từ thư viện"
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
                overflow: 'hidden',
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
                    <label className="block space-y-1.5">
                      <span className="rogym-field-label">Bài tập</span>
                      <select
                        className="rogym-input"
                        value={exerciseId}
                        onChange={(e) => setExerciseId(e.target.value)}
                        required
                      >
                        <option value="">Chọn từ thư viện</option>
                        {exercises.map((ex) => (
                          <option key={ex.exerciseId} value={ex.exerciseId}>
                            {ex.name}
                            {ex.muscleGroup ? ` (${ex.muscleGroup})` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="block space-y-1.5">
                        <span className="rogym-field-label">Sets</span>
                        <input
                          className="rogym-input"
                          type="number"
                          min={1}
                          value={targetSets}
                          onChange={(e) => setTargetSets(Number(e.target.value))}
                          required
                        />
                      </label>
                      {selectedExercise?.category === 'cardio' ? (
                        <label className="block space-y-1.5">
                          <span className="rogym-field-label">Thời lượng (giây)</span>
                          <input
                            className="rogym-input"
                            type="number"
                            min={1}
                            value={targetDuration}
                            onChange={(e) => setTargetDuration(Number(e.target.value))}
                          />
                        </label>
                      ) : (
                        <label className="block space-y-1.5">
                          <span className="rogym-field-label">Reps</span>
                          <input
                            className="rogym-input"
                            type="number"
                            min={1}
                            value={targetReps}
                            onChange={(e) => setTargetReps(Number(e.target.value))}
                          />
                        </label>
                      )}
                      <label className="block space-y-1.5">
                        <span className="rogym-field-label">Tạ (kg)</span>
                        <input
                          className="rogym-input"
                          type="number"
                          min={0}
                          step={0.25}
                          value={targetWeight}
                          onChange={(e) => setTargetWeight(e.target.value)}
                          placeholder="Tùy chọn"
                        />
                      </label>
                    </div>
                    <label className="block space-y-1.5">
                      <span className="rogym-field-label">Nghỉ giữa sets (giây)</span>
                      <input
                        className="rogym-input"
                        type="number"
                        min={0}
                        value={restSeconds}
                        onChange={(e) => setRestSeconds(Number(e.target.value))}
                      />
                    </label>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rogym-btn rogym-btn--outline-white"
                        onClick={() => setAddingExerciseTo(null)}
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
            <span className="text-xs text-amber-200">Plan cũ (nếu có) sẽ bị thay thế.</span>
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

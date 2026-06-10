import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArrowLeft, Lock, Pencil, Plus, Trash2, Zap } from 'lucide-react'
import { getApiError, getApiErrorCode, isApiConflict } from '@/lib/api-error'
import workoutService, {
  type Exercise,
  type WorkoutPlan,
  type WorkoutPlanDay,
  type WorkoutPlanExercise,
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

type DeleteTarget =
  | { type: 'day'; day: WorkoutPlanDay }
  | { type: 'exercise'; day: WorkoutPlanDay; exercise: WorkoutPlanExercise }
  | null

export default function TrainerPlanBuilderPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [writeBlocked, setWriteBlocked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dayOpen, setDayOpen] = useState(false)
  const [editingDay, setEditingDay] = useState<WorkoutPlanDay | null>(null)
  const [dayNumber, setDayNumber] = useState(1)
  const [dayName, setDayName] = useState('')
  const [dayNotes, setDayNotes] = useState('')
  const [exerciseDay, setExerciseDay] = useState<WorkoutPlanDay | null>(null)
  const [exerciseId, setExerciseId] = useState('')
  const [targetSets, setTargetSets] = useState(3)
  const [targetReps, setTargetReps] = useState(10)
  const [targetDuration, setTargetDuration] = useState(60)
  const [targetWeight, setTargetWeight] = useState('')
  const [restSeconds, setRestSeconds] = useState(60)
  const [exerciseNotes, setExerciseNotes] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [planData, exerciseData] = await Promise.all([
        workoutService.getPlan(id),
        workoutService.getExercises(),
      ])
      setPlan(planData)
      setName(planData.name)
      setDescription(planData.description ?? '')
      if (planData.status === 'archived') setWriteBlocked(true)
      setExercises(exerciseData)
    } catch (err) {
      setError(getApiError(err, 'Không thể tải Plan Builder.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const selectedExercise = useMemo(
    () => exercises.find((exercise) => exercise.exerciseId === exerciseId) ?? null,
    [exerciseId, exercises]
  )
  const readonly = writeBlocked || plan?.status === 'archived'
  const exerciseCount = plan?.days?.reduce((sum, day) => sum + (day.exercises?.length ?? 0), 0) ?? 0

  function handleMutationError(err: unknown, fallback: string) {
    const message = getApiError(err, fallback)
    if (
      getApiErrorCode(err) === 'PLAN_WRITE_BLOCKED' ||
      (isApiConflict(err) && message.toLocaleLowerCase('vi').includes('workout log'))
    ) {
      setWriteBlocked(true)
      setError(
        'Kế hoạch đã có dữ liệu tập luyện hoặc đang được sử dụng nên cấu trúc được chuyển sang chỉ đọc.'
      )
      return
    }
    setError(message)
  }

  async function saveMetadata(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await workoutService.updatePlan(id, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      await load()
    } catch (err) {
      handleMutationError(err, 'Không thể cập nhật thông tin kế hoạch.')
    } finally {
      setSubmitting(false)
    }
  }

  function openCreateDay() {
    const numbers = plan?.days?.map((day) => day.dayNumber) ?? []
    setEditingDay(null)
    setDayNumber(numbers.length ? Math.max(...numbers) + 1 : 1)
    setDayName('')
    setDayNotes('')
    setDayOpen(true)
  }

  function openEditDay(day: WorkoutPlanDay) {
    setEditingDay(day)
    setDayNumber(day.dayNumber)
    setDayName(day.name)
    setDayNotes(day.notes ?? '')
    setDayOpen(true)
  }

  async function saveDay(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const payload = { dayNumber, name: dayName.trim(), notes: dayNotes.trim() || undefined }
    try {
      if (editingDay) await workoutService.updatePlanDay(id, editingDay.planDayId, payload)
      else await workoutService.addPlanDay(id, payload)
      setDayOpen(false)
      await load()
    } catch (err) {
      handleMutationError(err, 'Không thể lưu ngày tập. Số thứ tự ngày phải là duy nhất.')
    } finally {
      setSubmitting(false)
    }
  }

  function openAddExercise(day: WorkoutPlanDay) {
    setExerciseDay(day)
    setExerciseId('')
    setTargetSets(3)
    setTargetReps(10)
    setTargetDuration(60)
    setTargetWeight('')
    setRestSeconds(60)
    setExerciseNotes('')
  }

  async function addExercise(event: FormEvent) {
    event.preventDefault()
    if (!exerciseDay || !selectedExercise) return
    setSubmitting(true)
    setError(null)
    const nextIndex = exerciseDay.exercises?.length
      ? Math.max(...exerciseDay.exercises.map((item) => item.orderIndex)) + 1
      : 0
    try {
      await workoutService.addPlanExercise(id, exerciseDay.planDayId, {
        exerciseId: Number(selectedExercise.exerciseId),
        orderIndex: nextIndex,
        targetSets,
        targetReps: selectedExercise.category === 'cardio' ? undefined : targetReps,
        targetDurationSec: selectedExercise.category === 'cardio' ? targetDuration : undefined,
        targetWeightKg: targetWeight ? Number(targetWeight) : undefined,
        restSeconds,
        notes: exerciseNotes.trim() || undefined,
      })
      setExerciseDay(null)
      await load()
    } catch (err) {
      handleMutationError(err, 'Không thể thêm bài tập vào ngày này.')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSubmitting(true)
    setError(null)
    try {
      if (deleteTarget.type === 'day') {
        await workoutService.deletePlanDay(id, deleteTarget.day.planDayId)
      } else {
        await workoutService.deletePlanExercise(
          id,
          deleteTarget.day.planDayId,
          deleteTarget.exercise.planExerciseId
        )
      }
      setDeleteTarget(null)
      await load()
    } catch (err) {
      handleMutationError(err, 'Không thể xóa vì dữ liệu lịch sử đang được bảo vệ.')
    } finally {
      setSubmitting(false)
    }
  }

  async function changeStatus(status: 'active' | 'archived') {
    if (status === 'active' && (!plan?.days?.length || exerciseCount === 0)) {
      setError('Kế hoạch cần ít nhất một ngày và một bài tập trước khi kích hoạt.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await workoutService.updatePlan(id, { status })
      await load()
    } catch (err) {
      handleMutationError(
        err,
        status === 'active'
          ? 'Không thể kích hoạt kế hoạch.'
          : 'Không thể lưu trữ kế hoạch khi còn assignment active.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return (
      <TrainerPage>
        <TrainerSkeleton rows={7} />
      </TrainerPage>
    )
  if (error && !plan)
    return (
      <TrainerPage>
        <TrainerErrorState message={error} onRetry={load} />
      </TrainerPage>
    )
  if (!plan) return null

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Plan Builder"
        title={plan.name}
        description={
          readonly
            ? 'Kế hoạch đang ở chế độ chỉ đọc.'
            : 'Xây dựng cấu trúc ngày tập và target cho từng bài.'
        }
        actions={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => navigate('/trainer/plans')}
            >
              <ArrowLeft size={16} /> Danh sách
            </button>
            {plan.status === 'draft' && !readonly && (
              <button
                type="button"
                className="rogym-btn rogym-btn--primary"
                disabled={submitting}
                onClick={() => changeStatus('active')}
              >
                <Zap size={16} /> Kích hoạt
              </button>
            )}
            {plan.status !== 'archived' && !readonly && (
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                disabled={submitting}
                onClick={() => changeStatus('archived')}
              >
                <Archive size={16} /> Lưu trữ
              </button>
            )}
          </>
        }
      />
      <div className="flex items-center gap-3">
        <TrainerStatusBadge status={plan.status} />
        <span className="text-sm text-[var(--rogym-text-dim)]">
          {plan.days?.length ?? 0} ngày · {exerciseCount} bài tập
        </span>
      </div>
      {readonly && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          <Lock size={18} /> Plan đã lưu trữ hoặc có workout log nên không thể thay đổi cấu trúc.
        </div>
      )}
      {error && <TrainerErrorState message={error} onRetry={load} />}

      <form
        className="rogym-card rogym-card--compact grid gap-4 p-6 lg:grid-cols-[1fr_1.5fr_auto]"
        onSubmit={saveMetadata}
      >
        <label className="block space-y-2">
          <span className="rogym-field-label">Tên kế hoạch</span>
          <input
            className="rogym-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={readonly}
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">Mô tả</span>
          <input
            className="rogym-input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={readonly}
          />
        </label>
        {!readonly && (
          <div className="self-end">
            <SubmitButton loading={submitting} disabled={!name.trim()}>
              Lưu thông tin
            </SubmitButton>
          </div>
        )}
      </form>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">Cấu trúc ngày tập</h2>
        {!readonly && (
          <button type="button" className="rogym-btn rogym-btn--primary" onClick={openCreateDay}>
            <Plus size={16} /> Thêm ngày
          </button>
        )}
      </div>
      {!plan.days?.length ? (
        <TrainerEmptyState
          title="Chưa có ngày tập"
          description="Thêm ít nhất một ngày, sau đó chọn bài tập từ thư viện."
          action={
            !readonly ? (
              <button
                type="button"
                className="rogym-btn rogym-btn--primary"
                onClick={openCreateDay}
              >
                Thêm ngày đầu tiên
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {[...plan.days]
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map((day) => (
              <section key={day.planDayId} className="rogym-card rogym-card--compact p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <div className="rogym-eyebrow">Ngày {day.dayNumber}</div>
                    <h3 className="mt-1 text-lg font-bold text-white">{day.name}</h3>
                    {day.notes && (
                      <p className="mt-2 text-sm text-[var(--rogym-text-secondary)]">{day.notes}</p>
                    )}
                  </div>
                  {!readonly && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rogym-btn rogym-btn--outline-white"
                        onClick={() => openEditDay(day)}
                      >
                        <Pencil size={15} /> Sửa
                      </button>
                      <button
                        type="button"
                        className="rogym-btn rogym-btn--danger"
                        onClick={() => setDeleteTarget({ type: 'day', day })}
                      >
                        <Trash2 size={15} /> Xóa
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  {[...(day.exercises ?? [])]
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((item, index) => (
                      <div
                        key={item.planExerciseId}
                        className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4 md:flex-row md:items-center"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(66,224,158,0.12)] text-sm font-bold text-[var(--rogym-teal)]">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-white">
                            {item.exercise?.name ?? 'Bài tập'}
                          </div>
                          <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">
                            {item.targetSets} sets ·{' '}
                            {item.targetReps
                              ? `${item.targetReps} reps`
                              : `${item.targetDurationSec ?? 0} giây`}
                            {item.targetWeightKg ? ` · ${Number(item.targetWeightKg)} kg` : ''}
                            {` · nghỉ ${item.restSeconds ?? 0} giây`}
                          </div>
                          {item.notes && (
                            <div className="mt-2 text-xs text-[var(--rogym-text-secondary)]">
                              {item.notes}
                            </div>
                          )}
                        </div>
                        {!readonly && (
                          <button
                            type="button"
                            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                            onClick={() =>
                              setDeleteTarget({ type: 'exercise', day, exercise: item })
                            }
                            aria-label="Xóa bài tập"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  {!day.exercises?.length && (
                    <p className="py-3 text-sm text-[var(--rogym-text-dim)]">
                      Ngày này chưa có bài tập.
                    </p>
                  )}
                  {!readonly && (
                    <button
                      type="button"
                      className="rogym-text-link rogym-text-link--accent"
                      onClick={() => openAddExercise(day)}
                    >
                      + Thêm bài tập
                    </button>
                  )}
                </div>
              </section>
            ))}
        </div>
      )}

      <TrainerModal
        open={dayOpen}
        title={editingDay ? 'Chỉnh sửa ngày tập' : 'Thêm ngày tập'}
        onClose={() => setDayOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setDayOpen(false)}
            >
              Hủy
            </button>
            <SubmitButton form="plan-day-form" loading={submitting} disabled={!dayName.trim()}>
              Lưu ngày tập
            </SubmitButton>
          </>
        }
      >
        <form id="plan-day-form" className="space-y-4" onSubmit={saveDay}>
          <label className="block space-y-2">
            <span className="rogym-field-label">Số thứ tự ngày</span>
            <input
              className="rogym-input"
              type="number"
              min={1}
              value={dayNumber}
              onChange={(event) => setDayNumber(Number(event.target.value))}
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Tên ngày tập</span>
            <input
              className="rogym-input"
              value={dayName}
              onChange={(event) => setDayName(event.target.value)}
              maxLength={100}
              autoFocus
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Ghi chú</span>
            <textarea
              className="rogym-input min-h-24"
              value={dayNotes}
              onChange={(event) => setDayNotes(event.target.value)}
            />
          </label>
        </form>
      </TrainerModal>

      <TrainerModal
        open={Boolean(exerciseDay)}
        title={`Thêm bài tập vào ${exerciseDay?.name ?? ''}`}
        onClose={() => setExerciseDay(null)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setExerciseDay(null)}
            >
              Hủy
            </button>
            <SubmitButton
              form="plan-exercise-form"
              loading={submitting}
              disabled={!exerciseId || targetSets < 1}
            >
              Thêm bài tập
            </SubmitButton>
          </>
        }
      >
        <form id="plan-exercise-form" className="space-y-4" onSubmit={addExercise}>
          <label className="block space-y-2">
            <span className="rogym-field-label">Bài tập</span>
            <TrainerSelect
              value={exerciseId}
              onValueChange={setExerciseId}
              required
            >
              <option value="">Chọn từ thư viện</option>
              {exercises.map((exercise) => (
                <option key={exercise.exerciseId} value={exercise.exerciseId}>
                  {exercise.name} - {exercise.category}
                </option>
              ))}
            </TrainerSelect>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField label="Số sets" min={1} value={targetSets} onChange={setTargetSets} />
            {selectedExercise?.category === 'cardio' ? (
              <NumberField
                label="Thời lượng (giây)"
                min={1}
                value={targetDuration}
                onChange={setTargetDuration}
              />
            ) : (
              <NumberField label="Số reps" min={1} value={targetReps} onChange={setTargetReps} />
            )}
            <label className="block space-y-2">
              <span className="rogym-field-label">Mức tạ (kg)</span>
              <input
                className="rogym-input"
                type="number"
                min={0}
                step={0.25}
                value={targetWeight}
                onChange={(event) => setTargetWeight(event.target.value)}
              />
            </label>
            <NumberField
              label="Nghỉ giữa sets (giây)"
              min={0}
              value={restSeconds}
              onChange={setRestSeconds}
            />
          </div>
          <label className="block space-y-2">
            <span className="rogym-field-label">Ghi chú kỹ thuật</span>
            <textarea
              className="rogym-input min-h-24"
              value={exerciseNotes}
              onChange={(event) => setExerciseNotes(event.target.value)}
            />
          </label>
          <p className="text-xs text-[var(--rogym-text-dim)]">
            API hiện chưa hỗ trợ sửa hoặc reorder exercise đã thêm. Muốn đổi target, hãy xóa và thêm
            lại.
          </p>
        </form>
      </TrainerModal>

      <TrainerModal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'day' ? 'Xóa ngày tập' : 'Xóa bài tập khỏi plan'}
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setDeleteTarget(null)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--danger"
              disabled={submitting}
              onClick={confirmDelete}
            >
              {submitting ? 'Đang xóa...' : 'Xác nhận xóa'}
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 text-[var(--rogym-text-secondary)]">
          {deleteTarget?.type === 'day'
            ? 'Toàn bộ bài tập trong ngày này cũng sẽ bị xóa.'
            : 'Dữ liệu lịch sử đã ghi nhận sẽ được backend bảo vệ và có thể chặn thao tác này.'}
        </p>
      </TrainerModal>
      <div className="text-right">
        <Link className="rogym-text-link rogym-text-link--accent" to="/trainer/exercises">
          Mở thư viện bài tập
        </Link>
      </div>
    </TrainerPage>
  )
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string
  value: number
  min: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block space-y-2">
      <span className="rogym-field-label">{label}</span>
      <input
        className="rogym-input"
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        required
      />
    </label>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle, Circle } from 'lucide-react'
import workoutService, { WorkoutPlanExercise, LogSetDto } from '@/services/workout.service'

interface SetRecord {
  actualReps: string
  actualWeightKg: string
  actualDurationSec: string
  completed: boolean
}

interface ExerciseRecord {
  planExerciseId: string
  sets: SetRecord[]
}

export default function WorkoutSessionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dayId = searchParams.get('dayId')
  const [notes, setNotes] = useState('')
  const [startTime] = useState(new Date())
  const [records, setRecords] = useState<Record<string, ExerciseRecord>>({})
  const [assignmentId, setAssignmentId] = useState('')

  // Fetch the plan that contains this day
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['workout-plans'],
    queryFn: () => workoutService.getPlans(),
  })

  // Find the day across all plans
  const foundDay = plans.flatMap(p => p.days ?? []).find(d => d.planDayId === dayId)
  const foundPlan = plans.find(p => p.days?.some(d => d.planDayId === dayId))

  // Find the assignment ID — we need it to create the log
  const { data: allPlans } = useQuery({
    queryKey: ['workout-plan-detail', foundPlan?.planId],
    queryFn: () => workoutService.getPlan(foundPlan!.planId),
    enabled: !!foundPlan?.planId,
  })

  // Use plan exercises from the full detail
  const day = allPlans?.days?.find(d => d.planDayId === dayId) ?? foundDay
  const exercises = useMemo<WorkoutPlanExercise[]>(() => day?.exercises ?? [], [day])

  // Initialize records when exercises load
  useEffect(() => {
    if (exercises.length === 0) return
    setRecords(prev => {
      const initial: Record<string, ExerciseRecord> = {}
      exercises.forEach(pe => {
        if (!prev[pe.planExerciseId]) {
          initial[pe.planExerciseId] = {
            planExerciseId: pe.planExerciseId,
            sets: Array.from({ length: pe.targetSets }, () => ({
              actualReps: pe.targetReps?.toString() ?? '',
              actualWeightKg: pe.targetWeightKg?.toString() ?? '',
              actualDurationSec: pe.targetDurationSec?.toString() ?? '',
              completed: true,
            })),
          }
        }
      })
      return Object.keys(initial).length > 0 ? { ...initial, ...prev } : prev
    })
  }, [exercises])

  const logMutation = useMutation({
    mutationFn: (assignmentId: number) => {
      const sets: LogSetDto[] = []
      exercises.forEach(pe => {
        const rec = records[pe.planExerciseId]
        if (!rec) return
        rec.sets.forEach((s, idx) => {
          sets.push({
            planExerciseId: Number(pe.planExerciseId),
            setNumber: idx + 1,
            actualReps: s.actualReps ? Number(s.actualReps) : undefined,
            actualWeightKg: s.actualWeightKg ? Number(s.actualWeightKg) : undefined,
            actualDurationSec: s.actualDurationSec ? Number(s.actualDurationSec) : undefined,
            completed: s.completed,
          })
        })
      })
      const durationMin = Math.round((Date.now() - startTime.getTime()) / 60000)
      return workoutService.createLog({
        assignmentId,
        planDayId: Number(dayId),
        loggedAt: startTime.toISOString(),
        durationMin: durationMin > 0 ? durationMin : undefined,
        notes: notes || undefined,
        sets,
      })
    },
    onSuccess: () => navigate('/member/workout-history'),
  })

  function updateSet(peId: string, setIdx: number, field: keyof SetRecord, value: string | boolean) {
    setRecords(prev => ({
      ...prev,
      [peId]: {
        ...prev[peId],
        sets: prev[peId].sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s),
      },
    }))
  }

  if (!dayId) {
    return (
      <div className="p-6 text-center">
        <p className="text-error">Không tìm thấy ngày tập. Vui lòng quay lại và chọn lại.</p>
      </div>
    )
  }

  if (isLoading) return <div className="p-6 text-on-surface-variant">Đang tải...</div>

  if (!foundDay) {
    return (
      <div className="p-6 text-center">
        <p className="text-error">Không tìm thấy ngày tập trong plan của bạn.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/member/my-plan')}
          className="text-sm text-on-surface-variant hover:text-on-surface mb-2"
        >
          Kế hoạch tập /
        </button>
        <h1 className="text-2xl font-bold">
          Ngày {foundDay.dayNumber}: {foundDay.name}
        </h1>
        {foundPlan && <p className="text-on-surface-variant text-sm">{foundPlan.name}</p>}
      </div>

      {/* Assignment ID input — simplified until assignment lookup API is added */}
      <div className="card p-4 mb-6">
        <label className="block text-sm font-medium mb-1">Assignment ID (lấy từ assignment đang active)</label>
        <input
          type="number"
          value={assignmentId}
          onChange={e => setAssignmentId(e.target.value)}
          className="input-base w-full"
          placeholder="Nhập assignment ID"
        />
      </div>

      {/* Exercises */}
      <div className="space-y-6 mb-6">
        {exercises.map(pe => {
          const rec = records[pe.planExerciseId]
          if (!rec) return null
          return (
            <div key={pe.planExerciseId} className="card p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">{pe.exercise?.name ?? `Exercise ${pe.exerciseId}`}</h3>
                <div className="text-sm text-on-surface-variant text-right">
                  <div>Mục tiêu: {pe.targetSets} sets</div>
                  {pe.targetReps && <div>× {pe.targetReps} reps</div>}
                  {pe.targetWeightKg && <div>@ {pe.targetWeightKg} kg</div>}
                  {pe.restSeconds && <div>Nghỉ: {pe.restSeconds}s</div>}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left py-2 pr-3 text-on-surface-variant font-medium">Set</th>
                    <th className="text-left py-2 pr-3 text-on-surface-variant font-medium">Reps</th>
                    <th className="text-left py-2 pr-3 text-on-surface-variant font-medium">KG</th>
                    <th className="text-left py-2 pr-3 text-on-surface-variant font-medium">Giây</th>
                    <th className="text-left py-2 text-on-surface-variant font-medium">Xong</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.sets.map((s, idx) => (
                    <tr key={idx} className="border-b border-outline-variant">
                      <td className="py-2 pr-3 font-medium">{idx + 1}</td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={0}
                          value={s.actualReps}
                          onChange={e => updateSet(pe.planExerciseId, idx, 'actualReps', e.target.value)}
                          className="input-base w-16 py-1 px-2 text-sm"
                          placeholder="—"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          value={s.actualWeightKg}
                          onChange={e => updateSet(pe.planExerciseId, idx, 'actualWeightKg', e.target.value)}
                          className="input-base w-20 py-1 px-2 text-sm"
                          placeholder="—"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={0}
                          value={s.actualDurationSec}
                          onChange={e => updateSet(pe.planExerciseId, idx, 'actualDurationSec', e.target.value)}
                          className="input-base w-16 py-1 px-2 text-sm"
                          placeholder="—"
                        />
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => updateSet(pe.planExerciseId, idx, 'completed', !s.completed)}
                          className={s.completed ? 'text-secondary' : 'text-on-surface-variant'}
                        >
                          {s.completed ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Ghi chú buổi tập</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="input-base w-full"
          rows={3}
          placeholder="Cảm nhận, điểm cần cải thiện..."
        />
      </div>

      {logMutation.isError && (
        <p className="text-sm text-error mb-4">
          {(logMutation.error as Error | null)?.message || 'Có lỗi xảy ra khi lưu buổi tập'}
        </p>
      )}

      <button
        onClick={() => logMutation.mutate(Number(assignmentId))}
        disabled={logMutation.isPending || !assignmentId}
        className="btn-primary w-full py-3"
      >
        {logMutation.isPending ? 'Đang lưu...' : 'Kết thúc buổi tập'}
      </button>
    </div>
  )
}

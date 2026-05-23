import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import workoutService, { Exercise, AddPlanDayDto, AddPlanExerciseDto } from '@/services/workout.service'

export default function PlanBuilderPage() {
  const { id: planId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [openDays, setOpenDays] = useState<Set<string>>(new Set())
  const [showAddDayModal, setShowAddDayModal] = useState(false)
  const [addDayForm, setAddDayForm] = useState({ dayNumber: 1, name: '', notes: '' })
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false)
  const [targetDayId, setTargetDayId] = useState<string | null>(null)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const [exerciseForm, setExerciseForm] = useState({
    orderIndex: 0,
    targetSets: 3,
    targetReps: '',
    targetDurationSec: '',
    targetWeightKg: '',
    restSeconds: '60',
    notes: '',
  })

  const { data: plan, isLoading } = useQuery({
    queryKey: ['workout-plan', planId],
    queryFn: () => workoutService.getPlan(planId!),
    enabled: !!planId,
  })

  const { data: allExercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => workoutService.getExercises(),
  })

  const addDayMutation = useMutation({
    mutationFn: (dto: AddPlanDayDto) => workoutService.addPlanDay(planId!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plan', planId] })
      setShowAddDayModal(false)
      setAddDayForm({ dayNumber: 1, name: '', notes: '' })
    },
  })

  const addExerciseMutation = useMutation({
    mutationFn: (dto: AddPlanExerciseDto) => workoutService.addPlanExercise(planId!, targetDayId!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plan', planId] })
      setShowAddExerciseModal(false)
      setSelectedExerciseId(null)
    },
  })

  const deleteExerciseMutation = useMutation({
    mutationFn: ({ dayId, peId }: { dayId: string; peId: string }) =>
      workoutService.deletePlanExercise(planId!, dayId, peId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workout-plan', planId] }),
  })

  const deleteDayMutation = useMutation({
    mutationFn: (dayId: string) => workoutService.deletePlanDay(planId!, dayId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workout-plan', planId] }),
  })

  const activateMutation = useMutation({
    mutationFn: () => workoutService.updatePlan(planId!, { status: 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plan', planId] })
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] })
    },
  })

  function toggleDay(dayId: string) {
    setOpenDays(prev => {
      const next = new Set(prev)
      next.has(dayId) ? next.delete(dayId) : next.add(dayId)
      return next
    })
  }

  function openAddExercise(dayId: string, dayExerciseCount: number) {
    setTargetDayId(dayId)
    setExerciseForm(f => ({ ...f, orderIndex: dayExerciseCount }))
    setShowAddExerciseModal(true)
  }

  function handleAddExercise(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedExerciseId) return
    addExerciseMutation.mutate({
      exerciseId: Number(selectedExerciseId),
      orderIndex: exerciseForm.orderIndex,
      targetSets: exerciseForm.targetSets,
      targetReps: exerciseForm.targetReps ? Number(exerciseForm.targetReps) : undefined,
      targetDurationSec: exerciseForm.targetDurationSec ? Number(exerciseForm.targetDurationSec) : undefined,
      targetWeightKg: exerciseForm.targetWeightKg ? Number(exerciseForm.targetWeightKg) : undefined,
      restSeconds: exerciseForm.restSeconds ? Number(exerciseForm.restSeconds) : undefined,
      notes: exerciseForm.notes || undefined,
    })
  }

  const filteredExercises = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    (ex.muscleGroup ?? '').toLowerCase().includes(exerciseSearch.toLowerCase())
  )

  if (isLoading) return <div className="p-6 text-on-surface-variant">Đang tải...</div>
  if (!plan) return <div className="p-6 text-error">Không tìm thấy plan</div>

  const days = plan.days ?? []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/trainer/plans')}
          className="text-sm text-on-surface-variant hover:text-on-surface mb-2"
        >
          Workout Plans /
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{plan.name}</h1>
            {plan.description && <p className="text-on-surface-variant mt-1">{plan.description}</p>}
          </div>
          {plan.status === 'draft' && (
            <button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending || days.length === 0}
              className="btn-primary flex items-center gap-2"
              title={days.length === 0 ? 'Thêm ít nhất 1 ngày tập trước khi kích hoạt' : undefined}
            >
              <Zap className="w-4 h-4" />
              {activateMutation.isPending ? 'Đang kích hoạt...' : 'Kích hoạt plan'}
            </button>
          )}
          {plan.status === 'active' && (
            <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-sm rounded-full">
              Đang hoạt động
            </span>
          )}
        </div>
      </div>

      {/* Days */}
      <div className="space-y-3 mb-6">
        {days.map(day => {
          const isOpen = openDays.has(day.planDayId)
          const exercises = day.exercises ?? []
          return (
            <div key={day.planDayId} className="border border-outline-variant rounded-lg overflow-hidden">
              <button
                onClick={() => toggleDay(day.planDayId)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-high hover:bg-surface-container text-left"
              >
                <div>
                  <span className="font-semibold">Ngày {day.dayNumber}: {day.name}</span>
                  <span className="ml-3 text-sm text-on-surface-variant">{exercises.length} bài tập</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); if (confirm('Xóa ngày tập này?')) deleteDayMutation.mutate(day.planDayId) }}
                    className="p-1 text-error hover:bg-error/10 rounded"
                    title="Xóa ngày"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>
              {isOpen && (
                <div className="p-4">
                  {day.notes && <p className="text-sm text-on-surface-variant mb-3">{day.notes}</p>}
                  {exercises.length > 0 ? (
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="border-b border-outline-variant">
                          <th className="text-left py-2 pr-4 font-medium text-on-surface-variant">#</th>
                          <th className="text-left py-2 pr-4 font-medium text-on-surface-variant">Bài tập</th>
                          <th className="text-left py-2 pr-4 font-medium text-on-surface-variant">Sets</th>
                          <th className="text-left py-2 pr-4 font-medium text-on-surface-variant">Reps</th>
                          <th className="text-left py-2 pr-4 font-medium text-on-surface-variant">Trọng lượng</th>
                          <th className="text-left py-2 pr-4 font-medium text-on-surface-variant">Nghỉ</th>
                          <th className="py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {exercises.map(pe => (
                          <tr key={pe.planExerciseId} className="border-b border-outline-variant">
                            <td className="py-2 pr-4 text-on-surface-variant">{pe.orderIndex + 1}</td>
                            <td className="py-2 pr-4 font-medium">{pe.exercise?.name ?? `Exercise ${pe.exerciseId}`}</td>
                            <td className="py-2 pr-4">{pe.targetSets}</td>
                            <td className="py-2 pr-4">{pe.targetReps ?? '—'}</td>
                            <td className="py-2 pr-4">{pe.targetWeightKg ? `${pe.targetWeightKg} kg` : '—'}</td>
                            <td className="py-2 pr-4">{pe.restSeconds ? `${pe.restSeconds}s` : '—'}</td>
                            <td className="py-2">
                              <button
                                onClick={() => deleteExerciseMutation.mutate({ dayId: day.planDayId, peId: pe.planExerciseId })}
                                className="p-1 text-error hover:bg-error/10 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-on-surface-variant mb-4">Chưa có bài tập nào</p>
                  )}
                  <button
                    onClick={() => openAddExercise(day.planDayId, exercises.length)}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm bài tập
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Day Button */}
      {plan.status === 'draft' && (
        <button
          onClick={() => { setAddDayForm(f => ({ ...f, dayNumber: days.length + 1 })); setShowAddDayModal(true) }}
          className="flex items-center gap-2 border-2 border-dashed border-outline rounded-lg px-4 py-3 text-on-surface-variant hover:border-primary hover:text-primary w-full justify-center"
        >
          <Plus className="w-5 h-5" />
          Thêm ngày tập
        </button>
      )}

      {/* Add Day Modal */}
      {showAddDayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Thêm ngày tập</h2>
            <form onSubmit={e => { e.preventDefault(); addDayMutation.mutate(addDayForm) }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Số thứ tự ngày *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={addDayForm.dayNumber}
                  onChange={e => setAddDayForm(f => ({ ...f, dayNumber: Number(e.target.value) }))}
                  className="input-base w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên ngày tập *</label>
                <input
                  type="text"
                  required
                  value={addDayForm.name}
                  onChange={e => setAddDayForm(f => ({ ...f, name: e.target.value }))}
                  className="input-base w-full"
                  placeholder="Ví dụ: Ngực + Tay sau"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  value={addDayForm.notes}
                  onChange={e => setAddDayForm(f => ({ ...f, notes: e.target.value }))}
                  className="input-base w-full"
                  rows={2}
                />
              </div>
              {addDayMutation.isError && (
                <p className="text-sm text-error">
                  {(addDayMutation.error as Error | null)?.message || 'Có lỗi xảy ra'}
                </p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddDayModal(false)} className="flex-1 btn-secondary">Hủy</button>
                <button type="submit" disabled={addDayMutation.isPending} className="flex-1 btn-primary">
                  {addDayMutation.isPending ? 'Đang thêm...' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Thêm bài tập</h2>
            <form onSubmit={handleAddExercise} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chọn bài tập *</label>
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc nhóm cơ..."
                  value={exerciseSearch}
                  onChange={e => setExerciseSearch(e.target.value)}
                  className="input-base w-full mb-2"
                />
                <div className="max-h-40 overflow-y-auto border border-outline-variant rounded-lg divide-y divide-outline-variant">
                  {filteredExercises.map((ex: Exercise) => (
                    <button
                      key={ex.exerciseId}
                      type="button"
                      onClick={() => setSelectedExerciseId(ex.exerciseId)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-container-high ${
                        selectedExerciseId === ex.exerciseId ? 'bg-secondary-container' : ''
                      }`}
                    >
                      <span className="font-medium">{ex.name}</span>
                      {ex.muscleGroup && <span className="ml-2 text-on-surface-variant">{ex.muscleGroup}</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Sets *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={exerciseForm.targetSets}
                    onChange={e => setExerciseForm(f => ({ ...f, targetSets: Number(e.target.value) }))}
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reps</label>
                  <input
                    type="number"
                    min={1}
                    value={exerciseForm.targetReps}
                    onChange={e => setExerciseForm(f => ({ ...f, targetReps: e.target.value }))}
                    className="input-base w-full"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Trọng lượng (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={exerciseForm.targetWeightKg}
                    onChange={e => setExerciseForm(f => ({ ...f, targetWeightKg: e.target.value }))}
                    className="input-base w-full"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Thời gian nghỉ (giây)</label>
                  <input
                    type="number"
                    min={0}
                    value={exerciseForm.restSeconds}
                    onChange={e => setExerciseForm(f => ({ ...f, restSeconds: e.target.value }))}
                    className="input-base w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thứ tự</label>
                <input
                  type="number"
                  min={0}
                  value={exerciseForm.orderIndex}
                  onChange={e => setExerciseForm(f => ({ ...f, orderIndex: Number(e.target.value) }))}
                  className="input-base w-full"
                />
              </div>
              {addExerciseMutation.isError && (
                <p className="text-sm text-error">
                  {(addExerciseMutation.error as Error | null)?.message || 'Có lỗi xảy ra'}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddExerciseModal(false); setSelectedExerciseId(null) }}
                  className="flex-1 btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!selectedExerciseId || addExerciseMutation.isPending}
                  className="flex-1 btn-primary"
                >
                  {addExerciseMutation.isPending ? 'Đang thêm...' : 'Thêm bài tập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

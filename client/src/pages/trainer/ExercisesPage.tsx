import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import workoutService, { Exercise, ExerciseCategory, CreateExerciseDto, UpdateExerciseDto } from '@/services/workout.service'

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  strength: 'Sức mạnh',
  cardio: 'Cardio',
  flexibility: 'Linh hoạt',
  balance: 'Thăng bằng',
}

const CATEGORIES: ExerciseCategory[] = ['strength', 'cardio', 'flexibility', 'balance']

interface ExerciseFormData {
  name: string
  category: ExerciseCategory
  muscleGroup: string
  equipmentNeeded: string
  description: string
}

const emptyForm: ExerciseFormData = {
  name: '',
  category: 'strength',
  muscleGroup: '',
  equipmentNeeded: '',
  description: '',
}

export default function ExercisesPage() {
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | ''>('')
  const [muscleGroupFilter, setMuscleGroupFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ExerciseFormData>(emptyForm)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises', categoryFilter, muscleGroupFilter],
    queryFn: () =>
      workoutService.getExercises({
        category: categoryFilter || undefined,
        muscleGroup: muscleGroupFilter || undefined,
      }),
  })

  const createMutation = useMutation({
    mutationFn: (dto: CreateExerciseDto) => workoutService.createExercise(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      closeModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateExerciseDto }) => workoutService.updateExercise(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workoutService.deleteExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      setDeleteConfirmId(null)
    },
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(ex: Exercise) {
    setEditingId(ex.exerciseId)
    setForm({
      name: ex.name,
      category: ex.category,
      muscleGroup: ex.muscleGroup ?? '',
      equipmentNeeded: ex.equipmentNeeded ?? '',
      description: ex.description ?? '',
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const dto = {
      name: form.name,
      category: form.category,
      muscleGroup: form.muscleGroup || undefined,
      equipmentNeeded: form.equipmentNeeded || undefined,
      description: form.description || undefined,
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, dto })
    } else {
      createMutation.mutate(dto)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Thư viện bài tập</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm bài tập
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as ExerciseCategory | '')}
          className="input-base"
        >
          <option value="">Tất cả danh mục</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Nhóm cơ..."
            value={muscleGroupFilter}
            onChange={e => setMuscleGroupFilter(e.target.value)}
            className="input-base pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-high border-b border-outline-variant">
              <th className="px-4 py-3 text-left font-semibold">Tên bài tập</th>
              <th className="px-4 py-3 text-left font-semibold">Danh mục</th>
              <th className="px-4 py-3 text-left font-semibold">Nhóm cơ</th>
              <th className="px-4 py-3 text-left font-semibold">Dụng cụ</th>
              <th className="px-4 py-3 text-left font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">Đang tải...</td>
              </tr>
            ) : exercises.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">Chưa có bài tập nào</td>
              </tr>
            ) : (
              exercises.map(ex => (
                <tr key={ex.exerciseId} className="border-b border-outline-variant hover:bg-surface-container-high">
                  <td className="px-4 py-3 font-medium">{ex.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-secondary-container text-on-secondary-container">
                      {CATEGORY_LABELS[ex.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{ex.muscleGroup ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{ex.equipmentNeeded ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(ex)}
                        className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(ex.exerciseId)}
                        className="p-2 text-error hover:bg-surface-container-high rounded"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Cập nhật bài tập' : 'Thêm bài tập mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên bài tập *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-base w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Danh mục *</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as ExerciseCategory }))}
                  className="input-base w-full"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nhóm cơ</label>
                <input
                  type="text"
                  value={form.muscleGroup}
                  onChange={e => setForm(f => ({ ...f, muscleGroup: e.target.value }))}
                  className="input-base w-full"
                  placeholder="Ví dụ: chest, back, legs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dụng cụ</label>
                <input
                  type="text"
                  value={form.equipmentNeeded}
                  onChange={e => setForm(f => ({ ...f, equipmentNeeded: e.target.value }))}
                  className="input-base w-full"
                  placeholder="Ví dụ: Barbell, Dumbbell"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input-base w-full"
                  rows={3}
                />
              </div>
              {(createMutation.isError || updateMutation.isError) && (
                <p className="text-sm text-error">
                  {(createMutation.error as Error | null)?.message ||
                   (updateMutation.error as Error | null)?.message ||
                   'Có lỗi xảy ra'}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                  Hủy
                </button>
                <button type="submit" disabled={isPending} className="flex-1 btn-primary">
                  {isPending ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold mb-2">Xác nhận xóa</h2>
            <p className="text-on-surface-variant mb-6">
              Bài tập sẽ bị xóa mềm. Bài tập đang dùng trong plan active sẽ không thể xóa.
            </p>
            {deleteMutation.isError && (
              <p className="text-sm text-error mb-4">
                {(deleteMutation.error as Error | null)?.message || 'Không thể xóa bài tập này'}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 btn-secondary">
                Hủy
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-error text-on-error px-4 py-2 rounded-lg hover:bg-error/90"
              >
                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

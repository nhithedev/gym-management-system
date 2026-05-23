import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface LessonPlan {
  id?: string
  name: string
  exercises: string[]
  objective: string
  duration: number
}

export default function CreateLessonPlan() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [form, setForm] = useState<LessonPlan>({
    name: '',
    exercises: [''],
    objective: '',
    duration: 60,
  })
  const [viewOnly, setViewOnly] = useState(false)

  useEffect(() => {
    if (location.state?.plan) {
      setForm(location.state.plan)
      setViewOnly(location.state.viewOnly || false)
    }
  }, [location.state])

  const handleAddExercise = () => {
    setForm({
      ...form,
      exercises: [...form.exercises, ''],
    })
  }

  const handleRemoveExercise = (index: number) => {
    setForm({
      ...form,
      exercises: form.exercises.filter((_, i) => i !== index),
    })
  }

  const handleExerciseChange = (index: number, value: string) => {
    const newExercises = [...form.exercises]
    newExercises[index] = value
    setForm({ ...form, exercises: newExercises })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // API call would go here
    console.log('Saving lesson plan:', form)
    navigate('/trainer/lesson-plan')
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/trainer/lesson-plan')}
          className="p-2 hover:bg-surface-container-high rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">
          {viewOnly ? 'Xem giáo án' : id ? 'Chỉnh sửa giáo án' : 'Tạo giáo án mới'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-surface-container p-6 rounded-lg">
        {/* Tên giáo án */}
        <div>
          <label className="block text-sm font-medium mb-2">Tên giáo án *</label>
          <input
            type="text"
            disabled={viewOnly}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ví dụ: Giáo án tập lưng 1"
            className="w-full px-3 py-2 border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-surface-container-high disabled:cursor-not-allowed"
            required
          />
        </div>

        {/* Mục tiêu */}
        <div>
          <label className="block text-sm font-medium mb-2">Mục tiêu *</label>
          <textarea
            disabled={viewOnly}
            value={form.objective}
            onChange={(e) => setForm({ ...form, objective: e.target.value })}
            placeholder="Mục tiêu của buổi tập này"
            rows={3}
            className="w-full px-3 py-2 border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-surface-container-high disabled:cursor-not-allowed"
            required
          />
        </div>

        {/* Thời lượng */}
        <div>
          <label className="block text-sm font-medium mb-2">Thời lượng (phút) *</label>
          <input
            type="number"
            disabled={viewOnly}
            min="15"
            max="180"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-surface-container-high disabled:cursor-not-allowed"
            required
          />
        </div>

        {/* Danh sách bài tập */}
        <div>
          <label className="block text-sm font-medium mb-3">Danh sách bài tập *</label>
          <div className="space-y-2">
            {form.exercises.map((exercise, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  disabled={viewOnly}
                  value={exercise}
                  onChange={(e) => handleExerciseChange(index, e.target.value)}
                  placeholder={`Bài tập ${index + 1}`}
                  className="flex-1 px-3 py-2 border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-surface-container-high disabled:cursor-not-allowed"
                  required
                />
                {!viewOnly && form.exercises.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(index)}
                    className="px-3 py-2 bg-error/10 text-error rounded-lg hover:bg-error/20"
                  >
                    Xóa
                  </button>
                )}
              </div>
            ))}
          </div>
          {!viewOnly && (
            <button
              type="button"
              onClick={handleAddExercise}
              className="mt-3 px-4 py-2 border border-outline rounded-lg hover:bg-surface-container-high"
            >
              + Thêm bài tập
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/trainer/lesson-plan')}
            className="flex-1 px-4 py-2 border border-outline rounded-lg hover:bg-surface-container-high"
          >
            Hủy
          </button>
          {!viewOnly && (
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              {id ? 'Cập nhật' : 'Tạo mới'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

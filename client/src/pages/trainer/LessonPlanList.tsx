import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Eye, Trash2, Users } from 'lucide-react'

interface LessonPlan {
  id: string
  name: string
  exercises: string[]
  objective: string
  duration: number
  createdAt: string
}

export default function LessonPlanList() {
  const navigate = useNavigate()
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([
    {
      id: '1',
      name: 'Giáo án tập lưng 1',
      exercises: ['Kéo xà', 'Rowing máy', 'Lat pulldown'],
      objective: 'Tăng sức mạnh lưng',
      duration: 60,
      createdAt: '2024-05-20',
    },
    {
      id: '2',
      name: 'Giáo án ngực 1',
      exercises: ['Đẩy ngực', 'Bench press', 'Dumbbell fly'],
      objective: 'Phát triển ngực',
      duration: 45,
      createdAt: '2024-05-19',
    },
  ])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null)

  const handleEdit = (plan: LessonPlan) => {
    navigate(`/trainer/lesson-plan/${plan.id}`, { state: { plan } })
  }

  const handleView = (plan: LessonPlan) => {
    navigate(`/trainer/lesson-plan/${plan.id}`, { state: { plan, viewOnly: true } })
  }

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa giáo án này?')) {
      setLessonPlans(lessonPlans.filter(p => p.id !== id))
    }
  }

  const handleAssign = (plan: LessonPlan) => {
    setSelectedPlan(plan)
    setShowAssignModal(true)
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Danh sách Giáo án</h1>
        <button
          onClick={() => navigate('/trainer/lesson-plan/create')}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Tạo giáo án mới
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-high border-b border-outline-variant">
              <th className="px-4 py-3 text-left font-semibold">Tên giáo án</th>
              <th className="px-4 py-3 text-left font-semibold">Bài tập</th>
              <th className="px-4 py-3 text-left font-semibold">Mục tiêu</th>
              <th className="px-4 py-3 text-left font-semibold">Thời lượng</th>
              <th className="px-4 py-3 text-left font-semibold">Ngày tạo</th>
              <th className="px-4 py-3 text-left font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {lessonPlans.map((plan) => (
              <tr key={plan.id} className="border-b border-outline-variant hover:bg-surface-container-high">
                <td className="px-4 py-3 font-medium">{plan.name}</td>
                <td className="px-4 py-3">
                  <div className="text-sm text-on-surface-variant">
                    {plan.exercises.length} bài tập
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{plan.objective}</td>
                <td className="px-4 py-3 text-sm">{plan.duration} phút</td>
                <td className="px-4 py-3 text-sm">{plan.createdAt}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleView(plan)}
                      className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded"
                      title="Xem"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(plan)}
                      className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAssign(plan)}
                      className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded"
                      title="Gán cho hội viên"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-2 text-error hover:bg-surface-container-high rounded"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal gán giáo án */}
      {showAssignModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Gán giáo án cho hội viên</h2>
            <p className="text-on-surface-variant mb-4">
              Giáo án: <strong>{selectedPlan.name}</strong>
            </p>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span>Học viên 1 - Nguyễn Văn A</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span>Học viên 2 - Trần Thị B</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span>Học viên 3 - Lê Văn C</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 border border-outline rounded-lg hover:bg-surface-container-high"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  // Handle assign
                  setShowAssignModal(false)
                }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

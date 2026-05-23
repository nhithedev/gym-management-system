import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Users, ChevronRight } from 'lucide-react'
import workoutService, { WorkoutPlan, WorkoutPlanStatus } from '@/services/workout.service'

const STATUS_LABELS: Record<WorkoutPlanStatus, string> = {
  draft: 'Nháp',
  active: 'Đang dùng',
  archived: 'Lưu trữ',
}

const STATUS_COLORS: Record<WorkoutPlanStatus, string> = {
  draft: 'bg-surface-container text-on-surface-variant',
  active: 'bg-secondary-container text-on-secondary-container',
  archived: 'bg-surface-container-high text-on-surface-variant',
}

export default function WorkoutPlansPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null)
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanDesc, setNewPlanDesc] = useState('')
  const [assignMemberId, setAssignMemberId] = useState('')
  const [assignStartDate, setAssignStartDate] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['workout-plans'],
    queryFn: () => workoutService.getPlans(),
  })

  const createMutation = useMutation({
    mutationFn: () => workoutService.createPlan({ name: newPlanName, description: newPlanDesc || undefined }),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] })
      setShowCreateModal(false)
      setNewPlanName('')
      setNewPlanDesc('')
      navigate(`/trainer/plans/${plan.planId}/builder`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workoutService.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] })
      setDeleteConfirmId(null)
    },
  })

  const assignMutation = useMutation({
    mutationFn: () =>
      workoutService.assignPlan(assignMemberId, {
        planId: Number(selectedPlan!.planId),
        startDate: assignStartDate,
      }),
    onSuccess: () => {
      setShowAssignModal(false)
      setAssignMemberId('')
      setAssignStartDate('')
      setSelectedPlan(null)
    },
  })

  function openAssign(plan: WorkoutPlan) {
    setSelectedPlan(plan)
    setAssignStartDate(new Date().toISOString().split('T')[0])
    setShowAssignModal(true)
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workout Plans</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tạo plan mới
        </button>
      </div>

      {isLoading ? (
        <p className="text-on-surface-variant">Đang tải...</p>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <p className="text-lg mb-2">Chưa có workout plan nào</p>
          <p className="text-sm">Tạo plan đầu tiên để bắt đầu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            const dayCount = plan.days?.length ?? 0
            const exerciseCount = plan.days?.reduce((sum, d) => sum + (d.exercises?.length ?? 0), 0) ?? 0
            return (
              <div key={plan.planId} className="card p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg leading-tight">{plan.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[plan.status]}`}>
                    {STATUS_LABELS[plan.status]}
                  </span>
                </div>
                {plan.description && (
                  <p className="text-sm text-on-surface-variant line-clamp-2">{plan.description}</p>
                )}
                <div className="flex gap-4 text-sm text-on-surface-variant">
                  <span>{dayCount} ngày tập</span>
                  <span>{exerciseCount} bài tập</span>
                </div>
                <div className="flex gap-2 mt-auto pt-2 border-t border-outline-variant">
                  <button
                    onClick={() => navigate(`/trainer/plans/${plan.planId}/builder`)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm border border-outline rounded-lg hover:bg-surface-container-high"
                  >
                    <Pencil className="w-3 h-3" />
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={() => openAssign(plan)}
                    disabled={plan.status !== 'active'}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={plan.status !== 'active' ? 'Phải kích hoạt plan trước khi giao' : undefined}
                  >
                    <Users className="w-3 h-3" />
                    Giao cho member
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(plan.planId)}
                    className="p-2 text-error hover:bg-surface-container-high rounded-lg"
                    title="Xóa plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Tạo workout plan mới</h2>
            <form
              onSubmit={e => { e.preventDefault(); createMutation.mutate() }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Tên plan *</label>
                <input
                  type="text"
                  required
                  value={newPlanName}
                  onChange={e => setNewPlanName(e.target.value)}
                  className="input-base w-full"
                  placeholder="Ví dụ: Full Body 3 ngày"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={newPlanDesc}
                  onChange={e => setNewPlanDesc(e.target.value)}
                  className="input-base w-full"
                  rows={3}
                />
              </div>
              {createMutation.isError && (
                <p className="text-sm text-error">
                  {(createMutation.error as Error | null)?.message || 'Có lỗi xảy ra'}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {createMutation.isPending ? 'Đang tạo...' : (
                    <>Tạo và mở builder <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Plan Modal */}
      {showAssignModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-1">Giao plan cho member</h2>
            <p className="text-sm text-on-surface-variant mb-4">Plan: {selectedPlan.name}</p>
            <form
              onSubmit={e => { e.preventDefault(); assignMutation.mutate() }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Member ID *</label>
                <input
                  type="number"
                  required
                  value={assignMemberId}
                  onChange={e => setAssignMemberId(e.target.value)}
                  className="input-base w-full"
                  placeholder="Nhập ID của member"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ngày bắt đầu *</label>
                <input
                  type="date"
                  required
                  value={assignStartDate}
                  onChange={e => setAssignStartDate(e.target.value)}
                  className="input-base w-full"
                />
              </div>
              {assignMutation.isError && (
                <p className="text-sm text-error">
                  {(assignMutation.error as Error | null)?.message || 'Có lỗi xảy ra'}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending}
                  className="flex-1 btn-primary"
                >
                  {assignMutation.isPending ? 'Đang giao...' : 'Xác nhận giao'}
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
              Plan đang được giao cho member (status active) sẽ không thể xóa.
            </p>
            {deleteMutation.isError && (
              <p className="text-sm text-error mb-4">
                {(deleteMutation.error as Error | null)?.message || 'Không thể xóa plan này'}
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

import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Archive, ClipboardList, Pencil, Plus, Search, Send, Trash2, Zap } from 'lucide-react'
import { useTrainerPlans } from '@/hooks/useTrainerPlans'
import { useTrainerStudents } from '@/hooks/useTrainerStudents'
import { getApiError } from '@/lib/api-error'
import { formatDate, todayInput } from '@/lib/date'
import workoutService, { type WorkoutPlan } from '@/services/workout.service'
import {
  StudentCombobox,
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

type PlanAction = { type: 'archive' | 'delete'; plan: WorkoutPlan } | null

export default function WorkoutPlansPage() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useTrainerPlans()
  const { data: students } = useTrainerStudents({ pageSize: 100 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [assignPlan, setAssignPlan] = useState<WorkoutPlan | null>(null)
  const [memberId, setMemberId] = useState('')
  const [startDate, setStartDate] = useState(todayInput())
  const [assignNotes, setAssignNotes] = useState('')
  const [action, setAction] = useState<PlanAction>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const plans = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi')
    return data.filter(
      (plan) =>
        (!status || plan.status === status) &&
        (!query || plan.name.toLocaleLowerCase('vi').includes(query))
    )
  }, [data, search, status])

  async function createPlan(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setActionError(null)
    try {
      const plan = await workoutService.createPlan({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setCreateOpen(false)
      navigate(`/trainer/plans/${plan.planId}/builder`)
    } catch (err) {
      setActionError(getApiError(err, 'Không thể tạo kế hoạch tập.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function activate(plan: WorkoutPlan) {
    const exerciseCount =
      plan.days?.reduce((sum, day) => sum + (day.exercises?.length ?? 0), 0) ?? 0
    if (!plan.days?.length || exerciseCount === 0) {
      setActionError('Kế hoạch cần ít nhất một ngày và một bài tập trước khi kích hoạt.')
      return
    }
    setActionError(null)
    try {
      await workoutService.updatePlan(plan.planId, { status: 'active' })
      await reload()
    } catch (err) {
      setActionError(getApiError(err, 'Không thể kích hoạt kế hoạch.'))
    }
  }

  async function confirmAction() {
    if (!action) return
    setSubmitting(true)
    setActionError(null)
    try {
      if (action.type === 'archive') {
        await workoutService.updatePlan(action.plan.planId, { status: 'archived' })
      } else {
        await workoutService.deletePlan(action.plan.planId)
      }
      setAction(null)
      await reload()
    } catch (err) {
      setActionError(
        getApiError(
          err,
          action.type === 'archive'
            ? 'Không thể lưu trữ kế hoạch khi còn assignment active.'
            : 'Không thể xóa kế hoạch khi còn dữ liệu đang sử dụng.'
        )
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function assign(event: FormEvent) {
    event.preventDefault()
    if (!assignPlan || !memberId) return
    setSubmitting(true)
    setActionError(null)
    try {
      await workoutService.assignPlan(memberId, {
        planId: Number(assignPlan.planId),
        startDate,
        notes: assignNotes.trim() || undefined,
      })
      navigate(`/trainer/students/${memberId}?tab=workout`)
    } catch (err) {
      setActionError(
        getApiError(err, 'Không thể gán kế hoạch. Hãy kiểm tra trạng thái và cấu trúc kế hoạch.')
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Workout"
        title="Kế hoạch tập"
        description="Tạo template giáo án, kích hoạt và gán cho học viên của bạn."
        actions={
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} /> Tạo kế hoạch
          </button>
        }
      />
      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-[1fr_240px]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rogym-text-dim)]"
            size={17}
          />
          <input
            className="rogym-input pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên kế hoạch"
          />
        </div>
        <TrainerSelect
          value={status}
          onValueChange={setStatus}
        >
          <option value="">Mọi trạng thái</option>
          <option value="draft">Bản nháp</option>
          <option value="active">Đang hoạt động</option>
          <option value="archived">Lưu trữ</option>
        </TrainerSelect>
      </div>
      {(error || actionError) && (
        <TrainerErrorState message={actionError ?? error!} onRetry={error ? reload : undefined} />
      )}
      {loading ? (
        <TrainerSkeleton rows={5} />
      ) : plans.length === 0 ? (
        <TrainerEmptyState
          title="Chưa có kế hoạch tập"
          description="Tạo template đầu tiên để bắt đầu xây dựng giáo án."
          action={
            <button
              type="button"
              className="rogym-btn rogym-btn--primary"
              onClick={() => setCreateOpen(true)}
            >
              Tạo kế hoạch
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => {
            const exerciseCount =
              plan.days?.reduce((sum, day) => sum + (day.exercises?.length ?? 0), 0) ?? 0
            return (
              <article key={plan.planId} className="rogym-card rogym-card--compact p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--rogym-text-secondary)]">
                      {plan.description ?? 'Chưa có mô tả.'}
                    </p>
                  </div>
                  <TrainerStatusBadge status={plan.status} />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                  <Metric value={plan.days?.length ?? 0} label="Ngày tập" />
                  <Metric value={exerciseCount} label="Bài tập" />
                  <Metric value={formatDate(plan.createdAt)} label="Ngày tạo" />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    className="rogym-btn rogym-btn--outline-white"
                    to={`/trainer/plans/${plan.planId}/builder`}
                  >
                    {plan.status === 'archived' ? (
                      <ClipboardList size={15} />
                    ) : (
                      <Pencil size={15} />
                    )}
                    {plan.status === 'archived' ? 'Xem' : 'Builder'}
                  </Link>
                  {plan.status === 'draft' && (
                    <button
                      type="button"
                      className="rogym-btn rogym-btn--primary"
                      onClick={() => activate(plan)}
                    >
                      <Zap size={15} /> Kích hoạt
                    </button>
                  )}
                  {plan.status === 'active' && (
                    <button
                      type="button"
                      className="rogym-btn rogym-btn--primary"
                      onClick={() => {
                        setMemberId('')
                        setAssignNotes('')
                        setAssignPlan(plan)
                      }}
                    >
                      <Send size={15} /> Gán học viên
                    </button>
                  )}
                  {plan.status !== 'archived' && (
                    <button
                      type="button"
                      className="rogym-btn rogym-btn--outline-white"
                      onClick={() => setAction({ type: 'archive', plan })}
                    >
                      <Archive size={15} /> Lưu trữ
                    </button>
                  )}
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--danger"
                    onClick={() => setAction({ type: 'delete', plan })}
                  >
                    <Trash2 size={15} /> Xóa
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <TrainerModal
        open={createOpen}
        title="Tạo kế hoạch tập"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setCreateOpen(false)}
            >
              Hủy
            </button>
            <SubmitButton form="create-plan-form" loading={submitting} disabled={!name.trim()}>
              Tạo và mở builder
            </SubmitButton>
          </>
        }
      >
        <form id="create-plan-form" className="space-y-4" onSubmit={createPlan}>
          <label className="block space-y-2">
            <span className="rogym-field-label">Tên kế hoạch</span>
            <input
              className="rogym-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              autoFocus
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Mô tả</span>
            <textarea
              className="rogym-input min-h-28"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </form>
      </TrainerModal>

      <TrainerModal
        open={Boolean(assignPlan)}
        title={`Gán ${assignPlan?.name ?? 'kế hoạch'}`}
        onClose={() => setAssignPlan(null)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setAssignPlan(null)}
            >
              Hủy
            </button>
            <SubmitButton form="assign-plan-list-form" loading={submitting} disabled={!memberId}>
              Gán kế hoạch
            </SubmitButton>
          </>
        }
      >
        <form id="assign-plan-list-form" className="space-y-4" onSubmit={assign}>
          <label className="block space-y-2">
            <span className="rogym-field-label">Học viên</span>
            <StudentCombobox students={students} value={memberId} onChange={setMemberId} />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Ngày bắt đầu</span>
            <input
              className="rogym-input"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Ghi chú</span>
            <textarea
              className="rogym-input min-h-24"
              value={assignNotes}
              onChange={(event) => setAssignNotes(event.target.value)}
            />
          </label>
          <p className="text-xs leading-5 text-amber-200">
            Assignment active hiện tại của học viên sẽ tự động chuyển sang trạng thái đã thay thế.
          </p>
        </form>
      </TrainerModal>

      <TrainerModal
        open={Boolean(action)}
        title={action?.type === 'delete' ? 'Xóa kế hoạch' : 'Lưu trữ kế hoạch'}
        onClose={() => setAction(null)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setAction(null)}
            >
              Hủy
            </button>
            <button
              type="button"
              className={
                action?.type === 'delete'
                  ? 'rogym-btn rogym-btn--danger'
                  : 'rogym-btn rogym-btn--primary'
              }
              onClick={confirmAction}
              disabled={submitting}
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 text-[var(--rogym-text-secondary)]">
          {action?.type === 'delete'
            ? 'Kế hoạch sẽ bị xóa mềm. Thao tác có thể bị từ chối nếu vẫn còn assignment active hoặc dữ liệu lịch sử liên quan.'
            : 'Kế hoạch lưu trữ sẽ chuyển sang chỉ đọc và không thể kích hoạt lại.'}
        </p>
      </TrainerModal>
    </TrainerPage>
  )
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="truncate text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">{label}</div>
    </div>
  )
}

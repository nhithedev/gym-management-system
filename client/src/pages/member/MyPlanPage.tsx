import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, ChevronRight, Dumbbell } from 'lucide-react'
import workoutService from '@/services/workout.service'

export default function MyPlanPage() {
  const navigate = useNavigate()

  // Fetch my active assignment (list returns scoped to member)
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['workout-plans'],
    queryFn: () => workoutService.getPlans(),
  })

  // Plan list for member returns only plans belonging to member (active assignment + own created plans)
  // We show the first active-status plan as the current plan
  const activePlan = plans.find(p => p.status === 'active')
  const draftPlans = plans.filter(p => p.status === 'draft')

  if (isLoading) {
    return <div className="p-6 text-on-surface-variant">Đang tải...</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Kế hoạch tập luyện</h1>
        <button
          onClick={() => navigate('/member/workout-create-plan')}
          className="btn-secondary text-sm"
        >
          Tự tạo plan
        </button>
      </div>

      {/* Active Plan */}
      {activePlan ? (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Plan hiện tại</h2>
          <div className="card p-4 mb-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold">{activePlan.name}</h3>
              <span className="px-2 py-0.5 text-xs rounded-full bg-secondary-container text-on-secondary-container">
                Đang dùng
              </span>
            </div>
            {activePlan.description && (
              <p className="text-on-surface-variant text-sm mb-3">{activePlan.description}</p>
            )}
            <div className="flex gap-4 text-sm text-on-surface-variant mb-4">
              <span>{activePlan.days?.length ?? 0} ngày tập</span>
            </div>

            {/* Days */}
            <div className="space-y-2">
              {(activePlan.days ?? []).map(day => {
                const exerciseCount = day.exercises?.length ?? 0
                return (
                  <button
                    key={day.planDayId}
                    onClick={() => navigate(`/member/workout?dayId=${day.planDayId}`)}
                    className="w-full flex items-center justify-between p-3 border border-outline-variant rounded-lg hover:bg-surface-container-high text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary-container text-on-primary-container rounded-full text-sm font-bold">
                        {day.dayNumber}
                      </div>
                      <div>
                        <p className="font-medium">{day.name}</p>
                        <p className="text-xs text-on-surface-variant">{exerciseCount} bài tập</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-primary">
                      <span className="text-sm">Tập hôm nay</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center mb-6">
          <Dumbbell className="w-12 h-12 mx-auto text-on-surface-variant mb-3" />
          <h2 className="text-lg font-semibold mb-2">Chưa có kế hoạch tập</h2>
          <p className="text-on-surface-variant text-sm mb-4">
            Liên hệ PT để được giao plan, hoặc tự tạo plan của riêng bạn.
          </p>
          <button
            onClick={() => navigate('/member/workout-create-plan')}
            className="btn-primary"
          >
            Tự tạo plan
          </button>
        </div>
      )}

      {/* Draft Plans */}
      {draftPlans.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Plan nháp của tôi</h2>
          <div className="space-y-2">
            {draftPlans.map(plan => (
              <div key={plan.planId} className="flex items-center justify-between p-3 border border-outline-variant rounded-lg">
                <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-xs text-on-surface-variant">{plan.days?.length ?? 0} ngày tập · Nháp</p>
                </div>
                <button
                  onClick={() => navigate(`/member/workout-create-plan/${plan.planId}`)}
                  className="text-sm text-primary hover:underline"
                >
                  Tiếp tục chỉnh sửa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="mt-6">
        <button
          onClick={() => navigate('/member/workout-history')}
          className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface"
        >
          <Calendar className="w-4 h-4" />
          Xem lịch sử tập luyện
        </button>
      </div>
    </div>
  )
}

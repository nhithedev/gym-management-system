import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Package,
  MessageSquare,
  Wrench,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  Shield,
} from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { FEEDBACK_SEVERITY_COLOR, FEEDBACK_SEVERITY_LABEL } from '@/lib/owner-constants'
import { useAuthStore } from '@/stores/authStore'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import { memberService } from '@/services/member.service'
import packageService from '@/services/package.service'
import { facilityService } from '@/services/facility.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerStatCard,
  OwnerBadge,
} from '@/components/OwnerUI'

export default function OwnerDashboardPage() {
  const user = useAuthStore((s) => s.user)

  const [memberTotal, setMemberTotal] = useState(0)
  const [openFeedbacks, setOpenFeedbacks] = useState<Feedback[]>([])
  const [openFeedbackCount, setOpenFeedbackCount] = useState(0)
  const [totalPackages, setTotalPackages] = useState(0)
  const [equipmentBroken, setEquipmentBroken] = useState(0)
  const [equipmentRepairing, setEquipmentRepairing] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      memberService.list({ pageSize: 1 }),
      feedbackService.list({ status: 'open', pageSize: 100 }),
      packageService.list({ pageSize: 1, status: 'active' }),
      facilityService.listEquipment({ status: 'broken', pageSize: 1 }),
      facilityService.listEquipment({ status: 'repairing', pageSize: 1 }),
    ])
      .then(([members, feedbacks, packages, brokenEq, repairingEq]) => {
        setMemberTotal(members.total)
        setOpenFeedbacks(feedbacks.data.slice(0, 5))
        setOpenFeedbackCount(feedbacks.total)
        setTotalPackages(packages.meta?.total ?? 0)
        setEquipmentBroken(brokenEq.total)
        setEquipmentRepairing(repairingEq.total)
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải tổng quan.')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Owner workspace"
        title={`Xin chào, ${user?.fullName ?? 'Owner'}`}
        description="Đây là tổng quan toàn bộ hệ thống phòng gym."
        actions={
          <Link className="rogym-btn rogym-btn--primary" to="/owner/reports">
            <TrendingUp size={16} /> Xem báo cáo
          </Link>
        }
      />

      {loading ? (
        <OwnerSkeleton rows={6} />
      ) : error ? (
        <OwnerErrorState message={error} />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OwnerStatCard
              icon={<Users size={20} />}
              label="Tổng hội viên"
              value={memberTotal}
              hint="Hội viên trong hệ thống"
              accent
            />
            <OwnerStatCard
              icon={<Package size={20} />}
              label="Gói tập đang bán"
              value={totalPackages}
              hint="Gói active trên hệ thống"
            />
            <OwnerStatCard
              icon={<MessageSquare size={20} />}
              label="Phản hồi chờ xử lý"
              value={openFeedbackCount}
              hint={openFeedbackCount > 0 ? 'Cần xử lý sớm' : 'Tất cả đã xử lý'}
              accent={openFeedbackCount > 0}
            />
            <OwnerStatCard
              icon={<Wrench size={20} />}
              label="Thiết bị hỏng / đang sửa"
              value={equipmentBroken + equipmentRepairing}
              hint={
                equipmentBroken + equipmentRepairing > 0
                  ? `${equipmentBroken} hỏng, ${equipmentRepairing} đang sửa`
                  : 'Tất cả thiết bị hoạt động tốt'
              }
              accent={equipmentBroken + equipmentRepairing > 0}
            />
          </div>

          {/* Equipment Alert */}
          {(equipmentBroken > 0 || equipmentRepairing > 0) && (
            <div className="rogym-error-alert flex items-center gap-4">
              <AlertTriangle size={20} className="shrink-0 text-red-400" />
              <div className="flex-1 text-sm">
                <span className="font-semibold">Cảnh báo thiết bị: </span>
                {equipmentBroken > 0 && <span>{equipmentBroken} thiết bị hỏng, </span>}
                {equipmentRepairing > 0 && <span>{equipmentRepairing} đang sửa chữa</span>}
              </div>
            </div>
          )}

          {/* Bottom 2-col grid */}
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            {/* Member summary */}
            <section className="rogym-card rogym-card--compact p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Hội viên & Gói tập</h2>
                <Link className="rogym-text-link rogym-text-link--accent" to="/owner/staff">
                  Xem chi tiết
                </Link>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.025] p-4">
                  <div className="flex items-center gap-3">
                    <div className="rogym-icon-wrap flex h-9 w-9 items-center justify-center rounded-xl">
                      <Users size={18} className="rogym-text-green" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Tổng hội viên</div>
                      <div className="text-xs rogym-text-dim">Toàn bộ hệ thống</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-white">{memberTotal}</div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.025] p-4">
                  <div className="flex items-center gap-3">
                    <div className="rogym-icon-wrap flex h-9 w-9 items-center justify-center rounded-xl">
                      <Package size={18} className="rogym-text-green" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Gói tập đang bán</div>
                      <div className="text-xs rogym-text-dim">Trạng thái active</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-white">{totalPackages}</div>
                </div>
              </div>
            </section>

            {/* Open feedback */}
            <section className="rogym-card rogym-card--compact p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Phản hồi cần xử lý</h2>
                <Link className="rogym-text-link rogym-text-link--accent" to="/staff/feedback">
                  Tất cả phản hồi
                </Link>
              </div>
              {openFeedbacks.length === 0 ? (
                <OwnerEmptyState title="Không có phản hồi mới" />
              ) : (
                <div className="space-y-2">
                  {openFeedbacks.map((fb) => (
                    <div key={fb.feedbackId} className="rounded-xl border border-white/5 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-medium text-white line-clamp-2 flex-1">
                          {fb.content}
                        </div>
                        <OwnerBadge
                          label={FEEDBACK_SEVERITY_LABEL[fb.severity]}
                          color={FEEDBACK_SEVERITY_COLOR[fb.severity]}
                        />
                      </div>
                      <div className="mt-1 text-xs rogym-text-dim">
                        {formatDate(fb.createdAt)} · {fb.feedbackType}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Quick Actions */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLink to="/owner/staff" label="Quản lý nhân sự" icon={<Users size={16} />} />
            <QuickLink
              to="/owner/rbac/groups"
              label="Phân quyền & nhóm"
              icon={<Shield size={16} />}
            />
            <QuickLink to="/owner/packages" label="Cấu hình gói tập" icon={<Package size={16} />} />
            <QuickLink
              to="/owner/reports"
              label="Báo cáo thống kê"
              icon={<TrendingUp size={16} />}
            />
          </section>
        </>
      )}
    </OwnerPage>
  )
}

function QuickLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link className="rogym-btn rogym-btn--outline-white w-full justify-between py-4" to={to}>
      <span className="flex items-center gap-2">
        {icon} {label}
      </span>
      <ArrowRight size={15} />
    </Link>
  )
}

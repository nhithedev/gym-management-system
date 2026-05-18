import MemberLayout from '@/layouts/MemberLayout'
import SectionHeader from '@/components/common/SectionHeader'
import SpotlightCard from '@/components/common/SpotlightCard'
import { useNavigate } from 'react-router'
import {
  Package,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react'

export default function CurrentPackage() {
  const navigate = useNavigate()

  const hasActivePackage = true
  const hasPendingPackage = false

  const currentPackage = {
    name: 'Premium Package',
    status: 'active',
    start_date: '20/05/2026',
    end_date: '16/11/2026',
    days_left: 45,
    payment_status: 'paid',
    benefits: [
      'Truy cập phòng gym không giới hạn',
      '4 buổi PT/tháng',
      'Tư vấn dinh dưỡng miễn phí',
      'Sauna & Steam room',
      'Ưu tiên đặt lịch',
      'Nước uống miễn phí',
    ],
  }

  const pendingPackage = {
    name: 'Standard Package',
    status: 'pending',
    activation_date: '17/11/2026',
    duration: 90,
  }

  const EmptyState = () => (
    <div className="rounded-[1.75rem] border border-[#4d4635] bg-[#1a1a1a] p-10 text-center backdrop-blur-sm">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#121414]">
        <Package size={40} className="text-[#d0c5af]/50" />
      </div>
      <h3 className="mb-2 text-2xl font-semibold text-[#e2e2e2]">
        Chưa có gói tập active
      </h3>
      <button
        onClick={() => navigate('/member/buy-package')}
        className="mt-6 rounded-full bg-[#f2ca50] px-7 py-3 font-semibold text-black transition-transform duration-200 hover:scale-[1.02]"
      >
        Mua gói tập ngay
      </button>
    </div>
  )

  if (!hasActivePackage) {
    return (
      <MemberLayout>
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <SectionHeader title="Gói hiện tại" />
          <EmptyState />
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <SectionHeader title="Gói hiện tại" description="Thông tin hiệu lực và thanh toán của gói tập hiện tại" />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {hasPendingPackage && (
              <div className="rounded-[1.5rem] border border-[#f2ca50] bg-[#f2ca50]/10 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#f2ca50]" />
                  <div className="flex-1">
                    <h3 className="mb-1 text-base font-semibold text-[#f2ca50]">
                      Gói chờ kích hoạt
                    </h3>
                    <p className="text-sm text-[#d0c5af]">
                      {pendingPackage.name} • {pendingPackage.activation_date} • {pendingPackage.duration} ngày
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[1.5rem] border border-[#2c2a24] bg-[#1a1a1a] p-5 md:p-6">
              <div className="mb-5">
                <h3 className="text-xl font-semibold text-[#f2ca50]">Quyền lợi</h3>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {currentPackage.benefits.map((benefit, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-xl border border-[#2b2a25] bg-[#121414] px-4 py-3"
                  >
                    <CheckCircle size={16} className="shrink-0 text-[#f2ca50]" />
                    <span className="text-sm text-[#e2e2e2]">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <SpotlightCard
              className="rounded-[2rem] p-5 sm:p-6 lg:sticky lg:top-6"
              spotlightColor="rgba(242, 202, 80, 0.16)"
            >
              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#f2ca50]">
                    <Package size={26} className="text-black" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold uppercase tracking-tight text-[#f2ca50]">
                      {currentPackage.name}
                    </h2>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                        Active
                      </div>

                      <div className="flex items-center gap-1 rounded-full bg-[#121414] px-3 py-1 text-xs font-semibold text-[#f2ca50]">
                        <Clock size={13} />
                        <span>{currentPackage.days_left} ngày còn lại</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-2xl border border-[#2c2a24] bg-[#121414] p-4">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Calendar size={16} className="text-[#f2ca50]" />
                      <p className="text-xs text-[#d0c5af]/70">Ngày bắt đầu</p>
                    </div>
                    <p className="text-base font-semibold text-[#e2e2e2]">
                      {currentPackage.start_date}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#2c2a24] bg-[#121414] p-4">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Calendar size={16} className="text-[#f2ca50]" />
                      <p className="text-xs text-[#d0c5af]/70">Ngày hết hạn</p>
                    </div>
                    <p className="text-base font-semibold text-[#e2e2e2]">
                      {currentPackage.end_date}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#2c2a24] bg-[#121414] p-4">
                    <div className="mb-1.5 flex items-center gap-2">
                      <CreditCard size={16} className="text-[#f2ca50]" />
                      <p className="text-xs text-[#d0c5af]/70">Thanh toán</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-emerald-400" />
                      <p className="text-sm font-semibold text-emerald-400">
                        Đã thanh toán
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SpotlightCard>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/member/renew-package')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f2ca50] px-4 py-3 text-sm font-semibold text-black transition duration-200 hover:-translate-y-0.5 hover:bg-[#f0c13d]"
              >
                <span>Gia hạn</span>
                <ChevronRight size={16} />
              </button>

              <button
                onClick={() => {}}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/60 bg-transparent px-4 py-3 text-sm font-semibold text-red-500 transition duration-200 hover:-translate-y-0.5 hover:bg-red-500/8"
              >
                <span>Hủy gói</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}
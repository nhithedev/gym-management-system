import { useState, useEffect } from 'react'
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
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/auth.service'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import packageService, { type Package as PackageDetail } from '@/services/package.service'

export default function CurrentPackage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const token = useAuthStore((s) => s.token)

  const [loading, setLoading] = useState(true)
  const [activeSub, setActiveSub] = useState<Subscription | null>(null)
  const [pendingSub, setPendingSub] = useState<Subscription | null>(null)
  const [pkgDetail, setPkgDetail] = useState<PackageDetail | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        let memberId = user?.memberId ?? null
        if (!memberId) {
          const me = await authService.me()
          memberId = me.memberId ?? null
          if (user && token) setAuth({ ...user, memberId }, token)
        }
        if (!memberId) return

        const subs = await subscriptionService.getByMember(memberId)
        const active = subs.find((s) => s.status === 'active') ?? null
        const pending = subs.find((s) => s.status === 'pending') ?? null
        setActiveSub(active)
        setPendingSub(pending)

        if (active?.packageId) {
          const pkg = await packageService.get(active.packageId)
          setPkgDetail(pkg)
        }
      } catch {
        // giữ null state → hiển thị empty
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCancel() {
    if (!activeSub) return
    setCancelling(true)
    setCancelError(null)
    try {
      await subscriptionService.cancel(activeSub.subscriptionId)
      setShowCancelModal(false)
      setActiveSub(null)
      setPkgDetail(null)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      setCancelError(msg ?? 'Hủy gói thất bại. Vui lòng thử lại.')
    } finally {
      setCancelling(false)
    }
  }

  const benefits = pkgDetail?.benefits
    ? pkgDetail.benefits.split('\n').map((s) => s.trim()).filter(Boolean)
    : []

  const fmt = (d: string) => new Date(d).toLocaleDateString('vi-VN')

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 size={36} className="animate-spin text-[#f2ca50]" />
        </div>
      </MemberLayout>
    )
  }

  if (!activeSub) {
    return (
      <MemberLayout>
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <SectionHeader title="Gói hiện tại" />
          <div className="rounded-[1.75rem] border border-[#4d4635] bg-[#1a1a1a] p-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#121414]">
              <Package size={40} className="text-[#d0c5af]/50" />
            </div>
            <h3 className="mb-2 text-2xl font-semibold text-[#e2e2e2]">Chưa có gói tập active</h3>
            <button
              onClick={() => navigate('/member/buy-package')}
              className="mt-6 rounded-full bg-[#f2ca50] px-7 py-3 font-semibold text-black transition-transform hover:scale-[1.02]"
            >
              Mua gói tập ngay
            </button>
          </div>
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <SectionHeader
          title="Gói hiện tại"
          description="Thông tin hiệu lực và thanh toán của gói tập hiện tại"
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {pendingSub && (
              <div className="rounded-[1.5rem] border border-[#f2ca50] bg-[#f2ca50]/10 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#f2ca50]" />
                  <div className="flex-1">
                    <h3 className="mb-1 text-base font-semibold text-[#f2ca50]">Gói chờ kích hoạt</h3>
                    <p className="text-sm text-[#d0c5af]">
                      {pendingSub.packageName} • Bắt đầu {fmt(pendingSub.startDate)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[1.5rem] border border-[#2c2a24] bg-[#1a1a1a] p-5 md:p-6">
              <h3 className="mb-5 text-xl font-semibold text-[#f2ca50]">Quyền lợi</h3>
              {benefits.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {benefits.map((benefit, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-xl border border-[#2b2a25] bg-[#121414] px-4 py-3"
                    >
                      <CheckCircle size={16} className="shrink-0 text-[#f2ca50]" />
                      <span className="text-sm text-[#e2e2e2]">{benefit}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#d0c5af]/60">Không có thông tin quyền lợi.</p>
              )}
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
                      {activeSub.packageName}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                        Active
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-[#121414] px-3 py-1 text-xs font-semibold text-[#f2ca50]">
                        <Clock size={13} />
                        <span>{activeSub.daysLeft} ngày còn lại</span>
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
                    <p className="text-base font-semibold text-[#e2e2e2]">{fmt(activeSub.startDate)}</p>
                  </div>

                  <div className="rounded-2xl border border-[#2c2a24] bg-[#121414] p-4">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Calendar size={16} className="text-[#f2ca50]" />
                      <p className="text-xs text-[#d0c5af]/70">Ngày hết hạn</p>
                    </div>
                    <p className="text-base font-semibold text-[#e2e2e2]">{fmt(activeSub.endDate)}</p>
                  </div>

                  <div className="rounded-2xl border border-[#2c2a24] bg-[#121414] p-4">
                    <div className="mb-1.5 flex items-center gap-2">
                      <CreditCard size={16} className="text-[#f2ca50]" />
                      <p className="text-xs text-[#d0c5af]/70">Thanh toán</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-emerald-400" />
                      <p className="text-sm font-semibold text-emerald-400">Đã thanh toán</p>
                    </div>
                  </div>
                </div>
              </div>
            </SpotlightCard>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/member/renew-package')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f2ca50] px-4 py-3 text-sm font-semibold text-black transition duration-200 hover:-translate-y-0.5"
              >
                <span>Gia hạn</span>
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => { setCancelError(null); setShowCancelModal(true) }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/60 bg-transparent px-4 py-3 text-sm font-semibold text-red-500 transition duration-200 hover:-translate-y-0.5"
              >
                <span>Hủy gói</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#2c2a24] bg-[#1a1a1a] p-6">
            <h3 className="mb-2 text-lg font-semibold text-[#e2e2e2]">Xác nhận hủy gói</h3>
            <p className="mb-1 text-sm text-[#d0c5af]">
              Bạn có chắc muốn hủy gói <span className="font-semibold text-[#f2ca50]">{activeSub?.packageName}</span>?
            </p>
            <p className="mb-5 text-xs text-[#d0c5af]/60">Gói sẽ bị hủy ngay lập tức. Không hoàn tiền (v1.0).</p>
            {cancelError && (
              <p className="mb-4 rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400">{cancelError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-[#2c2a24] bg-transparent py-2.5 text-sm font-semibold text-[#d0c5af] transition hover:bg-[#2c2a24] disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? <Loader2 size={16} className="mx-auto animate-spin" /> : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MemberLayout>
  )
}

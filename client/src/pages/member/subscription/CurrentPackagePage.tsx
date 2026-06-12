import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CalendarCheck,
  CalendarX,
  AlertTriangle,
  AlertCircle,
  Check,
  Clock,
  ShoppingBag,
  XCircle,
  RefreshCw,
  ChevronRight,
  ArrowLeftRight,
} from 'lucide-react'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import packageService, { type Package } from '@/services/package.service'
import paymentService, { type Payment } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { MemberPage, MemberPageHeader, MemberSkeleton } from '../components/MemberUI'
import { getPaymentMethodLabel } from '@/components/payment/payment-method-data'
import { formatVnd } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { parsePackageBenefits } from '@/lib/package'

function Badge({ label, tone = 'muted' }: { label: string; tone?: string }) {
  return (
    <span className="rogym-tone-badge is-large" data-tone={tone}>
      {label}
    </span>
  )
}

const SUB_STATUS_MAP: Record<string, { label: string; tone: string }> = {
  active: { label: 'Đang hoạt động', tone: 'success' },
  pending: { label: 'Chờ kích hoạt', tone: 'warning' },
  expired: { label: 'Đã hết hạn', tone: 'danger' },
  cancelled: { label: 'Đã huỷ', tone: 'muted' },
  ended: { label: 'Đã kết thúc', tone: 'danger' },
}

function getRealStatus(s: Subscription): string {
  if ((s.status === 'active' || s.status === 'expired') && new Date(s.endDate) < new Date())
    return 'ended'
  return s.status
}

export default function CurrentPackagePage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [allSubs, setAllSubs] = useState<Subscription[]>([])
  const [pkg, setPkg] = useState<Package | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [availablePkgs, setAvailablePkgs] = useState<Package[]>([])
  const [pkgsLoading, setPkgsLoading] = useState(false)
  const [switchTarget, setSwitchTarget] = useState<Package | null>(null)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const setHasActiveSub = useSubscriptionStore((s) => s.setHasActiveSub)

  useEffect(() => {
    if (location.state?.justActivated) {
      setToast('Gói tập đã được kích hoạt thành công!')
      setTimeout(() => setToast(null), 4000)
      window.history.replaceState({}, '')
    }
  }, [location.state?.justActivated])

  useEffect(() => {
    if (!user?.memberId) return
    const memberId = user.memberId

    Promise.allSettled([
      subscriptionService.getByMember(memberId),
      paymentService.listByMember(memberId),
    ])
      .then(([subRes, payRes]) => {
        if (subRes.status === 'fulfilled') {
          const sorted = subRes.value.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          setAllSubs(sorted)
          const today = new Date()
          const active =
            sorted.find((s) => s.status === 'active' && new Date(s.endDate) >= today) ??
            sorted.find((s) => s.status === 'pending' && new Date(s.endDate) >= today)
          setSubscription(active ?? null)
          setHasActiveSub(!!active)
          if (active?.packageId) {
            packageService
              .get(active.packageId)
              .then(setPkg)
              .catch(() => {})
          }
        } else {
          const status = (subRes.reason as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            clearAuth()
            navigate('/login')
          }
          setError('Không thể tải thông tin gói tập.')
        }
        if (payRes.status === 'fulfilled') {
          setPayments(payRes.value.slice(0, 3))
        }
      })
      .finally(() => setLoading(false))
  }, [user?.memberId, navigate, clearAuth, setHasActiveSub])

  async function handleOpenSwitch() {
    if (!subscription) return
    setShowSwitchModal(true)
    setSwitchError(null)
    setSwitchTarget(null)
    if (availablePkgs.length === 0) {
      setPkgsLoading(true)
      try {
        const res = await packageService.list({ status: 'active', pageSize: 50 })
        setAvailablePkgs(res.data.filter((p) => p.packageId !== subscription.packageId))
      } catch {
        setSwitchError('Không thể tải danh sách gói tập.')
      } finally {
        setPkgsLoading(false)
      }
    }
  }

  async function handleSwitch() {
    if (!switchTarget || !subscription || !user?.memberId) return
    setSwitching(true)
    setSwitchError(null)
    try {
      await subscriptionService.switchPackage(
        String(subscription.subscriptionId),
        String(switchTarget.packageId)
      )
      setShowSwitchModal(false)
      setSwitchTarget(null)
      const subs = await subscriptionService.getByMember(user.memberId)
      const sorted = subs.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setAllSubs(sorted)
      const today = new Date()
      const active =
        sorted.find((s) => s.status === 'active' && new Date(s.endDate) >= today) ??
        sorted.find((s) => s.status === 'pending' && new Date(s.endDate) >= today)
      setSubscription(active ?? null)
      setHasActiveSub(!!active)
      if (active?.packageId) {
        packageService
          .get(active.packageId)
          .then(setPkg)
          .catch(() => {})
      }
      setToast(`Đã chuyển sang gói "${switchTarget.name}" thành công.`)
      setTimeout(() => setToast(null), 4000)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setSwitchError(e?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setSwitching(false)
    }
  }

  async function handleCancel() {
    if (!cancelTarget || !user?.memberId) return
    setCancelling(true)
    setCancelError(null)
    try {
      await subscriptionService.cancel(cancelTarget.subscriptionId)
      setCancelTarget(null)
      const subs = await subscriptionService.getByMember(user.memberId)
      const sorted = subs.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setAllSubs(sorted)
      const todayCancel = new Date()
      const active =
        sorted.find((s) => s.status === 'active' && new Date(s.endDate) >= todayCancel) ??
        sorted.find((s) => s.status === 'pending' && new Date(s.endDate) >= todayCancel)
      setHasActiveSub(!!active)
      if (active) {
        setSubscription(active)
        if (active.packageId)
          packageService
            .get(active.packageId)
            .then(setPkg)
            .catch(() => {})
        setToast('Đã hủy gói thành công.')
      } else {
        setToast('Đã hủy gói tập thành công.')
        setTimeout(() => navigate('/member/subscription/setup', { replace: true }), 1500)
      }
      setTimeout(() => setToast(null), 4000)
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      const status = e?.response?.status
      if (status === 401) {
        clearAuth()
        navigate('/login')
      } else setCancelError(e?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setCancelling(false)
    }
  }

  const daysLeft = subscription?.daysLeft ?? 0
  const totalDays = pkg?.durationDays ?? 1
  const daysUsed = totalDays - daysLeft
  const progress = Math.min(100, Math.max(0, (daysUsed / totalDays) * 100))
  const isExpiring = subscription?.status === 'active' && daysLeft <= 7 && daysLeft > 0
  const benefits = parsePackageBenefits(pkg?.benefits ?? null)

  // Pending subs (not the currently shown active/pending one)
  const pendingSubs = allSubs.filter(
    (s) => s.status === 'pending' && s.subscriptionId !== subscription?.subscriptionId
  )

  return (
    <MemberPage>
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl rogym-sx-572c9565">
          {toast}
        </div>
      )}

      {/* Switch package dialog */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl p-8 max-w-md w-full rogym-card max-h-[80vh] flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <ArrowLeftRight size={22} className="text-[var(--rogym-teal)] shrink-0" />
              <h3 className="text-lg font-bold text-white m-0">Chuyển gói tập</h3>
            </div>
            <p className="text-sm rogym-sx-5e5c39ab mb-4">
              Gói hiện tại (<strong className="text-white">{subscription?.packageName}</strong>) sẽ
              kết thúc ngay. Gói mới bắt đầu hôm nay.
            </p>

            {pkgsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin border-[var(--rogym-teal)]" />
              </div>
            ) : availablePkgs.length === 0 ? (
              <p className="text-sm rogym-sx-5e5c39ab text-center py-8">
                Không có gói khác để chuyển.
              </p>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {availablePkgs.map((p) => (
                  <button
                    key={p.packageId}
                    type="button"
                    onClick={() =>
                      setSwitchTarget((t) => (t?.packageId === p.packageId ? null : p))
                    }
                    className={`w-full text-left rounded-xl px-4 py-3 transition-colors border ${
                      switchTarget?.packageId === p.packageId
                        ? 'border-[var(--rogym-teal)] bg-[var(--rogym-teal)]/10'
                        : 'border-white/10 rogym-sx-a15e2a7c'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{p.name}</p>
                        <p className="text-xs rogym-sx-5e5c39ab mt-0.5">
                          {p.durationDays} ngày{p.includesPt ? ' · Có PT' : ''}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-[var(--rogym-teal)] shrink-0">
                        {Number(p.price).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {switchError && <p className="text-red-300 text-sm mb-3">{switchError}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowSwitchModal(false)
                  setSwitchTarget(null)
                  setSwitchError(null)
                }}
                className="rogym-btn rogym-btn--outline-white flex-1"
              >
                Hủy
              </button>
              <button
                onClick={handleSwitch}
                disabled={!switchTarget || switching}
                className="rogym-btn rogym-btn--primary flex-1 disabled:opacity-40"
              >
                {switching ? 'Đang chuyển...' : 'Xác nhận chuyển'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel dialog */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 rogym-sx-49121f22">
          <div className="rounded-2xl p-8 max-w-sm w-full rogym-sx-83e5c542">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-red-400 shrink-0" />
              <h3 className="text-lg font-bold text-white m-0">Xác nhận hủy gói</h3>
            </div>
            <p className="text-sm text-[var(--rogym-text-secondary)] leading-relaxed mb-1">
              Hủy gói{' '}
              <strong className="text-white">{cancelTarget.packageName ?? 'gói tập'}</strong>?
            </p>
            <p className="text-sm text-[var(--rogym-text-secondary)] leading-relaxed mb-6">
              {cancelTarget.status === 'pending'
                ? 'Gói chờ kích hoạt này sẽ bị hủy.'
                : 'Hủy gói sẽ mất quyền truy cập ngay lập tức.'}{' '}
              <strong className="text-red-400">KHÔNG hoàn tiền.</strong> Bạn có chắc chắn?
            </p>
            {cancelError && <p className="text-red-300 text-sm mb-3">{cancelError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCancelTarget(null)
                  setCancelError(null)
                }}
                className="rogym-btn rogym-btn--outline-white flex-1"
              >
                Không, giữ lại
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="rogym-danger-button flex-1 rounded-full py-2.5 text-sm font-semibold transition-all"
              >
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MemberPageHeader
        eyebrow="Gói tập"
        title="Gói tập hiện tại"
        description="Thông tin gói đăng ký và quyền lợi của bạn."
        actions={
          <button
            onClick={() => navigate('/member/subscription/history')}
            className="rogym-btn rogym-btn--outline-white"
          >
            Lịch sử
          </button>
        }
      />

      {loading ? (
        <MemberSkeleton rows={4} />
      ) : error && !subscription ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-[var(--rogym-text-secondary)]">{error}</p>
          <button
            onClick={() => navigate('/member/subscription/setup')}
            className="rogym-btn rogym-btn--primary"
          >
            Chọn gói tập
          </button>
        </div>
      ) : !subscription ? (
        <div className="rogym-card rogym-card--compact flex flex-col items-center justify-center text-center py-16 gap-4">
          <ShoppingBag size={48} className="text-[var(--rogym-text-secondary)]" />
          <p className="text-[var(--rogym-text-secondary)]">
            Bạn chưa có gói tập nào đang hoạt động.
          </p>
          <button
            onClick={() => navigate('/member/subscription/setup')}
            className="rogym-btn rogym-btn--primary"
          >
            Chọn gói tập
          </button>
        </div>
      ) : (
        <>
          {/* Expiring alert */}
          {isExpiring && (
            <div className="flex items-center gap-3 rounded-2xl px-5 py-4 rogym-sx-c090d129">
              <AlertTriangle size={20} className="text-amber-400 shrink-0" />
              <p className="text-amber-300 text-sm flex-1">
                Gói tập sắp hết hạn trong <strong>{daysLeft} ngày</strong>. Hãy gia hạn ngay để
                không bị gián đoạn.
              </p>
              <button
                onClick={() => navigate('/member/subscription/renew')}
                className="rogym-btn rogym-btn--primary text-sm px-4 py-2"
              >
                Gia hạn
              </button>
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1fr]">
            {/* ── LEFT: main subscription card ── */}
            <div className="rogym-card rogym-card--compact p-8 flex flex-col gap-6">
              <div>
                <Badge
                  label={SUB_STATUS_MAP[getRealStatus(subscription)]?.label ?? subscription.status}
                  tone={SUB_STATUS_MAP[getRealStatus(subscription)]?.tone}
                />
                <h2 className="text-2xl font-bold text-white mt-3">
                  {subscription.packageName ?? pkg?.name ?? 'Gói tập'}
                </h2>
              </div>

              {/* Progress bar — hidden for pending (would show 0% meaninglessly) */}
              {subscription.status !== 'pending' && (
                <div>
                  <div className="flex justify-between mb-2 text-sm text-[var(--rogym-text-secondary)]">
                    <span>
                      {daysUsed} ngày đã dùng / {totalDays} ngày
                    </span>
                    <span className={isExpiring ? 'text-amber-500' : 'text-[var(--rogym-teal)]'}>
                      Còn {daysLeft} ngày
                    </span>
                  </div>
                  <progress
                    className={`rogym-progress ${isExpiring ? 'is-warning' : ''}`}
                    max={100}
                    value={progress}
                    aria-label={`${progress}% thời hạn gói đã sử dụng`}
                  />
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 rogym-sx-6930dcd2">
                  <CalendarCheck size={18} className="rogym-sx-b2fbf853" />
                  <div>
                    <p className="text-xs text-[var(--rogym-text-secondary)] mb-0.5">
                      Ngày bắt đầu
                    </p>
                    <p className="text-sm font-medium text-white">
                      {formatDate(subscription.startDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 rogym-sx-6930dcd2">
                  <CalendarX
                    size={18}
                    className={isExpiring ? 'text-amber-500' : 'text-[var(--rogym-text-secondary)]'}
                  />
                  <div>
                    <p className="text-xs text-[var(--rogym-text-secondary)] mb-0.5">
                      Ngày hết hạn
                    </p>
                    <p
                      className={`text-sm font-medium ${isExpiring ? 'text-amber-400' : 'text-white'}`}
                    >
                      {formatDate(subscription.endDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cancel + Switch + Renew buttons */}
              {(subscription.status === 'active' || subscription.status === 'pending') && (
                <div className="flex justify-between gap-3 mt-auto pt-6 border-t border-white/5">
                  <button
                    onClick={() => setCancelTarget(subscription)}
                    className="rogym-cancel-outline rogym-btn flex items-center gap-1.5 rogym-sx-2fb3205c"
                  >
                    <XCircle size={14} />
                    Hủy gói
                  </button>
                  {subscription.status === 'active' && (
                    <button
                      onClick={handleOpenSwitch}
                      className="rogym-btn rogym-btn--outline-white flex items-center gap-1.5"
                    >
                      <ArrowLeftRight size={14} />
                      Chuyển gói
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/member/subscription/renew')}
                    className="rogym-btn rogym-btn--primary flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} />
                    Gia hạn
                  </button>
                </div>
              )}
            </div>

            {/* ── RIGHT: stacked cards ── */}
            <div className="flex flex-col gap-4">
              {/* Benefits */}
              {benefits.length > 0 && (
                <div className="rogym-card rogym-card--compact p-5">
                  <h3 className="text-base font-bold text-white mb-4">Quyền lợi gói tập</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {benefits.map((b, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-[var(--rogym-text-secondary)]"
                      >
                        <Check size={14} className="rogym-sx-9b3528d7" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pending renewals (below benefits) */}
              {pendingSubs.length > 0 && (
                <div className="rogym-card rogym-card--compact p-5">
                  <h3 className="text-base font-bold text-white mb-3">Gói sắp gia hạn</h3>
                  <div className="flex flex-col">
                    {pendingSubs.map((s) => (
                      <div
                        key={s.subscriptionId}
                        className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
                      >
                        <div>
                          <p className="text-sm text-white">{s.packageName ?? 'Gói tập'}</p>
                          <p className="text-xs text-[var(--rogym-text-secondary)] mt-0.5">
                            Bắt đầu {formatDate(s.startDate)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge label="Chờ kích hoạt" tone="warning" />
                          <button
                            onClick={() => setCancelTarget(s)}
                            title="Hủy gói này"
                            className="rogym-pending-cancel rogym-sx-930ac6ed"
                          >
                            <XCircle size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment history preview */}
              <div className="rogym-card rogym-card--compact p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">Lịch sử thanh toán</h3>
                  <button
                    onClick={() => navigate('/member/subscription/history')}
                    className="rogym-text-link rogym-text-link--accent flex items-center gap-1 text-sm"
                  >
                    Xem tất cả <ChevronRight size={14} />
                  </button>
                </div>
                {payments.length === 0 ? (
                  <p className="text-sm text-[var(--rogym-text-secondary)] py-4 text-center">
                    Chưa có giao dịch nào.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {payments.map((p) => (
                      <div key={p.paymentId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock size={14} className="text-[var(--rogym-text-secondary)]" />
                          <div>
                            <p className="text-sm text-white">{formatDate(p.paidAt)}</p>
                            <p className="text-xs text-[var(--rogym-text-secondary)]">
                              {getPaymentMethodLabel(p.method, true)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold rogym-sx-b2fbf853">
                            {formatVnd(p.amount)}
                          </span>
                          <Badge
                            label={p.status === 'success' ? 'Thành công' : 'Thất bại'}
                            tone={p.status === 'success' ? 'success' : 'danger'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </MemberPage>
  )
}

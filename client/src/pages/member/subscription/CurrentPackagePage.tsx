import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CalendarCheck, CalendarX, AlertTriangle, AlertCircle,
  Check, Clock, ShoppingBag, XCircle, RefreshCw, ChevronRight,
} from 'lucide-react'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import packageService, { type Package } from '@/services/package.service'
import paymentService, { type Payment } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { MemberPage, MemberPageHeader, MemberSkeleton } from '../components/MemberUI'

const G  = '#06c384'
const T  = '#42e09e'
const BG = '#0f1c16'

function fmtVND(v: number | string) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v))
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function parseBenefits(raw: string | null): string[] {
  if (!raw) return []
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p.map(String)
  } catch { /* not json */ }
  return raw.split('\n').map(s => s.trim()).filter(Boolean)
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
      fontFamily: "'Be Vietnam Pro',sans-serif", background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  )
}

const SUB_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active:    { label: 'Đang hoạt động', color: G },
  pending:   { label: 'Chờ kích hoạt',  color: '#f59e0b' },
  expired:   { label: 'Đã hết hạn',     color: '#ef4444' },
  cancelled: { label: 'Đã huỷ',         color: '#6b7280' },
  ended:     { label: 'Đã kết thúc',    color: '#ef4444' },
}

function getRealStatus(s: Subscription): string {
  if ((s.status === 'active' || s.status === 'expired') && new Date(s.endDate) < new Date()) return 'ended'
  return s.status
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt', bank_card: 'Thẻ NH', ewallet: 'Ví điện tử',
}

export default function CurrentPackagePage() {
  const [subscription, setSubscription]   = useState<Subscription | null>(null)
  const [allSubs, setAllSubs]             = useState<Subscription[]>([])
  const [pkg, setPkg]                     = useState<Package | null>(null)
  const [payments, setPayments]           = useState<Payment[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [toast, setToast]                 = useState<string | null>(null)
  const [cancelTarget, setCancelTarget]   = useState<Subscription | null>(null)
  const [cancelling, setCancelling]       = useState(false)
  const [cancelError, setCancelError]     = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const setHasActiveSub = useSubscriptionStore(s => s.setHasActiveSub)

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
    ]).then(([subRes, payRes]) => {
      if (subRes.status === 'fulfilled') {
        const sorted = subRes.value.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setAllSubs(sorted)
        const today = new Date()
        const active =
          sorted.find(s => s.status === 'active' && new Date(s.endDate) >= today) ??
          sorted.find(s => s.status === 'pending' && new Date(s.endDate) >= today)
        setSubscription(active ?? null)
        setHasActiveSub(!!active)
        if (active?.packageId) {
          packageService.get(active.packageId).then(setPkg).catch(() => {})
        }
      } else {
        const status = (subRes.reason as { response?: { status?: number } })?.response?.status
        if (status === 401) { clearAuth(); navigate('/login') }
        setError('Không thể tải thông tin gói tập.')
      }
      if (payRes.status === 'fulfilled') {
        setPayments(payRes.value.slice(0, 3))
      }
    }).finally(() => setLoading(false))
  }, [user?.memberId, navigate, clearAuth, setHasActiveSub])

  async function handleCancel() {
    if (!cancelTarget || !user?.memberId) return
    setCancelling(true)
    setCancelError(null)
    try {
      await subscriptionService.cancel(cancelTarget.subscriptionId)
      setCancelTarget(null)
      const subs = await subscriptionService.getByMember(user.memberId)
      const sorted = subs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setAllSubs(sorted)
      const todayCancel = new Date()
      const active =
        sorted.find(s => s.status === 'active' && new Date(s.endDate) >= todayCancel) ??
        sorted.find(s => s.status === 'pending' && new Date(s.endDate) >= todayCancel)
      setHasActiveSub(!!active)
      if (active) {
        setSubscription(active)
        if (active.packageId) packageService.get(active.packageId).then(setPkg).catch(() => {})
        setToast('Đã hủy gói thành công.')
      } else {
        setToast('Đã hủy gói tập thành công.')
        setTimeout(() => navigate('/member/subscription/setup', { replace: true }), 1500)
      }
      setTimeout(() => setToast(null), 4000)
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      const status = e?.response?.status
      if (status === 401) { clearAuth(); navigate('/login') }
      else setCancelError(e?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setCancelling(false)
    }
  }

  const daysLeft   = subscription?.daysLeft ?? 0
  const totalDays  = pkg?.durationDays ?? 1
  const daysUsed   = totalDays - daysLeft
  const progress   = Math.min(100, Math.max(0, (daysUsed / totalDays) * 100))
  const isExpiring = subscription?.status === 'active' && daysLeft <= 7 && daysLeft > 0
  const benefits   = parseBenefits(pkg?.benefits ?? null)

  // Pending subs (not the currently shown active/pending one)
  const pendingSubs = allSubs.filter(
    s => s.status === 'pending' && s.subscriptionId !== subscription?.subscriptionId
  )

  return (
    <MemberPage>
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl"
          style={{ background: `${G}22`, border: `1px solid ${G}44`, color: G, fontSize: 14, fontFamily: "'Be Vietnam Pro',sans-serif", boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          {toast}
        </div>
      )}

      {/* Cancel dialog */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-8 max-w-sm w-full" style={{ background: BG, border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-red-400 shrink-0" />
              <h3 className="text-lg font-bold text-white m-0">Xác nhận hủy gói</h3>
            </div>
            <p className="text-sm text-[var(--rogym-text-secondary)] leading-relaxed mb-1">
              Hủy gói <strong className="text-white">{cancelTarget.packageName ?? 'gói tập'}</strong>?
            </p>
            <p className="text-sm text-[var(--rogym-text-secondary)] leading-relaxed mb-6">
              {cancelTarget.status === 'pending'
                ? 'Gói chờ kích hoạt này sẽ bị hủy.'
                : 'Hủy gói sẽ mất quyền truy cập ngay lập tức.'}{' '}
              <strong className="text-red-400">KHÔNG hoàn tiền.</strong>{' '}
              Bạn có chắc chắn?
            </p>
            {cancelError && <p className="text-red-300 text-sm mb-3">{cancelError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setCancelTarget(null); setCancelError(null) }}
                className="rogym-btn rogym-btn--outline-white flex-1"
              >
                Không, giữ lại
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 rounded-full py-2.5 text-sm font-semibold transition-all"
                style={{ background: cancelling ? 'rgba(239,68,68,0.15)' : '#ef4444', border: 'none', color: cancelling ? '#a16060' : '#fff', cursor: cancelling ? 'not-allowed' : 'pointer', fontFamily: "'Be Vietnam Pro',sans-serif" }}
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
          <button onClick={() => navigate('/member/subscription/history')} className="rogym-btn rogym-btn--outline-white">
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
          <button onClick={() => navigate('/member/subscription/setup')} className="rogym-btn rogym-btn--primary">
            Chọn gói tập
          </button>
        </div>
      ) : !subscription ? (
        <div className="rogym-card rogym-card--compact flex flex-col items-center justify-center text-center py-16 gap-4">
          <ShoppingBag size={48} className="text-[var(--rogym-text-secondary)]" />
          <p className="text-[var(--rogym-text-secondary)]">Bạn chưa có gói tập nào đang hoạt động.</p>
          <button onClick={() => navigate('/member/subscription/setup')} className="rogym-btn rogym-btn--primary">
            Chọn gói tập
          </button>
        </div>
      ) : (
        <>
          {/* Expiring alert */}
          {isExpiring && (
            <div className="flex items-center gap-3 rounded-2xl px-5 py-4"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <AlertTriangle size={20} className="text-amber-400 shrink-0" />
              <p className="text-amber-300 text-sm flex-1">
                Gói tập sắp hết hạn trong <strong>{daysLeft} ngày</strong>. Hãy gia hạn ngay để không bị gián đoạn.
              </p>
              <button onClick={() => navigate('/member/subscription/renew')} className="rogym-btn rogym-btn--primary text-sm px-4 py-2">
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
                  color={SUB_STATUS_MAP[getRealStatus(subscription)]?.color ?? '#6b7280'}
                />
                <h2 className="text-2xl font-bold text-white mt-3">
                  {subscription.packageName ?? pkg?.name ?? 'Gói tập'}
                </h2>
              </div>

              {/* Progress bar — hidden for pending (would show 0% meaninglessly) */}
              {subscription.status !== 'pending' && (
                <div>
                  <div className="flex justify-between mb-2 text-sm text-[var(--rogym-text-secondary)]">
                    <span>{daysUsed} ngày đã dùng / {totalDays} ngày</span>
                    <span style={{ color: isExpiring ? '#f59e0b' : T }}>Còn {daysLeft} ngày</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, width: `${progress}%`, background: isExpiring ? '#f59e0b' : G, transition: 'width 600ms ease' }} />
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <CalendarCheck size={18} style={{ color: G }} />
                  <div>
                    <p className="text-xs text-[var(--rogym-text-secondary)] mb-0.5">Ngày bắt đầu</p>
                    <p className="text-sm font-medium text-white">{fmtDate(subscription.startDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <CalendarX size={18} style={{ color: isExpiring ? '#f59e0b' : 'var(--rogym-text-secondary)' }} />
                  <div>
                    <p className="text-xs text-[var(--rogym-text-secondary)] mb-0.5">Ngày hết hạn</p>
                    <p className="text-sm font-medium" style={{ color: isExpiring ? '#fbbf24' : '#fff' }}>
                      {fmtDate(subscription.endDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cancel + Renew buttons — symmetric */}
              {(subscription.status === 'active' || subscription.status === 'pending') && (
                <div className="flex justify-between gap-3 mt-auto pt-6 border-t border-white/5">
                  <button
                    onClick={() => setCancelTarget(subscription)}
                    className="rogym-btn flex items-center gap-1.5"
                    style={{ border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', background: 'none', borderRadius: 999, padding: '7px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Be Vietnam Pro',sans-serif", transition: 'all 200ms' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                  >
                    <XCircle size={14} />
                    Hủy gói
                  </button>
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
                  <h3 className="text-base font-bold text-white mb-4">
                    Quyền lợi gói tập
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--rogym-text-secondary)]">
                        <Check size={14} style={{ color: T, flexShrink: 0, marginTop: 2 }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pending renewals (below benefits) */}
              {pendingSubs.length > 0 && (
                <div className="rogym-card rogym-card--compact p-5">
                  <h3 className="text-base font-bold text-white mb-3">
                    Gói sắp gia hạn
                  </h3>
                  <div className="flex flex-col">
                    {pendingSubs.map(s => (
                      <div key={s.subscriptionId} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                        <div>
                          <p className="text-sm text-white">{s.packageName ?? 'Gói tập'}</p>
                          <p className="text-xs text-[var(--rogym-text-secondary)] mt-0.5">Bắt đầu {fmtDate(s.startDate)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge label="Chờ kích hoạt" color="#f59e0b" />
                          <button
                            onClick={() => setCancelTarget(s)}
                            title="Hủy gói này"
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                              color: 'rgba(239,68,68,0.5)', borderRadius: 6, flexShrink: 0,
                              transition: 'color 150ms',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.5)' }}
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
                  <h3 className="text-base font-bold text-white">
                    Lịch sử thanh toán
                  </h3>
                  <button
                    onClick={() => navigate('/member/subscription/history')}
                    className="rogym-text-link rogym-text-link--accent flex items-center gap-1 text-sm"
                  >
                    Xem tất cả <ChevronRight size={14} />
                  </button>
                </div>
                {payments.length === 0 ? (
                  <p className="text-sm text-[var(--rogym-text-secondary)] py-4 text-center">Chưa có giao dịch nào.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {payments.map(p => (
                      <div key={p.paymentId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock size={14} className="text-[var(--rogym-text-secondary)]" />
                          <div>
                            <p className="text-sm text-white">{fmtDate(p.paidAt)}</p>
                            <p className="text-xs text-[var(--rogym-text-secondary)]">{METHOD_LABEL[p.method] ?? p.method}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold" style={{ color: G }}>{fmtVND(p.amount)}</span>
                          <Badge
                            label={p.status === 'success' ? 'Thành công' : 'Thất bại'}
                            color={p.status === 'success' ? G : '#ef4444'}
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

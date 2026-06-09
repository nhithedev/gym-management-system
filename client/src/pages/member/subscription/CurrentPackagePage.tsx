import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CalendarCheck, CalendarX, AlertTriangle, AlertCircle,
  Check, Clock, ShoppingBag, XCircle,
} from 'lucide-react'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import packageService, { type Package } from '@/services/package.service'
import paymentService, { type Payment } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

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

function Skeleton({ h = 80 }: { h?: number }) {
  return <div className="animate-pulse rounded-2xl" style={{ height: h, background: `${BG}99` }} />
}

function BtnPrimary({ to, onClick, children, small }: { to?: string; onClick?: () => void; children: React.ReactNode; small?: boolean }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => { onClick?.(); if (to) navigate(to) }}
      className="rogym-btn rogym-btn--primary"
      style={{
        background: G, color: '#00492f', cursor: 'pointer',
        fontFamily: "'Be Vietnam Pro',sans-serif",
        padding: small ? '8px 20px' : '10px 24px',
        fontSize: small ? 13 : 14,
      }}
    >
      {children}
    </button>
  )
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
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt', bank_card: 'Thẻ NH', ewallet: 'Ví điện tử',
}

export default function CurrentPackagePage() {
  const [subscription, setSubscription]   = useState<Subscription | null>(null)
  const [pkg, setPkg]                     = useState<Package | null>(null)
  const [payments, setPayments]           = useState<Payment[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [toast, setToast]                 = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
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
        const active = sorted.find(s => s.status === 'active' || s.status === 'pending')
        setSubscription(active ?? null)
        setHasActiveSub(!!active)
        if (active?.packageId) {
          packageService.get(active.packageId)
            .then(setPkg)
            .catch(() => {})
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
    if (!subscription || !user?.memberId) return
    setCancelling(true)
    setCancelError(null)
    try {
      await subscriptionService.cancel(subscription.subscriptionId)
      setCancelDialogOpen(false)
      // Re-fetch — a pending prepaid sub may have cascade-activated
      const subs = await subscriptionService.getByMember(user.memberId)
      const sorted = subs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const active = sorted.find(s => s.status === 'active' || s.status === 'pending')
      setHasActiveSub(!!active)
      if (active) {
        setSubscription(active)
        if (active.packageId) packageService.get(active.packageId).then(setPkg).catch(() => {})
        setToast('Đã hủy gói cũ. Gói chờ kích hoạt đã được kích hoạt.')
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

  return (
    <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", maxWidth: 800, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed', top: 20, right: 24, zIndex: 100,
            background: `${G}22`, border: `1px solid ${G}44`, borderRadius: 12,
            padding: '12px 20px', color: G, fontSize: 14, fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Cancel confirmation dialog */}
      {cancelDialogOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 16px',
          }}
        >
          <div
            style={{
              background: BG,
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 24,
              padding: 32,
              maxWidth: 420,
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <AlertTriangle size={22} style={{ color: '#ef4444', flexShrink: 0 }} />
              <h3 style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, color: '#fff', margin: 0 }}>
                Xác nhận hủy gói
              </h3>
            </div>
            <p style={{ fontSize: 14, color: '#bbcabf', lineHeight: 1.65, marginBottom: 24 }}>
              Hủy gói sẽ mất quyền truy cập ngay lập tức.{' '}
              <strong style={{ color: '#ef4444' }}>KHÔNG hoàn tiền.</strong>{' '}
              Bạn có chắc chắn?
            </p>
            {cancelError && (
              <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{cancelError}</p>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setCancelDialogOpen(false); setCancelError(null) }}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent', color: '#fff',
                  fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  fontFamily: "'Be Vietnam Pro',sans-serif",
                }}
              >
                Không, giữ lại
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 999,
                  background: cancelling ? 'rgba(239,68,68,0.15)' : '#ef4444',
                  border: 'none',
                  color: cancelling ? '#a16060' : '#fff',
                  fontSize: 14, fontWeight: 600,
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                  fontFamily: "'Be Vietnam Pro',sans-serif",
                }}
              >
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-5">
          <Skeleton h={240} />
          <Skeleton h={180} />
          <Skeleton h={120} />
        </div>
      ) : error && !subscription ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertCircle size={40} style={{ color: '#ef4444' }} />
          <p style={{ color: '#bbcabf' }}>{error}</p>
          <BtnPrimary to="/member/subscription/setup">Chọn gói tập</BtnPrimary>
        </div>
      ) : !subscription ? (
        <div
          className="rounded-[40px] flex flex-col items-center justify-center text-center py-16 gap-4"
          style={{ background: BG, border: '1px solid rgba(66,224,158,0.08)' }}
        >
          <ShoppingBag size={48} style={{ color: '#bbcabf' }} />
          <p style={{ color: '#bbcabf', fontSize: 15 }}>Bạn chưa có gói tập nào đang hoạt động.</p>
          <BtnPrimary to="/member/subscription/setup">Chọn gói tập</BtnPrimary>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Expiring alert */}
          {isExpiring && (
            <div
              className="flex items-center gap-3 rounded-2xl px-5 py-4"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <p style={{ color: '#fbbf24', fontSize: 14 }}>
                Gói tập sắp hết hạn trong <strong>{daysLeft} ngày</strong>. Hãy gia hạn ngay để không bị gián đoạn.
              </p>
              <BtnPrimary to="/member/subscription/renew" small>Gia hạn</BtnPrimary>
            </div>
          )}

          {/* Main subscription card */}
          <div className="rounded-[40px] p-8" style={{ background: BG, border: '1px solid rgba(66,224,158,0.1)' }}>
            <div className="mb-6">
              <Badge
                label={SUB_STATUS_MAP[subscription.status]?.label ?? subscription.status}
                color={SUB_STATUS_MAP[subscription.status]?.color ?? '#6b7280'}
              />
              <h2 style={{ fontFamily: "'Anton',sans-serif", fontSize: 28, color: '#fff', marginTop: 12 }}>
                {subscription.packageName ?? pkg?.name ?? 'Gói tập'}
              </h2>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between mb-2" style={{ fontSize: 13, color: '#bbcabf' }}>
                <span>{daysUsed} ngày đã dùng / {totalDays} ngày</span>
                <span style={{ color: isExpiring ? '#f59e0b' : T }}>Còn {daysLeft} ngày</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%', borderRadius: 999,
                    width: `${progress}%`,
                    background: isExpiring ? '#f59e0b' : G,
                    transition: 'width 600ms ease',
                  }}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <CalendarCheck size={18} style={{ color: G }} />
                <div>
                  <p style={{ fontSize: 11, color: '#bbcabf', marginBottom: 2 }}>Ngày bắt đầu</p>
                  <p style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>{fmtDate(subscription.startDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <CalendarX size={18} style={{ color: isExpiring ? '#f59e0b' : '#bbcabf' }} />
                <div>
                  <p style={{ fontSize: 11, color: '#bbcabf', marginBottom: 2 }}>Ngày hết hạn</p>
                  <p style={{ fontSize: 14, color: isExpiring ? '#fbbf24' : '#fff', fontWeight: 500 }}>
                    {fmtDate(subscription.endDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Cancel button — only for cancellable statuses */}
            {(subscription.status === 'active' || subscription.status === 'pending') && (
              <div
                className="flex justify-end mt-6 pt-6"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <button
                  onClick={() => setCancelDialogOpen(true)}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(239,68,68,0.35)',
                    borderRadius: 999,
                    padding: '7px 18px',
                    color: '#ef4444',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: "'Be Vietnam Pro',sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 150ms',
                  }}
                >
                  <XCircle size={14} />
                  Hủy gói
                </button>
              </div>
            )}
          </div>

          {/* Benefits */}
          {benefits.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: BG, border: '1px solid rgba(66,224,158,0.08)' }}>
              <h3 style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: '#fff', marginBottom: 16 }}>
                Quyền lợi gói tập
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2" style={{ fontSize: 13, color: '#bbcabf' }}>
                    <Check size={14} style={{ color: T, flexShrink: 0, marginTop: 2 }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Payment history preview */}
          {payments.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: BG, border: '1px solid rgba(66,224,158,0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: '#fff' }}>
                  Lịch sử thanh toán
                </h3>
                <button
                  onClick={() => navigate('/member/subscription/history')}
                  className="rogym-text-link rogym-text-link--accent"
                  style={{ fontSize: 13, color: T, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Xem tất cả
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {payments.map(p => (
                  <div key={p.paymentId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock size={14} style={{ color: '#bbcabf' }} />
                      <div>
                        <p style={{ fontSize: 13, color: '#fff' }}>{fmtDate(p.paidAt)}</p>
                        <p style={{ fontSize: 11, color: '#bbcabf' }}>{METHOD_LABEL[p.method] ?? p.method}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: 14, fontWeight: 600, color: G }}>{fmtVND(p.amount)}</span>
                      <Badge
                        label={p.status === 'success' ? 'Thành công' : 'Thất bại'}
                        color={p.status === 'success' ? G : '#ef4444'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check, Calendar, Banknote, CreditCard, Wallet, ShoppingBag, PackageX,
} from 'lucide-react'
import packageService, { type Package } from '@/services/package.service'
import paymentService, { type PaymentMethod } from '@/services/payment.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'

const G  = '#06c384'
const T  = '#42e09e'
const BG = '#0f1c16'

function parseBenefits(raw: string | null): string[] {
  if (!raw) return []
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p.map(String)
  } catch { /* not json */ }
  return raw.split('\n').map(s => s.trim()).filter(Boolean)
}

function fmtVND(v: number | string) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v))
}

function Skeleton() {
  return <div className="animate-pulse rounded-[40px]" style={{ height: 340, background: `${BG}99` }} />
}

function BtnPrimary({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative overflow-hidden rounded-full font-semibold text-sm w-full py-3 transition-opacity"
      style={{
        background: disabled ? '#1a2d22' : G,
        color: disabled ? '#4a6654' : '#00492f',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'Be Vietnam Pro',sans-serif",
      }}
    >
      <span className="relative z-10">{children}</span>
    </button>
  )
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash',      label: 'Tiền mặt',      icon: <Banknote size={18} /> },
  { value: 'bank_card', label: 'Thẻ ngân hàng', icon: <CreditCard size={18} /> },
  { value: 'ewallet',   label: 'Ví điện tử',    icon: <Wallet size={18} /> },
]

export default function SubscriptionSetupPage() {
  const [packages, setPackages]   = useState<Package[]>([])
  const [loading, setLoading]     = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [method, setMethod]       = useState<PaymentMethod>('cash')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user?.memberId) return
    subscriptionService.getByMember(user.memberId)
      .then(subs => {
        const active = subs.find(s => s.status === 'active')
        if (active) navigate('/member/subscription/current', { replace: true })
      })
      .catch(() => {})
    packageService.list({ status: 'active' })
      .then(r => setPackages(r.data))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false))
  }, [user?.memberId, navigate])

  const selectedPkg = packages.find(p => p.packageId === selectedId) ?? null

  async function handleConfirm() {
    if (!selectedPkg || !user?.memberId) return
    setSubmitting(true)
    setError(null)
    try {
      const sub = await subscriptionService.create(user.memberId, selectedPkg.packageId)
      await paymentService.create({
        subscriptionId: Number(sub.subscriptionId),
        method,
        amount: Number(selectedPkg.price),
      })
      navigate('/member/subscription/current', { state: { justActivated: true } })
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      const status = e?.response?.status
      if (status === 409) {
        navigate('/member/subscription/current', { replace: true })
      } else {
        setError(e?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif" }}>
      {/* Hero */}
      <div
        className="rounded-[40px] mb-8 flex flex-col items-center justify-center text-center"
        style={{
          background: `linear-gradient(135deg, ${BG} 70%, ${G}18)`,
          border: `1px solid rgba(66,224,158,0.1)`,
          padding: '40px 24px',
        }}
      >
        <div style={{ width: 72, height: 72, borderRadius: 20, background: `${G}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <ShoppingBag size={36} style={{ color: G }} />
        </div>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 28, color: '#fff', marginBottom: 8 }}>
          Bắt đầu hành trình của bạn
        </h1>
        <p style={{ color: '#bbcabf', maxWidth: 440 }}>
          Chọn gói tập phù hợp để truy cập đầy đủ tính năng và bắt đầu tập luyện ngay hôm nay
        </p>
      </div>

      {/* Package grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[0, 1, 2].map(i => <Skeleton key={i} />)}
        </div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <PackageX size={48} style={{ color: '#bbcabf' }} />
          <p style={{ color: '#bbcabf' }}>Hiện tại chưa có gói tập nào. Vui lòng liên hệ gym.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {packages.map((pkg, idx) => {
            const isSelected = selectedId === pkg.packageId
            const isPopular  = idx === 1
            const benefits   = parseBenefits(pkg.benefits)
            return (
              <div
                key={pkg.packageId}
                onClick={() => setSelectedId(pkg.packageId)}
                style={{
                  borderRadius: 40,
                  background: BG,
                  border: isSelected
                    ? `2px solid ${G}`
                    : `1px solid rgba(66,224,158,${isPopular ? '0.2' : '0.08'})`,
                  padding: '28px 24px',
                  cursor: 'pointer',
                  transition: 'border-color 200ms ease, box-shadow 200ms ease',
                  boxShadow: isSelected ? `0 0 0 4px ${G}22` : 'none',
                  position: 'relative',
                }}
              >
                {isPopular && (
                  <span style={{
                    position: 'absolute', top: 20, right: 20,
                    background: `${G}22`, color: G, border: `1px solid ${G}44`,
                    borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                  }}>
                    Được chọn nhiều nhất
                  </span>
                )}
                <p style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, color: '#fff', marginBottom: 8 }}>
                  {pkg.name}
                </p>
                <p style={{ fontFamily: "'Anton',sans-serif", fontSize: 34, color: G, marginBottom: 4 }}>
                  {fmtVND(pkg.price)}
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#bbcabf', fontFamily: "'Be Vietnam Pro',sans-serif" }}> /gói</span>
                </p>
                <div className="flex items-center gap-2 mb-5" style={{ color: '#bbcabf', fontSize: 13 }}>
                  <Calendar size={14} />
                  <span>{pkg.durationDays} ngày</span>
                </div>
                {benefits.length > 0 && (
                  <ul className="flex flex-col gap-2 mb-0">
                    {benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2" style={{ fontSize: 13, color: '#bbcabf' }}>
                        <Check size={14} style={{ color: T, flexShrink: 0, marginTop: 2 }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Payment panel */}
      {selectedPkg && (
        <div
          style={{
            borderRadius: 32, background: BG,
            border: '1px solid rgba(66,224,158,0.12)', padding: '28px',
          }}
        >
          <h2 style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, color: '#fff', marginBottom: 20 }}>
            Xác nhận thanh toán
          </h2>
          <div className="flex items-center justify-between mb-5 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <p style={{ fontFamily: "'Anton',sans-serif", fontSize: 18, color: '#fff' }}>{selectedPkg.name}</p>
              <p style={{ fontSize: 13, color: '#bbcabf', marginTop: 2 }}>{selectedPkg.durationDays} ngày</p>
            </div>
            <p style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, color: G }}>{fmtVND(selectedPkg.price)}</p>
          </div>

          <p style={{ fontSize: 13, color: '#bbcabf', marginBottom: 12 }}>Phương thức thanh toán</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {METHOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMethod(opt.value)}
                style={{
                  borderRadius: 12,
                  border: method === opt.value ? `1.5px solid ${G}` : '1px solid rgba(255,255,255,0.1)',
                  background: method === opt.value ? `${G}18` : 'transparent',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  color: method === opt.value ? G : '#bbcabf',
                  fontSize: 12, fontFamily: "'Be Vietnam Pro',sans-serif", fontWeight: 500,
                  transition: 'border-color 150ms, background 150ms, color 150ms',
                }}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <BtnPrimary onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Đang xử lý...' : `Xác nhận thanh toán ${fmtVND(selectedPkg.price)}`}
          </BtnPrimary>
        </div>
      )}
    </div>
  )
}

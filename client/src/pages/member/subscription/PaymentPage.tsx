import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check, Calendar, Banknote, CreditCard, Wallet, PackageX, Dumbbell, ChevronDown,
} from 'lucide-react'
import packageService, { type Package } from '@/services/package.service'
import paymentService, { type PaymentMethod } from '@/services/payment.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'

const G = '#06c384'
const T = '#42e09e'
const BG_CARD = '#0f1c16'

function parseBenefits(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch { /* not json */ }
  return raw.split('\n').map(s => s.trim()).filter(Boolean)
}

function fmtVND(amount: number | string) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount))
}

function Skeleton() {
  return (
    <div className="animate-pulse rounded-[40px]" style={{ height: 340, background: `${BG_CARD}99` }} />
  )
}

function BtnPrimary({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rogym-btn rogym-btn--primary rogym-btn--wide"
      style={{
        background: disabled ? '#1a2d22' : G,
        color: disabled ? '#4a6654' : '#00492f',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'Be Vietnam Pro',sans-serif",
      }}
    >
      <span>{children}</span>
    </button>
  )
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash',      label: 'Tiền mặt',       icon: <Banknote size={18} /> },
  { value: 'bank_card', label: 'Thẻ ngân hàng',  icon: <CreditCard size={18} /> },
  { value: 'ewallet',   label: 'Ví điện tử',     icon: <Wallet size={18} /> },
]

export default function PaymentPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Package | null>(null)
  const [method, setMethod]     = useState<PaymentMethod>('cash')
  const [paying, setPaying]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)

  const navigate  = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    packageService.list({ status: 'active' })
      .then(r => setPackages(r.data))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false))
  }, [])

  function handleSelect(pkg: Package) {
    setSelected(pkg)
    setShowPanel(true)
    setError(null)
  }

  async function handlePay() {
    if (!selected) return
    if (!isAuthenticated || !user?.memberId) {
      navigate('/login?returnTo=/member/payment')
      return
    }
    setPaying(true)
    setError(null)
    try {
      const sub = await subscriptionService.create(user.memberId, selected.packageId)
      await paymentService.create({
        subscriptionId: Number(sub.subscriptionId),
        method,
        amount: Number(selected.price),
      })
      navigate('/member', { state: { paymentSuccess: true } })
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      const status = e?.response?.status
      if (status === 401) {
        navigate('/login?returnTo=/member/payment')
      } else if (status === 409) {
        navigate('/member/subscription/current')
      } else {
        setError(e?.response?.data?.message || 'Có lỗi xảy ra khi xử lý thanh toán. Vui lòng thử lại sau.')
      }
    } finally {
      setPaying(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080e0b', fontFamily: "'Be Vietnam Pro',sans-serif" }}>
      {/* Header */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 32px' }}>
        <div className="flex items-center gap-3 mb-2">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Dumbbell size={18} className="text-white" />
          </div>
          <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: '0.1em', color: '#fff' }}>ROGYM</span>
        </div>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 36, color: '#fff', marginTop: 24, marginBottom: 8 }}>
          Chọn gói tập của bạn
        </h1>
        <p style={{ color: '#bbcabf', fontSize: 15 }}>
          Đầu tư vào sức khỏe — linh hoạt và phù hợp với mọi mục tiêu
        </p>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 64px' }}>
        {/* Package grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map(i => <Skeleton key={i} />)}
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <PackageX size={48} style={{ color: '#bbcabf' }} />
            <p style={{ color: '#bbcabf' }}>Hiện tại chưa có gói tập nào. Vui lòng liên hệ gym.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg, idx) => {
              const isSelected = selected?.packageId === pkg.packageId
              const isPopular  = idx === 1
              const benefits   = parseBenefits(pkg.benefits)
              return (
                <div
                  key={pkg.packageId}
                  onClick={() => handleSelect(pkg)}
                  style={{
                    borderRadius: 40,
                    background: BG_CARD,
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
                      Phổ biến nhất
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
                    <ul className="flex flex-col gap-2 mb-6">
                      {benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2" style={{ fontSize: 13, color: '#bbcabf' }}>
                          <Check size={14} style={{ color: T, flexShrink: 0, marginTop: 2 }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  <BtnPrimary onClick={() => handleSelect(pkg)}>
                    {isSelected ? 'Đã chọn' : 'Chọn gói này'}
                  </BtnPrimary>
                </div>
              )
            })}
          </div>
        )}

        {/* Payment panel */}
        <div style={{
          overflow: 'hidden',
          maxHeight: showPanel && selected ? 520 : 0,
          transition: 'max-height 400ms cubic-bezier(0.4,0,0.2,1)',
          marginTop: showPanel && selected ? 32 : 0,
        }}>
          {selected && (
            <div style={{ borderRadius: 32, background: BG_CARD, border: '1px solid rgba(66,224,158,0.12)', padding: '28px 28px' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, color: '#fff' }}>
                  Xác nhận thanh toán
                </h2>
                <button onClick={() => setShowPanel(false)} style={{ color: '#bbcabf', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <ChevronDown size={20} />
                </button>
              </div>

              {/* Selected package summary */}
              <div className="flex items-center justify-between mb-5 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <p style={{ fontFamily: "'Anton',sans-serif", fontSize: 18, color: '#fff' }}>{selected.name}</p>
                  <p style={{ fontSize: 13, color: '#bbcabf', marginTop: 2 }}>{selected.durationDays} ngày</p>
                </div>
                <p style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, color: G }}>{fmtVND(selected.price)}</p>
              </div>

              {/* Payment method */}
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
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      color: method === opt.value ? G : '#bbcabf',
                      fontSize: 12,
                      fontFamily: "'Be Vietnam Pro',sans-serif",
                      fontWeight: 500,
                      transition: 'border-color 150ms, background 150ms, color 150ms',
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>

              {error && (
                <p style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</p>
              )}

              <BtnPrimary onClick={handlePay} disabled={paying}>
                {paying ? 'Đang xử lý thanh toán...' : `Thanh toán ${fmtVND(selected.price)}`}
              </BtnPrimary>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Calendar, PackageX, AlertCircle, ArrowRight } from 'lucide-react'
import packageService, { type Package } from '@/services/package.service'
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

function fmtDate(d: Date) {
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Skeleton({ h = 300 }: { h?: number }) {
  return <div className="animate-pulse rounded-[40px]" style={{ height: h, background: `${BG}99` }} />
}

function BtnPrimary({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative overflow-hidden rounded-full font-semibold text-sm w-full py-3"
      style={{
        background: disabled ? '#1a2d22' : G,
        color: disabled ? '#4a6654' : '#00492f',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'Be Vietnam Pro',sans-serif",
      }}
    >
      {children}
    </button>
  )
}

export default function BuyPackagePage() {
  const [packages, setPackages]     = useState<Package[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentPackageId, setCurrentPackageId] = useState<string | null>(null)

  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user?.memberId) return
    subscriptionService.getByMember(user.memberId)
      .then(subs => {
        const active = subs.find(s => s.status === 'active')
        if (active) {
          navigate('/member/subscription/current', { replace: true })
          return
        }
        const expired = subs
          .filter(s => s.status === 'expired')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        if (expired) setCurrentPackageId(expired.packageId)
      })
      .catch(() => {})
    packageService.list({ status: 'active' })
      .then(r => setPackages(r.data))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false))
  }, [user?.memberId, navigate])

  const selectedPkg = packages.find(p => p.packageId === selectedId) ?? null
  const today  = new Date()
  const endEst = selectedPkg
    ? new Date(today.getTime() + Number(selectedPkg.durationDays) * 86400000)
    : null

  function handleContinue() {
    if (!selectedPkg) return
    navigate('/member/subscription/buy/payment', {
      state: {
        packageId: selectedPkg.packageId,
        packageName: selectedPkg.name,
        price: Number(selectedPkg.price),
        durationDays: Number(selectedPkg.durationDays),
      },
    })
  }

  return (
    <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6" style={{ fontSize: 13, color: '#bbcabf' }}>
        <button onClick={() => navigate('/member/subscription/current')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T, fontSize: 13 }}>
          Gói tập
        </button>
        <span>/</span>
        <span style={{ color: '#fff' }}>Mua gói mới</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Packages */}
        <div className="lg:col-span-2">
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 26, color: '#fff', marginBottom: 20 }}>
            Mua gói tập mới
          </h1>
          {loading ? (
            <div className="flex flex-col gap-4">
              {[0, 1, 2].map(i => <Skeleton key={i} h={200} />)}
            </div>
          ) : packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <PackageX size={40} style={{ color: '#bbcabf' }} />
              <p style={{ color: '#bbcabf' }}>Hiện tại chưa có gói tập nào.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {packages.map((pkg, idx) => {
                const isSelected  = selectedId === pkg.packageId
                const isPopular   = idx === 1
                const isCurrent   = pkg.packageId === currentPackageId
                const benefits    = parseBenefits(pkg.benefits)
                return (
                  <div
                    key={pkg.packageId}
                    onClick={() => setSelectedId(pkg.packageId)}
                    style={{
                      borderRadius: 24, background: BG, cursor: 'pointer',
                      border: isSelected
                        ? `2px solid ${G}`
                        : `1px solid rgba(66,224,158,${isPopular ? '0.2' : '0.08'})`,
                      padding: '20px 24px',
                      transition: 'border-color 200ms, box-shadow 200ms',
                      boxShadow: isSelected ? `0 0 0 4px ${G}22` : 'none',
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p style={{ fontFamily: "'Anton',sans-serif", fontSize: 18, color: '#fff' }}>{pkg.name}</p>
                          {isCurrent && (
                            <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', color: '#bbcabf', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '1px 8px' }}>
                              Gói cũ
                            </span>
                          )}
                          {isPopular && (
                            <span style={{ fontSize: 11, background: `${G}22`, color: G, border: `1px solid ${G}44`, borderRadius: 999, padding: '1px 8px' }}>
                              Phổ biến
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2" style={{ color: '#bbcabf', fontSize: 13 }}>
                          <Calendar size={13} />
                          <span>{pkg.durationDays} ngày</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, color: G }}>{fmtVND(pkg.price)}</p>
                      </div>
                    </div>
                    {benefits.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {benefits.slice(0, 4).map((b, i) => (
                          <span key={i} className="flex items-center gap-1" style={{ fontSize: 12, color: '#bbcabf' }}>
                            <Check size={12} style={{ color: T, flexShrink: 0 }} />
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Order summary */}
        <div>
          <div
            className="rounded-2xl p-6 sticky top-20"
            style={{ background: BG, border: '1px solid rgba(66,224,158,0.1)' }}
          >
            <h3 style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: '#fff', marginBottom: 16 }}>
              Tóm tắt đơn hàng
            </h3>
            {!selectedPkg ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <AlertCircle size={32} style={{ color: '#bbcabf' }} />
                <p style={{ fontSize: 13, color: '#bbcabf', textAlign: 'center' }}>Chọn một gói tập để xem chi tiết</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2 mb-5 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex justify-between" style={{ fontSize: 14 }}>
                    <span style={{ color: '#bbcabf' }}>Gói</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{selectedPkg.name}</span>
                  </div>
                  <div className="flex justify-between" style={{ fontSize: 14 }}>
                    <span style={{ color: '#bbcabf' }}>Thời hạn</span>
                    <span style={{ color: '#fff' }}>{selectedPkg.durationDays} ngày</span>
                  </div>
                  <div className="flex justify-between" style={{ fontSize: 14 }}>
                    <span style={{ color: '#bbcabf' }}>Bắt đầu</span>
                    <span style={{ color: '#fff' }}>{fmtDate(today)}</span>
                  </div>
                  {endEst && (
                    <div className="flex justify-between" style={{ fontSize: 14 }}>
                      <span style={{ color: '#bbcabf' }}>Hết hạn</span>
                      <span style={{ color: '#fff' }}>{fmtDate(endEst)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between mb-6" style={{ fontSize: 16 }}>
                  <span style={{ color: '#bbcabf' }}>Tổng cộng</span>
                  <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, color: G }}>{fmtVND(selectedPkg.price)}</span>
                </div>

                <BtnPrimary onClick={handleContinue}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    Tiếp tục thanh toán <ArrowRight size={15} />
                  </span>
                </BtnPrimary>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

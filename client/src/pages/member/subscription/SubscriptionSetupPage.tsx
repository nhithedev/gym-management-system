import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Calendar, ArrowRight } from 'lucide-react'
import packageService, { type Package } from '@/services/package.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'

const G  = '#06c384'
const BG = '#0f1c16'

function fmtVND(v: number | string) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v))
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000)
}

function parseBenefits(raw: string | null): string[] {
  if (!raw) return []
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p.map(String)
  } catch { /* not json */ }
  return raw.split('\n').map(s => s.trim()).filter(Boolean)
}

function BtnPrimary({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full font-semibold text-sm w-full py-3"
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

const ITEM_H      = 84
const VISIBLE     = 5
const CONTAINER_H = ITEM_H * VISIBLE
const PAD_Y       = (CONTAINER_H - ITEM_H) / 2

export default function SubscriptionSetupPage() {
  const [packages, setPackages]   = useState<Package[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading]     = useState(true)
  const [centerDisplayIdx, setCenterDisplayIdx] = useState(0)

  const scrollRef     = useRef<HTMLDivElement>(null)
  const initialScroll = useRef(false)
  const isJumping     = useRef(false)

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
      .then(r => {
        setPackages(r.data)
        if (r.data.length > 0) setSelectedId(r.data[0].packageId)
      })
      .catch(() => setPackages([]))
      .finally(() => setLoading(false))
  }, [user?.memberId, navigate])

  // Scroll to first package once loaded — depends on loading so scrollRef is mounted
  useEffect(() => {
    if (loading || !packages.length || !scrollRef.current || initialScroll.current) return
    const N = packages.length
    const startIdx = N // middle copy, index 0
    scrollRef.current.scrollTop = startIdx * ITEM_H
    setCenterDisplayIdx(startIdx)
    initialScroll.current = true
  }, [loading, packages])

  const N            = packages.length
  const displayItems = N > 0 ? [...packages, ...packages, ...packages] : []
  const selectedPkg  = packages.find(p => p.packageId === selectedId) ?? null

  const today  = new Date()
  const endEst = selectedPkg ? addDays(today, Number(selectedPkg.durationDays)) : null

  function handlePickerScroll() {
    if (!scrollRef.current || isJumping.current || !N) return
    const scrollTop = scrollRef.current.scrollTop
    const rawIdx    = Math.round(scrollTop / ITEM_H)

    const pkgIdx = ((rawIdx % N) + N) % N
    const pkg    = packages[pkgIdx]
    if (pkg && pkg.packageId !== selectedId) setSelectedId(pkg.packageId)
    setCenterDisplayIdx(rawIdx)

    if (rawIdx < N) {
      isJumping.current = true
      scrollRef.current.scrollTop = scrollTop + N * ITEM_H
      requestAnimationFrame(() => { isJumping.current = false })
    } else if (rawIdx >= 2 * N) {
      isJumping.current = true
      scrollRef.current.scrollTop = scrollTop - N * ITEM_H
      requestAnimationFrame(() => { isJumping.current = false })
    }
  }

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
    <div
      style={{
        fontFamily: "'Be Vietnam Pro',sans-serif",
        height: 'calc(100dvh - 104px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        paddingBottom: 8,
      }}
    >
      <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, color: '#fff', marginBottom: 16, flexShrink: 0 }}>
        Đăng ký gói tập
      </h1>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, flex: 1, minHeight: 0 }}>
          <div style={{ borderRadius: 20, background: `${BG}99` }} className="animate-pulse" />
          <div style={{ borderRadius: 20, background: `${BG}99` }} className="animate-pulse" />
        </div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center" style={{ flex: 1, gap: 12 }}>
          <p style={{ fontSize: 14, color: '#bbcabf' }}>Hiện tại chưa có gói tập nào. Vui lòng liên hệ gym.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 400px',
            columnGap: 24,
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Left: scroll picker */}
          <div
            style={{
              position: 'relative',
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid rgba(66,224,158,0.08)',
              background: BG,
            }}
          >
            <div
              ref={scrollRef}
              onScroll={handlePickerScroll}
              className="[&::-webkit-scrollbar]:hidden"
              style={{
                height: '100%',
                overflowY: 'scroll',
                scrollSnapType: 'y mandatory',
                scrollbarWidth: 'none',
              } as React.CSSProperties}
            >
              <div style={{ height: PAD_Y }} />

              {displayItems.map((pkg, displayIdx) => {
                const dist       = Math.abs(displayIdx - centerDisplayIdx)
                const isSelected = dist === 0
                const opacity    = dist === 0 ? 1 : dist === 1 ? 0.48 : 0.18
                const benefits   = parseBenefits(pkg.benefits)

                return (
                  <div
                    key={`${displayIdx}-${pkg.packageId}`}
                    onClick={() => {
                      setSelectedId(pkg.packageId)
                      setCenterDisplayIdx(displayIdx)
                      scrollRef.current?.scrollTo({ top: displayIdx * ITEM_H, behavior: 'smooth' })
                    }}
                    style={{
                      height: ITEM_H,
                      scrollSnapAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 20px',
                      gap: 14,
                      opacity,
                      transition: 'opacity 180ms ease',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(6,195,132,0.05)' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: `1.5px solid ${isSelected ? G : 'rgba(255,255,255,0.15)'}`,
                        background: isSelected ? `${G}22` : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 180ms',
                      }}
                    >
                      {isSelected && <Check size={11} style={{ color: G }} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span
                          style={{
                            fontFamily: "'Anton',sans-serif",
                            fontSize: isSelected ? 17 : 15,
                            color: '#fff',
                            transition: 'font-size 180ms',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                        >
                          {pkg.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#bbcabf' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={11} />{pkg.durationDays} ngày
                        </span>
                        {isSelected && benefits.length > 0 && (
                          <span style={{ color: '#6a8c78', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {benefits.slice(0, 2).join(' · ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      style={{
                        fontFamily: "'Anton',sans-serif",
                        fontSize: isSelected ? 19 : 16,
                        color: isSelected ? G : '#6a8c78',
                        flexShrink: 0,
                        transition: 'font-size 180ms, color 180ms',
                      }}
                    >
                      {fmtVND(pkg.price)}
                    </span>
                  </div>
                )
              })}

              <div style={{ height: PAD_Y }} />
            </div>

            {/* Top fade */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: PAD_Y, background: `linear-gradient(to bottom, ${BG} 15%, transparent)`, pointerEvents: 'none', zIndex: 2 }} />
            {/* Bottom fade */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: PAD_Y, background: `linear-gradient(to top, ${BG} 15%, transparent)`, pointerEvents: 'none', zIndex: 2 }} />
            {/* Center highlight band */}
            <div
              style={{
                position: 'absolute', left: 0, right: 0,
                top: '50%', height: ITEM_H, transform: 'translateY(-50%)',
                borderTop: '1px solid rgba(6,195,132,0.18)',
                borderBottom: '1px solid rgba(6,195,132,0.18)',
                pointerEvents: 'none', zIndex: 1,
              }}
            />
          </div>

          {/* Right: order detail card */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              className="rounded-2xl"
              style={{
                background: BG,
                border: '1px solid rgba(66,224,158,0.1)',
                padding: 24,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
              }}
            >
              <h3 style={{ fontFamily: "'Anton',sans-serif", fontSize: 15, color: '#fff', marginBottom: 16, flexShrink: 0 }}>
                Chi tiết đăng ký
              </h3>

              {selectedPkg ? (
                <>
                  <div
                    className="flex flex-col gap-2.5 pb-5 mb-5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}
                  >
                    <div className="flex justify-between" style={{ fontSize: 13 }}>
                      <span style={{ color: '#bbcabf' }}>Gói</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{selectedPkg.name}</span>
                    </div>
                    <div className="flex justify-between" style={{ fontSize: 13 }}>
                      <span style={{ color: '#bbcabf' }}>Thời hạn</span>
                      <span style={{ color: '#fff' }}>{selectedPkg.durationDays} ngày</span>
                    </div>
                    <div className="flex justify-between" style={{ fontSize: 13 }}>
                      <span style={{ color: '#bbcabf' }}>Bắt đầu</span>
                      <span style={{ color: '#fff' }}>{fmtDate(today)}</span>
                    </div>
                    {endEst && (
                      <div className="flex justify-between" style={{ fontSize: 13 }}>
                        <span style={{ color: '#bbcabf' }}>Hết hạn</span>
                        <span style={{ color: '#fff' }}>{fmtDate(endEst)}</span>
                      </div>
                    )}
                    <div className="flex justify-between" style={{ marginTop: 4 }}>
                      <span style={{ fontSize: 13, color: '#bbcabf' }}>Tổng cộng</span>
                      <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, color: G }}>
                        {fmtVND(selectedPkg.price)}
                      </span>
                    </div>
                  </div>

                  <div style={{ flex: 1 }} />

                  <BtnPrimary onClick={handleContinue}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      Tiếp tục thanh toán <ArrowRight size={15} />
                    </span>
                  </BtnPrimary>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 13, color: '#bbcabf', textAlign: 'center' }}>Cuộn để chọn gói</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

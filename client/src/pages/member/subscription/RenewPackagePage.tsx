import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Calendar, ArrowRight } from 'lucide-react'
import packageService, { type Package } from '@/services/package.service'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'

const G  = '#06c384'
const T  = '#42e09e'
const BG = '#0f1c16'

function fmtVND(v: number | string) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v))
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
      className="rogym-btn rogym-btn--primary rogym-btn--wide"
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

export default function RenewPackagePage() {
  const [currentSub, setCurrentSub]   = useState<Subscription | null>(null)
  const [currentPkg, setCurrentPkg]   = useState<Package | null>(null)
  const [allPackages, setAllPackages] = useState<Package[]>([])
  const [selectedId, setSelectedId]   = useState<string>('')
  const [loading, setLoading]         = useState(true)

  // centerDisplayIdx tracks which item in displayItems (3× list) is centered
  const [centerDisplayIdx, setCenterDisplayIdx] = useState(0)

  const scrollRef      = useRef<HTMLDivElement>(null)
  const initialScroll  = useRef(false)
  const isJumping      = useRef(false)

  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  useEffect(() => {
    if (!user?.memberId) return
    Promise.allSettled([
      subscriptionService.getByMember(user.memberId),
      packageService.list({ status: 'active' }),
    ]).then(([subRes, pkgRes]) => {
      if (subRes.status === 'fulfilled') {
        const active = subRes.value
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .find(s => s.status === 'active' || s.status === 'expired')
        if (!active) { navigate('/member/subscription/buy', { replace: true }); return }
        setCurrentSub(active)
        setSelectedId(active.packageId)
        packageService.get(active.packageId).then(setCurrentPkg).catch(() => {})
      } else {
        const status = (subRes.reason as { response?: { status?: number } })?.response?.status
        if (status === 401) { clearAuth(); navigate('/login') }
      }
      if (pkgRes.status === 'fulfilled') setAllPackages(pkgRes.value.data)
    }).finally(() => setLoading(false))
  }, [user?.memberId, navigate, clearAuth])

  // Scroll picker to selected package after packages load — depends on loading so scrollRef is mounted
  useEffect(() => {
    if (loading || !allPackages.length || !scrollRef.current || initialScroll.current) return
    const N   = allPackages.length
    const idx = allPackages.findIndex(p => p.packageId === selectedId)
    const startDisplayIdx = N + (idx >= 0 ? idx : 0)
    scrollRef.current.scrollTop = startDisplayIdx * ITEM_H
    setCenterDisplayIdx(startDisplayIdx)
    initialScroll.current = true
  }, [loading, allPackages, selectedId])

  const N            = allPackages.length
  // Infinite list: three copies of packages
  const displayItems = N > 0 ? [...allPackages, ...allPackages, ...allPackages] : []

  const selectedPkg = allPackages.find(p => p.packageId === selectedId) ?? currentPkg

  const today      = new Date()
  const renewStart = currentSub
    ? (new Date(currentSub.endDate) > today ? addDays(new Date(currentSub.endDate), 1) : today)
    : today
  const renewEnd   = selectedPkg ? addDays(renewStart, Number(selectedPkg.durationDays)) : null

  function handlePickerScroll() {
    if (!scrollRef.current || isJumping.current || !N) return
    const scrollTop = scrollRef.current.scrollTop
    const rawIdx    = Math.round(scrollTop / ITEM_H)

    // Update selected package
    const pkgIdx = ((rawIdx % N) + N) % N
    const pkg    = allPackages[pkgIdx]
    if (pkg && pkg.packageId !== selectedId) setSelectedId(pkg.packageId)
    setCenterDisplayIdx(rawIdx)

    // Infinite loop: silently jump back to middle copy when near edges
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
    navigate('/member/subscription/renew/payment', {
      state: {
        packageId: selectedPkg.packageId,
        packageName: selectedPkg.name,
        price: Number(selectedPkg.price),
        durationDays: Number(selectedPkg.durationDays),
        renewStart: renewStart.toISOString(),
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-3" style={{ fontSize: 13, color: '#bbcabf', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/member/subscription/current')}
          className="rogym-text-link rogym-text-link--accent"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T, fontSize: 13 }}
        >
          Gói tập
        </button>
        <span>/</span>
        <span style={{ color: '#fff' }}>Gia hạn</span>
      </div>

      <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, color: '#fff', marginBottom: 16, flexShrink: 0 }}>
        Gia hạn gói tập
      </h1>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gridTemplateRows: '1fr', gap: 24, flex: 1, minHeight: 0 }}>
          <div style={{ borderRadius: 20, background: `${BG}99` }} className="animate-pulse" />
          <div style={{ borderRadius: 20, background: `${BG}99` }} className="animate-pulse" />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 400px',
            gridTemplateRows: currentSub ? 'auto 1fr' : '1fr',
            rowGap: 16,
            columnGap: 24,
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* ── Left row 1: current sub info (direct grid item) ── */}
          {currentSub && (
            <div
              className="rounded-2xl px-5 py-4"
              style={{ gridColumn: 1, gridRow: 1, background: BG, border: '1px solid rgba(66,224,158,0.08)' }}
            >
              <p style={{ fontSize: 12, color: '#bbcabf', marginBottom: 4 }}>Gói đang dùng</p>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: '#fff' }}>
                  {currentSub.packageName ?? currentPkg?.name ?? 'Gói tập'}
                </span>
                <span style={{ fontSize: 13, color: '#bbcabf' }}>
                  Hết hạn <strong style={{ color: '#fff' }}>{fmtDate(currentSub.endDate)}</strong>
                </span>
              </div>
              <p style={{ fontSize: 12, color: T, marginTop: 4 }}>
                Gia hạn bắt đầu từ: <strong>{fmtDate(renewStart)}</strong>
              </p>
            </div>
          )}

          {/* ── Left row 2 (or row 1 if no sub): picker — direct grid item in 1fr row ── */}
          {allPackages.length > 0 ? (
            <div
              style={{
                gridColumn: 1,
                gridRow: currentSub ? 2 : 1,
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
                border: '1px solid rgba(66,224,158,0.08)',
                background: BG,
              }}
            >
                {/* Scrollable list */}
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
                    const isCurrent  = pkg.packageId === currentPkg?.packageId
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
                        {/* Selected indicator */}
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            border: `1.5px solid ${isSelected ? G : 'rgba(255,255,255,0.15)'}`,
                            background: isSelected ? `${G}22` : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 180ms',
                          }}
                        >
                          {isSelected && <Check size={11} style={{ color: G }} />}
                        </div>

                        {/* Package info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span
                              style={{
                                fontFamily: "'Anton',sans-serif",
                                fontSize: isSelected ? 17 : 15,
                                color: '#fff',
                                transition: 'font-size 180ms',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {pkg.name}
                            </span>
                            {isCurrent && (
                              <span
                                style={{
                                  fontSize: 10,
                                  background: 'rgba(66,224,158,0.12)',
                                  color: T,
                                  borderRadius: 999,
                                  padding: '1px 7px',
                                  flexShrink: 0,
                                }}
                              >
                                Hiện tại
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              fontSize: 12,
                              color: '#bbcabf',
                            }}
                          >
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

                        {/* Price */}
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
                <div
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: PAD_Y,
                    background: `linear-gradient(to bottom, ${BG} 15%, transparent)`,
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                />
                {/* Bottom fade */}
                <div
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: PAD_Y,
                    background: `linear-gradient(to top, ${BG} 15%, transparent)`,
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                />
                {/* Center highlight band */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    top: '50%',
                    height: ITEM_H,
                    transform: 'translateY(-50%)',
                    borderTop: '1px solid rgba(6,195,132,0.18)',
                    borderBottom: '1px solid rgba(6,195,132,0.18)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                />
              </div>
            ) : (
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{
                  gridColumn: 1,
                  gridRow: currentSub ? 2 : 1,
                  minHeight: CONTAINER_H,
                  background: BG,
                  border: '1px solid rgba(66,224,158,0.08)',
                  color: '#bbcabf',
                  fontSize: 14,
                }}
              >
                Không có gói nào khả dụng
              </div>
            )}

          {/* ── Right: order summary card spans all rows ── */}
          <div style={{ gridColumn: 2, gridRow: '1 / -1', display: 'flex', flexDirection: 'column' }}>
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
              <h3
                style={{
                  fontFamily: "'Anton',sans-serif",
                  fontSize: 15,
                  color: '#fff',
                  marginBottom: 16,
                  flexShrink: 0,
                }}
              >
                Chi tiết gia hạn
              </h3>

              {selectedPkg ? (
                <>
                  {/* Package details */}
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
                      <span style={{ color: '#fff' }}>{fmtDate(renewStart)}</span>
                    </div>
                    {renewEnd && (
                      <div className="flex justify-between" style={{ fontSize: 13 }}>
                        <span style={{ color: '#bbcabf' }}>Hết hạn mới</span>
                        <span style={{ color: '#fff' }}>{fmtDate(renewEnd)}</span>
                      </div>
                    )}
                    <div className="flex justify-between" style={{ marginTop: 4 }}>
                      <span style={{ fontSize: 13, color: '#bbcabf' }}>Tổng cộng</span>
                      <span
                        style={{
                          fontFamily: "'Anton',sans-serif",
                          fontSize: 20,
                          color: G,
                        }}
                      >
                        {fmtVND(selectedPkg.price)}
                      </span>
                    </div>
                  </div>

                  {/* Spacer pushes button to bottom */}
                  <div style={{ flex: 1 }} />

                  <BtnPrimary onClick={handleContinue}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      Tiếp tục thanh toán <ArrowRight size={15} />
                    </span>
                  </BtnPrimary>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 13, color: '#bbcabf', textAlign: 'center' }}>
                    Cuộn để chọn gói
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

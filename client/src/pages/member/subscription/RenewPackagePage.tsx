import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react'
import packageService, { type Package } from '@/services/package.service'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { MemberPage, MemberPageHeader } from '../components/MemberUI'

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
  const [detailsVisible, setDetailsVisible] = useState(false)

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
        if (!active) { navigate('/member/subscription/setup', { replace: true }); return }
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

  useEffect(() => {
    if (loading || !allPackages.length || !scrollRef.current || initialScroll.current) return
    const N   = allPackages.length
    const idx = allPackages.findIndex(p => p.packageId === selectedId)
    const startDisplayIdx = N + (idx >= 0 ? idx : 0)
    scrollRef.current.scrollTop = startDisplayIdx * ITEM_H
    setCenterDisplayIdx(startDisplayIdx)
    initialScroll.current = true
  }, [loading, allPackages, selectedId])

  // Animate details card in/out when selection changes
  useEffect(() => {
    if (selectedId) {
      setDetailsVisible(false)
      const t = setTimeout(() => setDetailsVisible(true), 20)
      return () => clearTimeout(t)
    }
  }, [selectedId])

  const N            = allPackages.length
  const displayItems = N > 0 ? [...allPackages, ...allPackages, ...allPackages] : []

  const selectedPkg = allPackages.find(p => p.packageId === selectedId) ?? currentPkg

  const today      = new Date()
  const renewStart = currentSub
    ? (new Date(currentSub.endDate) > today ? addDays(new Date(currentSub.endDate), 1) : today)
    : today
  const renewEnd   = selectedPkg ? addDays(renewStart, Number(selectedPkg.durationDays)) : null

  const benefits = parseBenefits(selectedPkg?.benefits ?? null)

  function handlePickerScroll() {
    if (!scrollRef.current || isJumping.current || !N) return
    const scrollTop = scrollRef.current.scrollTop
    const rawIdx    = Math.round(scrollTop / ITEM_H)

    const pkgIdx = ((rawIdx % N) + N) % N
    const pkg    = allPackages[pkgIdx]
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
    <MemberPage>
      <MemberPageHeader
        eyebrow="Gói tập"
        title="Gia hạn gói tập"
        description="Cuộn để chọn gói gia hạn."
        actions={
          <button onClick={() => navigate('/member/subscription/current')} className="rogym-btn rogym-btn--outline-white">
            ← Gói hiện tại
          </button>
        }
      />

      {loading ? (
        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 300px' }}>
          <div className="animate-pulse rounded-2xl" style={{ height: CONTAINER_H + 80, background: `${BG}99` }} />
          <div className="animate-pulse rounded-2xl" style={{ height: CONTAINER_H + 80, background: `${BG}99` }} />
        </div>
      ) : (
        <div
          className="flex flex-col gap-4"
          style={{ height: 'calc(100dvh - 220px)', minHeight: CONTAINER_H + 120 }}
        >
          {/* Current sub info strip */}
          {currentSub && (
            <div className="rogym-card rogym-card--compact px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <p className="text-xs text-[var(--rogym-text-secondary)] mb-0.5">Gói đang dùng</p>
                <span className="text-base font-bold text-white" style={{ fontFamily: "'Anton',sans-serif" }}>
                  {currentSub.packageName ?? currentPkg?.name ?? 'Gói tập'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--rogym-text-secondary)]">Hết hạn <strong className="text-white">{fmtDate(currentSub.endDate)}</strong></p>
                <p className="text-xs mt-0.5" style={{ color: T }}>
                  Gia hạn từ: <strong>{fmtDate(renewStart)}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Two side-by-side cards */}
          <div className="flex gap-5 flex-1 min-h-0">
            {/* ── LEFT card: picker ── */}
            <div className="rogym-card rogym-card--compact flex-1 overflow-hidden relative">
              {allPackages.length > 0 ? (
                <>
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
                          {/* Selection indicator */}
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0, transition: 'all 180ms',
                            border: `1.5px solid ${isSelected ? G : 'rgba(255,255,255,0.15)'}`,
                            background: isSelected ? `${G}22` : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isSelected && <Check size={11} style={{ color: G }} />}
                          </div>

                          {/* Package info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <span style={{
                                fontFamily: "'Anton',sans-serif",
                                fontSize: isSelected ? 17 : 15,
                                color: '#fff',
                                transition: 'font-size 180ms',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {pkg.name}
                              </span>
                              {isCurrent && (
                                <span style={{ fontSize: 10, background: 'rgba(66,224,158,0.12)', color: T, borderRadius: 999, padding: '1px 7px', flexShrink: 0 }}>
                                  Hiện tại
                                </span>
                              )}
                            </div>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--rogym-text-secondary)' }}>
                              <Calendar size={11} />{pkg.durationDays} ngày
                            </span>
                          </div>

                          {/* Price */}
                          <span style={{
                            fontFamily: "'Anton',sans-serif",
                            fontSize: isSelected ? 19 : 16,
                            color: isSelected ? G : '#6a8c78',
                            flexShrink: 0,
                            transition: 'font-size 180ms, color 180ms',
                          }}>
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
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: '50%', height: ITEM_H, transform: 'translateY(-50%)',
                    borderTop: '1px solid rgba(6,195,132,0.18)', borderBottom: '1px solid rgba(6,195,132,0.18)',
                    pointerEvents: 'none', zIndex: 1,
                  }} />
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--rogym-text-secondary)] text-sm">
                  Không có gói nào khả dụng
                </div>
              )}
            </div>

            {/* ── RIGHT card: benefits + summary — always rendered, animates in when pkg loads ── */}
            <div
              className="rogym-card rogym-card--compact p-6 flex flex-col shrink-0"
              style={{
                width: 300,
                opacity: detailsVisible ? 1 : 0,
                transform: detailsVisible ? 'translateX(0)' : 'translateX(20px)',
                transition: 'opacity 250ms ease, transform 250ms ease',
              }}
            >
              {selectedPkg ? (
                <>
                  {/* Package name + price */}
                  <div className="mb-4 pb-4 border-b border-white/5">
                    <p className="text-xs text-[var(--rogym-text-secondary)] mb-1">Gói chọn</p>
                    <p className="text-base font-bold text-white" style={{ fontFamily: "'Anton',sans-serif" }}>
                      {selectedPkg.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-[var(--rogym-text-secondary)] flex items-center gap-1">
                        <Calendar size={10} /> {selectedPkg.durationDays} ngày
                      </span>
                      <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: G }}>
                        {fmtVND(selectedPkg.price)}
                      </span>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--rogym-text-secondary)] mb-3">
                      Quyền lợi
                    </p>
                    {benefits.length > 0 ? (
                      <ul className="flex flex-col gap-2.5">
                        {benefits.map((b, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-white/80">
                            <CheckCircle2 size={14} style={{ color: G, flexShrink: 0, marginTop: 2 }} />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--rogym-text-dim)]">Không có thông tin quyền lợi.</p>
                    )}
                  </div>

                  {/* Dates + continue */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5 text-xs text-[var(--rogym-text-secondary)]">
                      <div className="flex justify-between">
                        <span>Bắt đầu</span>
                        <span className="text-white">{fmtDate(renewStart)}</span>
                      </div>
                      {renewEnd && (
                        <div className="flex justify-between">
                          <span>Hết hạn mới</span>
                          <span className="text-white">{fmtDate(renewEnd)}</span>
                        </div>
                      )}
                    </div>
                    <button onClick={handleContinue} className="rogym-btn rogym-btn--primary w-full justify-center">
                      Tiếp tục <ArrowRight size={15} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-[var(--rogym-text-dim)] text-center">Cuộn để chọn gói</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MemberPage>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react'
import packageService, { type Package } from '@/services/package.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { MemberPage, MemberPageHeader } from '../components/MemberUI'

const G  = '#06c384'
const BG = '#0f1c16'

function fmtVND(v: number | string) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v))
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

export default function SubscriptionSetupPage() {
  const [packages, setPackages]     = useState<Package[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedId, setSelectedId] = useState<string>('')
  const [detailsVisible, setDetailsVisible] = useState(false)
  const [centerDisplayIdx, setCenterDisplayIdx] = useState(0)

  const scrollRef      = useRef<HTMLDivElement>(null)
  const initialScroll  = useRef(false)
  const isJumping      = useRef(false)

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
        const def = r.data[2] ?? r.data[r.data.length - 1]
        if (def) setSelectedId(def.packageId)
      })
      .catch(() => setPackages([]))
      .finally(() => setLoading(false))
  }, [user?.memberId, navigate])

  useEffect(() => {
    if (loading || !packages.length || !scrollRef.current || initialScroll.current) return
    const N   = packages.length
    const idx = packages.findIndex(p => p.packageId === selectedId)
    const startDisplayIdx = N + (idx >= 0 ? idx : 0)
    scrollRef.current.scrollTop = startDisplayIdx * ITEM_H
    setCenterDisplayIdx(startDisplayIdx)
    initialScroll.current = true
  }, [loading, packages, selectedId])

  useEffect(() => {
    if (selectedId) {
      setDetailsVisible(false)
      const t = setTimeout(() => setDetailsVisible(true), 20)
      return () => clearTimeout(t)
    }
  }, [selectedId])

  const N            = packages.length
  const displayItems = N > 0 ? [...packages, ...packages, ...packages] : []
  const selectedPkg  = packages.find(p => p.packageId === selectedId) ?? null
  const benefits     = parseBenefits(selectedPkg?.benefits ?? null)

  const today  = new Date()
  const endEst = selectedPkg ? new Date(today.getTime() + Number(selectedPkg.durationDays) * 86400000) : null

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
    <MemberPage>
      <MemberPageHeader
        eyebrow="Gói tập"
        title="Chọn gói tập"
        description="Cuộn để chọn gói phù hợp với mục tiêu của bạn."
      />

      {loading ? (
        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 300px' }}>
          <div className="animate-pulse rounded-2xl" style={{ height: CONTAINER_H + 80, background: `${BG}99` }} />
          <div className="animate-pulse rounded-2xl" style={{ height: CONTAINER_H + 80, background: `${BG}99` }} />
        </div>
      ) : packages.length === 0 ? (
        <div className="rogym-card rogym-card--compact flex items-center justify-center py-16 text-[var(--rogym-text-secondary)] text-sm">
          Hiện tại chưa có gói tập nào khả dụng. Vui lòng liên hệ gym.
        </div>
      ) : (
        <div
          className="flex flex-col gap-4"
          style={{ height: 'calc(100dvh - 220px)', minHeight: CONTAINER_H + 120 }}
        >
          <div className="flex gap-5 flex-1 min-h-0">
            {/* ── LEFT card: picker ── */}
            <div className="rogym-card rogym-card--compact flex-1 overflow-hidden relative">
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
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, transition: 'all 180ms',
                        border: `1.5px solid ${isSelected ? G : 'rgba(255,255,255,0.15)'}`,
                        background: isSelected ? `${G}22` : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <Check size={11} style={{ color: G }} />}
                      </div>

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
                        </div>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--rogym-text-secondary)' }}>
                          <Calendar size={11} />{pkg.durationDays} ngày
                        </span>
                      </div>

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

              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: PAD_Y, background: `linear-gradient(to bottom, ${BG} 15%, transparent)`, pointerEvents: 'none', zIndex: 2 }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: PAD_Y, background: `linear-gradient(to top, ${BG} 15%, transparent)`, pointerEvents: 'none', zIndex: 2 }} />
              <div style={{
                position: 'absolute', left: 0, right: 0, top: '50%', height: ITEM_H, transform: 'translateY(-50%)',
                borderTop: '1px solid rgba(6,195,132,0.18)', borderBottom: '1px solid rgba(6,195,132,0.18)',
                pointerEvents: 'none', zIndex: 1,
              }} />
            </div>

            {/* ── RIGHT card: benefits + summary ── */}
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
                  <div className="mb-4 pb-4 border-b border-white/5">
                    <p className="text-xs text-[var(--rogym-text-secondary)] mb-1">Gói chọn</p>
                    <p className="text-base font-bold text-white">{selectedPkg.name}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-[var(--rogym-text-secondary)] flex items-center gap-1">
                        <Calendar size={10} /> {selectedPkg.durationDays} ngày
                      </span>
                      <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: G }}>
                        {fmtVND(selectedPkg.price)}
                      </span>
                    </div>
                  </div>

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

                  <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5 text-xs text-[var(--rogym-text-secondary)]">
                      <div className="flex justify-between">
                        <span>Bắt đầu</span>
                        <span className="text-white">{fmtDate(today)}</span>
                      </div>
                      {endEst && (
                        <div className="flex justify-between">
                          <span>Hết hạn dự kiến</span>
                          <span className="text-white">{fmtDate(endEst)}</span>
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

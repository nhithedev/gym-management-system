import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageSearch, ReceiptText, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import paymentService, { type Payment } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'
import { MemberPage, MemberPageHeader, MemberSkeleton } from '../components/MemberUI'
import { getPaymentMethodLabel } from '@/components/payment/payment-method-data'
import { formatVnd } from '@/lib/currency'
import { formatDate } from '@/lib/date'

const G  = '#06c384'
const BG = '#0f1c16'

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      fontFamily: "'Be Vietnam Pro',sans-serif", background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  )
}

const SUB_STATUS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Đang hoạt động', color: G },
  pending:   { label: 'Chờ kích hoạt',  color: '#f59e0b' },
  expired:   { label: 'Đã hết hạn',     color: '#6b7280' },
  cancelled: { label: 'Đã huỷ',         color: '#ef4444' },
}

const PAY_STATUS: Record<string, { label: string; color: string }> = {
  success: { label: 'Thành công', color: G },
  failed:  { label: 'Thất bại',   color: '#ef4444' },
}

const PAGE_SIZE = 5

/* Island button group */
function IslandGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-2 text-xs font-medium transition-colors"
          style={{
            background: value === opt.value ? 'rgba(6,195,132,0.15)' : 'transparent',
            color: value === opt.value ? G : 'var(--rogym-text-secondary)',
            borderRight: i < options.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            cursor: 'pointer',
            fontFamily: "'Be Vietnam Pro',sans-serif",
          }}
          onMouseEnter={e => { if (value !== opt.value) (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
          onMouseLeave={e => { if (value !== opt.value) (e.currentTarget as HTMLButtonElement).style.color = 'var(--rogym-text-secondary)' }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/* Numbered pagination */
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null

  const pages: (number | '...')[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i)
    if (page < total - 2) pages.push('...')
    pages.push(total)
  }

  const btnBase: React.CSSProperties = {
    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer',
    fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, transition: 'all 150ms',
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{ ...btnBase, color: page === 1 ? '#4a6654' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
      >
        <ChevronLeft size={15} />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} style={{ color: 'var(--rogym-text-secondary)', fontSize: 13, padding: '0 4px' }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            style={{
              ...btnBase,
              background: p === page ? 'rgba(6,195,132,0.15)' : 'transparent',
              color: p === page ? G : '#fff',
              borderColor: p === page ? 'rgba(6,195,132,0.3)' : 'rgba(255,255,255,0.12)',
            }}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page === total}
        style={{ ...btnBase, color: page === total ? '#4a6654' : '#fff', cursor: page === total ? 'not-allowed' : 'pointer' }}
      >
        <ChevronRight size={15} />
      </button>
    </div>
  )
}

export default function PackageHistoryPage() {
  const [activeTab, setActiveTab]   = useState<'subscriptions' | 'payments'>('subscriptions')
  const [subs, setSubs]             = useState<Subscription[]>([])
  const [payments, setPayments]     = useState<Payment[]>([])
  const [loadingSubs, setLoadingSubs]   = useState(true)
  const [loadingPays, setLoadingPays]   = useState(false)
  const [paysLoaded, setPaysLoaded]     = useState(false)
  const [page, setPage]             = useState(1)
  const [subPage, setSubPage]       = useState(1)
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'bank_card' | 'ewallet'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [sortDir, setSortDir]       = useState<'desc' | 'asc'>('desc')

  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  useEffect(() => {
    if (!user?.memberId) return
    subscriptionService.getByMember(user.memberId)
      .then(data => setSubs(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
      .catch(err => {
        if (err?.response?.status === 401) { clearAuth(); navigate('/login') }
      })
      .finally(() => setLoadingSubs(false))
  }, [user?.memberId, navigate, clearAuth])

  function loadPayments() {
    if (paysLoaded || !user?.memberId) return
    setLoadingPays(true)
    paymentService.listByMember(user.memberId)
      .then(data => { setPayments(data); setPaysLoaded(true) })
      .catch(() => {})
      .finally(() => setLoadingPays(false))
  }

  function handleTabChange(tab: 'subscriptions' | 'payments') {
    setActiveTab(tab)
    setPage(1)
    setSubPage(1)
    if (tab === 'payments') loadPayments()
  }

  const filteredPayments = payments
    .filter(p => {
      if (methodFilter !== 'all' && p.method !== methodFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      return true
    })
    .sort((a, b) => {
      const diff = new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
      return sortDir === 'desc' ? diff : -diff
    })

  const totalPayPages = Math.ceil(filteredPayments.length / PAGE_SIZE)
  const pagedPayments = filteredPayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalSubPages = Math.ceil(subs.length / PAGE_SIZE)
  const pagedSubs = subs.slice((subPage - 1) * PAGE_SIZE, subPage * PAGE_SIZE)

  const METHOD_OPTIONS = [
    { value: 'all' as const, label: 'Tất cả' },
    { value: 'cash' as const, label: 'Tiền mặt' },
    { value: 'bank_card' as const, label: 'Thẻ NH' },
    { value: 'ewallet' as const, label: 'Ví điện tử' },
  ]
  const STATUS_OPTIONS = [
    { value: 'all' as const, label: 'Tất cả' },
    { value: 'success' as const, label: 'Thành công' },
    { value: 'failed' as const, label: 'Thất bại' },
  ]

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Gói tập"
        title="Lịch sử"
        description="Xem lại các gói tập đã đăng ký và giao dịch thanh toán."
        actions={
          <button onClick={() => navigate('/member/subscription/current')} className="rogym-btn rogym-btn--outline-white">
            ← Gói hiện tại
          </button>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/5">
        {(['subscriptions', 'payments'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className="px-5 py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab ? '#fff' : 'var(--rogym-text-secondary)',
              borderBottom: activeTab === tab ? `2px solid ${G}` : '2px solid transparent',
              marginBottom: -1,
              fontFamily: "'Be Vietnam Pro',sans-serif",
            }}
          >
            {tab === 'subscriptions' ? 'Lịch sử gói tập' : 'Lịch sử thanh toán'}
          </button>
        ))}
      </div>

      {/* Subscriptions tab */}
      {activeTab === 'subscriptions' && (
        loadingSubs ? (
          <MemberSkeleton rows={4} />
        ) : subs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <PackageSearch size={48} className="text-[var(--rogym-text-secondary)]" />
            <p className="text-[var(--rogym-text-secondary)]">Chưa có lịch sử gói tập nào.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {pagedSubs.map(sub => {
                const st = SUB_STATUS[sub.status] ?? { label: sub.status, color: '#6b7280' }
                return (
                  <div
                    key={sub.subscriptionId}
                    className="rogym-card rogym-card--compact px-5 py-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-bold text-white mb-1.5" style={{ fontFamily: "'Anton',sans-serif" }}>
                          {sub.packageName ?? 'Gói tập'}
                        </p>
                        <p className="text-sm text-[var(--rogym-text-secondary)]">
                          {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
                        </p>
                        {sub.status === 'cancelled' && sub.cancelledAt && (
                          <p className="text-xs text-red-400 mt-1">Huỷ lúc {formatDate(sub.cancelledAt)}</p>
                        )}
                      </div>
                      <Badge label={st.label} color={st.color} />
                    </div>
                  </div>
                )
              })}
            </div>
            <Pagination page={subPage} total={totalSubPages} onChange={p => { setSubPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
          </>
        )
      )}

      {/* Payments tab */}
      {activeTab === 'payments' && (
        <div>
          {/* Filters row */}
          <div className="flex gap-3 mb-5 flex-wrap items-center">
            <IslandGroup options={METHOD_OPTIONS} value={methodFilter} onChange={v => { setMethodFilter(v); setPage(1) }} />
            <IslandGroup options={STATUS_OPTIONS} value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }} />

            {/* Sort toggle */}
            <button
              onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPage(1) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: 'var(--rogym-text-secondary)',
                fontFamily: "'Be Vietnam Pro',sans-serif",
                cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--rogym-text-secondary)' }}
            >
              <ArrowUpDown size={13} />
              {sortDir === 'desc' ? 'Mới nhất' : 'Cũ nhất'}
            </button>
          </div>

          {loadingPays ? (
            <MemberSkeleton rows={4} />
          ) : filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <ReceiptText size={48} className="text-[var(--rogym-text-secondary)]" />
              <p className="text-[var(--rogym-text-secondary)]">Chưa có giao dịch nào.</p>
            </div>
          ) : (
            <>
              {/* Header row */}
              <div
                className="grid gap-4 px-4 mb-2 text-xs text-[var(--rogym-text-secondary)]"
                style={{ gridTemplateColumns: '1fr 1fr 100px 130px 90px' }}
              >
                <span>Ngày</span><span>Gói</span><span>Phương thức</span><span>Số tiền</span><span>Trạng thái</span>
              </div>
              <div className="flex flex-col gap-2">
                {pagedPayments.map(p => {
                  const ps = PAY_STATUS[p.status] ?? { label: p.status, color: '#6b7280' }
                  return (
                    <div
                      key={p.paymentId}
                      className="grid items-center gap-4 rounded-xl px-4 py-3"
                      style={{
                        gridTemplateColumns: '1fr 1fr 100px 130px 90px',
                        background: BG, border: '1px solid rgba(66,224,158,0.06)', fontSize: 13,
                      }}
                    >
                      <span className="text-white">{formatDate(p.paidAt)}</span>
                      <span className="text-[var(--rogym-text-secondary)] truncate">{p.packageName ?? '—'}</span>
                      <span className="text-[var(--rogym-text-secondary)]">{getPaymentMethodLabel(p.method, true)}</span>
                      <span className="font-semibold" style={{ color: G }}>{formatVnd(p.amount)}</span>
                      <Badge label={ps.label} color={ps.color} />
                    </div>
                  )
                })}
              </div>
              <Pagination page={page} total={totalPayPages} onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
            </>
          )}
        </div>
      )}
    </MemberPage>
  )
}

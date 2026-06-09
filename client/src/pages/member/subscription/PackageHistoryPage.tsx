import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageSearch, ReceiptText, ChevronLeft, ChevronRight } from 'lucide-react'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import paymentService, { type Payment } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'

const G  = '#06c384'
const BG = '#0f1c16'

function fmtVND(v: number | string) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v))
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

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

function Skeleton({ h = 64 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl" style={{ height: h, background: `${BG}99` }} />
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

const METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt', bank_card: 'Thẻ NH', ewallet: 'Ví điện tử',
}

const PAGE_SIZE = 10

export default function PackageHistoryPage() {
  const [activeTab, setActiveTab]   = useState<'subscriptions' | 'payments'>('subscriptions')
  const [subs, setSubs]             = useState<Subscription[]>([])
  const [payments, setPayments]     = useState<Payment[]>([])
  const [loadingSubs, setLoadingSubs]   = useState(true)
  const [loadingPays, setLoadingPays]   = useState(false)
  const [paysLoaded, setPaysLoaded]     = useState(false)
  const [page, setPage]             = useState(1)
  const [methodFilter, setMethodFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

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
    if (tab === 'payments') loadPayments()
  }

  const filteredPayments = payments.filter(p => {
    if (methodFilter !== 'all' && p.method !== methodFilter) return false
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    return true
  })
  const totalPages = Math.ceil(filteredPayments.length / PAGE_SIZE)
  const pagedPayments = filteredPayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", maxWidth: 800, margin: '0 auto' }}>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {(['subscriptions', 'payments'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            style={{
              padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, fontWeight: 600,
              color: activeTab === tab ? '#fff' : '#bbcabf',
              borderBottom: activeTab === tab ? `2px solid ${G}` : '2px solid transparent',
              marginBottom: -1, transition: 'color 150ms, border-color 150ms',
            }}
          >
            {tab === 'subscriptions' ? 'Lịch sử gói tập' : 'Lịch sử thanh toán'}
          </button>
        ))}
      </div>

      {/* Subscriptions tab */}
      {activeTab === 'subscriptions' && (
        loadingSubs ? (
          <div className="flex flex-col gap-3">
            {[0,1,2,3].map(i => <Skeleton key={i} h={72} />)}
          </div>
        ) : subs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <PackageSearch size={48} style={{ color: '#bbcabf' }} />
            <p style={{ color: '#bbcabf' }}>Chưa có lịch sử gói tập nào.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {subs.map(sub => {
              const st = SUB_STATUS[sub.status] ?? { label: sub.status, color: '#6b7280' }
              return (
                <div
                  key={sub.subscriptionId}
                  className="rounded-2xl px-5 py-4"
                  style={{ background: BG, border: '1px solid rgba(66,224,158,0.08)' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: '#fff', marginBottom: 6 }}>
                        {sub.packageName ?? 'Gói tập'}
                      </p>
                      <p style={{ fontSize: 13, color: '#bbcabf' }}>
                        {fmtDate(sub.startDate)} → {fmtDate(sub.endDate)}
                      </p>
                      {sub.status === 'cancelled' && sub.cancelledAt && (
                        <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                          Huỷ lúc {fmtDate(sub.cancelledAt)}
                        </p>
                      )}
                    </div>
                    <Badge label={st.label} color={st.color} />
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Payments tab */}
      {activeTab === 'payments' && (
        <div>
          {/* Filters */}
          <div className="flex gap-3 mb-5 flex-wrap">
            <select
              value={methodFilter}
              onChange={e => { setMethodFilter(e.target.value); setPage(1) }}
              style={{
                borderRadius: 10, padding: '8px 14px', fontSize: 13,
                background: BG, border: '1px solid rgba(255,255,255,0.12)', color: '#fff',
                fontFamily: "'Be Vietnam Pro',sans-serif", cursor: 'pointer',
              }}
            >
              <option value="all">Tất cả phương thức</option>
              <option value="cash">Tiền mặt</option>
              <option value="bank_card">Thẻ ngân hàng</option>
              <option value="ewallet">Ví điện tử</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              style={{
                borderRadius: 10, padding: '8px 14px', fontSize: 13,
                background: BG, border: '1px solid rgba(255,255,255,0.12)', color: '#fff',
                fontFamily: "'Be Vietnam Pro',sans-serif", cursor: 'pointer',
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="success">Thành công</option>
              <option value="failed">Thất bại</option>
            </select>
            {(methodFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => { setMethodFilter('all'); setStatusFilter('all'); setPage(1) }}
                style={{
                  borderRadius: 10, padding: '8px 14px', fontSize: 13,
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#bbcabf',
                  fontFamily: "'Be Vietnam Pro',sans-serif", cursor: 'pointer',
                }}
              >
                Reset
              </button>
            )}
          </div>

          {loadingPays ? (
            <div className="flex flex-col gap-3">
              {[0,1,2,3].map(i => <Skeleton key={i} h={64} />)}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <ReceiptText size={48} style={{ color: '#bbcabf' }} />
              <p style={{ color: '#bbcabf' }}>Chưa có giao dịch nào.</p>
            </div>
          ) : (
            <>
              {/* Header row */}
              <div className="grid gap-4 px-4 mb-2" style={{ gridTemplateColumns: '1fr 1fr 100px 120px 90px', fontSize: 12, color: '#bbcabf' }}>
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
                        gridTemplateColumns: '1fr 1fr 100px 120px 90px',
                        background: BG, border: '1px solid rgba(66,224,158,0.06)', fontSize: 13,
                      }}
                    >
                      <span style={{ color: '#fff' }}>{fmtDate(p.paidAt)}</span>
                      <span style={{ color: '#bbcabf', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.packageName ?? '—'}
                      </span>
                      <span style={{ color: '#bbcabf' }}>{METHOD_LABEL[p.method] ?? p.method}</span>
                      <span style={{ fontWeight: 600, color: G }}>{fmtVND(p.amount)}</span>
                      <Badge label={ps.label} color={ps.color} />
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)',
                      background: 'transparent', color: page === 1 ? '#4a6654' : '#fff',
                      cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: 14, color: '#bbcabf' }}>{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)',
                      background: 'transparent', color: page === totalPages ? '#4a6654' : '#fff',
                      cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

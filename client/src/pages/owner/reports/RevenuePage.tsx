import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page, PageHeader } from '@/components/shared/PageUI'
import { reportService, type RevenueReport } from '@/services/report.service'

const G = '#06c384'

function todayVN(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}

function startOfMonthVN(): string {
  return todayVN().slice(0, 8) + '01'
}

function formatVND(raw: string | number): string {
  const n = typeof raw === 'string' ? parseFloat(raw) : raw
  if (isNaN(n)) return String(raw)
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ ₫'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' tr ₫'
  return n.toLocaleString('vi-VN') + ' ₫'
}

function formatVNDFull(raw: string | number): string {
  const n = typeof raw === 'string' ? parseFloat(raw) : raw
  if (isNaN(n)) return String(raw)
  return n.toLocaleString('vi-VN') + ' ₫'
}

export default function RevenuePage() {
  const navigate = useNavigate()
  const [from, setFrom] = useState(startOfMonthVN())
  const [to, setTo] = useState(todayVN())
  const [report, setReport] = useState<RevenueReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = todayVN()

  function load(f: string, t: string) {
    if (!f || !t || f > t) {
      setError('Khoảng thời gian không hợp lệ.')
      return
    }
    setLoading(true)
    setError(null)
    setReport(null)
    reportService.revenue(f, t)
      .then(setReport)
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
        setError(msg ?? 'Không tải được báo cáo doanh thu.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(from, to) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleApply() { load(from, to) }

  const maxAmount = report ? Math.max(...report.breakdown.map((b) => parseFloat(b.amount)), 0) : 0

  return (
    <Page>
      <PageHeader
        eyebrow="Báo cáo"
        title="Doanh thu"
        description="Chi tiết doanh thu theo ngày"
        actions={
          <button onClick={() => navigate('/owner/reports')} className="rogym-btn rogym-btn--outline-white flex items-center gap-2 px-3 py-2 text-sm">
            <ArrowLeft size={14} /> Quay lại
          </button>
        }
      />

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--rogym-text-muted)]">Từ ngày</label>
          <input type="date" max={today} className="input-base py-1.5 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--rogym-text-muted)]">Đến ngày</label>
          <input type="date" max={today} className="input-base py-1.5 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={handleApply} disabled={loading} className="rogym-btn rogym-btn--primary px-4 py-1.5 text-sm disabled:opacity-50">
          {loading ? 'Đang tải...' : 'Áp dụng'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-[#06c384]" />
          <p className="text-sm text-[var(--rogym-text-secondary)]">Đang tải dữ liệu...</p>
        </div>
      )}

      {report && (
        <>
          {/* Total */}
          <div className="rogym-card rogym-card--compact flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${G}1a` }}>
              <TrendingUp size={24} style={{ color: G }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatVND(report.total)}</p>
              <p className="text-xs text-[var(--rogym-text-muted)]">Tổng doanh thu · {from} → {to}</p>
            </div>
          </div>

          {/* Bar chart */}
          {report.breakdown.length === 0 ? (
            <div className="rogym-card rogym-card--compact flex min-h-32 items-center justify-center p-8">
              <p className="text-sm text-[var(--rogym-text-secondary)]">Không có giao dịch nào trong khoảng thời gian này.</p>
            </div>
          ) : (
            <div className="rogym-card rogym-card--compact p-5">
              <h2 className="mb-4 text-sm font-semibold text-white">Doanh thu theo ngày</h2>
              <div className="flex items-end gap-1.5 overflow-x-auto pb-2" style={{ minHeight: 120 }}>
                {report.breakdown.map((b) => {
                  const pct = maxAmount > 0 ? (parseFloat(b.amount) / maxAmount) * 100 : 0
                  const day = b.date.slice(8)
                  return (
                    <div key={b.date} className="group flex flex-1 min-w-[22px] flex-col items-center gap-1">
                      <div className="relative w-full">
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-xs text-white group-hover:block" style={{ background: '#1a2e22', border: '1px solid rgba(255,255,255,0.15)', zIndex: 10 }}>
                          {formatVNDFull(b.amount)}
                        </div>
                        <div
                          className="w-full rounded-t transition-all"
                          style={{ height: `${Math.max(pct * 0.9, 4)}px`, background: G, opacity: 0.85 }}
                        />
                      </div>
                      <span className="text-[9px] text-[var(--rogym-text-dim)] leading-none">{day}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Data table */}
          {report.breakdown.length > 0 && (
            <div className="rogym-card rogym-card--compact overflow-hidden p-0">
              <div className="grid border-b border-[var(--rogym-border-section)] px-5 py-3 text-xs font-semibold uppercase text-[var(--rogym-text-muted)]" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <span>Ngày</span>
                <span className="text-right">Doanh thu</span>
              </div>
              {[...report.breakdown].reverse().map((b, i) => (
                <div key={b.date} className="grid items-center px-5 py-3" style={{ gridTemplateColumns: '1fr 1fr', borderBottom: i < report.breakdown.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <p className="text-sm text-[var(--rogym-text-secondary)]">{b.date}</p>
                  <p className="text-right text-sm font-semibold text-white">{formatVNDFull(b.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  )
}

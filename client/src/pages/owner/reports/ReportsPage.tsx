import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users, RefreshCw, Star, ChevronRight, AlertCircle } from 'lucide-react'
import { Page, PageHeader } from '@/components/shared/PageUI'
import { reportService, type RenewalsReport, type StaffPerformanceRow } from '@/services/report.service'

const G = '#06c384'

function todayVN(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}

function startOfMonthVN(): string {
  return todayVN().slice(0, 8) + '01'
}

// ─── Date Range Picker ─────────────────────────────────────────────────────

interface DateRangeState {
  from: string
  to: string
}

function DateRangePicker({ value, onChange, onApply }: {
  value: DateRangeState
  onChange: (v: DateRangeState) => void
  onApply: () => void
}) {
  const today = todayVN()
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--rogym-text-muted)]">Từ</label>
        <input type="date" max={today} className="input-base py-1.5 text-sm" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--rogym-text-muted)]">Đến</label>
        <input type="date" max={today} className="input-base py-1.5 text-sm" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} />
      </div>
      <button onClick={onApply} className="rogym-btn rogym-btn--primary px-4 py-1.5 text-sm">Áp dụng</button>
    </div>
  )
}

// ─── Renewals Summary ──────────────────────────────────────────────────────

function RenewalsSummary({ range }: { range: DateRangeState }) {
  const [data, setData] = useState<RenewalsReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function fetch() {
    setLoading(true)
    setErr(null)
    reportService.renewals(range.from, range.to)
      .then(setData)
      .catch(() => setErr('Không tải được báo cáo tái đăng ký.'))
      .finally(() => setLoading(false))
  }

  return (
    <div className="rogym-card rogym-card--compact p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <RefreshCw size={15} style={{ color: G }} /> Tái đăng ký
        </h2>
        <button onClick={fetch} disabled={loading} className="rogym-btn rogym-btn--outline-white px-3 py-1.5 text-xs disabled:opacity-50">
          {loading ? 'Đang tải...' : 'Xem'}
        </button>
      </div>

      {err && <p className="text-xs text-red-300">{err}</p>}

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl px-3 py-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xl font-bold" style={{ color: G }}>{data.renewed}</p>
            <p className="mt-0.5 text-xs text-[var(--rogym-text-muted)]">Đã gia hạn</p>
          </div>
          <div className="rounded-xl px-3 py-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xl font-bold text-red-400">{data.churned}</p>
            <p className="mt-0.5 text-xs text-[var(--rogym-text-muted)]">Rời đi</p>
          </div>
          <div className="rounded-xl px-3 py-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xl font-bold text-amber-400">
              {data.renewalRate !== null ? `${(data.renewalRate * 100).toFixed(0)}%` : 'N/A'}
            </p>
            <p className="mt-0.5 text-xs text-[var(--rogym-text-muted)]">Tỷ lệ</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Staff Performance ─────────────────────────────────────────────────────

function StaffPerformanceTable({ range }: { range: DateRangeState }) {
  const [rows, setRows] = useState<StaffPerformanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function fetch() {
    setLoading(true)
    setErr(null)
    reportService.staffPerformance(range.from, range.to)
      .then(setRows)
      .catch(() => setErr('Không tải được hiệu suất nhân sự.'))
      .finally(() => setLoading(false))
  }

  return (
    <div className="rogym-card rogym-card--compact p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Star size={15} className="text-amber-400" /> Hiệu suất HLV
        </h2>
        <button onClick={fetch} disabled={loading} className="rogym-btn rogym-btn--outline-white px-3 py-1.5 text-xs disabled:opacity-50">
          {loading ? 'Đang tải...' : 'Xem'}
        </button>
      </div>

      {err && <p className="text-xs text-red-300">{err}</p>}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="grid px-4 py-2 text-xs font-semibold uppercase text-[var(--rogym-text-muted)]" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
            <span>Tên</span>
            <span>Buổi HT</span>
            <span>Điểm PH</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.staffId} className="grid items-center px-4 py-2.5" style={{ gridTemplateColumns: '2fr 1fr 1fr', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div>
                <p className="text-sm font-medium text-white">{r.fullName}</p>
                <p className="text-xs font-mono text-[var(--rogym-text-muted)]">{r.staffCode}</p>
              </div>
              <p className="text-sm font-semibold" style={{ color: G }}>{r.completedSessions}</p>
              <p className="text-sm text-[var(--rogym-text-secondary)]">
                {r.avgFeedbackSeverityScore !== null ? r.avgFeedbackSeverityScore.toFixed(1) : '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const navigate = useNavigate()
  const [range, setRange] = useState<DateRangeState>({
    from: startOfMonthVN(),
    to: todayVN(),
  })
  const [applied, setApplied] = useState<DateRangeState>({ from: startOfMonthVN(), to: todayVN() })

  function applyRange() {
    if (!range.from || !range.to || range.from > range.to) {
      alert('Khoảng thời gian không hợp lệ.')
      return
    }
    setApplied({ ...range })
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Quản lý"
        title="Báo cáo"
        description="Xem số liệu theo khoảng thời gian"
      />

      <DateRangePicker value={range} onChange={setRange} onApply={applyRange} />

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={() => navigate('/owner/reports/revenue')}
          className="rogym-card rogym-card--compact flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.04] transition-colors"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${G}1a` }}>
            <TrendingUp size={20} style={{ color: G }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Báo cáo doanh thu</p>
            <p className="text-xs text-[var(--rogym-text-muted)]">Xem chi tiết theo ngày</p>
          </div>
          <ChevronRight size={16} className="ml-auto text-[var(--rogym-text-dim)]" />
        </button>

        <div className="rogym-card rogym-card--compact flex items-center gap-3 px-5 py-4 text-left opacity-50 cursor-default">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <Users size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Báo cáo hội viên</p>
            <p className="text-xs text-[var(--rogym-text-muted)]">Xem trực tiếp trong trang này bên dưới</p>
          </div>
        </div>
      </div>

      {/* Inline report sections */}
      <RenewalsSummary range={applied} />
      <StaffPerformanceTable range={applied} />

      {/* Members report hint */}
      <div className="rogym-card rogym-card--compact p-5">
        <div className="flex items-start gap-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--rogym-text-muted)]" />
          <p className="text-xs text-[var(--rogym-text-secondary)]">
            Số liệu hội viên mới và doanh thu tháng được hiển thị trực tiếp tại{' '}
            <button onClick={() => navigate('/owner')} className="font-medium underline" style={{ color: G }}>Bảng điều khiển</button>.
            Nhấn <em>Xem</em> ở mỗi mục để tải số liệu theo khoảng thời gian đã chọn.
          </p>
        </div>
      </div>
    </Page>
  )
}

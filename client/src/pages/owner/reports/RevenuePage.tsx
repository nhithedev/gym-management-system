import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  Download,
  FileText,
  Printer,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  BarChart2,
} from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatVnd } from '@/lib/currency'
import { todayInput, monthStart } from '@/lib/date'
import { OWNER_ACCENT } from '@/lib/owner-constants'
import { reportService, type RevenueBreakdown } from '@/services/report.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerSelect,
  OwnerStatCard,
} from '@/components/OwnerUI'

type QuickFilter = 'today' | 'week' | 'month' | 'custom'
type Granularity = 'day' | 'month' | 'quarter' | 'year'

function getQuickRange(filter: QuickFilter): { from: string; to: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  if (filter === 'today') return { from: fmt(today), to: fmt(today) }
  if (filter === 'week') {
    const mon = new Date(today)
    mon.setDate(today.getDate() - today.getDay() + 1)
    return { from: fmt(mon), to: fmt(today) }
  }
  const first = new Date(today.getFullYear(), today.getMonth(), 1)
  return { from: fmt(first), to: fmt(today) }
}

function getPreviousRange(from: string, to: string): { from: string; to: string } {
  const start = new Date(from)
  const end = new Date(to)
  const diffMs = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 86400000)
  const prevStart = new Date(prevEnd.getTime() - diffMs)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(prevStart), to: fmt(prevEnd) }
}

function groupBreakdown(data: RevenueBreakdown[], granularity: Granularity) {
  const map = new Map<string, number>()
  for (const row of data) {
    const d = new Date(row.date)
    let key: string
    if (granularity === 'day') key = row.date
    else if (granularity === 'month')
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    else if (granularity === 'quarter')
      key = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`
    else key = String(d.getFullYear())
    map.set(key, (map.get(key) ?? 0) + Number(row.amount))
  }
  return Array.from(map.entries()).map(([date, amount]) => ({ date, amount }))
}

function formatAxisKey(key: string, granularity: Granularity): string {
  if (granularity === 'day') {
    const d = new Date(key)
    return `${d.getDate()}/${d.getMonth() + 1}`
  }
  return key
}

function RevenueTooltip({
  active,
  payload,
  label,
  granularity,
}: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
  granularity: Granularity
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a2d22] px-4 py-3 text-sm shadow-xl">
      <p className="text-xs rogym-text-dim">{label ? formatAxisKey(label, granularity) : ''}</p>
      <p className="font-bold rogym-text-green">{formatVnd(Number(payload[0]?.value))}</p>
    </div>
  )
}

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
  { key: 'custom', label: 'Tùy chỉnh' },
]

const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: 'day', label: 'Ngày' },
  { key: 'month', label: 'Tháng' },
  { key: 'quarter', label: 'Quý' },
  { key: 'year', label: 'Năm' },
]

export default function RevenuePage() {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month')
  const [from, setFrom] = useState(() => monthStart())
  const [to, setTo] = useState(() => todayInput())
  const [granularity, setGranularity] = useState<Granularity>('day')

  const [data, setData] = useState<RevenueBreakdown[]>([])
  const [prevTotal, setPrevTotal] = useState<string>('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = useMemo(() => data.reduce((sum, r) => sum + Number(r.amount), 0), [data])

  const growth = useMemo(() => {
    const prev = Number(prevTotal)
    if (prev === 0) return null
    return ((total - prev) / prev) * 100
  }, [total, prevTotal])

  const chartData = useMemo(() => groupBreakdown(data, granularity), [data, granularity])
  const maxAmount = chartData.length > 0 ? Math.max(...chartData.map((d) => d.amount)) : 1

  const load = useCallback(async () => {
    if (!from || !to) return
    setLoading(true)
    setError(null)
    try {
      const prevRange = getPreviousRange(from, to)
      const [current, prev] = await Promise.all([
        reportService.getRevenue(from, to),
        reportService.getRevenue(prevRange.from, prevRange.to),
      ])
      setData(current.breakdown)
      setPrevTotal(prev.total)
    } catch (err) {
      setError(getApiError(err, 'Không tải được báo cáo doanh thu.'))
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  function applyQuickFilter(f: QuickFilter) {
    setQuickFilter(f)
    if (f !== 'custom') {
      const range = getQuickRange(f)
      setFrom(range.from)
      setTo(range.to)
    }
  }

  const isPositive = growth === null || growth >= 0

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Tài chính"
        title="Báo cáo doanh thu"
        description="Theo dõi doanh thu, cơ cấu và hiệu suất bán hàng."
      />

      {/* Bộ lọc */}
      <div className="rogym-card rogym-card--compact space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <OwnerSelect
            value={quickFilter}
            onValueChange={(v) => applyQuickFilter(v as QuickFilter)}
            ariaLabel="Khoảng thời gian"
          >
            {QUICK_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </OwnerSelect>
        </div>

        {quickFilter === 'custom' && (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium rogym-text-dim">Từ ngày</label>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="rogym-input"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium rogym-text-dim">Đến ngày</label>
              <input
                type="date"
                value={to}
                min={from}
                max={todayInput()}
                onChange={(e) => setTo(e.target.value)}
                className="rogym-input"
              />
            </div>
            <button className="rogym-btn rogym-btn--primary" onClick={load} disabled={loading}>
              Tải báo cáo
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {['Tất cả chi nhánh', 'Tất cả nhân viên', 'Loại dịch vụ', 'Sản phẩm'].map((label) => (
            <OwnerSelect key={label} value="" onValueChange={() => {}} disabled className="w-auto">
              <option value="">{label}</option>
            </OwnerSelect>
          ))}
        </div>
      </div>

      {loading && data.length === 0 ? (
        <OwnerSkeleton rows={4} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={load} />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OwnerStatCard
              icon={<DollarSign size={18} />}
              label="Tổng doanh thu"
              value={formatVnd(total)}
              hint={`${data.length} ngày có giao dịch`}
              accent
            />
            <OwnerStatCard
              icon={<ShoppingCart size={18} />}
              label="Số đơn / giao dịch"
              value="—"
              hint="Chờ cập nhật backend"
              accent={false}
            />
            <OwnerStatCard
              icon={<BarChart2 size={18} />}
              label="Lợi nhuận ước tính"
              value="—"
              hint="Chờ cập nhật backend"
              accent={false}
            />
            <OwnerStatCard
              icon={
                <span className={!isPositive ? 'text-red-400' : ''}>
                  {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </span>
              }
              label="So với kỳ trước"
              value={growth === null ? '—' : `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}
              hint={`Kỳ trước: ${formatVnd(Number(prevTotal))}`}
              accent={isPositive}
            />
          </div>

          {/* Biểu đồ doanh thu */}
          {data.length === 0 ? (
            <OwnerEmptyState
              title="Không có doanh thu trong khoảng này"
              description="Thử chọn khoảng thời gian khác."
            />
          ) : (
            <div className="rogym-card rogym-card--compact p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-base font-bold text-white">Doanh thu theo thời gian</h2>
                <OwnerSelect
                  value={granularity}
                  onValueChange={(v) => setGranularity(v as Granularity)}
                  ariaLabel="Nhóm theo"
                >
                  {GRANULARITIES.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </OwnerSelect>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => formatAxisKey(v, granularity)}
                    tick={{ fill: '#bbcabf', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`}
                    tick={{ fill: '#bbcabf', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, maxAmount * 1.15]}
                  />
                  <Tooltip cursor={false} content={<RevenueTooltip granularity={granularity} />} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.amount === maxAmount ? OWNER_ACCENT : `${OWNER_ACCENT}66`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Biểu đồ cơ cấu */}
          <div className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-4 text-base font-bold text-white">Cơ cấu doanh thu</h2>
            <div className="flex items-center justify-center h-40">
              <p className="text-sm rogym-text-dim">Dữ liệu cơ cấu đang được phát triển.</p>
            </div>
          </div>

          {/* Top gói tập */}
          <div className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-4 text-base font-bold text-white">Top gói tập bán chạy</h2>
            <div className="flex items-center justify-center h-32">
              <p className="text-sm rogym-text-dim">Dữ liệu top gói đang được phát triển.</p>
            </div>
          </div>

          {/* Chi tiết giao dịch */}
          <div className="rogym-card rogym-card--compact overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-base font-bold text-white">Chi tiết giao dịch</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs rogym-text-dim">
                    <th className="px-5 py-3 font-medium">Ngày</th>
                    <th className="px-5 py-3 font-medium">Khách hàng</th>
                    <th className="px-5 py-3 font-medium">Gói</th>
                    <th className="px-5 py-3 font-medium text-right">Số tiền</th>
                    <th className="px-5 py-3 font-medium">Thanh toán</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm rogym-text-dim">
                      Dữ liệu giao dịch đang được phát triển.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Export */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white opacity-50 cursor-not-allowed"
              disabled
            >
              <Download size={15} /> Xuất Excel
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white opacity-50 cursor-not-allowed"
              disabled
            >
              <FileText size={15} /> Xuất PDF
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white opacity-50 cursor-not-allowed"
              disabled
            >
              <Printer size={15} /> In báo cáo
            </button>
          </div>
        </>
      )}
    </OwnerPage>
  )
}

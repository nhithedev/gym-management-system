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
  TrendingUp,
  TrendingDown,
  DollarSign,
  UserPlus,
  RefreshCw,
  LoaderCircle,
} from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatVnd } from '@/lib/currency'
import { todayInput } from '@/lib/date'
import { OWNER_ACCENT } from '@/lib/owner-constants'
import {
  reportService,
  type RevenueBreakdown,
  type RenewalData,
  type TopPackageItem,
} from '@/services/report.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerSelect,
  OwnerStatCard,
} from '@/components/OwnerUI'

type FilterMode = 'week' | 'month' | 'quarter' | 'custom'
type Granularity = 'day' | 'month' | 'quarter' | 'year'

const _now = new Date()
const CURRENT_YEAR = _now.getFullYear()
const CURRENT_MONTH = _now.getMonth() + 1
const CURRENT_QUARTER = Math.ceil(CURRENT_MONTH / 3)

function getCurrentISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

const CURRENT_WEEK = getCurrentISOWeek(_now)
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => 2020 + i)
const WEEKS = Array.from({ length: 53 }, (_, i) => i + 1)

const MONTH_OPTIONS = [
  { value: 1, label: 'Tháng 1' },
  { value: 2, label: 'Tháng 2' },
  { value: 3, label: 'Tháng 3' },
  { value: 4, label: 'Tháng 4' },
  { value: 5, label: 'Tháng 5' },
  { value: 6, label: 'Tháng 6' },
  { value: 7, label: 'Tháng 7' },
  { value: 8, label: 'Tháng 8' },
  { value: 9, label: 'Tháng 9' },
  { value: 10, label: 'Tháng 10' },
  { value: 11, label: 'Tháng 11' },
  { value: 12, label: 'Tháng 12' },
]

const QUARTER_OPTIONS = [
  { value: 1, label: 'Quý 1 (Jan – Mar)' },
  { value: 2, label: 'Quý 2 (Apr – Jun)' },
  { value: 3, label: 'Quý 3 (Jul – Sep)' },
  { value: 4, label: 'Quý 4 (Oct – Dec)' },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Mọi phương thức' },
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank_card', label: 'Chuyển khoản / Thẻ' },
  { value: 'ewallet', label: 'Ví điện tử' },
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function getWeekRange(year: number, week: number): { from: string; to: string } {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dow - 1))
  const weekStart = new Date(monday)
  weekStart.setUTCDate(monday.getUTCDate() + (week - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const today = fmt(new Date())
  return { from: fmt(weekStart), to: fmt(weekEnd) > today ? today : fmt(weekEnd) }
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(year, month, 0).getDate()
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` }
}

function getQuarterRange(year: number, quarter: number): { from: string; to: string } {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = quarter * 3
  const lastDay = new Date(year, endMonth, 0).getDate()
  return {
    from: `${year}-${pad(startMonth)}-01`,
    to: `${year}-${pad(endMonth)}-${pad(lastDay)}`,
  }
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

export default function RevenuePage() {
  const [mode, setMode] = useState<FilterMode>('month')
  const [year, setYear] = useState(CURRENT_YEAR)
  const [week, setWeek] = useState(CURRENT_WEEK)
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [quarter, setQuarter] = useState(CURRENT_QUARTER)
  const [customFrom, setCustomFrom] = useState(
    () => `${_now.getFullYear()}-${pad(_now.getMonth() + 1)}-01`,
  )
  const [customTo, setCustomTo] = useState(todayInput)
  const [paymentMethod, setPaymentMethod] = useState('')
  const granularity: Granularity = 'day'

  const [data, setData] = useState<RevenueBreakdown[]>([])
  const [prevTotal, setPrevTotal] = useState<string>('0')
  const [renewals, setRenewals] = useState<RenewalData | null>(null)
  const [newMembers, setNewMembers] = useState(0)
  const [topPackages, setTopPackages] = useState<TopPackageItem[]>([])
  const [showAllPackages, setShowAllPackages] = useState(false)
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
  const uniqueDays = useMemo(() => new Set(data.map((r) => r.date)).size, [data])

  const load = useCallback(
    (from: string, to: string) => {
      setLoading(true)
      setError(null)
      const prevRange = getPreviousRange(from, to)
      const method = paymentMethod || undefined
      Promise.all([
        reportService.getRevenue(from, to, method),
        reportService.getRevenue(prevRange.from, prevRange.to, method),
        reportService.getRenewals(from, to),
        reportService.getMembers(from, to),
        reportService.getTopPackages(from, to),
      ])
        .then(([current, prev, renewalResult, memberResult, topPkgResult]) => {
          setData(current.breakdown)
          setPrevTotal(prev.total)
          setRenewals(renewalResult)
          setNewMembers(memberResult.total)
          setTopPackages(topPkgResult)
          setShowAllPackages(false)
        })
        .catch((err) => setError(getApiError(err, 'Không tải được báo cáo doanh thu.')))
        .finally(() => setLoading(false))
    },
    [paymentMethod],
  )

  const handleLoad = useCallback(() => {
    if (mode === 'week') {
      const r = getWeekRange(year, week)
      load(r.from, r.to)
    } else if (mode === 'month') {
      const r = getMonthRange(year, month)
      load(r.from, r.to)
    } else if (mode === 'quarter') {
      const r = getQuarterRange(year, quarter)
      load(r.from, r.to)
    } else {
      load(customFrom, customTo)
    }
  }, [mode, year, week, month, quarter, customFrom, customTo, load])

  useEffect(() => {
    if (mode !== 'custom') handleLoad()
  }, [mode, year, week, month, quarter, handleLoad])

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
        {/* Segmented control + payment method */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
            {(['week', 'month', 'quarter', 'custom'] as FilterMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  if (m === 'custom') setData([])
                  setMode(m)
                }}
                className={`rogym-filter-chip rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  mode === m ? 'is-active' : ''
                }`}
              >
                {m === 'week'
                  ? 'Tuần'
                  : m === 'month'
                    ? 'Tháng'
                    : m === 'quarter'
                      ? 'Quý'
                      : 'Tùy chỉnh'}
              </button>
            ))}
          </div>
          <OwnerSelect
            value={paymentMethod}
            onValueChange={setPaymentMethod}
            ariaLabel="Phương thức thanh toán"
          >
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </OwnerSelect>
        </div>

        {/* Dynamic inputs */}
        <div className="flex flex-wrap items-end gap-4">
          {(mode === 'week' || mode === 'month' || mode === 'quarter') && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium rogym-text-dim">Năm</label>
              <OwnerSelect
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
                ariaLabel="Năm"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </OwnerSelect>
            </div>
          )}

          {mode === 'week' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium rogym-text-dim">Tuần</label>
              <OwnerSelect
                value={String(week)}
                onValueChange={(v) => setWeek(Number(v))}
                ariaLabel="Tuần"
              >
                {WEEKS.map((w) => (
                  <option key={w} value={w}>
                    Tuần {w}
                  </option>
                ))}
              </OwnerSelect>
            </div>
          )}

          {mode === 'month' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium rogym-text-dim">Tháng</label>
              <OwnerSelect
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
                ariaLabel="Tháng"
              >
                {MONTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </OwnerSelect>
            </div>
          )}

          {mode === 'quarter' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium rogym-text-dim">Quý</label>
              <OwnerSelect
                value={String(quarter)}
                onValueChange={(v) => setQuarter(Number(v))}
                ariaLabel="Quý"
              >
                {QUARTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </OwnerSelect>
            </div>
          )}

          {mode === 'custom' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium rogym-text-dim">Từ ngày</label>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rogym-input"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium rogym-text-dim">Đến ngày</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={todayInput()}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rogym-input"
                />
              </div>
              <button
                className="rogym-btn rogym-btn--primary self-end"
                onClick={handleLoad}
                disabled={loading}
              >
                {loading && <LoaderCircle size={15} className="animate-spin" />}
                Xem báo cáo
              </button>
            </>
          )}
        </div>
      </div>

      {loading && data.length === 0 ? (
        <OwnerSkeleton rows={4} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={handleLoad} />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OwnerStatCard
              icon={<DollarSign size={18} />}
              label="Tổng doanh thu"
              value={formatVnd(total)}
              hint={`${uniqueDays} ngày có giao dịch`}
              accent
            />
            <OwnerStatCard
              icon={<UserPlus size={18} />}
              label="Hội viên mới"
              value={String(newMembers)}
              hint="Đăng ký trong kỳ"
              accent={false}
            />
            <OwnerStatCard
              icon={<RefreshCw size={18} />}
              label="Tỷ lệ gia hạn"
              value={renewals?.renewalRate != null ? `${renewals.renewalRate.toFixed(1)}%` : '—'}
              hint={
                renewals
                  ? `${renewals.renewed} gia hạn · ${renewals.churned} rời bỏ`
                  : 'Chưa có dữ liệu'
              }
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
              <h2 className="text-base font-bold text-white">Doanh thu theo thời gian</h2>
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

          {/* Top gói tập bán chạy */}
          {topPackages.length > 0 && (
            <div className="rogym-card rogym-card--compact p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-white">Top gói tập bán chạy</h2>
                {topPackages.length > 3 && (
                  <button
                    type="button"
                    className="text-xs rogym-text-dim hover:text-white transition-colors"
                    onClick={() => setShowAllPackages((prev) => !prev)}
                  >
                    {showAllPackages ? 'Thu gọn' : `Xem thêm (${topPackages.length - 3} gói)`}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {(showAllPackages ? topPackages : topPackages.slice(0, 3)).map((pkg, index) => {
                  const maxCount = topPackages[0].count
                  const barWidth = maxCount > 0 ? (pkg.count / maxCount) * 100 : 0
                  return (
                    <div key={pkg.packageId} className="flex items-center gap-4">
                      <span className="w-5 shrink-0 text-center text-sm font-bold rogym-text-dim">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-white">
                            {pkg.name}
                          </span>
                          <span className="shrink-0 text-xs rogym-text-dim">{pkg.count} lượt</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: OWNER_ACCENT,
                                opacity:
                                  index === 0
                                    ? 1
                                    : 0.5 + 0.15 * (1 - index / topPackages.length),
                              }}
                            />
                          </div>
                          <span className="shrink-0 text-xs rogym-text-secondary">
                            {pkg.durationDays} ngày · {formatVnd(Number(pkg.price))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </OwnerPage>
  )
}

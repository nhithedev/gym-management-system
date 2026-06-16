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
} from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatVnd } from '@/lib/currency'
import { todayInput, monthStart } from '@/lib/date'
import { OWNER_ACCENT } from '@/lib/owner-constants'
import {
  reportService,
  type RevenueBreakdown,
  type RenewalData,
  type TopPackageItem,
} from '@/services/report.service'
import {
  OwnerDateRangeFilter,
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerSelect,
  OwnerStatCard,
} from '@/components/OwnerUI'

type QuickFilter = 'today' | 'week' | 'month' | 'quarter' | 'custom'
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
  if (filter === 'quarter') {
    const q = Math.floor(today.getMonth() / 3)
    const qStart = new Date(today.getFullYear(), q * 3, 1)
    const qEnd = new Date(today.getFullYear(), q * 3 + 3, 0)
    return { from: fmt(qStart), to: fmt(qEnd < today ? qEnd : today) }
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
  { key: 'quarter', label: 'Quý này' },
  { key: 'custom', label: 'Tùy chỉnh' },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Mọi phương thức' },
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank_card', label: 'Chuyển khoản / Thẻ' },
  { value: 'ewallet', label: 'Ví điện tử' },
]


export default function RevenuePage() {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month')
  const [from, setFrom] = useState(() => monthStart())
  const [to, setTo] = useState(() => todayInput())
  const [appliedFrom, setAppliedFrom] = useState(() => monthStart())
  const [appliedTo, setAppliedTo] = useState(() => todayInput())
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

  const load = useCallback(async () => {
    if (!appliedFrom || !appliedTo) return
    setLoading(true)
    setError(null)
    try {
      const prevRange = getPreviousRange(appliedFrom, appliedTo)
      const method = paymentMethod || undefined
      const [current, prev, renewalResult, memberResult, topPkgResult] = await Promise.all([
        reportService.getRevenue(appliedFrom, appliedTo, method),
        reportService.getRevenue(prevRange.from, prevRange.to, method),
        reportService.getRenewals(appliedFrom, appliedTo),
        reportService.getMembers(appliedFrom, appliedTo),
        reportService.getTopPackages(appliedFrom, appliedTo),
      ])
      setData(current.breakdown)
      setPrevTotal(prev.total)
      setRenewals(renewalResult)
      setNewMembers(memberResult.total)
      setTopPackages(topPkgResult)
      setShowAllPackages(false)
    } catch (err) {
      setError(getApiError(err, 'Không tải được báo cáo doanh thu.'))
    } finally {
      setLoading(false)
    }
  }, [appliedFrom, appliedTo, paymentMethod])

  useEffect(() => {
    load()
  }, [load])

  function applyQuickFilter(f: QuickFilter) {
    setQuickFilter(f)
    if (f !== 'custom') {
      const range = getQuickRange(f)
      setFrom(range.from)
      setTo(range.to)
      setAppliedFrom(range.from)
      setAppliedTo(range.to)
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

        {quickFilter === 'custom' && (
          <OwnerDateRangeFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            onLoad={() => {
              setAppliedFrom(from)
              setAppliedTo(to)
            }}
            loading={loading}
          />
        )}
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
                    {showAllPackages
                      ? 'Thu gọn'
                      : `Xem thêm (${topPackages.length - 3} gói)`}
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
                          <span className="shrink-0 text-xs rogym-text-dim">
                            {pkg.count} lượt
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: OWNER_ACCENT,
                                opacity: index === 0 ? 1 : 0.5 + 0.15 * (1 - index / topPackages.length),
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

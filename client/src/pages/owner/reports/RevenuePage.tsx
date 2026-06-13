import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, LoaderCircle } from 'lucide-react'
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
import { getApiError } from '@/lib/api-error'
import { formatVnd } from '@/lib/currency'
import { reportService, type RevenueBreakdown } from '@/services/report.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
} from '@/components/OwnerUI'

const G = '#06c384'

function todayInput(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}
function monthStart(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number | string; name?: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a2d22] px-4 py-3 text-sm shadow-xl">
      <p className="text-xs rogym-text-dim">{label}</p>
      <p className="font-bold" style={{ color: G }}>
        {formatVnd(Number(payload[0]?.value))}
      </p>
    </div>
  )
}

export default function RevenuePage() {
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayInput)
  const [data, setData] = useState<RevenueBreakdown[]>([])
  const [total, setTotal] = useState<string>('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!from || !to) return
    setLoading(true)
    setError(null)
    reportService
      .getRevenue(from, to)
      .then((res) => {
        setData(res.breakdown)
        setTotal(res.total)
      })
      .catch((err) => setError(getApiError(err, 'Không tải được báo cáo.')))
      .finally(() => setLoading(false))
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const maxAmount = data.length > 0 ? Math.max(...data.map((d) => Number(d.amount))) : 1

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Báo cáo"
        title="Doanh thu"
        description="Tổng doanh thu theo khoảng thời gian"
        actions={
          <Link className="rogym-btn rogym-btn--outline-white" to="/owner/reports">
            <ArrowLeft size={16} /> Quay lại
          </Link>
        }
      />

      {/* Date range */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-5">
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
          {loading ? <LoaderCircle size={15} className="animate-spin" /> : <TrendingUp size={15} />}
          Tải báo cáo
        </button>
      </div>

      {loading && data.length === 0 ? (
        <OwnerSkeleton rows={4} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={load} />
      ) : data.length === 0 ? (
        <OwnerEmptyState
          title="Không có doanh thu trong khoảng này"
          description="Thử chọn khoảng thời gian khác."
        />
      ) : (
        <>
          {/* KPI */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rogym-card rogym-card--compact p-5">
              <div className="text-xs font-medium rogym-text-dim uppercase tracking-wide mb-2">
                Tổng doanh thu
              </div>
              <div className="text-2xl font-bold text-white" style={{ color: G }}>
                {formatVnd(Number(total))}
              </div>
              <div className="mt-1 text-xs rogym-text-dim">{data.length} ngày có giao dịch</div>
            </div>
            <div className="rogym-card rogym-card--compact p-5">
              <div className="text-xs font-medium rogym-text-dim uppercase tracking-wide mb-2">
                Trung bình / ngày
              </div>
              <div className="text-2xl font-bold text-white">
                {formatVnd(Math.round(Number(total) / data.length))}
              </div>
              <div className="mt-1 text-xs rogym-text-dim">
                {formatDateShort(from)} – {formatDateShort(to)}
              </div>
            </div>
            <div className="rogym-card rogym-card--compact p-5">
              <div className="text-xs font-medium rogym-text-dim uppercase tracking-wide mb-2">
                Ngày cao nhất
              </div>
              <div className="text-2xl font-bold text-white">
                {data.length > 0 ? formatVnd(Math.max(...data.map((d) => Number(d.amount)))) : '—'}
              </div>
              <div className="mt-1 text-xs rogym-text-dim">
                {(() => {
                  if (data.length === 0) return '—'
                  const maxRow = data.reduce((max, d) =>
                    Number(d.amount) > Number(max.amount) ? d : max
                  )
                  return formatDateShort(maxRow.date)
                })()}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-6 text-base font-bold text-white">Biểu đồ doanh thu</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
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
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={Number(entry.amount) === maxAmount ? G : `${G}66`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs rogym-text-dim">
                  <th className="px-5 py-3 font-medium">Ngày</th>
                  <th className="px-5 py-3 font-medium text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((row) => (
                  <tr key={row.date} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 rogym-text-secondary">
                      {new Date(row.date).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold" style={{ color: G }}>
                      {formatVnd(Number(row.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </OwnerPage>
  )
}

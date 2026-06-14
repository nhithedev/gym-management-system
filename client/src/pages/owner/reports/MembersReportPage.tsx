import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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
import { todayInput, monthStart } from '@/lib/date'
import { OWNER_ACCENT } from '@/lib/owner-constants'
import { reportService, type MemberBreakdown } from '@/services/report.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerDateRangeFilter,
} from '@/components/OwnerUI'

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
      <p className="font-bold rogym-text-green">{payload[0]?.value} hội viên</p>
    </div>
  )
}

export default function MembersReportPage() {
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayInput)
  const [data, setData] = useState<MemberBreakdown[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    reportService
      .getMembers(from, to)
      .then((res) => {
        setData(res.breakdown)
        setTotal(res.total)
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false))
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 1

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Báo cáo"
        title="Hội viên mới"
        description="Số lượng hội viên đăng ký mới theo khoảng thời gian"
        actions={
          <Link className="rogym-btn rogym-btn--outline-white" to="/owner/reports">
            <ArrowLeft size={16} /> Quay lại
          </Link>
        }
      />

      <OwnerDateRangeFilter
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onLoad={load}
        loading={loading}
      />

      {loading && data.length === 0 ? (
        <OwnerSkeleton rows={4} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={load} />
      ) : data.length === 0 ? (
        <OwnerEmptyState title="Không có hội viên mới trong khoảng này" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rogym-card rogym-card--compact p-5">
              <div className="text-xs font-medium rogym-text-dim uppercase tracking-wide mb-2">
                Tổng hội viên mới
              </div>
              <div className="text-3xl font-bold text-white">{total}</div>
              <div className="mt-1 text-xs rogym-text-dim">{data.length} ngày có đăng ký</div>
            </div>
            <div className="rogym-card rogym-card--compact p-5">
              <div className="text-xs font-medium rogym-text-dim uppercase tracking-wide mb-2">
                Trung bình / ngày
              </div>
              <div className="text-3xl font-bold text-white">{Math.round(total / data.length)}</div>
              <div className="mt-1 text-xs rogym-text-dim">
                {formatDateShort(from)} – {formatDateShort(to)}
              </div>
            </div>
          </div>

          <div className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-6 text-base font-bold text-white">Biểu đồ hội viên mới</h2>
            <ResponsiveContainer width="100%" height={260}>
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
                  tick={{ fill: '#bbcabf', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, maxCount * 1.15]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.count === maxCount ? OWNER_ACCENT : `${OWNER_ACCENT}66`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </OwnerPage>
  )
}

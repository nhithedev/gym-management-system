import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, LoaderCircle, PieChart } from 'lucide-react'
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getApiError } from '@/lib/api-error'
import { reportService, type RenewalData } from '@/services/report.service'
import { OwnerPage, OwnerPageHeader, OwnerSkeleton, OwnerErrorState, OwnerEmptyState, OwnerBadge } from '@/components/OwnerUI'

const G = '#06c384'
const RENEWED_COLOR = '#06c384'
const CHURNED_COLOR = '#ef4444'

function todayInput(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}
function monthStart(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value?: number | string; name?: string }>; }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a2d22] px-4 py-3 text-sm shadow-xl">
      <p className="text-xs text-[var(--rogym-text-dim)]">{payload[0].name}</p>
      <p className="font-bold text-white">{payload[0].value} hội viên</p>
    </div>
  )
}

export default function RenewalsReportPage() {
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayInput)
  const [data, setData] = useState<RenewalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    reportService.getRenewals(from, to)
      .then(setData)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [from, to])

  const pieData = data && (data.renewed > 0 || data.churned > 0)
    ? [
        { name: 'Đã gia hạn', value: data.renewed, fill: RENEWED_COLOR },
        { name: 'Không gia hạn', value: data.churned, fill: CHURNED_COLOR },
      ]
    : []

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Báo cáo"
        title="Tỷ lệ gia hạn"
        description="Tỷ lệ hội viên gia hạn gói tập sau khi hết hạn"
        actions={<Link className="rogym-btn rogym-btn--outline-white" to="/owner/reports"><ArrowLeft size={16} /> Quay lại</Link>}
      />

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--rogym-text-dim)]">Từ ngày</label>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="rogym-input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--rogym-text-dim)]">Đến ngày</label>
          <input type="date" value={to} min={from} max={todayInput()} onChange={(e) => setTo(e.target.value)} className="rogym-input" />
        </div>
        <button className="rogym-btn rogym-btn--primary" onClick={load} disabled={loading}>
          {loading ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />} Tải báo cáo
        </button>
      </div>

      {loading ? <OwnerSkeleton rows={4} />
        : error ? <OwnerErrorState message={error} onRetry={load} />
        : !data || (data.renewed === 0 && data.churned === 0) ? (
          <OwnerEmptyState title="Không có dữ liệu trong khoảng này" description="Không có hội viên nào hết hạn gói tập trong khoảng thời gian đã chọn." />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rogym-card rogym-card--compact p-5 text-center">
                <div className="text-xs font-medium text-[var(--rogym-text-dim)] uppercase tracking-wide mb-2">Đã gia hạn</div>
                <div className="text-3xl font-bold" style={{ color: RENEWED_COLOR }}>{data.renewed}</div>
                <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">hội viên</div>
              </div>
              <div className="rogym-card rogym-card--compact p-5 text-center">
                <div className="text-xs font-medium text-[var(--rogym-text-dim)] uppercase tracking-wide mb-2">Không gia hạn</div>
                <div className="text-3xl font-bold" style={{ color: CHURNED_COLOR }}>{data.churned}</div>
                <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">hội viên</div>
              </div>
              <div className="rogym-card rogym-card--compact p-5 text-center">
                <div className="text-xs font-medium text-[var(--rogym-text-dim)] uppercase tracking-wide mb-2">Tỷ lệ gia hạn</div>
                <div className="text-3xl font-bold text-white">
                  {data.renewalRate !== null ? `${Math.round(data.renewalRate * 100)}%` : '—'}
                </div>
                <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">
                  {data.renewed + data.churned} hết hạn trong kỳ
                </div>
              </div>
            </div>

            {pieData.length > 0 && (
              <div className="rogym-card rogym-card--compact p-6">
                <h2 className="mb-6 text-base font-bold text-white">Biểu đồ tỷ lệ gia hạn</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <RePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value) => <span className="text-sm text-[var(--rogym-text-secondary)]">{value}</span>}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
    </OwnerPage>
  )
}
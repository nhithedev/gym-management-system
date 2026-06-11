import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Users, LoaderCircle, BarChart2 } from 'lucide-react'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getApiError } from '@/lib/api-error'
import { reportService, type MemberBreakdown } from '@/services/report.service'
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
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}
function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a2d22] px-4 py-3 text-sm shadow-xl">
      <p className="text-xs text-[var(--rogym-text-dim)]">{label}</p>
      <p className="font-bold" style={{ color: G }}>{payload[0]?.value} hội viên</p>
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

  function load() {
    setLoading(true)
    setError(null)
    reportService.getMembers(from, to)
      .then((res) => { setData(res.breakdown); setTotal(res.total) })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [from, to])

  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 1

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Báo cáo"
        title="Hội viên mới"
        description="Số lượng hội viên đăng ký mới theo khoảng thời gian"
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
          {loading ? <LoaderCircle size={15} className="animate-spin" /> : <BarChart2 size={15} />} Tải báo cáo
        </button>
      </div>

      {loading && data.length === 0 ? <OwnerSkeleton rows={4} />
        : error ? <OwnerErrorState message={error} onRetry={load} />
        : data.length === 0 ? <OwnerEmptyState title="Không có hội viên mới trong khoảng này" />
        : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rogym-card rogym-card--compact p-5">
                <div className="text-xs font-medium text-[var(--rogym-text-dim)] uppercase tracking-wide mb-2">Tổng hội viên mới</div>
                <div className="text-3xl font-bold text-white">{total}</div>
                <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">{data.length} ngày có đăng ký</div>
              </div>
              <div className="rogym-card rogym-card--compact p-5">
                <div className="text-xs font-medium text-[var(--rogym-text-dim)] uppercase tracking-wide mb-2">Trung bình / ngày</div>
                <div className="text-3xl font-bold text-white">{Math.round(total / data.length)}</div>
                <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">{formatDateShort(from)} – {formatDateShort(to)}</div>
              </div>
            </div>

            <div className="rogym-card rogym-card--compact p-6">
              <h2 className="mb-6 text-base font-bold text-white">Biểu đồ hội viên mới</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fill: '#bbcabf', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#bbcabf', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, maxCount * 1.15]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {data.map((entry, i) => (
                      <Cell key={i} fill={entry.count === maxCount ? G : `${G}66`} />
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
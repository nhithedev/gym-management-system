import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Award, LoaderCircle } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { reportService, type StaffPerformanceItem } from '@/services/report.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerBadge,
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

function scoreColor(score: number | null): string {
  if (score === null) return '#6b7280'
  if (score <= 1.5) return '#22c55e'
  if (score <= 2.5) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(score: number | null): string {
  if (score === null) return '—'
  return score.toFixed(1)
}

export default function StaffPerformanceReportPage() {
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayInput)
  const [data, setData] = useState<StaffPerformanceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    reportService
      .getStaffPerformance(from, to)
      .then(setData)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false))
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const maxSessions = data.length > 0 ? Math.max(...data.map((d) => d.completedSessions)) : 0

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Báo cáo"
        title="Hiệu suất PT"
        description="Xếp hạng huấn luyện viên theo số buổi dạy hoàn thành và điểm feedback"
        actions={
          <Link className="rogym-btn rogym-btn--outline-white" to="/owner/reports">
            <ArrowLeft size={16} /> Quay lại
          </Link>
        }
      />

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
          {loading ? <LoaderCircle size={15} className="animate-spin" /> : <Award size={15} />} Tải
          báo cáo
        </button>
      </div>

      {loading && data.length === 0 ? (
        <OwnerSkeleton rows={6} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={load} />
      ) : data.length === 0 ? (
        <OwnerEmptyState
          title="Không có dữ liệu"
          description="Không có huấn luyện viên nào trong khoảng thời gian này."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs rogym-text-dim">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Mã NV</th>
                  <th className="px-5 py-3 font-medium">Họ tên</th>
                  <th className="px-5 py-3 font-medium text-right">Buổi dạy</th>
                  <th className="px-5 py-3 font-medium text-right">Điểm feedback TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((pt, i) => (
                  <tr key={pt.staffId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      {i === 0 ? (
                        <Award size={16} color={G} />
                      ) : (
                        <span className="text-xs rogym-text-dim">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs rogym-text-dim">{pt.staffCode}</td>
                    <td className="px-5 py-4 font-semibold text-white">{pt.fullName}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="h-1.5 flex-1 max-w-[120px] overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width:
                                maxSessions > 0
                                  ? `${(pt.completedSessions / maxSessions) * 100}%`
                                  : '0%',
                              background: i === 0 ? G : `${G}88`,
                            }}
                          />
                        </div>
                        <span className="w-10 text-right font-semibold text-white">
                          {pt.completedSessions}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <OwnerBadge
                        label={scoreLabel(pt.avgFeedbackSeverityScore)}
                        color={scoreColor(pt.avgFeedbackSeverityScore)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-6 rounded-xl border border-white/5 bg-white/[0.025] p-4 text-xs rogym-text-dim">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: '#22c55e' }} /> 1.0–1.5:
              Tốt
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: '#f59e0b' }} /> 1.5–2.5:
              Trung bình
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: '#ef4444' }} /> 2.5–3.0:
              Cần cải thiện
            </span>
          </div>
        </>
      )}
    </OwnerPage>
  )
}

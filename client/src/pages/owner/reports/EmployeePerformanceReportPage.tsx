import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { todayInput, monthStart } from '@/lib/date'
import { reportService, type EmployeePerformanceItem } from '@/services/report.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerBadge,
  OwnerDateRangeFilter,
} from '@/components/OwnerUI'
import { scoreColor, scoreLabel } from '@/lib/score-utils'

export default function EmployeePerformanceReportPage() {
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayInput)
  const [data, setData] = useState<EmployeePerformanceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    reportService
      .getEmployeePerformance(from, to)
      .then(setData)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false))
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const maxShifts = data.length > 0 ? Math.max(...data.map((d) => d.shiftsWorked)) : 0

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Báo cáo"
        title="Hiệu suất nhân viên"
        description="Số ca làm việc và điểm feedback của nhân viên trong khoảng thời gian"
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
        <OwnerSkeleton rows={6} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={load} />
      ) : data.length === 0 ? (
        <OwnerEmptyState
          title="Không có dữ liệu"
          description="Không có nhân viên nào trong khoảng thời gian này."
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
                  <th className="px-5 py-3 font-medium">Vị trí</th>
                  <th className="px-5 py-3 font-medium text-right">Ca làm việc</th>
                  <th className="px-5 py-3 font-medium text-right">Điểm feedback TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((emp, i) => (
                  <tr key={emp.staffId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <span className="text-xs rogym-text-dim">{i + 1}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs rogym-text-dim">{emp.staffCode}</td>
                    <td className="px-5 py-4 font-semibold text-white">{emp.fullName}</td>
                    <td className="px-5 py-4 text-xs rogym-text-secondary capitalize">
                      {emp.position}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="h-1.5 flex-1 max-w-[120px] overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width:
                                maxShifts > 0 ? `${(emp.shiftsWorked / maxShifts) * 100}%` : '0%',
                              background:
                                i === 0
                                  ? 'var(--rogym-green)'
                                  : 'color-mix(in srgb, var(--rogym-green) 53%, transparent)',
                            }}
                          />
                        </div>
                        <span className="w-10 text-right font-semibold text-white">
                          {emp.shiftsWorked}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <OwnerBadge
                        label={scoreLabel(emp.avgFeedbackSeverityScore)}
                        color={scoreColor(emp.avgFeedbackSeverityScore)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-6 rounded-xl border border-white/5 bg-white/[0.025] p-4 text-xs rogym-text-dim">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" /> 1.0–1.5: Tốt
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> 1.5–2.5: Trung bình
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" /> 2.5–3.0: Cần cải thiện
            </span>
          </div>
        </>
      )}
    </OwnerPage>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { LoaderCircle } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { todayInput } from '@/lib/date'
import { reportService, type EmployeePerformanceItem } from '@/services/report.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerBadge,
  OwnerSelect,
} from '@/components/OwnerUI'
import { scoreColor, scoreLabel } from '@/lib/score-utils'

type FilterMode = 'month' | 'quarter' | 'custom'
type MonthPeriod = { year: number; month: number }
type QuarterPeriod = { year: number; quarter: number }

const _now = new Date()
const CURRENT_YEAR = _now.getFullYear()
const PREVIOUS_MONTH_PERIOD = getPreviousMonthPeriod(_now)
const PREVIOUS_QUARTER_PERIOD = getPreviousQuarterPeriod(_now)
const FIRST_REPORT_YEAR = Math.min(
  2020,
  PREVIOUS_MONTH_PERIOD.year,
  PREVIOUS_QUARTER_PERIOD.year,
)
const LAST_REPORT_YEAR = Math.max(
  CURRENT_YEAR,
  PREVIOUS_MONTH_PERIOD.year,
  PREVIOUS_QUARTER_PERIOD.year,
)
const YEARS = Array.from(
  { length: LAST_REPORT_YEAR - FIRST_REPORT_YEAR + 1 },
  (_, i) => FIRST_REPORT_YEAR + i,
)

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

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function getPreviousMonthPeriod(reference: Date): MonthPeriod {
  const currentMonth = reference.getMonth() + 1
  if (currentMonth === 1) {
    return { year: reference.getFullYear() - 1, month: 12 }
  }
  return { year: reference.getFullYear(), month: currentMonth - 1 }
}

function getPreviousQuarterPeriod(reference: Date): QuarterPeriod {
  const currentQuarter = Math.ceil((reference.getMonth() + 1) / 3)
  if (currentQuarter === 1) {
    return { year: reference.getFullYear() - 1, quarter: 4 }
  }
  return { year: reference.getFullYear(), quarter: currentQuarter - 1 }
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  }
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

export default function EmployeePerformanceReportPage() {
  const [mode, setMode] = useState<FilterMode>('month')
  const [monthYear, setMonthYear] = useState(PREVIOUS_MONTH_PERIOD.year)
  const [month, setMonth] = useState(PREVIOUS_MONTH_PERIOD.month)
  const [quarterYear, setQuarterYear] = useState(PREVIOUS_QUARTER_PERIOD.year)
  const [quarter, setQuarter] = useState(PREVIOUS_QUARTER_PERIOD.quarter)
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
  })
  const [customTo, setCustomTo] = useState(todayInput)
  const [data, setData] = useState<EmployeePerformanceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((from: string, to: string) => {
    setLoading(true)
    setError(null)
    reportService
      .getEmployeePerformance(from, to)
      .then(setData)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false))
  }, [])

  const handleLoad = useCallback(() => {
    if (mode === 'month') {
      const r = getMonthRange(monthYear, month)
      load(r.from, r.to)
    } else if (mode === 'quarter') {
      const r = getQuarterRange(quarterYear, quarter)
      load(r.from, r.to)
    } else {
      load(customFrom, customTo)
    }
  }, [mode, monthYear, month, quarterYear, quarter, customFrom, customTo, load])

  useEffect(() => {
    if (mode !== 'custom') handleLoad()
  }, [mode, monthYear, month, quarterYear, quarter, handleLoad])

  const selectedYear = mode === 'quarter' ? quarterYear : monthYear
  const handleYearChange = (value: string) => {
    const nextYear = Number(value)
    if (mode === 'quarter') {
      setQuarterYear(nextYear)
    } else {
      setMonthYear(nextYear)
    }
  }

  const maxShifts = data.length > 0 ? Math.max(...data.map((d) => d.shiftsWorked)) : 0

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Báo cáo"
        title="Hiệu suất nhân viên"
        description="Số ca làm việc và điểm feedback của nhân viên trong khoảng thời gian"
      />

      {/* Filter */}
      <div className="rogym-card rogym-card--compact space-y-4 p-5">
        {/* Segmented control */}
        <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 w-fit">
          {(['month', 'quarter', 'custom'] as FilterMode[]).map((m) => (
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
              {m === 'month' ? 'Tháng' : m === 'quarter' ? 'Quý' : 'Tùy chỉnh'}
            </button>
          ))}
        </div>

        {/* Dynamic inputs */}
        <div className="flex flex-wrap items-end gap-4">
          {(mode === 'month' || mode === 'quarter') && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium rogym-text-dim">Năm</label>
                <OwnerSelect
                  value={String(selectedYear)}
                  onValueChange={handleYearChange}
                  ariaLabel="Năm"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </OwnerSelect>
              </div>

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
            </>
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
        <OwnerSkeleton rows={6} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={handleLoad} />
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

import { useEffect, useState } from 'react'
import { Filter } from 'lucide-react'
import reportService, {
  MembersReport,
  RenewalsReport,
  RevenueReport,
  StaffPerformanceItem,
} from '@/services/report.service'

type ReportTab = 'revenue' | 'members' | 'renewals' | 'pt'

const reportTabs: { id: ReportTab; label: string }[] = [
  { id: 'revenue', label: 'Doanh thu' },
  { id: 'members', label: 'Hội viên mới' },
  { id: 'renewals', label: 'Tỷ lệ gia hạn' },
  { id: 'pt', label: 'Hiệu suất PT' },
]

// Format số tiền VND
function formatVND(amount: string): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    parseFloat(amount),
  )
}

// Format tỷ lệ gia hạn
function formatRate(rate: number | null): string {
  return rate === null ? 'N/A' : `${Math.round(rate * 100)}%`
}

// Format điểm feedback trung bình
function formatScore(score: number | null): string {
  return score === null ? '—' : score.toFixed(2)
}

// Ngày đầu tháng hiện tại, format YYYY-MM-DD
function firstDayOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

// Hôm nay, format YYYY-MM-DD
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportTab>('revenue')
  const [fromDate, setFromDate] = useState(firstDayOfMonth)
  const [toDate, setToDate] = useState(today)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueReport | null>(null)
  const [membersData, setMembersData] = useState<MembersReport | null>(null)
  const [renewalsData, setRenewalsData] = useState<RenewalsReport | null>(null)
  const [ptData, setPtData] = useState<StaffPerformanceItem[] | null>(null)

  // Validate date range trước khi fetch
  const isValidRange = fromDate && toDate && fromDate <= toDate && toDate <= today()

  useEffect(() => {
    if (!isValidRange) return

    const params = { from: fromDate, to: toDate }
    setLoading(true)
    setError(null)

    const fetchReport = async () => {
      try {
        if (activeReport === 'revenue') {
          const res = await reportService.getRevenue(params)
          setRevenueData(res.data)
        } else if (activeReport === 'members') {
          const res = await reportService.getMembers(params)
          setMembersData(res.data)
        } else if (activeReport === 'renewals') {
          const res = await reportService.getRenewals(params)
          setRenewalsData(res.data)
        } else {
          const res = await reportService.getStaffPerformance(params)
          setPtData(res.data)
        }
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? 'Lỗi khi tải báo cáo')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [activeReport, fromDate, toDate, isValidRange])

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Báo cáo</p>
          <h1 className="mt-2 text-4xl font-semibold">Báo cáo thống kê chi tiết</h1>
          <p className="mt-3 max-w-2xl text-sm text-on-surface/75">
            Xem báo cáo doanh thu, hội viên, tỷ lệ gia hạn và hiệu suất PT theo khoảng thời gian.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(220px,320px)_1fr]">
        {/* Sidebar bộ lọc */}
        <aside className="space-y-4 rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-on-surface-variant">
            <Filter className="w-4 h-4" />
            Bộ lọc
          </div>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Khoảng thời gian</p>
              <div className="grid gap-2">
                <label className="block text-sm">Từ</label>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl border border-outline px-3 py-2 text-sm"
                />
                <label className="block text-sm">Đến</label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={today()}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl border border-outline px-3 py-2 text-sm"
                />
              </div>
              {!isValidRange && fromDate && toDate && (
                <p className="mt-2 text-xs text-error">
                  {fromDate > toDate ? 'Ngày bắt đầu phải trước ngày kết thúc.' : 'Ngày kết thúc không được sau hôm nay.'}
                </p>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Loại báo cáo</p>
              <div className="grid gap-2">
                {reportTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveReport(tab.id)}
                    className={`rounded-2xl px-3 py-2 text-left text-sm transition ${
                      activeReport === tab.id
                        ? 'bg-primary text-white'
                        : 'bg-surface text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <section className="space-y-6">
          {/* Error banner */}
          {error && (
            <div className="rounded-2xl bg-error-container px-5 py-4 text-sm text-on-error-container">
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-1/3 rounded bg-outline-variant/40" />
                <div className="h-8 w-1/2 rounded bg-outline-variant/40" />
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-3xl bg-outline-variant/30" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Revenue tab */}
          {!loading && activeReport === 'revenue' && (
            <>
              <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Doanh thu</p>
                <h2 className="mt-2 text-3xl font-semibold">Báo cáo doanh thu</h2>
                <p className="mt-2 text-sm text-on-surface/70">
                  Từ {fromDate} đến {toDate}
                </p>
                {revenueData && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-outline-variant/70 bg-surface p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-primary">Tổng doanh thu</p>
                      <p className="mt-4 text-3xl font-semibold text-on-surface">
                        {formatVND(revenueData.total)}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-outline-variant/70 bg-surface p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-primary">Số ngày có giao dịch</p>
                      <p className="mt-4 text-3xl font-semibold text-on-surface">
                        {revenueData.breakdown.length}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {revenueData && revenueData.breakdown.length > 0 && (
                <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
                  <h3 className="text-xl font-semibold">Chi tiết theo ngày</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-surface text-left text-sm uppercase tracking-[0.2em] text-on-surface-variant">
                          <th className="px-4 py-3">Ngày</th>
                          <th className="px-4 py-3 text-right">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueData.breakdown.map((row) => (
                          <tr key={row.date} className="border-t border-outline-variant hover:bg-surface">
                            <td className="px-4 py-3 text-sm">{row.date}</td>
                            <td className="px-4 py-3 text-right text-sm font-medium">
                              {formatVND(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {revenueData && revenueData.breakdown.length === 0 && (
                <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-10 text-center text-sm text-on-surface/60 shadow-sm">
                  Không có doanh thu trong khoảng thời gian này.
                </div>
              )}
            </>
          )}

          {/* Members tab */}
          {!loading && activeReport === 'members' && (
            <>
              <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Hội viên</p>
                <h2 className="mt-2 text-3xl font-semibold">Hội viên mới</h2>
                <p className="mt-2 text-sm text-on-surface/70">
                  Từ {fromDate} đến {toDate}
                </p>
                {membersData && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-outline-variant/70 bg-surface p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-primary">Tổng hội viên mới</p>
                      <p className="mt-4 text-3xl font-semibold text-on-surface">{membersData.total}</p>
                    </div>
                    <div className="rounded-3xl border border-outline-variant/70 bg-surface p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-primary">Số ngày có đăng ký</p>
                      <p className="mt-4 text-3xl font-semibold text-on-surface">
                        {membersData.breakdown.length}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {membersData && membersData.breakdown.length > 0 && (
                <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
                  <h3 className="text-xl font-semibold">Chi tiết theo ngày</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-surface text-left text-sm uppercase tracking-[0.2em] text-on-surface-variant">
                          <th className="px-4 py-3">Ngày</th>
                          <th className="px-4 py-3 text-right">Hội viên mới</th>
                        </tr>
                      </thead>
                      <tbody>
                        {membersData.breakdown.map((row) => (
                          <tr key={row.date} className="border-t border-outline-variant hover:bg-surface">
                            <td className="px-4 py-3 text-sm">{row.date}</td>
                            <td className="px-4 py-3 text-right text-sm font-medium">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {membersData && membersData.breakdown.length === 0 && (
                <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-10 text-center text-sm text-on-surface/60 shadow-sm">
                  Không có hội viên mới trong khoảng thời gian này.
                </div>
              )}
            </>
          )}

          {/* Renewals tab */}
          {!loading && activeReport === 'renewals' && (
            <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Gia hạn</p>
              <h2 className="mt-2 text-3xl font-semibold">Tỷ lệ gia hạn</h2>
              <p className="mt-2 text-sm text-on-surface/70">
                Từ {fromDate} đến {toDate}
              </p>
              {renewalsData && (
                <>
                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-3xl border border-outline-variant/70 bg-surface p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-primary">Đã gia hạn</p>
                      <p className="mt-4 text-3xl font-semibold text-on-surface">
                        {renewalsData.renewed}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-outline-variant/70 bg-surface p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-primary">Rời bỏ</p>
                      <p className="mt-4 text-3xl font-semibold text-on-surface">
                        {renewalsData.churned}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-outline-variant/70 bg-surface p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-primary">Tỷ lệ gia hạn</p>
                      <p className="mt-4 text-3xl font-semibold text-on-surface">
                        {formatRate(renewalsData.renewalRate)}
                      </p>
                    </div>
                  </div>
                  {renewalsData.renewalRate === null && renewalsData.renewed === 0 && (
                    <p className="mt-4 text-sm text-on-surface/60">
                      Không có subscription hết hạn trong khoảng thời gian này.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* PT Performance tab */}
          {!loading && activeReport === 'pt' && (
            <>
              <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Nhân sự</p>
                <h2 className="mt-2 text-3xl font-semibold">Hiệu suất PT</h2>
                <p className="mt-2 text-sm text-on-surface/70">
                  Từ {fromDate} đến {toDate}
                </p>
              </div>

              {ptData && ptData.length > 0 && (
                <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-surface text-left text-sm uppercase tracking-[0.2em] text-on-surface-variant">
                          <th className="px-4 py-3">Họ tên</th>
                          <th className="px-4 py-3">Mã nhân viên</th>
                          <th className="px-4 py-3 text-right">Sessions hoàn thành</th>
                          <th className="px-4 py-3 text-right">Điểm phản hồi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ptData.map((row) => (
                          <tr key={row.staffId} className="border-t border-outline-variant hover:bg-surface">
                            <td className="px-4 py-3 text-sm font-medium">{row.fullName}</td>
                            <td className="px-4 py-3 text-sm text-on-surface/70">{row.staffCode}</td>
                            <td className="px-4 py-3 text-right text-sm">{row.completedSessions}</td>
                            <td className="px-4 py-3 text-right text-sm">
                              {formatScore(row.avgFeedbackSeverityScore)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {ptData && ptData.length === 0 && (
                <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-10 text-center text-sm text-on-surface/60 shadow-sm">
                  Không có dữ liệu PT trong khoảng thời gian này.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

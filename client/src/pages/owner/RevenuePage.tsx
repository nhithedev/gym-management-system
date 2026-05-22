import React, { useMemo, useState } from 'react'
import { Download, Filter } from 'lucide-react'

const periods = ['Ngày', 'Tháng', 'Quý', 'Năm']

export default function RevenuePage() {
  const [period, setPeriod] = useState('Tháng')
  const [fromDate, setFromDate] = useState('2024-05-01')
  const [toDate, setToDate] = useState('2024-05-31')

  const stats = useMemo(
    () => [
      { label: 'Tổng doanh thu', value: '1.8B' },
      { label: 'Doanh thu gói tập', value: '1.2B' },
      { label: 'Doanh thu PT', value: '450M' },
      { label: 'Doanh thu phụ trợ', value: '180M' },
    ],
    []
  )

  const channelBreakdown = useMemo(
    () => [
      { channel: 'Gói tập', amount: '1.2B', percentage: '67%' },
      { channel: 'PT', amount: '450M', percentage: '25%' },
      { channel: 'Bán lẻ', amount: '80M', percentage: '4%' },
      { channel: 'Dịch vụ khác', amount: '50M', percentage: '4%' },
    ],
    []
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Doanh thu</p>
          <h1 className="mt-2 text-4xl font-semibold">Báo cáo doanh thu</h1>
          <p className="mt-3 max-w-2xl text-sm text-on-surface/75">
            Giao diện riêng cho quản lý doanh thu, lọc theo thời gian và xuất báo cáo tài chính.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90">
          <Download className="w-4 h-4" />
          Xuất PDF/Excel
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(220px,320px)_1fr]">
        <aside className="space-y-4 rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-on-surface-variant">
            <Filter className="w-4 h-4" />
            Bộ lọc doanh thu
          </div>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Khoảng thời gian</p>
              <div className="grid gap-2">
                <label className="block text-sm">Từ</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-xl border border-outline px-3 py-2" />
                <label className="block text-sm">Đến</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-xl border border-outline px-3 py-2" />
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Theo</p>
              <div className="grid gap-2">
                {periods.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPeriod(item)}
                    className={`rounded-2xl px-3 py-2 text-left text-sm transition ${period === item ? 'bg-primary text-white' : 'bg-surface text-on-surface hover:bg-surface-container-high'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Doanh thu</p>
                <h2 className="mt-2 text-3xl font-semibold">Tổng quan doanh thu</h2>
                <p className="mt-2 text-sm text-on-surface/70">Lọc theo {period.toLowerCase()} từ {fromDate} đến {toDate}.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <div key={item.label} className="rounded-3xl border border-outline-variant/70 bg-surface p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-primary">{item.label}</p>
                  <p className="mt-4 text-3xl font-semibold text-on-surface">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold">Phân tích nguồn doanh thu</h3>
                <p className="mt-2 text-sm text-on-surface/70">Xem chi tiết tỷ trọng từng kênh và khả năng tăng trưởng trong kỳ.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {channelBreakdown.map((item) => (
                <div key={item.channel} className="rounded-3xl border border-outline-variant/70 bg-surface p-5">
                  <p className="text-sm font-medium text-on-surface-variant">{item.channel}</p>
                  <p className="mt-3 text-2xl font-semibold text-on-surface">{item.amount}</p>
                  <p className="mt-2 text-sm text-on-surface/70">Tỷ trọng {item.percentage}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold">Chi tiết doanh thu theo kênh</h3>
                <p className="mt-2 text-sm text-on-surface/70">Bảng dữ liệu mẫu để kết nối backend sau này.</p>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface p-3 text-left text-sm uppercase tracking-[0.2em] text-on-surface-variant">
                    <th className="px-4 py-3">Kênh</th>
                    <th className="px-4 py-3">Doanh thu</th>
                    <th className="px-4 py-3">Số lượng đơn</th>
                    <th className="px-4 py-3">Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody>
                  {channelBreakdown.map((item) => (
                    <tr key={item.channel} className="border-t border-outline-variant hover:bg-surface-container-high">
                      <td className="px-4 py-3 text-sm">{item.channel}</td>
                      <td className="px-4 py-3 text-sm">{item.amount}</td>
                      <td className="px-4 py-3 text-sm">{item.channel === 'Gói tập' ? '210' : item.channel === 'PT' ? '78' : item.channel === 'Bán lẻ' ? '34' : '22'}</td>
                      <td className="px-4 py-3 text-sm">{item.percentage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { Download, Filter } from 'lucide-react'

const reportTypes = [
  { id: 'revenue', label: 'Revenue Report' },
  { id: 'member', label: 'Member Report' },
  { id: 'pt', label: 'PT Report' },
  { id: 'equipment', label: 'Equipment Report' },
]

const periods = ['Ngày', 'Tháng', 'Quý', 'Năm']

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('revenue')
  const [period, setPeriod] = useState('Tháng')
  const [fromDate, setFromDate] = useState('2024-05-01')
  const [toDate, setToDate] = useState('2024-05-31')

  const reportContent = useMemo(() => {
    switch (activeReport) {
      case 'revenue':
        return {
          title: 'Báo cáo doanh thu',
          items: [
            { label: 'Doanh thu theo thời gian', value: '1.8B' },
            { label: 'Doanh thu gói tập', value: '1.2B' },
            { label: 'Doanh thu PT', value: '450M' },
          ],
          details: [
            { label: 'Mức tăng/giảm', value: '+12%' },
            { label: 'Doanh thu so sánh kỳ trước', value: '1.6B' },
            { label: 'Doanh thu trung bình/ngày', value: '60M' },
          ],
          table: [
            { name: 'Gói tập', value: '1.2B', notes: 'Chiếm 67%' },
            { name: 'PT', value: '450M', notes: 'Chiếm 25%' },
            { name: 'Thiết bị', value: '80M', notes: 'Chiếm 5%' },
          ],
        }
      case 'member':
        return {
          title: 'Báo cáo hội viên',
          items: [
            { label: 'Hội viên mới', value: '42' },
            { label: 'Gia hạn', value: '87' },
            { label: 'Inactive', value: '13' },
          ],
          details: [
            { label: 'Tỷ lệ giữ chân', value: '92%' },
            { label: 'Số hội viên đang hoạt động', value: '590' },
            { label: 'Số hội viên chờ gia hạn', value: '34' },
          ],
          table: [
            { name: 'Hội viên mới', value: '42', notes: 'Tăng 5% so với tháng trước' },
            { name: 'Gia hạn', value: '87', notes: 'Tỷ lệ gia hạn ổn định' },
            { name: 'Inactive', value: '13', notes: 'Cần chiến dịch kích hoạt' },
          ],
        }
      case 'pt':
        return {
          title: 'Báo cáo PT',
          items: [
            { label: 'Số session PT', value: '126' },
            { label: 'Hiệu suất PT', value: '85%' },
            { label: 'Đánh giá PT', value: '4.7/5' },
          ],
          details: [
            { label: 'Số PT hoạt động', value: '14' },
            { label: 'Tỷ lệ đặt lịch lại', value: '8%' },
            { label: 'Thu nhập PT trung bình', value: '32M' },
          ],
          table: [
            { name: 'Session PT', value: '126', notes: 'Thực hiện trong kỳ' },
            { name: 'PT đánh giá cao', value: '92%', notes: 'Tỷ lệ hài lòng' },
            { name: 'Phản hồi tiêu cực', value: '3', notes: 'Cần xử lý sớm' },
          ],
        }
      case 'equipment':
        return {
          title: 'Báo cáo thiết bị',
          items: [
            { label: 'Thiết bị hỏng', value: '8' },
            { label: 'Chi phí bảo trì', value: '65M' },
            { label: 'Số thiết bị sắp bảo trì', value: '12' },
          ],
          details: [
            { label: 'Thiết bị hoạt động', value: '120' },
            { label: 'Tỷ lệ hỏng', value: '6%' },
            { label: 'Chi phí dự kiến', value: '78M' },
          ],
          table: [
            { name: 'Máy chạy bộ', value: '03 hỏng', notes: 'Đang chờ sửa' },
            { name: 'Xe đạp', value: '02 hỏng', notes: 'Thay phụ tùng' },
            { name: 'Tạ', value: '03 hỏng', notes: 'Kiểm tra tình trạng' },
          ],
        }
      default:
        return { title: '', items: [], details: [], table: [] }
    }
  }, [activeReport])

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Báo cáo</p>
          <h1 className="mt-2 text-4xl font-semibold">Báo cáo thống kê chi tiết</h1>
          <p className="mt-3 max-w-2xl text-sm text-on-surface/75">
            Tách riêng giao diện báo cáo để hiển thị nhiều thông tin hơn, lọc theo thời gian và xuất file.
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
            Bộ lọc
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
            <div>
              <p className="mb-2 text-sm font-medium">Loại báo cáo</p>
              <div className="grid gap-2">
                {reportTypes.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setActiveReport(report.id)}
                    className={`rounded-2xl px-3 py-2 text-left text-sm transition ${activeReport === report.id ? 'bg-primary text-white' : 'bg-surface text-on-surface hover:bg-surface-container-high'}`}
                  >
                    {report.label}
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
                <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Báo cáo</p>
                <h2 className="mt-2 text-3xl font-semibold">{reportContent.title}</h2>
                <p className="mt-2 text-sm text-on-surface/70">Báo cáo được lọc theo {period.toLowerCase()} từ {fromDate} đến {toDate}.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {reportContent.items.map((item) => (
                <div key={item.label} className="rounded-3xl border border-outline-variant/70 bg-surface p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-primary">{item.label}</p>
                  <p className="mt-4 text-3xl font-semibold text-on-surface">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <h3 className="text-xl font-semibold">Thông tin chi tiết</h3>
                <p className="mt-2 text-sm text-on-surface/70">Các chỉ số phụ và bảng dữ liệu mẫu để backend có thể trả về chi tiết.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {reportContent.details.map((detail) => (
                  <div key={detail.label} className="rounded-3xl border border-outline-variant/70 bg-surface p-5">
                    <p className="text-xs uppercase tracking-[0.28em] text-primary">{detail.label}</p>
                    <p className="mt-4 text-2xl font-semibold text-on-surface">{detail.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold">Bảng dữ liệu chi tiết</h3>
                <p className="mt-2 text-sm text-on-surface/70">Mỗi loại báo cáo sẽ có từng dòng dữ liệu chi tiết để backend có thể kết nối.</p>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface p-3 text-left text-sm uppercase tracking-[0.2em] text-on-surface-variant">
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3">Giá trị</th>
                    <th className="px-4 py-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {reportContent.table.map((row) => (
                    <tr key={row.name} className="border-t border-outline-variant hover:bg-surface-container-high">
                      <td className="px-4 py-3 text-sm">{row.name}</td>
                      <td className="px-4 py-3 text-sm">{row.value}</td>
                      <td className="px-4 py-3 text-sm">{row.notes}</td>
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

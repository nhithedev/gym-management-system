import { useMemo, useState } from 'react'
import { Search, Plus, RefreshCcw } from 'lucide-react'

type Member = {
  id: string
  name: string
  phone: string
  packageStatus: string
  nextPayment: string
  lastVisit: string
}

const sampleMembers: Member[] = [
  { id: '1', name: 'Nguyễn Văn A', phone: '0912345678', packageStatus: 'Đang hoạt động', nextPayment: '2024-06-15', lastVisit: '2024-05-20' },
  { id: '2', name: 'Trần Thị B', phone: '0987654321', packageStatus: 'Sắp hết hạn', nextPayment: '2024-05-28', lastVisit: '2024-05-19' },
  { id: '3', name: 'Lê Văn C', phone: '0911223344', packageStatus: 'Đã hết hạn', nextPayment: '2024-05-12', lastVisit: '2024-05-10' },
]

export default function MembersPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const members = useMemo(
    () => sampleMembers.filter((member) => {
      const matchText = [member.name, member.phone, member.packageStatus].join(' ').toLowerCase()
      const term = search.trim().toLowerCase()
      if (term && !matchText.includes(term)) return false
      if (filter === 'all') return true
      return member.packageStatus === filter
    }),
    [search, filter]
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Quản lý hội viên</p>
          <h1 className="mt-2 text-3xl font-semibold">Danh sách hội viên</h1>
          <p className="mt-2 text-sm text-on-surface/70">Tìm kiếm, gia hạn gói và xem lịch sử thanh toán ngay tại quầy.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          Đăng ký hội viên mới
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4 rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-on-surface-variant">
              <Search className="w-4 h-4" />
              Tìm kiếm
            </div>
            <button className="inline-flex items-center gap-2 rounded-full border border-outline px-3 py-2 text-sm hover:bg-surface-container-high">
              <RefreshCcw className="w-4 h-4" />
              Làm mới
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, số điện thoại hoặc trạng thái"
            className="w-full rounded-2xl border border-outline px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="grid gap-2 sm:grid-cols-3">
            {['all', 'Đang hoạt động', 'Sắp hết hạn', 'Đã hết hạn'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${filter === status ? 'bg-primary text-white' : 'bg-surface text-on-surface hover:bg-surface-container-high'}`}
              >
                {status === 'all' ? 'Tất cả' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-on-surface-variant">Thống kê nhanh</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-surface p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-primary">Thành viên đang hoạt động</p>
              <p className="mt-3 text-3xl font-semibold">1,240</p>
            </div>
            <div className="rounded-3xl bg-surface p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-primary">Thanh toán hôm nay</p>
              <p className="mt-3 text-3xl font-semibold">18</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-sm uppercase tracking-[0.2em] text-on-surface-variant">
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Số điện thoại</th>
              <th className="px-4 py-3">Trạng thái gói</th>
              <th className="px-4 py-3">Thanh toán tiếp theo</th>
              <th className="px-4 py-3">Lần đến gần nhất</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="rounded-3xl bg-surface shadow-sm">
                <td className="px-4 py-4 text-sm font-medium">{member.name}</td>
                <td className="px-4 py-4 text-sm">{member.phone}</td>
                <td className="px-4 py-4 text-sm">{member.packageStatus}</td>
                <td className="px-4 py-4 text-sm">{member.nextPayment}</td>
                <td className="px-4 py-4 text-sm">{member.lastVisit}</td>
                <td className="px-4 py-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-full border border-primary px-3 py-2 text-xs text-primary">Gia hạn gói</button>
                    <button className="rounded-full border border-outline px-3 py-2 text-xs">Lịch sử</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

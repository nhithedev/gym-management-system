import { useMemo, useState } from 'react'
import { Plus, Wrench, CheckCircle, AlertTriangle } from 'lucide-react'

type Equipment = {
  id: string
  code: string
  name: string
  status: 'Hoạt động' | 'Hỏng' | 'Đang sửa' | 'Ngừng hoạt động'
  purchaseDate: string
  location: string
}

const sampleEquipment: Equipment[] = [
  { id: '1', code: 'EQ-01', name: 'Máy chạy bộ T-300', status: 'Đang sửa', purchaseDate: '2022-08-12', location: 'Cardio Area' },
  { id: '2', code: 'EQ-02', name: 'Xe đạp cố định X-5', status: 'Hoạt động', purchaseDate: '2023-01-05', location: 'Cardio Area' },
  { id: '3', code: 'EQ-03', name: 'Ghế tập ngực', status: 'Hỏng', purchaseDate: '2021-11-20', location: 'Strength Zone' },
]

const statusClass: Record<Equipment['status'], string> = {
  'Hoạt động': 'bg-emerald-100 text-emerald-700',
  'Hỏng': 'bg-error/10 text-error',
  'Đang sửa': 'bg-amber-100 text-amber-700',
  'Ngừng hoạt động': 'bg-slate-100 text-slate-700',
}

export default function EquipmentPage() {
  const [selectedId, setSelectedId] = useState(sampleEquipment[0]?.id)
  const [search, setSearch] = useState('')
  const equipment = useMemo(
    () => sampleEquipment.filter((item) => [item.code, item.name, item.location, item.status].join(' ').toLowerCase().includes(search.toLowerCase())),
    [search]
  )
  const selectedItem = equipment.find((item) => item.id === selectedId) ?? equipment[0]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Quản lý thiết bị</p>
          <h1 className="mt-2 text-3xl font-semibold">Danh sách thiết bị</h1>
          <p className="mt-2 text-sm text-on-surface/70">Thêm thiết bị, cập nhật trạng thái và theo dõi lịch sử bảo trì.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          Thêm thiết bị
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-on-surface-variant">Bộ lọc thiết bị</div>
            <div className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-sm text-on-surface-variant">
              <Wrench className="w-4 h-4" /> {equipment.length} mục
            </div>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã, tên, vị trí, trạng thái"
            className="mt-4 w-full rounded-2xl border border-outline px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-sm uppercase tracking-[0.2em] text-on-surface-variant">
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Tên thiết bị</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Vị trí</th>
                  <th className="px-4 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => (
                  <tr key={item.id} className={`rounded-3xl bg-surface shadow-sm ${selectedId === item.id ? 'border border-primary/40 bg-primary/5' : ''}`}>
                    <td className="px-4 py-4 text-sm font-medium">{item.code}</td>
                    <td className="px-4 py-4 text-sm">{item.name}</td>
                    <td className="px-4 py-4 text-sm"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[item.status]}`}>{item.status}</span></td>
                    <td className="px-4 py-4 text-sm">{item.location}</td>
                    <td className="px-4 py-4 text-sm">
                      <button onClick={() => setSelectedId(item.id)} className="rounded-full border border-outline px-3 py-2 text-xs hover:bg-surface-container-high">Chi tiết</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Chi tiết thiết bị</p>
              <h2 className="mt-2 text-2xl font-semibold">{selectedItem?.name}</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusClass[selectedItem?.status ?? 'Hoạt động']}`}>{selectedItem?.status}</span>
          </div>
          <div className="mt-6 space-y-4 text-sm text-on-surface-variant">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Mã thiết bị</p>
              <p className="mt-1 text-on-surface">{selectedItem?.code}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Vị trí</p>
              <p className="mt-1 text-on-surface">{selectedItem?.location}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Ngày nhập</p>
              <p className="mt-1 text-on-surface">{selectedItem?.purchaseDate}</p>
            </div>
            <div className="rounded-3xl bg-surface p-5">
              <p className="text-sm font-semibold">Lịch sử bảo trì</p>
              <ul className="mt-3 space-y-3 text-sm text-on-surface-variant">
                <li className="rounded-2xl bg-surface-container p-3">[2024-05-10] Báo hỏng, gửi kỹ thuật.</li>
                <li className="rounded-2xl bg-surface-container p-3">[2024-05-12] Kiểm tra xong, đặt lịch sửa.</li>
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"><CheckCircle className="w-4 h-4" /> Đánh dấu hoàn thành</button>
              <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline px-4 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high"><AlertTriangle className="w-4 h-4" /> Báo hỏng</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

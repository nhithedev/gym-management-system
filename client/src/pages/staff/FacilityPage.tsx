import React, { useMemo, useState } from 'react'
import { Plus, Edit3, Trash2 } from 'lucide-react'

type GymRoom = {
  id: string
  code: string
  name: string
  capacity: number
  status: string
  description: string
}

const sampleRooms: GymRoom[] = [
  { id: '1', code: 'R001', name: 'Full Body Zone', capacity: 28, status: 'Mở', description: 'Phòng đa năng cho các buổi tập nhóm và máy cardio.' },
  { id: '2', code: 'R002', name: 'Cardio Area', capacity: 20, status: 'Đóng', description: 'Khu cardio với máy chạy bộ và xe đạp.' },
  { id: '3', code: 'R003', name: 'Recovery Corner', capacity: 12, status: 'Mở', description: 'Khu phục hồi, giãn cơ và băng hồi phục.' },
]

export default function FacilityPage() {
  const [selectedId, setSelectedId] = useState(sampleRooms[0]?.id)
  const [search, setSearch] = useState('')
  const rooms = useMemo(
    () => sampleRooms.filter((room) => [room.code, room.name, room.status].join(' ').toLowerCase().includes(search.toLowerCase())),
    [search]
  )
  const selectedRoom = rooms.find((room) => room.id === selectedId) ?? rooms[0]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Quản lý phòng tập</p>
          <h1 className="mt-2 text-3xl font-semibold">Danh sách phòng</h1>
          <p className="mt-2 text-sm text-on-surface/70">Thêm, chỉnh sửa và quản lý trạng thái phòng tập cho từng khu vực.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          Thêm phòng tập
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.25em] text-on-surface-variant">
            Danh sách phòng
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã, tên, trạng thái"
              className="w-full rounded-2xl border border-outline px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary sm:max-w-md"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="rounded-2xl border border-outline px-4 py-3 text-sm hover:bg-surface-container-high">Mở</button>
              <button className="rounded-2xl border border-outline px-4 py-3 text-sm hover:bg-surface-container-high">Đóng</button>
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-sm uppercase tracking-[0.2em] text-on-surface-variant">
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Tên phòng</th>
                  <th className="px-4 py-3">Sức chứa</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className={`rounded-3xl bg-surface shadow-sm ${selectedId === room.id ? 'border border-primary/40 bg-primary/5' : ''}`}>
                    <td className="px-4 py-4 text-sm font-medium">{room.code}</td>
                    <td className="px-4 py-4 text-sm">{room.name}</td>
                    <td className="px-4 py-4 text-sm">{room.capacity}</td>
                    <td className="px-4 py-4 text-sm">{room.status}</td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelectedId(room.id)} className="rounded-full border border-outline px-3 py-2 text-xs">Chi tiết</button>
                        <button className="rounded-full border border-primary px-3 py-2 text-xs text-primary">Sửa</button>
                      </div>
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
              <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Chi tiết phòng</p>
              <h2 className="mt-2 text-2xl font-semibold">{selectedRoom?.name}</h2>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{selectedRoom?.status}</div>
          </div>
          <div className="mt-6 space-y-4 text-sm text-on-surface-variant">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Mã phòng</p>
              <p className="mt-1 text-on-surface">{selectedRoom?.code}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Sức chứa</p>
              <p className="mt-1 text-on-surface">{selectedRoom?.capacity} người</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Mô tả</p>
              <p className="mt-1 text-on-surface">{selectedRoom?.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline px-4 py-3 text-sm hover:bg-surface-container-high"><Edit3 className="w-4 h-4" /> Sửa phòng</button>
              <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-error px-4 py-3 text-sm text-error hover:bg-error/10"><Trash2 className="w-4 h-4" /> Xóa phòng</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

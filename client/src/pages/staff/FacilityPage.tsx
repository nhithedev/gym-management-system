import { useCallback, useEffect, useState } from 'react'
import { Plus, Edit3, Trash2, X } from 'lucide-react'
import { facilityService, type GymRoom, type CreateRoomDto } from '@/services/facility.service'

const EMPTY_FORM: CreateRoomDto = { name: '', roomType: '', capacity: 20, description: '' }

export default function FacilityPage() {
  const [rooms, setRooms] = useState<GymRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedRoom = rooms.find((r) => r.roomId === selectedId) ?? rooms[0] ?? null

  // Modal state
  const [modal, setModal] = useState<'none' | 'add' | 'edit' | 'delete'>('none')
  const [form, setForm] = useState<CreateRoomDto>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await facilityService.listRooms({ pageSize: 100, search: search.trim() || undefined })
      setRooms(res.data)
      if (!selectedId && res.data.length > 0) setSelectedId(res.data[0].roomId)
    } catch {
      setError('Không thể tải danh sách phòng')
    } finally {
      setLoading(false)
    }
  }, [search, selectedId])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setModal('add')
  }

  const openEdit = (room: GymRoom) => {
    setForm({ name: room.name, roomType: room.roomType ?? '', capacity: room.capacity, description: room.description ?? '' })
    setFormError('')
    setModal('edit')
  }

  const openDelete = () => {
    setFormError('')
    setModal('delete')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      const dto = { ...form, roomType: form.roomType || undefined, description: form.description || undefined }
      if (modal === 'add') {
        const created = await facilityService.createRoom(dto)
        setRooms((prev) => [created, ...prev])
        setSelectedId(created.roomId)
      } else if (modal === 'edit' && selectedRoom) {
        const updated = await facilityService.updateRoom(selectedRoom.roomId, dto)
        setRooms((prev) => prev.map((r) => (r.roomId === updated.roomId ? updated : r)))
      }
      setModal('none')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Lưu thất bại, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRoom) return
    setSubmitting(true)
    setFormError('')
    try {
      await facilityService.deleteRoom(selectedRoom.roomId)
      setRooms((prev) => prev.filter((r) => r.roomId !== selectedRoom.roomId))
      setSelectedId(null)
      setModal('none')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Xoá thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = rooms.filter((r) =>
    [r.roomCode, r.name, r.roomType ?? ''].join(' ').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Quản lý phòng tập</p>
          <h1 className="mt-2 text-3xl font-semibold">Danh sách phòng</h1>
          <p className="mt-2 text-sm text-on-surface/70">Thêm, chỉnh sửa và quản lý phòng tập.</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Thêm phòng tập
        </button>
      </div>

      {error && <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        {/* Left — list */}
        <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã, tên, loại phòng..."
            className="w-full rounded-2xl border border-outline bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {loading ? (
            <p className="mt-8 text-center text-sm text-on-surface-variant">Đang tải...</p>
          ) : filtered.length === 0 ? (
            <p className="mt-8 text-center text-sm text-on-surface-variant">Không có phòng nào</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                    <th className="px-4 py-3">Mã</th>
                    <th className="px-4 py-3">Tên phòng</th>
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3">Sức chứa</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((room) => (
                    <tr
                      key={room.roomId}
                      className={`rounded-3xl bg-surface shadow-sm cursor-pointer ${
                        selectedRoom?.roomId === room.roomId ? 'border border-primary/40 bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedId(room.roomId)}
                    >
                      <td className="px-4 py-4 text-sm font-medium text-primary">{room.roomCode}</td>
                      <td className="px-4 py-4 text-sm">{room.name}</td>
                      <td className="px-4 py-4 text-sm text-on-surface-variant">{room.roomType ?? '—'}</td>
                      <td className="px-4 py-4 text-sm">{room.capacity} người</td>
                      <td className="px-4 py-4 text-sm">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedId(room.roomId); openEdit(room) }}
                          className="rounded-full border border-primary px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right — detail */}
        <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          {!selectedRoom ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">Chọn một phòng để xem chi tiết</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Chi tiết phòng</p>
                  <h2 className="mt-2 text-2xl font-semibold">{selectedRoom.name}</h2>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  {selectedRoom.roomCode}
                </span>
              </div>

              <div className="mt-6 space-y-4 text-sm">
                <Row label="Mã phòng" value={selectedRoom.roomCode} />
                <Row label="Loại phòng" value={selectedRoom.roomType ?? '—'} />
                <Row label="Sức chứa" value={`${selectedRoom.capacity} người`} />
                {selectedRoom.description && (
                  <Row label="Mô tả" value={selectedRoom.description} />
                )}
                {selectedRoom.stats && (
                  <>
                    <Row label="Thiết bị" value={`${selectedRoom.stats.equipmentCount} thiết bị`} />
                    <Row label="Session đang chạy" value={`${selectedRoom.stats.activeSessionsCount} session`} />
                  </>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => openEdit(selectedRoom)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline px-4 py-3 text-sm hover:bg-surface-container-high"
                >
                  <Edit3 className="w-4 h-4" /> Sửa phòng
                </button>
                <button
                  onClick={openDelete}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-error px-4 py-3 text-sm text-error hover:bg-error/10"
                >
                  <Trash2 className="w-4 h-4" /> Xoá phòng
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add / Edit modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{modal === 'add' ? 'Thêm phòng tập' : 'Sửa phòng tập'}</h2>
              <button onClick={() => setModal('none')} className="rounded-full p-2 hover:bg-surface-container-high">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Tên phòng *</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1 input-base" placeholder="Yoga Studio 1" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Loại phòng</label>
                  <input value={form.roomType} onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))} className="mt-1 input-base" placeholder="Yoga, Cardio..." />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Sức chứa *</label>
                  <input required type="number" min={1} max={1000} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))} className="mt-1 input-base" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Mô tả</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="mt-1 input-base resize-none" placeholder="Mô tả ngắn..." />
              </div>
              {formError && <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal('none')} className="btn-secondary flex-1">Huỷ</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-50">{submitting ? 'Đang lưu...' : 'Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {modal === 'delete' && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Xác nhận xoá phòng</h2>
            <p className="mt-3 text-sm text-on-surface-variant">
              Bạn có chắc muốn xoá phòng <strong>{selectedRoom.name}</strong>? Hành động này không thể hoàn tác.
            </p>
            {formError && <p className="mt-3 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{formError}</p>}
            <div className="mt-5 flex gap-3">
              <button onClick={() => setModal('none')} className="btn-secondary flex-1">Huỷ</button>
              <button onClick={handleDelete} disabled={submitting} className="flex-1 rounded-full bg-error px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 hover:bg-error/90 transition">
                {submitting ? 'Đang xoá...' : 'Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">{label}</p>
      <p className="mt-1 text-on-surface">{value}</p>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Wrench, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { facilityService, type Equipment, type MaintenanceLog } from '@/services/facility.service'

const STATUS_LABEL: Record<Equipment['status'], string> = {
  active: 'Hoạt động',
  broken: 'Hỏng',
  repairing: 'Đang sửa',
  retired: 'Ngừng HĐ',
}

const STATUS_CLASS: Record<Equipment['status'], string> = {
  active: 'bg-emerald-100 text-emerald-700',
  broken: 'bg-error/10 text-error',
  repairing: 'bg-amber-100 text-amber-700',
  retired: 'bg-slate-100 text-slate-700',
}

const MAINT_LABEL: Record<MaintenanceLog['status'], string> = {
  reported: 'Đã báo cáo',
  repairing: 'Đang sửa',
  resolved: 'Đã xong',
  failed: 'Thất bại',
}

const MAINT_CLASS: Record<MaintenanceLog['status'], string> = {
  reported: 'bg-amber-100 text-amber-700',
  repairing: 'bg-primary/10 text-primary',
  resolved: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-error/10 text-error',
}

const STATUS_FILTERS = ['', 'active', 'broken', 'repairing', 'retired']
const STATUS_FILTER_LABEL: Record<string, string> = {
  '': 'Tất cả',
  active: 'Hoạt động',
  broken: 'Hỏng',
  repairing: 'Đang sửa',
  retired: 'Ngừng HĐ',
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([])
  const [maintLoading, setMaintLoading] = useState(false)

  // Modal: 'report' = báo hỏng, 'update' = cập nhật trạng thái bảo trì
  const [modal, setModal] = useState<'none' | 'report' | 'update'>('none')
  const [description, setDescription] = useState('')
  const [selectedMaintId, setSelectedMaintId] = useState<string | null>(null)
  const [maintNewStatus, setMaintNewStatus] = useState<'repairing' | 'resolved' | 'failed'>('resolved')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const selectedEquipment = equipment.find((e) => e.equipmentId === selectedId) ?? null

  const fetchEquipment = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await facilityService.listEquipment({
        page,
        pageSize: 20,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      })
      setEquipment(res.data)
      setMeta(res.meta)
      // chọn item đầu tiên nếu chưa có selection
      setSelectedId((prev) => prev ?? res.data[0]?.equipmentId ?? null)
    } catch {
      setError('Không thể tải danh sách thiết bị')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchEquipment() }, [fetchEquipment])

  const fetchMaintenanceLogs = useCallback(async (equipmentId: string) => {
    setMaintLoading(true)
    try {
      const res = await facilityService.listMaintenanceLogs(equipmentId, { pageSize: 30 })
      setMaintenanceLogs(res.data)
    } catch {
      setMaintenanceLogs([])
    } finally {
      setMaintLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) fetchMaintenanceLogs(selectedId)
    else setMaintenanceLogs([])
  }, [selectedId, fetchMaintenanceLogs])

  const handleReportBroken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId) return
    setSubmitting(true)
    setFormError('')
    try {
      await facilityService.reportBroken(selectedId, description)
      setModal('none')
      setDescription('')
      await fetchEquipment()
      await fetchMaintenanceLogs(selectedId)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Báo hỏng thất bại, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateMaintStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMaintId) return
    setSubmitting(true)
    setFormError('')
    try {
      await facilityService.updateMaintenanceStatus(selectedMaintId, maintNewStatus)
      setModal('none')
      setSelectedMaintId(null)
      if (selectedId) {
        await fetchEquipment()
        await fetchMaintenanceLogs(selectedId)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Cập nhật thất bại, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  const openUpdateMaint = (log: MaintenanceLog) => {
    setSelectedMaintId(log.maintenanceId)
    setMaintNewStatus('resolved')
    setFormError('')
    setModal('update')
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Quản lý thiết bị</p>
        <h1 className="mt-2 text-3xl font-semibold">Danh sách thiết bị</h1>
        <p className="mt-2 text-sm text-on-surface/70">Theo dõi trạng thái và lịch sử bảo trì thiết bị.</p>
      </div>

      {error && <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Tìm mã, tên thiết bị..."
          className="rounded-2xl border border-outline bg-surface px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); setSelectedId(null) }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              statusFilter === s
                ? 'bg-primary text-white'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {STATUS_FILTER_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        {/* Left — bảng thiết bị */}
        <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          {loading ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">Đang tải...</p>
          ) : equipment.length === 0 ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">Không có thiết bị nào</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                      <th className="px-4 py-3">Mã</th>
                      <th className="px-4 py-3">Tên thiết bị</th>
                      <th className="px-4 py-3">Phòng</th>
                      <th className="px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((item) => (
                      <tr
                        key={item.equipmentId}
                        onClick={() => setSelectedId(item.equipmentId)}
                        className={`rounded-3xl bg-surface shadow-sm cursor-pointer ${
                          selectedId === item.equipmentId ? 'border border-primary/40 bg-primary/5' : ''
                        }`}
                      >
                        <td className="px-4 py-4 text-sm font-medium text-primary">{item.equipmentCode}</td>
                        <td className="px-4 py-4 text-sm">{item.name}</td>
                        <td className="px-4 py-4 text-sm text-on-surface-variant">{item.room?.name ?? '—'}</td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[item.status]}`}>
                            {STATUS_LABEL[item.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">{meta.totalItems} thiết bị</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-full border border-outline p-2 disabled:opacity-40 hover:bg-surface-container-high"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>{page} / {meta.totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                      disabled={page === meta.totalPages}
                      className="rounded-full border border-outline p-2 disabled:opacity-40 hover:bg-surface-container-high"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right — chi tiết + maintenance logs */}
        <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          {!selectedEquipment ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">Chọn thiết bị để xem chi tiết</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Chi tiết thiết bị</p>
                  <h2 className="mt-2 text-2xl font-semibold">{selectedEquipment.name}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_CLASS[selectedEquipment.status]}`}>
                  {STATUS_LABEL[selectedEquipment.status]}
                </span>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <Row label="Mã thiết bị" value={selectedEquipment.equipmentCode} />
                <Row
                  label="Phòng"
                  value={
                    selectedEquipment.room
                      ? `${selectedEquipment.room.roomCode} — ${selectedEquipment.room.name}`
                      : '—'
                  }
                />
                <Row
                  label="Ngày nhập"
                  value={new Date(selectedEquipment.importDate).toLocaleDateString('vi-VN')}
                />
                {selectedEquipment.warrantyUntil && (
                  <Row
                    label="Bảo hành đến"
                    value={new Date(selectedEquipment.warrantyUntil).toLocaleDateString('vi-VN')}
                  />
                )}
                {selectedEquipment.stats && (
                  <Row label="Tổng lần bảo trì" value={`${selectedEquipment.stats.totalMaintenanceLogs} lần`} />
                )}
              </div>

              {/* Nút hành động */}
              <div className="mt-5 flex flex-wrap gap-3">
                {selectedEquipment.status !== 'retired' && (
                  <button
                    onClick={() => { setDescription(''); setFormError(''); setModal('report') }}
                    className="inline-flex items-center gap-2 rounded-xl border border-error px-4 py-2.5 text-sm text-error hover:bg-error/10 transition"
                  >
                    <AlertTriangle className="w-4 h-4" /> Báo hỏng
                  </button>
                )}
              </div>

              {/* Lịch sử bảo trì */}
              <div className="mt-6">
                <p className="text-sm font-semibold">Lịch sử bảo trì</p>
                {maintLoading ? (
                  <p className="mt-3 text-xs text-on-surface-variant">Đang tải...</p>
                ) : maintenanceLogs.length === 0 ? (
                  <p className="mt-3 text-xs text-on-surface-variant">Chưa có nhật ký bảo trì.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {maintenanceLogs.map((log) => (
                      <li key={log.maintenanceId} className="rounded-2xl bg-surface p-4 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${MAINT_CLASS[log.status]}`}>
                            {MAINT_LABEL[log.status]}
                          </span>
                          <span className="text-xs text-on-surface-variant">
                            {new Date(log.reportedAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="mt-2 text-on-surface-variant">{log.description}</p>
                        {log.reportedByStaff && (
                          <p className="mt-1 text-xs text-on-surface-variant">
                            Báo bởi: {log.reportedByStaff.fullName}
                          </p>
                        )}
                        {log.resolvedAt && (
                          <p className="mt-1 text-xs text-on-surface-variant">
                            Hoàn thành: {new Date(log.resolvedAt).toLocaleDateString('vi-VN')}
                          </p>
                        )}
                        {(log.status === 'reported' || log.status === 'repairing') && (
                          <button
                            onClick={() => openUpdateMaint(log)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-outline px-3 py-1.5 text-xs hover:bg-surface-container-high"
                          >
                            <Wrench className="w-3 h-3" /> Cập nhật trạng thái
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal báo hỏng */}
      {modal === 'report' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Báo hỏng thiết bị</h2>
              <button onClick={() => setModal('none')} className="rounded-full p-2 hover:bg-surface-container-high">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">
              Thiết bị: <strong>{selectedEquipment?.name}</strong>
            </p>
            <form onSubmit={handleReportBroken} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Mô tả sự cố *
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 input-base resize-none"
                  placeholder="Mô tả triệu chứng hỏng hóc..."
                />
              </div>
              {formError && <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal('none')} className="btn-secondary flex-1">
                  Huỷ
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-50">
                  {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal cập nhật trạng thái bảo trì */}
      {modal === 'update' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Cập nhật bảo trì</h2>
              <button onClick={() => setModal('none')} className="rounded-full p-2 hover:bg-surface-container-high">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateMaintStatus} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Trạng thái mới *
                </label>
                <select
                  value={maintNewStatus}
                  onChange={(e) => setMaintNewStatus(e.target.value as 'repairing' | 'resolved' | 'failed')}
                  className="mt-1 input-base"
                >
                  <option value="repairing">Đang sửa</option>
                  <option value="resolved">Đã sửa xong</option>
                  <option value="failed">Sửa thất bại</option>
                </select>
              </div>
              {formError && <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal('none')} className="btn-secondary flex-1">
                  Huỷ
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-50">
                  {submitting ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
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

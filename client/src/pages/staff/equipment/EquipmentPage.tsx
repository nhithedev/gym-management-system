import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Search, Wrench } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import {
  facilityService,
  type Equipment,
  type MaintenanceLog,
} from '@/services/facility.service'
import {
  StaffEmptyState,
  StaffErrorState,
  StaffModal,
  StaffPage,
  StaffPageHeader,
  StaffSelect,
  StaffSkeleton,
  StaffStatusBadge,
  SubmitButton,
} from '@/components/StaffUI'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: '', label: 'Mọi trạng thái' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'repairing', label: 'Đang sửa chữa' },
  { value: 'broken', label: 'Hỏng' },
  { value: 'retired', label: 'Ngừng sử dụng' },
]

function equipmentStatusTone(status: string) {
  if (status === 'active') return 'success'
  if (status === 'repairing') return 'warning'
  if (status === 'broken') return 'danger'
  return 'muted'
}

function equipmentStatusLabel(status: string) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export default function EquipmentPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') ?? ''
  const roomId = searchParams.get('roomId') ?? ''
  const page = Number(searchParams.get('page') ?? 1)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  const [data, setData] = useState<Equipment[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<Equipment | null>(null)
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportDesc, setReportDesc] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    facilityService
      .listEquipment({
        status: statusFilter || undefined,
        roomId: roomId || undefined,
        search: searchParams.get('search') ?? undefined,
        page,
        pageSize: 15,
      })
      .then((result) => {
        setData(result.data)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải danh sách thiết bị.')))
      .finally(() => setLoading(false))
  }, [statusFilter, roomId, page, searchParams])

  useEffect(() => {
    load()
  }, [load])

  async function openDetail(eq: Equipment) {
    setSelected(eq)
    setLogsLoading(true)
    try {
      const logsData = await facilityService.listMaintenanceLogs(eq.equipmentId)
      setLogs(logsData)
    } catch {
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  function closeDetail() {
    setSelected(null)
    setLogs([])
  }

  function openReport() {
    setReportDesc('')
    setReportError(null)
    setReportOpen(true)
  }

  function closeReport() {
    setReportOpen(false)
    setReportError(null)
  }

  async function handleReport(event: FormEvent) {
    event.preventDefault()
    if (!selected || !reportDesc.trim()) return
    setReporting(true)
    setReportError(null)
    try {
      await facilityService.createMaintenanceLog(selected.equipmentId, {
        description: reportDesc.trim(),
      })
      closeReport()
      const logsData = await facilityService.listMaintenanceLogs(selected.equipmentId)
      setLogs(logsData)
      load()
    } catch (err) {
      setReportError(getApiError(err, 'Không thể gửi báo cáo bảo trì.'))
    } finally {
      setReporting(false)
    }
  }

  function applySearch() {
    const next = new URLSearchParams(searchParams)
    search ? next.set('search', search) : next.delete('search')
    next.set('page', '1')
    setSearchParams(next)
  }

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next)
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Cơ sở vật chất"
        title="Thiết bị tập luyện"
        description={`${total} thiết bị trong hệ thống.`}
      />

      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-[1fr_200px_auto]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 rogym-text-dim"
            size={17}
          />
          <input
            className="rogym-input pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && applySearch()}
            placeholder="Tìm theo tên thiết bị"
          />
        </div>
        <StaffSelect
          value={statusFilter}
          onValueChange={(value) => updateParam('status', value)}
          ariaLabel="Lọc theo trạng thái"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </StaffSelect>
        <button type="button" className="rogym-btn rogym-btn--primary" onClick={applySearch}>
          Tìm
        </button>
      </div>

      {loading ? (
        <StaffSkeleton rows={5} />
      ) : error ? (
        <StaffErrorState message={error} onRetry={load} />
      ) : data.length === 0 ? (
        <StaffEmptyState
          title="Không tìm thấy thiết bị"
          description="Thử thay đổi bộ lọc hoặc từ khóa."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider rogym-text-dim">
                <tr>
                  <th className="px-5 py-4">Thiết bị</th>
                  <th className="px-5 py-4">Phòng</th>
                  <th className="px-5 py-4">Bảo hành</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((eq) => (
                  <tr key={eq.equipmentId} className="border-t border-white/5 bg-[var(--rogym-bg-card)]">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{eq.name}</div>
                      <div className="text-xs rogym-text-dim">{eq.equipmentCode}</div>
                    </td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {eq.roomName ?? 'Chưa phân phòng'}
                    </td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {formatDate(eq.warrantyExpiry)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="rogym-tone-badge"
                        data-tone={equipmentStatusTone(eq.status)}
                      >
                        {equipmentStatusLabel(eq.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        className="rogym-text-link rogym-text-link--accent"
                        onClick={() => openDetail(eq)}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {data.map((eq) => (
              <button
                key={eq.equipmentId}
                type="button"
                className="rogym-card rogym-card--compact rogym-card--interactive w-full p-5 text-left"
                onClick={() => openDetail(eq)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      eq.status === 'broken' ? 'bg-red-400/10 text-red-300' : 'bg-[rgba(66,224,158,0.12)] rogym-text-accent'
                    )}>
                      <Wrench size={19} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{eq.name}</div>
                      <div className="text-xs rogym-text-dim">{eq.equipmentCode}</div>
                    </div>
                  </div>
                  <span className="rogym-tone-badge is-compact" data-tone={equipmentStatusTone(eq.status)}>
                    {equipmentStatusLabel(eq.status)}
                  </span>
                </div>
                <div className="mt-2 text-sm rogym-text-secondary">
                  {eq.roomName ?? 'Chưa phân phòng'}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
          >
            Trước
          </button>
          <span className="text-sm rogym-text-secondary">
            Trang {page}/{totalPages}
          </span>
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            disabled={page >= totalPages}
            onClick={() => updateParam('page', String(page + 1))}
          >
            Sau
          </button>
        </div>
      )}

      {/* Modal chi tiết và báo cáo */}
      <StaffModal
        open={!!selected}
        title={selected?.name ?? 'Chi tiết thiết bị'}
        onClose={closeDetail}
        footer={
          selected && selected.status !== 'retired' ? (
            <>
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                onClick={closeDetail}
              >
                Đóng
              </button>
              <button
                type="button"
                className="rogym-btn rogym-btn--danger"
                onClick={openReport}
              >
                <AlertTriangle size={15} /> Báo cáo sự cố
              </button>
            </>
          ) : (
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={closeDetail}
            >
              Đóng
            </button>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoPair label="Mã thiết bị" value={selected.equipmentCode} />
              <InfoPair label="Phòng" value={selected.roomName ?? 'Chưa phân'} />
              <InfoPair label="Ngày mua" value={formatDate(selected.purchasedAt)} />
              <InfoPair label="Hết bảo hành" value={formatDate(selected.warrantyExpiry)} />
              <div className="col-span-2 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <span className="rogym-text-dim">Trạng thái</span>
                <span
                  className="rogym-tone-badge"
                  data-tone={equipmentStatusTone(selected.status)}
                >
                  {equipmentStatusLabel(selected.status)}
                </span>
              </div>
              {selected.description && (
                <div className="col-span-2 rounded-xl border border-white/5 bg-white/[0.03] p-3 rogym-text-secondary">
                  {selected.description}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold text-white">Lịch sử bảo trì</h3>
              {logsLoading ? (
                <div className="h-16 animate-pulse rounded-xl bg-white/5" />
              ) : logs.length === 0 ? (
                <p className="text-sm rogym-text-dim">Chưa có báo cáo bảo trì.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.logId}
                      className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-medium text-white">{log.description}</div>
                        <StaffStatusBadge status={log.status} />
                      </div>
                      <div className="mt-1 text-xs rogym-text-dim">
                        {formatDate(log.createdAt)} · {log.reportedByName ?? 'Không rõ'}
                        {log.resolvedAt && ` · Giải quyết ${formatDate(log.resolvedAt)}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </StaffModal>

      {/* Modal báo cáo sự cố */}
      <StaffModal
        open={reportOpen}
        title={`Báo cáo sự cố — ${selected?.name ?? ''}`}
        onClose={closeReport}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={closeReport}
            >
              Hủy
            </button>
            <SubmitButton form="report-form" loading={reporting} disabled={!reportDesc.trim()}>
              Gửi báo cáo
            </SubmitButton>
          </>
        }
      >
        <form id="report-form" className="space-y-4" onSubmit={handleReport}>
          {reportError && <StaffErrorState message={reportError} />}
          <label className="block space-y-2">
            <span className="rogym-field-label">Mô tả sự cố *</span>
            <textarea
              className="rogym-input min-h-24"
              value={reportDesc}
              onChange={(event) => setReportDesc(event.target.value)}
              placeholder="Mô tả chi tiết sự cố thiết bị..."
              required
            />
          </label>
          <button type="submit" className="hidden" />
        </form>
      </StaffModal>
    </StaffPage>
  )
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="text-xs rogym-text-dim">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  )
}

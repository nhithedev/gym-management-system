import { useEffect, useState, useCallback } from 'react'
import { Wrench, CheckCircle2, AlertTriangle, XCircle, Dumbbell, ChevronLeft, ChevronRight } from 'lucide-react'
import { facilityService, type Equipment } from '@/services/facility.service'
import { StaffPage, StaffPageHeader, StaffSkeleton } from '../components/StaffUI'
import { formatDate } from '@/lib/date'

const G = '#06c384'
const T = '#42e09e'

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:    { label: 'Hoạt động tốt', color: G,           icon: <CheckCircle2 size={14} /> },
  repairing: { label: 'Đang bảo trì',  color: '#f59e0b',   icon: <AlertTriangle size={14} /> },
  broken:    { label: 'Hỏng hóc',      color: '#ef4444',   icon: <XCircle size={14} /> },
  retired:   { label: 'Ngừng dùng',    color: '#6b7280',   icon: <XCircle size={14} /> },
}

function Badge({ label, color, icon }: { label: string; color: string; icon?: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: "'Be Vietnam Pro',sans-serif", background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {icon}{label}
    </span>
  )
}

const PAGE_SIZE = 20

export default function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [reporting, setReporting] = useState<string | null>(null)
  const [reportDesc, setReportDesc] = useState('')
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState<string | null>(null)

  const load = useCallback((p: number, status: string) => {
    setLoading(true)
    setError(null)
    facilityService.listEquipment({
      page: p,
      pageSize: PAGE_SIZE,
      status: status || undefined,
      sort: 'equipment_code:asc',
    }).then(res => {
      setItems(res.data)
      setTotal(res.total)
    }).catch(() => setError('Không thể tải danh sách thiết bị.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(1, '') }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const active    = items.filter(e => e.status === 'active').length
  const repairing = items.filter(e => e.status === 'repairing').length
  const broken    = items.filter(e => e.status === 'broken').length

  async function handleReport(equipmentId: string) {
    if (!reportDesc.trim()) return
    setReportError(null)
    setReportSuccess(null)
    try {
      await facilityService.createMaintenanceLog(equipmentId, reportDesc.trim())
      setReportSuccess('Đã báo cáo hỏng hóc thành công.')
      setReporting(null)
      setReportDesc('')
      load(page, statusFilter)
    } catch {
      setReportError('Không thể gửi báo cáo. Vui lòng thử lại.')
    }
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Nhân viên"
        title="Quản lý thiết bị"
        description="Trạng thái và lịch bảo trì thiết bị trong phòng tập."
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Hoạt động tốt', value: active,    color: G },
          { label: 'Đang bảo trì',  value: repairing, color: '#f59e0b' },
          { label: 'Hỏng hóc',      value: broken,    color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rogym-card rogym-card--compact p-4 text-center">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs mt-1" style={{ color }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          className="input-base w-auto min-w-[160px]"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); load(1, e.target.value) }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động tốt</option>
          <option value="repairing">Đang bảo trì</option>
          <option value="broken">Hỏng hóc</option>
          <option value="retired">Ngừng dùng</option>
        </select>
      </div>

      {/* Report success/error */}
      {reportSuccess && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-3" style={{ background: `${G}0f`, border: `1px solid ${G}33` }}>
          <CheckCircle2 size={16} style={{ color: G }} />
          <p className="text-sm" style={{ color: G }}>{reportSuccess}</p>
          <button className="ml-auto text-xs text-[var(--rogym-text-muted)] hover:text-white" onClick={() => setReportSuccess(null)}>✕</button>
        </div>
      )}

      {/* Equipment table */}
      {loading ? (
        <StaffSkeleton rows={8} />
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <XCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <Dumbbell size={36} className="text-[var(--rogym-text-dim)]" />
          <p className="text-sm text-[var(--rogym-text-secondary)]">Không có thiết bị nào.</p>
        </div>
      ) : (
        <div className="rogym-card rogym-card--compact overflow-hidden p-0">
          <div className="grid px-5 py-3 text-xs font-semibold uppercase text-[var(--rogym-text-muted)] border-b border-[var(--rogym-border-section)]"
            style={{ gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr' }}>
            <span>Thiết bị</span>
            <span>Phòng</span>
            <span>Trạng thái</span>
            <span>Bảo hành đến</span>
            <span></span>
          </div>

          {items.map((eq, i) => {
            const st = STATUS_MAP[eq.status] ?? { label: eq.status, color: '#6b7280', icon: null }
            const isReporting = reporting === eq.equipmentId
            return (
              <div key={eq.equipmentId}>
                <div
                  className="grid items-center px-5 py-3.5"
                  style={{
                    gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr',
                    borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${T}1a` }}>
                      <Dumbbell size={14} style={{ color: T }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{eq.name}</p>
                      <p className="text-xs text-[var(--rogym-text-muted)]">{eq.equipmentCode}</p>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--rogym-text-secondary)]">{eq.room?.name ?? '—'}</p>
                  <Badge label={st.label} color={st.color} icon={st.icon} />
                  <p className="text-sm text-[var(--rogym-text-secondary)]">
                    {eq.warrantyUntil ? formatDate(eq.warrantyUntil) : '—'}
                  </p>
                  <div>
                    {eq.status === 'active' && (
                      <button
                        className="rogym-btn rogym-btn--outline-white px-3 py-1.5 text-xs"
                        style={{ borderColor: '#ef444488', color: '#ef4444' }}
                        onClick={() => { setReporting(isReporting ? null : eq.equipmentId); setReportDesc(''); setReportError(null) }}
                      >
                        <Wrench size={11} className="mr-1 inline" />
                        Báo hỏng
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline report form */}
                {isReporting && (
                  <div className="px-5 pb-4 pt-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <p className="text-xs font-semibold text-red-300">Báo cáo hỏng hóc: {eq.name}</p>
                      <textarea
                        className="input-base resize-none"
                        rows={2}
                        placeholder="Mô tả vấn đề..."
                        value={reportDesc}
                        onChange={e => setReportDesc(e.target.value)}
                      />
                      {reportError && <p className="text-xs text-red-400">{reportError}</p>}
                      <div className="flex gap-2">
                        <button
                          className="rogym-btn rogym-btn--primary px-4 py-2 text-xs"
                          onClick={() => handleReport(eq.equipmentId)}
                          disabled={!reportDesc.trim()}
                        >
                          Gửi báo cáo
                        </button>
                        <button
                          className="rogym-btn rogym-btn--outline-white px-4 py-2 text-xs"
                          onClick={() => { setReporting(null); setReportDesc('') }}
                        >
                          Huỷ
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--rogym-text-muted)]">Trang {page}/{totalPages} · {total} thiết bị</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p, statusFilter) }} className="rogym-btn rogym-btn--outline-white px-3 py-2 text-sm disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            <button disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); load(p, statusFilter) }} className="rogym-btn rogym-btn--outline-white px-3 py-2 text-sm disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </StaffPage>
  )
}

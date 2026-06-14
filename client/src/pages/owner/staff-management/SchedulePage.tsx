import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { staffService, type ScheduleWithStaff, type StaffProfile } from '@/services/staff.service'
import { OwnerErrorState, OwnerPage, OwnerPageHeader, OwnerSkeleton } from '@/components/OwnerUI'
import { Modal } from '@/components/ui/Modal'
import { getApiError } from '@/lib/api-error'
import { shiftLabel } from '@/lib/shift'

type ShiftType = 'morning' | 'afternoon' | 'evening'
const SHIFTS: ShiftType[] = ['morning', 'afternoon', 'evening']
const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekDays(offset: number): Date[] {
  const now = new Date()
  const dow = now.getDay()
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function fmtWeekRange(days: Date[]): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' }
  const first = days[0].toLocaleDateString('vi-VN', opts)
  const last = days[6].toLocaleDateString('vi-VN', { ...opts, year: 'numeric' })
  return `${first} – ${last}`
}

function fmtDayHeader(d: Date): string {
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')
}

function isToday(d: Date): boolean {
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

export default function OwnerSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [schedules, setSchedules] = useState<ScheduleWithStaff[]>([])
  const [staffList, setStaffList] = useState<StaffProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addModal, setAddModal] = useState<{ date: string; shift: ShiftType } | null>(null)
  const [addStaffId, setAddStaffId] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset])

  const loadSchedules = useCallback(() => {
    setLoading(true)
    setError(null)
    const from = toISODate(weekDays[0])
    const to = toISODate(weekDays[6])
    staffService
      .getAllSchedules(from, to)
      .then(setSchedules)
      .catch((err) => setError(getApiError(err, 'Không thể tải lịch làm việc.')))
      .finally(() => setLoading(false))
  }, [weekDays])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  useEffect(() => {
    if (staffList.length > 0) return
    staffService
      .list({ pageSize: 200 })
      .then((res) => setStaffList(res.data))
      .catch(() => {})
  }, [staffList.length])

  const scheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleWithStaff[]>()
    for (const s of schedules) {
      const key = `${s.workDate}__${s.shift}`
      const arr = map.get(key) ?? []
      arr.push(s)
      map.set(key, arr)
    }
    return map
  }, [schedules])

  function openAdd(date: string, shift: ShiftType) {
    setAddStaffId('')
    setAddModal({ date, shift })
  }

  async function handleAdd() {
    if (!addModal || !addStaffId) return
    setAdding(true)
    try {
      await staffService.createSchedules(addStaffId, [
        { shift: addModal.shift, workDate: addModal.date },
      ])
      setAddModal(null)
      loadSchedules()
    } catch (err) {
      alert(getApiError(err, 'Không thể thêm lịch.'))
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(s: ScheduleWithStaff) {
    setDeleting((prev) => new Set(prev).add(s.scheduleId))
    try {
      await staffService.deleteSchedule(s.staffId, s.scheduleId)
      setSchedules((prev) => prev.filter((r) => r.scheduleId !== s.scheduleId))
    } catch (err) {
      alert(getApiError(err, 'Không thể xóa lịch.'))
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev)
        next.delete(s.scheduleId)
        return next
      })
    }
  }

  const addModalCellSchedules = addModal
    ? (scheduleMap.get(`${addModal.date}__${addModal.shift}`) ?? [])
    : []
  const assignedIds = new Set(addModalCellSchedules.map((s) => s.staffId))
  const availableStaff = staffList.filter((s) => !assignedIds.has(s.staffId))

  if (loading) {
    return (
      <OwnerPage>
        <OwnerSkeleton />
      </OwnerPage>
    )
  }

  if (error) {
    return (
      <OwnerPage>
        <OwnerErrorState message={error} onRetry={loadSchedules} />
      </OwnerPage>
    )
  }

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Quản lý nhân sự"
        title="Lịch làm việc"
        description="Phân ca trực cho nhân viên theo tuần."
      />

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          aria-label="Tuần trước"
        >
          <ChevronLeft size={16} className="text-white/60" />
        </button>
        <p className="text-sm font-bold text-white">{fmtWeekRange(weekDays)}</p>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          aria-label="Tuần sau"
        >
          <ChevronRight size={16} className="text-white/60" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto rounded-[20px] p-5 rogym-sx-25952519">
        {/* DOW header */}
        <div className="mb-2 grid grid-cols-[100px_repeat(7,1fr)]">
          <div />
          {weekDays.map((d, i) => (
            <div key={i} className="py-1 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider rogym-sx-ed519d00">
                {DOW_LABELS[i]}
              </p>
              <p
                className={`mt-0.5 text-xs font-semibold ${
                  isToday(d) ? 'text-[rgba(66,224,158,1)]' : 'text-white/50'
                }`}
              >
                {fmtDayHeader(d)}
              </p>
            </div>
          ))}
        </div>

        {/* Shift rows */}
        {SHIFTS.map((shift) => (
          <div key={shift} className="grid grid-cols-[100px_repeat(7,1fr)] border-t border-white/5">
            <div className="flex items-start pt-3 pr-2">
              <span className="text-xs font-bold text-white/70">{shiftLabel(shift)}</span>
            </div>
            {weekDays.map((d, ci) => {
              const dateStr = toISODate(d)
              const cellSchedules = scheduleMap.get(`${dateStr}__${shift}`) ?? []
              return (
                <div
                  key={ci}
                  className={`rogym-calendar-cell min-h-[72px] p-1.5 ${isToday(d) ? 'is-today' : ''}`}
                >
                  <div className="space-y-1">
                    {cellSchedules.map((s) => (
                      <div
                        key={s.scheduleId}
                        className="group flex items-center justify-between gap-1 rounded-md bg-[rgba(66,224,158,0.12)] px-2 py-0.5"
                      >
                        <span className="truncate text-[10px] font-semibold text-[rgba(66,224,158,1)]">
                          {s.fullName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          disabled={deleting.has(s.scheduleId)}
                          className="shrink-0 text-white/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400 disabled:opacity-50"
                          aria-label={`Xóa ${s.fullName}`}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => openAdd(dateStr, shift)}
                      className="flex h-5 w-5 items-center justify-center rounded text-white/20 transition-colors hover:bg-white/10 hover:text-white/60"
                      aria-label={`Thêm nhân viên ${shiftLabel(shift)} ngày ${dateStr}`}
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Add staff modal */}
      <Modal
        open={addModal !== null}
        title={addModal ? `${shiftLabel(addModal.shift)} – ${addModal.date}` : ''}
        onClose={() => setAddModal(null)}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setAddModal(null)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--primary"
              onClick={handleAdd}
              disabled={!addStaffId || adding}
            >
              {adding ? 'Đang thêm…' : 'Thêm'}
            </button>
          </>
        }
      >
        {availableStaff.length === 0 ? (
          <p className="text-sm text-white/50">Tất cả nhân viên đã được phân ca này.</p>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm text-white/70">Chọn nhân viên</label>
            <select
              className="input-base w-full"
              value={addStaffId}
              onChange={(e) => setAddStaffId(e.target.value)}
            >
              <option value="">-- Chọn --</option>
              {availableStaff.map((s) => (
                <option key={s.staffId} value={s.staffId}>
                  {s.fullName} ({s.staffCode})
                </option>
              ))}
            </select>
          </div>
        )}
      </Modal>
    </OwnerPage>
  )
}

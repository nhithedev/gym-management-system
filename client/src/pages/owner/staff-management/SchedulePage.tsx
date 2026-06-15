import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { staffService, type ScheduleWithStaff, type StaffProfile } from '@/services/staff.service'
import { OwnerErrorState, OwnerModal, OwnerPage, OwnerPageHeader, OwnerSkeleton, OwnerSubmitButton } from '@/components/OwnerUI'
import { Select as OwnerSelect } from '@/components/Select'
import { getApiError } from '@/lib/api-error'
import { shiftLabel } from '@/lib/shift'

type ShiftType = 'morning' | 'afternoon' | 'evening'
const SHIFTS: ShiftType[] = ['morning', 'afternoon', 'evening']
const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTH_LABELS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isToday(y: number, m: number, d: number): boolean {
  const now = new Date()
  return now.getFullYear() === y && now.getMonth() === m && now.getDate() === d
}

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay()
  // Monday-first: 0=Mon…6=Sun; Sunday(0) → index 6
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

export default function OwnerSchedulePage() {
  const now = new Date()
  const [monthOffset, setMonthOffset] = useState(0)
  const [schedules, setSchedules] = useState<ScheduleWithStaff[]>([])
  const [staffList, setStaffList] = useState<StaffProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [addStaffId, setAddStaffId] = useState('')
  const [addShift, setAddShift] = useState<ShiftType>('morning')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  const targetYear = now.getFullYear() + Math.floor((now.getMonth() + monthOffset) / 12)
  const targetMonth = ((now.getMonth() + monthOffset) % 12 + 12) % 12

  const monthStart = toISODate(new Date(targetYear, targetMonth, 1))
  const monthEnd = toISODate(new Date(targetYear, targetMonth + 1, 0))

  const loadSchedules = useCallback(() => {
    setLoading(true)
    setError(null)
    staffService
      .getAllSchedules(monthStart, monthEnd)
      .then(setSchedules)
      .catch((err) => setError(getApiError(err, 'Không thể tải lịch làm việc.')))
      .finally(() => setLoading(false))
  }, [monthStart, monthEnd])

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

  // scheduleMap: date → shift → ScheduleWithStaff[]
  const scheduleMap = useMemo(() => {
    const map = new Map<string, Map<string, ScheduleWithStaff[]>>()
    for (const s of schedules) {
      if (!map.has(s.workDate)) map.set(s.workDate, new Map())
      const shiftMap = map.get(s.workDate)!
      if (!shiftMap.has(s.shift)) shiftMap.set(s.shift, [])
      shiftMap.get(s.shift)!.push(s)
    }
    return map
  }, [schedules])

  function countForDay(dateStr: string): number {
    const shiftMap = scheduleMap.get(dateStr)
    if (!shiftMap) return 0
    let total = 0
    for (const arr of shiftMap.values()) total += arr.length
    return total
  }

  const selectedDaySchedules = useMemo(() => {
    if (!selectedDate) return null
    const shiftMap = scheduleMap.get(selectedDate)
    return SHIFTS.map((shift) => ({
      shift,
      entries: shiftMap?.get(shift) ?? [],
    }))
  }, [selectedDate, scheduleMap])

  function openAdd() {
    setAddStaffId('')
    setAddShift('morning')
    setAddError(null)
    setAddOpen(true)
  }

  const assignedIdsForDate = useMemo(() => {
    if (!selectedDate) return new Set<string>()
    const shiftMap = scheduleMap.get(selectedDate)
    if (!shiftMap) return new Set<string>()
    const ids = new Set<string>()
    for (const arr of shiftMap.values()) arr.forEach((s) => ids.add(s.staffId))
    return ids
  }, [selectedDate, scheduleMap])

  const availableStaff = staffList.filter((s) => !assignedIdsForDate.has(s.staffId))

  async function handleAdd() {
    if (!selectedDate || !addStaffId) return
    setAdding(true)
    setAddError(null)
    try {
      await staffService.createSchedules(addStaffId, [{ shift: addShift, workDate: selectedDate }])
      setAddOpen(false)
      loadSchedules()
    } catch (err) {
      setAddError(getApiError(err, 'Không thể thêm lịch.'))
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

  const grid = getMonthGrid(targetYear, targetMonth)

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
        title="Lịch phân công"
        description="Xem và phân ca làm việc cho nhân viên theo tháng."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* ── Card trái: Lịch tháng ── */}
        <div className="rogym-card rogym-card--compact p-5">
          {/* Month navigation */}
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => { setMonthOffset((o) => o - 1); setSelectedDate(null) }}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
              aria-label="Tháng trước"
            >
              <ChevronLeft size={16} className="text-white/60" />
            </button>
            <span className="text-sm font-bold text-white">
              {MONTH_LABELS[targetMonth]} {targetYear}
            </span>
            <button
              type="button"
              onClick={() => { setMonthOffset((o) => o + 1); setSelectedDate(null) }}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
              aria-label="Tháng sau"
            >
              <ChevronRight size={16} className="text-white/60" />
            </button>
          </div>

          {/* DOW header */}
          <div className="mb-1 grid grid-cols-7">
            {DOW_LABELS.map((label) => (
              <div key={label} className="py-1 text-center text-[11px] font-bold uppercase tracking-wider rogym-text-dim">
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1">
            {grid.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 gap-1">
                {row.map((day, ci) => {
                  if (day === null) {
                    return <div key={ci} className="h-[52px] rounded-xl" />
                  }
                  const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const count = countForDay(dateStr)
                  const todayCell = isToday(targetYear, targetMonth, day)
                  const selected = selectedDate === dateStr
                  return (
                    <button
                      key={ci}
                      type="button"
                      onClick={() => setSelectedDate(selected ? null : dateStr)}
                      className={[
                        'flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-sm transition-colors',
                        selected
                          ? 'bg-[var(--rogym-teal)] text-[#080e0b]'
                          : todayCell
                            ? 'border border-[var(--rogym-teal)] text-[var(--rogym-teal)]'
                            : 'hover:bg-white/5 text-white',
                      ].filter(Boolean).join(' ')}
                    >
                      <span className="font-semibold text-xs leading-none">{day}</span>
                      {count > 0 ? (
                        <span className={[
                          'rounded-full px-1.5 py-0 text-[10px] font-bold leading-5',
                          selected ? 'bg-[#080e0b]/20 text-[#080e0b]' : 'bg-[rgba(66,224,158,0.15)] text-[var(--rogym-teal)]',
                        ].join(' ')}>
                          {count}
                        </span>
                      ) : (
                        <span className="h-5" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Card phải: Nhân sự ngày được chọn ── */}
        <div className="rogym-card rogym-card--compact p-5">
          {selectedDate === null ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 text-3xl">📅</div>
              <p className="text-sm font-medium text-white">Chọn ngày để xem lịch</p>
              <p className="mt-1 text-xs rogym-text-dim">Bấm vào ô ngày bên trái</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs rogym-text-dim">Nhân sự ngày</p>
                  <p className="text-sm font-bold text-white">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN', {
                      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary rogym-btn--sm text-xs"
                  onClick={openAdd}
                >
                  <Plus size={13} /> Thêm
                </button>
              </div>

              {selectedDaySchedules?.every((s) => s.entries.length === 0) ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
                  <p className="text-sm rogym-text-dim">Chưa có nhân viên nào trong ngày này.</p>
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--outline-white mt-3 text-xs"
                    onClick={openAdd}
                  >
                    <Plus size={13} /> Thêm nhân viên
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDaySchedules?.map(({ shift, entries }) => (
                    <div key={shift}>
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider rogym-text-dim">
                        {shiftLabel(shift)}
                      </p>
                      {entries.length === 0 ? (
                        <p className="pl-2 text-xs rogym-text-dim italic">Chưa có nhân viên</p>
                      ) : (
                        <div className="space-y-1">
                          {entries.map((s) => (
                            <div
                              key={s.scheduleId}
                              className="group flex items-center justify-between gap-2 rounded-lg bg-[rgba(66,224,158,0.08)] px-3 py-2"
                            >
                              <div>
                                <span className="text-sm font-medium text-white">{s.fullName}</span>
                                {s.staffCode && (
                                  <span className="ml-2 text-xs rogym-text-dim">{s.staffCode}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDelete(s)}
                                disabled={deleting.has(s.scheduleId)}
                                className="shrink-0 text-white/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400 disabled:opacity-50"
                                aria-label={`Xóa ${s.fullName}`}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal thêm nhân viên */}
      <OwnerModal
        open={addOpen}
        title={selectedDate
          ? `Thêm nhân viên — ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
          : 'Thêm nhân viên'}
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setAddOpen(false)}
            >
              Hủy
            </button>
            <OwnerSubmitButton
              form="add-schedule-form"
              loading={adding}
              disabled={!addStaffId}
            >
              Thêm
            </OwnerSubmitButton>
          </>
        }
      >
        <form
          id="add-schedule-form"
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); handleAdd() }}
        >
          {addError && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
              {addError}
            </div>
          )}
          {availableStaff.length === 0 ? (
            <p className="text-sm rogym-text-dim">Tất cả nhân viên đã được phân ca trong ngày này.</p>
          ) : (
            <>
              <label className="block space-y-2">
                <span className="rogym-field-label">Ca làm việc</span>
                <OwnerSelect
                  value={addShift}
                  onValueChange={(v) => setAddShift(v as ShiftType)}
                  required
                >
                  {SHIFTS.map((s) => (
                    <option key={s} value={s}>{shiftLabel(s)}</option>
                  ))}
                </OwnerSelect>
              </label>
              <label className="block space-y-2">
                <span className="rogym-field-label">Nhân viên</span>
                <OwnerSelect
                  value={addStaffId}
                  onValueChange={setAddStaffId}
                  required
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {availableStaff.map((s) => (
                    <option key={s.staffId} value={s.staffId}>
                      {s.fullName} ({s.staffCode})
                    </option>
                  ))}
                </OwnerSelect>
              </label>
            </>
          )}
          <button type="submit" className="hidden" />
        </form>
      </OwnerModal>
    </OwnerPage>
  )
}

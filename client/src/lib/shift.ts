import type { StaffSchedule } from '@/services/staff.service'

export function shiftLabel(shift: StaffSchedule['shift']): string {
  return shift === 'morning' ? 'Ca sáng' : shift === 'afternoon' ? 'Ca chiều' : 'Ca tối'
}

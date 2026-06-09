export type StatusTone = 'success' | 'accent' | 'warning' | 'danger' | 'muted'

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang diễn ra',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  expired: 'Hết hạn',
  pending: 'Chờ xử lý',
  pending_verification: 'Chờ xác thực',
  draft: 'Bản nháp',
  archived: 'Lưu trữ',
  replaced: 'Đã thay thế',
  realtime: 'Thiết bị',
  manual: 'Thủ công',
  qr: 'QR',
}

export function statusLabel(status?: string | null): string {
  if (!status) return 'Không xác định'
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
}

export function statusTone(status?: string | null): StatusTone {
  if (status === 'active' || status === 'completed') return 'success'
  if (status === 'scheduled' || status === 'in_progress' || status === 'realtime') return 'accent'
  if (status === 'pending' || status === 'pending_verification' || status === 'draft')
    return 'warning'
  if (status === 'cancelled' || status === 'expired') return 'danger'
  return 'muted'
}

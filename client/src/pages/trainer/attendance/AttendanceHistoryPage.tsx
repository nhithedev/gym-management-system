import { FormEvent, useCallback, useEffect, useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { useTrainerStudents } from '@/hooks/useTrainerStudents'
import { getApiError } from '@/lib/api-error'
import { endOfLocalDayIso, formatDateTime, startOfLocalDayIso } from '@/lib/date'
import { trainingService, type AttendanceLog } from '@/services/training.service'
import {
  StudentCombobox,
  SubmitButton,
  TrainerEmptyState,
  TrainerErrorState,
  TrainerModal,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
  TrainerStatusBadge,
} from '../components/TrainerUI'

export default function TrainerAttendanceHistoryPage() {
  const { data: students } = useTrainerStudents({ pageSize: 100 })
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [total, setTotal] = useState(0)
  const [memberId, setMemberId] = useState('')
  const [method, setMethod] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [memberCode, setMemberCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await trainingService.getAttendance({
        memberId: memberId || undefined,
        method: method || undefined,
        from: from ? startOfLocalDayIso(from) : undefined,
        to: to ? endOfLocalDayIso(to) : undefined,
        pageSize: 100,
      })
      setLogs(result.data)
      setTotal(result.total)
    } catch (err) {
      setError(getApiError(err, 'Không thể tải lịch sử điểm danh.'))
    } finally {
      setLoading(false)
    }
  }, [from, memberId, method, to])

  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 30000)
    return () => window.clearInterval(interval)
  }, [load])

  async function manualCheckin(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await trainingService.manualCheckin({
        memberCode: memberCode.trim(),
        occurredAt: new Date().toISOString(),
      })
      setCheckinOpen(false)
      setMemberCode('')
      await load()
    } catch (err) {
      setError(getApiError(err, 'Không thể check-in thủ công.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function checkout(attendanceId: string) {
    setError(null)
    try {
      await trainingService.checkout(attendanceId, new Date().toISOString())
      await load()
    } catch (err) {
      setError(getApiError(err, 'Không thể checkout lượt điểm danh này.'))
    }
  }

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Theo dõi ra vào"
        title="Lịch sử điểm danh"
        description={`${total} lượt check-in trong bộ lọc hiện tại. Dữ liệu tự làm mới mỗi 30 giây khi tab đang mở.`}
        actions={
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={() => setCheckinOpen(true)}
          >
            <LogIn size={16} /> Check-in thủ công
          </button>
        }
      />
      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        <StudentCombobox students={students} value={memberId} onChange={setMemberId} />
        <select
          className="rogym-input"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        >
          <option value="">Mọi phương thức</option>
          <option value="realtime">Thiết bị</option>
          <option value="manual">Thủ công</option>
          <option value="qr">QR</option>
        </select>
        <input
          className="rogym-input"
          type="date"
          aria-label="Từ ngày"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <input
          className="rogym-input"
          type="date"
          aria-label="Đến ngày"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>
      {error && <TrainerErrorState message={error} onRetry={load} />}
      {loading ? (
        <TrainerSkeleton rows={5} />
      ) : logs.length === 0 ? (
        <TrainerEmptyState
          title="Chưa có dữ liệu điểm danh"
          description="Thử thay đổi khoảng ngày hoặc tạo lượt check-in thủ công."
        />
      ) : (
        <div className="grid gap-3">
          {logs.map((log) => (
            <div
              key={log.attendanceId}
              className="rogym-card rogym-card--compact flex flex-col gap-4 p-5 md:flex-row md:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white">{log.memberName}</div>
                <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">{log.memberCode}</div>
              </div>
              <div className="md:w-52">
                <div className="text-xs text-[var(--rogym-text-dim)]">Check-in</div>
                <div className="mt-1 text-sm text-white">{formatDateTime(log.startTime)}</div>
              </div>
              <div className="md:w-52">
                <div className="text-xs text-[var(--rogym-text-dim)]">Check-out</div>
                <div className="mt-1 text-sm text-white">{formatDateTime(log.endTime)}</div>
              </div>
              <TrainerStatusBadge status={log.method} />
              {!log.endTime && (
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white"
                  onClick={() => checkout(log.attendanceId)}
                >
                  <LogOut size={15} /> Checkout
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <TrainerModal
        open={checkinOpen}
        title="Check-in thủ công"
        onClose={() => setCheckinOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setCheckinOpen(false)}
            >
              Hủy
            </button>
            <SubmitButton
              form="manual-checkin-form"
              loading={submitting}
              disabled={!memberCode.trim()}
            >
              Check-in
            </SubmitButton>
          </>
        }
      >
        <form id="manual-checkin-form" className="space-y-4" onSubmit={manualCheckin}>
          <label className="block space-y-2">
            <span className="rogym-field-label">Mã hội viên</span>
            <input
              className="rogym-input"
              value={memberCode}
              onChange={(event) => setMemberCode(event.target.value)}
              placeholder="Ví dụ: MB000123"
              autoFocus
              required
            />
          </label>
          <p className="text-xs leading-5 text-[var(--rogym-text-secondary)]">
            Thời gian check-in sẽ lấy theo thời điểm xác nhận hiện tại.
          </p>
        </form>
      </TrainerModal>
    </TrainerPage>
  )
}

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, CalendarPlus, MapPin } from 'lucide-react'
import { DatePickerInput } from '@/components/DatePickerInput'
import { useTrainerSessions } from '@/hooks/useTrainerSessions'
import { useTrainerStudents } from '@/hooks/useTrainerStudents'
import { endOfLocalDayIso, formatDateTime, startOfLocalDayIso } from '@/lib/date'
import { facilityService, type GymRoom } from '@/services/facility.service'
import {
  StudentCombobox,
  TrainerEmptyState,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSelect,
  TrainerSkeleton,
  TrainerStatusBadge,
} from '@/components/TrainerUI'

export default function TrainerSessionsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? 1)
  const memberId = searchParams.get('memberId') ?? ''
  const roomId = searchParams.get('roomId') ?? ''
  const status = searchParams.get('status') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const [rooms, setRooms] = useState<GymRoom[]>([])
  const { data: students } = useTrainerStudents({ pageSize: 100 })
  const { data, total, loading, error, reload } = useTrainerSessions({
    page,
    pageSize: 12,
    memberId: memberId || undefined,
    roomId: roomId || undefined,
    status: status || undefined,
    from: from ? startOfLocalDayIso(from) : undefined,
    to: to ? endOfLocalDayIso(to) : undefined,
    sort: 'start_time:desc',
  })

  useEffect(() => {
    facilityService
      .listRooms()
      .then(setRooms)
      .catch(() => setRooms([]))
  }, [])

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next)
  }

  const totalPages = Math.max(1, Math.ceil(total / 12))

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Lịch dạy"
        title="Buổi tập"
        description={`${total} buổi tập phù hợp với bộ lọc hiện tại.`}
        actions={
          <>
            <Link className="rogym-btn rogym-btn--outline-white" to="/trainer/calendar">
              <CalendarDays size={16} /> Xem lịch
            </Link>
            <Link className="rogym-btn rogym-btn--primary" to="/trainer/sessions/create">
              <CalendarPlus size={16} /> Tạo buổi tập
            </Link>
          </>
        }
      />

      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
        <StudentCombobox
          students={students}
          value={memberId}
          onChange={(value) => updateParam('memberId', value)}
        />
        <TrainerSelect value={roomId} onValueChange={(value) => updateParam('roomId', value)}>
          <option value="">Mọi phòng tập</option>
          {rooms.map((room) => (
            <option key={room.roomId} value={room.roomId}>
              {room.roomCode} - {room.name}
            </option>
          ))}
        </TrainerSelect>
        <TrainerSelect value={status} onValueChange={(value) => updateParam('status', value)}>
          <option value="">Mọi trạng thái</option>
          <option value="scheduled">Đã lên lịch</option>
          <option value="in_progress">Đang diễn ra</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
        </TrainerSelect>
        <DatePickerInput
          aria-label="Từ ngày"
          value={from}
          onChange={(value) => updateParam('from', value)}
        />
        <DatePickerInput
          aria-label="Đến ngày"
          value={to}
          onChange={(value) => updateParam('to', value)}
        />
      </div>

      {loading ? (
        <TrainerSkeleton rows={5} />
      ) : error ? (
        <TrainerErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <TrainerEmptyState
          title="Chưa có buổi tập"
          description="Tạo buổi tập mới hoặc thay đổi bộ lọc đang dùng."
          action={
            <Link className="rogym-btn rogym-btn--primary" to="/trainer/sessions/create">
              Tạo buổi tập
            </Link>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-[var(--rogym-text-dim)]">
                <tr>
                  <th className="px-5 py-4">Thời gian</th>
                  <th className="px-5 py-4">Học viên</th>
                  <th className="px-5 py-4">Phòng</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((session) => (
                  <tr
                    key={session.sessionId}
                    className="border-t border-white/5 bg-[var(--rogym-bg-card)]"
                  >
                    <td className="px-5 py-4 text-white">{formatDateTime(session.startTime)}</td>
                    <td className="px-5 py-4 text-[var(--rogym-text-secondary)]">
                      {session.memberName}
                    </td>
                    <td className="px-5 py-4 text-[var(--rogym-text-secondary)]">
                      {session.roomName ?? 'Chưa xếp phòng'}
                    </td>
                    <td className="px-5 py-4">
                      <TrainerStatusBadge status={session.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="rogym-text-link rogym-text-link--accent"
                        to={`/trainer/sessions/${session.sessionId}`}
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 md:hidden">
            {data.map((session) => (
              <Link
                key={session.sessionId}
                to={`/trainer/sessions/${session.sessionId}`}
                className="rogym-card rogym-card--compact p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{session.memberName}</div>
                    <div className="mt-1 text-sm text-[var(--rogym-text-secondary)]">
                      {formatDateTime(session.startTime)}
                    </div>
                  </div>
                  <TrainerStatusBadge status={session.status} />
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-[var(--rogym-text-dim)]">
                  <MapPin size={15} /> {session.roomName ?? 'Chưa xếp phòng'}
                </div>
              </Link>
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
          <span className="text-sm text-[var(--rogym-text-secondary)]">
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
    </TrainerPage>
  )
}

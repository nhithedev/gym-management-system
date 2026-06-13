import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Clock3 } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { localDateTimeInputToIso, toDateTimeLocalInput } from '@/lib/date'
import { facilityService, type GymRoom } from '@/services/facility.service'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import { trainingService } from '@/services/training.service'
import {
  StudentCombobox,
  SubmitButton,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSelect,
  TrainerSkeleton,
} from '@/components/TrainerUI'
import { DateTimePickerInput } from '@/components/DateTimePickerInput'

export default function CreateSessionPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [students, setStudents] = useState<TrainerStudentSummary[]>([])
  const [rooms, setRooms] = useState<GymRoom[]>([])
  const [memberId, setMemberId] = useState(searchParams.get('memberId') ?? '')
  const [roomId, setRoomId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState(60)
  const [loading, setLoading] = useState(true)
  const [editBlocked, setEditBlocked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [studentResult, roomResult, session] = await Promise.all([
          memberService.list({ pageSize: 100 }),
          facilityService.listRooms(),
          id ? trainingService.getSession(id) : Promise.resolve(null),
        ])
        if (!active) return
        setStudents(studentResult.data)
        setRooms(roomResult)
        if (session) {
          setMemberId(session.memberId)
          setRoomId(session.roomId ?? '')
          setStartTime(toDateTimeLocalInput(session.startTime))
          setDuration(
            Math.max(
              1,
              Math.round(
                (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) /
                  60000
              )
            )
          )
          if (session.status !== 'scheduled' || new Date(session.startTime) <= new Date()) {
            setEditBlocked(true)
            setError('Chỉ có thể sửa buổi tập đã lên lịch và chưa bắt đầu.')
          }
        }
      } catch (err) {
        setError(getApiError(err, 'Không thể tải dữ liệu tạo buổi tập.'))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [id])

  const endTime = useMemo(() => {
    if (!startTime || duration <= 0) return ''
    const start = new Date(localDateTimeInputToIso(startTime))
    return new Date(start.getTime() + duration * 60000).toISOString()
  }, [duration, startTime])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!memberId || !roomId || !startTime || !endTime) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        roomId,
        startTime: localDateTimeInputToIso(startTime),
        endTime,
      }
      const session =
        editing && id
          ? await trainingService.updateSession(id, payload)
          : await trainingService.createSession({ ...payload, memberId })
      navigate(`/trainer/sessions/${session.sessionId}`)
    } catch (err) {
      setError(
        getApiError(
          err,
          'Không thể lưu buổi tập. Hãy kiểm tra trùng lịch, phòng và thời hạn gói tập.'
        )
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return (
      <TrainerPage>
        <TrainerSkeleton rows={5} />
      </TrainerPage>
    )

  return (
    <TrainerPage className="max-w-3xl">
      <TrainerPageHeader
        eyebrow="Lịch dạy"
        title={editing ? 'Chỉnh sửa buổi tập' : 'Tạo buổi tập'}
        description="Chọn học viên, phòng và thời gian. Hệ thống sẽ kiểm tra gói tập và xung đột lịch."
        actions={
          <Link
            className="rogym-btn rogym-btn--outline-white"
            to={id ? `/trainer/sessions/${id}` : '/trainer/sessions'}
          >
            <ArrowLeft size={16} /> Quay lại
          </Link>
        }
      />
      {error && <TrainerErrorState message={error} />}
      <form className="rogym-card rogym-card--compact space-y-5 p-6" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="rogym-field-label">Học viên</span>
          <StudentCombobox
            students={students}
            value={memberId}
            onChange={setMemberId}
            disabled={editing}
          />
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">Phòng tập</span>
          <TrainerSelect value={roomId} onValueChange={setRoomId} required>
            <option value="">Chọn phòng tập</option>
            {rooms.map((room) => (
              <option key={room.roomId} value={room.roomId}>
                {room.roomCode} - {room.name} ({room.capacity} người)
              </option>
            ))}
          </TrainerSelect>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="block space-y-2">
            <span className="rogym-field-label">Thời gian bắt đầu</span>
            <DateTimePickerInput
              value={startTime}
              onChange={setStartTime}
              placeholder="Chọn ngày & giờ"
              aria-label="Thời gian bắt đầu"
              disabled={editBlocked}
            />
          </div>
          <label className="block space-y-2">
            <span className="rogym-field-label">Thời lượng (phút)</span>
            <input
              className="rogym-input"
              type="number"
              min={15}
              max={360}
              step={15}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              required
            />
          </label>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-4 text-sm rogym-text-secondary">
          <Clock3 size={17} className="rogym-text-accent" />
          Kết thúc dự kiến:{' '}
          {endTime ? toDateTimeLocalInput(endTime).replace('T', ' ') : 'Chưa xác định'}
        </div>
        <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
          <Link
            className="rogym-btn rogym-btn--outline-white"
            to={id ? `/trainer/sessions/${id}` : '/trainer/sessions'}
          >
            Hủy
          </Link>
          <SubmitButton
            loading={submitting}
            disabled={editBlocked || !memberId || !roomId || !startTime || duration <= 0}
          >
            {editing ? 'Lưu thay đổi' : 'Tạo buổi tập'}
          </SubmitButton>
        </div>
      </form>
    </TrainerPage>
  )
}

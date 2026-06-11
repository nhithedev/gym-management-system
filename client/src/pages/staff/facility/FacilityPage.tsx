import { useEffect, useState } from 'react'
import { Building2, DoorOpen, Users, Dumbbell} from 'lucide-react'
import { facilityService, type GymRoom } from '@/services/facility.service'
import { StaffPage, StaffPageHeader, StaffSkeleton } from '../components/StaffUI'

const G = '#06c384'

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: "'Be Vietnam Pro',sans-serif", background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {label}
    </span>
  )
}

const ROOM_COLORS = ['#06c384', '#8b5cf6', '#3b82f6', '#f59e0b', '#ec4899', '#14b8a6']

export default function FacilityPage() {
  const [rooms, setRooms] = useState<GymRoom[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    facilityService.listRooms({ pageSize: 100 })
      .then(res => { setRooms(res.data); setTotal(res.total) })
      .catch(() => setError('Không thể tải danh sách phòng.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Nhân viên"
        title="Quản lý phòng tập"
        description="Trạng thái các khu vực và phòng trong phòng tập."
      />

      {loading ? (
        <StaffSkeleton rows={4} />
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Building2 size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <Building2 size={36} className="text-[var(--rogym-text-dim)]" />
          <p className="text-sm text-[var(--rogym-text-secondary)]">Chưa có phòng nào được tạo.</p>
        </div>
      ) : (
        <>
          {/* Room grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {rooms.map((room, idx) => {
              const color = ROOM_COLORS[idx % ROOM_COLORS.length]
              return (
                <div key={room.roomId} className="rogym-card rogym-card--compact p-5 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1a` }}>
                    <Dumbbell size={20} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-white">{room.name}</h3>
                        <p className="text-xs text-[var(--rogym-text-muted)]">{room.roomCode}</p>
                      </div>
                      {room.roomType && (
                        <Badge label={room.roomType} color={color} />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-[var(--rogym-text-muted)]">
                        <Users size={11} /> Sức chứa: {room.capacity} người
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: G }}>
                        <DoorOpen size={11} /> Đang hoạt động
                      </span>
                    </div>
                    {room.description && (
                      <p className="text-xs text-[var(--rogym-text-muted)] mt-1 truncate">{room.description}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Tổng phòng',    value: total,       color: '#42e09e' },
              { label: 'Đang hoạt động', value: rooms.length, color: G },
            ].map(({ label, value, color }) => (
              <div key={label} className="rogym-card rogym-card--compact p-4 text-center">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs mt-1" style={{ color }}>{label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </StaffPage>
  )
}

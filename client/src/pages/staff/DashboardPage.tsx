import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, CheckSquare, MessageSquare, Building2,
  Wrench, CalendarDays, AlertCircle, User, Clock,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { staffService, type StaffProfile, type StaffSchedule } from '@/services/staff.service'
import { feedbackService } from '@/services/feedback.service'
import { memberService } from '@/services/member.service'
import { StaffPage, StaffPageHeader } from './components/StaffUI'

const G = '#06c384'
const T = '#42e09e'
const BG_CARD = '#0f1c16'

const SHIFT_LABEL: Record<string, string> = {
  morning: 'Ca sáng (06:00–14:00)',
  afternoon: 'Ca chiều (14:00–22:00)',
  evening: 'Ca tối (18:00–23:00)',
}

const SHIFT_COLOR: Record<string, string> = {
  morning: '#f59e0b',
  afternoon: '#3b82f6',
  evening: '#8b5cf6',
}

function todayInput() {
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

function Skeleton({ h = 80 }: { h?: number }) {
  return <div className="animate-pulse rounded-2xl" style={{ height: h, background: `${BG_CARD}99`, border: '1px solid rgba(255,255,255,0.05)' }} />
}

function StatCard({
  icon, label, value, color, onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="rogym-card rogym-card--compact p-5 flex items-center gap-4"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1a` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-[var(--rogym-text-muted)] mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  )
}

function QuickAction({
  icon, label, to, color,
}: {
  icon: React.ReactNode
  label: string
  to: string
  color: string
}) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="rogym-card rogym-card--compact p-4 flex flex-col items-center gap-2 text-center hover:border-[var(--rogym-border-teal-hover)]"
      style={{ cursor: 'pointer', minHeight: 90 }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}1a` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <span className="text-xs font-medium text-[var(--rogym-text-secondary)]">{label}</span>
    </button>
  )
}

export default function StaffDashboardPage() {
  useAuthStore()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [openFeedbacks, setOpenFeedbacks] = useState<number>(0)
  const [memberTotal, setMemberTotal] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([
      staffService.getMe(),
      feedbackService.list({ status: 'open', pageSize: 1 }),
      memberService.list({ pageSize: 1 }),
    ]).then(([profRes, fbRes, memRes]) => {
      if (profRes.status === 'fulfilled') {
        setProfile(profRes.value)
        staffService.getSchedules(profRes.value.staffId).then(setSchedules).catch(() => {})
      } else {
        setError('Không thể tải thông tin nhân viên.')
      }
      if (fbRes.status === 'fulfilled') setOpenFeedbacks(fbRes.value.total)
      if (memRes.status === 'fulfilled') setMemberTotal(memRes.value.total)
    }).finally(() => setLoading(false))
  }, [])

  const today = todayISO()
  const todaySchedules = schedules.filter(s => s.workDate.slice(0, 10) === today)

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Nhân viên"
        title={`Xin chào${profile ? `, ${profile.fullName.split(' ').slice(-1)[0]}` : ''}!`}
        description={todayInput()}
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} h={90} />)}
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={<Users size={20} />} label="Tổng hội viên" value={memberTotal} color={G} onClick={() => navigate('/staff/members')} />
            <StatCard icon={<MessageSquare size={20} />} label="Phản hồi mở" value={openFeedbacks} color="#f59e0b" onClick={() => navigate('/staff/feedback')} />
            <StatCard icon={<CalendarDays size={20} />} label="Ca hôm nay" value={todaySchedules.length > 0 ? todaySchedules.map(s => SHIFT_LABEL[s.shift]?.split(' ')[0] ?? s.shift).join(', ') : 'Nghỉ'} color={T} />
            <StatCard icon={<User size={20} />} label="Mã nhân viên" value={profile?.staffCode ?? '—'} color="#8b5cf6" />
          </div>

          {/* Today schedule */}
          {todaySchedules.length > 0 && (
            <div className="rogym-card rogym-card--compact p-5">
              <div className="rogym-eyebrow mb-3">Lịch làm việc hôm nay</div>
              <div className="flex flex-col gap-2">
                {todaySchedules.map(s => (
                  <div key={s.scheduleId} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <Clock size={16} style={{ color: SHIFT_COLOR[s.shift] ?? G }} />
                    <span className="text-sm font-medium text-white">{SHIFT_LABEL[s.shift] ?? s.shift}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div>
            <div className="rogym-eyebrow mb-3">Truy cập nhanh</div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <QuickAction icon={<Users size={20} />} label="Hội viên" to="/staff/members" color={G} />
              <QuickAction icon={<CheckSquare size={20} />} label="Check-in" to="/staff/check-in" color={T} />
              <QuickAction icon={<MessageSquare size={20} />} label="Phản hồi" to="/staff/feedback" color="#f59e0b" />
              <QuickAction icon={<Building2 size={20} />} label="Phòng tập" to="/staff/facility" color="#3b82f6" />
              <QuickAction icon={<Wrench size={20} />} label="Thiết bị" to="/staff/equipment" color="#8b5cf6" />
              <QuickAction icon={<User size={20} />} label="Hồ sơ" to="/staff/profile" color="#ec4899" />
            </div>
          </div>

          {/* Staff info card */}
          {profile && (
            <div className="rogym-card rogym-card--compact p-5 flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ background: `${G}1a`, border: `2px solid ${G}44` }}>
                <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, color: G }}>
                  {profile.fullName.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
                {[
                  { label: 'Họ và tên', value: profile.fullName },
                  { label: 'Vị trí', value: profile.position },
                  { label: 'Email', value: profile.email },
                  { label: 'Điện thoại', value: profile.phone ?? 'Chưa có' },
                  { label: 'Trạng thái', value: profile.status ?? 'active' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-[var(--rogym-text-muted)]">{label}</p>
                    <p className="text-sm font-medium text-white mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </StaffPage>
  )
}

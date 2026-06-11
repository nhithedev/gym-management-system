import { useEffect, useState } from 'react'
import { AlertCircle, User, Phone, Mail, Briefcase, Hash, CalendarDays, Clock } from 'lucide-react'
import { staffService, type StaffProfile, type StaffSchedule } from '@/services/staff.service'
import { StaffPage, StaffPageHeader, StaffSkeleton } from './components/StaffUI'

const G = '#06c384'
const T = '#42e09e'

const SHIFT_LABEL: Record<string, string> = {
  morning: 'Ca sáng',
  afternoon: 'Ca chiều',
  evening: 'Ca tối',
}

const SHIFT_TIME: Record<string, string> = {
  morning: '06:00 – 14:00',
  afternoon: '14:00 – 22:00',
  evening: '18:00 – 23:00',
}

const SHIFT_COLOR: Record<string, string> = {
  morning: '#f59e0b',
  afternoon: '#3b82f6',
  evening: '#8b5cf6',
}

const WEEKDAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function formatWorkDate(iso: string) {
  const d = new Date(iso)
  const day = WEEKDAY_VI[d.getDay()]
  return `${day} ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
}

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--rogym-border-section)] last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(6,195,132,0.1)' }}>
        <span style={{ color: G }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-[var(--rogym-text-muted)]">{label}</p>
        <p className="text-sm font-medium text-white mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function StaffProfilePage() {
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    staffService.getMe()
      .then(prof => {
        setProfile(prof)
        return staffService.getSchedules(prof.staffId)
      })
      .then(setSchedules)
      .catch(() => setError('Không thể tải thông tin hồ sơ.'))
      .finally(() => setLoading(false))
  }, [])

  const today = todayISO()
  const upcoming = schedules
    .filter(s => s.workDate.slice(0, 10) >= today)
    .sort((a, b) => a.workDate.localeCompare(b.workDate))
    .slice(0, 10)

  const initials = profile
    ? profile.fullName.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()
    : '?'

  return (
    <StaffPage>
      <StaffPageHeader eyebrow="Nhân viên" title="Hồ sơ cá nhân" description="Thông tin tài khoản và lịch làm việc của bạn." />

      {loading ? (
        <StaffSkeleton rows={4} />
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : profile ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          {/* Left: profile info */}
          <div className="rogym-card rogym-card--compact p-6 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 pb-4 border-b border-[var(--rogym-border-section)]">
              <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `${G}1a`, border: `2px solid ${G}44` }}>
                <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 32, color: G }}>{initials}</span>
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">{profile.fullName}</h2>
                <p className="text-sm" style={{ color: T }}>{profile.position}</p>
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${G}22`, color: G, border: `1px solid ${G}44` }}>
                {profile.staffCode}
              </span>
            </div>
            <div>
              <InfoRow icon={<Mail size={14} />} label="Email" value={profile.email} />
              <InfoRow icon={<Phone size={14} />} label="Điện thoại" value={profile.phone ?? 'Chưa cập nhật'} />
              <InfoRow icon={<Briefcase size={14} />} label="Vị trí" value={profile.position} />
              <InfoRow icon={<Hash size={14} />} label="Mã nhân viên" value={profile.staffCode} />
              <InfoRow icon={<User size={14} />} label="Trạng thái" value={profile.status === 'active' ? 'Đang làm việc' : (profile.status ?? 'active')} />
            </div>
          </div>

          {/* Right: schedule */}
          <div className="rogym-card rogym-card--compact p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={18} style={{ color: T }} />
              <h3 className="text-base font-bold text-white">Lịch làm việc sắp tới</h3>
            </div>

            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <CalendarDays size={36} className="text-[var(--rogym-text-dim)]" />
                <p className="text-sm text-[var(--rogym-text-secondary)]">Chưa có lịch làm việc nào được xếp.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {upcoming.map(s => {
                  const isToday = s.workDate.slice(0, 10) === today
                  const color = SHIFT_COLOR[s.shift] ?? G
                  return (
                    <div
                      key={s.scheduleId}
                      className="flex items-center gap-3 rounded-xl px-4 py-3"
                      style={{
                        background: isToday ? `${G}0f` : 'rgba(255,255,255,0.03)',
                        border: isToday ? `1px solid ${G}33` : '1px solid transparent',
                      }}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-center" style={{ background: `${color}1a`, color }}>
                        {formatWorkDate(s.workDate)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{SHIFT_LABEL[s.shift] ?? s.shift}</p>
                        <p className="text-xs text-[var(--rogym-text-muted)] flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {SHIFT_TIME[s.shift] ?? ''}
                        </p>
                      </div>
                      {isToday && (
                        <span className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ background: `${G}22`, color: G }}>Hôm nay</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </StaffPage>
  )
}

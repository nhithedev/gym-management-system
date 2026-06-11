import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar,
  CreditCard, AlertCircle, TrendingUp, Dumbbell,
} from 'lucide-react'
import { memberService, type TrainerStudentDetail } from '@/services/member.service'
import { StaffPage, StaffSkeleton } from '../components/StaffUI'
import { formatDate } from '@/lib/date'

const G = '#06c384'
const T = '#42e09e'

const SUB_STATUS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Đang hoạt động', color: G },
  pending:   { label: 'Chờ kích hoạt', color: '#f59e0b' },
  expired:   { label: 'Đã hết hạn', color: '#ef4444' },
  cancelled: { label: 'Đã huỷ', color: '#6b7280' },
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: "'Be Vietnam Pro',sans-serif", background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {label}
    </span>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[var(--rogym-border-section)] last:border-0">
      <span className="mt-0.5" style={{ color: G }}>{icon}</span>
      <div>
        <p className="text-xs text-[var(--rogym-text-muted)]">{label}</p>
        <p className="text-sm font-medium text-white mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function StaffMemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [member, setMember] = useState<TrainerStudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    memberService.getById(id)
      .then(setMember)
      .catch(() => setError('Không thể tải thông tin hội viên.'))
      .finally(() => setLoading(false))
  }, [id])

  const activeSub = member?.subscriptions.find(s => s.status === 'active')
    ?? member?.subscriptions.find(s => s.status === 'pending')
  const initials = member
    ? member.fullName.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()
    : '?'

  return (
    <StaffPage>
      {/* Back button */}
      <button
        onClick={() => navigate('/staff/members')}
        className="flex items-center gap-2 text-sm text-[var(--rogym-text-secondary)] hover:text-white transition-colors mb-2"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Be Vietnam Pro',sans-serif" }}
      >
        <ArrowLeft size={16} />
        Danh sách hội viên
      </button>

      {loading ? (
        <StaffSkeleton rows={5} />
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : member ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          {/* Left: member profile */}
          <div className="flex flex-col gap-4">
            {/* Avatar + name */}
            <div className="rogym-card rogym-card--compact p-6 flex flex-col items-center gap-3 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `${G}1a`, border: `2px solid ${G}44` }}>
                <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 32, color: G }}>{initials}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{member.fullName}</h2>
                <p className="text-xs text-[var(--rogym-text-muted)] mt-0.5">{member.memberCode}</p>
              </div>
              <Badge
                label={member.status === 'active' ? 'Hoạt động' : member.status}
                color={member.status === 'active' ? G : '#6b7280'}
              />
            </div>

            {/* Info */}
            <div className="rogym-card rogym-card--compact p-5">
              <InfoRow icon={<Mail size={14} />} label="Email" value={member.email} />
              <InfoRow icon={<Phone size={14} />} label="Điện thoại" value={member.phone ?? 'Chưa có'} />
              <InfoRow icon={<Calendar size={14} />} label="Ngày sinh" value={member.dateOfBirth ? formatDate(member.dateOfBirth) : 'Chưa có'} />
              <InfoRow icon={<MapPin size={14} />} label="Địa chỉ" value={member.address ?? 'Chưa có'} />
              <InfoRow icon={<User size={14} />} label="Huấn luyện viên" value={member.primaryTrainer?.fullName ?? 'Chưa có'} />
              <InfoRow icon={<Calendar size={14} />} label="Ngày tham gia" value={formatDate(member.createdAt)} />
            </div>
          </div>

          {/* Right: subscriptions */}
          <div className="flex flex-col gap-4">
            {/* Active sub */}
            <div className="rogym-card rogym-card--compact p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={16} style={{ color: T }} />
                <h3 className="text-base font-bold text-white">Gói tập hiện tại</h3>
              </div>
              {activeSub ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{activeSub.packageName}</p>
                    <Badge
                      label={SUB_STATUS[activeSub.status]?.label ?? activeSub.status}
                      color={SUB_STATUS[activeSub.status]?.color ?? '#6b7280'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-xs text-[var(--rogym-text-muted)]">Bắt đầu</p>
                      <p className="text-sm font-medium text-white mt-0.5">{formatDate(activeSub.startDate)}</p>
                    </div>
                    <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-xs text-[var(--rogym-text-muted)]">Hết hạn</p>
                      <p className="text-sm font-medium text-white mt-0.5">{formatDate(activeSub.endDate)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 gap-2 text-center">
                  <Dumbbell size={28} className="text-[var(--rogym-text-dim)]" />
                  <p className="text-sm text-[var(--rogym-text-secondary)]">Hội viên chưa có gói tập hoạt động.</p>
                </div>
              )}
            </div>

            {/* All subscriptions */}
            {member.subscriptions.length > 0 && (
              <div className="rogym-card rogym-card--compact p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} style={{ color: T }} />
                  <h3 className="text-base font-bold text-white">Lịch sử gói tập</h3>
                </div>
                <div className="flex flex-col gap-1">
                  {member.subscriptions
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(s => (
                      <div key={s.subscriptionId} className="flex items-center justify-between py-2.5 border-b border-[var(--rogym-border-section)] last:border-0">
                        <div>
                          <p className="text-sm text-white">{s.packageName}</p>
                          <p className="text-xs text-[var(--rogym-text-muted)] mt-0.5">
                            {formatDate(s.startDate)} – {formatDate(s.endDate)}
                          </p>
                        </div>
                        <Badge
                          label={SUB_STATUS[s.status]?.label ?? s.status}
                          color={SUB_STATUS[s.status]?.color ?? '#6b7280'}
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </StaffPage>
  )
}

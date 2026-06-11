import { User, Mail, Phone, Shield } from 'lucide-react'
import { Page, PageHeader } from '@/components/shared/PageUI'
import { useAuthStore } from '@/stores/authStore'

const G = '#06c384'

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--rogym-border-section)] py-3 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(6,195,132,0.1)' }}>
        <span style={{ color: G }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-[var(--rogym-text-muted)]">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  )
}

export default function OwnerProfilePage() {
  const user = useAuthStore((s) => s.user)

  if (!user) return null

  const initials = user.fullName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(-2)
    .join('')
    .toUpperCase()

  return (
    <Page>
      <PageHeader eyebrow="Tài khoản" title="Hồ sơ cá nhân" />

      <div className="mx-auto max-w-lg">
        <div className="rogym-card rogym-card--compact flex flex-col gap-4 p-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 border-b border-[var(--rogym-border-section)] pb-5">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold"
              style={{ background: `${G}1a`, border: `2px solid ${G}44`, color: G }}
            >
              {initials}
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">{user.fullName}</h2>
              <p className="mt-1 text-sm" style={{ color: G }}>Chủ phòng tập</p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: `${G}22`, color: G, border: `1px solid ${G}44` }}
            >
              {user.roles[0]?.toUpperCase() ?? 'OWNER'}
            </span>
          </div>

          <InfoRow icon={<Mail size={14} />} label="Email" value={user.email} />
          <InfoRow icon={<Phone size={14} />} label="Điện thoại" value={user.phone ?? 'Chưa cập nhật'} />
          <InfoRow icon={<User size={14} />} label="Trạng thái tài khoản" value={user.status === 'active' ? 'Hoạt động' : (user.status ?? 'Hoạt động')} />
          <InfoRow icon={<Shield size={14} />} label="Vai trò" value={user.roles.join(', ')} />
        </div>
      </div>
    </Page>
  )
}

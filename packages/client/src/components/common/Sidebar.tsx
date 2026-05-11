import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, TrendingUp,
  MessageSquare, Package, Wrench, DoorOpen,
  UserCog, BarChart3, Dumbbell,
} from 'lucide-react'
import type { Role } from '@/stores/authStore'

const navByRole: Record<Role, { label: string; to: string; icon: React.ElementType }[]> = {
  member: [
    { label: 'Tổng quan',      to: '/member/dashboard',  icon: LayoutDashboard },
    { label: 'Gói tập',        to: '/member/packages',   icon: Package },
    { label: 'Lịch tập',       to: '/member/schedule',   icon: Calendar },
    { label: 'Tiến độ',        to: '/member/progress',   icon: TrendingUp },
    { label: 'Phản hồi',       to: '/member/feedback',   icon: MessageSquare },
  ],
  trainer: [
    { label: 'Tổng quan',      to: '/trainer/dashboard', icon: LayoutDashboard },
    { label: 'Học viên',       to: '/trainer/members',   icon: Users },
    { label: 'Lịch tập',       to: '/trainer/schedule',  icon: Calendar },
  ],
  staff: [
    { label: 'Tổng quan',      to: '/staff/dashboard',   icon: LayoutDashboard },
    { label: 'Hội viên',       to: '/staff/members',     icon: Users },
    { label: 'Phòng tập',      to: '/staff/rooms',       icon: DoorOpen },
    { label: 'Thiết bị',       to: '/staff/equipment',   icon: Dumbbell },
    { label: 'Phản hồi',       to: '/staff/feedback',    icon: MessageSquare },
  ],
  owner: [
    { label: 'Tổng quan',      to: '/owner/dashboard',   icon: LayoutDashboard },
    { label: 'Gói tập',        to: '/owner/packages',    icon: Package },
    { label: 'Nhân sự',        to: '/owner/staff',       icon: UserCog },
    { label: 'Phân quyền',     to: '/owner/permissions', icon: Wrench },
    { label: 'Báo cáo',        to: '/owner/reports',     icon: BarChart3 },
    { label: 'Hội viên',       to: '/staff/members',     icon: Users },
    { label: 'Phòng tập',      to: '/staff/rooms',       icon: DoorOpen },
    { label: 'Thiết bị',       to: '/staff/equipment',   icon: Dumbbell },
    { label: 'Phản hồi',       to: '/staff/feedback',    icon: MessageSquare },
  ],
}

export default function Sidebar({ role }: { role: Role }) {
  const items = navByRole[role]

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4">
        <span className="text-lg font-bold text-primary-600">💪 GymPro</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {items.map(({ label, to, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

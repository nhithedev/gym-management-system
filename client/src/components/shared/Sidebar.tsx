import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  LayoutDashboard, User, CreditCard, Dumbbell, TrendingUp, MessageSquare,
  Users, CheckSquare, Building2, Wrench, Package, Shield, BarChart3,
  CalendarDays, BookOpen, ArrowLeft, Settings,
} from 'lucide-react';

type NavItem = { label: string; to: string; icon: React.ReactNode };

const MEMBER_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/member', icon: <LayoutDashboard size={18} /> },
  { label: 'Gói tập', to: '/member/subscription/current', icon: <CreditCard size={18} /> },
  { label: 'Lịch tập', to: '/member/workout/plan', icon: <Dumbbell size={18} /> },
  { label: 'Tiến độ', to: '/member/progress', icon: <TrendingUp size={18} /> },
  { label: 'Lịch PT', to: '/member/sessions', icon: <CalendarDays size={18} /> },
  { label: 'Phản hồi', to: '/member/feedback', icon: <MessageSquare size={18} /> },
  { label: 'Hồ sơ', to: '/member/profile', icon: <User size={18} /> },
];

const TRAINER_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/trainer', icon: <LayoutDashboard size={18} /> },
  { label: 'Học viên', to: '/trainer/students', icon: <Users size={18} /> },
  { label: 'Lịch dạy', to: '/trainer/sessions', icon: <CalendarDays size={18} /> },
  { label: 'Kế hoạch', to: '/trainer/plans', icon: <BookOpen size={18} /> },
  { label: 'Bài tập', to: '/trainer/exercises', icon: <Dumbbell size={18} /> },
  { label: 'Điểm danh', to: '/trainer/attendance', icon: <CheckSquare size={18} /> },
  { label: 'Hồ sơ', to: '/trainer/profile', icon: <User size={18} /> },
];

const STAFF_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/staff', icon: <LayoutDashboard size={18} /> },
  { label: 'Hội viên', to: '/staff/members', icon: <Users size={18} /> },
  { label: 'Check-in', to: '/staff/check-in', icon: <CheckSquare size={18} /> },
  { label: 'Phản hồi', to: '/staff/feedback', icon: <MessageSquare size={18} /> },
  { label: 'Phòng tập', to: '/staff/facility', icon: <Building2 size={18} /> },
  { label: 'Thiết bị', to: '/staff/equipment', icon: <Wrench size={18} /> },
  { label: 'Hồ sơ', to: '/staff/profile', icon: <User size={18} /> },
];

const OWNER_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/owner', icon: <LayoutDashboard size={18} /> },
  { label: 'Gói tập', to: '/owner/packages', icon: <Package size={18} /> },
  { label: 'Nhân sự', to: '/owner/staff', icon: <Users size={18} /> },
  { label: 'Phân quyền', to: '/owner/rbac/groups', icon: <Shield size={18} /> },
  { label: 'Báo cáo', to: '/owner/reports', icon: <BarChart3 size={18} /> },
  { label: 'Hồ sơ', to: '/owner/profile', icon: <User size={18} /> },
];

function NavItems({ items }: { items: NavItem[] }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to.split('/').length <= 2}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#06c384]/15 text-[#42e09e]'
                : 'text-[#bbcabf] hover:bg-white/5 hover:text-white'
            }`
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function Sidebar() {
  const { user, clearAuth } = useAuthStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const role = user?.roles[0];
  const isOwnerInStaffMode = role === 'owner' && pathname.startsWith('/staff');

  const navItems =
    role === 'member' ? MEMBER_NAV :
    role === 'trainer' ? TRAINER_NAV :
    (role === 'staff' || isOwnerInStaffMode) ? STAFF_NAV :
    role === 'owner' ? OWNER_NAV :
    [];

  return (
    <aside className="flex w-60 flex-col bg-[#0f1c16] border-r border-[rgba(66,224,158,0.08)]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#06c384]">
          <Dumbbell size={16} strokeWidth={2.2} className="text-white" />
        </div>
        <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 18, letterSpacing: '0.12em', color: '#fff' }}>
          ROGYM
        </span>
      </div>

      {/* Owner mode switch banner */}
      {role === 'owner' && isOwnerInStaffMode && (
        <button
          onClick={() => navigate('/owner')}
          className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-[rgba(66,224,158,0.2)] px-3 py-2 text-xs font-medium text-[#42e09e] hover:bg-[rgba(66,224,158,0.08)] transition-colors"
        >
          <ArrowLeft size={14} />
          Quay về Owner
        </button>
      )}
      {role === 'owner' && !isOwnerInStaffMode && (
        <button
          onClick={() => navigate('/staff')}
          className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.1)] px-3 py-2 text-xs font-medium text-[#bbcabf] hover:bg-white/5 transition-colors"
        >
          <Settings size={14} />
          Chế độ vận hành
        </button>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4">
        <NavItems items={navItems} />
      </div>

      {/* Logout */}
      <div className="border-t border-[rgba(255,255,255,0.05)] p-3">
        <button
          onClick={clearAuth}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#bbcabf] hover:bg-white/5 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}

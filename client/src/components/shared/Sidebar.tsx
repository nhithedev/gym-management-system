import { useState } from 'react';
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

const EASE = 'cubic-bezier(0.4,0,0.2,1)';
const LABEL_TRANSITION = `opacity 200ms ease, max-width 280ms ${EASE}, margin-left 280ms ${EASE}`;

function NavItems({ items, expanded }: { items: NavItem[]; expanded: boolean }) {
  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to.split('/').length <= 2}
          title={!expanded ? item.label : undefined}
          className={({ isActive }) =>
            `flex items-center py-2.5 rounded-xl text-sm font-medium transition-colors ${
              expanded ? 'px-3' : 'justify-center px-0'
            } ${
              isActive
                ? 'bg-[#06c384]/15 text-[#42e09e]'
                : 'text-[#bbcabf] hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <span className="shrink-0">{item.icon}</span>
          <span
            style={{
              opacity: expanded ? 1 : 0,
              maxWidth: expanded ? 160 : 0,
              marginLeft: expanded ? 12 : 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: LABEL_TRANSITION,
            }}
          >
            {item.label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}

const COLLAPSED_W = 68;
const EXPANDED_W  = 224;

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const role = user?.roles[0];
  const isOwnerInStaffMode = role === 'owner' && pathname.startsWith('/staff');

  const navItems =
    role === 'member'  ? MEMBER_NAV  :
    role === 'trainer' ? TRAINER_NAV :
    (role === 'staff' || isOwnerInStaffMode) ? STAFF_NAV :
    role === 'owner'   ? OWNER_NAV   :
    [];

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        position: 'fixed',
        left: 12,
        top: 12,
        bottom: 12,
        zIndex: 40,
        width: expanded ? EXPANDED_W : COLLAPSED_W,
        transition: `width 280ms ${EASE}`,
        background: '#0f1c16',
        border: '1px solid rgba(66,224,158,0.08)',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center"
        style={{
          height: 60,
          flexShrink: 0,
          justifyContent: expanded ? 'flex-start' : 'center',
          paddingLeft: expanded ? 16 : 0,
          transition: `padding-left 280ms ${EASE}, justify-content 0ms`,
        }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#06c384]">
          <Dumbbell size={16} strokeWidth={2.2} className="text-white" />
        </div>
        <span
          style={{
            fontFamily: "'Anton',sans-serif",
            fontSize: 18,
            letterSpacing: '0.12em',
            color: '#fff',
            opacity: expanded ? 1 : 0,
            maxWidth: expanded ? 120 : 0,
            marginLeft: expanded ? 10 : 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: LABEL_TRANSITION,
          }}
        >
          ROGYM
        </span>
      </div>

      {/* Owner mode switch */}
      {role === 'owner' && (
        <div className="px-2 pt-1" style={{ flexShrink: 0 }}>
          {isOwnerInStaffMode ? (
            <button
              onClick={() => navigate('/owner')}
              title={!expanded ? 'Quay về Owner' : undefined}
              className="w-full flex items-center rounded-xl border border-[rgba(66,224,158,0.2)] text-xs font-medium text-[#42e09e] hover:bg-[rgba(66,224,158,0.08)] transition-colors"
              style={{
                padding: '8px 0',
                justifyContent: expanded ? 'flex-start' : 'center',
                paddingLeft: expanded ? 12 : 0,
              }}
            >
              <ArrowLeft size={14} className="shrink-0" />
              <span
                style={{
                  opacity: expanded ? 1 : 0,
                  maxWidth: expanded ? 160 : 0,
                  marginLeft: expanded ? 8 : 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  transition: LABEL_TRANSITION,
                }}
              >
                Quay về Owner
              </span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/staff')}
              title={!expanded ? 'Chế độ vận hành' : undefined}
              className="w-full flex items-center rounded-xl border border-[rgba(255,255,255,0.1)] text-xs font-medium text-[#bbcabf] hover:bg-white/5 transition-colors"
              style={{
                padding: '8px 0',
                justifyContent: expanded ? 'flex-start' : 'center',
                paddingLeft: expanded ? 12 : 0,
              }}
            >
              <Settings size={14} className="shrink-0" />
              <span
                style={{
                  opacity: expanded ? 1 : 0,
                  maxWidth: expanded ? 160 : 0,
                  marginLeft: expanded ? 8 : 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  transition: LABEL_TRANSITION,
                }}
              >
                Chế độ vận hành
              </span>
            </button>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        <NavItems items={navItems} expanded={expanded} />
      </div>
    </aside>
  );
}

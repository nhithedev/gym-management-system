import { useRef, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import {
  LayoutDashboard, User, CreditCard, Dumbbell, TrendingUp, MessageSquare,
  Users, CheckSquare, Building2, Wrench, Package, Shield, BarChart3,
  CalendarDays, BookOpen, ArrowLeft, Settings,
} from 'lucide-react';

type SubItem = { label: string; to: string };

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  children?: SubItem[];
};

const BASE_SUBSCRIPTION_CHILDREN_ACTIVE: SubItem[] = [
  { label: 'Gói hiện tại', to: '/member/subscription/current' },
  { label: 'Gia hạn',      to: '/member/subscription/renew' },
  { label: 'Lịch sử',      to: '/member/subscription/history' },
];

const BASE_SUBSCRIPTION_CHILDREN_NONE: SubItem[] = [
  { label: 'Mua gói', to: '/member/subscription/setup' },
];

const BASE_SUBSCRIPTION_CHILDREN_ALL: SubItem[] = [
  { label: 'Gói hiện tại', to: '/member/subscription/current' },
  { label: 'Mua gói',      to: '/member/subscription/setup' },
  { label: 'Gia hạn',      to: '/member/subscription/renew' },
  { label: 'Lịch sử',      to: '/member/subscription/history' },
];

const TRAINER_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/trainer', icon: <LayoutDashboard size={18} /> },
  { label: 'Học viên',  to: '/trainer/students', icon: <Users size={18} /> },
  { label: 'Lịch dạy',  to: '/trainer/sessions', icon: <CalendarDays size={18} /> },
  { label: 'Kế hoạch',  to: '/trainer/plans',    icon: <BookOpen size={18} /> },
  { label: 'Bài tập',   to: '/trainer/exercises', icon: <Dumbbell size={18} /> },
  { label: 'Điểm danh', to: '/trainer/attendance', icon: <CheckSquare size={18} /> },
  { label: 'Hồ sơ',     to: '/trainer/profile',  icon: <User size={18} /> },
];

const STAFF_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/staff', icon: <LayoutDashboard size={18} /> },
  { label: 'Hội viên',  to: '/staff/members',   icon: <Users size={18} /> },
  { label: 'Check-in',  to: '/staff/check-in',  icon: <CheckSquare size={18} /> },
  { label: 'Phản hồi',  to: '/staff/feedback',  icon: <MessageSquare size={18} /> },
  { label: 'Phòng tập', to: '/staff/facility',  icon: <Building2 size={18} /> },
  { label: 'Thiết bị',  to: '/staff/equipment', icon: <Wrench size={18} /> },
  { label: 'Hồ sơ',     to: '/staff/profile',   icon: <User size={18} /> },
];

const OWNER_NAV: NavItem[] = [
  { label: 'Dashboard',  to: '/owner',              icon: <LayoutDashboard size={18} /> },
  { label: 'Gói tập',    to: '/owner/packages',     icon: <Package size={18} /> },
  { label: 'Nhân sự',    to: '/owner/staff',        icon: <Users size={18} /> },
  { label: 'Phân quyền', to: '/owner/rbac/groups',  icon: <Shield size={18} /> },
  { label: 'Báo cáo',    to: '/owner/reports',      icon: <BarChart3 size={18} /> },
  { label: 'Hồ sơ',      to: '/owner/profile',      icon: <User size={18} /> },
];

const EASE = 'cubic-bezier(0.4,0,0.2,1)';
const LABEL_TRANSITION = `opacity 200ms ease, max-width 280ms ${EASE}, margin-left 280ms ${EASE}`;
const SUB_ITEM_H = 32;

function isGroupActive(item: NavItem, pathname: string): boolean {
  if (!item.children) return false;
  return item.children.some(c => pathname === c.to || pathname.startsWith(c.to + '/'));
}

function NavItems({ items, expanded }: { items: NavItem[]; expanded: boolean }) {
  const { pathname } = useLocation();

  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item) => {
        const hasChildren = !!item.children?.length;
        const groupActive = hasChildren && isGroupActive(item, pathname);
        const showChildren = expanded && hasChildren && groupActive;

        return (
          <div key={item.to}>
            <NavLink
              to={item.to}
              end={!hasChildren}
              title={!expanded ? item.label : undefined}
              className={({ isActive }) => {
                const active = hasChildren ? groupActive : isActive;
                return `rogym-sweep flex items-center py-2.5 rounded-xl text-sm font-medium ${
                  expanded ? 'px-3' : 'justify-center px-0'
                } ${
                  active
                    ? 'bg-[#06c384]/15 text-[#42e09e]'
                    : 'text-[#bbcabf] hover:text-white'
                }`;
              }}
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
                  flex: 1,
                }}
              >
                {item.label}
              </span>
            </NavLink>

            {/* Sub-items — only shown when expanded AND this group is active */}
            {hasChildren && (
              <div
                style={{
                  overflow: 'hidden',
                  maxHeight: showChildren ? item.children!.length * (SUB_ITEM_H + 2) + 16 : 0,
                  transition: `max-height 260ms ${EASE}`,
                }}
              >
                <div className="flex flex-col gap-0.5 pl-3 pr-1 pt-1 pb-1">
                  {item.children!.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end
                      className={({ isActive }) =>
                        `rogym-sweep flex items-center rounded-lg text-xs font-medium px-3 ${
                          isActive
                            ? 'text-[#42e09e] bg-[#06c384]/10'
                            : 'text-[#bbcabf] hover:text-white'
                        }`
                      }
                      style={{ height: SUB_ITEM_H }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: 'currentColor',
                          marginRight: 8,
                          flexShrink: 0,
                          opacity: 0.6,
                        }}
                      />
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

const COLLAPSED_W = 68;
const EXPANDED_W  = 224;

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hasActiveSub = useSubscriptionStore(s => s.hasActiveSub);
  const clearSubscription = useSubscriptionStore(s => s.clear);

  // Clear subscription state on logout
  useEffect(() => {
    if (!isAuthenticated) clearSubscription();
  }, [isAuthenticated, clearSubscription]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, []);

  function handleMouseEnter() {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    setExpanded(true);
  }

  function handleMouseLeave() {
    closeTimerRef.current = setTimeout(() => setExpanded(false), 1000);
  }

  const role = user?.roles[0];
  const isOwnerInStaffMode = role === 'owner' && pathname.startsWith('/staff');

  const memberNav = useMemo<NavItem[]>(() => {
    const subscriptionChildren =
      hasActiveSub === false ? BASE_SUBSCRIPTION_CHILDREN_NONE :
      hasActiveSub === true  ? BASE_SUBSCRIPTION_CHILDREN_ACTIVE :
      BASE_SUBSCRIPTION_CHILDREN_ALL;
    const memberSubTo =
      hasActiveSub === false ? '/member/subscription/setup' : '/member/subscription/current';

    return [
      { label: 'Dashboard', to: '/member', icon: <LayoutDashboard size={18} /> },
      {
        label: 'Gói tập', to: memberSubTo, icon: <CreditCard size={18} />,
        children: subscriptionChildren,
      },
      {
        label: 'Lịch tập', to: '/member/workout/plan', icon: <Dumbbell size={18} />,
        children: [
          { label: 'Kế hoạch',      to: '/member/workout/plan' },
          { label: 'Bài tập',       to: '/member/workout/exercises' },
          { label: 'Tạo kế hoạch',  to: '/member/workout/builder' },
          { label: 'Lịch sử',       to: '/member/workout/history' },
          { label: 'Lịch của tôi',  to: '/member/workout/sessions' },
        ],
      },
      { label: 'Tiến độ',  to: '/member/progress',  icon: <TrendingUp size={18} /> },
      {
        label: 'Phản hồi', to: '/member/feedback', icon: <MessageSquare size={18} />,
        children: [
          { label: 'Phản hồi của tôi', to: '/member/feedback' },
          { label: 'Gửi phản hồi',     to: '/member/feedback/send' },
        ],
      },
      { label: 'Hồ sơ', to: '/member/profile', icon: <User size={18} /> },
    ];
  }, [hasActiveSub]);

  const navItems =
    role === 'member'  ? memberNav   :
    role === 'trainer' ? TRAINER_NAV :
    (role === 'staff' || isOwnerInStaffMode) ? STAFF_NAV :
    role === 'owner'   ? OWNER_NAV   :
    [];

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
              className="w-full flex items-center rounded-xl border border-[rgba(66,224,158,0.2)] text-xs font-medium text-[#42e09e]"
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
              className="w-full flex items-center rounded-xl border border-[rgba(255,255,255,0.1)] text-xs font-medium text-[#bbcabf]"
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

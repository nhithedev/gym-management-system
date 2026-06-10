import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, CreditCard, LogOut, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

const PAGE_TITLES: [RegExp | string, string][] = [
  // Member — subscription
  ['/member/subscription/history',        'Lịch sử gói tập'],
  ['/member/subscription/setup',          'Đăng ký gói tập'],
  ['/member/subscription/current',        'Gói tập hiện tại'],
  ['/member/subscription/buy/payment',    'Thanh toán'],
  ['/member/subscription/renew/payment',  'Thanh toán gia hạn'],
  ['/member/subscription/renew',          'Gia hạn gói tập'],
  ['/member/payment-accounts',            'Tài khoản thanh toán'],
  // Member — workout
  ['/member/workout/attendance',   'Điểm danh'],
  ['/member/workout/history',      'Lịch sử tập luyện'],
  [/^\/member\/workout\/session\//, 'Buổi tập'],
  ['/member/workout/builder',      'Tạo kế hoạch tập'],
  ['/member/workout/plan',         'Kế hoạch tập'],
  // Member — other
  ['/member/feedback/send',        'Gửi phản hồi'],
  ['/member/feedback',             'Phản hồi của tôi'],
  ['/member/sessions',             'Lịch hẹn PT'],
  ['/member/progress',             'Tiến độ'],
  ['/member/profile',              'Hồ sơ cá nhân'],
  ['/member',                      'Tổng quan'],
  // Trainer
  [/^\/trainer\/students\/.+\/progress\/list/, 'Lịch sử tiến độ'],
  [/^\/trainer\/students\/.+\/progress/,       'Thêm tiến độ'],
  [/^\/trainer\/students\/.+/,                 'Chi tiết học viên'],
  ['/trainer/students',            'Học viên'],
  ['/trainer/sessions/create',     'Tạo buổi học'],
  [/^\/trainer\/sessions\/.+\/edit/, 'Sửa buổi học'],
  [/^\/trainer\/sessions\/.+/,     'Chi tiết buổi học'],
  ['/trainer/sessions',            'Lịch dạy'],
  ['/trainer/calendar',            'Lịch dạy'],
  [/^\/trainer\/plans\/.+\/builder/, 'Xây dựng giáo án'],
  ['/trainer/plans',               'Kế hoạch tập'],
  ['/trainer/exercises',           'Bài tập'],
  ['/trainer/attendance',          'Điểm danh'],
  ['/trainer/profile',             'Hồ sơ'],
  ['/trainer',                     'Tổng quan'],
  // Staff
  [/^\/staff\/members\/.+/,        'Chi tiết hội viên'],
  ['/staff/members',               'Hội viên'],
  ['/staff/check-in',              'Check-in'],
  ['/staff/feedback',              'Phản hồi'],
  ['/staff/facility',              'Phòng tập'],
  ['/staff/equipment',             'Thiết bị'],
  ['/staff/profile',               'Hồ sơ'],
  ['/staff',                       'Tổng quan'],
  // Owner
  ['/owner/packages',              'Gói tập'],
  [/^\/owner\/staff\/.+/,          'Chi tiết nhân viên'],
  ['/owner/staff',                 'Nhân sự'],
  ['/owner/rbac/groups',           'Nhóm quyền'],
  ['/owner/rbac/permissions',      'Quyền hạn'],
  ['/owner/reports/revenue',       'Doanh thu'],
  ['/owner/reports',               'Báo cáo'],
  ['/owner/profile',               'Hồ sơ'],
  ['/owner',                       'Tổng quan'],
];

function getPageTitle(pathname: string): string {
  for (const [matcher, title] of PAGE_TITLES) {
    if (matcher instanceof RegExp) {
      if (matcher.test(pathname)) return title;
    } else if (pathname.startsWith(matcher)) {
      return title;
    }
  }
  return '';
}

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const role = user?.roles[0];
  const initials = user?.fullName
    ? user.fullName.trim().charAt(0).toUpperCase()
    : '?';

  const hasActiveSub = useSubscriptionStore(s => s.hasActiveSub);
  const showSubCta = role === 'member' && hasActiveSub === false;

  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function goProfile() {
    setOpen(false);
    if (role) navigate(`/${role}/profile`);
  }

  function goPayment() {
    setOpen(false);
    navigate('/member/payment-accounts');
  }

  function handleLogout() {
    setOpen(false);
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <header
      style={{
        height: 56,
        background: 'rgba(8,14,11,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(66,224,158,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 20,
        paddingRight: 20,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Page title */}
      <span
        style={{
          fontFamily: "'Anton',sans-serif",
          fontSize: 16,
          letterSpacing: '0.04em',
          color: '#ffffff',
          opacity: pageTitle ? 1 : 0,
          transition: 'opacity 150ms ease',
        }}
      >
        {pageTitle}
      </span>

      {/* Right side: sub CTA (no-sub member) + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {showSubCta && (
          <button
            onClick={() => navigate('/member/subscription/setup')}
            className="rogym-btn--primary"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#06c384', color: '#00492f',
              border: 'none', borderRadius: 999,
              padding: '6px 14px', fontSize: 12, fontWeight: 700,
              fontFamily: "'Be Vietnam Pro',sans-serif",
              cursor: 'pointer', letterSpacing: '0.01em',
            }}
          >
            <ShoppingBag size={13} /> Đăng ký gói tập
          </button>
        )}

      {/* Avatar button + dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: '#06c384',
            border: open ? '2px solid #42e09e' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Be Vietnam Pro',sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: '#00492f',
            transition: 'border-color 150ms ease',
            flexShrink: 0,
          }}
        >
          {initials}
        </button>

        {/* Dropdown */}
        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: 220,
              background: '#0f1c16',
              border: '1px solid rgba(66,224,158,0.08)',
              borderRadius: 16,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              overflow: 'hidden',
              animation: 'dropdown-in 180ms cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            {/* User info header */}
            <div
              style={{
                padding: '14px 16px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#06c384',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Be Vietnam Pro',sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#00492f',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Be Vietnam Pro',sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.fullName}
                </div>
                <div
                  style={{
                    fontFamily: "'Be Vietnam Pro',sans-serif",
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.35)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: '6px 0' }}>
              <DropdownItem icon={<User size={15} />} onClick={goProfile}>
                Hồ sơ
              </DropdownItem>

              {role === 'member' && (
                <DropdownItem icon={<CreditCard size={15} />} onClick={goPayment}>
                  Tài khoản thanh toán
                </DropdownItem>
              )}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '6px 0' }}>
              <DropdownItem
                icon={<LogOut size={15} />}
                onClick={handleLogout}
                danger
              >
                Đăng xuất
              </DropdownItem>
            </div>
          </div>
        )}
      </div>
      </div>{/* end right side */}

      <style>{`
        @keyframes dropdown-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}

function DropdownItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={danger ? 'rogym-sweep hover:text-[#ff6b6b]' : 'rogym-sweep hover:text-white'}
      style={{
        ['--rogym-button-sweep' as string]: danger ? 'rgba(255,107,107,0.1)' : 'rgba(255,255,255,0.07)',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 16px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: "'Be Vietnam Pro',sans-serif",
        fontSize: 13,
        fontWeight: 500,
        color: danger ? 'rgba(255,107,107,0.7)' : '#bbcabf',
        textAlign: 'left',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

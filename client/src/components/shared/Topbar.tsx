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
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
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
    const isOwnerInStaffMode = role === 'owner' && pathname.startsWith('/staff');
    navigate(`/${isOwnerInStaffMode ? 'staff' : role}/profile`);
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
      className="rogym-sx-91cd6460"
    >
      {/* Page title */}
      <span className={`rogym-topbar__title ${pageTitle ? 'is-visible' : ''}`}>
        {pageTitle}
      </span>

      {/* Right side: sub CTA (no-sub member) + avatar */}
      <div className="rogym-sx-22ba4a0f">
        {showSubCta && (
          <button
            onClick={() => navigate('/member/subscription/setup')}
            className="rogym-btn--primary rogym-sx-ca063821"
            
          >
            <ShoppingBag size={13} /> Đăng ký gói tập
          </button>
        )}

      {/* Avatar button + dropdown */}
      <div ref={dropdownRef} className="rogym-sx-50666a57">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`rogym-topbar__avatar ${open ? 'is-open' : ''}`}
        >
          {initials}
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className="rogym-sx-f10cbe0f"
          >
            {/* User info header */}
            <div
              className="rogym-sx-3d17be38"
            >
              <div
                className="rogym-sx-09581911"
              >
                {initials}
              </div>
              <div className="rogym-sx-2cd52ab9">
                <div
                  className="rogym-sx-ac999974"
                >
                  {user?.fullName}
                </div>
                <div
                  className="rogym-sx-f57809e3"
                >
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="rogym-sx-df676766">
              <DropdownItem icon={<User size={15} />} onClick={goProfile}>
                Hồ sơ
              </DropdownItem>

              {role === 'member' && (
                <DropdownItem icon={<CreditCard size={15} />} onClick={goPayment}>
                  Tài khoản thanh toán
                </DropdownItem>
              )}
            </div>

            <div className="rogym-sx-75f1302c">
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
      className={`rogym-dropdown-item rogym-sweep ${danger ? 'is-danger' : ''}`}
    >
      {icon}
      {children}
    </button>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, CreditCard, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const role = user?.roles[0];
  const initials = user?.fullName
    ? user.fullName.trim().charAt(0).toUpperCase()
    : '?';

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
    navigate('/member/subscription/current');
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
        justifyContent: 'flex-end',
        paddingRight: 20,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
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
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 16px',
        background: hovered ? (danger ? 'rgba(255,107,107,0.08)' : 'rgba(255,255,255,0.05)') : 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: "'Be Vietnam Pro',sans-serif",
        fontSize: 13,
        fontWeight: 500,
        color: danger ? (hovered ? '#ff6b6b' : 'rgba(255,107,107,0.7)') : (hovered ? '#fff' : '#bbcabf'),
        transition: 'background 120ms ease, color 120ms ease',
        textAlign: 'left',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

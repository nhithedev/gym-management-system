import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Dumbbell, ArrowLeft, Mail, Lock, User,
  CheckSquare, Shield, type LucideIcon,
} from "lucide-react";
import gym from "@/assets/gym-bg.jpg";
import { authService } from "@/services/auth.service";
import { useAuthStore, type AuthUser } from "@/stores/authStore";

const G = "#06c384";
const T = "#42e09e";

const roleRouteMap: Record<string, string> = {
  member: "/member",
  trainer: "/trainer",
  staff: "/staff",
  owner: "/owner",
};

const MOCK_ACCOUNTS = [
  {
    label: "Member",
    icon: User,
    color: "#3b82f6",
    user: {
      userId: "mock-1",
      email: "member@rogym.vn",
      fullName: "Nguyễn Văn An",
      roles: ["member" as const],
      memberId: "mem-001",
    },
  },
  {
    label: "Trainer",
    icon: Dumbbell,
    color: "#8b5cf6",
    user: {
      userId: "mock-2",
      email: "trainer@rogym.vn",
      fullName: "Trần Thị Bình",
      roles: ["trainer" as const],
    },
  },
  {
    label: "Staff",
    icon: CheckSquare,
    color: "#f59e0b",
    user: {
      userId: "mock-3",
      email: "staff@rogym.vn",
      fullName: "Lê Văn Cường",
      roles: ["staff" as const],
    },
  },
  {
    label: "Owner",
    icon: Shield,
    color: G,
    user: {
      userId: "mock-4",
      email: "owner@rogym.vn",
      fullName: "Phạm Thị Dung",
      roles: ["owner" as const],
    },
  },
];

function BtnPrimary({
  children,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="rogym-btn rogym-btn--primary rogym-btn--wide"
    >
      <span className="flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon: Icon,
  right,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  icon?: LucideIcon;
  right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon size={15} color={focused ? T : "rgba(255,255,255,0.25)"} strokeWidth={2} />
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.style.border = `1px solid ${T}`;
            e.currentTarget.style.background = "rgba(66,224,158,0.05)";
          }}
          onBlur={(e) => {
            setFocused(false);
            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          }}
          className="w-full rounded-xl py-3 text-sm outline-none transition-all duration-200 placeholder:text-[rgba(255,255,255,0.2)]"
          style={{
            fontFamily: "'Be Vietnam Pro',sans-serif",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            paddingLeft: Icon ? 40 : 14,
            paddingRight: right ? 44 : 14,
          }}
        />
        {right && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>
        )}
      </div>
    </div>
  );
}

function MockCard({
  label,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      className="rogym-sweep-surface"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "14px 8px",
        borderRadius: 16,
        background: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? color + "60" : "rgba(255,255,255,0.08)"}`,
        cursor: "pointer",
        transition: "all 180ms ease",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: color + "20",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={18} color={color} strokeWidth={2} />
      </div>
      <span
        style={{
          fontFamily: "'Be Vietnam Pro',sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: hovered ? "#fff" : "rgba(255,255,255,0.55)",
          transition: "color 180ms ease",
        }}
      >
        {label}
      </span>
    </button>
  );
}

export default function QuickLoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  function handleMockLogin(account: typeof MOCK_ACCOUNTS[number]) {
    setAuth(account.user as AuthUser, "mock-token");
    navigate(roleRouteMap[account.user.roles[0]] ?? "/", { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user, token } = await authService.login(email, pass);
      setAuth(user, token);
      navigate(roleRouteMap[user.roles[0]] ?? "/", { replace: true });
    } catch {
      setError("Email hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden" style={{ background: "#080e0b" }}>
      {/* Blurred gym background */}
      <div className="absolute inset-0">
        <img
          src={gym}
          alt=""
          className="absolute w-full h-full object-cover object-center"
          style={{ filter: "blur(10px) brightness(0.28) saturate(0.55)", transform: "scale(1.06)" }}
        />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(6,195,132,0.07) 0%, transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "rgba(8,14,11,0.5)" }} />
      </div>

      {/* Back to member login */}
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="rogym-text-link rogym-text-link--muted absolute top-6 left-6 z-20"
        style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500, background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        <ArrowLeft size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
        <span>Đăng nhập thành viên</span>
      </button>

      {/* Card */}
      <div className="relative z-10 w-full mx-4" style={{ maxWidth: 400 }}>
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-7">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: G }}>
            <Dumbbell size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, color: "#fff", letterSpacing: "0.12em" }}>
            ROGYM
          </span>
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(12,22,17,0.82)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Mock accounts section */}
          <div className="mb-6">
            <p
              style={{
                fontFamily: "'Be Vietnam Pro',sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Xem trước giao diện
            </p>
            <div className="flex gap-2">
              {MOCK_ACCOUNTS.map((acc) => (
                <MockCard
                  key={acc.label}
                  label={acc.label}
                  icon={acc.icon}
                  color={acc.color}
                  onClick={() => handleMockLogin(acc)}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
              hoặc đăng nhập thực
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="text-center mb-1">
              <h1 style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.3 }}>
                Đăng nhập nội bộ
              </h1>
              <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
                Dành cho Huấn luyện viên, Nhân viên &amp; Quản lý
              </p>
            </div>

            <Field label="Email" type="email" placeholder="ten@rogym.vn" value={email} onChange={setEmail} icon={Mail} />
            <Field
              label="Mật khẩu"
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={pass}
              onChange={setPass}
              icon={Lock}
              right={
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ color: "rgba(255,255,255,0.3)", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                  {showPass ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
                </button>
              }
            />

            {error && (
              <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "#ff6b6b", textAlign: "center" }}>
                {error}
              </p>
            )}

            <BtnPrimary type="submit" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </BtnPrimary>
          </form>
        </div>
      </div>
    </div>
  );
}

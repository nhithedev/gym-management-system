import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Dumbbell, ArrowLeft, Mail, Lock, User,
  CheckSquare, Shield, type LucideIcon,
} from "lucide-react";
import gym from "@/assets/gym-bg-optimized.jpg";
import { authService } from "@/services/auth.service";
import { useAuthStore, type AuthUser } from "@/stores/authStore";

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
    tone: "member",
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
    tone: "trainer",
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
    tone: "staff",
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
    tone: "owner",
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
  return (
    <div className="flex flex-col gap-1.5">
      <label className="rogym-sx-c72a6bf5">
        {label}
      </label>
      <div className="rogym-auth-field relative">
        {Icon && (
          <div className="rogym-auth-field__icon absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon size={15} strokeWidth={2} />
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`rogym-auth-field__input w-full rounded-xl py-3 text-sm outline-none transition-all duration-200 placeholder:text-[rgba(255,255,255,0.2)] ${
            Icon ? 'has-icon' : ''
          } ${right ? 'has-action' : ''}`}
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
  tone,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rogym-quick-role rogym-quick-role--${tone} rogym-sweep-surface`}
    >
      <div className="rogym-quick-role__icon">
        <Icon size={18} strokeWidth={2} />
      </div>
      <span className="rogym-quick-role__label">
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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden rogym-sx-7b5fda64" >
      {/* Blurred gym background */}
      <div className="absolute inset-0">
        <img
          src={gym}
          alt=""
          className="absolute w-full h-full object-cover object-center rogym-sx-27af414f"
          
        />
        <div className="absolute inset-0 rogym-sx-3e33f998"  />
        <div className="absolute inset-0 rogym-sx-7bbccc2e"  />
      </div>

      {/* Back to member login */}
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="rogym-text-link rogym-text-link--muted absolute top-6 left-6 z-20 rogym-sx-68a7452b"
        
      >
        <ArrowLeft size={14} strokeWidth={2} className="rogym-sx-c2bafe49" />
        <span>Đăng nhập thành viên</span>
      </button>

      {/* Card */}
      <div className="relative z-10 w-full mx-4 rogym-sx-2c8110d4" >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-7">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center rogym-sx-1c639e32" >
            <Dumbbell size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <span className="rogym-sx-f326e6e8">
            ROGYM
          </span>
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-8 rogym-sx-a4968112"
          
        >
          {/* Mock accounts section */}
          <div className="mb-6">
            <p
              className="rogym-sx-d025733d"
            >
              Xem trước giao diện
            </p>
            <div className="flex gap-2">
              {MOCK_ACCOUNTS.map((acc) => (
                <MockCard
                  key={acc.label}
                  label={acc.label}
                  icon={acc.icon}
                  tone={acc.tone}
                  onClick={() => handleMockLogin(acc)}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="rogym-sx-ae19996e" />
            <span className="rogym-sx-7d3000c1">
              hoặc đăng nhập thực
            </span>
            <div className="rogym-sx-ae19996e" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="text-center mb-1">
              <h1 className="rogym-sx-4d6285f7">
                Đăng nhập nội bộ
              </h1>
              <p className="rogym-sx-8a118ffb">
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
                <button type="button" onClick={() => setShowPass(!showPass)} className="rogym-sx-4baf3f03">
                  {showPass ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
                </button>
              }
            />

            {error && (
              <p className="rogym-sx-d50aacc0">
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

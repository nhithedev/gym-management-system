import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/authStore";
import {
  AuthShell, BtnPrimary,
  TextLink, MutedLink, Field, ErrorMsg,
} from "./_authui";

const roleRouteMap: Record<string, string> = {
  member: "/member",
  trainer: "/trainer",
  staff: "/staff",
  owner: "/owner",
};

// Pre-filled credentials for development (from seed data)
const DEV_CREDENTIALS: Record<string, { email: string }> = {
  owner: { email: "owner@gym.local" },
  staff: { email: "staff.linh@gym.local" },
  trainer: { email: "trainer.minh@gym.local" },
  member: { email: "nguyen.van.a@email.com" },
};

type Role = "owner" | "staff" | "trainer" | "member";

const ROLE_VARIANTS: Record<Role, string> = {
  owner: "",
  staff: "rogym-quick-role--staff",
  trainer: "rogym-quick-role--trainer",
  member: "rogym-quick-role--member",
};


const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  staff: "Staff",
  trainer: "Trainer",
  member: "Member",
};

export default function LoginPage() {
  const [showInternalRoles, setShowInternalRoles] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>("member");
  const [email, setEmail] = useState(DEV_CREDENTIALS.member.email);
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  function handleRoleSelect(role: Role) {
    setSelectedRole(role);
    setEmail(DEV_CREDENTIALS[role].email);
    setPass("Password123!");
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
    <AuthShell>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold text-white">
            {showInternalRoles ? "Đăng nhập nội bộ" : "Chào mừng trở lại"}
          </h1>
          <p className="text-sm text-white/70">
            {showInternalRoles 
              ? "Chọn vai trò và đăng nhập"
              : "Đăng nhập để tiếp tục hành trình của bạn"
            }
          </p>
        </div>

        {/* MEMBER LOGIN VIEW */}
        {!showInternalRoles && (
          <>
            <div className="space-y-4">
              <Field 
                label="Email" 
                type="email" 
                placeholder="ten@email.com" 
                value={email} 
                onChange={setEmail} 
              />
              <Field
                label="Mật khẩu"
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={setPass}
              />
            </div>

            <div className="flex justify-end">
              <MutedLink to="/forgot-password">Quên mật khẩu?</MutedLink>
            </div>

            {error && <ErrorMsg message={error} />}

            <BtnPrimary type="submit" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </BtnPrimary>

            <p className="text-center text-sm text-white/70">
              Chưa có tài khoản?{" "}
              <TextLink to="/member/register">Đăng ký ngay</TextLink>
            </p>

            <button
              type="button"
              onClick={() => {
                setShowInternalRoles(true);
                setSelectedRole("owner");
                setEmail(DEV_CREDENTIALS.owner.email);
                setPass("Password123!");
                setError("");
              }}
              className="rogym-btn rogym-btn--outline-white rogym-btn--wide"
            >
              Vai trò khác
            </button>
          </>
        )}

        {/* INTERNAL ROLES VIEW */}
        {showInternalRoles && (
          <>
            {/* Role Selector */}
            <div className="flex gap-2 justify-center flex-wrap bg-white/5 p-4 rounded-xl">
              {(["owner", "staff", "trainer"] as Role[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleSelect(role)}
                  className={`rogym-quick-role ${ROLE_VARIANTS[role]} ${selectedRole === role ? "is-selected" : ""}`}
                  aria-pressed={selectedRole === role}
                >
                  <div className="rogym-quick-role__icon">
                    <span className="text-lg">
                      {role === "owner" && "👑"}
                      {role === "staff" && "👥"}
                      {role === "trainer" && "💪"}
                    </span>
                  </div>
                  <div className="rogym-quick-role__label">{ROLE_LABELS[role]}</div>
                </button>
              ))}
            </div>

            <div className="h-px bg-white/10" />

            <div className="space-y-4">
              <Field 
                label="Email" 
                type="email" 
                placeholder="ten@email.com" 
                value={email} 
                onChange={setEmail} 
              />
              <Field
                label="Mật khẩu"
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={setPass}
              />
            </div>

            {error && <ErrorMsg message={error} />}

            <BtnPrimary type="submit" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </BtnPrimary>

            <button
              type="button"
              onClick={() => {
                setShowInternalRoles(false);
                setSelectedRole("member");
                setEmail(DEV_CREDENTIALS.member.email);
                setPass("");
                setError("");
              }}
              className="rogym-btn rogym-btn--outline-white rogym-btn--wide"
            >
              Đăng nhập hội viên
            </button>
          </>
        )}
      </form>
    </AuthShell>
  );
}

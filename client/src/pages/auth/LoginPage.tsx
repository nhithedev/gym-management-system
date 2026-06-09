import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/authStore";
import {
  AuthShell, BtnPrimary, BtnOutlineWhite,
  TextLink, MutedLink, Field, ErrorMsg, Divider,
} from "./_authui";

const roleRouteMap: Record<string, string> = {
  member: "/member",
  trainer: "/trainer",
  staff: "/staff",
  owner: "/owner",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

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
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="text-center mb-1">
          <h1 style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.3 }}>
            Chào mừng trở lại
          </h1>
          <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
            Đăng nhập để tiếp tục hành trình của bạn
          </p>
        </div>

        <Field label="Email" type="email" placeholder="ten@email.com" value={email} onChange={setEmail} icon={Mail} />
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

        <div className="flex justify-end -mt-2">
          <MutedLink to="/forgot-password">Quên mật khẩu?</MutedLink>
        </div>

        {error && <ErrorMsg message={error} />}

        <BtnPrimary type="submit" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </BtnPrimary>

        <Divider label="hoặc" />

        <BtnOutlineWhite onClick={() => navigate("/login/other")}>
          <User size={15} strokeWidth={2} />
          Vai trò khác
        </BtnOutlineWhite>

        <p className="text-center" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          Chưa có tài khoản?{" "}
          <TextLink to="/member/register">Đăng ký ngay</TextLink>
        </p>
      </form>
    </AuthShell>
  );
}

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
          <h1 className="rogym-sx-4d6285f7">
            Chào mừng trở lại
          </h1>
          <p className="rogym-sx-0a664e64">
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
            <button type="button" onClick={() => setShowPass(!showPass)} className="rogym-sx-4baf3f03">
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

        <p className="text-center rogym-sx-0668b2bf" >
          Chưa có tài khoản?{" "}
          <TextLink to="/member/register">Đăng ký ngay</TextLink>
        </p>
      </form>
    </AuthShell>
  );
}

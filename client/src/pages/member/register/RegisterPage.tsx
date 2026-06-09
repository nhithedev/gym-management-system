import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, Mail, Lock } from "lucide-react";
import { authService } from "@/services/auth.service";
import {
  AuthShell, BtnPrimary, BtnOutlineWhite,
  TextLink, Field, PasswordField, ErrorMsg, Divider,
} from "@/pages/auth/_authui";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pass !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (pass.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authService.register(name, phone, email, pass);
      navigate("/member/verify-email", { state: { email } });
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      const status = e?.response?.status;
      if (status === 409) {
        setError("Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.");
      } else if (status === 429) {
        setError("Bạn thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.");
      } else if (!e?.response) {
        setError("Không thể kết nối. Kiểm tra mạng và thử lại.");
      } else {
        setError(e?.response?.data?.message || "Đăng ký thất bại. Email có thể đã được sử dụng.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell maxWidth={480}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="text-center mb-1">
          <h1 style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.3 }}>
            Tạo tài khoản
          </h1>
          <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
            Gia nhập cộng đồng RoGym ngay hôm nay
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Họ và tên" placeholder="Nguyễn Văn A" value={name} onChange={setName} icon={User} />
          <Field label="Số điện thoại" placeholder="0912 345 678" value={phone} onChange={setPhone} icon={Phone} />
        </div>
        <Field label="Email" type="email" placeholder="ten@email.com" value={email} onChange={setEmail} icon={Mail} />
        <PasswordField label="Mật khẩu" placeholder="Tối thiểu 8 ký tự" value={pass} onChange={setPass} icon={Lock} />
        <PasswordField label="Xác nhận mật khẩu" value={confirm} onChange={setConfirm} icon={Lock} />

        {error && <ErrorMsg message={error} />}

        <BtnPrimary type="submit" disabled={loading}>
          {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </BtnPrimary>

        <p className="text-center" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.65 }}>
          Bằng cách đăng ký, bạn đồng ý với{" "}
          <TextLink>Điều khoản dịch vụ</TextLink>
          {" "}và{" "}
          <TextLink>Chính sách bảo mật</TextLink>.
        </p>

        <Divider label="đã có tài khoản?" />

        <BtnOutlineWhite onClick={() => navigate("/login")}>Đăng nhập</BtnOutlineWhite>
      </form>
    </AuthShell>
  );
}

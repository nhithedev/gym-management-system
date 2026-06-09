import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { authService } from "@/services/auth.service";
import {
  AuthShell, BtnPrimary, TextLink, Field, ErrorMsg, G, T,
} from "./_authui";
import { useNavigate } from "react-router-dom";

function ForgotView({ onSent }: { onSent: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      onSent();
    } catch {
      setError("Không tìm thấy email. Vui lòng kiểm tra lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="flex items-center gap-1.5 w-fit relative group"
        style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        <ArrowLeft size={14} strokeWidth={2} />
        <span>Quay lại đăng nhập</span>
        <span
          className="absolute bottom-[-2px] left-5 h-[1.5px] w-0 group-hover:w-[calc(100%-20px)] rounded-full"
          style={{ background: "rgba(255,255,255,0.4)", transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </button>

      <div className="text-center my-2">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(66,224,158,0.1)", border: "1px solid rgba(66,224,158,0.2)" }}>
          <Mail size={24} color={T} strokeWidth={1.5} />
        </div>
        <h1 style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8, lineHeight: 1.3 }}>
          Quên mật khẩu?
        </h1>
        <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>
          Nhập email đã đăng ký. Chúng tôi sẽ gửi OTP để đặt lại mật khẩu.
        </p>
      </div>

      <Field label="Email" type="email" placeholder="ten@email.com" value={email} onChange={setEmail} icon={Mail} />

      {error && <ErrorMsg message={error} />}

      <BtnPrimary type="submit" disabled={loading}>
        {loading ? "Đang gửi..." : "Gửi mã OTP"}
      </BtnPrimary>
    </form>
  );
}

function SentView() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5 items-center text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(6,195,132,0.12)", border: `1px solid rgba(6,195,132,0.25)` }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 6l-10 7L2 6" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div>
        <h1 style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8, lineHeight: 1.3 }}>
          Email đã được gửi!
        </h1>
        <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
          Kiểm tra hộp thư và dùng mã OTP để đặt lại mật khẩu.
        </p>
      </div>

      <BtnPrimary onClick={() => navigate("/reset-password")}>
        Nhập mã OTP
      </BtnPrimary>

      <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
        Quay lại?{" "}
        <TextLink to="/login">Đăng nhập</TextLink>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  return (
    <AuthShell>
      {sent ? <SentView /> : <ForgotView onSent={() => setSent(true)} />}
    </AuthShell>
  );
}

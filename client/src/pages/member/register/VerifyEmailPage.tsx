import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail } from "lucide-react";
import { AuthShell, BtnPrimary, TextLink, ErrorMsg, T } from "@/pages/auth/_authui";
import { authService } from "@/services/auth.service";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/* ── 6-box OTP input ── */
function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, char: string) {
    const digit = char.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (value[index]) {
        const next = [...value];
        next[index] = "";
        onChange(next);
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    onChange(next);
    const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
    refs.current[focusIndex]?.focus();
  }

  return (
    <div className="flex gap-2.5 justify-center">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => {
            e.currentTarget.select();
            e.currentTarget.style.border = `1.5px solid ${T}`;
            e.currentTarget.style.background = "rgba(66,224,158,0.06)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = value[i]
              ? `1.5px solid rgba(66,224,158,0.4)`
              : "1.5px solid rgba(255,255,255,0.12)";
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          }}
          className="w-11 h-13 rounded-xl text-center text-lg font-bold outline-none transition-all duration-150"
          style={{
            fontFamily: "'Be Vietnam Pro',sans-serif",
            width: 44,
            height: 52,
            background: "rgba(255,255,255,0.06)",
            border: value[i] ? `1.5px solid rgba(66,224,158,0.4)` : "1.5px solid rgba(255,255,255,0.12)",
            color: "#fff",
            caretColor: T,
          }}
        />
      ))}
    </div>
  );
}

/* ── Resend countdown button ── */
function ResendBtn({ onResend }: { onResend: () => void }) {
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  function handleClick() {
    onResend();
    setSeconds(RESEND_SECONDS);
  }

  if (seconds > 0) {
    return (
      <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
        Gửi lại sau{" "}
        <span style={{ color: T, fontWeight: 600 }}>{seconds}s</span>
      </span>
    );
  }

  return <TextLink onClick={handleClick}>Gửi lại mã</TextLink>;
}

/* ── Main page ── */
export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? "";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const otp = digits.join("");
  const isFull = otp.length === OTP_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFull) return;
    setError("");
    setLoading(true);
    try {
      await authService.verifyEmail(email, otp);
      navigate("/member/register-success", { state: { email } });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 410) {
        setError("Mã OTP đã hết hạn. Vui lòng gửi lại mã.");
      } else if (status === 404) {
        setError("Email không tìm thấy trong hệ thống.");
      } else if (status === 429) {
        setError("Quá nhiều lần thử. Vui lòng đợi trước khi thử lại.");
      } else {
        setError("Mã OTP không đúng hoặc đã hết hạn.");
      }
      setDigits(Array(OTP_LENGTH).fill(""));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await authService.resendVerification(email);
    } catch {
      // silent — ResendBtn đã reset countdown, không cần báo lỗi
    }
  }

  return (
    <AuthShell backTo="/member/register" backLabel="Đăng ký">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Icon + heading */}
        <div className="flex flex-col items-center text-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(66,224,158,0.1)", border: "1px solid rgba(66,224,158,0.2)" }}
          >
            <Mail size={24} color={T} strokeWidth={1.5} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.3 }}>
              Xác thực email
            </h1>
            <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>
              Nhập mã 6 chữ số đã được gửi đến
            </p>
            {email && (
              <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: T, fontWeight: 600, marginTop: 2 }}>
                {email}
              </p>
            )}
          </div>
        </div>

        {/* OTP boxes */}
        <OtpInput value={digits} onChange={setDigits} />

        {error && <ErrorMsg message={error} />}

        <BtnPrimary type="submit" disabled={!isFull || loading}>
          {loading ? "Đang xác thực..." : "Xác nhận"}
        </BtnPrimary>

        {/* Resend */}
        <div className="flex items-center justify-center gap-1.5">
          <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            Không nhận được mã?{" "}
          </span>
          <ResendBtn onResend={handleResend} />
        </div>

      </form>
    </AuthShell>
  );
}

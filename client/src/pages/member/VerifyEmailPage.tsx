import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import SectionHeader from "@/components/common/SectionHeader";
import { Mail, RefreshCw, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "example@email.com";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      setError("");

      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleVerify = () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setError("Vui lòng nhập đủ 6 số");
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      navigate("/member/payment");
    }, 1500);
  };

  const handleResend = () => {
    setCountdown(120);
    setCanResend(false);
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#121414' }}>
      <div className="w-full max-w-md mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 transition-all hover:gap-3"
          style={{ color: '#d0c5af' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#f2ca50'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#d0c5af'}
        >
          <ArrowLeft size={20} />
          <span>Quay lại</span>
        </button>
        <div
          className="p-8 rounded-[1.75rem] backdrop-blur-sm"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #4d4635',
          }}
        >
          <div className="text-center mb-8">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ backgroundColor: '#121414' }}
            >
              <Mail size={40} style={{ color: '#f2ca50' }} />
            </div>
            <SectionHeader
              title="Xác thực Email"
              description="Nhập mã OTP để tiếp tục đến bước thanh toán hoặc đăng ký."
            />
            <p style={{ color: '#e2e2e2', fontWeight: 600 }}>
              {email}
            </p>
          </div>

          <div className="mb-6">
            <label className="block mb-4 text-center" style={{ color: '#e2e2e2', fontWeight: 500 }}>
              Nhập mã xác thực
            </label>
            <div className="flex justify-center gap-2 mb-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center rounded-[1.75rem] outline-none transition-all focus:scale-110"
                  style={{
                    backgroundColor: '#121414',
                    color: '#f2ca50',
                    border: error ? '2px solid #ff6b6b' : '2px solid #4d4635',
                    fontSize: '1.5rem',
                    fontWeight: 600,
                  }}
                  onFocus={(e) => !error && (e.currentTarget.style.borderColor = '#f2ca50')}
                  onBlur={(e) => !error && (e.currentTarget.style.borderColor = '#4d4635')}
                />
              ))}
            </div>
            {error && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <AlertCircle size={16} style={{ color: '#ff6b6b' }} />
                <p style={{ color: '#ff6b6b', fontSize: '0.875rem' }}>
                  {error}
                </p>
              </div>
            )}
          </div>

          <div className="text-center mb-6">
            {!canResend ? (
              <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                Gửi lại mã sau <span style={{ color: '#f2ca50', fontWeight: 600 }}>{formatTime(countdown)}</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="flex items-center gap-2 mx-auto transition-all hover:scale-105"
                style={{ color: '#f2ca50', fontSize: '0.875rem', fontWeight: 600 }}
              >
                <RefreshCw size={16} />
                <span>Gửi lại mã OTP</span>
              </button>
            )}
          </div>

          <button
            onClick={handleVerify}
            disabled={isVerifying || otp.join("").length !== 6}
            className="w-full py-3 rounded-[1.75rem] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#f2ca50',
              color: '#000000',
              fontWeight: 600,
            }}
          >
            {isVerifying ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                <span>Xác thực Email</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/member/register')}
            className="w-full mt-3 py-3 rounded-[1.75rem] transition-all"
            style={{
              backgroundColor: 'transparent',
              color: '#d0c5af',
              border: '1px solid #4d4635',
            }}
          >
            Quay lại
          </button>
        </div>

        <div
          className="mt-4 p-4 rounded-[1.75rem] text-center backdrop-blur-sm"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #4d4635'
          }}
        >
          <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
            Không nhận được email?{' '}
            <button
              className="transition-all"
              style={{ color: '#f2ca50', fontWeight: 600 }}
              onClick={() => {}}
            >
              Kiểm tra spam
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

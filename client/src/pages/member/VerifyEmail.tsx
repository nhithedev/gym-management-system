import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import SectionHeader from "@/components/common/SectionHeader";
import { Mail, ArrowLeft } from "lucide-react";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(120);
  const [canResend, setCanResend] = useState(false);

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

      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleResend = () => {
    setCountdown(120);
    setCanResend(false);
    setOtp(["", "", "", "", "", ""]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#121414' }}>
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
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: '#121414' }}
            >
              <Mail size={40} style={{ color: '#f2ca50' }} />
            </div>
            <SectionHeader
              title="Xác thực Email"
              description="Mã OTP giúp hoàn tất xác thực trước khi chuyển sang thanh toán."
            />
            <p style={{ color: '#e2e2e2', fontWeight: 600 }}>
              example@email.com
            </p>
          </div>

          <div className="mb-6">
            <label className="block mb-3 text-center" style={{ color: '#e2e2e2' }}>
              Nhập mã OTP
            </label>
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className="w-12 h-14 text-center rounded-[1.75rem] outline-none"
                  style={{
                    backgroundColor: '#121414',
                    color: '#f2ca50',
                    border: '2px solid #4d4635',
                    fontSize: '1.5rem',
                    fontWeight: 600
                  }}
                />
              ))}
            </div>
          </div>

          <div className="text-center mb-6">
            {!canResend ? (
              <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                Gửi lại mã sau {formatTime(countdown)}
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="transition-all"
                style={{ color: '#f2ca50', fontSize: '0.875rem', fontWeight: 600 }}
              >
                Gửi lại mã OTP
              </button>
            )}
          </div>

          <button
            onClick={() => navigate('/member/payment')}
            className="w-full px-6 py-3 rounded-full transition-all mb-4"
            style={{
              backgroundColor: '#f2ca50',
              color: '#000000',
              fontWeight: 600
            }}
          >
            Xác thực Email
          </button>

          <button
            onClick={() => navigate('/member/register')}
            className="w-full px-6 py-3 rounded-full transition-all"
            style={{
              backgroundColor: 'transparent',
              color: '#d0c5af',
              border: '1px solid #4d4635'
            }}
          >
            Quay lại
          </button>
        </div>

        <div
          className="mt-4 p-4 rounded-[1.75rem] backdrop-blur-sm"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #4d4635'
          }}
        >
          <p style={{ color: '#d0c5af', fontSize: '0.875rem', textAlign: 'center' }}>
            Không nhận được email? Kiểm tra thư mục spam hoặc liên hệ{' '}
            <span style={{ color: '#f2ca50' }}>support@gym.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, ArrowRight } from "lucide-react";
import gym from "@/assets/gym-bg.jpg";
import { G, T, BtnPrimary } from "@/pages/auth/_authui";

/* ── Animated check ring ── */
function CheckIcon() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 88, height: 88 }}>
      <div
        className="absolute rounded-full"
        style={{
          inset: 0,
          background: "rgba(6,195,132,0.12)",
          animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{ width: 72, height: 72, background: "rgba(6,195,132,0.18)" }}
      />
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{ width: 56, height: 56, background: G }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default function RegisterSuccessPage() {
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{ background: "#080e0b" }}
    >
      {/* Blurred background */}
      <div className="absolute inset-0">
        <img
          src={gym}
          alt=""
          className="absolute w-full h-full object-cover object-center"
          style={{ filter: "blur(10px) brightness(0.28) saturate(0.55)", transform: "scale(1.06)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 70% at 50% 40%, rgba(6,195,132,0.1) 0%, transparent 70%)" }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(8,14,11,0.5)" }} />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full mx-4" style={{ maxWidth: 420 }}>
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
          className="rounded-2xl p-8 flex flex-col gap-6"
          style={{
            background: "rgba(12,22,17,0.82)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Check icon */}
          <div className="flex justify-center pt-2">
            <CheckIcon />
          </div>

          {/* Heading */}
          <div className="text-center">
            <div
              style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, fontWeight: 700, color: T, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 8 }}
            >
              XÁC THỰC THÀNH CÔNG
            </div>
            <h1
              style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8, lineHeight: 1.3 }}
            >
              Chào mừng đến RoGym!
            </h1>
            <p
              style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}
            >
              Tài khoản đã được xác thực. Bước tiếp theo là kích hoạt gói tập để bắt đầu sử dụng hệ thống.
            </p>
          </div>

          {/* Info box */}
          <div
            className="rounded-xl px-4 py-3.5 flex flex-col gap-2"
            style={{ background: "rgba(6,195,132,0.07)", border: "1px solid rgba(6,195,132,0.18)" }}
          >
            {[
              "Nhập mã gói đã mua tại quầy",
              "Hoặc chọn và mua gói mới trực tuyến",
            ].map((text) => (
              <div key={text} className="flex items-start gap-2.5">
                <div
                  className="flex items-center justify-center rounded-full shrink-0 mt-0.5"
                  style={{ width: 16, height: 16, background: "rgba(66,224,158,0.2)" }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l1.5 1.5L6.5 2" stroke={T} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <BtnPrimary onClick={() => navigate("/member/subscription/setup")}>
            <span>Tới gói tập của tôi</span>
            <ArrowRight size={15} strokeWidth={2} />
          </BtnPrimary>
        </div>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

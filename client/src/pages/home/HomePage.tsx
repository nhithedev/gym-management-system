import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Dumbbell, Zap, Users, Clock, Apple, Trophy,
  ArrowRight, Check, ChevronDown, Menu, X,
  Instagram, Facebook, Youtube,
  type LucideIcon,
} from "lucide-react";
import gymBg from "@/assets/gym-bg-optimized.jpg";
const G = "#06c384";
const T = "#42e09e";
const GD = "#00492f";

/* ── Navbar ── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const links = ["Trang chủ", "Lịch tập", "Huấn luyện viên", "Gói thành viên", "Liên hệ"];
  return (
    <nav
      className={`rogym-navbar ${scrolled ? "rogym-navbar--scrolled" : ""}`}
      style={{
        backdropFilter: scrolled ? "blur(16px)" : "none",
      }}
    >
      <div className="rogym-container h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0" style={{ textDecoration: "none" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: G }}>
            <Dumbbell size={16} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, color: "#fff", letterSpacing: "0.12em" }}>
            ROGYM
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l} href="#"
              className="rogym-text-link rogym-text-link--nav text-sm font-medium"
              style={{ fontFamily: "'Be Vietnam Pro',sans-serif", color: "#fff" }}
            >
              {l}
            </a>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          <NavLinkBtn to="/login" variant="green">Đăng nhập</NavLinkBtn>
          <NavLinkBtn to="/login" variant="outline">Đăng ký</NavLinkBtn>
        </div>

        {/* Mobile toggle */}
        <button
          className="rogym-btn rogym-btn--icon rogym-btn--elevated md:hidden text-white"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden px-10 pb-6 flex flex-col gap-4" style={{ background: "rgba(8,14,11,0.97)" }}>
          {links.map((l) => (
            <a
              key={l}
              href="#"
              className="rogym-text-link rogym-text-link--nav text-sm font-medium"
              style={{ fontFamily: "'Be Vietnam Pro',sans-serif", color: "#fff" }}
            >
              {l}
            </a>
          ))}
          <div className="flex gap-3 mt-2">
            <NavLinkBtn to="/login" variant="green">Đăng nhập</NavLinkBtn>
            <NavLinkBtn to="/login" variant="outline">Đăng ký</NavLinkBtn>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── Small nav Link buttons ── */
function NavLinkBtn({ to, variant, children }: { to: string; variant: "green" | "outline"; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`rogym-btn rogym-btn--nav ${
        variant === "green" ? "rogym-btn--primary" : "rogym-btn--outline-white"
      }`}
      style={variant === "green" ? { color: "#fff" } : undefined}
    >
      <span>{children}</span>
    </Link>
  );
}

/* ── Shared CTA buttons ── */
function BtnPrimary({ children, to }: { children: React.ReactNode; to?: string }) {
  const className = "rogym-btn rogym-btn--primary rogym-btn--hero";
  if (to) {
    return (
      <Link to={to} className={className}>
        <span>{children}</span>
      </Link>
    );
  }
  return (
    <button className={className}>
      <span>{children}</span>
    </button>
  );
}

function BtnOutline({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <button
      className={`rogym-btn rogym-btn--hero ${
        dark ? "rogym-btn--outline-green-light" : "rogym-btn--outline-white"
      }`}
    >
      <span>{children}</span>
    </button>
  );
}

/* ── Hero ── */
function HeroSection() {
  return (
    <section className="relative w-full min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={gymBg} alt="" className="absolute w-full h-full object-cover object-center" style={{ filter: "brightness(0.4) saturate(0.75)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(95deg,rgba(8,14,11,0.95) 0%,rgba(8,14,11,0.55) 60%,transparent 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(0deg,rgba(8,14,11,0.7) 0%,transparent 50%)" }} />
      </div>
      <div className="relative max-w-[1280px] mx-auto px-10 w-full pt-24 pb-20">
        <div className="max-w-[640px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-10 rounded-full" style={{ background: T }} />
            <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: T, letterSpacing: "0.28em", fontWeight: 700, textTransform: "uppercase" }}>
              ROGYM — Đỉnh cao phong độ
            </span>
          </div>
          <h1 className="uppercase leading-none mb-6" style={{ fontFamily: "'Anton',sans-serif", fontSize: "clamp(64px,9vw,118px)", color: "#fff", lineHeight: 0.9 }}>
            KHƠI NGUỒN<br />
            <span style={{ color: T }}>SỨC MẠNH</span>
          </h1>
          <p className="mb-8 max-w-[500px]" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 18, lineHeight: 1.75, color: "#bbcabf" }}>
            Nâng tầm giới hạn thể chất của bạn ngay hôm nay cùng đội ngũ chuyên gia hàng đầu và thiết bị hiện đại nhất.
          </p>
          <div className="flex flex-wrap gap-4">
            <BtnPrimary to="/login">BẮT ĐẦU NGAY</BtnPrimary>
            <BtnOutline>TÌM HIỂU THÊM</BtnOutline>
          </div>
          <div className="mt-14 flex gap-10 flex-wrap">
            {[["2,500+", "Thành viên"], ["15+", "Huấn luyện viên"], ["98%", "Hài lòng"]].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 38, color: T, lineHeight: 1 }}>{n}</div>
                <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.12em" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ opacity: 0.35 }}>
        <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 10, color: "#fff", letterSpacing: "0.18em", textTransform: "uppercase" }}>Cuộn xuống</span>
        <ChevronDown size={16} color="#fff" />
      </div>
    </section>
  );
}

/* ── Feature marquee ── */
const FEATURE_ITEMS: [LucideIcon, string][] = [
  [Dumbbell, "THIẾT BỊ HIỆN ĐẠI"],
  [Users, "HLV CHUYÊN NGHIỆP"],
  [Clock, "MỞ CỬA 24/7"],
  [Trophy, "CỘNG ĐỒNG MẠNH MẼ"],
  [Zap, "KẾT QUẢ ĐƯỢC CHỨNG MINH"],
  [Apple, "DINH DƯỠNG KHOA HỌC"],
];

function FeatureBar() {
  return (
    <div
      className="rogym-marquee w-full overflow-hidden py-5 border-y"
      style={{ background: G, borderColor: "rgba(0,0,0,0.1)" }}
    >
      <div className="rogym-marquee__track">
        {[0, 1].map((groupIndex) => (
          <div
            key={groupIndex}
            className="rogym-marquee__group"
            aria-hidden={groupIndex === 1}
          >
            {FEATURE_ITEMS.map(([Icon, text]) => (
              <span
                key={`${groupIndex}-${text}`}
                className="flex items-center gap-3 font-bold text-sm uppercase tracking-[0.18em]"
                style={{ fontFamily: "'Be Vietnam Pro',sans-serif", color: GD }}
              >
                <Icon size={15} color={GD} strokeWidth={2.5} />
                {text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Training card ── */
function TrainingCard({ img, tag, title, desc }: { img: string; tag: string; title: string; desc: string }) {
  return (
    <div
      className="rogym-media-card rogym-media-card--dark relative rounded-[40px] overflow-hidden cursor-pointer"
      style={{ height: 500 }}
    >
      <img
        src={img}
        alt={title}
        className="rogym-media-card__image absolute inset-0 w-full h-full object-cover"
        style={{ filter: "brightness(0.5) saturate(0.7)" }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(0deg,rgba(8,14,11,0.97) 0%,rgba(8,14,11,0.35) 55%,transparent 100%)" }} />
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <span className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", background: T, color: "#080e0b", letterSpacing: "0.15em" }}>{tag}</span>
        <div className="uppercase mb-3" style={{ fontFamily: "'Anton',sans-serif", fontSize: 34, color: "#fff", lineHeight: 1.1 }}>{title}</div>
        <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: "#bbcabf", lineHeight: 1.65 }}>{desc}</p>
        <button type="button" className="rogym-text-link rogym-text-link--accent mt-4" style={{ color: T }}>
          <span className="text-sm font-bold uppercase tracking-widest" style={{ fontFamily: "'Be Vietnam Pro',sans-serif" }}>CHI TIẾT</span>
          <ArrowRight size={14} color={T} />
        </button>
      </div>
    </div>
  );
}

/* ── Training section ── */
const EXTRA_PROGRAMS: [LucideIcon, string, string][] = [
  [Dumbbell, "Strength Training", "Xây dựng cơ bắp và sức mạnh cốt lõi"],
  [Zap, "Yoga & Linh hoạt", "Cân bằng cơ thể và tâm trí"],
  [Trophy, "Boxing", "Rèn luyện phản xạ và cardio tối ưu"],
];

function TrainingSection() {
  return (
    <section className="w-full py-32 relative" style={{ background: "#080e0b", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="max-w-[1280px] mx-auto px-10">
        <div className="flex items-end justify-between mb-16 flex-wrap gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", color: T }}>LEVEL UP YOUR GAME</div>
            <h2 className="uppercase leading-none" style={{ fontFamily: "'Anton',sans-serif", fontSize: "clamp(48px,7vw,96px)", color: "#fff", lineHeight: 0.95 }}>
              CHƯƠNG TRÌNH<br />TẬP LUYỆN
            </h2>
          </div>
          <div className="h-1 w-32 rounded-full" style={{ background: T }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <TrainingCard img={gymBg} tag="ELITE POWER" title="POWERLIFTING" desc="Tập trung vào ba bài tập cơ bản: Squat, Bench Press, và Deadlift để xây dựng sức mạnh tối đa." />
          <TrainingCard img={gymBg} tag="FAT BURNER" title="HIIT TRAINING" desc="Đốt cháy calo tối đa với các bài tập cường độ cao ngắt quãng, cải thiện sức bền tim mạch." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EXTRA_PROGRAMS.map(([Icon, name, desc]) => (
            <div key={name} className="rogym-mini-card p-6 rounded-2xl cursor-pointer">
              <div className="mb-3 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(66,224,158,0.12)" }}>
                <Icon size={20} color={T} strokeWidth={2} />
              </div>
              <div className="font-semibold mb-1" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", color: "#fff", fontSize: 15 }}>{name}</div>
              <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", color: "#8ab89c", fontSize: 13, lineHeight: 1.55 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Coach card ── */
function CoachCard({ img, name, role, bio }: { img: string; name: string; role: string; bio: string }) {
  return (
    <div className="rogym-media-card rogym-media-card--light relative cursor-pointer" style={{ paddingBottom: 88 }}>
      <div
        className="rogym-media-card__frame rounded-[40px]"
        style={{ aspectRatio: "4/5", borderColor: "rgba(0,0,0,0.06)" }}
      >
        <div className="absolute inset-0 rounded-[40px]" style={{ background: "#e8f5ee", mixBlendMode: "saturation" }} />
        <img src={img} alt={name} className="rogym-media-card__image w-full h-full object-cover" />
        <div
          className="rogym-media-card__tint absolute inset-0 rounded-[40px]"
          style={{ background: "linear-gradient(0deg,rgba(6,195,132,0.15) 0%,transparent 60%)" }}
        />
      </div>
      <div className="text-center mt-5">
        <div className="uppercase" style={{ fontFamily: "'Anton',sans-serif", fontSize: 26, color: "#0a0f0e", lineHeight: 1.2 }}>{name}</div>
        <div className="font-semibold uppercase tracking-wider mt-1" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: G, letterSpacing: "0.15em" }}>{role}</div>
        <div className="mt-1.5" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(0,0,0,0.5)", lineHeight: 1.55 }}>{bio}</div>
      </div>
    </div>
  );
}

/* ── Coaches section ── */
function CoachSection() {
  return (
    <section className="w-full py-32 bg-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%,rgba(6,195,132,0.06) 0%,transparent 70%)" }} />
      <div className="max-w-[1280px] mx-auto px-10 relative">
        <div className="text-center mb-20">
          <h2 className="uppercase leading-none mb-5" style={{ fontFamily: "'Anton',sans-serif", fontSize: "clamp(48px,7vw,96px)", color: "#0a0f0e", lineHeight: 0.95 }}>ĐỘI NGŨ CHUYÊN GIA</h2>
          <p className="uppercase font-semibold tracking-[0.15em] opacity-50" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 15, color: "#0a0f0e" }}>DẪN DẮT BẠN ĐẾN ĐỈNH CAO PHONG ĐỘ</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <CoachCard img={gymBg} name="MINH TRẦN" role="MASTER POWERLIFTER" bio="10 năm kinh nghiệm huấn luyện thi đấu chuyên nghiệp." />
          <CoachCard img={gymBg} name="LAN ANH" role="HIIT SPECIALIST" bio="Chuyên gia dinh dưỡng và giảm cân khoa học." />
          <CoachCard img={gymBg} name="QUỐC HUY" role="STRENGTH COACH" bio="Chuyên đào tạo kỹ thuật nâng tạ và phục hồi chức năng." />
        </div>
        <div className="flex justify-center mt-16">
          <BtnOutline dark>Xem tất cả huấn luyện viên</BtnOutline>
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ── */
type Plan = { tier: string; price: string; unit: string; features: string[]; hot: boolean };

function PricingCard({ plan }: { plan: Plan }) {
  const { hot } = plan;
  return (
    <div
      className={`rogym-pricing-card relative rounded-[40px] p-8 flex flex-col cursor-pointer ${
        hot ? "rogym-pricing-card--featured" : ""
      }`}
      style={hot ? {
        background: G,
        borderColor: G,
        boxShadow: "0 24px 60px -12px rgba(6,195,132,0.45)",
      } : undefined}
    >
      {hot && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", background: "#fff", color: GD }}>PHỔ BIẾN NHẤT</div>}
      <div className="text-xs font-bold uppercase tracking-[0.25em] mb-4" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", color: hot ? "rgba(0,73,47,0.65)" : "#8ab89c" }}>{plan.tier}</div>
      <div className="flex items-baseline gap-2 mb-8">
        <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 52, color: hot ? GD : "#fff", lineHeight: 1 }}>{plan.price}</span>
        <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: hot ? "rgba(0,73,47,0.55)" : "#8ab89c" }}>{plan.unit}</span>
      </div>
      <div className="flex flex-col gap-4 mb-10 flex-1">
        {plan.features.map((f) => (
          <div key={f} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: hot ? "rgba(0,73,47,0.15)" : "rgba(66,224,158,0.15)" }}>
              <Check size={11} color={hot ? GD : T} strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: hot ? "rgba(0,73,47,0.85)" : "rgba(226,226,226,0.75)", lineHeight: 1.55 }}>{f}</span>
          </div>
        ))}
      </div>
      <button
        className={`rogym-btn rogym-btn--wide ${
          hot ? "rogym-btn--dark" : "rogym-btn--outline-white"
        }`}
      >
        <span>ĐĂNG KÝ NGAY</span>
      </button>
    </div>
  );
}

function PricingSection() {
  const plans: Plan[] = [
    { tier: "CƠ BẢN", price: "599K", unit: "/Tháng", features: ["Truy cập gym 24/7", "Tủ đồ cá nhân", "Khu vực cardio & tạ rời"], hot: false },
    { tier: "THƯỢNG HẠNG", price: "999K", unit: "/Tháng", features: ["Tất cả quyền lợi Cơ Bản", "4 buổi PT/tháng", "Tư vấn dinh dưỡng", "Lớp nhóm không giới hạn", "Phục hồi chức năng"], hot: true },
    { tier: "ELITE VIP", price: "1.9M", unit: "/Tháng", features: ["Tất cả quyền lợi Thượng Hạng", "PT không giới hạn", "Khu vực VIP riêng biệt", "Spa & phòng xông hơi", "Ưu tiên đặt lịch"], hot: false },
  ];
  return (
    <section className="w-full py-32 relative" style={{ background: "#080e0b" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 30% at 50% 50%,rgba(6,195,132,0.06) 0%,transparent 70%)" }} />
      <div className="max-w-[1280px] mx-auto px-10 relative">
        <div className="text-center mb-20">
          <h2 className="uppercase leading-none mb-5" style={{ fontFamily: "'Anton',sans-serif", fontSize: "clamp(48px,7vw,96px)", color: "#fff", lineHeight: 0.95 }}>GÓI THÀNH VIÊN</h2>
          <div className="h-1 w-24 rounded-full mx-auto" style={{ background: T }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mt-8">
          {plans.map((p) => <PricingCard key={p.tier} plan={p} />)}
        </div>
        <p className="text-center mt-12" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
          * Tất cả gói đều có thể hủy bất kỳ lúc nào. Dùng thử miễn phí 7 ngày.
        </p>
      </div>
    </section>
  );
}

/* ── CTA Banner ── */
function CTABanner() {
  return (
    <section className="w-full py-28 relative overflow-hidden" style={{ background: "#040d08" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 55% 55% at 50% 50%,rgba(6,195,132,0.1) 0%,transparent 70%)" }} />
      <div className="max-w-[1280px] mx-auto px-10 text-center relative">
        <p className="uppercase font-bold tracking-[0.28em] mb-4" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", color: T, fontSize: 12 }}>BẮT ĐẦU HÀNH TRÌNH CỦA BẠN</p>
        <h2 className="uppercase leading-none mb-8" style={{ fontFamily: "'Anton',sans-serif", fontSize: "clamp(40px,6vw,80px)", color: "#fff", lineHeight: 0.92 }}>
          SẴN SÀNG PHÁ VỠ<br /><span style={{ color: T }}>GIỚI HẠN?</span>
        </h2>
        <p className="max-w-md mx-auto mb-10" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 16, color: "#8ab89c", lineHeight: 1.7 }}>
          Đăng ký thử miễn phí 7 ngày và cảm nhận sự khác biệt ngay hôm nay.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <BtnPrimary to="/login">THỬ MIỄN PHÍ 7 NGÀY</BtnPrimary>
          <BtnOutline>LIÊN HỆ TƯ VẤN</BtnOutline>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  const cols: Record<string, string[]> = {
    "Chương trình": ["Powerlifting", "HIIT Training", "Yoga", "Boxing", "Strength"],
    "Thông tin": ["Về chúng tôi", "Đội ngũ HLV", "Cơ sở vật chất", "Blog"],
    "Hỗ trợ": ["Câu hỏi thường gặp", "Liên hệ", "Chính sách", "Điều khoản"],
  };
  const socials: [LucideIcon, string][] = [
    [Facebook, "Facebook"], [Instagram, "Instagram"], [Youtube, "YouTube"],
  ];
  return (
    <footer className="w-full py-20 border-t" style={{ background: "#030907", borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="max-w-[1280px] mx-auto px-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: G }}>
                <Dumbbell size={16} color="#fff" strokeWidth={2.2} />
              </div>
              <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 18, color: "#fff", letterSpacing: "0.12em" }}>ROGYM</span>
            </div>
            <p className="mb-6" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.75 }}>
              Nơi giới hạn bị phá vỡ, sức mạnh được rèn giũa. Hành trình của bạn bắt đầu từ đây.
            </p>
            <div className="flex gap-3">
              {socials.map(([Icon, label]) => (
                <button key={label} aria-label={label}
                  className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                >
                  <Icon size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
          {Object.entries(cols).map(([cat, links]) => (
            <div key={cat}>
              <div className="text-xs font-bold uppercase tracking-[0.2em] mb-5" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", color: "rgba(255,255,255,0.55)" }}>{cat}</div>
              <div className="flex flex-col gap-3">
                {links.map((link) => (
                  <a
                    key={link}
                    href="#"
                    className="rogym-text-link rogym-text-link--muted text-sm"
                    style={{ fontFamily: "'Be Vietnam Pro',sans-serif", color: "rgba(255,255,255,0.35)" }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4 pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© 2026 RoGym. All rights reserved.</span>
          <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>TP. Hồ Chí Minh, Việt Nam</span>
        </div>
      </div>
    </footer>
  );
}

/* ── HomePage ── */
export default function HomePage() {
  return (
    <div className="rogym-page">
      <Navbar />
      <HeroSection />
      <FeatureBar />
      <TrainingSection />
      <CoachSection />
      <PricingSection />
      <CTABanner />
      <Footer />
    </div>
  );
}

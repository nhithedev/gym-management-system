import { useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Dumbbell, Eye, EyeOff } from "lucide-react";
import gym from "@/assets/gym-bg.jpg";

export const G = "#06c384";
export const T = "#42e09e";
export const GD = "#00492f";

/* ── Pill sweep — primary (green) ── */
export function BtnPrimary({
  children,
  type = "button",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="relative overflow-hidden rounded-full w-full py-4 text-sm font-semibold uppercase tracking-[0.12em] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ fontFamily: "'Be Vietnam Pro',sans-serif", background: G, color: GD, boxShadow: "0 8px 24px -4px rgba(6,195,132,0.3)" }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: "#08d891", transform: "translateX(-100%)", transition: "transform 0.38s cubic-bezier(0.4,0,0.2,1)" }}
        ref={(el) => {
          if (!el) return;
          const btn = el.parentElement!;
          btn.addEventListener("mouseenter", () => { el.style.transform = "translateX(0)"; });
          btn.addEventListener("mouseleave", () => { el.style.transform = "translateX(-100%)"; });
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

/* ── Pill sweep — outline white ── */
export function BtnOutlineWhite({
  children,
  type = "button",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="relative overflow-hidden rounded-full w-full py-4 text-sm font-semibold uppercase tracking-[0.12em] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ fontFamily: "'Be Vietnam Pro',sans-serif", background: "transparent", color: "#fff", border: "2px solid rgba(255,255,255,0.45)" }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: "rgba(255,255,255,0.1)", transform: "translateX(-100%)", transition: "transform 0.38s cubic-bezier(0.4,0,0.2,1)" }}
        ref={(el) => {
          if (!el) return;
          const btn = el.parentElement!;
          btn.addEventListener("mouseenter", () => {
            el.style.transform = "translateX(0)";
            btn.style.borderColor = "#fff";
          });
          btn.addEventListener("mouseleave", () => {
            el.style.transform = "translateX(-100%)";
            btn.style.borderColor = "rgba(255,255,255,0.45)";
          });
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

/* ── Text link with sliding underline ── */
export function TextLink({
  children,
  onClick,
  to,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
}) {
  const cls = "relative inline-flex group";
  const style: React.CSSProperties = { fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "#fff", fontWeight: 600, background: "none", border: "none", padding: 0, cursor: "pointer" };
  const underline = (
    <span
      className="absolute bottom-[-2px] left-0 h-[1.5px] w-0 group-hover:w-full rounded-full"
      style={{ background: T, transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)" }}
    />
  );
  if (to) {
    return (
      <Link to={to} className={cls} style={{ ...style, textDecoration: "none" }}>
        {children}{underline}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {children}{underline}
    </button>
  );
}

/* ── Muted text link ── */
export function MutedLink({
  children,
  onClick,
  to,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
}) {
  const cls = "relative inline-flex group";
  const style: React.CSSProperties = { fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500, background: "none", border: "none", padding: 0, cursor: "pointer" };
  const underline = (
    <span
      className="absolute bottom-[-2px] left-0 h-[1.5px] w-0 group-hover:w-full rounded-full"
      style={{ background: "rgba(255,255,255,0.4)", transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)" }}
    />
  );
  if (to) {
    return (
      <Link to={to} className={cls} style={{ ...style, textDecoration: "none" }}>
        {children}{underline}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {children}{underline}
    </button>
  );
}

/* ── Password toggle field wrapper ── */
export function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  icon?: LucideIcon;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field
      label={label}
      type={show ? "text" : "password"}
      placeholder={placeholder ?? "••••••••"}
      value={value}
      onChange={onChange}
      icon={Icon}
      right={
        <button type="button" onClick={() => setShow((s) => !s)} style={{ color: "rgba(255,255,255,0.3)", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
          {show ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
        </button>
      }
    />
  );
}

/* ── Input field ── */
export function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon: Icon,
  right,
  autoComplete,
  name,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  icon?: LucideIcon;
  right?: React.ReactNode;
  autoComplete?: string;
  name?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon size={15} color={focused ? T : "rgba(255,255,255,0.25)"} strokeWidth={2} />
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          name={name}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.style.border = `1px solid ${T}`;
            e.currentTarget.style.background = "rgba(66,224,158,0.05)";
          }}
          onBlur={(e) => {
            setFocused(false);
            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          }}
          className="w-full rounded-xl py-3 text-sm outline-none transition-all duration-200 placeholder:text-[rgba(255,255,255,0.2)]"
          style={{
            fontFamily: "'Be Vietnam Pro',sans-serif",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            paddingLeft: Icon ? 40 : 14,
            paddingRight: right ? 44 : 14,
          }}
        />
        {right && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>
        )}
      </div>
    </div>
  );
}

/* ── Error message ── */
export function ErrorMsg({ message }: { message: string }) {
  return (
    <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "#ff6b6b", textAlign: "center" }}>
      {message}
    </p>
  );
}

/* ── Divider ── */
export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
      <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

/* ── Full-page auth shell (background + logo + glass card) ── */
export function AuthShell({
  children,
  maxWidth = 400,
  backTo = "/",
  backLabel = "Trang chủ",
}: {
  children: React.ReactNode;
  maxWidth?: number;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden" style={{ background: "#080e0b" }}>
      <div className="absolute inset-0">
        <img
          src={gym}
          alt=""
          className="absolute w-full h-full object-cover object-center"
          style={{ filter: "blur(10px) brightness(0.28) saturate(0.55)", transform: "scale(1.06)" }}
        />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(6,195,132,0.07) 0%, transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "rgba(8,14,11,0.5)" }} />
      </div>

      <Link
        to={backTo}
        className="absolute top-6 left-6 flex items-center gap-1.5 z-20 group"
        style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500, textDecoration: "none" }}
      >
        <ArrowLeft size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
        <span className="relative">
          {backLabel}
          <span
            className="absolute bottom-[-2px] left-0 h-[1.5px] w-0 group-hover:w-full rounded-full"
            style={{ background: "rgba(255,255,255,0.45)", transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </span>
      </Link>

      <div className="relative z-10 w-full mx-4" style={{ maxWidth }}>
        <div className="flex items-center justify-center gap-2.5 mb-7">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: G }}>
            <Dumbbell size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, color: "#fff", letterSpacing: "0.12em" }}>ROGYM</span>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(12,22,17,0.82)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

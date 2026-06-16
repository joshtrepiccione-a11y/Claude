// Small shared UI atoms used across the app.

import { type ReactNode } from "react";

export function Card({
  children,
  className = "",
  title,
  subtitle,
  right,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section
      className={`bg-white border border-slate-200 rounded-xl shadow-card ${className}`}
    >
      {(title || right) && (
        <header className="flex items-start justify-between px-4 py-3 border-b border-slate-100">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Pill({
  children,
  tone = "slate",
  className = "",
}: {
  children: ReactNode;
  tone?: "slate" | "dem" | "rep" | "amber" | "purple" | "green" | "navy";
  className?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    dem: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
    rep: "bg-red-50 text-red-700 ring-1 ring-red-100",
    amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
    purple: "bg-purple-50 text-purple-700 ring-1 ring-purple-100",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    navy: "bg-navy-100 text-navy-800 ring-1 ring-navy-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
      ? "text-red-700"
      : tone === "warn"
      ? "text-amber-700"
      : "text-slate-900";
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${toneClass}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="relative group inline-block">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 z-50 hidden group-hover:block w-64 bg-navy-900 text-white text-xs rounded px-2 py-1 leading-snug shadow-lg"
      >
        {text}
      </span>
    </span>
  );
}

export function InfoIcon({ tip }: { tip: string }) {
  return (
    <Tooltip text={tip}>
      <span
        aria-label="info"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold cursor-help"
      >
        i
      </span>
    </Tooltip>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900 disabled:bg-slate-300",
    secondary:
      "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-60",
    ghost:
      "bg-transparent text-slate-700 hover:bg-slate-100 disabled:opacity-60",
    danger:
      "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2 className="text-base font-semibold text-slate-800">{children}</h2>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Empty({
  title,
  body,
  icon,
}: {
  title: string;
  body?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
      <div className="text-3xl mb-2">{icon ?? "○"}</div>
      <div className="text-sm font-medium text-slate-700">{title}</div>
      {body && <div className="text-xs mt-1 max-w-sm">{body}</div>}
    </div>
  );
}

export function fmtNumber(n: number): string {
  if (!isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

export function fmtSigned(n: number): string {
  if (!isFinite(n)) return "—";
  return (n >= 0 ? "+" : "") + Math.round(n).toLocaleString();
}

export function fmtMargin(pp: number, party?: "D" | "R" | null): string {
  if (!isFinite(pp)) return "—";
  const sign = pp >= 0 ? "+" : "−";
  const abs = Math.abs(pp).toFixed(1);
  if (party) return `${party} ${sign === "+" ? "+" : "-"}${abs}`;
  if (pp === 0) return `Tied`;
  return `${pp > 0 ? "D" : "R"} +${abs}`;
}

export function partyOf(pp: number): "D" | "R" | null {
  if (Math.abs(pp) < 0.0001) return null;
  return pp > 0 ? "D" : "R";
}

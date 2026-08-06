// Small shared UI atoms.

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
        <header className="flex items-start justify-between px-4 py-3 border-b border-slate-100 gap-2">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
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
  tone?: "slate" | "focus" | "good" | "warn" | "outline";
  className?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    focus: "bg-focus-soft text-focus-deep ring-1 ring-focus-ring",
    good: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100",
    warn: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
    outline: "bg-white text-slate-600 ring-1 ring-slate-200",
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
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`text-2xl font-semibold mt-1 ${
          accent ? "text-focus-deep" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  className = "",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-focus text-white hover:bg-focus-deep disabled:bg-slate-300",
    secondary:
      "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-60",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 disabled:opacity-60",
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition min-h-[44px] sm:min-h-0 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** A segmented control. Options may be disabled with an explanatory reason. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string; disabledReason?: string | null }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1">
      {options.map((o) => {
        const active = o.id === value;
        const disabled = !!o.disabledReason;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => !disabled && onChange(o.id)}
            aria-pressed={active}
            disabled={disabled}
            title={o.disabledReason ?? undefined}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition min-h-[44px] sm:min-h-0 ${
              active
                ? "bg-focus text-white border-focus"
                : disabled
                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  // Shows on hover AND keyboard focus, so the focusable InfoIcon surfaces its
  // tip for keyboard and touch users too.
  return (
    <span className="relative group inline-block">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 z-50 hidden group-hover:block group-focus-within:block w-64 bg-ink-900 text-white text-xs rounded px-2 py-1 leading-snug shadow-lg"
      >
        {text}
      </span>
    </span>
  );
}

export function InfoIcon({ tip }: { tip: string }) {
  return (
    <Tooltip text={tip}>
      <button
        type="button"
        aria-label={tip}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold cursor-help hover:bg-slate-300"
      >
        i
      </button>
    </Tooltip>
  );
}

/** Explains why a measure is missing instead of drawing an empty chart. */
export function Unavailable({ reason }: { reason: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600 flex gap-3">
      <span
        aria-hidden="true"
        className="shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold inline-flex items-center justify-center"
      >
        !
      </span>
      <div>
        <div className="font-medium text-slate-700 mb-0.5">
          Not reported by the county
        </div>
        <p className="leading-snug">{reason}</p>
      </div>
    </div>
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
    <div className="flex items-baseline justify-between mb-3 gap-3">
      <h2 className="text-base font-semibold text-slate-800">{children}</h2>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

/** A color chip that pairs with a text label so hue never carries meaning alone. */
export function Swatch({ color, className = "" }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-3 h-3 rounded-sm ring-1 ring-black/10 shrink-0 ${className}`}
      style={{ background: color }}
    />
  );
}

export function Legend({ items }: { items: { c: string; l: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {items.map((it, i) => (
        <li key={`${it.c}-${i}`} className="flex items-center gap-1.5 text-xs text-slate-600">
          <Swatch color={it.c} />
          {it.l && <span>{it.l}</span>}
        </li>
      ))}
    </ul>
  );
}

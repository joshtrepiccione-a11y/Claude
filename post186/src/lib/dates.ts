/**
 * Date helpers.
 *
 * Every date and time on this site is a wall-clock value in the post's own
 * time zone. Dates are stored as "YYYY-MM-DD" strings and times as "HH:MM"
 * strings, and are never converted between zones, so an event entered as
 * 7:00 PM always displays as 7:00 PM no matter where the server runs.
 */

export const POST_TIME_ZONE = "America/New_York";

export type Ymd = string; // "2026-11-17"
export type Hm = string; // "19:00"

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isYmd(value: unknown): value is Ymd {
  if (typeof value !== "string" || !YMD_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function isHm(value: unknown): value is Hm {
  return typeof value === "string" && HM_RE.test(value);
}

/** Today's date in the post's time zone. */
export function todayInPostTz(now: Date = new Date()): Ymd {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: POST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Current "HH:MM" in the post's time zone. */
export function nowTimeInPostTz(now: Date = new Date()): Hm {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: POST_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h === "24" ? "00" : h}:${m}`;
}

/** A UTC-midnight Date for date arithmetic. Never use it for display in local time. */
export function toUtcDate(ymd: Ymd): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fromUtcDate(date: Date): Ymd {
  return date.toISOString().slice(0, 10);
}

export function addDays(ymd: Ymd, days: number): Ymd {
  const dt = toUtcDate(ymd);
  dt.setUTCDate(dt.getUTCDate() + days);
  return fromUtcDate(dt);
}

/** Adds months, clamping to the last day when the target month is shorter. */
export function addMonths(ymd: Ymd, months: number): Ymd {
  const [y, m, d] = ymd.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = daysInMonth(first.getUTCFullYear(), first.getUTCMonth() + 1);
  first.setUTCDate(Math.min(d, last));
  return fromUtcDate(first);
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(ymd: Ymd): number {
  return toUtcDate(ymd).getUTCDay();
}

export function monthKey(ymd: Ymd): string {
  return ymd.slice(0, 7); // "2026-11"
}

export function diffDays(from: Ymd, to: Ymd): number {
  return Math.round(
    (toUtcDate(to).getTime() - toUtcDate(from).getTime()) / 86_400_000,
  );
}

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function fmt(ymd: Ymd, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    toUtcDate(ymd),
  );
}

/** "Tuesday, November 17, 2026" */
export function formatDateLong(ymd: Ymd): string {
  return fmt(ymd, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/** "Tue, Nov 17" */
export function formatDateShort(ymd: Ymd): string {
  return fmt(ymd, { weekday: "short", month: "short", day: "numeric" });
}

/** "Nov 17, 2026" */
export function formatDateMedium(ymd: Ymd): string {
  return fmt(ymd, { month: "short", day: "numeric", year: "numeric" });
}

/** "November 2026" */
export function formatMonthYear(ymdOrMonth: string): string {
  const ymd = ymdOrMonth.length === 7 ? `${ymdOrMonth}-01` : ymdOrMonth;
  return fmt(ymd, { month: "long", year: "numeric" });
}

/** "NOV" */
export function formatMonthAbbrev(ymd: Ymd): string {
  return fmt(ymd, { month: "short" }).toUpperCase();
}

export function dayOfMonth(ymd: Ymd): number {
  return Number(ymd.slice(8, 10));
}

/** "19:00" → "7:00 PM" */
export function formatTime(hm: Hm): string {
  const [h, m] = hm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "7:00 PM – 9:00 PM", "7:00 PM", or "All day" */
export function formatTimeRange(start: Hm | null, end: Hm | null): string {
  if (!start) return "All day";
  if (!end) return formatTime(start);
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function minutesOf(hm: Hm): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/** Timestamp string for created_at / updated_at columns (UTC, ISO 8601). */
export function nowIso(): string {
  return new Date().toISOString();
}

/** "Nov 15, 2026, 4:05 PM" in the post's time zone, from an ISO timestamp. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: POST_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

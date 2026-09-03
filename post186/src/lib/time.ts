export const SITE_TZ = process.env.SITE_TIMEZONE?.trim() || "America/New_York";

function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - date.getTime();
}

/** Convert a naive local string ("YYYY-MM-DDTHH:MM" or "YYYY-MM-DD") in `tz` to a UTC Date. */
export function zonedToUtc(naive: string, tz: string = SITE_TZ): Date {
  const [datePart, timePart = "00:00"] = naive.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h = 0, mi = 0] = timePart.split(":").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${naive}`);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const offset = tzOffsetMs(new Date(guess), tz);
  let utc = guess - offset;
  const offset2 = tzOffsetMs(new Date(utc), tz);
  if (offset2 !== offset) {
    const candidate = guess - offset2;
    // Only accept the second candidate when it is self-consistent; otherwise the local time
    // falls in a daylight-saving gap and we keep the forward-shifted first candidate.
    if (tzOffsetMs(new Date(candidate), tz) === offset2) utc = candidate;
  }
  return new Date(utc);
}

function zonedParts(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

/** UTC ISO string to "YYYY-MM-DDTHH:MM" in `tz`, for datetime-local inputs. */
export function utcToLocalInput(iso: string, tz: string = SITE_TZ): string {
  const p = zonedParts(new Date(iso), tz);
  return `${p.y}-${p.m}-${p.d}T${p.h}:${p.mi}`;
}

/** UTC ISO string to "YYYY-MM-DD" in `tz`. */
export function utcToLocalDate(iso: string, tz: string = SITE_TZ): string {
  const p = zonedParts(new Date(iso), tz);
  return `${p.y}-${p.m}-${p.d}`;
}

export function formatDate(iso: string, tz: string = SITE_TZ, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    ...opts,
  }).format(new Date(iso));
}

export function formatShortDate(iso: string, tz: string = SITE_TZ): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatTime(iso: string, tz: string = SITE_TZ): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" })
    .format(new Date(iso))
    .replace(":00", "");
}

export function formatDateTime(iso: string, tz: string = SITE_TZ): string {
  return `${formatDate(iso, tz)} at ${formatTime(iso, tz)}`;
}

/** Human-readable range for an event. */
export function formatEventWhen(startIso: string, endIso: string, allDay: boolean, tz: string = SITE_TZ): string {
  const sameDay = utcToLocalDate(startIso, tz) === utcToLocalDate(endIso, tz);
  if (allDay) {
    if (sameDay) return `${formatDate(startIso, tz)} (all day)`;
    return `${formatDate(startIso, tz)} to ${formatDate(endIso, tz)}`;
  }
  if (sameDay) return `${formatDate(startIso, tz)}, ${formatTime(startIso, tz)} to ${formatTime(endIso, tz)}`;
  return `${formatDateTime(startIso, tz)} to ${formatDateTime(endIso, tz)}`;
}

/** Parts for the date block on event cards. */
export function dateBlockParts(iso: string, tz: string = SITE_TZ): { month: string; day: string; weekday: string } {
  const d = new Date(iso);
  return {
    month: new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short" }).format(d),
    day: new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "numeric" }).format(d),
    weekday: new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d),
  };
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

/** Calendar grid for a month: weeks of 7 cells, Sunday first. Each cell has a local "YYYY-MM-DD" and inMonth flag. */
export function monthGrid(year: number, month: number): Array<Array<{ date: string; day: number; inMonth: boolean }>> {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startOffset = first.getUTCDay();
  const cells: Array<{ date: string; day: number; inMonth: boolean }> = [];
  const cursor = new Date(Date.UTC(year, month - 1, 1 - startOffset));
  for (let i = 0; i < 42; i += 1) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth() + 1;
    const d = cursor.getUTCDate();
    cells.push({
      date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: m === month && y === year,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const weeks: typeof cells[] = [];
  for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7));
  // Drop trailing week if entirely outside the month.
  return weeks.filter((w) => w.some((c) => c.inMonth));
}

/** Local-month bounds as UTC ISO strings. */
export function monthBoundsUtc(year: number, month: number, tz: string = SITE_TZ): { start: string; end: string } {
  const start = zonedToUtc(`${year}-${String(month).padStart(2, "0")}-01T00:00`, tz);
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const end = zonedToUtc(`${nextMonth.y}-${String(nextMonth.m).padStart(2, "0")}-01T00:00`, tz);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function currentMonth(tz: string = SITE_TZ): { year: number; month: number } {
  const p = zonedParts(new Date(), tz);
  return { year: Number(p.y), month: Number(p.m) };
}

export function parseMonthParam(value: string | undefined, tz: string = SITE_TZ): { year: number; month: number } {
  const m = value?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) return { year, month };
  }
  return currentMonth(tz);
}

import {
  type Ymd,
  WEEKDAY_NAMES,
  addDays,
  daysInMonth,
  diffDays,
  fromUtcDate,
  toUtcDate,
  weekdayOf,
} from "./dates";

export const RECURRENCE_VALUES = [
  "none",
  "weekly",
  "biweekly",
  "monthly_nth",
  "monthly_last",
  "yearly",
] as const;

export type Recurrence = (typeof RECURRENCE_VALUES)[number];

export type Recurring = {
  startDate: Ymd;
  recurrence: Recurrence;
  repeatUntil: Ymd | null;
  /** Individual dates to leave out, e.g. a meeting that falls on a holiday. */
  skipDates: Ymd[];
};

const ORDINALS = ["", "1st", "2nd", "3rd", "4th", "5th"];

/** Which occurrence of its weekday a date is within its month: 1–5. */
export function nthWeekdayIndex(ymd: Ymd): number {
  return Math.ceil(Number(ymd.slice(8, 10)) / 7);
}

/** The date of the nth (1–5) given weekday in a month, or null if it doesn't exist. */
export function nthWeekdayOfMonth(
  year: number,
  month1to12: number,
  weekday: number,
  nth: number,
): Ymd | null {
  const first = new Date(Date.UTC(year, month1to12 - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  if (day > daysInMonth(year, month1to12)) return null;
  return fromUtcDate(new Date(Date.UTC(year, month1to12 - 1, day)));
}

export function lastWeekdayOfMonth(
  year: number,
  month1to12: number,
  weekday: number,
): Ymd {
  const lastDay = daysInMonth(year, month1to12);
  const last = new Date(Date.UTC(year, month1to12 - 1, lastDay));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return fromUtcDate(new Date(Date.UTC(year, month1to12 - 1, lastDay - offset)));
}

/**
 * Every date the event occurs on within [from, to] inclusive, in order.
 * `limit` guards against runaway loops and oversized result sets.
 */
export function occurrencesBetween(
  event: Recurring,
  from: Ymd,
  to: Ymd,
  limit = 500,
): Ymd[] {
  const { startDate, recurrence } = event;
  const end = event.repeatUntil && event.repeatUntil < to ? event.repeatUntil : to;
  const skip = new Set(event.skipDates);
  const out: Ymd[] = [];
  const push = (d: Ymd) => {
    if (d >= from && d <= end && d >= startDate && !skip.has(d)) out.push(d);
  };

  if (recurrence === "none") {
    // A one-time event ignores repeatUntil.
    if (startDate >= from && startDate <= to && !skip.has(startDate)) {
      out.push(startDate);
    }
    return out;
  }

  if (end < startDate || end < from) return out;

  if (recurrence === "weekly" || recurrence === "biweekly") {
    const step = recurrence === "weekly" ? 7 : 14;
    let cursor = startDate;
    if (cursor < from) {
      const jump = Math.floor(diffDays(startDate, from) / step) * step;
      cursor = addDays(startDate, jump);
      if (cursor < from) cursor = addDays(cursor, step);
    }
    while (cursor <= end && out.length < limit) {
      push(cursor);
      cursor = addDays(cursor, step);
    }
    return out;
  }

  if (recurrence === "monthly_nth" || recurrence === "monthly_last") {
    const weekday = weekdayOf(startDate);
    const nth = nthWeekdayIndex(startDate);
    const begin = from > startDate ? from : startDate;
    let year = Number(begin.slice(0, 4));
    let month = Number(begin.slice(5, 7));
    const endYear = Number(end.slice(0, 4));
    const endMonth = Number(end.slice(5, 7));
    while (
      (year < endYear || (year === endYear && month <= endMonth)) &&
      out.length < limit
    ) {
      const date =
        recurrence === "monthly_last"
          ? lastWeekdayOfMonth(year, month, weekday)
          : nthWeekdayOfMonth(year, month, weekday, nth);
      if (date) push(date);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    return out;
  }

  // yearly
  const monthDay = startDate.slice(4); // "-MM-DD"
  const begin = from > startDate ? from : startDate;
  for (
    let year = Number(begin.slice(0, 4));
    year <= Number(end.slice(0, 4)) && out.length < limit;
    year += 1
  ) {
    const candidate = `${year}${monthDay}`;
    // Feb 29 only exists in leap years; skip the years it doesn't.
    if (fromUtcDate(toUtcDate(candidate)) === candidate) push(candidate);
  }
  return out;
}

/** The first occurrence on or after `from`, looking up to two years ahead. */
export function nextOccurrence(event: Recurring, from: Ymd): Ymd | null {
  const horizon = addDays(from, 366 * 2);
  return occurrencesBetween(event, from, horizon, 1)[0] ?? null;
}

/** The most recent occurrence strictly before `before`, looking back two years. */
export function previousOccurrence(event: Recurring, before: Ymd): Ymd | null {
  const all = occurrencesBetween(event, addDays(before, -366 * 2), addDays(before, -1));
  return all.length ? all[all.length - 1] : null;
}

/** Plain-language summary, e.g. "Monthly on the 2nd Tuesday". Empty for one-time events. */
export function describeRecurrence(event: Recurring): string {
  const weekday = WEEKDAY_NAMES[weekdayOf(event.startDate)];
  switch (event.recurrence) {
    case "none":
      return "";
    case "weekly":
      return `Every ${weekday}`;
    case "biweekly":
      return `Every other ${weekday}`;
    case "monthly_nth":
      return `Monthly on the ${ORDINALS[nthWeekdayIndex(event.startDate)]} ${weekday}`;
    case "monthly_last":
      return `Monthly on the last ${weekday}`;
    case "yearly":
      return "Every year";
  }
}

/** Labels for the admin form, phrased using the chosen start date. */
export function recurrenceOptions(startDate: Ymd | null): { value: Recurrence; label: string }[] {
  const weekday = startDate ? WEEKDAY_NAMES[weekdayOf(startDate)] : "the same weekday";
  const nth = startDate ? ORDINALS[nthWeekdayIndex(startDate)] : "same";
  return [
    { value: "none", label: "Does not repeat" },
    { value: "weekly", label: `Every week on ${weekday}` },
    { value: "biweekly", label: `Every other week on ${weekday}` },
    { value: "monthly_nth", label: `Every month on the ${nth} ${weekday}` },
    { value: "monthly_last", label: `Every month on the last ${weekday}` },
    { value: "yearly", label: "Every year on this date" },
  ];
}

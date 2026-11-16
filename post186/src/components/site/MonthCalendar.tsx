"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import type { CalendarEntry } from "@/lib/data";
import {
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  addMonths,
  dayOfMonth,
  daysInMonth,
  formatDateLong,
  formatMonthYear,
  formatTime,
  weekdayOf,
  type Ymd,
} from "@/lib/dates";

/** Builds the weeks of a month as rows of 7 cells; null marks days outside the month. */
export function monthGrid(month: string): (Ymd | null)[][] {
  const [year, mon] = month.split("-").map(Number);
  const first = `${month}-01`;
  const cells: (Ymd | null)[] = Array.from({ length: weekdayOf(first) }, () => null);
  for (let day = 1; day <= daysInMonth(year, mon); day += 1) {
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Ymd | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function MonthNav({
  month,
  min,
  max,
  onChange,
  label,
  compact = false,
}: {
  month: string;
  min: string;
  max: string;
  onChange: (month: string) => void;
  label: string;
  /** Arrow-only buttons, for narrow calendars. */
  compact?: boolean;
}) {
  const text = compact ? "sr-only" : "hidden sm:inline";
  const step = (delta: number) => onChange(addMonths(`${month}-01`, delta).slice(0, 7));
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        className="btn btn-quiet btn-sm"
        onClick={() => step(-1)}
        disabled={month <= min}
        aria-label={`Previous month (${label})`}
      >
        <ChevronLeft size={18} />
        <span className={text}>Previous</span>
      </button>
      <p className="caps text-xl text-navy sm:text-2xl" aria-live="polite">
        {formatMonthYear(month)}
      </p>
      <button
        type="button"
        className="btn btn-quiet btn-sm"
        onClick={() => step(1)}
        disabled={month >= max}
        aria-label={`Next month (${label})`}
      >
        <span className={text}>Next</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

/** List / Month switcher for the events page. The list is rendered on the server and passed in. */
export function EventsViews({
  today,
  entries,
  children,
}: {
  today: Ymd;
  entries: CalendarEntry[];
  children: ReactNode;
}) {
  const [view, setView] = useState<"list" | "month">("list");
  const thisMonth = today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const lastMonth = addMonths(`${thisMonth}-01`, 12).slice(0, 7);

  const byDate = new Map<Ymd, CalendarEntry[]>();
  for (const entry of entries) {
    if (!entry.date.startsWith(month)) continue;
    byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
  }
  const monthEntries = entries.filter((entry) => entry.date.startsWith(month));

  return (
    <div>
      <div className="mb-6 flex items-center gap-2" role="group" aria-label="Choose how to view events">
        {(["list", "month"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setView(option)}
            className={`btn btn-sm ${view === option ? "btn-navy" : "btn-quiet"}`}
          >
            {option === "list" ? "List" : "Month"}
          </button>
        ))}
      </div>

      <div hidden={view !== "list"}>{children}</div>

      {view === "month" && (
        <div>
          <MonthNav month={month} min={thisMonth} max={lastMonth} onChange={setMonth} label="events calendar" />

          <table className="mt-4 w-full table-fixed border-collapse">
            <caption className="sr-only">Events in {formatMonthYear(month)}</caption>
            <thead>
              <tr>
                {WEEKDAY_NAMES.map((name, i) => (
                  <th key={name} scope="col" className="caps border-b-2 border-navy pb-2 text-center text-sm text-navy">
                    <span className="sr-only">{name}</span>
                    <span aria-hidden="true">{WEEKDAY_SHORT[i]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGrid(month).map((week, w) => (
                <tr key={w}>
                  {week.map((date, d) => {
                    const dayEntries = date ? (byDate.get(date) ?? []) : [];
                    const isToday = date === today;
                    return (
                      <td
                        key={d}
                        className={`h-16 border border-line-soft p-1 align-top sm:h-28 sm:p-1.5 ${
                          date ? (date < today ? "bg-cloud" : "bg-white") : "bg-cloud/60"
                        }`}
                      >
                        {date && (
                          <>
                            <span
                              className={`inline-flex size-7 items-center justify-center rounded-full text-sm font-bold ${
                                isToday ? "bg-flag text-white" : "text-ink"
                              }`}
                            >
                              <span className="sr-only">{formatDateLong(date)}</span>
                              <span aria-hidden="true">{dayOfMonth(date)}</span>
                            </span>
                            {isToday && <span className="sr-only"> (today)</span>}
                            {/* Small screens: a dot per event; full details are listed below the grid. */}
                            {dayEntries.length > 0 && (
                              <span className="mt-1 flex flex-wrap gap-1 sm:hidden" aria-hidden="true">
                                {dayEntries.slice(0, 3).map((entry) => (
                                  <span key={entry.slug} className="size-2 rounded-full bg-azure" />
                                ))}
                              </span>
                            )}
                            <ul className="mt-0.5 hidden space-y-1 sm:block">
                              {dayEntries.map((entry) => (
                                <li key={entry.slug}>
                                  <Link
                                    href={`/events/${entry.slug}`}
                                    className={`block rounded border-l-[3px] border-azure bg-fog px-1.5 py-1 text-[0.8125rem] font-semibold leading-tight text-navy hover:bg-azure hover:text-white ${
                                      entry.cancelled ? "line-through opacity-70" : ""
                                    }`}
                                  >
                                    {entry.startTime && (
                                      <span className="block text-xs font-normal">{formatTime(entry.startTime)}</span>
                                    )}
                                    {entry.title}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 sm:hidden">
            <h3>Events in {formatMonthYear(month)}</h3>
            {monthEntries.length ? (
              <ul className="mt-2 divide-y divide-line-soft">
                {monthEntries.map((entry) => (
                  <li key={`${entry.slug}-${entry.date}`} className="py-3">
                    <Link href={`/events/${entry.slug}`} className="font-bold text-azure underline">
                      {entry.title}
                    </Link>
                    <p className="text-[0.9375rem]">
                      {formatDateLong(entry.date)}
                      {entry.startTime ? `, ${formatTime(entry.startTime)}` : ""}
                      {entry.cancelled ? " — cancelled" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2">Nothing is scheduled this month yet.</p>
            )}
          </div>
          {monthEntries.length === 0 && (
            <p className="mt-4 hidden text-center sm:block">Nothing is scheduled this month yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

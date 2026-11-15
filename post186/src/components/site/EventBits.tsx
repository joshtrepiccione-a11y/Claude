import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "@/components/icons";
import {
  dayOfMonth,
  formatDateLong,
  formatMonthAbbrev,
  formatTimeRange,
  WEEKDAY_SHORT,
  weekdayOf,
  type Ymd,
} from "@/lib/dates";
import { describeRecurrence } from "@/lib/recurrence";
import { categoryLabel, type EventRecord, type Occurrence } from "@/lib/types";

/** The calendar-page style date block: weekday, day number, month. */
export function DateBadge({ date, tone = "light" }: { date: Ymd; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <span
      aria-hidden="true"
      className={`flex w-[4.25rem] flex-none flex-col items-center overflow-hidden rounded-md border text-center ${
        dark ? "border-white/30 bg-white/10 text-white" : "border-line bg-white text-navy"
      }`}
    >
      <span className={`caps w-full py-0.5 text-[0.8125rem] ${dark ? "bg-flag text-white" : "bg-navy text-white"}`}>
        {formatMonthAbbrev(date)}
      </span>
      <span className="caps pt-1 text-[1.75rem] leading-none">{dayOfMonth(date)}</span>
      <span className={`pb-1 text-xs font-semibold ${dark ? "text-white/80" : "text-body"}`}>
        {WEEKDAY_SHORT[weekdayOf(date)]}
      </span>
    </span>
  );
}

export function EventBadges({ event }: { event: EventRecord }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {event.cancelled && <span className="badge badge-bad">Cancelled</span>}
      <span className="badge">{categoryLabel(event.category)}</span>
      {event.audience === "members" ? (
        <span className="badge badge-warn">Members</span>
      ) : (
        <span className="badge badge-ok">Open to the public</span>
      )}
    </span>
  );
}

/** One line in an events list. The whole title is the link target. */
export function EventRow({ occurrence, showSummary = true }: { occurrence: Occurrence; showSummary?: boolean }) {
  const { date, event } = occurrence;
  const repeat = describeRecurrence(event);
  return (
    <li className="flex gap-4 py-5 sm:gap-5">
      <DateBadge date={date} />
      <div className="min-w-0 flex-1">
        <EventBadges event={event} />
        <h3 className="mt-1.5">
          <Link
            href={`/events/${event.slug}`}
            className={`-my-2 inline-block py-2 text-navy hover:text-azure hover:underline ${event.cancelled ? "line-through decoration-2" : ""}`}
          >
            {event.title}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.9375rem] font-semibold text-ink">
          <span className="sr-only">{formatDateLong(date)}, </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={16} className="text-azure" />
            {formatTimeRange(event.startTime, event.endTime)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={16} className="text-azure" />
              {event.location}
            </span>
          )}
          {repeat && <span className="font-normal text-body">{repeat}</span>}
        </p>
        {showSummary && event.summary && <p className="mt-1.5 max-w-3xl">{event.summary}</p>}
      </div>
      <Link
        href={`/events/${event.slug}`}
        aria-hidden="true"
        tabIndex={-1}
        className="hidden self-center rounded-full border border-line p-3 text-azure hover:border-azure hover:bg-azure hover:text-white md:block"
      >
        <ArrowRight size={20} />
      </Link>
    </li>
  );
}

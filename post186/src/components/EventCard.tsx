import Link from "next/link";
import type { Event } from "@/lib/events";
import { dateBlockParts, formatEventWhen } from "@/lib/time";

export function DateBlock({ iso }: { iso: string }) {
  const p = dateBlockParts(iso);
  return (
    <div className="date-block" aria-hidden="true">
      <span className="month">{p.month}</span>
      <span className="day">{p.day}</span>
      <span className="weekday">{p.weekday}</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: Event["status"] }) {
  if (status === "cancelled") return <span className="badge badge-cancelled">Cancelled</span>;
  if (status === "postponed") return <span className="badge badge-postponed">Postponed</span>;
  return null;
}

export function EventCard({ event, categoryLabel, headingLevel = 3 }: { event: Event; categoryLabel?: string; headingLevel?: 2 | 3 }) {
  const Heading = (headingLevel === 2 ? "h2" : "h3") as "h2" | "h3";
  return (
    <article className={`card event-card${event.status === "cancelled" ? " is-cancelled" : ""}`}>
      <DateBlock iso={event.start_at} />
      <div>
        <Heading>
          <Link href={`/events/${event.slug}`}>{event.title}</Link> <StatusBadge status={event.status} />
        </Heading>
        <p className="meta">
          {formatEventWhen(event.start_at, event.end_at, Boolean(event.all_day))}
          {event.location ? <> &middot; {event.location}</> : null}
          {categoryLabel ? <> &middot; {categoryLabel}</> : null}
        </p>
        {event.summary ? <p>{event.summary}</p> : null}
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, Calendar, ChevronLeft, Clock, MapPin } from "@/components/icons";
import { EventBadges } from "@/components/site/EventBits";
import { PageHeader } from "@/components/site/PageHeader";
import { RichText } from "@/components/site/RichText";
import { getEventDetail, getEventSlugs, getSettings } from "@/lib/data";
import { formatDateLong, formatDateShort, formatTimeRange } from "@/lib/dates";
import { googleCalendarUrl } from "@/lib/ics";
import { describeRecurrence } from "@/lib/recurrence";
import { fullPostName } from "@/lib/settings";
import { siteUrl } from "@/lib/site";

type Props = PageProps<"/events/[slug]">;

const PLACEHOLDER = "__none__";

// Pages for existing events are built ahead of time; new ones are built on first visit.
export async function generateStaticParams() {
  const slugs = await getEventSlugs();
  return (slugs.length ? slugs : [PLACEHOLDER]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getEventDetail(slug);
  if (!detail) return { title: "Event not found" };
  const { event, displayDate } = detail;
  return {
    title: event.title,
    description:
      event.summary ||
      `${event.title} — ${formatDateLong(displayDate)} at American Legion Post 186, Hammonton, NJ.`,
    alternates: { canonical: `/events/${event.slug}` },
  };
}

async function EventContent({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const [detail, settings] = await Promise.all([getEventDetail(slug), getSettings()]);
  if (!detail) notFound();

  const { event, displayDate, isPast, upcomingDates } = detail;
  const repeat = describeRecurrence(event);
  const base = siteUrl();
  const mapUrl = event.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary || undefined,
    startDate: event.startTime ? `${displayDate}T${event.startTime}` : displayDate,
    endDate: event.startTime && event.endTime ? `${displayDate}T${event.endTime}` : undefined,
    eventStatus: event.cancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: event.location
      ? { "@type": "Place", name: event.location, address: event.location }
      : undefined,
    organizer: { "@type": "Organization", name: fullPostName(settings), url: base },
    url: `${base}/events/${event.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PageHeader title={event.title} crumbs={[{ href: "/events", label: "Events" }]} />

      <div className="container-page grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article>
          <EventBadges event={event} />

          {event.cancelled && (
            <p role="status" className="mt-4 rounded-md border-l-4 border-flag bg-bad-soft px-4 py-3 font-semibold text-flag-dark">
              This event has been cancelled.
            </p>
          )}
          {isPast && !event.cancelled && (
            <p className="mt-4 rounded-md border-l-4 border-line bg-cloud px-4 py-3 font-semibold text-ink">
              This event has already taken place.
            </p>
          )}

          {event.summary && <p className="mt-5 text-xl leading-relaxed text-ink">{event.summary}</p>}
          {event.description && <RichText text={event.description} className="mt-5" />}

          {upcomingDates.length > 1 && (
            <section aria-labelledby="dates-heading" className="mt-10">
              <h2 id="dates-heading" className="text-2xl">
                Upcoming dates
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {upcomingDates.map((date) => (
                  <li key={date} className="flex items-center gap-2 rounded-md bg-cloud px-4 py-2.5 font-semibold text-ink">
                    <Calendar size={18} className="text-azure" />
                    {formatDateLong(date)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-10">
            <Link href="/events" className="link-arrow">
              <ChevronLeft size={18} /> All events
            </Link>
          </p>
        </article>

        <aside>
          <div className="card overflow-hidden">
            <div className="bg-navy px-6 py-4">
              <h2 className="text-xl text-white">Event details</h2>
            </div>
            <dl className="space-y-5 p-6">
              <div className="flex gap-3">
                <Calendar size={22} className="mt-0.5 flex-none text-azure" />
                <div>
                  <dt className="text-sm font-semibold uppercase tracking-wide text-body">
                    {isPast ? "Date" : repeat ? "Next date" : "Date"}
                  </dt>
                  <dd className="font-bold text-ink">{formatDateLong(displayDate)}</dd>
                  {repeat && <dd className="text-[0.9375rem]">{repeat}</dd>}
                </div>
              </div>
              <div className="flex gap-3">
                <Clock size={22} className="mt-0.5 flex-none text-azure" />
                <div>
                  <dt className="text-sm font-semibold uppercase tracking-wide text-body">Time</dt>
                  <dd className="font-bold text-ink">{formatTimeRange(event.startTime, event.endTime)}</dd>
                </div>
              </div>
              {event.location && (
                <div className="flex gap-3">
                  <MapPin size={22} className="mt-0.5 flex-none text-azure" />
                  <div>
                    <dt className="text-sm font-semibold uppercase tracking-wide text-body">Where</dt>
                    <dd className="font-bold text-ink">{event.location}</dd>
                    {mapUrl && (
                      <dd>
                        <a href={mapUrl} rel="noopener" className="link text-[0.9375rem]">
                          Open in Maps
                        </a>
                      </dd>
                    )}
                  </div>
                </div>
              )}
            </dl>
            {!isPast && !event.cancelled && (
              <div className="space-y-2.5 border-t border-line p-6">
                <p className="font-bold text-ink">Add to your calendar</p>
                <a href={`/events/calendar.ics?event=${event.slug}`} className="btn btn-blue btn-sm w-full">
                  Apple / Outlook (.ics)
                </a>
                <a
                  href={googleCalendarUrl(event, displayDate, base)}
                  rel="noopener"
                  className="btn btn-outline btn-sm w-full"
                >
                  Google Calendar
                </a>
                {repeat && (
                  <p className="text-sm">
                    {repeat}. The calendar file adds every date; the Google link adds{" "}
                    {formatDateShort(displayDate)} only.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-md bg-cloud p-6">
            <h2 className="text-xl">Questions?</h2>
            <p className="mt-1.5">
              {settings.phone ? `Call the post at ${settings.phone} or send` : "Send"} us a message.
            </p>
            <Link href="/officers#contact" className="link-arrow mt-3">
              Contact the post <ArrowRight size={18} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function EventPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="container-page py-24" aria-busy="true" />}>
      <EventContent params={params} />
    </Suspense>
  );
}

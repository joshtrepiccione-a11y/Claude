import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { RichText } from "@/components/RichText";
import { JsonLd } from "@/components/JsonLd";
import { StatusBadge } from "@/components/EventCard";
import { categoryName } from "@/lib/categories";
import { getPublicEvent } from "@/lib/events";
import { googleCalendarUrl } from "@/lib/ics";
import { plainText } from "@/lib/markdown";
import { SITE, absoluteUrl } from "@/lib/site";
import { formatEventWhen, formatShortDate } from "@/lib/time";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) return { title: "Event not found" };
  const description = event.summary || plainText(event.description) || `${event.title} at ${SITE.shortName}.`;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      title: event.title,
      description,
      url: absoluteUrl(`/events/${event.slug}`),
      images: event.featured_image ? [{ url: event.featured_image, alt: event.image_alt }] : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  const url = absoluteUrl(`/events/${event.slug}`);
  const description = event.summary || plainText(event.description, 400);
  const gcal = googleCalendarUrl({
    uid: `event-${event.id}@post186`,
    title: event.title,
    description,
    location: event.location,
    url,
    startIso: event.start_at,
    endIso: event.end_at,
    allDay: Boolean(event.all_day),
    status: event.status,
  });

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description,
    startDate: event.start_at,
    endDate: event.end_at,
    url,
    eventStatus:
      event.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : event.status === "postponed"
          ? "https://schema.org/EventPostponed"
          : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.location || SITE.name,
      address: event.location && !/french street/i.test(event.location) ? event.location : {
        "@type": "PostalAddress",
        streetAddress: SITE.streetAddress,
        addressLocality: SITE.city,
        addressRegion: SITE.region,
        postalCode: SITE.postalCode,
        addressCountry: "US",
      },
    },
    organizer: { "@type": "Organization", name: event.organizer || SITE.name },
  };
  if (event.featured_image) jsonLd.image = [event.featured_image];

  return (
    <PublicShell>
      <div className="container detail-header">
        <p className="breadcrumb">
          <Link href="/events">Events</Link> &rsaquo; {event.title}
        </p>
        <h1>
          {event.title} <StatusBadge status={event.status} />
        </h1>
        {event.status === "cancelled" ? (
          <div className="notice notice-warn">
            <p>
              <strong>This event has been cancelled.</strong> We are sorry for any inconvenience. Please check back for updates or contact the Post.
            </p>
          </div>
        ) : null}
        {event.status === "postponed" ? (
          <div className="notice notice-warn">
            <p>
              <strong>This event has been postponed.</strong> A new date has not been confirmed yet. The date shown below is the original date.
            </p>
          </div>
        ) : null}
        <dl className="detail-facts">
          <dt>When</dt>
          <dd>{formatEventWhen(event.start_at, event.end_at, Boolean(event.all_day))}</dd>
          <dt>Where</dt>
          <dd>
            {event.location || SITE.fullAddress}
            {!event.location || /french street|post 186/i.test(event.location) ? (
              <>
                {" "}
                &middot;{" "}
                <a href={SITE.mapsUrl} rel="noopener">
                  Directions
                </a>
              </>
            ) : null}
          </dd>
          {event.category ? (
            <>
              <dt>Category</dt>
              <dd>{await categoryName("event", event.category)}</dd>
            </>
          ) : null}
          {event.cost ? (
            <>
              <dt>Cost</dt>
              <dd>{event.cost}</dd>
            </>
          ) : null}
          {event.organizer ? (
            <>
              <dt>Organizer</dt>
              <dd>{event.organizer}</dd>
            </>
          ) : null}
          {event.recurrence ? (
            <>
              <dt>Repeats</dt>
              <dd>{event.recurrence}</dd>
            </>
          ) : null}
          {event.accessibility_notes ? (
            <>
              <dt>Accessibility</dt>
              <dd>{event.accessibility_notes}</dd>
            </>
          ) : null}
        </dl>
        <div className="detail-actions">
          {event.status !== "cancelled" ? (
            <>
              <a href={`/events/${event.slug}/event.ics`} className="btn btn-secondary btn-sm" download={`${event.slug}.ics`}>
                Add to calendar (.ics)
              </a>
              <a href={gcal} className="btn btn-outline btn-sm" rel="noopener">
                Add to Google Calendar
              </a>
            </>
          ) : null}
          {event.link_url ? (
            <a href={event.link_url} className="btn btn-outline btn-sm" rel="noopener">
              {event.link_label || "Registration and details"}
            </a>
          ) : null}
        </div>
      </div>
      <section className="section">
        <div className="container">
          {event.featured_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.featured_image} alt={event.image_alt} style={{ maxWidth: "48rem", borderRadius: "4px", marginBottom: "1.5rem" }} />
          ) : null}
          {event.description ? <RichText text={event.description} /> : event.summary ? <p className="prose">{event.summary}</p> : null}
          <p className="meta" style={{ marginTop: "2rem" }}>
            Last updated {formatShortDate(event.updated_at)}. Questions about this event? <Link href="/contact">Contact the Post</Link>.
          </p>
        </div>
      </section>
      <JsonLd data={jsonLd} />
    </PublicShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { CONTENT_CACHE } from "@/lib/cache";
import { Calendar } from "@/components/icons";
import { EventRow } from "@/components/site/EventBits";
import { EventsViews } from "@/components/site/MonthCalendar";
import { PageHeader } from "@/components/site/PageHeader";
import { getEventsPageData, getSettings } from "@/lib/data";
import { formatMonthYear, monthKey } from "@/lib/dates";
import { siteUrl } from "@/lib/site";
import type { Occurrence } from "@/lib/types";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Meetings, ceremonies, fundraisers and community events at American Legion Post 186 in Hammonton, NJ. Subscribe to the post calendar.",
  alternates: { canonical: "/events" },
};

function groupByMonth(occurrences: Occurrence[]): [string, Occurrence[]][] {
  const groups = new Map<string, Occurrence[]>();
  for (const occurrence of occurrences) {
    const key = monthKey(occurrence.date);
    groups.set(key, [...(groups.get(key) ?? []), occurrence]);
  }
  return [...groups.entries()];
}

async function EventsContent() {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("events", "settings");
  const [data, settings] = await Promise.all([getEventsPageData(), getSettings()]);

  const feedUrl = `${siteUrl()}/events/calendar.ics`;
  const webcalUrl = feedUrl.replace(/^https?:/, "webcal:");
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  return (
    <div className="container-page grid gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <EventsViews today={data.today} entries={data.calendar}>
          {data.upcoming.length ? (
            <>
              {groupByMonth(data.upcoming).map(([month, occurrences]) => (
                <section key={month} aria-labelledby={`month-${month}`} className="mb-8">
                  <h2 id={`month-${month}`} className="border-b-2 border-navy pb-2 text-2xl md:text-3xl">
                    {formatMonthYear(month)}
                  </h2>
                  <ul className="divide-y divide-line-soft">
                    {occurrences.map((occurrence) => (
                      <EventRow key={`${occurrence.event.id}-${occurrence.date}`} occurrence={occurrence} />
                    ))}
                  </ul>
                </section>
              ))}
              <p className="text-[0.9375rem]">
                Showing the next ten weeks. Switch to <strong>Month</strong> above to look further ahead.
              </p>
            </>
          ) : (
            <div className="rounded-md bg-cloud p-6">
              <h2 className="text-2xl">No upcoming events are posted yet</h2>
              <p className="mt-2">{settings.meetingSchedule}</p>
              <Link href="/officers#contact" className="link-arrow mt-3">
                Contact the post
              </Link>
            </div>
          )}
        </EventsViews>

        {data.past.length > 0 && (
          <details className="mt-10 rounded-md border border-line">
            <summary className="caps cursor-pointer px-5 py-4 text-xl text-navy">Past events</summary>
            <ul className="divide-y divide-line-soft border-t border-line px-5">
              {data.past.map((occurrence) => (
                <EventRow
                  key={`${occurrence.event.id}-${occurrence.date}`}
                  occurrence={occurrence}
                  showSummary={false}
                />
              ))}
            </ul>
          </details>
        )}
      </div>

      <aside className="space-y-6">
        <section id="subscribe" aria-labelledby="subscribe-heading" className="card scroll-mt-28 p-6">
          <Calendar size={28} className="text-flag" />
          <h2 id="subscribe-heading" className="mt-3 text-2xl">
            Subscribe to the calendar
          </h2>
          <p className="mt-2 text-[0.9375rem]">
            Add every post event to your own calendar. New and changed events appear automatically.
          </p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a href={webcalUrl} className="btn btn-blue btn-sm w-full">
                Apple / Outlook
              </a>
            </li>
            <li>
              <a href={googleUrl} rel="noopener" className="btn btn-outline btn-sm w-full">
                Google Calendar
              </a>
            </li>
            <li>
              <a href="/events/calendar.ics" className="link text-[0.9375rem]">
                Download the calendar file (.ics)
              </a>
            </li>
          </ul>
        </section>

        <section aria-labelledby="meetings-heading" className="rounded-md bg-cloud p-6">
          <h2 id="meetings-heading" className="text-2xl">
            Meetings
          </h2>
          <p className="mt-2">{settings.meetingSchedule}</p>
        </section>

        <section aria-labelledby="host-heading" className="rounded-md bg-navy p-6 text-white">
          <h2 id="host-heading" className="text-2xl text-white">
            Planning your own event?
          </h2>
          <p className="mt-2 text-white/90">
            The hall is available to rent for parties, showers and community gatherings.
          </p>
          <Link href="/hall-rental" className="btn btn-red btn-sm mt-4">
            Rent the hall
          </Link>
        </section>
      </aside>
    </div>
  );
}

export default function EventsPage() {
  return (
    <>
      <PageHeader
        title="Events"
        lead="Meetings, ceremonies and community gatherings at Post 186. Everyone is welcome at events marked open to the public."
      />
      <EventsContent />
    </>
  );
}

import Link from "next/link";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { Empty, Flash, Panel, StatusBadge } from "@/components/admin/ui";
import { Alert, ArrowRight, Plus } from "@/components/icons";
import { loadSampleContent, removeSampleContent } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { addDays, formatDateShort, formatTimeRange, todayInPostTz } from "@/lib/dates";
import { isPreviewDatabase } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { occurrencesBetween } from "@/lib/recurrence";
import * as repo from "@/lib/repo";
import { MEETING_SLUG } from "@/lib/seed";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const { saved } = await searchParams;
  const today = todayInPostTz();

  const [counts, unread, events, pending, settings, demoRows, officers] = await Promise.all([
    repo.countBookings(),
    repo.countUnreadMessages(),
    repo.listEvents(),
    repo.listBookings("pending"),
    repo.readSettings(),
    repo.countDemoRows(),
    repo.listOfficers(),
  ]);

  const upcoming = events
    .filter((event) => event.published)
    .flatMap((event) => occurrencesBetween(event, today, addDays(today, 45)).map((date) => ({ date, event })))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  // Things worth doing before (or soon after) the site goes live.
  const todo: { text: string; href: string }[] = [];
  if (isPreviewDatabase())
    todo.push({
      text: "This is a preview without a permanent database, so nothing entered here is kept and you may be signed out at any time. Add the database settings to make the site live (see “Putting it online” in the README).",
      href: "/admin/settings",
    });
  const meetingDraft = events.find((event) => event.slug === MEETING_SLUG && !event.published);
  if (meetingDraft)
    todo.push({
      text: "The monthly meeting (second Tuesday) is saved as a draft. Open it, untick “All day”, enter the start time, tick “Show on the website” and save.",
      href: `/admin/events/${meetingDraft.id}`,
    });
  if (demoRows > 0) todo.push({ text: "Remove the sample events and bookings before launch.", href: "#sample" });
  if (!settings.notifyEmail)
    todo.push({ text: "Add the email address that should receive hall requests and messages.", href: "/admin/settings" });
  if (!emailConfigured())
    todo.push({ text: "Email sending is not set up yet, so nothing is emailed. Requests still appear here. See the README.", href: "/admin/settings" });
  if (!settings.hall.rates.length)
    todo.push({ text: "Add hall rental rates (or leave them off and quote each request).", href: "/admin/settings" });
  if (officers.length < 4)
    todo.push({ text: "Check the officer list and add anyone who is missing.", href: "/admin/officers" });
  if (!upcoming.length) todo.push({ text: "Add your next meeting or event.", href: "/admin/events/new" });

  const stats = [
    { label: "Hall requests waiting", value: counts.pending, href: "/admin/bookings?status=pending", alert: counts.pending > 0 },
    { label: "Unread messages", value: unread, href: "/admin/messages", alert: unread > 0 },
    { label: "Approved bookings", value: counts.approved, href: "/admin/bookings?status=approved", alert: false },
    { label: "Events in next 45 days", value: upcoming.length, href: "/admin/events", alert: false },
  ];

  return (
    <>
      <h1 className="mb-6 text-3xl md:text-4xl">Dashboard</h1>
      <Flash saved={saved} />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link
              href={stat.href}
              className={`card block p-5 hover:border-navy ${stat.alert ? "border-l-4 border-l-flag" : ""}`}
            >
              <span className="font-display text-4xl font-extrabold text-navy">{stat.value}</span>
              <span className="mt-1 block font-semibold text-ink">{stat.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/admin/events/new" className="btn btn-red">
          <Plus size={18} /> Add an Event
        </Link>
        <Link href="/admin/bookings/new" className="btn btn-navy">
          <Plus size={18} /> Add a Booking
        </Link>
        <Link href="/admin/officers/new" className="btn btn-quiet">
          <Plus size={18} /> Add an Officer
        </Link>
      </div>

      {todo.length > 0 && (
        <Panel title="To do" className="mt-8 border-l-4 border-l-warn">
          <ul className="space-y-2.5">
            {todo.map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <Alert size={20} className="mt-0.5 flex-none text-warn" />
                <span>
                  {item.text}{" "}
                  <Link href={item.href} className="link whitespace-nowrap">
                    Fix this
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel
          title="Hall requests waiting for review"
          action={
            <Link href="/admin/bookings" className="link-arrow text-[0.9375rem]">
              All bookings <ArrowRight size={16} />
            </Link>
          }
        >
          {pending.length ? (
            <ul className="divide-y divide-line-soft">
              {pending.slice(0, 6).map((booking) => (
                <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <Link href={`/admin/bookings/${booking.id}`} className="font-bold text-azure hover:underline">
                      {formatDateShort(booking.eventDate)} · {booking.contactName}
                    </Link>
                    <p className="text-[0.9375rem]">
                      {booking.eventType}, {booking.guestCount} guests,{" "}
                      {formatTimeRange(booking.startTime, booking.endTime)}
                    </p>
                  </div>
                  <StatusBadge status={booking.status} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing waiting. New requests from the website appear here.</Empty>
          )}
        </Panel>

        <Panel
          title="Coming up"
          action={
            <Link href="/admin/events" className="link-arrow text-[0.9375rem]">
              All events <ArrowRight size={16} />
            </Link>
          }
        >
          {upcoming.length ? (
            <ul className="divide-y divide-line-soft">
              {upcoming.map(({ date, event }) => (
                <li key={`${event.id}-${date}`} className="py-3">
                  <Link href={`/admin/events/${event.id}`} className="font-bold text-azure hover:underline">
                    {event.title}
                  </Link>
                  <p className="text-[0.9375rem]">
                    {formatDateShort(date)} · {formatTimeRange(event.startTime, event.endTime)}
                    {event.cancelled ? " · Cancelled" : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No events in the next 45 days.</Empty>
          )}
        </Panel>
      </div>

      <Panel title="Sample content" className="mt-6">
        <div id="sample" className="scroll-mt-24">
          {demoRows > 0 ? (
            <>
              <p>
                The site currently includes <strong>{demoRows} sample</strong> events and bookings, added so you can
                see how everything looks. They are marked “Sample” in the lists. Anything you have edited or added
                yourself is kept.
              </p>
              <form action={removeSampleContent} className="mt-4">
                <ConfirmButton message="Remove all sample events and bookings?" className="btn btn-danger">
                  Remove Sample Content
                </ConfirmButton>
              </form>
            </>
          ) : (
            <>
              <p>
                Want to see how the site looks when it is full? Add a set of sample events and hall bookings. You
                can remove them again with one click.
              </p>
              <form action={loadSampleContent} className="mt-4">
                <button type="submit" className="btn btn-quiet">
                  Add Sample Content
                </button>
              </form>
            </>
          )}
        </div>
      </Panel>
    </>
  );
}

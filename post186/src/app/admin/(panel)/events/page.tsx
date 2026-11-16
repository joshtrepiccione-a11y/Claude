import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { AdminTitle, Empty, Flash } from "@/components/admin/ui";
import { Copy, Pencil, Plus, Trash } from "@/components/icons";
import { deleteEvent, duplicateEvent } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { formatDateMedium, formatTimeRange, todayInPostTz } from "@/lib/dates";
import { describeRecurrence, nextOccurrence } from "@/lib/recurrence";
import { listEvents } from "@/lib/repo";
import { categoryLabel, type EventRecord } from "@/lib/types";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Events" };

function EventTable({ rows, caption }: { rows: { event: EventRecord; when: string }[]; caption: string }) {
  return (
    <div className="card scroll-x">
      <table className="table table-stack">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Event</th>
            <th scope="col">When</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ event, when }) => (
            <tr key={event.id}>
              <td>
                <Link href={`/admin/events/${event.id}`} className="font-bold text-azure hover:underline">
                  {event.title}
                </Link>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  <span className="badge">{categoryLabel(event.category)}</span>
                  {!event.published && <span className="badge badge-warn">Draft — not on website</span>}
                  {event.cancelled && <span className="badge badge-bad">Cancelled</span>}
                  {event.usesHall && <span className="badge">Uses hall</span>}
                  {event.isDemo && <span className="badge badge-solid">Sample</span>}
                </span>
              </td>
              <td className="whitespace-nowrap">
                <span className="font-semibold text-ink">{when}</span>
                <span className="block text-[0.9375rem]">{formatTimeRange(event.startTime, event.endTime)}</span>
                {event.recurrence !== "none" && (
                  <span className="block text-[0.9375rem]">{describeRecurrence(event)}</span>
                )}
              </td>
              <td>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Link href={`/admin/events/${event.id}`} className="btn btn-quiet btn-sm">
                    <Pencil size={15} /> Edit
                  </Link>
                  <form action={duplicateEvent}>
                    <input type="hidden" name="id" value={event.id} />
                    <button type="submit" className="btn btn-quiet btn-sm">
                      <Copy size={15} /> Copy
                    </button>
                  </form>
                  <form action={deleteEvent}>
                    <input type="hidden" name="id" value={event.id} />
                    <ConfirmButton message={`Delete “${event.title}”? This cannot be undone.`}>
                      <Trash size={15} /> Delete
                    </ConfirmButton>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function EventsAdmin({ searchParams }: PageProps<"/admin/events">) {
  await requireAdmin();
  const { saved } = await searchParams;
  const today = todayInPostTz();
  const events = await listEvents();

  const current: { event: EventRecord; when: string; sort: string }[] = [];
  const past: { event: EventRecord; when: string; sort: string }[] = [];
  for (const event of events) {
    const next = nextOccurrence(event, today);
    if (next) {
      current.push({
        event,
        sort: next,
        when: event.recurrence === "none" ? formatDateMedium(next) : `Next: ${formatDateMedium(next)}`,
      });
    } else {
      past.push({ event, sort: event.startDate, when: formatDateMedium(event.startDate) });
    }
  }
  current.sort((a, b) => a.sort.localeCompare(b.sort));
  past.sort((a, b) => b.sort.localeCompare(a.sort));

  return (
    <>
      <AdminTitle
        title="Events"
        intro="Everything here appears on the website's Events page and in the calendar people subscribe to. Changes show up right away."
      >
        <Link href="/admin/events/new" className="btn btn-red">
          <Plus size={18} /> Add an Event
        </Link>
      </AdminTitle>
      <Flash saved={saved} />

      <h2 className="mb-3 text-xl md:text-2xl">Upcoming and repeating</h2>
      {current.length ? (
        <EventTable rows={current} caption="Upcoming and repeating events" />
      ) : (
        <Empty>
          No upcoming events yet.{" "}
          <Link href="/admin/events/new" className="link">
            Add the first one
          </Link>
          .
        </Empty>
      )}

      {past.length > 0 && (
        <details className="mt-8">
          <summary className="caps cursor-pointer py-2 text-xl text-navy">Past events ({past.length})</summary>
          <div className="mt-3">
            <EventTable rows={past} caption="Past events" />
          </div>
        </details>
      )}
    </>
  );
}

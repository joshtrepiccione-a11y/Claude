import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAllEvents } from "@/lib/events";
import { formatShortDate, formatTime } from "@/lib/time";
import { Flash } from "@/components/admin/Flash";

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ deleted?: string; archived?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const archived = sp.archived === "1";
  const events = await listAllEvents({ archived });
  return (
    <>
      <h1>{archived ? "Archived events" : "Events"}</h1>
      <Flash deleted={sp.deleted} />
      <div className="admin-toolbar">
        <Link href="/admin/events/new" className="btn btn-secondary btn-sm">
          Add an event
        </Link>
        <Link href={archived ? "/admin/events" : "/admin/events?archived=1"} className="btn btn-outline btn-sm">
          {archived ? "Show active events" : "Show archived events"}
        </Link>
      </div>
      {events.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Date</th>
                <th scope="col">Visibility</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/admin/events/${e.id}`}>{e.title}</Link>
                  </td>
                  <td>
                    {formatShortDate(e.start_at)}
                    {e.all_day ? "" : `, ${formatTime(e.start_at)}`}
                  </td>
                  <td>{e.is_public ? <span className="tag tag-published">Public</span> : <span className="tag">Private</span>}</td>
                  <td>
                    <span className="tag">{e.status}</span>
                  </td>
                  <td>{e.is_public && !e.is_archived ? <Link href={`/events/${e.slug}`} target="_blank" rel="noopener">View</Link> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="lead">{archived ? "No archived events." : "No events yet. Add the first one."}</p>
      )}
    </>
  );
}

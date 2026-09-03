import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/categories";
import { getEventById } from "@/lib/events";
import { utcToLocalInput } from "@/lib/time";
import { EventForm } from "@/components/admin/EventForm";
import { Flash } from "@/components/admin/Flash";
import { eventQuickAction } from "@/app/admin/actions";

export default async function EditEventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const event = await getEventById(Number(id));
  if (!event) notFound();
  const initial: Record<string, string> = {
    title: event.title,
    slug: event.slug,
    summary: event.summary,
    description: event.description,
    start_at: utcToLocalInput(event.start_at),
    end_at: utcToLocalInput(event.end_at),
    all_day: event.all_day ? "on" : "",
    location: event.location,
    is_public: event.is_public ? "on" : "",
    category: event.category,
    featured_image: event.featured_image,
    image_alt: event.image_alt,
    organizer: event.organizer,
    cost: event.cost,
    link_url: event.link_url,
    link_label: event.link_label,
    accessibility_notes: event.accessibility_notes,
    recurrence: event.recurrence,
    status: event.status,
    is_featured: event.is_featured ? "on" : "",
    is_archived: event.is_archived ? "on" : "",
  };
  const quick = (action: string, label: string, cls = "btn-outline") => (
    <form action={eventQuickAction} className="inline-form">
      <input type="hidden" name="id" value={event.id} />
      <input type="hidden" name="action" value={action} />
      <button type="submit" className={`btn ${cls} btn-sm`}>
        {label}
      </button>
    </form>
  );
  return (
    <>
      <p className="breadcrumb">
        <Link href="/admin/events">Events</Link> &rsaquo; Edit
      </p>
      <h1>{event.title}</h1>
      <p className="meta">
        <span className="tag">{event.status}</span> &nbsp;
        {event.is_public ? <span className="tag tag-published">Public</span> : <span className="tag">Private</span>}
        {event.is_public && !event.is_archived ? (
          <>
            {" "}
            &middot;{" "}
            <Link href={`/events/${event.slug}`} target="_blank" rel="noopener">
              View on the site
            </Link>
          </>
        ) : null}
      </p>
      <Flash saved={sp.saved} />
      <div className="admin-toolbar" aria-label="Quick actions">
        {event.status !== "cancelled" ? quick("cancel", "Cancel event") : quick("reschedule", "Mark as scheduled again")}
        {event.status !== "postponed" ? quick("postpone", "Mark postponed") : null}
        {event.is_archived ? quick("unarchive", "Restore from archive") : quick("archive", "Archive")}
      </div>
      <EventForm id={event.id} initial={initial} categories={await listCategories("event")} />
      <div style={{ marginTop: "2rem" }}>{quick("delete", "Delete this event permanently", "btn-danger")}</div>
    </>
  );
}

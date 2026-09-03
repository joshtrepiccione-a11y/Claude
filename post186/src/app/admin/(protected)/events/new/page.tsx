import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/categories";
import { utcToLocalInput } from "@/lib/time";
import { EventForm } from "@/components/admin/EventForm";

export default async function NewEventPage() {
  await requireAdmin();
  const start = new Date();
  start.setDate(start.getDate() + 7);
  start.setHours(19, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const initial = { status: "scheduled", start_at: utcToLocalInput(start.toISOString()), end_at: utcToLocalInput(end.toISOString()) };
  return (
    <>
      <h1>Add an event</h1>
      <p className="meta">New events are private until you check &quot;Show on the public calendar&quot;.</p>
      <EventForm id={null} initial={initial} categories={await listCategories("event")} />
    </>
  );
}

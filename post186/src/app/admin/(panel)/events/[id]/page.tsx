import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/forms";
import { AdminTitle } from "@/components/admin/ui";
import { External } from "@/components/icons";
import { requireAdmin } from "@/lib/auth";
import { getEvent } from "@/lib/repo";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Edit Event" };

export default async function EditEvent({ params }: PageProps<"/admin/events/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const event = /^\d+$/.test(id) ? await getEvent(Number(id)) : null;
  if (!event) notFound();

  return (
    <>
      <AdminTitle title="Edit Event" back={{ href: "/admin/events", label: "All events" }}>
        {event.published && (
          <Link href={`/events/${event.slug}`} className="btn btn-quiet btn-sm">
            View on website <External size={15} />
          </Link>
        )}
      </AdminTitle>
      {event.isDemo && (
        <p className="mb-6 rounded-md bg-warn-soft px-4 py-3 text-ink">
          This is a sample event. Saving it makes it yours, so it will not be removed with the other samples.
        </p>
      )}
      <EventForm event={event} defaultLocation="" />
    </>
  );
}

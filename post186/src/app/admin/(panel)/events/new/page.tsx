import type { Metadata } from "next";
import { EventForm } from "@/components/admin/forms";
import { AdminTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { readSettings } from "@/lib/repo";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Add an Event" };

export default async function NewEvent() {
  await requireAdmin();
  const settings = await readSettings();
  return (
    <>
      <AdminTitle title="Add an Event" back={{ href: "/admin/events", label: "All events" }} />
      <EventForm defaultLocation={`${settings.hall.name}, ${settings.street}, ${settings.city}`} />
    </>
  );
}

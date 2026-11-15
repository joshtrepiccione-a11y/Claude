import type { Metadata } from "next";
import { BookingForm } from "@/components/admin/forms";
import { AdminTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { readSettings } from "@/lib/repo";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Add a Booking" };

export default async function NewBooking() {
  await requireAdmin();
  const settings = await readSettings();
  return (
    <>
      <AdminTitle
        title="Add a Booking"
        intro="For rentals arranged by phone or in person. The date will show as taken on the public calendar."
        back={{ href: "/admin/bookings", label: "All bookings" }}
      />
      <BookingForm hall={settings.hall} />
    </>
  );
}

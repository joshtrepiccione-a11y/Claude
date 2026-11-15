import type { Metadata } from "next";
import Link from "next/link";
import { AdminTitle, Empty, Flash, StatusBadge } from "@/components/admin/ui";
import { Plus } from "@/components/icons";
import { requireAdmin } from "@/lib/auth";
import { formatDateMedium, formatTimeRange, todayInPostTz, WEEKDAY_SHORT, weekdayOf } from "@/lib/dates";
import { countBookings, listBookings } from "@/lib/repo";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/types";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Hall Bookings" };

const TABS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "pending", label: "Waiting for review" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

export default async function BookingsAdmin({ searchParams }: PageProps<"/admin/bookings">) {
  await requireAdmin();
  const { saved, status: rawStatus } = await searchParams;
  const requested = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const counts = await countBookings();
  const status: BookingStatus | "all" =
    requested === "all"
      ? "all"
      : BOOKING_STATUSES.includes(requested as BookingStatus)
        ? (requested as BookingStatus)
        : counts.pending > 0
          ? "pending"
          : "approved";

  const today = todayInPostTz();
  let bookings = await listBookings(status === "all" ? undefined : status);
  // Approved: soonest first, with past bookings at the end.
  if (status === "approved") {
    bookings = [
      ...bookings.filter((b) => b.eventDate >= today),
      ...bookings.filter((b) => b.eventDate < today).reverse(),
    ];
  }

  return (
    <>
      <AdminTitle
        title="Hall Bookings"
        intro="Requests from the website arrive as “Waiting for review”. Approving one marks that date as booked on the public calendar."
      >
        <Link href="/admin/bookings/blocked" className="btn btn-quiet">
          Blocked Dates
        </Link>
        <Link href="/admin/bookings/new" className="btn btn-red">
          <Plus size={18} /> Add a Booking
        </Link>
      </AdminTitle>
      <Flash saved={saved} />

      <nav aria-label="Filter bookings" className="mb-5">
        <ul className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = tab.value === status;
            const count = tab.value === "all" ? null : counts[tab.value];
            return (
              <li key={tab.value}>
                <Link
                  href={`/admin/bookings?status=${tab.value}`}
                  aria-current={active ? "page" : undefined}
                  className={`btn btn-sm ${active ? "btn-navy" : "btn-quiet"}`}
                >
                  {tab.label}
                  {count !== null && <span className="font-sans text-[0.8125rem] font-bold">({count})</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {bookings.length ? (
        <div className="card scroll-x">
          <table className="table table-stack">
            <caption className="sr-only">Hall bookings</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Renter</th>
                <th scope="col">Event</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className={booking.eventDate < today ? "opacity-70" : ""}>
                  <td className="whitespace-nowrap">
                    <Link href={`/admin/bookings/${booking.id}`} className="font-bold text-azure hover:underline">
                      {WEEKDAY_SHORT[weekdayOf(booking.eventDate)]}, {formatDateMedium(booking.eventDate)}
                    </Link>
                    <span className="block text-[0.9375rem]">
                      {formatTimeRange(booking.startTime, booking.endTime)}
                    </span>
                    <span className="block font-mono text-[0.8125rem]">{booking.reference}</span>
                  </td>
                  <td>
                    <span className="font-semibold text-ink">{booking.contactName}</span>
                    {booking.organization && <span className="block text-[0.9375rem]">{booking.organization}</span>}
                    <span className="block text-[0.9375rem]">{booking.contactPhone}</span>
                  </td>
                  <td>
                    {booking.eventType}
                    <span className="block text-[0.9375rem]">{booking.guestCount} guests</span>
                  </td>
                  <td>
                    <StatusBadge status={booking.status} />
                    <span className="mt-1 flex flex-wrap gap-1">
                      {booking.status === "approved" && (
                        <span className={`badge ${booking.depositPaid ? "badge-ok" : "badge-warn"}`}>
                          {booking.depositPaid ? "Deposit received" : "No deposit yet"}
                        </span>
                      )}
                      {booking.isDemo && <span className="badge badge-solid">Sample</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Nothing here.</Empty>
      )}
    </>
  );
}

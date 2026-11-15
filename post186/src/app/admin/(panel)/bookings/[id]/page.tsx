import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { BookingForm } from "@/components/admin/forms";
import { AdminTitle, Flash, Panel, StatusBadge } from "@/components/admin/ui";
import { Alert, Mail, Phone } from "@/components/icons";
import { decideBooking, deleteBooking } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { formatDateLong, formatTimeRange, formatTimestamp } from "@/lib/dates";
import { emailConfigured } from "@/lib/email";
import { liveDayStatus } from "@/lib/hall";
import { getBooking, listBookingsFrom, readSettings } from "@/lib/repo";
import { telHref } from "@/lib/settings";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Booking" };

export default async function BookingDetail({ params, searchParams }: PageProps<"/admin/bookings/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { saved, conflict } = await searchParams;
  const booking = /^\d+$/.test(id) ? await getBooking(Number(id)) : null;
  if (!booking) notFound();

  const [settings, sameDay, dayStatus] = await Promise.all([
    readSettings(),
    listBookingsFrom(booking.eventDate),
    liveDayStatus(booking.eventDate),
  ]);
  const others = sameDay.filter(
    (b) => b.eventDate === booking.eventDate && b.id !== booking.id && (b.status === "approved" || b.status === "pending"),
  );
  const canEmail = emailConfigured() && Boolean(booking.contactEmail);
  const hasConflict = Boolean(conflict);

  const facts: [string, string][] = [
    ["Date", formatDateLong(booking.eventDate)],
    ["Time", formatTimeRange(booking.startTime, booking.endTime)],
    ["Event", booking.eventType],
    ["Guests", String(booking.guestCount)],
    ["Legion Family member", booking.isMember ? "Yes" : "No"],
    ["Kitchen", booking.kitchen ? "Requested" : "Not requested"],
    ["Alcohol", booking.alcohol ? "Will be served" : "No"],
    ["Received", `${formatTimestamp(booking.createdAt)} (${booking.source === "web" ? "website" : "entered by an officer"})`],
  ];

  return (
    <>
      <AdminTitle
        title={`Booking ${booking.reference}`}
        back={{ href: "/admin/bookings", label: "All bookings" }}
      >
        <StatusBadge status={booking.status} />
        {booking.isDemo && <span className="badge badge-solid">Sample</span>}
      </AdminTitle>
      <Flash saved={saved} />

      {hasConflict && (
        <div role="alert" className="mb-6 rounded-md border-l-4 border-flag bg-bad-soft px-4 py-4">
          <p className="flex items-start gap-2 font-bold text-flag-dark">
            <Alert size={22} className="mt-0.5 flex-none" />
            This overlaps another approved booking on the same day, so it was not approved.
          </p>
          <p className="mt-2">
            Change the time below, or approve it anyway if the two events really can share the day.
          </p>
          <form action={decideBooking} className="mt-3">
            <input type="hidden" name="id" value={booking.id} />
            <input type="hidden" name="status" value="approved" />
            <input type="hidden" name="allowConflict" value="on" />
            {canEmail && <input type="hidden" name="notify" value="on" />}
            <button type="submit" className="btn btn-danger btn-sm">
              Approve Anyway
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Panel title="Request">
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm font-semibold uppercase tracking-wide">{label}</dt>
                  <dd className="font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {booking.notes && (
              <div className="mt-4 rounded-md bg-cloud p-4">
                <p className="text-sm font-semibold uppercase tracking-wide">Renter&apos;s notes</p>
                <p className="mt-1 whitespace-pre-line text-ink">{booking.notes}</p>
              </div>
            )}
            {booking.status === "declined" && booking.declineReason && (
              <p className="mt-4">
                <strong className="text-ink">Reason given:</strong> {booking.declineReason}
              </p>
            )}
          </Panel>

          {(others.length > 0 || dayStatus === "post" || dayStatus === "closed") && (
            <Panel title="Also on this date" className="border-l-4 border-l-warn">
              <ul className="space-y-2">
                {dayStatus === "closed" && <li>This date is on the blocked-dates list.</li>}
                {dayStatus === "post" && <li>A post event is using the hall on this date.</li>}
                {others.map((other) => (
                  <li key={other.id} className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/bookings/${other.id}`} className="link">
                      {other.reference}
                    </Link>
                    {other.contactName}, {formatTimeRange(other.startTime, other.endTime)}
                    <StatusBadge status={other.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <details className="card" open={hasConflict}>
            <summary className="caps cursor-pointer px-5 py-4 text-xl text-navy sm:px-6">
              Edit details and officer notes
            </summary>
            <div className="border-t border-line p-5 sm:p-6">
              <BookingForm booking={booking} hall={settings.hall} />
            </div>
          </details>
        </div>

        <div className="space-y-6">
          <Panel title="Decision">
            {booking.status === "pending" && (
              <div className="space-y-5">
                <form action={decideBooking} className="space-y-3">
                  <input type="hidden" name="id" value={booking.id} />
                  <input type="hidden" name="status" value="approved" />
                  {canEmail && (
                    <label className="flex items-start gap-3">
                      <input type="checkbox" name="notify" defaultChecked className="check" />
                      <span className="font-semibold text-ink">Email the renter that it is approved</span>
                    </label>
                  )}
                  <button type="submit" className="btn btn-red w-full">
                    Approve Booking
                  </button>
                </form>
                <form action={decideBooking} className="space-y-3 border-t border-line pt-5">
                  <input type="hidden" name="id" value={booking.id} />
                  <input type="hidden" name="status" value="declined" />
                  <label className="block">
                    <span className="label">Reason (optional)</span>
                    <textarea name="declineReason" rows={3} maxLength={1000} className="input" />
                    <span className="hint">Shared with the renter, so keep it friendly.</span>
                  </label>
                  {canEmail && (
                    <label className="flex items-start gap-3">
                      <input type="checkbox" name="notify" defaultChecked className="check" />
                      <span className="font-semibold text-ink">Email the renter</span>
                    </label>
                  )}
                  <button type="submit" className="btn btn-quiet w-full">
                    Decline Request
                  </button>
                </form>
              </div>
            )}

            {booking.status === "approved" && (
              <div className="space-y-3">
                <p>
                  This date shows as <strong>booked</strong> on the public calendar.
                  {booking.decidedAt ? ` Approved ${formatTimestamp(booking.decidedAt)}.` : ""}
                </p>
                <form action={decideBooking}>
                  <input type="hidden" name="id" value={booking.id} />
                  <input type="hidden" name="status" value="cancelled" />
                  <ConfirmButton message="Cancel this booking? The date will open up again." className="btn btn-danger w-full">
                    Cancel Booking
                  </ConfirmButton>
                </form>
              </div>
            )}

            {(booking.status === "declined" || booking.status === "cancelled") && (
              <form action={decideBooking} className="space-y-3">
                <p>This request is closed. You can reopen it if plans change.</p>
                <input type="hidden" name="id" value={booking.id} />
                <input type="hidden" name="status" value="pending" />
                <button type="submit" className="btn btn-quiet w-full">
                  Move Back to Waiting
                </button>
              </form>
            )}

            {!emailConfigured() && (
              <p className="mt-4 rounded-md bg-warn-soft px-3 py-2 text-[0.9375rem] text-ink">
                Email is not set up, so please call or email the renter yourself.
              </p>
            )}
          </Panel>

          <Panel title="Renter">
            <p className="font-bold text-ink">{booking.contactName}</p>
            {booking.organization && <p>{booking.organization}</p>}
            <ul className="mt-3 space-y-2">
              {booking.contactPhone && (
                <li>
                  <a href={telHref(booking.contactPhone)} className="inline-flex min-h-11 items-center gap-2 font-semibold text-azure hover:underline">
                    <Phone size={17} /> {booking.contactPhone}
                  </a>
                </li>
              )}
              {booking.contactEmail && (
                <li>
                  <a
                    href={`mailto:${booking.contactEmail}?subject=${encodeURIComponent(`Your hall request ${booking.reference}`)}`}
                    className="inline-flex min-h-11 items-center gap-2 break-all font-semibold text-azure hover:underline"
                  >
                    <Mail size={17} className="flex-none" /> {booking.contactEmail}
                  </a>
                </li>
              )}
            </ul>
          </Panel>

          <Panel title="Post records">
            <dl className="space-y-2">
              <div>
                <dt className="inline font-semibold text-ink">Price quoted: </dt>
                <dd className="inline">{booking.quotedAmount || "not set"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-ink">Deposit: </dt>
                <dd className="inline">{booking.depositPaid ? "received" : "not received"}</dd>
              </div>
            </dl>
            {booking.adminNotes && <p className="mt-3 whitespace-pre-line">{booking.adminNotes}</p>}
          </Panel>

          <form action={deleteBooking}>
            <input type="hidden" name="id" value={booking.id} />
            <ConfirmButton message="Delete this booking permanently? This cannot be undone.">
              Delete Booking
            </ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}

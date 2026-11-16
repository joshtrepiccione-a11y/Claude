import type { Metadata } from "next";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { Form, FormAlert, SubmitButton, TextField } from "@/components/forms/Form";
import { AdminTitle, Empty, Flash, Panel } from "@/components/admin/ui";
import { addBlockedDate, removeBlockedDate } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { formatDateLong, todayInPostTz } from "@/lib/dates";
import { listBlockedDates } from "@/lib/repo";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Blocked Dates" };

export default async function BlockedDates({ searchParams }: PageProps<"/admin/bookings/blocked">) {
  await requireAdmin();
  const { saved } = await searchParams;
  const today = todayInPostTz();
  const blocked = await listBlockedDates(today);

  return (
    <>
      <AdminTitle
        title="Blocked Dates"
        intro="Days when the hall cannot be rented: holidays, repairs, or dates the post is keeping for itself. Post events marked “uses the hall” are blocked automatically, so you do not need to add them here."
        back={{ href: "/admin/bookings", label: "All bookings" }}
      />
      <Flash saved={saved} />

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Panel title="Block a date">
          <Form action={addBlockedDate} className="space-y-4">
            <FormAlert />
            <TextField name="date" label="Date" type="date" required min={today} />
            <TextField name="reason" label="Reason" maxLength={120} hint="Only officers see this." />
            <SubmitButton className="btn btn-red" pendingLabel="Saving…">
              Block Date
            </SubmitButton>
          </Form>
        </Panel>

        <Panel title="Upcoming blocked dates">
          {blocked.length ? (
            <ul className="divide-y divide-line-soft">
              {blocked.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-bold text-ink">{formatDateLong(entry.date)}</p>
                    {entry.reason && <p className="text-[0.9375rem]">{entry.reason}</p>}
                  </div>
                  <form action={removeBlockedDate}>
                    <input type="hidden" name="id" value={entry.id} />
                    <ConfirmButton message={`Open ${formatDateLong(entry.date)} for rentals again?`}>
                      Unblock
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No dates are blocked.</Empty>
          )}
        </Panel>
      </div>
    </>
  );
}

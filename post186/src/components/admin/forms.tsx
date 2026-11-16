import Link from "next/link";
import {
  CheckboxField,
  Form,
  FormAlert,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/forms/Form";
import { saveBooking, saveEvent, saveOfficer } from "@/lib/actions/admin";
import { formatTime, minutesOf } from "@/lib/dates";
import type { SiteSettings } from "@/lib/settings";
import {
  BOOKING_EVENT_TYPES,
  EVENT_CATEGORIES,
  OFFICER_GROUPS,
  type Booking,
  type EventRecord,
  type Officer,
} from "@/lib/types";
import { FieldGroup } from "./ui";

const REPEAT_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Every week, same weekday" },
  { value: "biweekly", label: "Every other week, same weekday" },
  { value: "monthly_nth", label: "Every month, same week and weekday (for example the 2nd Tuesday)" },
  { value: "monthly_last", label: "Every month, on the last such weekday (for example the last Sunday)" },
  { value: "yearly", label: "Every year, same date" },
];

function FormFooter({ cancelHref, label }: { cancelHref: string; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SubmitButton className="btn btn-red btn-lg" pendingLabel="Saving…">
        {label}
      </SubmitButton>
      <Link href={cancelHref} className="btn btn-quiet btn-lg">
        Cancel
      </Link>
    </div>
  );
}

// ───────────────────────── Event ─────────────────────────

export function EventForm({ event, defaultLocation }: { event?: EventRecord; defaultLocation: string }) {
  return (
    <Form action={saveEvent} className="space-y-6">
      <FormAlert />
      {event && <input type="hidden" name="id" value={event.id} />}

      <FieldGroup title="What">
        <TextField name="title" label="Event name" required defaultValue={event?.title} maxLength={120} />
        <SelectField
          name="category"
          label="Type of event"
          required
          defaultValue={event?.category ?? "community"}
          options={EVENT_CATEGORIES}
        />
        <TextField
          name="summary"
          label="One-line summary"
          defaultValue={event?.summary}
          maxLength={200}
          hint="Shown in event lists. One short sentence."
        />
        <TextAreaField
          name="description"
          label="Full details"
          rows={7}
          defaultValue={event?.description}
          maxLength={6000}
          hint="Leave a blank line between paragraphs. Start lines with “- ” to make a list. Web and email addresses become links."
        />
      </FieldGroup>

      <FieldGroup title="When and where">
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField name="startDate" label="Date" type="date" required defaultValue={event?.startDate} />
          <TextField name="startTime" label="Start time" type="time" defaultValue={event?.startTime ?? ""} />
          <TextField name="endTime" label="End time" type="time" defaultValue={event?.endTime ?? ""} />
        </div>
        <CheckboxField
          name="allDay"
          label="All day (no start or end time)"
          defaultChecked={event ? event.startTime === null : false}
        />
        <TextField
          name="location"
          label="Location"
          defaultValue={event ? event.location : defaultLocation}
          maxLength={160}
        />
      </FieldGroup>

      <FieldGroup
        title="Repeating"
        intro="For regular meetings and standing events, set it up once and it appears on the calendar automatically."
      >
        <SelectField
          name="recurrence"
          label="How often"
          required
          defaultValue={event?.recurrence ?? "none"}
          options={REPEAT_OPTIONS}
          hint="The pattern is taken from the date above."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="repeatUntil"
            label="Stop repeating after"
            type="date"
            defaultValue={event?.repeatUntil ?? ""}
            hint="Leave blank to repeat with no end date."
          />
          <TextField
            name="skipDates"
            label="Skip these dates"
            defaultValue={event?.skipDates.join(", ")}
            placeholder="2026-12-25, 2027-07-04"
            hint="For a meeting that falls on a holiday. Year-month-day, separated by commas."
          />
        </div>
      </FieldGroup>

      <FieldGroup title="Options">
        <SelectField
          name="audience"
          label="Who can attend"
          required
          defaultValue={event?.audience ?? "public"}
          options={[
            { value: "public", label: "Open to the public" },
            { value: "members", label: "Members only" },
          ]}
        />
        <CheckboxField
          name="usesHall"
          label="This event uses the hall"
          hint="Marks the hall as unavailable for rentals on these dates."
          defaultChecked={event?.usesHall ?? false}
        />
        <CheckboxField
          name="published"
          label="Show on the website"
          hint="Untick to keep it as a draft that only officers can see."
          defaultChecked={event?.published ?? true}
        />
        <CheckboxField
          name="cancelled"
          label="Mark as cancelled"
          hint="Keeps the event on the calendar with a clear “Cancelled” notice, so people who planned to come see it."
          defaultChecked={event?.cancelled ?? false}
        />
        <input type="hidden" name="featured" value="" />
      </FieldGroup>

      <FormFooter cancelHref="/admin/events" label={event ? "Save Changes" : "Add Event"} />
    </Form>
  );
}

// ───────────────────────── Officer ─────────────────────────

export function OfficerForm({ officer }: { officer?: Officer }) {
  return (
    <Form action={saveOfficer} className="space-y-6">
      <FormAlert />
      {officer && <input type="hidden" name="id" value={officer.id} />}

      <FieldGroup title="Who">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="name" label="Name" required defaultValue={officer?.name} maxLength={100} />
          <TextField
            name="title"
            label="Office or title"
            required
            defaultValue={officer?.title}
            maxLength={100}
            placeholder="Commander"
          />
        </div>
        <SelectField
          name="group"
          label="Listed under"
          required
          defaultValue={officer?.group ?? "officer"}
          options={OFFICER_GROUPS}
        />
        <TextAreaField
          name="bio"
          label="Short note"
          rows={3}
          defaultValue={officer?.bio}
          maxLength={1200}
          hint="Optional. For example branch of service, or what to contact this officer about."
        />
        <TextField
          name="photoUrl"
          label="Photo"
          defaultValue={officer?.photoUrl}
          placeholder="/photos/officers/commander.jpg"
          hint="Optional. See “Photos” in the README. Without a photo the officer's initials are shown."
        />
      </FieldGroup>

      <FieldGroup
        title="Contact details"
        intro="Phone numbers and email addresses stay private unless you tick “show on the website”. Visitors can still write to an officer through the contact form without ever seeing the address."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <TextField
              name="email"
              label="Email"
              type="email"
              defaultValue={officer?.email}
              hint="Website messages for this officer are forwarded here."
            />
            <CheckboxField name="showEmail" label="Show this email on the website" defaultChecked={officer?.showEmail ?? false} />
          </div>
          <div className="space-y-3">
            <TextField name="phone" label="Phone" type="tel" defaultValue={officer?.phone} />
            <CheckboxField name="showPhone" label="Show this phone number on the website" defaultChecked={officer?.showPhone ?? false} />
          </div>
        </div>
        <CheckboxField
          name="acceptsMessages"
          label="Visitors can send this officer a message"
          hint="Adds a “Send a message” button to their listing."
          defaultChecked={officer?.acceptsMessages ?? true}
        />
      </FieldGroup>

      <FormFooter cancelHref="/admin/officers" label={officer ? "Save Changes" : "Add Officer"} />
    </Form>
  );
}

// ───────────────────────── Booking ─────────────────────────

function timeChoices(hall: SiteSettings["hall"], current?: string) {
  const options: { value: string; label: string }[] = [];
  // Officers may book outside public rental hours, so offer the whole day.
  const from = Math.min(minutesOf(hall.openTime), 6 * 60);
  for (let m = from; m <= 24 * 60 - 30; m += 30) {
    const value = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    options.push({ value, label: formatTime(value) });
  }
  if (current && !options.some((o) => o.value === current)) {
    options.push({ value: current, label: formatTime(current) });
    options.sort((a, b) => a.value.localeCompare(b.value));
  }
  return options;
}

export function BookingForm({ booking, hall }: { booking?: Booking; hall: SiteSettings["hall"] }) {
  return (
    <Form action={saveBooking} className="space-y-6">
      <FormAlert />
      {booking && <input type="hidden" name="id" value={booking.id} />}

      <FieldGroup title="Event">
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField name="eventDate" label="Date" type="date" required defaultValue={booking?.eventDate} />
          <SelectField
            name="startTime"
            label="Start time"
            required
            placeholder="Choose…"
            defaultValue={booking?.startTime}
            options={timeChoices(hall, booking?.startTime)}
          />
          <SelectField
            name="endTime"
            label="End time"
            required
            placeholder="Choose…"
            defaultValue={booking?.endTime}
            options={timeChoices(hall, booking?.endTime)}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="eventType"
            label="Type of event"
            required
            placeholder="Choose…"
            defaultValue={booking?.eventType}
            options={BOOKING_EVENT_TYPES.map((type) => ({ value: type, label: type }))}
          />
          <TextField
            name="guestCount"
            label="Number of guests"
            type="number"
            inputMode="numeric"
            required
            min={1}
            defaultValue={booking?.guestCount}
          />
        </div>
        {!booking && (
          <>
            <SelectField
              name="status"
              label="Save as"
              required
              defaultValue="approved"
              options={[
                { value: "approved", label: "Approved — the date shows as booked" },
                { value: "pending", label: "Waiting for review — a tentative hold" },
              ]}
            />
            <CheckboxField
              name="allowConflict"
              label="Save anyway if it overlaps another approved booking"
              hint="Only tick this for two events that can share the day."
            />
          </>
        )}
      </FieldGroup>

      <FieldGroup title="Renter">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="contactName" label="Name" required defaultValue={booking?.contactName} />
          <TextField name="organization" label="Organization" defaultValue={booking?.organization} />
          <TextField name="contactPhone" label="Phone" type="tel" defaultValue={booking?.contactPhone} />
          <TextField name="contactEmail" label="Email" type="email" defaultValue={booking?.contactEmail} />
        </div>
        <CheckboxField name="isMember" label="Legion Family member" defaultChecked={booking?.isMember ?? false} />
        <CheckboxField name="kitchen" label="Kitchen requested" defaultChecked={booking?.kitchen ?? false} />
        <CheckboxField name="alcohol" label="Alcohol will be served" defaultChecked={booking?.alcohol ?? false} />
        <TextAreaField name="notes" label="Renter's notes" rows={3} defaultValue={booking?.notes} maxLength={2000} />
      </FieldGroup>

      <FieldGroup title="Post records" intro="Only officers can see this section.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="quotedAmount"
            label="Price quoted"
            defaultValue={booking?.quotedAmount}
            placeholder="$400"
            maxLength={60}
            hint="Included in the approval email if filled in."
          />
          <div className="sm:pt-8">
            <CheckboxField name="depositPaid" label="Deposit received" defaultChecked={booking?.depositPaid ?? false} />
          </div>
        </div>
        <TextAreaField
          name="adminNotes"
          label="Officer notes"
          rows={3}
          defaultValue={booking?.adminNotes}
          maxLength={4000}
          hint="Agreement signed, key pickup, set-up needs…"
        />
      </FieldGroup>

      <FormFooter
        cancelHref={booking ? `/admin/bookings/${booking.id}` : "/admin/bookings"}
        label={booking ? "Save Changes" : "Add Booking"}
      />
    </Form>
  );
}

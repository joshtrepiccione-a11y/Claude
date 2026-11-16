import type { Metadata } from "next";
import {
  CheckboxField,
  Form,
  FormAlert,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/forms/Form";
import { AdminTitle, FieldGroup, Flash } from "@/components/admin/ui";
import { saveSettings } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import { readSettings } from "@/lib/repo";
import { formatRates } from "@/lib/settings";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsAdmin({ searchParams }: PageProps<"/admin/settings">) {
  await requireAdmin();
  const { saved } = await searchParams;
  const s = await readSettings();
  const { hall } = s;

  return (
    <>
      <AdminTitle
        title="Settings"
        intro="The post's details as they appear across the website. Saving updates every page at once."
      />
      <Flash saved={saved} />

      <Form action={saveSettings} className="space-y-6">
        <FormAlert />

        <FieldGroup title="Post details">
          <div className="grid gap-5 sm:grid-cols-[1fr_1fr_8rem]">
            <TextField name="orgName" label="Organization" required defaultValue={s.orgName} />
            <TextField name="postName" label="Post name" required defaultValue={s.postName} />
            <TextField name="postNumber" label="Post number" required defaultValue={s.postNumber} />
          </div>
          <TextField name="street" label="Street address" required defaultValue={s.street} autoComplete="off" />
          <div className="grid gap-5 sm:grid-cols-[1fr_6rem_1fr_8rem]">
            <TextField name="city" label="City" required defaultValue={s.city} />
            <TextField name="state" label="State" required defaultValue={s.state} maxLength={2} />
            <TextField name="stateName" label="State name" required defaultValue={s.stateName} />
            <TextField name="zip" label="ZIP" required defaultValue={s.zip} />
          </div>
          <TextField name="mailingAddress" label="Mailing address" defaultValue={s.mailingAddress} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="phone" label="Post phone" type="tel" defaultValue={s.phone} />
            <TextField
              name="email"
              label="Public email address"
              type="email"
              defaultValue={s.email}
              hint="Shown on the website. Leave blank to offer only the contact form."
            />
          </div>
          <TextField name="facebookUrl" label="Facebook page" type="url" defaultValue={s.facebookUrl} />
          <TextField
            name="meetingSchedule"
            label="Meeting schedule"
            defaultValue={s.meetingSchedule}
            maxLength={300}
            hint="One sentence, for example “Members meet on the second Tuesday of each month at 7:00 PM.”"
          />
          <TextField
            name="hours"
            label="Hours"
            defaultValue={s.hours}
            maxLength={300}
            hint="Optional. For example when the canteen or office is open."
          />
        </FieldGroup>

        <FieldGroup
          title="Notifications"
          intro={
            emailConfigured()
              ? "Email sending is set up."
              : "Email sending is not set up yet (see the README). Until it is, new requests and messages appear only here in the admin area."
          }
        >
          <TextField
            name="notifyEmail"
            label="Send hall requests and website messages to"
            type="email"
            defaultValue={s.notifyEmail}
            hint="Usually the Adjutant or whoever manages the hall. Never shown on the website."
          />
        </FieldGroup>

        <FieldGroup
          title="Announcement banner"
          intro="A short notice across the top of every page: a weather cancellation, a fundraiser, a change of meeting night."
        >
          <CheckboxField name="announcementEnabled" label="Show the banner" defaultChecked={s.announcement.enabled} />
          <TextField name="announcementText" label="Announcement" defaultValue={s.announcement.text} maxLength={200} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="announcementLinkLabel"
              label="Link text"
              defaultValue={s.announcement.linkLabel}
              maxLength={40}
              placeholder="Details"
            />
            <TextField
              name="announcementLinkUrl"
              label="Link address"
              defaultValue={s.announcement.linkUrl}
              placeholder="/events"
              hint="A page on this site (like /events) or a full https:// address."
            />
          </div>
        </FieldGroup>

        <FieldGroup title="Hall rental">
          <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
            <TextField name="hallName" label="Name of the hall" required defaultValue={hall.name} />
            <TextField
              name="hallCapacity"
              label="Capacity"
              type="number"
              inputMode="numeric"
              required
              min={1}
              defaultValue={hall.capacity}
            />
          </div>
          <TextAreaField
            name="hallIntro"
            label="Introduction"
            rows={3}
            defaultValue={hall.intro}
            maxLength={800}
            hint="Shown at the top of the Hall Rental page and on the home page."
          />
          <TextAreaField
            name="hallAmenities"
            label="What the hall offers"
            rows={6}
            defaultValue={hall.amenities.join("\n")}
            hint="One item per line."
          />
          <TextAreaField
            name="hallRates"
            label="Rates"
            rows={5}
            defaultValue={formatRates(hall.rates)}
            placeholder={"Hall rental, up to 5 hours | $400 | Tables and chairs included\nSecurity deposit | $100 | Refunded after the event"}
            hint="One rate per line, written as: Name | Price | Note. Leave empty to show “contact us for a quote”."
          />
          <TextField
            name="hallRatesNote"
            label="Note under the rates"
            defaultValue={hall.ratesNote}
            maxLength={400}
            hint="Optional. For example a member discount."
          />
          <TextAreaField
            name="hallPolicies"
            label="Rental policies"
            rows={7}
            defaultValue={hall.policies.join("\n")}
            hint="One policy per line."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="hallOpenTime"
              label="Earliest start time"
              type="time"
              required
              defaultValue={hall.openTime}
            />
            <TextField
              name="hallCloseTime"
              label="Latest end time"
              type="time"
              required
              defaultValue={hall.closeTime}
            />
            <TextField
              name="hallMinNoticeDays"
              label="Days of notice needed"
              type="number"
              inputMode="numeric"
              required
              min={0}
              max={365}
              defaultValue={hall.minNoticeDays}
              hint="Online requests must be at least this many days ahead."
            />
            <TextField
              name="hallMaxAdvanceMonths"
              label="Months ahead people can request"
              type="number"
              inputMode="numeric"
              required
              min={1}
              max={36}
              defaultValue={hall.maxAdvanceMonths}
            />
          </div>
          <TextField
            name="hallResponseTime"
            label="How quickly you reply"
            defaultValue={hall.responseTime}
            maxLength={200}
            hint="Shown to renters after they send a request."
          />
        </FieldGroup>

        <SubmitButton className="btn btn-red btn-lg" pendingLabel="Saving…">
          Save Settings
        </SubmitButton>
      </Form>
    </>
  );
}

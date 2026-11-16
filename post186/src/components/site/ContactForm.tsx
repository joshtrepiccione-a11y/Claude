"use client";

import { useSearchParams } from "next/navigation";
import { Check } from "@/components/icons";
import {
  Form,
  FormAlert,
  Honeypot,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/forms/Form";
import { sendContactMessage } from "@/lib/actions/public";
import { CONTACT_TOPICS } from "@/lib/validation";

type Recipient = { id: number; label: string };

export function ContactFormView({ recipients, to }: { recipients: Recipient[]; to: string }) {
  const preselected = recipients.some((r) => String(r.id) === to) ? to : "";
  return (
    <Form
      action={sendContactMessage}
      className="space-y-5"
      success={() => (
        <div role="status" className="rounded-lg border-2 border-ok bg-ok-soft p-6 sm:p-8">
          <p className="flex items-center gap-2 font-bold text-ok">
            <Check size={24} /> Message sent
          </p>
          <h3 className="mt-3 text-2xl">Thank you for reaching out.</h3>
          <p className="mt-2">
            Your message is on its way to the post. Our officers are volunteers, so please allow a few days for a
            reply. If your matter is urgent, call the post.
          </p>
        </div>
      )}
    >
      <FormAlert />
      <Honeypot />

      {/* Changing the key resets the selection when arriving from an officer's "Send a message" link. */}
      <SelectField
        key={preselected}
        name="officerId"
        label="Send to"
        plain
        defaultValue={preselected}
        options={[{ value: "", label: "Post 186 — general inbox" }, ...recipients.map((r) => ({ value: String(r.id), label: r.label }))]}
      />
      <SelectField
        name="topic"
        label="Topic"
        required
        placeholder="Choose a topic…"
        options={CONTACT_TOPICS.map((topic) => ({ value: topic, label: topic }))}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Your name" required autoComplete="name" />
        <TextField name="email" label="Email" type="email" required autoComplete="email" inputMode="email" />
      </div>
      <TextField
        name="phone"
        label="Phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        hint="If you would like a call back."
      />
      <TextAreaField name="body" label="Message" required rows={6} maxLength={4000} />
      <SubmitButton className="btn btn-red btn-lg" pendingLabel="Sending…">
        Send Message
      </SubmitButton>
      <p className="text-[0.9375rem]">
        Please do not include Social Security numbers, medical details or other sensitive information.
      </p>
    </Form>
  );
}

/** Reads ?to=<officer id> so "Send a message" links can pre-select the recipient. */
export function ContactForm({ recipients }: { recipients: Recipient[] }) {
  const to = useSearchParams().get("to") ?? "";
  return <ContactFormView recipients={recipients} to={to} />;
}

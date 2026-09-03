"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitMembershipInquiry } from "@/app/actions/inquiries";
import {
  CONTACT_METHODS,
  CONTACT_METHOD_LABELS,
  MEMBERSHIP_INTERESTS,
  MEMBERSHIP_INTEREST_LABELS,
  SERVICE_CONNECTIONS,
  SERVICE_CONNECTION_LABELS,
} from "@/lib/validation";
import { ConsentBox, ErrorSummary, Honeypot, RadioGroup, SelectField, TextArea, TextField, initialFormState } from "./fields";

export function MembershipForm({ responseTime }: { responseTime: string }) {
  const [state, action, pending] = useActionState(submitMembershipInquiry, initialFormState);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.ok || Object.keys(state.errors).length) topRef.current?.focus();
  }, [state]);

  if (state.ok) {
    return (
      <div className="notice notice-success" ref={topRef} tabIndex={-1} role="status">
        <h2 style={{ fontSize: "1.25rem" }}>Thank you. Your inquiry has been received.</h2>
        <p>
          A member of Post 186 will reach out {responseTime ? responseTime : "as soon as they can"} using the contact method you chose. This was an inquiry, not an application, so there is nothing else you need to do right now.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="form" aria-describedby="membership-form-note">
      <div ref={topRef} tabIndex={-1}>
        <ErrorSummary state={state} />
      </div>
      <p id="membership-form-note" className="meta">
        Fields marked * are required. Please do not include Social Security numbers, discharge papers, VA records, medical information, or other sensitive documents. We will ask for anything we need later, in person.
      </p>
      <Honeypot />
      <TextField name="name" label="Full name" required autoComplete="name" maxLength={120} state={state} />
      <div className="field-row">
        <TextField name="email" label="Email" type="email" required autoComplete="email" maxLength={200} state={state} />
        <TextField name="phone" label="Phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={40} state={state} />
      </div>
      <RadioGroup
        name="contact_method"
        label="How should we reach you?"
        required
        state={state}
        options={CONTACT_METHODS.map((v) => ({ value: v, label: CONTACT_METHOD_LABELS[v] }))}
      />
      <SelectField
        name="service_connection"
        label="Your connection to military service"
        required
        state={state}
        options={SERVICE_CONNECTIONS.map((v) => ({ value: v, label: SERVICE_CONNECTION_LABELS[v] }))}
      />
      <TextField
        name="service_area"
        label="Branch or general area of service"
        hint="Only if you would like to share it, for example: Army, 1980s. No documents needed."
        maxLength={200}
        state={state}
      />
      <SelectField
        name="interest"
        label="What are you interested in?"
        required
        state={state}
        options={MEMBERSHIP_INTERESTS.map((v) => ({ value: v, label: MEMBERSHIP_INTEREST_LABELS[v] }))}
      />
      <TextArea name="message" label="Anything else you would like us to know?" rows={5} maxLength={3000} state={state} />
      <ConsentBox
        state={state}
        text="I understand Post 186 will use the contact details above only to respond to this inquiry, and I agree to be contacted."
      />
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Sending…" : "Send membership inquiry"}
        </button>
      </div>
    </form>
  );
}

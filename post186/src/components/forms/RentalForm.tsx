"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitRentalInquiry } from "@/app/actions/inquiries";
import { ALCOHOL_LABELS, ALCOHOL_OPTIONS, CONTACT_METHODS, CONTACT_METHOD_LABELS } from "@/lib/validation";
import { ConsentBox, ErrorSummary, Honeypot, RadioGroup, TextArea, TextField, initialFormState } from "./fields";

export function RentalForm({ responseTime }: { responseTime: string }) {
  const [state, action, pending] = useActionState(submitRentalInquiry, initialFormState);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.ok || Object.keys(state.errors).length) topRef.current?.focus();
  }, [state]);

  if (state.ok) {
    return (
      <div className="notice notice-success" ref={topRef} tabIndex={-1} role="status">
        <h2 style={{ fontSize: "1.25rem" }}>Thank you. Your rental inquiry has been received.</h2>
        <p>
          Someone from Post 186 will get back to you {responseTime ? responseTime : "as soon as they can"} to talk about availability, details, and next steps. Please remember that this inquiry does not hold a date; the hall is only reserved once a rental agreement is signed.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="form" aria-describedby="rental-form-note">
      <div ref={topRef} tabIndex={-1}>
        <ErrorSummary state={state} />
      </div>
      <p id="rental-form-note" className="meta">
        Fields marked * are required. Sending this form does not reserve the hall, confirm availability, or create a rental agreement.
      </p>
      <Honeypot />
      <TextField name="name" label="Your name" required autoComplete="name" maxLength={120} state={state} />
      <TextField name="organization" label="Organization" hint="If the event is for a business, nonprofit, or group." autoComplete="organization" maxLength={160} state={state} />
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
      <TextField name="event_type" label="Type of event" hint="For example: birthday party, baby shower, reunion, community meeting, memorial gathering." required maxLength={120} state={state} />
      <div className="field-row">
        <TextField name="preferred_date" label="First-choice date" type="date" required state={state} />
        <TextField name="start_time" label="Start time" type="time" required state={state} />
        <TextField name="end_time" label="End time" type="time" required state={state} />
      </div>
      <TextField name="alternate_date" label="Alternate date" type="date" state={state} />
      <TextField name="guest_count" label="Estimated number of guests" type="number" required inputMode="numeric" min={1} max={5000} state={state} />
      <TextArea name="accessibility_needs" label="Accessibility or setup needs" hint="Wheelchair access, seating arrangements, a stage, and so on." rows={3} maxLength={1000} state={state} />
      <RadioGroup
        name="alcohol"
        label="Will alcohol be served?"
        required
        state={state}
        options={ALCOHOL_OPTIONS.map((v) => ({ value: v, label: ALCOHOL_LABELS[v] }))}
      />
      <TextArea name="description" label="Brief description of the event" required rows={5} maxLength={3000} state={state} />
      <TextArea name="notes" label="Additional notes" rows={3} maxLength={2000} state={state} />
      <ConsentBox state={state} text="I understand this is an inquiry only, and I agree to be contacted by Post 186 about it." />
      <div className="form-actions">
        <button type="submit" className="btn btn-secondary" disabled={pending}>
          {pending ? "Sending…" : "Send rental inquiry"}
        </button>
      </div>
    </form>
  );
}

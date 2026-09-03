"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitGeneralInquiry } from "@/app/actions/inquiries";
import { CONTACT_METHODS, CONTACT_METHOD_LABELS } from "@/lib/validation";
import { ConsentBox, ErrorSummary, Honeypot, RadioGroup, TextArea, TextField, initialFormState } from "./fields";

export function ContactForm({ responseTime }: { responseTime: string }) {
  const [state, action, pending] = useActionState(submitGeneralInquiry, initialFormState);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.ok || Object.keys(state.errors).length) topRef.current?.focus();
  }, [state]);

  if (state.ok) {
    return (
      <div className="notice notice-success" ref={topRef} tabIndex={-1} role="status">
        <h2 style={{ fontSize: "1.25rem" }}>Thank you. Your message has been received.</h2>
        <p>We will reply {responseTime ? responseTime : "as soon as we can"} using the contact method you chose.</p>
      </div>
    );
  }

  return (
    <form action={action} className="form" aria-describedby="contact-form-note">
      <div ref={topRef} tabIndex={-1}>
        <ErrorSummary state={state} />
      </div>
      <p id="contact-form-note" className="meta">
        Fields marked * are required. For membership or hall rental questions, please use the forms on those pages so the right person sees your message.
      </p>
      <Honeypot />
      <TextField name="name" label="Your name" required autoComplete="name" maxLength={120} state={state} />
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
      <TextField name="subject" label="Subject" maxLength={160} state={state} />
      <TextArea name="message" label="Message" required rows={6} maxLength={3000} state={state} />
      <ConsentBox state={state} text="I agree that Post 186 may use these details to reply to my message." />
      <div className="form-actions">
        <button type="submit" className="btn btn-secondary" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}

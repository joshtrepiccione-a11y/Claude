"use client";

import { Form, FormAlert, SubmitButton, TextField, useForm } from "@/components/forms/Form";
import { checkBookingStatus } from "@/lib/actions/public";

const TONE: Record<string, string> = {
  pending: "border-warn bg-warn-soft",
  approved: "border-ok bg-ok-soft",
  declined: "border-flag bg-bad-soft",
  cancelled: "border-line bg-cloud",
};

const NEXT_STEP: Record<string, string> = {
  pending:
    "An officer has not reviewed this request yet. Your date is not reserved until the post confirms it.",
  approved:
    "Your request is approved. An officer will be in touch about the rental agreement and deposit that hold the date.",
  declined: "We were not able to host this event as requested. You are welcome to request another date.",
  cancelled: "This request was cancelled. Contact the post if you believe this is a mistake.",
};

function Result() {
  const { state } = useForm();
  if (state.status !== "success" || !state.data) return null;
  const { data } = state;
  return (
    <div role="status" className={`mt-8 rounded-lg border-2 p-6 ${TONE[data.status] ?? TONE.cancelled}`}>
      <p className="text-sm font-semibold uppercase tracking-wide">Request {data.reference}</p>
      <p className="mt-1 font-display text-2xl font-bold text-navy">{data.statusText}</p>
      <dl className="mt-3 space-y-1 text-ink">
        <div>
          <dt className="inline font-semibold">When: </dt>
          <dd className="inline">{data.when}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Event: </dt>
          <dd className="inline">{data.eventType}</dd>
        </div>
      </dl>
      <p className="mt-3">{NEXT_STEP[data.status]}</p>
      {data.note && <p className="mt-2 text-ink">Note from the post: {data.note}</p>}
    </div>
  );
}

export function StatusForm() {
  return (
    <Form action={checkBookingStatus} className="space-y-5">
      <FormAlert />
      <TextField
        name="reference"
        label="Reference"
        required
        placeholder="P186-AB12CD"
        autoComplete="off"
        hint="Shown on your confirmation screen and email."
      />
      <TextField
        name="email"
        label="Email used for the request"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
      />
      <SubmitButton className="btn btn-blue btn-lg" pendingLabel="Checking…">
        Check Status
      </SubmitButton>
      <Result />
    </Form>
  );
}

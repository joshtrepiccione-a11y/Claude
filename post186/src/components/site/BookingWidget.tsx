"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "@/components/icons";
import {
  CheckboxField,
  ControlledTextField,
  Form,
  FormAlert,
  Honeypot,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/forms/Form";
import { requestBooking } from "@/lib/actions/public";
import {
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  dayOfMonth,
  formatDateLong,
  formatMonthYear,
  formatTime,
  isYmd,
  minutesOf,
  type Ymd,
} from "@/lib/dates";
import { BOOKING_EVENT_TYPES, type DayStatus, type HallAvailability } from "@/lib/types";
import { MonthNav, monthGrid } from "./MonthCalendar";

type HallInfo = {
  capacity: number;
  openTime: string;
  closeTime: string;
  minNoticeDays: number;
  responseTime: string;
};

const STATUS_LABEL: Record<DayStatus, string> = {
  booked: "booked",
  post: "post event",
  closed: "not available",
  pending: "request pending",
};

function timeOptions(open: string, close: string): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let m = minutesOf(open); m <= minutesOf(close); m += 30) {
    const value = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    options.push({ value, label: formatTime(value) });
  }
  return options;
}

function Legend() {
  const items = [
    { className: "border-line bg-white", label: "Open" },
    { className: "border-navy bg-navy", label: "Your choice" },
    { className: "border-warn bg-warn-soft", label: "Request pending" },
    { className: "border-line bg-fog", label: "Not available", strike: true },
  ];
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem]">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden="true" className={`inline-block size-5 rounded border ${item.className}`} />
          <span className={item.strike ? "line-through decoration-body/60" : ""}>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

type WidgetProps = {
  availability: HallAvailability;
  hall: HallInfo;
  phone: string;
  phoneHref: string;
};

/** Starts fresh on each visit by link; restores the chosen date on Back (see Form). */
export function BookingWidget(props: WidgetProps) {
  const { bfcacheId } = useRouter();
  return <BookingWidgetBody key={bfcacheId} {...props} />;
}

function BookingWidgetBody({ availability, hall, phone, phoneHref }: WidgetProps) {
  const { today, firstBookable, lastBookable, days } = availability;
  const firstMonth = firstBookable.slice(0, 7);
  const lastMonth = lastBookable.slice(0, 7);
  const [month, setMonth] = useState(firstMonth);
  const [date, setDate] = useState("");

  const times = timeOptions(hall.openTime, hall.closeTime);
  const selectedStatus = isYmd(date) ? days[date] : undefined;

  const unavailable = (day: Ymd) =>
    day < firstBookable ||
    day > lastBookable ||
    days[day] === "booked" ||
    days[day] === "post" ||
    days[day] === "closed";

  const choose = (day: Ymd) => {
    setDate(day);
    setMonth(day.slice(0, 7));
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">
      {/* Step 1: calendar */}
      <section aria-labelledby="calendar-heading">
        <h3 id="calendar-heading" className="flex items-center gap-3">
          <span className="caps flex size-9 flex-none items-center justify-center rounded-full bg-navy text-lg text-white">
            1
          </span>
          Pick an open date
        </h3>
        <div className="card mt-4 p-4 sm:p-5">
          <MonthNav month={month} min={firstMonth} max={lastMonth} onChange={setMonth} label="hall availability" compact />
          <table className="mt-3 w-full table-fixed border-separate border-spacing-1">
            <caption className="sr-only">Hall availability for {formatMonthYear(month)}</caption>
            <thead>
              <tr>
                {WEEKDAY_NAMES.map((name, i) => (
                  <th key={name} scope="col" className="pb-1 text-center text-sm font-bold text-navy">
                    <span className="sr-only">{name}</span>
                    <span aria-hidden="true">{WEEKDAY_SHORT[i]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGrid(month).map((week, w) => (
                <tr key={w}>
                  {week.map((day, d) => {
                    if (!day) return <td key={d} />;
                    const status = days[day];
                    const blocked = unavailable(day);
                    const selected = day === date;
                    const reason =
                      day < firstBookable
                        ? day < today
                          ? "past"
                          : "too soon to request online"
                        : status
                          ? STATUS_LABEL[status]
                          : "open";
                    return (
                      <td key={d} className="p-0">
                        <button
                          type="button"
                          disabled={blocked}
                          aria-pressed={selected}
                          aria-label={`${formatDateLong(day)}, ${selected ? "selected" : reason}`}
                          onClick={() => choose(day)}
                          className={`flex aspect-square w-full items-center justify-center rounded border text-base font-bold transition-colors ${
                            selected
                              ? "border-navy bg-navy text-white"
                              : blocked
                                ? "cursor-not-allowed border-transparent bg-fog text-body/70 line-through"
                                : status === "pending"
                                  ? "border-warn bg-warn-soft text-ink hover:border-navy"
                                  : "border-line bg-white text-ink hover:border-navy hover:bg-cloud"
                          }`}
                        >
                          {dayOfMonth(day)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <Legend />
        </div>

        <p className="mt-4 text-[0.9375rem]">
          Online requests need at least {hall.minNoticeDays} days&apos; notice.
          {phone && (
            <>
              {" "}
              For a sooner date, call{" "}
              <a href={phoneHref} className="link whitespace-nowrap">
                {phone}
              </a>
              .
            </>
          )}
        </p>
      </section>

      {/* Step 2: request form */}
      <section aria-labelledby="request-form-heading">
        <h3 id="request-form-heading" className="flex items-center gap-3">
          <span className="caps flex size-9 flex-none items-center justify-center rounded-full bg-navy text-lg text-white">
            2
          </span>
          Tell us about your event
        </h3>

        <Form
          action={requestBooking}
          className="mt-4 space-y-5"
          success={(state) => (
            <div role="status" tabIndex={-1} className="mt-4 rounded-lg border-2 border-ok bg-ok-soft p-6 sm:p-8">
              <p className="flex items-center gap-2 font-bold text-ok">
                <Check size={24} /> Request received
              </p>
              <h4 className="mt-3 text-2xl">Thank you — we have your request.</h4>
              <dl className="mt-4 space-y-2 text-ink">
                <div>
                  <dt className="inline font-semibold">Reference: </dt>
                  <dd className="inline font-mono text-lg font-bold">{state.data?.reference}</dd>
                </div>
                {state.data?.when && (
                  <div>
                    <dt className="inline font-semibold">Requested: </dt>
                    <dd className="inline">{state.data.when}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-4">
                <strong>Your date is not reserved yet.</strong> A post officer will review your request and contact
                you to confirm availability, pricing and the rental agreement. {hall.responseTime}
              </p>
              <p className="mt-3">
                Keep your reference number. You can{" "}
                <Link href="/hall-rental/status" className="link">
                  check the status of your request
                </Link>{" "}
                at any time.
              </p>
            </div>
          )}
        >
          <FormAlert />
          <Honeypot />

          <div aria-live="polite" className="rounded-md bg-cloud px-4 py-3">
            {isYmd(date) ? (
              <p className="font-semibold text-ink">
                Selected: {formatDateLong(date)}
                {selectedStatus === "pending" && (
                  <span className="mt-1 block font-normal text-body">
                    Someone else has already asked about this date. You can still send a request and we will let you
                    know if it opens up.
                  </span>
                )}
              </p>
            ) : (
              <p>Choose a date on the calendar, or type one below.</p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <ControlledTextField
              name="eventDate"
              label="Event date"
              type="date"
              required
              value={date}
              min={firstBookable}
              max={lastBookable}
              onChange={(value) => {
                setDate(value);
                if (isYmd(value) && value >= firstBookable && value <= lastBookable) setMonth(value.slice(0, 7));
              }}
            />
            <SelectField
              name="startTime"
              label="Start time"
              required
              options={times.slice(0, -2)}
              placeholder="Choose…"
              hint="Include set-up."
            />
            <SelectField
              name="endTime"
              label="End time"
              required
              options={times.slice(2)}
              placeholder="Choose…"
              hint="Include clean-up."
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              name="eventType"
              label="Type of event"
              required
              options={BOOKING_EVENT_TYPES.map((type) => ({ value: type, label: type }))}
              placeholder="Choose…"
            />
            <TextField
              name="guestCount"
              label="Number of guests"
              type="number"
              inputMode="numeric"
              required
              min={1}
              max={hall.capacity}
              hint={`The hall holds up to ${hall.capacity}.`}
            />
          </div>

          <fieldset className="space-y-5 border-t border-line pt-5">
            <legend className="caps float-left mb-4 w-full text-lg text-navy">Your contact details</legend>
            <div className="clear-both grid gap-5 sm:grid-cols-2">
              <TextField name="contactName" label="Your name" required autoComplete="name" />
              <TextField
                name="contactPhone"
                label="Phone"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
              />
              <TextField
                name="contactEmail"
                label="Email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
              />
              <TextField name="organization" label="Organization" autoComplete="organization" />
            </div>
          </fieldset>

          <fieldset className="space-y-3 border-t border-line pt-5">
            <legend className="caps float-left mb-3 w-full text-lg text-navy">A few details</legend>
            <div className="clear-both space-y-3">
              <CheckboxField name="isMember" label="I am a member of The American Legion Family" />
              <CheckboxField name="kitchen" label="I would like to use the kitchen" />
              <CheckboxField name="alcohol" label="Alcohol will be served" />
            </div>
          </fieldset>

          <TextAreaField
            name="notes"
            label="Anything else we should know?"
            rows={4}
            maxLength={2000}
            hint="Catering, music, decorations, accessibility needs, questions about pricing…"
          />

          <CheckboxField
            name="agree"
            label="I have read the rental policies and understand my date is not reserved until the post confirms it."
            className="rounded-md bg-cloud p-4"
          />

          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton className="btn btn-red btn-lg" pendingLabel="Sending request…">
              Send Request
            </SubmitButton>
            <p className="text-[0.9375rem]">No payment is taken online.</p>
          </div>
        </Form>
      </section>
    </div>
  );
}

"use server";

import { updateTag } from "next/cache";
import { addDays, addMonths, formatDateLong, formatTime, formatTimeRange, todayInPostTz } from "../dates";
import { liveDayStatus } from "../hall";
import { notifyBookingReceived, notifyContactMessage } from "../notifications";
import { clientIp, rateLimit } from "../rate-limit";
import { createBooking, createMessage, getBookingByReference, getOfficer, readSettings } from "../repo";
import {
  bookingRequestSchema,
  contactSchema,
  fieldErrors,
  formValues,
  statusLookupSchema,
  type FormState,
} from "../validation";

const FIX_FIELDS = "Please check the highlighted fields and try again.";

/** Public form: ask to rent the hall. Creates a pending request for an officer to review. */
export async function requestBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);

  // Hidden field that people never see or fill in. Bots do; answer politely and save nothing.
  if (values.website) {
    return { status: "success", data: { reference: "P186-THANKS", when: "", email: "" } };
  }

  const ip = await clientIp();
  if (!(await rateLimit(`booking-try:${ip}`, 30, 3600))) {
    return { status: "error", message: "Too many attempts. Please wait a while or call the post.", values };
  }

  const parsed = bookingRequestSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: FIX_FIELDS, errors: fieldErrors(parsed.error), values };
  }
  const input = parsed.data;
  const settings = await readSettings();
  const { hall } = settings;
  const callUs = settings.phone ? ` Please call us at ${settings.phone}.` : " Please call the post.";

  const errors: Record<string, string> = {};
  const today = todayInPostTz();
  const firstBookable = addDays(today, hall.minNoticeDays);
  const lastBookable = addMonths(today, hall.maxAdvanceMonths);

  if (input.eventDate < firstBookable) {
    errors.eventDate = `Online requests need at least ${hall.minNoticeDays} days' notice. For something sooner:${callUs}`;
  } else if (input.eventDate > lastBookable) {
    errors.eventDate = `We are taking requests through ${formatDateLong(lastBookable)}.`;
  } else {
    const status = await liveDayStatus(input.eventDate);
    if (status === "booked" || status === "post" || status === "closed") {
      errors.eventDate = "That date is not available. Please choose another date on the calendar.";
    }
  }

  if (input.startTime < hall.openTime) {
    errors.startTime = `Rentals can start at ${formatTime(hall.openTime)} or later.`;
  }
  if (input.endTime > hall.closeTime) {
    errors.endTime = `Rentals must end by ${formatTime(hall.closeTime)}.`;
  }
  if (input.guestCount > hall.capacity) {
    errors.guestCount = `The hall holds up to ${hall.capacity} guests.`;
  }

  if (Object.keys(errors).length) {
    return { status: "error", message: FIX_FIELDS, errors, values };
  }

  if (!(await rateLimit(`booking:${ip}`, 5, 3600))) {
    return {
      status: "error",
      message: `We have already received several requests from you.${callUs}`,
      values,
    };
  }

  const booking = await createBooking(input, { status: "pending", source: "web" });
  updateTag("bookings");
  await notifyBookingReceived(booking, settings);

  return {
    status: "success",
    data: {
      reference: booking.reference,
      when: `${formatDateLong(booking.eventDate)}, ${formatTimeRange(booking.startTime, booking.endTime)}`,
      email: booking.contactEmail,
    },
  };
}

const STATUS_TEXT: Record<string, string> = {
  pending: "Received — waiting for review",
  approved: "Approved",
  declined: "Not approved",
  cancelled: "Cancelled",
};

/** Public form: look up a request by reference + the email it was made with. */
export async function checkBookingStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const ip = await clientIp();
  if (!(await rateLimit(`status:${ip}`, 20, 3600))) {
    return { status: "error", message: "Too many attempts. Please try again later.", values };
  }

  const parsed = statusLookupSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: FIX_FIELDS, errors: fieldErrors(parsed.error), values };
  }

  const booking = await getBookingByReference(parsed.data.reference);
  if (!booking || booking.contactEmail.toLowerCase() !== parsed.data.email) {
    return {
      status: "error",
      message: "We couldn't find a request with that reference and email address. Please check both and try again.",
      values,
    };
  }

  return {
    status: "success",
    values,
    data: {
      reference: booking.reference,
      status: booking.status,
      statusText: STATUS_TEXT[booking.status] ?? booking.status,
      when: `${formatDateLong(booking.eventDate)}, ${formatTimeRange(booking.startTime, booking.endTime)}`,
      eventType: booking.eventType,
      note: booking.status === "declined" ? booking.declineReason : "",
    },
  };
}

/** Public form: send a message to the post or to one officer. */
export async function sendContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  if (values.website) return { status: "success" };

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: FIX_FIELDS, errors: fieldErrors(parsed.error), values };
  }

  const ip = await clientIp();
  if (!(await rateLimit(`contact:${ip}`, 5, 3600))) {
    return {
      status: "error",
      message: "You have sent several messages in a short time. Please call the post if this is urgent.",
      values,
    };
  }

  const input = parsed.data;
  const officer = input.officerId ? await getOfficer(input.officerId) : null;
  const recipient = officer?.acceptsMessages ? officer : null;

  await createMessage({
    name: input.name,
    email: input.email,
    phone: input.phone,
    topic: input.topic,
    officerId: recipient?.id ?? null,
    officerName: recipient ? `${recipient.title} ${recipient.name}` : null,
    body: input.body,
  });
  await notifyContactMessage(input, recipient, await readSettings());

  return { status: "success" };
}

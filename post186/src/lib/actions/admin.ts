"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  MIN_PASSWORD_LENGTH,
  bootstrapCredentials,
  createSession,
  destroySession,
  hashPassword,
  requireAdmin,
  safeEqual,
  verifyPassword,
} from "../auth";
import { transaction } from "../db";
import { isYmd } from "../dates";
import { notifyBookingDecision } from "../notifications";
import { clientIp, rateLimit, resetRateLimit } from "../rate-limit";
import * as repo from "../repo";
import { demoContentStatements } from "../seed";
import { parseLines, parseRates, type SiteSettings } from "../settings";
import { BOOKING_STATUSES, type BookingStatus, type EventCategory } from "../types";
import {
  adminBookingSchema,
  eventSchema,
  fieldErrors,
  formValues,
  loginSchema,
  officerSchema,
  passwordSchema,
  settingsSchema,
  type FormState,
} from "../validation";

const FIX_FIELDS = "Please check the highlighted fields and try again.";

function idFrom(formData: FormData, name = "id"): number | null {
  const raw = formData.get(name);
  return typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : null;
}

// ───────────────────────── Sign in / out ─────────────────────────

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const ip = await clientIp();
  const limitKey = `login:${ip}`;
  if (!(await rateLimit(limitKey, 10, 900))) {
    return { status: "error", message: "Too many sign-in attempts. Please wait 15 minutes and try again.", values };
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: FIX_FIELDS, errors: fieldErrors(parsed.error), values };
  }
  const { email, password } = parsed.data;
  const failure: FormState = { status: "error", message: "That email or password is not correct.", values };

  let userId: number | null = null;

  if ((await repo.countAdminUsers()) === 0) {
    // First sign-in ever: accept the credentials from the environment and create the account.
    const bootstrap = bootstrapCredentials();
    if (!bootstrap) {
      return {
        status: "error",
        message:
          "No administrator exists yet. Set ADMIN_EMAIL and ADMIN_PASSWORD in the hosting settings, redeploy, then sign in with them.",
        values,
      };
    }
    if (process.env.NODE_ENV === "production" && bootstrap.password.length < MIN_PASSWORD_LENGTH) {
      return {
        status: "error",
        message: `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters. Update it in the hosting settings and redeploy.`,
        values,
      };
    }
    if (email !== bootstrap.email || !safeEqual(password, bootstrap.password)) return failure;
    userId = await repo.createAdminUser(email, "", await hashPassword(password));
  } else {
    const user = await repo.findAdminByEmail(email);
    // Always run the hash so a wrong email takes as long as a wrong password.
    const ok = await verifyPassword(
      password,
      user?.passwordHash ?? "scrypt$00000000000000000000000000000000$" + "0".repeat(128),
    );
    if (!user || !ok) return failure;
    userId = user.id;
  }

  await resetRateLimit(limitKey);
  await createSession(userId);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

// ───────────────────────── Events ─────────────────────────

export async function saveEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: FIX_FIELDS, errors: fieldErrors(parsed.error), values };
  }
  const v = parsed.data;
  const input: repo.EventInput = {
    title: v.title,
    summary: v.summary,
    description: v.description,
    category: v.category as EventCategory,
    location: v.location,
    startDate: v.startDate,
    startTime: v.allDay ? null : v.startTime,
    endTime: v.allDay ? null : v.endTime,
    recurrence: v.recurrence,
    repeatUntil: v.recurrence === "none" ? null : v.repeatUntil,
    skipDates: v.recurrence === "none" ? [] : v.skipDates,
    audience: v.audience,
    usesHall: v.usesHall,
    featured: v.featured,
    published: v.published,
    cancelled: v.cancelled,
  };

  const id = idFrom(formData);
  if (id) await repo.updateEvent(id, input);
  else await repo.createEvent(input);

  updateTag("events");
  redirect(`/admin/events?saved=${id ? "updated" : "created"}`);
}

export async function deleteEvent(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idFrom(formData);
  if (id) await repo.deleteEvent(id);
  updateTag("events");
  redirect("/admin/events?saved=deleted");
}

/** Copies an event as an unpublished draft so a similar one can be set up quickly. */
export async function duplicateEvent(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idFrom(formData);
  const source = id ? await repo.getEvent(id) : null;
  if (!source) redirect("/admin/events");
  const newId = await repo.createEvent({
    ...source,
    title: `${source.title} (copy)`,
    published: false,
    featured: false,
    cancelled: false,
  });
  updateTag("events");
  redirect(`/admin/events/${newId}`);
}

// ───────────────────────── Officers ─────────────────────────

export async function saveOfficer(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const parsed = officerSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: FIX_FIELDS, errors: fieldErrors(parsed.error), values };
  }
  const id = idFrom(formData);
  if (id) await repo.updateOfficer(id, parsed.data);
  else await repo.createOfficer(parsed.data);

  updateTag("officers");
  redirect(`/admin/officers?saved=${id ? "updated" : "created"}`);
}

export async function deleteOfficer(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idFrom(formData);
  if (id) await repo.deleteOfficer(id);
  updateTag("officers");
  redirect("/admin/officers?saved=deleted");
}

export async function moveOfficer(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idFrom(formData);
  const direction = formData.get("direction") === "up" ? "up" : "down";
  if (id) await repo.moveOfficer(id, direction);
  updateTag("officers");
  redirect("/admin/officers");
}

// ───────────────────────── Hall bookings ─────────────────────────

export async function saveBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const parsed = adminBookingSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: FIX_FIELDS, errors: fieldErrors(parsed.error), values };
  }
  const v = parsed.data;
  const id = idFrom(formData);

  if (id) {
    await repo.updateBookingDetails(id, v);
    updateTag("bookings");
    redirect(`/admin/bookings/${id}?saved=updated`);
  }

  // A booking entered by an officer (phone or walk-in) is approved unless they say otherwise.
  const requested = String(formData.get("status") ?? "approved");
  const status: BookingStatus = requested === "pending" ? "pending" : "approved";
  if (status === "approved") {
    const conflicts = await repo.findConflicts(v.eventDate, v.startTime, v.endTime);
    if (conflicts.length && formData.get("allowConflict") !== "on") {
      return {
        status: "error",
        message: `This overlaps an approved booking (${conflicts
          .map((c) => c.reference)
          .join(", ")}). Change the date or time, or tick “Save anyway”.`,
        errors: { eventDate: "Overlaps an approved booking." },
        values,
      };
    }
  }
  const booking = await repo.createBooking(v, {
    status,
    source: "admin",
    adminNotes: v.adminNotes,
    quotedAmount: v.quotedAmount,
  });
  updateTag("bookings");
  redirect(`/admin/bookings/${booking.id}?saved=created`);
}

export async function decideBooking(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idFrom(formData);
  const status = String(formData.get("status") ?? "") as BookingStatus;
  if (!id || !BOOKING_STATUSES.includes(status)) redirect("/admin/bookings");

  const booking = await repo.getBooking(id);
  if (!booking) redirect("/admin/bookings");

  if (status === "approved" && formData.get("allowConflict") !== "on") {
    const conflicts = await repo.findConflicts(booking.eventDate, booking.startTime, booking.endTime, id);
    if (conflicts.length) redirect(`/admin/bookings/${id}?conflict=${conflicts.map((c) => c.id).join(",")}`);
  }

  const reason = String(formData.get("declineReason") ?? "").trim().slice(0, 1000);
  await repo.setBookingStatus(id, status, reason);
  updateTag("bookings");

  const changed = booking.status !== status;
  if (changed && formData.get("notify") === "on" && (status === "approved" || status === "declined")) {
    const updated = await repo.getBooking(id);
    if (updated) await notifyBookingDecision(updated, await repo.readSettings());
  }
  redirect(`/admin/bookings/${id}?saved=${status}`);
}

export async function deleteBooking(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idFrom(formData);
  if (id) await repo.deleteBooking(id);
  updateTag("bookings");
  redirect("/admin/bookings?saved=deleted");
}

export async function addBlockedDate(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const date = String(formData.get("date") ?? "");
  if (!isYmd(date)) {
    return { status: "error", message: FIX_FIELDS, errors: { date: "Choose a date." }, values };
  }
  await repo.addBlockedDate(date, String(formData.get("reason") ?? "").trim().slice(0, 120));
  updateTag("bookings");
  redirect("/admin/bookings/blocked?saved=created");
}

export async function removeBlockedDate(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idFrom(formData);
  if (id) await repo.removeBlockedDate(id);
  updateTag("bookings");
  redirect("/admin/bookings/blocked?saved=deleted");
}

// ───────────────────────── Messages ─────────────────────────

export async function setMessageRead(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idFrom(formData);
  if (id) await repo.setMessageRead(id, formData.get("read") === "1");
  redirect("/admin/messages");
}

export async function deleteMessage(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idFrom(formData);
  if (id) await repo.deleteMessage(id);
  redirect("/admin/messages?saved=deleted");
}

// ───────────────────────── Settings ─────────────────────────

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: FIX_FIELDS, errors: fieldErrors(parsed.error), values };
  }
  const v = parsed.data;
  const current = await repo.readSettings();
  const next: SiteSettings = {
    ...current,
    orgName: v.orgName,
    postName: v.postName,
    postNumber: v.postNumber,
    street: v.street,
    city: v.city,
    state: v.state.toUpperCase(),
    stateName: v.stateName,
    zip: v.zip,
    mailingAddress: v.mailingAddress,
    phone: v.phone,
    email: v.email,
    facebookUrl: v.facebookUrl,
    meetingSchedule: v.meetingSchedule,
    hours: v.hours,
    notifyEmail: v.notifyEmail,
    announcement: {
      enabled: v.announcementEnabled,
      text: v.announcementText,
      linkLabel: v.announcementLinkLabel,
      linkUrl: v.announcementLinkUrl,
    },
    hall: {
      name: v.hallName,
      capacity: v.hallCapacity,
      intro: v.hallIntro,
      amenities: parseLines(v.hallAmenities),
      rates: parseRates(v.hallRates),
      ratesNote: v.hallRatesNote,
      policies: parseLines(v.hallPolicies),
      openTime: v.hallOpenTime,
      closeTime: v.hallCloseTime,
      minNoticeDays: v.hallMinNoticeDays,
      maxAdvanceMonths: v.hallMaxAdvanceMonths,
      responseTime: v.hallResponseTime,
    },
  };
  await repo.writeSettings(next);
  updateTag("settings");
  redirect("/admin/settings?saved=updated");
}

export async function loadSampleContent(): Promise<void> {
  await requireAdmin();
  await transaction(demoContentStatements());
  updateTag("events");
  updateTag("bookings");
  redirect("/admin?saved=sample-loaded");
}

export async function removeSampleContent(): Promise<void> {
  await requireAdmin();
  await repo.removeDemoRows();
  updateTag("events");
  updateTag("bookings");
  updateTag("officers");
  redirect("/admin?saved=sample-removed");
}

// ───────────────────────── Accounts ─────────────────────────

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const errors: Record<string, string> = {};
  const user = await repo.findAdminByEmail(admin.email);
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    errors.currentPassword = "That is not your current password.";
  }
  const parsed = passwordSchema(MIN_PASSWORD_LENGTH).safeParse(next);
  if (!parsed.success) errors.newPassword = parsed.error.issues[0].message;
  else if (next !== confirm) errors.confirmPassword = "The two new passwords don't match.";

  if (Object.keys(errors).length || !user) return { status: "error", message: FIX_FIELDS, errors };

  await repo.updateAdminPassword(user.id, await hashPassword(next));
  return { status: "success", message: "Your password has been changed." };
}

export async function addAdminUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const password = String(formData.get("newPassword") ?? "");

  const errors: Record<string, string> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  else if (await repo.findAdminByEmail(email)) errors.email = "That person already has access.";
  if (!name) errors.name = "Enter their name.";
  const parsed = passwordSchema(MIN_PASSWORD_LENGTH).safeParse(password);
  if (!parsed.success) errors.newPassword = parsed.error.issues[0].message;

  if (Object.keys(errors).length) return { status: "error", message: FIX_FIELDS, errors, values };

  await repo.createAdminUser(email, name, await hashPassword(password));
  redirect("/admin/account?saved=created");
}

export async function removeAdminUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = idFrom(formData);
  // Nobody can remove themselves, so there is always at least one administrator.
  if (id && id !== admin.id) await repo.deleteAdminUser(id);
  redirect("/admin/account?saved=deleted");
}

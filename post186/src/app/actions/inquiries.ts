"use server";

import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createInquiry, type InquiryType } from "@/lib/inquiries";
import { checkRateLimit } from "@/lib/rate-limit";
import { generalSchema, issuesToErrors, membershipSchema, rentalSchema } from "@/lib/validation";
import { notifyNewInquiry } from "@/lib/notify";
import type { FormState } from "@/components/forms/fields";

function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

async function clientKey(type: InquiryType): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return `${type}:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
}

function safeValues(values: Record<string, string>): Record<string, string> {
  const { website: _honeypot, ...rest } = values;
  void _honeypot;
  return rest;
}

async function guard(type: InquiryType, values: Record<string, string>): Promise<FormState | null> {
  if (values.website) {
    // Honeypot filled: pretend success so bots stop, store nothing.
    return { ok: true, errors: {}, values: {} };
  }
  const rl = checkRateLimit(await clientKey(type));
  if (!rl.ok) {
    return {
      ok: false,
      errors: { form: `You have sent several messages recently. Please wait about ${Math.ceil(rl.retryAfterSec / 60)} minute(s) and try again.` },
      values: safeValues(values),
    };
  }
  return null;
}

export async function submitMembershipInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const blocked = await guard("membership", values);
  if (blocked) return blocked;
  const parsed = membershipSchema.safeParse(values);
  if (!parsed.success) return { ok: false, errors: issuesToErrors(parsed.error), values: safeValues(values) };
  const d = parsed.data;
  const id = await createInquiry({
    type: "membership",
    name: d.name,
    email: d.email,
    phone: d.phone,
    contact_method: d.contact_method,
    message: d.message,
    details: { service_connection: d.service_connection, service_area: d.service_area, interest: d.interest },
  });
  await notifyNewInquiry("membership", id, d.name);
  return { ok: true, errors: {}, values: {} };
}

export async function submitRentalInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const blocked = await guard("rental", values);
  if (blocked) return blocked;
  const parsed = rentalSchema.safeParse(values);
  if (!parsed.success) return { ok: false, errors: issuesToErrors(parsed.error), values: safeValues(values) };
  const d = parsed.data;
  const id = await createInquiry({
    type: "rental",
    name: d.name,
    email: d.email,
    phone: d.phone,
    contact_method: d.contact_method,
    organization: d.organization,
    subject: d.event_type,
    message: d.description,
    details: {
      preferred_date: d.preferred_date,
      start_time: d.start_time,
      end_time: d.end_time,
      alternate_date: d.alternate_date,
      guest_count: d.guest_count,
      accessibility_needs: d.accessibility_needs,
      alcohol: d.alcohol,
      notes: d.notes,
    },
  });
  await notifyNewInquiry("rental", id, d.name);
  return { ok: true, errors: {}, values: {} };
}

export async function submitGeneralInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const blocked = await guard("general", values);
  if (blocked) return blocked;
  const parsed = generalSchema.safeParse(values);
  if (!parsed.success) return { ok: false, errors: issuesToErrors(parsed.error), values: safeValues(values) };
  const d = parsed.data;
  const id = await createInquiry({
    type: "general",
    name: d.name,
    email: d.email,
    phone: d.phone,
    contact_method: d.contact_method,
    subject: d.subject,
    message: d.message,
  });
  await notifyNewInquiry("general", id, d.name);
  return { ok: true, errors: {}, values: {} };
}

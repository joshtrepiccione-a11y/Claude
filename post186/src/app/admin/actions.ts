"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { adminConfigured, checkCredentials, endSession, requireAdmin, startSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { addCategory, deleteCategory, renameCategory } from "@/lib/categories";
import { saveSiteContent } from "@/lib/content";
import { createEvent, deleteEvent, setEventArchived, setEventStatus, updateEvent } from "@/lib/events";
import { deleteInquiry, updateInquiry, type InquiryStatus } from "@/lib/inquiries";
import { createPost, deletePost, updatePost } from "@/lib/posts";
import { INQUIRY_STATUSES, categorySchema, eventSchema, issuesToErrors, loginSchema, postSchema } from "@/lib/validation";
import type { FormState } from "@/components/forms/fields";

function values(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

function revalidatePublic() {
  for (const p of ["/", "/events", "/news", "/about", "/membership", "/hall-rentals", "/contact", "/privacy", "/accessibility"]) revalidatePath(p);
}

/* Authentication */

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!adminConfigured()) {
    return { ok: false, errors: { form: "Admin sign-in is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD_HASH, and SESSION_SECRET (see README)." }, values: {} };
  }
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`login:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`, 8, 15 * 60 * 1000);
  if (!rl.ok) return { ok: false, errors: { form: "Too many sign-in attempts. Please wait 15 minutes and try again." }, values: {} };
  const parsed = loginSchema.safeParse(values(formData));
  if (!parsed.success) return { ok: false, errors: { form: "Enter your username and password." }, values: {} };
  if (!checkCredentials(parsed.data.username, parsed.data.password)) {
    return { ok: false, errors: { form: "That username and password did not match." }, values: { username: parsed.data.username } };
  }
  await startSession();
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

/* Posts */

export async function savePostAction(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const v = values(formData);
  const parsed = postSchema.safeParse(v);
  if (!parsed.success) return { ok: false, errors: issuesToErrors(parsed.error), values: v };
  let postId = id;
  if (postId) await updatePost(postId, parsed.data);
  else postId = await createPost(parsed.data);
  revalidatePublic();
  redirect(`/admin/posts/${postId}?saved=1`);
}

export async function deletePostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (id) await deletePost(id);
  revalidatePublic();
  redirect("/admin/posts?deleted=1");
}

/* Events */

export async function saveEventAction(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const v = values(formData);
  const parsed = eventSchema.safeParse(v);
  if (!parsed.success) return { ok: false, errors: issuesToErrors(parsed.error), values: v };
  let eventId = id;
  if (eventId) await updateEvent(eventId, parsed.data);
  else eventId = await createEvent(parsed.data);
  revalidatePublic();
  redirect(`/admin/events/${eventId}?saved=1`);
}

export async function eventQuickAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const action = String(formData.get("action") ?? "");
  if (!id) redirect("/admin/events");
  if (action === "cancel") await setEventStatus(id, "cancelled");
  else if (action === "postpone") await setEventStatus(id, "postponed");
  else if (action === "reschedule") await setEventStatus(id, "scheduled");
  else if (action === "archive") await setEventArchived(id, true);
  else if (action === "unarchive") await setEventArchived(id, false);
  else if (action === "delete") {
    await deleteEvent(id);
    revalidatePublic();
    redirect("/admin/events?deleted=1");
  }
  revalidatePublic();
  redirect(`/admin/events/${id}?saved=1`);
}

/* Inquiries */

export async function updateInquiryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "new") as InquiryStatus;
  const notes = String(formData.get("admin_notes") ?? "");
  if (id && (INQUIRY_STATUSES as readonly string[]).includes(status)) await updateInquiry(id, status, notes);
  redirect(`/admin/inquiries/${id}?saved=1`);
}

export async function deleteInquiryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const type = String(formData.get("type") ?? "membership");
  if (id) await deleteInquiry(id);
  redirect(`/admin/inquiries?type=${encodeURIComponent(type)}&deleted=1`);
}

/* Categories */

export async function addCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(values(formData));
  if (!parsed.success) redirect("/admin/categories?error=" + encodeURIComponent("Enter a category name of at least 2 characters."));
  const result = await addCategory(parsed.data.kind, parsed.data.name);
  redirect(result.ok ? "/admin/categories?saved=1" : "/admin/categories?error=" + encodeURIComponent(result.error ?? "Could not add category."));
}

export async function renameCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "");
  const result = id ? await renameCategory(id, name) : { ok: false, error: "Category not found." };
  redirect(result.ok ? "/admin/categories?saved=1" : "/admin/categories?error=" + encodeURIComponent(result.error ?? "Could not rename category."));
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (id) await deleteCategory(id);
  revalidatePublic();
  redirect("/admin/categories?saved=1");
}

/* Site content */

export async function saveContentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const v = values(formData);
  await saveSiteContent(v);
  revalidatePublic();
  return { ok: true, errors: {}, values: v, message: "Site content saved." };
}

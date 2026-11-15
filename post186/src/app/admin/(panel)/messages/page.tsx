import type { Metadata } from "next";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { AdminTitle, Empty, Flash } from "@/components/admin/ui";
import { Mail, Phone } from "@/components/icons";
import { deleteMessage, setMessageRead } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";
import { listMessages } from "@/lib/repo";
import { telHref } from "@/lib/settings";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesAdmin({ searchParams }: PageProps<"/admin/messages">) {
  await requireAdmin();
  const { saved } = await searchParams;
  const messages = await listMessages();

  return (
    <>
      <AdminTitle
        title="Messages"
        intro="Messages sent through the contact form on the Officers & Contact page. Reply from your own email."
      />
      <Flash saved={saved} />

      {messages.length ? (
        <ul className="space-y-4">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`card p-5 sm:p-6 ${message.isRead ? "" : "border-l-4 border-l-flag"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-ink">{message.name}</span>
                    {!message.isRead && <span className="badge badge-bad">New</span>}
                    <span className="badge">{message.topic}</span>
                  </p>
                  <p className="text-[0.9375rem]">
                    {formatTimestamp(message.createdAt)} · To: {message.officerName ?? "Post 186 general inbox"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={setMessageRead}>
                    <input type="hidden" name="id" value={message.id} />
                    <input type="hidden" name="read" value={message.isRead ? "0" : "1"} />
                    <button type="submit" className="btn btn-quiet btn-sm">
                      {message.isRead ? "Mark Unread" : "Mark as Read"}
                    </button>
                  </form>
                  <form action={deleteMessage}>
                    <input type="hidden" name="id" value={message.id} />
                    <ConfirmButton message={`Delete the message from ${message.name}?`}>Delete</ConfirmButton>
                  </form>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-line text-ink">{message.body}</p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line-soft pt-3">
                <li>
                  <a
                    href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.topic} — American Legion Post 186`)}`}
                    className="inline-flex min-h-9 items-center gap-2 break-all font-semibold text-azure hover:underline"
                  >
                    <Mail size={17} className="flex-none" /> Reply to {message.email}
                  </a>
                </li>
                {message.phone && (
                  <li>
                    <a href={telHref(message.phone)} className="inline-flex min-h-9 items-center gap-2 font-semibold text-azure hover:underline">
                      <Phone size={17} /> {message.phone}
                    </a>
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No messages yet. When someone uses the contact form, it shows up here.</Empty>
      )}
    </>
  );
}

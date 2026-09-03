import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { inquiryCounts } from "@/lib/inquiries";
import { listAllEvents } from "@/lib/events";
import { listAllPosts } from "@/lib/posts";
import { missingFacts } from "@/lib/content";
import { nowIso } from "@/lib/db";

export default async function AdminDashboard() {
  await requireAdmin();
  const counts = await inquiryCounts();
  const upcoming = (await listAllEvents()).filter((e) => e.end_at >= nowIso()).length;
  const posts = await listAllPosts();
  const drafts = posts.filter((p) => p.status === "draft").length;
  const missing = (await missingFacts()).length;

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stat-grid">
        <div className="stat">
          <span className="big">{counts.membership.new}</span>
          <Link href="/admin/inquiries?type=membership">New membership inquiries</Link>
        </div>
        <div className="stat">
          <span className="big">{counts.rental.new}</span>
          <Link href="/admin/inquiries?type=rental">New hall rental inquiries</Link>
        </div>
        <div className="stat">
          <span className="big">{counts.general.new}</span>
          <Link href="/admin/inquiries?type=general">New general messages</Link>
        </div>
        <div className="stat">
          <span className="big">{upcoming}</span>
          <Link href="/admin/events">Upcoming events (all)</Link>
        </div>
        <div className="stat">
          <span className="big">{drafts}</span>
          <Link href="/admin/posts">Draft posts</Link>
        </div>
        <div className="stat">
          <span className="big">{missing}</span>
          <Link href="/admin/checklist">Facts still needed</Link>
        </div>
      </div>
      <h2>Quick actions</h2>
      <div className="admin-toolbar">
        <Link href="/admin/events/new" className="btn btn-secondary btn-sm">
          Add an event
        </Link>
        <Link href="/admin/posts/new" className="btn btn-secondary btn-sm">
          Write a news post
        </Link>
        <Link href="/admin/content" className="btn btn-outline btn-sm">
          Edit site content
        </Link>
      </div>
      <h2>How this works</h2>
      <ul className="prose">
        <li>Inquiries from the website land in three separate queues. Mark each one New, In progress, Contacted, Closed, or Spam as you work it.</li>
        <li>Events only appear on the public site when the &quot;Show on public calendar&quot; box is checked. Private rentals and internal meetings stay private by default.</li>
        <li>News posts can be saved as drafts, scheduled for a future date, or published now.</li>
        <li>Site content holds the facts the public pages need: phone, email, hours, hall details, history, and officers. Anything left blank stays hidden from the public site.</li>
      </ul>
    </>
  );
}

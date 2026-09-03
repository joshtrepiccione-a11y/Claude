import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { inquiryCounts } from "@/lib/inquiries";
import { logoutAction } from "@/app/admin/actions";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: { default: "Admin", template: `%s | Admin | ${SITE.shortName}` }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const counts = await inquiryCounts();
  const newTotal = counts.membership.new + counts.rental.new + counts.general.new;
  return (
    <div className="admin-shell">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <nav className="admin-nav on-dark" aria-label="Admin">
        <h2>{SITE.shortName} admin</h2>
        <ul>
          <li>
            <Link href="/admin">Dashboard</Link>
          </li>
          <li>
            <Link href="/admin/inquiries">
              Inquiries {newTotal ? <span className="admin-count">{newTotal}</span> : null}
            </Link>
          </li>
          <li>
            <Link href="/admin/events">Events</Link>
          </li>
          <li>
            <Link href="/admin/posts">News posts</Link>
          </li>
          <li>
            <Link href="/admin/content">Site content</Link>
          </li>
          <li>
            <Link href="/admin/categories">Categories</Link>
          </li>
          <li>
            <Link href="/admin/checklist">Content checklist</Link>
          </li>
          <li>
            <Link href="/" target="_blank" rel="noopener">
              View public site
            </Link>
          </li>
          <li>
            <form action={logoutAction}>
              <button type="submit">Sign out</button>
            </form>
          </li>
        </ul>
      </nav>
      <main id="main" className="admin-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

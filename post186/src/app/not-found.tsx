import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

// The shell reads editable site content for the footer, so this page is rendered per request
// like every other public page. It also keeps the production build free of database access.
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="container page-intro">
        <h1>Page not found</h1>
        <p className="lead">The page you were looking for is not here. It may have moved, or the address may have a typo.</p>
        <div className="detail-actions">
          <Link href="/" className="btn btn-secondary">
            Go to the home page
          </Link>
          <Link href="/events" className="btn btn-outline">
            See upcoming events
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { missingFacts } from "@/lib/content";
import { brandmarkAvailable } from "@/components/Brandmark";

export default async function ChecklistPage() {
  await requireAdmin();
  const missing = await missingFacts();
  const marks = { primary: brandmarkAvailable("primary"), white: brandmarkAvailable("white") };
  return (
    <>
      <h1>Content needed from Post 186</h1>
      <p className="meta">Everything below is either hidden from the public site or shown as draft copy until it is supplied and verified.</p>
      <h2 style={{ fontSize: "var(--step-1)" }}>Brand files</h2>
      <ul className="checklist">
        <li>{marks.primary ? "Done: " : "Needed: "}official primary RGB brandmark PNG placed at public/brand/american-legion-brandmark-primary-rgb.png</li>
        <li>{marks.white ? "Done: " : "Optional: "}official secondary white brandmark PNG placed at public/brand/american-legion-brandmark-secondary-white.png (used in the footer on Emblem Blue)</li>
      </ul>
      <h2 style={{ fontSize: "var(--step-1)" }}>Facts still blank in Site content ({missing.length})</h2>
      {missing.length ? (
        <ul className="checklist">
          {missing.map((f) => (
            <li key={f.key}>
              <strong>{f.group}:</strong> {f.label}
              {f.help ? <span className="meta"> ({f.help})</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>All fact fields have values. Confirm each one with leadership.</p>
      )}
      <h2 style={{ fontSize: "var(--step-1)" }}>Also needed</h2>
      <ul className="checklist">
        <li>Approval of draft copy: home mission summary, membership overview, hall overview, About mission text.</li>
        <li>Photos of members, the hall, ceremonies, and community activities (with written descriptions), uploaded to public/images.</li>
        <li>Confirmation of the hall rental agreement process and who receives rental inquiries.</li>
        <li>Who handles privacy deletion requests and accessibility reports.</li>
        <li>Real events and the first news post to replace the demonstration content (delete the items marked &quot;[Demo]&quot;).</li>
      </ul>
      <p>
        <Link href="/admin/content" className="btn btn-secondary btn-sm">
          Fill in site content
        </Link>
      </p>
    </>
  );
}

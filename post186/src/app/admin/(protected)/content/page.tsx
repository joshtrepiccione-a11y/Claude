import { requireAdmin } from "@/lib/auth";
import { CONTENT_FIELDS, contentGroups, getStoredContent } from "@/lib/content";
import { ContentForm } from "@/components/admin/ContentForm";

export default async function ContentPage() {
  await requireAdmin();
  return (
    <>
      <h1>Site content</h1>
      <p className="meta">
        Facts (phone, hours, hall details, history, officers) stay hidden on the public site until you fill them in here. Draft copy is shown publicly until you replace it.
      </p>
      <ContentForm fields={CONTENT_FIELDS} groups={contentGroups()} stored={await getStoredContent()} />
    </>
  );
}

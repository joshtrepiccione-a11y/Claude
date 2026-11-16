import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficerForm } from "@/components/admin/forms";
import { AdminTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getOfficer } from "@/lib/repo";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Edit Officer" };

export default async function EditOfficer({ params }: PageProps<"/admin/officers/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const officer = /^\d+$/.test(id) ? await getOfficer(Number(id)) : null;
  if (!officer) notFound();
  return (
    <>
      <AdminTitle title={`Edit ${officer.name}`} back={{ href: "/admin/officers", label: "All officers" }} />
      <OfficerForm officer={officer} />
    </>
  );
}

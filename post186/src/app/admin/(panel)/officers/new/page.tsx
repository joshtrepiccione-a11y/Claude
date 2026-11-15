import type { Metadata } from "next";
import { OfficerForm } from "@/components/admin/forms";
import { AdminTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Add an Officer" };

export default async function NewOfficer() {
  await requireAdmin();
  return (
    <>
      <AdminTitle title="Add an Officer" back={{ href: "/admin/officers", label: "All officers" }} />
      <OfficerForm />
    </>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Admin sign-in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main id="main" className="container">
      <div className="login-card">
        <h1 style={{ fontSize: "var(--step-2)" }}>{SITE.shortName} admin</h1>
        <p className="meta">Sign in to manage news, events, site content, and inquiries.</p>
        <LoginForm />
      </div>
    </main>
  );
}

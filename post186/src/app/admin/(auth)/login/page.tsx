import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Form, FormAlert, SubmitButton, TextField } from "@/components/forms/Form";
import { login } from "@/lib/actions/admin";
import { bootstrapCredentials, getCurrentAdmin } from "@/lib/auth";
import { countAdminUsers } from "@/lib/repo";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Officer Sign-in" };

async function LoginBody() {
  if (await getCurrentAdmin()) redirect("/admin");

  // Only on a developer's own computer: show the built-in sign-in so the site can be tried out.
  const devHint =
    process.env.NODE_ENV !== "production" && !process.env.ADMIN_EMAIL && (await countAdminUsers()) === 0
      ? bootstrapCredentials()
      : null;

  return (
    <>
      <Form action={login} className="mt-6 space-y-5">
        <FormAlert />
        <TextField name="email" label="Email" type="email" required autoComplete="username" inputMode="email" />
        <TextField name="password" label="Password" type="password" required autoComplete="current-password" />
        <SubmitButton className="btn btn-red btn-lg w-full" pendingLabel="Signing in…">
          Sign In
        </SubmitButton>
      </Form>
      {devHint && (
        <p className="mt-6 rounded-md bg-warn-soft px-4 py-3 text-[0.9375rem] text-ink">
          <strong>Local preview:</strong> sign in with <code>{devHint.email}</code> and password{" "}
          <code>{devHint.password}</code>. On the live site you choose your own (see the README).
        </p>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="flag-backdrop flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl sm:p-8">
        <p className="eyebrow">American Legion Post 186</p>
        <h1 className="mt-1 text-3xl">Officer Sign-in</h1>
        <p className="mt-2 text-[0.9375rem]">For post officers who update events, hall bookings and contacts.</p>
        <Suspense fallback={<p className="mt-6">Loading…</p>}>
          <LoginBody />
        </Suspense>
        <p className="mt-8 border-t border-line pt-5 text-[0.9375rem]">
          <Link href="/" className="link">
            Back to the website
          </Link>
        </p>
      </div>
    </main>
  );
}

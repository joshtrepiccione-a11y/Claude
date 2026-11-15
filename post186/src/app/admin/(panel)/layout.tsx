import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { External } from "@/components/icons";
import { logout } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { countBookings, countUnreadMessages } from "@/lib/repo";

/**
 * Everything under /admin (except the sign-in page) renders inside this gate.
 * Each page and action also checks the session itself — see requireAdmin().
 */
async function Gate({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const [bookings, unread] = await Promise.all([countBookings(), countUnreadMessages()]);

  return (
    <>
      <header className="bg-navy text-white">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
          <Link href="/admin" className="caps inline-flex min-h-11 items-center gap-1.5 text-xl">
            Post 186 <span className="text-white/75">Admin</span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.9375rem]">
            <span className="hidden text-white/85 sm:inline">{admin.name || admin.email}</span>
            <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline">
              View website <External size={15} />
            </Link>
            <form action={logout}>
              <button type="submit" className="min-h-11 font-semibold underline underline-offset-4">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <AdminNav pending={bookings.pending} unread={unread} />
        <main id="admin-main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </>
  );
}

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="py-24 text-center font-semibold">
          Loading…
        </p>
      }
    >
      <Gate>{children}</Gate>
    </Suspense>
  );
}

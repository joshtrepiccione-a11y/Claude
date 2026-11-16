import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronLeft } from "@/components/icons";
import type { BookingStatus } from "@/lib/types";

/** Page title row with optional action buttons on the right. */
export function AdminTitle({
  title,
  intro,
  back,
  children,
}: {
  title: string;
  intro?: ReactNode;
  back?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="link-arrow mb-2 text-[0.9375rem]">
          <ChevronLeft size={16} /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
      {intro && <p className="mt-2 max-w-3xl">{intro}</p>}
    </div>
  );
}

const FLASH: Record<string, string> = {
  created: "Saved. It is now live on the website.",
  updated: "Your changes are saved and live on the website.",
  deleted: "Deleted.",
  approved: "Booking approved. The date now shows as booked on the public calendar.",
  declined: "Request declined.",
  cancelled: "Booking cancelled. The date is open again.",
  pending: "Moved back to waiting for review.",
  "sample-loaded": "Sample events and bookings were added so you can see how the site looks.",
  "sample-removed": "Sample content removed.",
};

/** Confirmation banner shown after a save, driven by ?saved=… in the address. */
export function Flash({ saved }: { saved?: string | string[] }) {
  const key = Array.isArray(saved) ? saved[0] : saved;
  if (!key || !FLASH[key]) return null;
  return (
    <p role="status" className="mb-6 flex items-start gap-3 rounded-md border-l-4 border-ok bg-ok-soft px-4 py-3 font-semibold text-ok">
      <Check size={22} className="mt-0.5 flex-none" />
      {FLASH[key]}
    </p>
  );
}

const STATUS_STYLE: Record<BookingStatus, { className: string; label: string }> = {
  pending: { className: "badge-warn", label: "Waiting for review" },
  approved: { className: "badge-ok", label: "Approved" },
  declined: { className: "badge-bad", label: "Declined" },
  cancelled: { className: "", label: "Cancelled" },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const style = STATUS_STYLE[status];
  return <span className={`badge ${style.className}`}>{style.label}</span>;
}

export function Panel({
  title,
  children,
  className = "",
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {title && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl md:text-2xl">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A titled group of fields inside a long form. */
export function FieldGroup({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="card p-5 sm:p-6">
      <legend className="caps float-left mb-1 w-full text-xl text-navy">{title}</legend>
      {intro && <p className="clear-both mb-4 text-[0.9375rem]">{intro}</p>}
      <div className="clear-both space-y-5 pt-2">{children}</div>
    </fieldset>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-cloud px-4 py-6 text-center">{children}</p>;
}

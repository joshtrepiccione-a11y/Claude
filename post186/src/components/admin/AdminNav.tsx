"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { Building, Calendar, ChevronDown, ChevronUp, Gear, Home, Mail, Menu, User, Users } from "@/components/icons";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: Home, exact: true },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/bookings", label: "Hall Bookings", icon: Building, badge: "pending" as const },
  { href: "/admin/officers", label: "Officers", icon: Users },
  { href: "/admin/messages", label: "Messages", icon: Mail, badge: "unread" as const },
  { href: "/admin/settings", label: "Settings", icon: Gear },
  { href: "/admin/account", label: "Account", icon: User },
];

/**
 * Admin navigation: a sidebar on large screens; on phones and tablets a single
 * "Menu" bar that opens the same list, so nothing is hidden off the edge.
 */
export function AdminNav({ pending, unread }: { pending: number; unread: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const counts = { pending, unread };

  const isActive = (item: (typeof ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const current = ITEMS.find(isActive) ?? ITEMS[0];
  const waiting = pending + unread;

  return (
    <nav aria-label="Admin" className="border-b border-line bg-white lg:border-b-0 lg:border-r">
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left font-semibold text-navy sm:px-6 lg:hidden"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-2.5">
          <Menu size={20} />
          Menu
          <span className="font-normal text-body">· {current.label}</span>
        </span>
        <span className="flex items-center gap-2">
          {waiting > 0 && !open && (
            <span className="badge badge-solid !bg-flag">
              {waiting}
              <span className="sr-only"> waiting for you</span>
            </span>
          )}
          {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>

      <ul
        id={listId}
        className={`${open ? "block" : "hidden"} border-t border-line p-2 sm:px-4 lg:block lg:border-t-0 lg:p-3`}
      >
        {ITEMS.map((item) => {
          const { href, label, icon: Icon, badge } = item;
          const active = isActive(item);
          const count = badge ? counts[badge] : 0;
          return (
            <li key={href} className="mb-0.5">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`relative flex min-h-11 items-center gap-2.5 rounded-md px-3 py-2 font-semibold ${
                  active ? "bg-navy text-white" : "text-navy hover:bg-fog"
                }`}
              >
                <Icon size={19} />
                {label}
                {count > 0 && (
                  <span className={`badge ml-auto ${active ? "bg-white text-navy" : "badge-solid !bg-flag"}`}>
                    {count}
                    <span className="sr-only"> {badge === "pending" ? "waiting for review" : "unread"}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

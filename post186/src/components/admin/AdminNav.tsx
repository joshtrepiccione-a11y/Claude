"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, Calendar, Gear, Home, Mail, User, Users } from "@/components/icons";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: Home, exact: true },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/bookings", label: "Hall Bookings", icon: Building, badge: "pending" as const },
  { href: "/admin/officers", label: "Officers", icon: Users },
  { href: "/admin/messages", label: "Messages", icon: Mail, badge: "unread" as const },
  { href: "/admin/settings", label: "Settings", icon: Gear },
  { href: "/admin/account", label: "Account", icon: User },
];

export function AdminNav({ pending, unread }: { pending: number; unread: number }) {
  const pathname = usePathname();
  const counts = { pending, unread };

  return (
    <nav aria-label="Admin" className="border-b border-line bg-white lg:border-b-0 lg:border-r">
      <ul className="flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-3">
        {ITEMS.map(({ href, label, icon: Icon, exact, badge }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          const count = badge ? counts[badge] : 0;
          return (
            <li key={href} className="flex-none">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 font-semibold ${
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

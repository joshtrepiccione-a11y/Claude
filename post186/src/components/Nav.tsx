"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/site";

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const listId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <nav aria-label="Main">
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{open ? "\u2715" : "\u2630"}</span>
        Menu
      </button>
      <ul id={listId} className="nav-list" hidden={!open}>
        {NAV_LINKS.map((item) => {
          const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={current ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

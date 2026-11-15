"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Menu, Phone, X } from "@/components/icons";
import { NAV_ITEMS } from "./nav-items";

type NavProps = {
  phone: string;
  phoneHref: string;
  directionsHref: string;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Main navigation: a row of links on large screens, a menu button on small ones. */
export function NavView({ pathname, ...props }: NavProps & { pathname: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <nav aria-label="Main" className="hidden lg:block">
        <ul className="flex items-center gap-2 xl:gap-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`caps relative block px-4 py-3 text-lg text-white ${
                    active
                      ? "after:absolute after:inset-x-4 after:bottom-1 after:h-[3px] after:bg-flag"
                      : "hover:underline hover:decoration-2 hover:underline-offset-8"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        ref={buttonRef}
        type="button"
        className="caps -mr-2 inline-flex min-h-11 items-center gap-2 rounded px-3 text-base text-white lg:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={24} /> : <Menu size={24} />}
        <span>{open ? "Close" : "Menu"}</span>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 border-t border-white/15 bg-navy-deep shadow-xl lg:hidden"
      >
        <nav aria-label="Main" className="container-page py-3">
          <ul>
            {[{ href: "/", label: "Home" }, ...NAV_ITEMS].map((item) => {
              const active = item.href === "/" ? pathname === "/" : isActive(pathname, item.href);
              return (
                <li key={item.href} className="border-b border-white/10">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={close}
                    className={`caps flex min-h-12 items-center py-3 text-xl text-white ${
                      active ? "border-l-4 border-flag pl-3" : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href="/hall-rental#request" className="btn btn-red mt-4 w-full" onClick={close}>
            Rent the Hall
          </Link>
          <div className="mt-3 flex flex-col gap-1 pb-2 text-white">
            {props.phone && (
              <a href={props.phoneHref} className="flex min-h-11 items-center gap-2 font-semibold">
                <Phone size={18} /> {props.phone}
              </a>
            )}
            <a href={props.directionsHref} className="flex min-h-11 items-center gap-2 font-semibold" rel="noopener">
              <MapPin size={18} /> Get directions
            </a>
          </div>
        </nav>
      </div>
    </>
  );
}

export function SiteNav(props: NavProps) {
  const pathname = usePathname();
  return <NavView pathname={pathname} {...props} />;
}

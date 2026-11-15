import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "@/components/icons";
import { StarField } from "./FlagArt";

/** The navy banner at the top of every interior page. */
export function PageHeader({
  title,
  lead,
  crumbs = [],
  children,
}: {
  title: string;
  lead?: ReactNode;
  crumbs?: { href: string; label: string }[];
  children?: ReactNode;
}) {
  return (
    <div className="flag-backdrop relative overflow-hidden text-white">
      <StarField className="pointer-events-none absolute -right-10 top-0 hidden h-full w-[34rem] opacity-60 md:block" />
      <div className="container-page relative py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1 text-[0.9375rem] text-white/85">
            <li>
              <Link href="/" className="hover:text-white hover:underline">
                Home
              </Link>
            </li>
            {crumbs.map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-1">
                <ChevronRight size={15} className="opacity-70" />
                <Link href={crumb.href} className="hover:text-white hover:underline">
                  {crumb.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-1" aria-current="page">
              <ChevronRight size={15} className="opacity-70" />
              <span className="font-semibold text-white">{title}</span>
            </li>
          </ol>
        </nav>
        <h1 className="max-w-4xl text-white">{title}</h1>
        {lead && <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/90 md:text-xl">{lead}</p>}
        {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
      </div>
      <div aria-hidden="true" className="stripe-rule" />
    </div>
  );
}

/** A centered section heading with an optional lead paragraph. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  tone = "light",
  id,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  id?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow && <p className={`eyebrow mb-2 ${dark ? "!text-white/80" : ""}`}>{eyebrow}</p>}
      <h2 id={id} className={dark ? "text-white" : ""}>
        {title}
      </h2>
      {lead && <p className={`mt-4 text-lg ${dark ? "text-white/90" : ""}`}>{lead}</p>}
    </div>
  );
}

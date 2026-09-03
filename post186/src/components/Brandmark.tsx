import fs from "node:fs";
import path from "node:path";
import { SITE } from "@/lib/site";

/**
 * Renders an official American Legion brandmark file from /public/brand, untouched.
 * If the file has not been supplied yet, renders the Post name as plain Inter text instead.
 * Nothing here draws, recreates, or styles the mark; the wrapper only reserves clear space.
 */
export const BRANDMARK_FILES = {
  primary: "american-legion-brandmark-primary-rgb.png",
  white: "american-legion-brandmark-secondary-white.png",
  black: "american-legion-brandmark-secondary-black.png",
  complex: "american-legion-brandmark-complex-background-rgb.png",
} as const;

export type BrandmarkVariant = keyof typeof BRANDMARK_FILES;

export function brandmarkAvailable(variant: BrandmarkVariant): boolean {
  return fs.existsSync(path.join(process.cwd(), "public", "brand", BRANDMARK_FILES[variant]));
}

export function Brandmark({
  variant = "primary",
  size = "md",
  withPostName = true,
}: {
  variant?: BrandmarkVariant;
  size?: "sm" | "md";
  withPostName?: boolean;
}) {
  const available = brandmarkAvailable(variant);
  if (!available) {
    return (
      <span className="post-name">
        {SITE.name}
        <small>{SITE.city}, {SITE.region}</small>
      </span>
    );
  }
  return (
    <>
      <span className={`brandmark${size === "sm" ? " brandmark--sm" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/brand/${BRANDMARK_FILES[variant]}`} alt="The American Legion" />
      </span>
      {withPostName ? (
        <span className="post-name">
          {SITE.name}
          <small>{SITE.city}, {SITE.region}</small>
        </span>
      ) : null}
    </>
  );
}

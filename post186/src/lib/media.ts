import manifest from "@/generated/media.json";

/**
 * Images found in /public when the site was last built.
 * See scripts/media-manifest.mjs and the README for where to put files.
 */
export type Media = {
  brand: { onLight: string | null; onDark: string | null };
  hero: string | null;
  hall: string[];
};

export const media = manifest as Media;

/** "/photos/hall/front-entrance.jpg" → "Front entrance" */
export function altFromPath(src: string): string {
  const file = src.split("/").pop() ?? "";
  const words = file
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^\d+[-_ ]*/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Photo";
}

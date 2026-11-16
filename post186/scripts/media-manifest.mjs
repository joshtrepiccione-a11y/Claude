#!/usr/bin/env node
/**
 * Lists the images an officer has dropped into /public so pages can show them
 * without anyone editing code. Runs automatically before `npm run dev` and
 * `npm run build`.
 *
 *   public/brand/brandmark.(svg|png|webp)        official mark for light backgrounds
 *   public/brand/brandmark-white.(svg|png|webp)  official mark for dark backgrounds
 *   public/photos/hero.(jpg|png|webp)            optional home-page photo
 *   public/photos/hall/*                         hall rental photo gallery
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;
const MARK = ["svg", "png", "webp"];

const firstExisting = (dir, base, extensions) => {
  for (const ext of extensions) {
    if (existsSync(path.join(publicDir, dir, `${base}.${ext}`))) return `/${dir}/${base}.${ext}`;
  }
  return null;
};

const list = (dir) => {
  const full = path.join(publicDir, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full)
    .filter((file) => IMAGE.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => `/${dir}/${file}`);
};

const manifest = {
  brand: {
    onLight: firstExisting("brand", "brandmark", MARK),
    onDark: firstExisting("brand", "brandmark-white", MARK),
  },
  hero: firstExisting("photos", "hero", ["jpg", "jpeg", "png", "webp"]),
  hall: list("photos/hall"),
};

const outDir = path.join(root, "src", "generated");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "media.json"), JSON.stringify(manifest, null, 2) + "\n");

const count = manifest.hall.length + (manifest.hero ? 1 : 0);
console.log(
  `media: ${manifest.brand.onDark || manifest.brand.onLight ? "official brandmark found" : "no brandmark file (using text lockup)"}, ${count} photo(s)`,
);

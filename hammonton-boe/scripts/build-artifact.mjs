#!/usr/bin/env node
// Fold `dist/` into ONE self-contained HTML file for publishing as an Artifact.
//
//     npm run build && node scripts/build-artifact.mjs [out.html]
//
// The artifact host applies a strict CSP that blocks every external request,
// so nothing may be fetched at runtime: the CSS and the module bundle are
// inlined, and the precinct GeoJSON the app normally fetches is embedded and
// served back by a tiny `fetch` shim. Street basemap tiles are the one thing
// that cannot be inlined; Leaflet draws the districts on a plain ground and
// the banner says so rather than leaving a reader wondering.
//
// This exists as a script, not a sequence of manual edits, so republishing
// after a data or UI change is one command and cannot drift from `dist/`.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(APP, "dist");
const out = resolve(process.argv[2] ?? join(APP, "hammonton-boe-preview.html"));

const one = (dir, ext) => {
  const hits = readdirSync(dir).filter((f) => f.endsWith(ext));
  if (hits.length !== 1) {
    throw new Error(`expected exactly one ${ext} in ${dir}, found ${hits.length}`);
  }
  return join(dir, hits[0]);
};

const assets = join(DIST, "assets");
const css = readFileSync(one(assets, ".css"), "utf8");
const js = readFileSync(one(assets, ".js"), "utf8");
const geojson = readFileSync(
  join(APP, "public", "data", "hammonton_boe_precincts.geojson"),
  "utf8",
);

// Title comes from the built index.html so it cannot drift from the app.
const index = readFileSync(join(DIST, "index.html"), "utf8");
const title = (index.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim();
if (!title) throw new Error("no <title> in dist/index.html");

// </script> inside embedded JSON would close the tag early.
const safe = geojson.replace(/<\//g, "<\\/");

const html = `<meta charset="utf-8">
<title>${title}</title>
<style>
${css}

.preview-note{background:#0e1020;color:#ccd0e4;font:400 12px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  padding:8px 16px;text-align:center;border-bottom:1px solid #252a45}
.preview-note strong{color:#fff;font-weight:600}
</style>
<div class="preview-note">
  Static preview of the built app. Street basemap tiles are blocked by the preview sandbox, so districts draw on a plain ground &mdash;
  <strong>every figure, control, map fill and export below is live and identical to the deployed build.</strong>
</div>
<div id="root"></div>
<script>
window.__BOE_DATA__ = ${safe};
const _fetch = window.fetch ? window.fetch.bind(window) : null;
window.fetch = function (input, init) {
  const url = typeof input === "string" ? input : (input && input.url) || "";
  if (url.indexOf("hammonton_boe_precincts.geojson") !== -1) {
    return Promise.resolve(new Response(JSON.stringify(window.__BOE_DATA__), {
      status: 200, headers: { "Content-Type": "application/json" },
    }));
  }
  return _fetch ? _fetch(input, init) : Promise.reject(new Error("offline"));
};
</script>
<script type="module">
${js}
</script>
`;

writeFileSync(out, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`wrote ${out} (${kb} KB)`);

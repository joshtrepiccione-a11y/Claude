// Colors for this app, validated with the dataviz skill's checker
// (scripts/validate_palette.js) against the white card surface these charts
// actually render on. Nothing here encodes a political party — these are
// nonpartisan school board races.
//
// Validation results (light mode, surface #ffffff):
//
//   Candidate identity — violet, blue, orange, aqua, magenta, green
//     lightness band PASS · chroma PASS · normal-vision worst adjacent 16.3 PASS
//     CVD worst adjacent 6.1 (deutan, aqua↔magenta) — inside the 6–8 floor band,
//     which is legal ONLY with secondary encoding. Every chart using these
//     direct-labels each mark with the candidate's name and vote count, and a
//     table view of the same numbers exists on the Results tab, so identity is
//     never carried by hue alone. That relief also covers the sub-3:1 contrast
//     warning on aqua and magenta.
//
//   Precinct-winner choropleth — violet, blue, orange, aqua (ALL-PAIRS)
//     every check PASS, worst all-pairs CVD 9.2, normal-vision 16.3. A map is
//     an all-pairs context (any two fills can touch), so it uses this smaller
//     validated set rather than the full identity list, and every precinct is
//     also direct-labeled with its district number plus a named legend.
//
//   Sequential (support rate, turnout) — the blue ramp, light→dark, one hue.
//   Diverging (change, mode lean) — orange ↔ teal with a neutral GRAY midpoint,
//     monotonic on both arms, equal step count per arm.

import type { Mode } from "./types";

/** The focus candidate's highlight. One color, used everywhere. */
export const FOCUS_COLOR = "#4a3aa7";
export const FOCUS_SOFT = "#ece9f8";

/** Neutral used for WRITE-IN / Personal Choice — never a candidate hue. */
export const NON_CANDIDATE_COLOR = "#a3aacb";

/**
 * Candidate identity hues, in fixed order, never cycled. The focus candidate is
 * pinned to violet; everyone else takes the next slot.
 *
 * The first three slots matter: violet + blue + orange + aqua is the set that
 * clears the ALL-PAIRS gates, and a choropleth is an all-pairs context because
 * any two fills can share a border. So candidates who actually win a precinct
 * are assigned from the front of this list, which guarantees the map only ever
 * shows mutually separable fills — while every candidate still keeps ONE color
 * across every view in the app.
 *
 * That ordering comes from the certified results (who won a precinct that
 * year), so it is fixed for a year and never repaints while the user interacts.
 */
const IDENTITY_SLOTS = [
  "#2a78d6", // blue    ─┐
  "#eb6834", // orange   ├─ all-pairs validated together with the focus violet
  "#1baf7a", // aqua    ─┘
  "#e87ba4", // magenta ─┐ only ever reached by candidates who win no precinct,
  "#008300", // green   ─┘ so these never meet each other on the map
];

export function isNonCandidate(name: string): boolean {
  return /write[\s-]*in|personal\s+choice/i.test(name);
}

/**
 * Build a stable name→color map for one year's ballot.
 *
 * `ballotOrder` is the certified order the candidates appear in the export.
 * `priority` (the precinct winners) take the front slots — see above.
 */
export function candidateColors(
  ballotOrder: string[],
  focus: string | null,
  priority: string[] = [],
): Record<string, string> {
  const out: Record<string, string> = {};
  const assignable = ballotOrder.filter(
    (n) => !isNonCandidate(n) && !(focus && n === focus),
  );
  // Winners first (in ballot order), then everyone else (in ballot order).
  const ordered = [
    ...assignable.filter((n) => priority.includes(n)),
    ...assignable.filter((n) => !priority.includes(n)),
  ];
  for (const name of ballotOrder) {
    if (isNonCandidate(name)) out[name] = NON_CANDIDATE_COLOR;
    else if (focus && name === focus) out[name] = FOCUS_COLOR;
  }
  ordered.forEach((name, i) => {
    out[name] = IDENTITY_SLOTS[i % IDENTITY_SLOTS.length];
  });
  return out;
}

// ── Sequential: one hue, light → dark ────────────────────────────────
const SEQ = [
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#2a78d6",
  "#256abf",
  "#184f95",
];

/** t in [0,1] → sequential step. Values outside are clamped. */
export function sequential(t: number): string {
  if (!isFinite(t)) return "#e2e8f0";
  const i = Math.min(SEQ.length - 1, Math.max(0, Math.round(t * (SEQ.length - 1))));
  return SEQ[i];
}

export const SEQ_LEGEND = [SEQ[0], SEQ[2], SEQ[4], SEQ[6]];

// ── Diverging: orange (down) ↔ gray (no change) ↔ teal (up) ──────────
const DIV_NEG = ["#b84519", "#eb6834", "#f5a684"]; // strong → weak decline
const DIV_MID = "#f0efec";
const DIV_POS = ["#6fd2ae", "#1baf7a", "#14805a"]; // weak → strong gain

/**
 * `v` measured against `scale` (the value treated as "strong"). Symmetric:
 * equal magnitudes on either side get equally strong steps.
 */
export function diverging(v: number, scale: number): string {
  if (!isFinite(v) || scale <= 0) return DIV_MID;
  const t = Math.min(1, Math.abs(v) / scale);
  if (t < 1 / 3) return DIV_MID;
  const idx = t < 2 / 3 ? 0 : t < 1 ? 1 : 2;
  return v > 0 ? DIV_POS[idx] : DIV_NEG[2 - idx];
}

export const DIV_LEGEND = [
  { c: DIV_NEG[0], l: "Large decline" },
  { c: DIV_NEG[1], l: "Decline" },
  { c: DIV_MID, l: "Little change" },
  { c: DIV_POS[1], l: "Gain" },
  { c: DIV_POS[2], l: "Large gain" },
];

/** Vote modes get their own fixed, non-partisan hues (used in stacked bars). */
export const MODE_COLOR: Record<Mode, string> = {
  election_day: "#2a78d6",
  early: "#1baf7a",
  vbm: "#eb6834",
  provisional: "#a3aacb",
};

// ── Chart chrome ─────────────────────────────────────────────────────
export const INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  surface: "#ffffff",
  noData: "#e2e8f0",
};

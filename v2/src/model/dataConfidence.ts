// Confidence taxonomy + helpers for badges, summary lines, and notes.

import type { ProvenanceLabel } from "../data/types";

export const PROV_DESCRIPTIONS: Record<ProvenanceLabel, string> = {
  real: "Certified per-precinct results, verbatim from the source of record.",
  "real-calibrated":
    "District aggregate matches certified totals exactly; per-precinct distribution is interpolated from 2024 presidential.",
  calibrated:
    "District aggregate matches certified totals exactly; per-precinct distribution is interpolated.",
  modeled: "Computed from documented rules and assumptions. No direct certification.",
  estimated: "Statistical estimate (e.g., ACS demographics areal-interpolated to precinct).",
  interpolated: "Spatial or temporal interpolation between known data points.",
  "user-adjusted": "Modified by scenario slider or override.",
  scenario: "Scenario projection; underlying source is preserved in parentheses.",
};

export const PROV_LABEL: Record<ProvenanceLabel, string> = {
  real: "Certified",
  "real-calibrated": "Calibrated",
  calibrated: "Calibrated",
  modeled: "Modeled",
  estimated: "Estimated",
  interpolated: "Interpolated",
  "user-adjusted": "User-adjusted",
  scenario: "Scenario",
};

export type RaceRating = "Safe" | "Lean" | "Tilt" | "Toss-up" | "Flipped";

/** Race-rating thresholds. Tunable. */
export function rateRace(
  scenarioMarginPct: number,
  baselineMarginPct: number,
): RaceRating {
  const flipped =
    Math.sign(scenarioMarginPct) !== Math.sign(baselineMarginPct) &&
    Math.abs(scenarioMarginPct) > 0.1 &&
    Math.abs(baselineMarginPct) > 0.1;
  if (flipped) return "Flipped";
  const a = Math.abs(scenarioMarginPct);
  if (a > 10) return "Safe";
  if (a > 5) return "Lean";
  if (a > 2) return "Tilt";
  return "Toss-up";
}

export const RATING_COLORS: Record<RaceRating, string> = {
  Safe: "#1f3b29",
  Lean: "#2e3b29",
  Tilt: "#3b3829",
  "Toss-up": "#3b2a1f",
  Flipped: "#2a1f3b",
};

export const RATING_TEXT_COLORS: Record<RaceRating, string> = {
  Safe: "#6ee787",
  Lean: "#c1e787",
  Tilt: "#f0d68e",
  "Toss-up": "#f0b86e",
  Flipped: "#b48cf2",
};

// ONE central map-layer config consumed by the Map controls, the Dashboard
// layer select, and the Leaflet map. Adding a layer here makes it appear
// everywhere — no scattering the layer list across five files.
//
// Map fills stay SEMANTIC: blue = Democrat advantage, red = Republican
// advantage, regardless of the campaign's red/gold branding.

import type { PrecinctRow } from "./types";

export type MapLayerId =
  | "margin"
  | "turnout-sensitivity"
  | "net-vote-opportunity"
  | "persuasion-opportunity"
  | "turnout-opportunity"
  | "vote-mode-priority"
  | "risk"
  | "recommended-action";

export interface LegendItem {
  c: string;
  l: string;
}

export interface MapLayerConfig {
  id: MapLayerId;
  label: string;
  shortLabel: string;
  description: string;
  colorFn: (row: PrecinctRow) => string;
  legend: LegendItem[];
}

// ── Color ramps ───────────────────────────────────────────────

// R-perspective margin: + = R (O'Donoghue) lead. Red = R, blue = D.
function marginColor(pp: number): string {
  if (pp >= 10) return "#7f1d1d";       // safe R
  if (pp >= 4) return "#c66266";        // lean R
  if (pp >= 1.5) return "#e6a1a4";      // tilt R
  if (pp >= -1.5) return "#e2e8f0";     // toss-up
  if (pp >= -4) return "#7aa7d9";       // tilt D
  if (pp >= -10) return "#3b6cb8";      // lean D
  return "#1e3a8a";                     // safe D
}

// Turnout sensitivity: 2023 R-margin% − 2020 R-margin%. Large positive =
// O'Donoghue's off-year cushion erodes badly under presidential turnout.
function sensitivityColor(delta: number): string {
  if (delta >= 20) return "#7f1d1d";    // cushion collapses (high erosion)
  if (delta >= 12) return "#b91c1c";
  if (delta >= 6) return "#f97316";
  if (delta >= 2) return "#fbbf24";
  if (delta >= -2) return "#e2e8f0";    // stable across turnout
  return "#16a34a";                     // O'Donoghue does BETTER at high turnout
}

// Net-vote opportunity (toward R). Red = R opportunity, blue = R erosion.
function opportunityColor(net: number): string {
  if (net >= 80) return "#7f1d1d";
  if (net >= 40) return "#b91c1c";
  if (net >= 15) return "#f87171";
  if (net >= -15) return "#e2e8f0";
  if (net >= -40) return "#7aa7d9";
  return "#1d4ed8";
}

function scoreColor(s: number): string {
  if (s >= 80) return "#5b21b6";
  if (s >= 60) return "#7c3aed";
  if (s >= 40) return "#a78bfa";
  if (s >= 20) return "#ddd6fe";
  return "#f5f3ff";
}

function modeColor(m: "ed" | "early" | "vbm"): string {
  return m === "vbm" ? "#7e57c2" : m === "early" ? "#3f8f63" : "#c08a2e";
}

function riskColor(r: PrecinctRow): string {
  const m = r.scenarioMarginPct;
  if (Math.abs(m) <= 1.5) return "#dc2626"; // high risk (could flip)
  if (Math.abs(m) <= 4) return "#f59e0b";   // medium
  return "#10b981";                          // low
}

function actionColor(a: PrecinctRow["action"]): string {
  switch (a) {
    case "VBM Ballot Chase": return "#7e57c2";
    case "Early Vote Push": return "#3f8f63";
    case "Door-to-Door Canvass": return "#3b6cb8";
    case "Persuasion Mail": return "#c08a2e";
    case "Digital Retargeting": return "#06b6d4";
    case "Candidate Visit": return "#db2777";
    case "Yard Sign Visibility": return "#0891b2";
    case "Volunteer Recruitment": return "#1e40af";
    case "Damage Reduction": return "#b91c1c";
    case "Monitor Only":
    default:
      return "#cbd5e1";
  }
}

// ── The single source of truth ────────────────────────────────

export const MAP_LAYERS: MapLayerConfig[] = [
  {
    id: "margin",
    label: "Sheriff Margin",
    shortLabel: "Margin",
    description: "Scenario margin per precinct (red = O'Donoghue lead, blue = Riggin lead).",
    colorFn: (r) => marginColor(r.scenarioMarginPct),
    legend: [
      { c: "#1e3a8a", l: "Safe Riggin (D)" },
      { c: "#3b6cb8", l: "Lean Riggin" },
      { c: "#e2e8f0", l: "Toss-Up" },
      { c: "#c66266", l: "Lean O'Donoghue" },
      { c: "#7f1d1d", l: "Safe O'Donoghue (R)" },
    ],
  },
  {
    id: "turnout-sensitivity",
    label: "Turnout Sensitivity",
    shortLabel: "Turnout Sens.",
    description:
      "2023 R-margin% minus 2020 R-margin%. Where positive (orange/red), O'Donoghue's off-year cushion erodes under presidential turnout. Green = he holds up or improves.",
    colorFn: (r) => sensitivityColor(r.turnoutSensitivity),
    legend: [
      { c: "#16a34a", l: "Holds / improves" },
      { c: "#e2e8f0", l: "Stable" },
      { c: "#fbbf24", l: "Mild erosion" },
      { c: "#f97316", l: "Erodes" },
      { c: "#7f1d1d", l: "Cushion collapses" },
    ],
  },
  {
    id: "net-vote-opportunity",
    label: "Net Vote Opportunity",
    shortLabel: "Net Vote Opp.",
    description: "Net votes toward O'Donoghue (R) under the active scenario vs. baseline.",
    colorFn: (r) => opportunityColor(r.netVoteOpportunity),
    legend: [
      { c: "#1d4ed8", l: "R erosion" },
      { c: "#e2e8f0", l: "Neutral" },
      { c: "#7f1d1d", l: "R opportunity" },
    ],
  },
  {
    id: "persuasion-opportunity",
    label: "Persuasion Opportunity",
    shortLabel: "Persuasion",
    description: "Competitiveness-weighted persuasion value (swing precincts score highest).",
    colorFn: (r) => scoreColor(r.persuasionScore),
    legend: [
      { c: "#f5f3ff", l: "Low" },
      { c: "#a78bfa", l: "Medium" },
      { c: "#5b21b6", l: "High" },
    ],
  },
  {
    id: "turnout-opportunity",
    label: "Turnout Opportunity",
    shortLabel: "Turnout",
    description: "Base-turnout value to O'Donoghue (highest where R already leads).",
    colorFn: (r) => scoreColor(r.turnoutScore),
    legend: [
      { c: "#f5f3ff", l: "Low" },
      { c: "#a78bfa", l: "Medium" },
      { c: "#5b21b6", l: "High" },
    ],
  },
  {
    id: "vote-mode-priority",
    label: "Vote Mode Priority",
    shortLabel: "Vote Mode",
    description: "Highest-leverage vote mode per precinct.",
    colorFn: (r) => modeColor(r.voteModePriority),
    legend: [
      { c: "#c08a2e", l: "Election Day" },
      { c: "#3f8f63", l: "Early Vote" },
      { c: "#7e57c2", l: "Vote by Mail" },
    ],
  },
  {
    id: "risk",
    label: "Risk",
    shortLabel: "Risk",
    description: "Margin fragility — precincts that could flip under the active scenario.",
    colorFn: (r) => riskColor(r),
    legend: [
      { c: "#10b981", l: "Low risk" },
      { c: "#f59e0b", l: "Medium" },
      { c: "#dc2626", l: "High (could flip)" },
    ],
  },
  {
    id: "recommended-action",
    label: "Recommended Action",
    shortLabel: "Action",
    description: "Suggested program per precinct under the active scenario.",
    colorFn: (r) => actionColor(r.action),
    legend: [
      { c: "#7e57c2", l: "VBM Ballot Chase" },
      { c: "#3f8f63", l: "Early Vote Push" },
      { c: "#3b6cb8", l: "Door-to-Door Canvass" },
      { c: "#c08a2e", l: "Persuasion Mail" },
      { c: "#b91c1c", l: "Damage Reduction" },
      { c: "#cbd5e1", l: "Monitor Only" },
    ],
  },
];

export const MAP_LAYER_BY_ID: Record<MapLayerId, MapLayerConfig> =
  Object.fromEntries(MAP_LAYERS.map((l) => [l.id, l])) as Record<MapLayerId, MapLayerConfig>;

export function colorForRow(row: PrecinctRow, layer: MapLayerId): string {
  return MAP_LAYER_BY_ID[layer].colorFn(row);
}

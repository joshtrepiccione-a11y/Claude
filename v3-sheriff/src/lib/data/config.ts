// Contest configuration for the 2026 Atlantic County Sheriff race.
//
// Built FOR the Republican: incumbent Joseph "Tokyo Joe" O'Donoghue (R)
// vs. challenger Sean Riggin (D). County-wide, 3-year term, Election Day
// November 3, 2026. The model takes the REPUBLICAN perspective throughout.

export type Party = "D" | "R";
export type ConfidenceLabel =
  | "Certified"
  | "Calibrated"
  | "Modeled"
  | "Estimated"
  | "Scenario"
  | "Derived";

export type CandidateSlot = "sheriffD" | "sheriffR";

export interface CandidateConfig {
  id: CandidateSlot;
  party: Party;
  label: string;       // Full label shown in UI
  shortLabel: string;  // Compact label for charts
  isPlaceholder: boolean;
  isIncumbent: boolean;
  isClient: boolean;   // True for OUR candidate (the Republican).
}

// 2026 Atlantic County Sheriff: ONE county-wide seat, 3-year term.
export const CANDIDATES: CandidateConfig[] = [
  { id: "sheriffD", party: "D", label: "Sean Riggin (D)",        shortLabel: "Riggin",     isPlaceholder: false, isIncumbent: false, isClient: false },
  { id: "sheriffR", party: "R", label: "Joseph O'Donoghue (R)",  shortLabel: "O'Donoghue", isPlaceholder: false, isIncumbent: true,  isClient: true },
];

// The party this model is built for. Drives margin tone (good/bad) and the
// "votes to win/hold" framing throughout the app.
export const CLIENT_PARTY: Party = "R";

/**
 * Margin tone helper. Returns "good" when the leading party is OUR client
 * (the Republican), "bad" for the opponent, and "neutral" for a tie / null.
 */
export function marginTone(party: Party | null): "good" | "bad" | "neutral" {
  if (party == null) return "neutral";
  return party === CLIENT_PARTY ? "good" : "bad";
}

export const CONTEST = {
  state: "NJ",
  office: "Sheriff",
  county: "Atlantic",
  year: 2026,
  seats: 1,
  termYears: 3,
  electionType: "General",
  electionDay: "November 3, 2026",
  displayName: "Atlantic County Sheriff",
  subtitle: "2026 Sheriff Scenario Model — O'Donoghue (R) vs. Riggin (D)",
  clientName: "Joseph “Tokyo Joe” O'Donoghue",
  // The three certified county results this model is calibrated against.
  // (See the `calibration` object in the GeoJSON for the same figures.)
  certified: {
    sheriff2020: { d: 73802, r: 61777, dCandidate: "Democrat (2020)",   rCandidate: "O'Donoghue (R)" },
    sheriff2023: { d: 27670, r: 29826, dCandidate: "Democrat (2023)",   rCandidate: "O'Donoghue (R)" },
    gov2025:     { d: 51201, r: 47603, dCandidate: "Sherrill (D)",      rCandidate: "Ciattarelli (R)" },
  },
};

// All 23 Atlantic County municipalities. The Sheriff race is county-wide, so
// every municipality is in play. Names match the GeoJSON `municipality` field.
export const ATLANTIC_MUNICIPALITIES: Array<{ name: string; county: "Atlantic" }> = [
  { name: "Absecon City", county: "Atlantic" },
  { name: "Atlantic City", county: "Atlantic" },
  { name: "Brigantine City", county: "Atlantic" },
  { name: "Buena Borough", county: "Atlantic" },
  { name: "Buena Vista Township", county: "Atlantic" },
  { name: "Corbin City", county: "Atlantic" },
  { name: "Egg Harbor City", county: "Atlantic" },
  { name: "Egg Harbor Township", county: "Atlantic" },
  { name: "Estell Manor City", county: "Atlantic" },
  { name: "Folsom Borough", county: "Atlantic" },
  { name: "Galloway Township", county: "Atlantic" },
  { name: "Hamilton Township", county: "Atlantic" },
  { name: "Hammonton Town", county: "Atlantic" },
  { name: "Linwood City", county: "Atlantic" },
  { name: "Longport Borough", county: "Atlantic" },
  { name: "Margate City", county: "Atlantic" },
  { name: "Mullica Township", county: "Atlantic" },
  { name: "Northfield City", county: "Atlantic" },
  { name: "Pleasantville City", county: "Atlantic" },
  { name: "Port Republic City", county: "Atlantic" },
  { name: "Somers Point City", county: "Atlantic" },
  { name: "Ventnor City", county: "Atlantic" },
  { name: "Weymouth Township", county: "Atlantic" },
];

const MUNI_SET = new Set(ATLANTIC_MUNICIPALITIES.map((m) => m.name.toLowerCase()));

/** True if the municipality is part of Atlantic County. Case-insensitive. */
export function isAtlanticMunicipality(name: string): boolean {
  if (!name) return false;
  return MUNI_SET.has(name.trim().toLowerCase());
}

// Thresholds & scoring constants. Centralised so they can be reviewed.
export const THRESHOLDS = {
  // Margin band cutoffs (percentage points) for map coloring & classification.
  marginSafe: 10,
  marginLean: 4,
  marginTossUp: 1.5,
  // Persuasion-score weighting: how competitive a precinct must be to qualify.
  persuasionMaxMarginPct: 8,
  // Net-vote-opportunity floor for the target list.
  minNetVoteOpportunity: 5,
};

export const VOTE_MODES = [
  { id: "ed", label: "Election Day", short: "ED" },
  { id: "early", label: "Early Vote", short: "EV" },
  { id: "vbm", label: "Vote by Mail", short: "VBM" },
] as const;

export type VoteModeId = (typeof VOTE_MODES)[number]["id"];

export const STRATEGIC_CATEGORIES = [
  "Base Expansion",
  "Persuasion",
  "Defensive Hold",
  "Opposition Stronghold",
  "Toss-Up",
  "Low Priority",
] as const;
export type StrategicCategory = (typeof STRATEGIC_CATEGORIES)[number];

export const RECOMMENDED_ACTIONS = [
  "VBM Ballot Chase",
  "Early Vote Push",
  "Door-to-Door Canvass",
  "Persuasion Mail",
  "Digital Retargeting",
  "Candidate Visit",
  "Yard Sign Visibility",
  "Volunteer Recruitment",
  "Damage Reduction",
  "Monitor Only",
] as const;
export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];

// ─────────────────────────────────────────────────────────────
// Baseline selector + turnout-environment knob
// ─────────────────────────────────────────────────────────────

export type BaselineId = "sheriff2023" | "sheriff2020" | "projected2026";

export const BASELINES: Array<{
  id: BaselineId;
  label: string;
  short: string;
  description: string;
}> = [
  {
    id: "sheriff2023",
    label: "2023 Sheriff — “Hold” baseline",
    short: "2023 Hold",
    description:
      "O'Donoghue's off-year win. Low-turnout electorate that favors the incumbent Republican. Default baseline.",
  },
  {
    id: "sheriff2020",
    label: "2020 Sheriff — “Threat” baseline",
    short: "2020 Threat",
    description:
      "Presidential-year turnout. The high-turnout electorate that O'Donoghue lost — the stress case for 2026.",
  },
  {
    id: "projected2026",
    label: "Projected 2026 — Midterm blend",
    short: "2026 Blend",
    description:
      "A per-precinct interpolation between the 2023 and 2020 layers driven by a turnout-environment factor. A midterm sits between the two.",
  },
];

export const DEFAULT_BASELINE_ID: BaselineId = "sheriff2023";
export const DEFAULT_T_ENV = 0.5;

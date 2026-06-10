// Contest configuration for the 2026 Atlantic County Clerk race.
// Candidate names reflect the announced 2026 general-election matchup:
// challenger Lisa Bender (D) vs. incumbent Joseph J. Giralo (R).

export type Party = "D" | "R";
export type ConfidenceLabel =
  | "Certified"
  | "Calibrated"
  | "Modeled"
  | "Estimated"
  | "Scenario"
  | "Derived";

export type CandidateSlot = "clerkD" | "clerkR";

export interface CandidateConfig {
  id: CandidateSlot;
  party: Party;
  label: string;       // Full label shown in UI
  shortLabel: string;  // Compact label for charts
  isPlaceholder: boolean;
  isIncumbent: boolean;
}

// 2026 Atlantic County Clerk: ONE county-wide seat, 5-year term.
export const CANDIDATES: CandidateConfig[] = [
  { id: "clerkD", party: "D", label: "Lisa Bender (D)",        shortLabel: "Bender", isPlaceholder: false, isIncumbent: false },
  { id: "clerkR", party: "R", label: "Joseph J. Giralo (R)",   shortLabel: "Giralo", isPlaceholder: false, isIncumbent: true },
];

export const CONTEST = {
  state: "NJ",
  office: "County Clerk",
  county: "Atlantic",
  year: 2026,
  seats: 1,
  termYears: 5,
  electionType: "General",
  displayName: "Atlantic County Clerk",
  subtitle: "2026 County Clerk Scenario Model — Bender (D) vs. Giralo (R)",
  // Certified 2021 baseline this model is calibrated to.
  baseline: {
    cycle: 2021,
    dCandidate: "Lisa Jiampetti (D)",
    rCandidate: "Joseph J. Giralo (R)",
    dVotes: 34930,
    rVotes: 43346,
  },
};

// All 23 Atlantic County municipalities. The Clerk race is county-wide, so
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

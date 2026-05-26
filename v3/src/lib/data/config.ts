// District configuration for NJ Legislative District 8.
// Candidate names are intentionally placeholders unless confirmed by source data.
// Update `CANDIDATES` only when you have certified candidate filings.

export type Party = "D" | "R";
export type ConfidenceLabel =
  | "Certified"
  | "Modeled"
  | "Estimated"
  | "Scenario"
  | "Derived";

export type CandidateSlot = "senD" | "senR" | "dA" | "dB" | "rA" | "rB";

export interface CandidateConfig {
  id: CandidateSlot;
  party: Party;
  race: "senate" | "assembly";
  label: string;       // Placeholder label shown in UI
  shortLabel: string;  // Compact label for charts
  isPlaceholder: boolean;
}

// 2027 LD8 ballot: ONE Senate seat (single-seat race) plus TWO Assembly seats
// (two-vote slate race). All names are placeholders until certified filings
// are imported — flip `isPlaceholder` to false then.
export const CANDIDATES: CandidateConfig[] = [
  { id: "senD", party: "D", race: "senate",   label: "Democratic Senate Candidate", shortLabel: "D-Sen", isPlaceholder: true },
  { id: "senR", party: "R", race: "senate",   label: "Republican Senate Candidate", shortLabel: "R-Sen", isPlaceholder: true },
  { id: "dA",   party: "D", race: "assembly", label: "Democratic Candidate A",      shortLabel: "D-A",   isPlaceholder: true },
  { id: "dB",   party: "D", race: "assembly", label: "Democratic Candidate B",      shortLabel: "D-B",   isPlaceholder: true },
  { id: "rA",   party: "R", race: "assembly", label: "Republican Candidate A",      shortLabel: "R-A",   isPlaceholder: true },
  { id: "rB",   party: "R", race: "assembly", label: "Republican Candidate B",      shortLabel: "R-B",   isPlaceholder: true },
];

// The 2027 LD8 general election fills three seats total:
//   - 1 State Senate seat (4-year term, 2028-2031)
//   - 2 General Assembly seats (2-year terms, 2028-2029)
// Voters cast one Senate vote and up to two Assembly votes.
export const DISTRICT = {
  state: "NJ",
  chambers: ["State Senate", "General Assembly"] as const,
  number: 8,
  year: 2027,
  seats: { senate: 1, assembly: 2, total: 3 },
  electionType: "General",
  displayName: "NJ Legislative District 8",
  subtitle: "2027 State Senate & General Assembly Scenario Model",
  senateTermYears: 4,
  assemblyTermYears: 2,
};

// LD8 municipalities per official 2022 redistricting (Atlantic + Burlington).
// Used to validate uploaded data and reject precincts from outside the district.
// Names match the GeoJSON `municipality` field where possible.
export const LD8_MUNICIPALITIES: Array<{ name: string; county: "Atlantic" | "Burlington" }> = [
  { name: "Bass River Township", county: "Burlington" },
  { name: "Chesterfield Township", county: "Burlington" },
  { name: "Eastampton Township", county: "Burlington" },
  { name: "Evesham Township", county: "Burlington" },
  { name: "Hainesport Township", county: "Burlington" },
  { name: "Lumberton Township", county: "Burlington" },
  { name: "Mansfield Township", county: "Burlington" },
  { name: "Medford Township", county: "Burlington" },
  { name: "Medford Lakes Borough", county: "Burlington" },
  { name: "Mount Holly Township", county: "Burlington" },
  { name: "New Hanover Township", county: "Burlington" },
  { name: "Pemberton Borough", county: "Burlington" },
  { name: "Pemberton Township", county: "Burlington" },
  { name: "Shamong Township", county: "Burlington" },
  { name: "Southampton Township", county: "Burlington" },
  { name: "Springfield Township", county: "Burlington" },
  { name: "Tabernacle Township", county: "Burlington" },
  { name: "Washington Township", county: "Burlington" },
  { name: "Westampton Township", county: "Burlington" },
  { name: "Woodland Township", county: "Burlington" },
  { name: "Wrightstown Borough", county: "Burlington" },
  { name: "Egg Harbor City", county: "Atlantic" },
  { name: "Folsom Borough", county: "Atlantic" },
  { name: "Hammonton Town", county: "Atlantic" },
  { name: "Mullica Township", county: "Atlantic" },
];

const MUNI_SET = new Set(LD8_MUNICIPALITIES.map((m) => m.name.toLowerCase()));

/** True if the municipality is part of LD8. Case-insensitive. */
export function isLD8Municipality(name: string): boolean {
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

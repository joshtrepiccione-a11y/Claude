// Shapes of hammonton_boe_precincts.geojson, as written by
// scripts/build_hammonton_boe.py. Everything here is a certified figure or a
// direct arithmetic consequence of one.

export type Mode = "election_day" | "early" | "vbm" | "provisional";

export const MODES: Mode[] = ["election_day", "early", "vbm", "provisional"];

export const MODE_LABEL: Record<Mode, string> = {
  election_day: "Election Day",
  early: "Early Voting",
  vbm: "Vote by Mail",
  provisional: "Provisional",
};

export const MODE_SHORT: Record<Mode, string> = {
  election_day: "ED",
  early: "EV",
  vbm: "VBM",
  provisional: "Prov",
};

export type ModeCounts = Record<Mode, number>;

/**
 * What one district row covers. Distinct from `ModeCoverage`, which says how
 * much mode detail exists town-wide — the two answer different questions and
 * conflating them produced a wrong caveat.
 */
export type DistrictBasis =
  /** Every mode folded into the district total. */
  | "all-modes"
  /** Polling-place returns only; other modes reported town-wide. */
  | "election-day"
  /** The district row itself is broken out by mode. */
  | "by-mode";

/** How much vote-mode detail the county published for a given year. */
export type ModeCoverage =
  /** No split at all — every mode folded into the district totals. */
  | "none"
  /** Modes reported, but only as town-wide buckets (not per district). */
  | "town-level"
  /** Modes reported per district. */
  | "district";

export interface CandidateTownwide {
  name: string;
  /** False for WRITE-IN / Personal Choice — these never occupy a seat. */
  isCandidate: boolean;
  votes: number;
  modes: ModeCounts;
  /** Share of all votes cast in the contest that year. */
  share: number;
  rank: number | null;
  elected: boolean;
}

export interface TownLevelUnit {
  ballotsCast: number | null;
  /** Totals per candidate. NOT a per-mode breakdown. */
  votes: Record<string, number>;
  /** The unit's mode — only meaningful when `modeCount` is 1. */
  mode: Mode | null;
  /** How many modes this unit spans. >1 means its split is unknown. */
  modeCount?: number;
}

export interface YearTownwide {
  seatsUp: number;
  contestVotes: number;
  ballotsCast: number | null;
  candidates: CandidateTownwide[];
  elected: string[];
  /** True when more candidates tie into the seat range than there are seats. */
  seatTie: boolean;
  modeCoverage: ModeCoverage;
  /** What a DISTRICT row of this year actually contains. */
  districtBasis: DistrictBasis;
  fieldModes: ModeCounts;
  townLevelUnits: Record<string, TownLevelUnit>;
}

export interface PrecinctCandidate {
  votes: number;
  modes: ModeCounts;
  /** Share of votes cast in this precinct's returns. */
  share: number;
  /** Votes ÷ ballots cast. Null when the county published no ballot count. */
  supportRate: number | null;
}

export interface PrecinctYear {
  contestVotes: number;
  ballotsCast: number | null;
  /** Null when the precinct is TIED for first — see `winners` / `tied`. */
  winner: string | null;
  /** Everyone on the top vote count. One name normally, more when tied. */
  winners: string[];
  tied: boolean;
  winnerVotes: number | null;
  candidates: Record<string, PrecinctCandidate>;
}

export interface PrecinctProps {
  precinct: string;
  district: number;
  districtLabel: string;
  municipality: string;
  county: string;
  years: Record<string, PrecinctYear>;
}

export interface PrecinctComparability {
  directlyComparable: boolean;
  note: string;
  byYear: Record<string, ModeCoverage>;
  /**
   * Mirrors YearTownwide.districtBasis. Optional because geojson written
   * before this field existed lacks it — read `townwide[y].districtBasis`
   * where the year is in hand.
   */
  districtBasis?: Record<string, DistrictBasis>;
}

export interface DataMeta {
  title: string;
  source: string;
  municipality: string;
  years: string[];
  focusCandidateDefault: string | null;
  candidatesByYear: Record<string, string[]>;
  allCandidates: string[];
  townwide: Record<string, YearTownwide>;
  precinctComparability: PrecinctComparability;
  measured: string;
  warnings: string[];
}

export interface PrecinctFeature extends GeoJSON.Feature {
  properties: PrecinctProps;
}

export interface BoeData {
  meta: DataMeta;
  features: PrecinctFeature[];
  geojson: GeoJSON.FeatureCollection;
}

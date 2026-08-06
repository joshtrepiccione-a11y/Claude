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
  votes: Record<string, number>;
  mode: Mode | null;
}

export interface YearTownwide {
  seatsUp: number;
  contestVotes: number;
  ballotsCast: number | null;
  candidates: CandidateTownwide[];
  elected: string[];
  modeCoverage: ModeCoverage;
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
  winner: string | null;
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

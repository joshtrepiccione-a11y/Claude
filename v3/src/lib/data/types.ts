// Core data types for V3.
//
// These types describe an "Assembly-first" view of the race. They are derived
// from the upstream GeoJSON produced by scripts/build_ld8.py (whose schema is
// retained in v2/src/data/types.ts) but reshaped to make the Assembly slate
// the primary unit of analysis.

import type {
  ConfidenceLabel,
  RecommendedAction,
  StrategicCategory,
  VoteModeId,
} from "./config";

export type { VoteModeId, ConfidenceLabel, RecommendedAction, StrategicCategory } from "./config";

export type ModeBreakdown<T = number> = Record<VoteModeId, T>;

/** Baseline (untouched) values for a single precinct. */
export interface PrecinctBaseline {
  // Identity
  precinctId: string;       // Unique id (defaults to "precinct" name).
  precinctName: string;
  municipality: string;
  county: string;

  // Turnout & registration
  registeredVoters: number; // From upstream voter file (modeled if missing).
  baselineTurnout: number;  // Total Assembly ballots cast in baseline.

  // Baseline candidate votes
  demA: number;             // Democratic Candidate A votes
  demB: number;             // Democratic Candidate B votes
  repA: number;             // Republican Candidate A votes
  repB: number;             // Republican Candidate B votes
  other: number;

  // Vote-mode breakdown of total Assembly turnout (counts).
  modeTurnout: ModeBreakdown;

  // Vote-mode breakdown of D and R slate two-vote totals.
  // (Each voter may cast up to two Assembly votes.)
  modeDemSlate: ModeBreakdown;
  modeRepSlate: ModeBreakdown;

  // Provenance / data confidence for this precinct's baseline.
  baselineConfidence: ConfidenceLabel;
}

/** Result of running the active scenario for a single precinct. */
export interface PrecinctScenario {
  // Scaled candidate values after applying scenario assumptions.
  demA: number;
  demB: number;
  repA: number;
  repB: number;
  turnout: number;
  modeTurnout: ModeBreakdown;
  // Slate totals (sum of two candidates).
  demSlate: number;
  repSlate: number;
  // Mode-broken slate totals for the scenario.
  modeDemSlate: ModeBreakdown;
  modeRepSlate: ModeBreakdown;
}

/** Combined per-precinct row used by the UI. */
export interface PrecinctRow {
  baseline: PrecinctBaseline;
  scenario: PrecinctScenario;
  // Derived: scenario - baseline, in Democratic-net votes.
  netVoteSwingD: number;
  // Slate margins (D - R), percent of total slate votes.
  baselineSlateMarginPct: number;
  scenarioSlateMarginPct: number;
  // Strategic classification + recommendation under the current scenario.
  category: StrategicCategory;
  action: RecommendedAction;
  // Vote mode where the campaign should focus effort.
  voteModePriority: VoteModeId;
  // Net vote opportunity for the Democratic slate (positive = D gain available).
  netVoteOpportunity: number;
  // Component scores (0-100).
  persuasionScore: number;
  turnoutScore: number;
  vbmScore: number;
  earlyScore: number;
  edScore: number;
}

/** District-level rollup of an entire scenario. */
export interface DistrictResult {
  baseline: SlateTotals;
  scenario: SlateTotals;
  // Vote gap to elect ONE Assembly candidate (the higher D candidate over the
  // lower R candidate, if D is behind). Zero if already elected.
  votesNeededToElectOne: number;
  votesNeededToElectBoth: number;
  // Whether the active scenario already elects 1 / 2 D candidates.
  electsOne: boolean;
  electsBoth: boolean;
  // Net D-slate vote gain (scenario - baseline).
  netSlateGain: number;
  // Top finisher ordering and seat outcome under the scenario.
  finishers: CandidateFinisher[];
  seats: { D: number; R: number };
  // Margin separating the second-place winner from the third-place loser.
  secondSeatMargin: number;
}

export interface CandidateTotals {
  dA: number;
  dB: number;
  rA: number;
  rB: number;
  other: number;
}

export interface SlateTotals extends CandidateTotals {
  demSlate: number;
  repSlate: number;
  totalBallots: number;       // Number of voters who cast >=1 Assembly vote.
  totalSlateVotes: number;    // Sum of all candidate votes (~ 2 * ballots).
  slateMarginVotes: number;   // demSlate - repSlate
  slateMarginPct: number;     // slateMarginVotes / totalSlateVotes * 100
  modeDemSlate: ModeBreakdown;
  modeRepSlate: ModeBreakdown;
  modeTurnout: ModeBreakdown;
}

export interface CandidateFinisher {
  id: "dA" | "dB" | "rA" | "rB";
  party: Party;
  votes: number;
  rank: 1 | 2 | 3 | 4;
  seated: boolean;
}

type Party = "D" | "R";

/** The full scenario assumption set. */
export interface ScenarioAssumptions {
  // Districtwide turnout multiplier delta (e.g. +0.05 = +5% turnout).
  turnoutDelta: number;
  // Slate-level percentage-point swings (D adds, R subtracts of total share).
  demSlateSwing: number;
  repSlateSwing: number;
  // Candidate-specific overperformance (percent of own-slate added to that candidate).
  candidateAAdjustment: number;
  candidateBAdjustment: number;
  // Bullet voting and split ticket: 0..1 fractions
  bulletVoteRate: number;
  splitTicketRate: number;
  // Vote-mode share shifts: how much of total ballots come from each mode.
  // These add to 1 after normalisation; UI warns if user-supplied values don't.
  vbmShare: number;
  earlyShare: number;
  edShare: number;
  // Mode-specific margin swings (extra percentage points to D in each mode).
  vbmMarginSwing: number;
  earlyMarginSwing: number;
  edMarginSwing: number;
  // Optional overrides keyed by municipality or precinct id. Values are
  // additional percentage-point D swings applied on top of districtwide swing.
  municipalityOverrides: Record<string, number>;
  precinctOverrides: Record<string, number>;
}

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  mainLever: string;
  assumptions: ScenarioAssumptions;
}

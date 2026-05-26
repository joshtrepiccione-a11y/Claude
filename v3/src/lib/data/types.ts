// Core data types for V3.
//
// The 2027 LD8 ballot includes a Senate race (single-seat) AND an Assembly
// race (two-seat slate). These types model both, plus a combined ticket
// (0..3 D seats, 0..3 R seats) derived from the two race outcomes.

import type {
  ConfidenceLabel,
  RecommendedAction,
  StrategicCategory,
  VoteModeId,
} from "./config";

export type { VoteModeId, ConfidenceLabel, RecommendedAction, StrategicCategory } from "./config";

export type Party = "D" | "R";

export type ModeBreakdown<T = number> = Record<VoteModeId, T>;

// ─────────────────────────────────────────────────────────────
// Baseline (per precinct)
// ─────────────────────────────────────────────────────────────

/** Baseline (untouched) values for a single precinct, for BOTH races. */
export interface PrecinctBaseline {
  // Identity
  precinctId: string;
  precinctName: string;
  municipality: string;
  county: string;

  // Turnout & registration
  // Registered voters is approximated from turnout when no voter file is
  // attached — see `load.ts`. Tagged with `registrationConfidence`.
  registeredVoters: number;
  registrationConfidence: ConfidenceLabel;

  // ── Assembly race (two-vote slate; voters may bullet vote)
  baselineTurnout: number;          // Total ballots that cast >=1 Assembly vote.
  demA: number; demB: number;
  repA: number; repB: number;
  other: number;
  modeTurnout: ModeBreakdown;       // Assembly ballots per vote mode.
  modeDemSlate: ModeBreakdown;      // Sum of both D candidates per mode.
  modeRepSlate: ModeBreakdown;      // Sum of both R candidates per mode.

  // ── Senate race (single seat; one vote per voter)
  senTurnout: number;               // Ballots that cast a Senate vote.
  senD: number; senR: number; senOther: number;
  senModeTurnout: ModeBreakdown;
  senModeDem: ModeBreakdown;
  senModeRep: ModeBreakdown;

  // Provenance for each race's baseline.
  baselineConfidence: ConfidenceLabel;       // Assembly baseline confidence.
  senateBaselineConfidence: ConfidenceLabel; // Senate baseline confidence.
}

// ─────────────────────────────────────────────────────────────
// Scenario results (per precinct)
// ─────────────────────────────────────────────────────────────

export interface PrecinctScenarioAssembly {
  demA: number; demB: number;
  repA: number; repB: number;
  turnout: number;
  modeTurnout: ModeBreakdown;
  demSlate: number; repSlate: number;
  modeDemSlate: ModeBreakdown;
  modeRepSlate: ModeBreakdown;
}

export interface PrecinctScenarioSenate {
  d: number; r: number; other: number;
  turnout: number;
  modeTurnout: ModeBreakdown;
  modeDem: ModeBreakdown;
  modeRep: ModeBreakdown;
}

/** Combined per-precinct row used by the UI. */
export interface PrecinctRow {
  baseline: PrecinctBaseline;

  scenario: PrecinctScenarioAssembly;
  senateScenario: PrecinctScenarioSenate;

  // Assembly-derived fields (kept for back-compat with existing UI).
  netVoteSwingD: number;                    // Assembly slate D-net swing.
  baselineSlateMarginPct: number;           // Assembly baseline margin %.
  scenarioSlateMarginPct: number;           // Assembly scenario margin %.

  // Senate-derived fields.
  senateBaselineMarginPct: number;
  senateScenarioMarginPct: number;
  senateNetVoteSwingD: number;

  // Strategic classification + recommendation (Assembly-driven).
  category: StrategicCategory;
  action: RecommendedAction;
  voteModePriority: VoteModeId;
  netVoteOpportunity: number;               // Sum of Senate + Assembly D-net swing.

  // Component scores (0-100).
  persuasionScore: number;
  turnoutScore: number;
  vbmScore: number;
  earlyScore: number;
  edScore: number;
}

// ─────────────────────────────────────────────────────────────
// District rollups
// ─────────────────────────────────────────────────────────────

export interface CandidateTotalsAsm {
  dA: number; dB: number; rA: number; rB: number; other: number;
}

export interface AssemblyTotals extends CandidateTotalsAsm {
  demSlate: number;
  repSlate: number;
  totalBallots: number;       // Voters who cast >=1 Assembly vote.
  totalSlateVotes: number;    // Sum of all candidate votes (~ 2 * ballots).
  slateMarginVotes: number;   // demSlate - repSlate
  slateMarginPct: number;
  modeDemSlate: ModeBreakdown;
  modeRepSlate: ModeBreakdown;
  modeTurnout: ModeBreakdown;
}

export interface SenateTotals {
  d: number; r: number; other: number;
  totalBallots: number;
  marginVotes: number;        // d - r
  marginPct: number;
  modeDem: ModeBreakdown;
  modeRep: ModeBreakdown;
  modeTurnout: ModeBreakdown;
}

export interface CandidateFinisher {
  id: "dA" | "dB" | "rA" | "rB";
  party: Party;
  votes: number;
  rank: 1 | 2 | 3 | 4;
  seated: boolean;
}

/** Combined district-level result for both races + ticket rollup. */
export interface DistrictResult {
  // Assembly: existing surface preserved for back-compat with V3 consumers.
  baseline: AssemblyTotals;
  scenario: AssemblyTotals;
  votesNeededToElectOne: number;
  votesNeededToElectBoth: number;
  electsOne: boolean;
  electsBoth: boolean;
  netSlateGain: number;
  finishers: CandidateFinisher[];
  // Assembly-only seat count (0..2).
  seats: { D: number; R: number };
  secondSeatMargin: number;

  // Senate.
  senate: {
    baseline: SenateTotals;
    scenario: SenateTotals;
    votesNeededD: number;       // Votes D needs to win Senate. 0 if already winning.
    votesNeededR: number;       // Votes R needs (for the inverse view).
    electsD: boolean;
    netGain: number;            // scenario - baseline (D-net votes).
  };

  // Full ticket combines both races: each entry in 0..3.
  ticket: {
    D: number;          // 0..3 (Senate seat counts 1; Assembly each 1)
    R: number;          // 0..3
    senateWinner: Party | "tie";
    summary: string;    // e.g. "D 3 / R 0", "D 1 / R 2"
  };
}

// ─────────────────────────────────────────────────────────────
// Scenario assumptions
// ─────────────────────────────────────────────────────────────

/**
 * Scenario assumptions cover BOTH races. Senate and Assembly party swings
 * are split because the two races have different candidates and different
 * drop-off dynamics. Mode-margin swings (vbm/early/ed) are SHARED because
 * they describe campaign-wide field/mail effects that move all D candidates
 * the same direction in a given mode.
 */
export interface ScenarioAssumptions {
  // Districtwide turnout multiplier delta (e.g. +0.05 = +5% turnout).
  turnoutDelta: number;

  // Slate swings — Assembly (slate share, percentage points).
  asmDemSwing: number;
  asmRepSwing: number;
  // Slate swings — Senate (single-seat margin share, percentage points).
  senDemSwing: number;
  senRepSwing: number;

  // Candidate-specific overperformance (percent of own-slate added to that
  // candidate, Assembly only — Senate is single-seat).
  candidateAAdjustment: number;
  candidateBAdjustment: number;

  // Bullet voting / split ticket: Assembly-only behaviours.
  bulletVoteRate: number;
  splitTicketRate: number;

  // Vote-mode share overrides (apply to both races' turnout-mode mix).
  vbmShare: number;
  earlyShare: number;
  edShare: number;

  // Mode-specific margin swings (extra pp to D in each mode). Shared.
  vbmMarginSwing: number;
  earlyMarginSwing: number;
  edMarginSwing: number;

  // Optional muni/precinct overrides — extra pp D swing on top of district.
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

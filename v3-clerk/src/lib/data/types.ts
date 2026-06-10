// Core data types for the Atlantic County Clerk scenario model.
//
// The 2026 ballot has ONE county-wide Clerk seat, so the model is a
// single-seat race throughout — no slates, bullet voting, or tickets.

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

/** Baseline (untouched) values for a single precinct. */
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

  // Clerk race (single seat; one vote per voter)
  turnout: number;                  // Ballots that cast a Clerk vote.
  d: number; r: number; other: number;
  modeTurnout: ModeBreakdown;
  modeDem: ModeBreakdown;
  modeRep: ModeBreakdown;

  // Provenance for the baseline.
  baselineConfidence: ConfidenceLabel;
}

// ─────────────────────────────────────────────────────────────
// Scenario results (per precinct)
// ─────────────────────────────────────────────────────────────

export interface PrecinctScenario {
  d: number; r: number; other: number;
  turnout: number;
  modeTurnout: ModeBreakdown;
  modeDem: ModeBreakdown;
  modeRep: ModeBreakdown;
}

/** Per-precinct row used by the UI. */
export interface PrecinctRow {
  baseline: PrecinctBaseline;
  scenario: PrecinctScenario;

  baselineMarginPct: number;
  scenarioMarginPct: number;
  netVoteSwingD: number;            // (scenario D−R) − (baseline D−R)

  // Strategic classification + recommendation.
  category: StrategicCategory;
  action: RecommendedAction;
  voteModePriority: VoteModeId;
  netVoteOpportunity: number;       // Same as netVoteSwingD for this single race.

  // Component scores (0-100).
  persuasionScore: number;
  turnoutScore: number;
  vbmScore: number;
  earlyScore: number;
  edScore: number;
}

// ─────────────────────────────────────────────────────────────
// County rollups
// ─────────────────────────────────────────────────────────────

export interface RaceTotals {
  d: number; r: number; other: number;
  totalBallots: number;
  marginVotes: number;        // d - r
  marginPct: number;
  modeDem: ModeBreakdown;
  modeRep: ModeBreakdown;
  modeTurnout: ModeBreakdown;
}

/** County-level result for the Clerk race. */
export interface CountyResult {
  baseline: RaceTotals;
  scenario: RaceTotals;
  votesNeededD: number;       // Votes D needs to win. 0 if already winning.
  votesNeededR: number;       // Votes R needs (for the inverse view).
  electsD: boolean;
  winner: Party | "tie";
  netGain: number;            // scenario - baseline (D-net votes).
}

// ─────────────────────────────────────────────────────────────
// Scenario assumptions
// ─────────────────────────────────────────────────────────────

/**
 * Scenario assumptions for the single-seat Clerk race. Mode-margin swings
 * (vbm/early/ed) describe campaign field/mail effects within each vote mode;
 * `demSwing`/`repSwing` are county-wide share shifts.
 */
export interface ScenarioAssumptions {
  // County-wide turnout multiplier delta (e.g. +0.05 = +5% turnout).
  turnoutDelta: number;

  // County-wide swings (share, percentage points).
  demSwing: number;
  repSwing: number;

  // Vote-mode share overrides (target turnout-mode mix).
  vbmShare: number;
  earlyShare: number;
  edShare: number;

  // Mode-specific margin swings (extra pp to D in each mode).
  vbmMarginSwing: number;
  earlyMarginSwing: number;
  edMarginSwing: number;

  // Optional muni/precinct overrides — extra pp D swing on top of county.
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

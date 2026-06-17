// Core data types for the Atlantic County Sheriff scenario model.
//
// The 2026 ballot has ONE county-wide Sheriff seat, so the model is a
// single-seat race throughout — no slates, bullet voting, or tickets.
//
// What's new vs. the Clerk app: each precinct carries THREE historical
// layers (2020 Sheriff, 2023 Sheriff, 2025 Governor) plus the 2024
// presidential margin. A baseline SELECTOR + turnout-environment knob picks
// (or blends) which layer drives the model. The selected/blended layer is
// flattened into a `PrecinctBaseline` that the engine consumes exactly as the
// single Clerk baseline did.

import type {
  BaselineId,
  ConfidenceLabel,
  RecommendedAction,
  StrategicCategory,
  VoteModeId,
} from "./config";

export type { VoteModeId, ConfidenceLabel, RecommendedAction, StrategicCategory, BaselineId } from "./config";

export type Party = "D" | "R";

export type ModeBreakdown<T = number> = Record<VoteModeId, T>;

// ─────────────────────────────────────────────────────────────
// Raw multi-layer precinct (loaded from GeoJSON, before baseline selection)
// ─────────────────────────────────────────────────────────────

/** One election layer for a precinct (d/r/total + per-mode breakdown). */
export interface PrecinctLayer {
  d: number;
  r: number;
  total: number;
  modeTurnout: ModeBreakdown;
  modeDem: ModeBreakdown;
  modeRep: ModeBreakdown;
}

export type LayerId = "sheriff2020" | "sheriff2023" | "gov2025";

/** All layers + identity for a single precinct. */
export interface PrecinctLayers {
  precinctId: string;
  precinctName: string;
  municipality: string;
  county: string;

  pres2024_d: number;
  pres2024_r: number;

  sheriff2020: PrecinctLayer;
  sheriff2023: PrecinctLayer;
  gov2025: PrecinctLayer;

  baselineConfidence: ConfidenceLabel;
}

// ─────────────────────────────────────────────────────────────
// Baseline (per precinct) — the flattened, selected/blended layer
// ─────────────────────────────────────────────────────────────

/** Baseline (untouched) values for a single precinct after baseline selection. */
export interface PrecinctBaseline {
  // Identity
  precinctId: string;
  precinctName: string;
  municipality: string;
  county: string;

  // Turnout & registration (approximated from turnout — see load.ts).
  registeredVoters: number;
  registrationConfidence: ConfidenceLabel;

  // Sheriff race (single seat; one vote per voter)
  turnout: number;                  // Ballots that cast a Sheriff vote.
  d: number; r: number; other: number;
  modeTurnout: ModeBreakdown;
  modeDem: ModeBreakdown;
  modeRep: ModeBreakdown;

  // Which baseline produced these numbers.
  baselineId: BaselineId;
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

  baselineMarginPct: number;        // R-perspective: + = R lead.
  scenarioMarginPct: number;        // R-perspective: + = R lead.
  netVoteSwingR: number;            // (scenario R−D) − (baseline R−D)

  // Turnout-sensitivity: 2023 R-margin% − 2020 R-margin% (how much the
  // O'Donoghue cushion erodes under presidential turnout). Always available
  // regardless of the active baseline.
  turnoutSensitivity: number;

  // Strategic classification + recommendation.
  category: StrategicCategory;
  action: RecommendedAction;
  voteModePriority: VoteModeId;
  netVoteOpportunity: number;       // Same as netVoteSwingR for this single race.

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
  marginVotes: number;        // R-perspective: r - d
  marginPct: number;          // R-perspective: + = R lead.
  modeDem: ModeBreakdown;
  modeRep: ModeBreakdown;
  modeTurnout: ModeBreakdown;
}

/** County-level result for the Sheriff race (R-perspective). */
export interface CountyResult {
  baseline: RaceTotals;
  scenario: RaceTotals;
  votesNeededR: number;       // Net votes R needs to win/hold. 0 if already winning.
  votesNeededD: number;       // Net votes D needs (inverse view).
  electsR: boolean;           // True if O'Donoghue wins/holds.
  winner: Party | "tie";
  netGain: number;            // scenario - baseline (R-net votes).
}

// ─────────────────────────────────────────────────────────────
// Scenario assumptions
// ─────────────────────────────────────────────────────────────

/**
 * Scenario assumptions for the single-seat Sheriff race. Mode-margin swings
 * (vbm/early/ed) describe campaign field/mail effects within each vote mode;
 * `demSwing`/`repSwing` are county-wide share shifts (pp). Positive `repSwing`
 * helps O'Donoghue.
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

  // Mode-specific margin swings (extra pp to R in each mode).
  vbmMarginSwing: number;
  earlyMarginSwing: number;
  edMarginSwing: number;

  // Optional muni/precinct overrides — extra pp R swing on top of county.
  municipalityOverrides: Record<string, number>;
  precinctOverrides: Record<string, number>;
}

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  mainLever: string;
  // Optional: a preset may switch the baseline / turnout environment.
  baselineId?: BaselineId;
  tEnv?: number;
  assumptions: ScenarioAssumptions;
}

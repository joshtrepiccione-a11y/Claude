// Scenario engine: applies a ScenarioAssumptions object to the precinct
// baselines and returns scenario projections for the single-seat County
// Clerk race.
//
// Assumption philosophy:
//  * `turnoutDelta` scales total ballots per precinct (per mode share).
//  * `demSwing` / `repSwing` are pp shifts on county-wide vote share.
//  * Mode-specific margin swings (vbm/early/ed) describe campaign field,
//    mail, and chase effects concentrated in one vote mode.
//  * Municipality / precinct overrides stack extra pp of D swing locally.
//
// These are deliberately simple, deterministic, and reviewable. They are
// NOT a prediction.

import type {
  CountyResult,
  ModeBreakdown,
  Party,
  PrecinctBaseline,
  PrecinctRow,
  PrecinctScenario,
  RaceTotals,
  ScenarioAssumptions,
} from "../data/types";
import { THRESHOLDS } from "../data/config";
import { blankRaceTotals, calculateBaselineResult, emptyModeBreakdown } from "./baseline";

export function defaultAssumptions(): ScenarioAssumptions {
  return {
    turnoutDelta: 0,
    demSwing: 0,
    repSwing: 0,
    vbmShare: 0,
    earlyShare: 0,
    edShare: 0,
    vbmMarginSwing: 0,
    earlyMarginSwing: 0,
    edMarginSwing: 0,
    municipalityOverrides: {},
    precinctOverrides: {},
  };
}

// ─────────────────────────────────────────────────────────────────────
// Per-precinct scenario
// ─────────────────────────────────────────────────────────────────────

function computeModeMix(
  base: ModeBreakdown,
  a: ScenarioAssumptions,
): { mix: ModeBreakdown; turnout: number } {
  // 1. Apply turnout delta uniformly across modes.
  const scaled: ModeBreakdown = {
    ed: base.ed * (1 + a.turnoutDelta),
    early: base.early * (1 + a.turnoutDelta),
    vbm: base.vbm * (1 + a.turnoutDelta),
  };
  // 2. Optional mode-share override (user supplied a target mix).
  const shareSum = a.vbmShare + a.earlyShare + a.edShare;
  const total = scaled.ed + scaled.early + scaled.vbm;
  if (shareSum > 0 && total > 0) {
    scaled.ed = total * (a.edShare / shareSum);
    scaled.early = total * (a.earlyShare / shareSum);
    scaled.vbm = total * (a.vbmShare / shareSum);
  }
  const turnout = scaled.ed + scaled.early + scaled.vbm;
  return { mix: scaled, turnout };
}

function modeWeightedSwingPP(mix: ModeBreakdown, a: ScenarioAssumptions): number {
  const total = mix.ed + mix.early + mix.vbm;
  if (total === 0) return 0;
  return (
    (mix.ed / total) * a.edMarginSwing +
    (mix.early / total) * a.earlyMarginSwing +
    (mix.vbm / total) * a.vbmMarginSwing
  );
}

export function calculateScenarioPrecinct(
  p: PrecinctBaseline,
  a: ScenarioAssumptions,
): PrecinctScenario {
  const { mix: modeTurnout, turnout } = computeModeMix(p.modeTurnout, a);

  // Override stack: county-wide swing + muni override + precinct override.
  const muniOverride = a.municipalityOverrides[p.municipality] || 0;
  const precinctOverride = a.precinctOverrides[p.precinctId] || 0;
  const swingPP = a.demSwing - a.repSwing + muniOverride + precinctOverride;

  const baseTotal = p.d + p.r + p.other;
  const baseDemShare = baseTotal === 0 ? 0 : p.d / baseTotal;
  const baseOtherShare = baseTotal === 0 ? 0 : p.other / baseTotal;

  const modeSwingPP = modeWeightedSwingPP(modeTurnout, a);
  const totalDemSwingShare = (swingPP + modeSwingPP) / 100;
  const newDemShare = clamp(baseDemShare + totalDemSwingShare, 0, 1 - baseOtherShare);
  const newRepShare = Math.max(0, 1 - newDemShare - baseOtherShare);

  const d = turnout * newDemShare;
  const r = turnout * newRepShare;
  const other = turnout * baseOtherShare;

  const modeDem = scaleModes(p.modeDem, d, p.d);
  const modeRep = scaleModes(p.modeRep, r, p.r);

  return { d, r, other, turnout, modeTurnout, modeDem, modeRep };
}

function scaleModes(base: ModeBreakdown, newTotal: number, oldTotal: number): ModeBreakdown {
  if (oldTotal === 0) {
    return { ed: newTotal / 3, early: newTotal / 3, vbm: newTotal / 3 };
  }
  const k = newTotal / oldTotal;
  return { ed: base.ed * k, early: base.early * k, vbm: base.vbm * k };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ─────────────────────────────────────────────────────────────────────
// County rollup
// ─────────────────────────────────────────────────────────────────────

export function calculateScenarioResult(
  precincts: PrecinctBaseline[],
  a: ScenarioAssumptions,
): { rows: PrecinctRow[]; county: CountyResult } {
  const rows: PrecinctRow[] = [];

  const baseline = calculateBaselineResult(precincts);
  const totals = blankRaceTotals();

  for (const p of precincts) {
    const sc = calculateScenarioPrecinct(p, a);

    const baseTotal = p.d + p.r + p.other;
    const scTotal = sc.d + sc.r + sc.other;
    const baseMarginPct = baseTotal === 0 ? 0 : ((p.d - p.r) / baseTotal) * 100;
    const scMarginPct = scTotal === 0 ? 0 : ((sc.d - sc.r) / scTotal) * 100;
    const netSwingD = (sc.d - sc.r) - (p.d - p.r);

    // Component scores for the Targets tab.
    const competitiveness = 100 - Math.min(100, Math.abs(baseMarginPct) * 4);
    const persuasionScore = clamp(
      competitiveness * (1 - Math.abs(baseMarginPct) / THRESHOLDS.persuasionMaxMarginPct),
      0, 100,
    );
    const turnoutScore = clamp(
      (p.turnout > 0 ? Math.log10(p.turnout) * 25 : 0) * (baseMarginPct >= 0 ? 1 : 0.4),
      0, 100,
    );
    const baseTotalMode = p.modeTurnout.ed + p.modeTurnout.early + p.modeTurnout.vbm;
    const vbmShare = baseTotalMode === 0 ? 0 : p.modeTurnout.vbm / baseTotalMode;
    const earlyShare = baseTotalMode === 0 ? 0 : p.modeTurnout.early / baseTotalMode;
    const edShare = baseTotalMode === 0 ? 0 : p.modeTurnout.ed / baseTotalMode;
    const vbmScore = clamp(vbmShare * 120 + competitiveness * 0.4, 0, 100);
    const earlyScore = clamp(earlyShare * 140 + competitiveness * 0.3, 0, 100);
    const edScore = clamp(edShare * 100 + competitiveness * 0.5, 0, 100);

    const modeScores: Array<["vbm" | "early" | "ed", number]> = [
      ["vbm", vbmScore], ["early", earlyScore], ["ed", edScore],
    ];
    modeScores.sort((x, y) => y[1] - x[1]);
    const voteModePriority = modeScores[0][0];

    // Strategic category (D-perspective, driven by baseline Clerk margin).
    const m = baseMarginPct;
    let category: PrecinctRow["category"];
    if (m >= THRESHOLDS.marginSafe) category = "Base Expansion";
    else if (m >= THRESHOLDS.marginLean) category = "Defensive Hold";
    else if (m >= -THRESHOLDS.marginTossUp && m <= THRESHOLDS.marginTossUp) category = "Toss-Up";
    else if (m >= -THRESHOLDS.persuasionMaxMarginPct) category = "Persuasion";
    else if (m <= -THRESHOLDS.marginSafe) category = "Opposition Stronghold";
    else category = "Low Priority";

    let action: PrecinctRow["action"];
    if (category === "Base Expansion") action = "Volunteer Recruitment";
    else if (category === "Defensive Hold") action = "VBM Ballot Chase";
    else if (category === "Toss-Up") action = voteModePriority === "vbm" ? "VBM Ballot Chase" : voteModePriority === "early" ? "Early Vote Push" : "Door-to-Door Canvass";
    else if (category === "Persuasion") action = voteModePriority === "vbm" ? "Persuasion Mail" : voteModePriority === "early" ? "Digital Retargeting" : "Door-to-Door Canvass";
    else if (category === "Opposition Stronghold") action = "Damage Reduction";
    else action = "Monitor Only";

    rows.push({
      baseline: p,
      scenario: sc,
      baselineMarginPct: baseMarginPct,
      scenarioMarginPct: scMarginPct,
      netVoteSwingD: netSwingD,
      category,
      action,
      voteModePriority,
      netVoteOpportunity: netSwingD,
      persuasionScore,
      turnoutScore,
      vbmScore,
      earlyScore,
      edScore,
    });

    totals.d += sc.d; totals.r += sc.r;
    // "Other" is held constant — it has no scenario-side dynamic.
    totals.other += p.other;
    totals.totalBallots += sc.turnout;
    accMode(totals.modeDem, sc.modeDem);
    accMode(totals.modeRep, sc.modeRep);
    accMode(totals.modeTurnout, sc.modeTurnout);
  }

  finalize(totals);

  const votesNeededD = Math.max(0, Math.ceil(totals.r - totals.d + 1));
  const votesNeededR = Math.max(0, Math.ceil(totals.d - totals.r + 1));
  const electsD = totals.d > totals.r;
  const winner: Party | "tie" =
    totals.d === totals.r ? "tie" : totals.d > totals.r ? "D" : "R";

  return {
    rows,
    county: {
      baseline,
      scenario: totals,
      votesNeededD,
      votesNeededR,
      electsD,
      winner,
      netGain: totals.marginVotes - baseline.marginVotes,
    },
  };
}

function accMode(a: ModeBreakdown, b: ModeBreakdown) {
  a.ed += b.ed; a.early += b.early; a.vbm += b.vbm;
}

function finalize(t: RaceTotals) {
  const tot = t.d + t.r + t.other;
  t.marginVotes = t.d - t.r;
  t.marginPct = tot === 0 ? 0 : (t.marginVotes / tot) * 100;
}

/** Per-mode contribution to scenario D-margin. */
export function calculateVoteModeImpact(rows: PrecinctRow[]): ModeBreakdown {
  const out = emptyModeBreakdown();
  for (const r of rows) {
    out.ed += r.scenario.modeDem.ed - r.scenario.modeRep.ed;
    out.early += r.scenario.modeDem.early - r.scenario.modeRep.early;
    out.vbm += r.scenario.modeDem.vbm - r.scenario.modeRep.vbm;
  }
  return out;
}

// Scenario engine: applies a ScenarioAssumptions object to the precinct
// baselines and returns scenario projections + district rollup + per-precinct
// rows used by the UI.
//
// Assumption philosophy:
//  * `turnoutDelta` scales total ballots (per precinct and per mode share).
//  * `demSlateSwing` / `repSlateSwing` are percentage-point shifts on the
//    share of the *slate vote* (i.e. on the two-vote total). A +2pt D swing
//    means the Democratic slate's share of slate votes rises by 2 points and
//    the Republican slate's share falls by the same amount (other held fixed).
//  * `candidateA/Bahdjustment` shifts votes between A and B within each party
//    in a precinct, preserving the slate sum.
//  * `bulletVoteRate` reduces total slate votes — a bullet-voted ballot
//    contributes one vote instead of two. This affects margins by reducing
//    the leading party's slate total more than the trailing party's.
//  * `splitTicketRate` redistributes within ballots: a fraction of would-be
//    D voters cast for one D and one R, etc. Net effect: gentle compression
//    of slate margin and inflation of cross-party variance.
//  * mode-specific margin swings layer on top of the slate swing for the
//    relevant share of ballots.
//
// These are deliberately simple, deterministic, and reviewable. They are NOT
// a prediction — they are a model the campaign can use to pressure-test
// assumptions and compare paths.

import type {
  CandidateFinisher,
  DistrictResult,
  ModeBreakdown,
  PrecinctBaseline,
  PrecinctRow,
  PrecinctScenario,
  ScenarioAssumptions,
  SlateTotals,
} from "../data/types";
import { THRESHOLDS } from "../data/config";
import {
  blankSlateTotals,
  calculateBaselineSlateResult,
  emptyModeBreakdown,
} from "./baseline";

export function defaultAssumptions(): ScenarioAssumptions {
  return {
    turnoutDelta: 0,
    demSlateSwing: 0,
    repSlateSwing: 0,
    candidateAAdjustment: 0,
    candidateBAdjustment: 0,
    bulletVoteRate: 0,
    splitTicketRate: 0,
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

export function calculateScenarioPrecinct(
  p: PrecinctBaseline,
  a: ScenarioAssumptions,
): PrecinctScenario {
  // 1. Apply turnout delta uniformly across modes.
  const turnoutScale = 1 + a.turnoutDelta;
  const modeTurnout: ModeBreakdown = {
    ed: p.modeTurnout.ed * turnoutScale,
    early: p.modeTurnout.early * turnoutScale,
    vbm: p.modeTurnout.vbm * turnoutScale,
  };

  // If user explicitly overrode mode shares, redistribute the new turnout.
  const total = modeTurnout.ed + modeTurnout.early + modeTurnout.vbm;
  if (a.vbmShare + a.earlyShare + a.edShare > 0 && total > 0) {
    const normSum = a.vbmShare + a.earlyShare + a.edShare;
    modeTurnout.ed = total * (a.edShare / normSum);
    modeTurnout.early = total * (a.earlyShare / normSum);
    modeTurnout.vbm = total * (a.vbmShare / normSum);
  }
  const turnout = modeTurnout.ed + modeTurnout.early + modeTurnout.vbm;

  // 2. Compute scenario slate-share shift for this precinct.
  // demSlateSwing/repSlateSwing are percentage-point shifts on slate share.
  // Override stack: districtwide swing + muni override + precinct override.
  const muniOverride = a.municipalityOverrides[p.municipality] || 0;
  const precinctOverride = a.precinctOverrides[p.precinctId] || 0;
  const dSwingPP =
    a.demSlateSwing - a.repSlateSwing + muniOverride + precinctOverride;

  // 3. Baseline mode shares of slate vote.
  const baseSlate = p.demA + p.demB + p.repA + p.repB + p.other;
  const baseDemSlate = p.demA + p.demB;
  const baseRepSlate = p.repA + p.repB;
  const baseDemShare = baseSlate === 0 ? 0 : baseDemSlate / baseSlate;
  const baseOtherShare = baseSlate === 0 ? 0 : p.other / baseSlate;

  // 4. Apply mode-specific margin swings (pp into D share, from R).
  const modeSwings = {
    ed: a.edMarginSwing,
    early: a.earlyMarginSwing,
    vbm: a.vbmMarginSwing,
  };
  const modeShares = {
    ed: turnout === 0 ? 0 : modeTurnout.ed / turnout,
    early: turnout === 0 ? 0 : modeTurnout.early / turnout,
    vbm: turnout === 0 ? 0 : modeTurnout.vbm / turnout,
  };
  const modeWeightedSwingPP =
    modeShares.ed * modeSwings.ed +
    modeShares.early * modeSwings.early +
    modeShares.vbm * modeSwings.vbm;

  // 5. New slate shares (clamped to [0,1]).
  const totalDemSwingShare = (dSwingPP + modeWeightedSwingPP) / 100;
  const newDemShare = clamp(baseDemShare + totalDemSwingShare, 0, 1 - baseOtherShare);
  const newRepShare = Math.max(0, 1 - newDemShare - baseOtherShare);

  // 6. Apply bullet vote and split-ticket adjustments (small multiplicative
  // tweaks on slate totals).
  // Bullet vote: trims roughly half the second vote from the bullet-voted
  // fraction of ballots. We apply it symmetrically; if the user wants
  // asymmetric effects they should use candidate adjustments.
  const bulletPenalty = 1 - 0.25 * a.bulletVoteRate;
  // Split-ticket compresses margins toward zero: a fraction `s` of D voters'
  // second vote goes to R and vice-versa. This is approximated by mixing
  // the two slates by s/2.
  const split = a.splitTicketRate;
  const mixedDemShare =
    newDemShare * (1 - split / 2) + newRepShare * (split / 2);
  const mixedRepShare =
    newRepShare * (1 - split / 2) + newDemShare * (split / 2);

  const slateVotesTarget = turnout * 2 * bulletPenalty; // two-vote slate total
  const demSlate = slateVotesTarget * mixedDemShare;
  const repSlate = slateVotesTarget * mixedRepShare;

  // 7. Distribute slate totals onto A/B candidates.
  // Preserve baseline A/B share within each party, then apply A/B adjustments.
  const baseDA = baseDemSlate === 0 ? 0.5 : p.demA / baseDemSlate;
  const baseDBshare = 1 - baseDA;
  const baseRA = baseRepSlate === 0 ? 0.5 : p.repA / baseRepSlate;
  const baseRBshare = 1 - baseRA;

  const dAshare = clamp(baseDA + a.candidateAAdjustment / 100, 0.05, 0.95);
  const dBshareNew = 1 - dAshare;
  const rAshare = clamp(baseRA + a.candidateAAdjustment / 100, 0.05, 0.95);
  const rBshareNew = 1 - rAshare;

  // (B-adjustment shifts within both parties symmetrically, but in the
  // opposite direction so A and B don't double-apply.)
  const dBshare = clamp(dBshareNew + a.candidateBAdjustment / 100, 0.05, 0.95);
  const dAfinal = 1 - dBshare;
  const rBshare = clamp(rBshareNew + a.candidateBAdjustment / 100, 0.05, 0.95);
  const rAfinal = 1 - rBshare;

  const demA = demSlate * dAfinal;
  const demB = demSlate * dBshare;
  const repA = repSlate * rAfinal;
  const repB = repSlate * rBshare;

  // Mode-broken slate totals (scaled to the new totals).
  const modeDemSlate = scaleModes(p.modeDemSlate, demSlate, baseDemSlate);
  const modeRepSlate = scaleModes(p.modeRepSlate, repSlate, baseRepSlate);
  // Suppress unused warnings on baseDBshare / baseRBshare (kept for readability above).
  void baseDBshare;
  void baseRBshare;

  return {
    demA,
    demB,
    repA,
    repB,
    turnout,
    modeTurnout,
    demSlate,
    repSlate,
    modeDemSlate,
    modeRepSlate,
  };
}

function scaleModes(
  base: ModeBreakdown,
  newTotal: number,
  oldTotal: number,
): ModeBreakdown {
  if (oldTotal === 0) {
    return { ed: newTotal / 3, early: newTotal / 3, vbm: newTotal / 3 };
  }
  const k = newTotal / oldTotal;
  return { ed: base.ed * k, early: base.early * k, vbm: base.vbm * k };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Apply scenario across all precincts; return per-precinct rows. */
export function calculateScenarioResult(
  precincts: PrecinctBaseline[],
  assumptions: ScenarioAssumptions,
): { rows: PrecinctRow[]; district: DistrictResult } {
  const rows: PrecinctRow[] = [];
  const baselineDistrict = calculateBaselineSlateResult(precincts);
  const scenarioTotals: SlateTotals = blankSlateTotals();

  for (const p of precincts) {
    const sc = calculateScenarioPrecinct(p, assumptions);
    const baseTotal = p.demA + p.demB + p.repA + p.repB + p.other;
    const scTotal = sc.demA + sc.demB + sc.repA + sc.repB;

    const baselineMarginPct =
      baseTotal === 0 ? 0 : ((p.demA + p.demB - p.repA - p.repB) / baseTotal) * 100;
    const scenarioMarginPct =
      scTotal === 0 ? 0 : ((sc.demSlate - sc.repSlate) / scTotal) * 100;

    const baseDnet = p.demA + p.demB - (p.repA + p.repB);
    const scDnet = sc.demSlate - sc.repSlate;
    const netVoteSwingD = scDnet - baseDnet;

    // Scoring (0..100) — used for the Targets tab.
    const competitiveness = 100 - Math.min(100, Math.abs(baselineMarginPct) * 4);
    const persuasionScore = clamp(
      competitiveness *
        (1 - Math.abs(baselineMarginPct) / THRESHOLDS.persuasionMaxMarginPct),
      0,
      100,
    );
    const turnoutScore = clamp(
      (p.baselineTurnout > 0 ? Math.log10(p.baselineTurnout) * 25 : 0) *
        (baselineMarginPct >= 0 ? 1 : 0.4),
      0,
      100,
    );
    const baseTotalMode = p.modeTurnout.ed + p.modeTurnout.early + p.modeTurnout.vbm;
    const vbmShare = baseTotalMode === 0 ? 0 : p.modeTurnout.vbm / baseTotalMode;
    const earlyShare = baseTotalMode === 0 ? 0 : p.modeTurnout.early / baseTotalMode;
    const edShare = baseTotalMode === 0 ? 0 : p.modeTurnout.ed / baseTotalMode;
    const vbmScore = clamp(vbmShare * 120 + competitiveness * 0.4, 0, 100);
    const earlyScore = clamp(earlyShare * 140 + competitiveness * 0.3, 0, 100);
    const edScore = clamp(edShare * 100 + competitiveness * 0.5, 0, 100);

    // Pick vote-mode priority: largest of the three scores.
    const modeScores: Array<["vbm" | "early" | "ed", number]> = [
      ["vbm", vbmScore],
      ["early", earlyScore],
      ["ed", edScore],
    ];
    modeScores.sort((a, b) => b[1] - a[1]);
    const voteModePriority = modeScores[0][0];

    // Strategic category.
    const m = baselineMarginPct;
    let category: PrecinctRow["category"];
    if (m >= THRESHOLDS.marginSafe) category = "Base Expansion";
    else if (m >= THRESHOLDS.marginLean) category = "Defensive Hold";
    else if (m >= -THRESHOLDS.marginTossUp && m <= THRESHOLDS.marginTossUp) category = "Toss-Up";
    else if (m >= -THRESHOLDS.persuasionMaxMarginPct) category = "Persuasion";
    else if (m <= -THRESHOLDS.marginSafe) category = "Opposition Stronghold";
    else category = "Low Priority";

    // Recommended action.
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
      netVoteSwingD,
      baselineSlateMarginPct: baselineMarginPct,
      scenarioSlateMarginPct: scenarioMarginPct,
      category,
      action,
      voteModePriority,
      netVoteOpportunity: netVoteSwingD,
      persuasionScore,
      turnoutScore,
      vbmScore,
      earlyScore,
      edScore,
    });

    scenarioTotals.dA += sc.demA;
    scenarioTotals.dB += sc.demB;
    scenarioTotals.rA += sc.repA;
    scenarioTotals.rB += sc.repB;
    scenarioTotals.other += p.other; // other held constant
    scenarioTotals.totalBallots += sc.turnout;
    scenarioTotals.modeDemSlate.ed += sc.modeDemSlate.ed;
    scenarioTotals.modeDemSlate.early += sc.modeDemSlate.early;
    scenarioTotals.modeDemSlate.vbm += sc.modeDemSlate.vbm;
    scenarioTotals.modeRepSlate.ed += sc.modeRepSlate.ed;
    scenarioTotals.modeRepSlate.early += sc.modeRepSlate.early;
    scenarioTotals.modeRepSlate.vbm += sc.modeRepSlate.vbm;
    scenarioTotals.modeTurnout.ed += sc.modeTurnout.ed;
    scenarioTotals.modeTurnout.early += sc.modeTurnout.early;
    scenarioTotals.modeTurnout.vbm += sc.modeTurnout.vbm;
  }

  scenarioTotals.demSlate = scenarioTotals.dA + scenarioTotals.dB;
  scenarioTotals.repSlate = scenarioTotals.rA + scenarioTotals.rB;
  scenarioTotals.totalSlateVotes =
    scenarioTotals.demSlate + scenarioTotals.repSlate + scenarioTotals.other;
  scenarioTotals.slateMarginVotes =
    scenarioTotals.demSlate - scenarioTotals.repSlate;
  scenarioTotals.slateMarginPct =
    scenarioTotals.totalSlateVotes === 0
      ? 0
      : (scenarioTotals.slateMarginVotes / scenarioTotals.totalSlateVotes) * 100;

  const finishers = computeFinishers(scenarioTotals);
  const secondSeatMargin = finishers[1].votes - finishers[2].votes;
  const seats = {
    D: finishers.filter((f) => f.seated && f.party === "D").length,
    R: finishers.filter((f) => f.seated && f.party === "R").length,
  };

  // Votes needed (D-perspective): how many votes to lift the higher of the two
  // D candidates past the second-place R candidate (or the lower D past the
  // lower R for "elect both"). All measured in the D candidate's own vote total.
  const dVotes = [
    { id: "dA" as const, v: scenarioTotals.dA },
    { id: "dB" as const, v: scenarioTotals.dB },
  ].sort((a, b) => b.v - a.v);
  const rVotes = [
    { id: "rA" as const, v: scenarioTotals.rA },
    { id: "rB" as const, v: scenarioTotals.rB },
  ].sort((a, b) => b.v - a.v);

  // To elect ONE: the higher D must beat the higher R.
  const electOneGap = rVotes[0].v - dVotes[0].v + 1;
  const electBothGap = rVotes[1].v - dVotes[1].v + 1;
  const votesNeededToElectOne = Math.max(0, Math.ceil(electOneGap));
  const votesNeededToElectBoth = Math.max(0, Math.ceil(electBothGap));

  return {
    rows,
    district: {
      baseline: baselineDistrict,
      scenario: scenarioTotals,
      votesNeededToElectOne,
      votesNeededToElectBoth,
      electsOne: votesNeededToElectOne === 0,
      electsBoth: votesNeededToElectBoth === 0,
      netSlateGain:
        scenarioTotals.slateMarginVotes - baselineDistrict.slateMarginVotes,
      finishers,
      seats,
      secondSeatMargin,
    },
  };
}

function computeFinishers(s: SlateTotals): CandidateFinisher[] {
  const list: Array<Omit<CandidateFinisher, "rank" | "seated">> = [
    { id: "dA", party: "D", votes: s.dA },
    { id: "dB", party: "D", votes: s.dB },
    { id: "rA", party: "R", votes: s.rA },
    { id: "rB", party: "R", votes: s.rB },
  ];
  list.sort((a, b) => b.votes - a.votes);
  return list.map((f, i) => ({
    ...f,
    rank: (i + 1) as 1 | 2 | 3 | 4,
    seated: i < 2,
  }));
}

export function calculateVotesNeededToElectOne(d: DistrictResult): number {
  return d.votesNeededToElectOne;
}
export function calculateVotesNeededToElectBoth(d: DistrictResult): number {
  return d.votesNeededToElectBoth;
}

/** Estimate bullet vote impact in net D-margin votes for a scenario. */
export function calculateBulletVoteImpact(
  precincts: PrecinctBaseline[],
  a: ScenarioAssumptions,
): number {
  const withBullet = calculateScenarioResult(precincts, a).district.scenario.slateMarginVotes;
  const withoutBullet = calculateScenarioResult(precincts, {
    ...a,
    bulletVoteRate: 0,
  }).district.scenario.slateMarginVotes;
  return withBullet - withoutBullet;
}

/** Estimate split-ticket impact in net D-margin votes for a scenario. */
export function calculateSplitTicketImpact(
  precincts: PrecinctBaseline[],
  a: ScenarioAssumptions,
): number {
  const withSplit = calculateScenarioResult(precincts, a).district.scenario.slateMarginVotes;
  const withoutSplit = calculateScenarioResult(precincts, {
    ...a,
    splitTicketRate: 0,
  }).district.scenario.slateMarginVotes;
  return withSplit - withoutSplit;
}

/** Per-mode contribution to scenario D-slate margin. */
export function calculateVoteModeImpact(
  rows: PrecinctRow[],
): ModeBreakdown {
  const out = emptyModeBreakdown();
  for (const r of rows) {
    out.ed += r.scenario.modeDemSlate.ed - r.scenario.modeRepSlate.ed;
    out.early += r.scenario.modeDemSlate.early - r.scenario.modeRepSlate.early;
    out.vbm += r.scenario.modeDemSlate.vbm - r.scenario.modeRepSlate.vbm;
  }
  return out;
}

// Scenario engine: applies a ScenarioAssumptions object to the precinct
// baselines and returns scenario projections for the Assembly two-vote
// slate race AND the Senate single-seat race, plus a combined ticket
// rollup (0..3 D / 0..3 R seats).
//
// Assumption philosophy (covers both races unless noted):
//  * `turnoutDelta` scales total ballots per precinct (per mode share).
//    Applied to both Senate and Assembly turnout uniformly — a campaign
//    program lifting turnout lifts both races' ballot counts together.
//  * `asmDemSwing` / `asmRepSwing` are pp shifts on Assembly slate share.
//  * `senDemSwing` / `senRepSwing` are pp shifts on Senate share.
//    (Split because the two races have different candidates and different
//    drop-off dynamics; a popular Senate candidate doesn't necessarily move
//    the Assembly slate by the same amount.)
//  * `candidateAAdjustment` / `candidateBAdjustment` shift votes between A
//    and B within each Assembly party slate (preserving the slate sum).
//    Senate is single-seat so these don't apply there.
//  * `bulletVoteRate` reduces total Assembly slate votes — a bullet-voted
//    ballot contributes one vote instead of two. Senate is unaffected
//    because every voter casts at most one Senate vote anyway.
//
//    Limitation: the current implementation applies the bullet penalty
//    symmetrically across both parties. In practice bullet voting tends
//    to disproportionately suppress the trailing candidate of the leading
//    party. This is flagged in the realism scoring and the memo.
//
//  * `splitTicketRate` redistributes within Assembly ballots only — a
//    fraction of D voters' second vote goes to R and vice-versa. It does
//    NOT affect Senate (no "second vote" exists in a single-seat race).
//  * mode-specific margin swings (vbm/early/ed) are SHARED across races —
//    a stronger VBM program shifts both Senate and Assembly D-share in the
//    VBM mode by the same amount.
//
// These are deliberately simple, deterministic, and reviewable. They are
// NOT a prediction.

import type {
  AssemblyTotals,
  CandidateFinisher,
  DistrictResult,
  ModeBreakdown,
  Party,
  PrecinctBaseline,
  PrecinctRow,
  PrecinctScenarioAssembly,
  PrecinctScenarioSenate,
  ScenarioAssumptions,
  SenateTotals,
} from "../data/types";
import { THRESHOLDS } from "../data/config";
import {
  blankAssemblyTotals,
  blankSenateTotals,
  calculateBaselineSenateResult,
  calculateBaselineSlateResult,
  emptyModeBreakdown,
} from "./baseline";

export function defaultAssumptions(): ScenarioAssumptions {
  return {
    turnoutDelta: 0,
    asmDemSwing: 0,
    asmRepSwing: 0,
    senDemSwing: 0,
    senRepSwing: 0,
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

// ─────────────────────────────────────────────────────────────────────
// Per-precinct: Assembly scenario
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

function modeWeightedSwingPP(
  mix: ModeBreakdown,
  a: ScenarioAssumptions,
): number {
  const total = mix.ed + mix.early + mix.vbm;
  if (total === 0) return 0;
  return (
    (mix.ed / total) * a.edMarginSwing +
    (mix.early / total) * a.earlyMarginSwing +
    (mix.vbm / total) * a.vbmMarginSwing
  );
}

export function calculateScenarioPrecinctAssembly(
  p: PrecinctBaseline,
  a: ScenarioAssumptions,
): PrecinctScenarioAssembly {
  const { mix: modeTurnout, turnout } = computeModeMix(p.modeTurnout, a);

  // Override stack: districtwide swing + muni override + precinct override.
  const muniOverride = a.municipalityOverrides[p.municipality] || 0;
  const precinctOverride = a.precinctOverrides[p.precinctId] || 0;
  const slateSwingPP =
    a.asmDemSwing - a.asmRepSwing + muniOverride + precinctOverride;

  // Baseline mode shares of slate vote.
  const baseSlate = p.demA + p.demB + p.repA + p.repB + p.other;
  const baseDemSlate = p.demA + p.demB;
  const baseRepSlate = p.repA + p.repB;
  const baseDemShare = baseSlate === 0 ? 0 : baseDemSlate / baseSlate;
  const baseOtherShare = baseSlate === 0 ? 0 : p.other / baseSlate;

  const modeSwingPP = modeWeightedSwingPP(modeTurnout, a);
  const totalDemSwingShare = (slateSwingPP + modeSwingPP) / 100;
  const newDemShare = clamp(baseDemShare + totalDemSwingShare, 0, 1 - baseOtherShare);
  const newRepShare = Math.max(0, 1 - newDemShare - baseOtherShare);

  // Bullet vote: 0.25 multiplier means a bullet-voted ballot drops half of
  // the second slate vote (rough empirical calibration). See module comment
  // for the symmetry-limitation caveat.
  const bulletPenalty = 1 - 0.25 * a.bulletVoteRate;

  // Split ticket compresses margins toward zero.
  const split = a.splitTicketRate;
  const mixedDemShare = newDemShare * (1 - split / 2) + newRepShare * (split / 2);
  const mixedRepShare = newRepShare * (1 - split / 2) + newDemShare * (split / 2);

  const slateVotesTarget = turnout * 2 * bulletPenalty; // two-vote slate total
  const demSlate = slateVotesTarget * mixedDemShare;
  const repSlate = slateVotesTarget * mixedRepShare;

  // Distribute onto A/B candidates within each party. Preserve baseline
  // A/B share, then layer A and B adjustments.
  const baseDA = baseDemSlate === 0 ? 0.5 : p.demA / baseDemSlate;
  const baseRA = baseRepSlate === 0 ? 0.5 : p.repA / baseRepSlate;

  // candidateAAdjustment lifts A in BOTH parties; candidateBAdjustment lifts B.
  // (Net effect on slate = 0; only changes within-slate split.)
  const dAshareInit = clamp(baseDA + a.candidateAAdjustment / 100, 0.05, 0.95);
  const rAshareInit = clamp(baseRA + a.candidateAAdjustment / 100, 0.05, 0.95);
  const dBfinalShare = clamp((1 - dAshareInit) + a.candidateBAdjustment / 100, 0.05, 0.95);
  const dAfinalShare = 1 - dBfinalShare;
  const rBfinalShare = clamp((1 - rAshareInit) + a.candidateBAdjustment / 100, 0.05, 0.95);
  const rAfinalShare = 1 - rBfinalShare;

  const demA = demSlate * dAfinalShare;
  const demB = demSlate * dBfinalShare;
  const repA = repSlate * rAfinalShare;
  const repB = repSlate * rBfinalShare;

  const modeDemSlate = scaleModes(p.modeDemSlate, demSlate, baseDemSlate);
  const modeRepSlate = scaleModes(p.modeRepSlate, repSlate, baseRepSlate);

  return {
    demA, demB, repA, repB,
    turnout, modeTurnout,
    demSlate, repSlate,
    modeDemSlate, modeRepSlate,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Per-precinct: Senate scenario
// ─────────────────────────────────────────────────────────────────────

export function calculateScenarioPrecinctSenate(
  p: PrecinctBaseline,
  a: ScenarioAssumptions,
): PrecinctScenarioSenate {
  const { mix: modeTurnout, turnout } = computeModeMix(p.senModeTurnout, a);

  const muniOverride = a.municipalityOverrides[p.municipality] || 0;
  const precinctOverride = a.precinctOverrides[p.precinctId] || 0;
  const senSwingPP =
    a.senDemSwing - a.senRepSwing + muniOverride + precinctOverride;

  const baseTotal = p.senD + p.senR + p.senOther;
  const baseDemShare = baseTotal === 0 ? 0 : p.senD / baseTotal;
  const baseOtherShare = baseTotal === 0 ? 0 : p.senOther / baseTotal;

  const modeSwingPP = modeWeightedSwingPP(modeTurnout, a);
  const totalDemSwingShare = (senSwingPP + modeSwingPP) / 100;
  const newDemShare = clamp(baseDemShare + totalDemSwingShare, 0, 1 - baseOtherShare);
  const newRepShare = Math.max(0, 1 - newDemShare - baseOtherShare);

  const d = turnout * newDemShare;
  const r = turnout * newRepShare;
  const other = turnout * baseOtherShare;

  const modeDem = scaleModes(p.senModeDem, d, p.senD);
  const modeRep = scaleModes(p.senModeRep, r, p.senR);

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
// District rollup
// ─────────────────────────────────────────────────────────────────────

export function calculateScenarioResult(
  precincts: PrecinctBaseline[],
  a: ScenarioAssumptions,
): { rows: PrecinctRow[]; district: DistrictResult } {
  const rows: PrecinctRow[] = [];

  const baselineAsm = calculateBaselineSlateResult(precincts);
  const baselineSen = calculateBaselineSenateResult(precincts);

  const asmTotals = blankAssemblyTotals();
  const senTotals = blankSenateTotals();

  for (const p of precincts) {
    const scAsm = calculateScenarioPrecinctAssembly(p, a);
    const scSen = calculateScenarioPrecinctSenate(p, a);

    // Assembly per-precinct margins.
    const baseAsmTotal = p.demA + p.demB + p.repA + p.repB + p.other;
    const scAsmTotal = scAsm.demA + scAsm.demB + scAsm.repA + scAsm.repB;
    const baseAsmMarginPct =
      baseAsmTotal === 0 ? 0 : ((p.demA + p.demB - p.repA - p.repB) / baseAsmTotal) * 100;
    const scAsmMarginPct =
      scAsmTotal === 0 ? 0 : ((scAsm.demSlate - scAsm.repSlate) / scAsmTotal) * 100;
    const asmNetSwingD =
      (scAsm.demSlate - scAsm.repSlate) - (p.demA + p.demB - (p.repA + p.repB));

    // Senate per-precinct margins.
    const baseSenTotal = p.senD + p.senR + p.senOther;
    const scSenTotal = scSen.d + scSen.r + scSen.other;
    const baseSenMarginPct =
      baseSenTotal === 0 ? 0 : ((p.senD - p.senR) / baseSenTotal) * 100;
    const scSenMarginPct =
      scSenTotal === 0 ? 0 : ((scSen.d - scSen.r) / scSenTotal) * 100;
    const senNetSwingD = (scSen.d - scSen.r) - (p.senD - p.senR);

    // Net Democratic vote opportunity = Senate + Assembly swing together,
    // since a campaign program that moves one mode tends to lift both races.
    const netVoteOpportunity = asmNetSwingD + senNetSwingD;

    // Component scores for the Targets tab.
    const competitiveness = 100 - Math.min(100, Math.abs(baseAsmMarginPct) * 4);
    const persuasionScore = clamp(
      competitiveness * (1 - Math.abs(baseAsmMarginPct) / THRESHOLDS.persuasionMaxMarginPct),
      0, 100,
    );
    const turnoutScore = clamp(
      (p.baselineTurnout > 0 ? Math.log10(p.baselineTurnout) * 25 : 0) *
        (baseAsmMarginPct >= 0 ? 1 : 0.4),
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

    // Strategic category (driven by Assembly margin, since that's the slate race).
    const m = baseAsmMarginPct;
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
      scenario: scAsm,
      senateScenario: scSen,
      netVoteSwingD: asmNetSwingD,
      baselineSlateMarginPct: baseAsmMarginPct,
      scenarioSlateMarginPct: scAsmMarginPct,
      senateBaselineMarginPct: baseSenMarginPct,
      senateScenarioMarginPct: scSenMarginPct,
      senateNetVoteSwingD: senNetSwingD,
      category,
      action,
      voteModePriority,
      netVoteOpportunity,
      persuasionScore,
      turnoutScore,
      vbmScore,
      earlyScore,
      edScore,
    });

    // Assembly district totals.
    asmTotals.dA += scAsm.demA; asmTotals.dB += scAsm.demB;
    asmTotals.rA += scAsm.repA; asmTotals.rB += scAsm.repB;
    // "Other" is held constant — it has no scenario-side dynamic in V3.
    // See module comment.
    asmTotals.other += p.other;
    asmTotals.totalBallots += scAsm.turnout;
    accModeAsm(asmTotals.modeDemSlate, scAsm.modeDemSlate);
    accModeAsm(asmTotals.modeRepSlate, scAsm.modeRepSlate);
    accModeAsm(asmTotals.modeTurnout, scAsm.modeTurnout);

    // Senate district totals.
    senTotals.d += scSen.d; senTotals.r += scSen.r;
    senTotals.other += p.senOther; // held constant for the same reason
    senTotals.totalBallots += scSen.turnout;
    accModeAsm(senTotals.modeDem, scSen.modeDem);
    accModeAsm(senTotals.modeRep, scSen.modeRep);
    accModeAsm(senTotals.modeTurnout, scSen.modeTurnout);
  }

  finalizeAsm(asmTotals);
  finalizeSen(senTotals);

  const finishers = computeFinishers(asmTotals);
  const secondSeatMargin = finishers[1].votes - finishers[2].votes;
  const asmSeats = {
    D: finishers.filter((f) => f.seated && f.party === "D").length,
    R: finishers.filter((f) => f.seated && f.party === "R").length,
  };

  // Assembly: elect-one / elect-both gaps.
  const dCandsSorted = [
    { id: "dA" as const, v: asmTotals.dA },
    { id: "dB" as const, v: asmTotals.dB },
  ].sort((x, y) => y.v - x.v);
  const rCandsSorted = [
    { id: "rA" as const, v: asmTotals.rA },
    { id: "rB" as const, v: asmTotals.rB },
  ].sort((x, y) => y.v - x.v);
  const votesNeededToElectOne = Math.max(0, Math.ceil(rCandsSorted[0].v - dCandsSorted[0].v + 1));
  const votesNeededToElectBoth = Math.max(0, Math.ceil(rCandsSorted[1].v - dCandsSorted[1].v + 1));

  // Senate: single-seat gap.
  const senVotesNeededD = Math.max(0, Math.ceil(senTotals.r - senTotals.d + 1));
  const senVotesNeededR = Math.max(0, Math.ceil(senTotals.d - senTotals.r + 1));
  const senateElectsD = senTotals.d > senTotals.r;
  const senateWinner: Party | "tie" =
    senTotals.d === senTotals.r ? "tie" : senTotals.d > senTotals.r ? "D" : "R";

  // Full ticket (0..3 seats per party). Ties on Senate count as neither.
  const ticketD = (senateElectsD ? 1 : 0) + asmSeats.D;
  const ticketR = (senateWinner === "R" ? 1 : 0) + asmSeats.R;
  const ticketSummary = `D ${ticketD} / R ${ticketR}`;

  return {
    rows,
    district: {
      baseline: baselineAsm,
      scenario: asmTotals,
      votesNeededToElectOne,
      votesNeededToElectBoth,
      electsOne: votesNeededToElectOne === 0,
      electsBoth: votesNeededToElectBoth === 0,
      netSlateGain: asmTotals.slateMarginVotes - baselineAsm.slateMarginVotes,
      finishers,
      seats: asmSeats,
      secondSeatMargin,
      senate: {
        baseline: baselineSen,
        scenario: senTotals,
        votesNeededD: senVotesNeededD,
        votesNeededR: senVotesNeededR,
        electsD: senateElectsD,
        netGain: senTotals.marginVotes - baselineSen.marginVotes,
      },
      ticket: {
        D: ticketD,
        R: ticketR,
        senateWinner,
        summary: ticketSummary,
      },
    },
  };
}

function accModeAsm(a: ModeBreakdown, b: ModeBreakdown) {
  a.ed += b.ed; a.early += b.early; a.vbm += b.vbm;
}

function finalizeAsm(t: AssemblyTotals) {
  t.demSlate = t.dA + t.dB;
  t.repSlate = t.rA + t.rB;
  t.totalSlateVotes = t.demSlate + t.repSlate + t.other;
  t.slateMarginVotes = t.demSlate - t.repSlate;
  t.slateMarginPct =
    t.totalSlateVotes === 0 ? 0 : (t.slateMarginVotes / t.totalSlateVotes) * 100;
}

function finalizeSen(t: SenateTotals) {
  const tot = t.d + t.r + t.other;
  t.marginVotes = t.d - t.r;
  t.marginPct = tot === 0 ? 0 : (t.marginVotes / tot) * 100;
}

function computeFinishers(s: AssemblyTotals): CandidateFinisher[] {
  const list: Array<Omit<CandidateFinisher, "rank" | "seated">> = [
    { id: "dA", party: "D", votes: s.dA },
    { id: "dB", party: "D", votes: s.dB },
    { id: "rA", party: "R", votes: s.rA },
    { id: "rB", party: "R", votes: s.rB },
  ];
  list.sort((a, b) => b.votes - a.votes);
  return list.map((f, i) => ({ ...f, rank: (i + 1) as 1 | 2 | 3 | 4, seated: i < 2 }));
}

export function calculateVotesNeededToElectOne(d: DistrictResult): number {
  return d.votesNeededToElectOne;
}
export function calculateVotesNeededToElectBoth(d: DistrictResult): number {
  return d.votesNeededToElectBoth;
}

/** Bullet vote impact on Assembly D-slate margin (assembly-only effect). */
export function calculateBulletVoteImpact(
  precincts: PrecinctBaseline[],
  a: ScenarioAssumptions,
): number {
  const withIt = calculateScenarioResult(precincts, a).district.scenario.slateMarginVotes;
  const without = calculateScenarioResult(precincts, { ...a, bulletVoteRate: 0 }).district.scenario.slateMarginVotes;
  return withIt - without;
}

/** Split-ticket impact on Assembly D-slate margin (assembly-only effect). */
export function calculateSplitTicketImpact(
  precincts: PrecinctBaseline[],
  a: ScenarioAssumptions,
): number {
  const withIt = calculateScenarioResult(precincts, a).district.scenario.slateMarginVotes;
  const without = calculateScenarioResult(precincts, { ...a, splitTicketRate: 0 }).district.scenario.slateMarginVotes;
  return withIt - without;
}

/** Per-mode contribution to scenario D-slate margin (Assembly). */
export function calculateVoteModeImpact(rows: PrecinctRow[]): ModeBreakdown {
  const out = emptyModeBreakdown();
  for (const r of rows) {
    out.ed += r.scenario.modeDemSlate.ed - r.scenario.modeRepSlate.ed;
    out.early += r.scenario.modeDemSlate.early - r.scenario.modeRepSlate.early;
    out.vbm += r.scenario.modeDemSlate.vbm - r.scenario.modeRepSlate.vbm;
  }
  return out;
}

/** Per-mode contribution to Senate scenario D-margin. */
export function calculateSenateVoteModeImpact(rows: PrecinctRow[]): ModeBreakdown {
  const out = emptyModeBreakdown();
  for (const r of rows) {
    out.ed += r.senateScenario.modeDem.ed - r.senateScenario.modeRep.ed;
    out.early += r.senateScenario.modeDem.early - r.senateScenario.modeRep.early;
    out.vbm += r.senateScenario.modeDem.vbm - r.senateScenario.modeRep.vbm;
  }
  return out;
}

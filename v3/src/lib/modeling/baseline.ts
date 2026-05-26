// Baseline rollups: pure functions that derive district-level totals from
// the precinct list, with no scenario applied.

import type {
  PrecinctBaseline,
  SlateTotals,
  ModeBreakdown,
} from "../data/types";

export function emptyModeBreakdown(): ModeBreakdown {
  return { ed: 0, early: 0, vbm: 0 };
}

/** Roll up a list of precinct baselines into district-level slate totals. */
export function calculateBaselineSlateResult(
  precincts: PrecinctBaseline[],
): SlateTotals {
  const totals = blankSlateTotals();
  for (const p of precincts) {
    totals.dA += p.demA;
    totals.dB += p.demB;
    totals.rA += p.repA;
    totals.rB += p.repB;
    totals.other += p.other;
    totals.totalBallots += p.baselineTurnout;
    addMode(totals.modeDemSlate, p.modeDemSlate);
    addMode(totals.modeRepSlate, p.modeRepSlate);
    addMode(totals.modeTurnout, p.modeTurnout);
  }
  totals.demSlate = totals.dA + totals.dB;
  totals.repSlate = totals.rA + totals.rB;
  totals.totalSlateVotes = totals.demSlate + totals.repSlate + totals.other;
  totals.slateMarginVotes = totals.demSlate - totals.repSlate;
  totals.slateMarginPct =
    totals.totalSlateVotes === 0
      ? 0
      : (totals.slateMarginVotes / totals.totalSlateVotes) * 100;
  return totals;
}

/** Return votes for a specific candidate across the district under baseline. */
export function calculateCandidateResult(
  precincts: PrecinctBaseline[],
  candidateId: "dA" | "dB" | "rA" | "rB",
): number {
  let v = 0;
  for (const p of precincts) {
    if (candidateId === "dA") v += p.demA;
    else if (candidateId === "dB") v += p.demB;
    else if (candidateId === "rA") v += p.repA;
    else v += p.repB;
  }
  return v;
}

/** Average drop-off between A and B for each party, in votes. */
export function calculateCandidateDropoff(precincts: PrecinctBaseline[]): {
  dem: number;
  rep: number;
  demPct: number;
  repPct: number;
} {
  let dA = 0,
    dB = 0,
    rA = 0,
    rB = 0;
  for (const p of precincts) {
    dA += p.demA;
    dB += p.demB;
    rA += p.repA;
    rB += p.repB;
  }
  const dem = dA - dB;
  const rep = rA - rB;
  return {
    dem,
    rep,
    demPct: dA === 0 ? 0 : (dem / dA) * 100,
    repPct: rA === 0 ? 0 : (rep / rA) * 100,
  };
}

function addMode(a: ModeBreakdown, b: ModeBreakdown) {
  a.ed += b.ed;
  a.early += b.early;
  a.vbm += b.vbm;
}

export function blankSlateTotals(): SlateTotals {
  return {
    dA: 0,
    dB: 0,
    rA: 0,
    rB: 0,
    other: 0,
    demSlate: 0,
    repSlate: 0,
    totalBallots: 0,
    totalSlateVotes: 0,
    slateMarginVotes: 0,
    slateMarginPct: 0,
    modeDemSlate: emptyModeBreakdown(),
    modeRepSlate: emptyModeBreakdown(),
    modeTurnout: emptyModeBreakdown(),
  };
}

// Baseline rollups: pure functions that derive district-level totals from
// the precinct list, with no scenario applied. Covers Assembly slate and
// Senate single-seat race separately.

import type {
  AssemblyTotals,
  ModeBreakdown,
  PrecinctBaseline,
  SenateTotals,
} from "../data/types";

export function emptyModeBreakdown(): ModeBreakdown {
  return { ed: 0, early: 0, vbm: 0 };
}

export function blankAssemblyTotals(): AssemblyTotals {
  return {
    dA: 0, dB: 0, rA: 0, rB: 0, other: 0,
    demSlate: 0, repSlate: 0,
    totalBallots: 0, totalSlateVotes: 0,
    slateMarginVotes: 0, slateMarginPct: 0,
    modeDemSlate: emptyModeBreakdown(),
    modeRepSlate: emptyModeBreakdown(),
    modeTurnout: emptyModeBreakdown(),
  };
}

export function blankSenateTotals(): SenateTotals {
  return {
    d: 0, r: 0, other: 0,
    totalBallots: 0,
    marginVotes: 0, marginPct: 0,
    modeDem: emptyModeBreakdown(),
    modeRep: emptyModeBreakdown(),
    modeTurnout: emptyModeBreakdown(),
  };
}

/** Roll up Assembly baselines into district-level slate totals. */
export function calculateBaselineSlateResult(
  precincts: PrecinctBaseline[],
): AssemblyTotals {
  const t = blankAssemblyTotals();
  for (const p of precincts) {
    t.dA += p.demA; t.dB += p.demB;
    t.rA += p.repA; t.rB += p.repB;
    t.other += p.other;
    t.totalBallots += p.baselineTurnout;
    addMode(t.modeDemSlate, p.modeDemSlate);
    addMode(t.modeRepSlate, p.modeRepSlate);
    addMode(t.modeTurnout, p.modeTurnout);
  }
  t.demSlate = t.dA + t.dB;
  t.repSlate = t.rA + t.rB;
  t.totalSlateVotes = t.demSlate + t.repSlate + t.other;
  t.slateMarginVotes = t.demSlate - t.repSlate;
  t.slateMarginPct =
    t.totalSlateVotes === 0 ? 0 : (t.slateMarginVotes / t.totalSlateVotes) * 100;
  return t;
}

/** Roll up Senate baselines into district-level totals. */
export function calculateBaselineSenateResult(
  precincts: PrecinctBaseline[],
): SenateTotals {
  const t = blankSenateTotals();
  for (const p of precincts) {
    t.d += p.senD; t.r += p.senR; t.other += p.senOther;
    t.totalBallots += p.senTurnout;
    addMode(t.modeDem, p.senModeDem);
    addMode(t.modeRep, p.senModeRep);
    addMode(t.modeTurnout, p.senModeTurnout);
  }
  t.marginVotes = t.d - t.r;
  const totalVotes = t.d + t.r + t.other;
  t.marginPct = totalVotes === 0 ? 0 : (t.marginVotes / totalVotes) * 100;
  return t;
}

/** Return votes for a specific candidate across the district under baseline. */
export function calculateCandidateResult(
  precincts: PrecinctBaseline[],
  candidateId: "dA" | "dB" | "rA" | "rB" | "senD" | "senR",
): number {
  let v = 0;
  for (const p of precincts) {
    switch (candidateId) {
      case "dA": v += p.demA; break;
      case "dB": v += p.demB; break;
      case "rA": v += p.repA; break;
      case "rB": v += p.repB; break;
      case "senD": v += p.senD; break;
      case "senR": v += p.senR; break;
    }
  }
  return v;
}

/** Average Assembly drop-off between A and B for each party. */
export function calculateCandidateDropoff(precincts: PrecinctBaseline[]): {
  dem: number; rep: number; demPct: number; repPct: number;
} {
  let dA = 0, dB = 0, rA = 0, rB = 0;
  for (const p of precincts) {
    dA += p.demA; dB += p.demB;
    rA += p.repA; rB += p.repB;
  }
  const dem = dA - dB;
  const rep = rA - rB;
  return {
    dem, rep,
    demPct: dA === 0 ? 0 : (dem / dA) * 100,
    repPct: rA === 0 ? 0 : (rep / rA) * 100,
  };
}

function addMode(a: ModeBreakdown, b: ModeBreakdown) {
  a.ed += b.ed; a.early += b.early; a.vbm += b.vbm;
}

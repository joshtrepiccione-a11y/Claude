// Baseline rollups: pure functions that derive county-level totals from
// the precinct list, with no scenario applied.

import type { ModeBreakdown, PrecinctBaseline, RaceTotals } from "../data/types";

export function emptyModeBreakdown(): ModeBreakdown {
  return { ed: 0, early: 0, vbm: 0 };
}

export function blankRaceTotals(): RaceTotals {
  return {
    d: 0, r: 0, other: 0,
    totalBallots: 0,
    marginVotes: 0, marginPct: 0,
    modeDem: emptyModeBreakdown(),
    modeRep: emptyModeBreakdown(),
    modeTurnout: emptyModeBreakdown(),
  };
}

/** Roll up Clerk baselines into county-level totals. */
export function calculateBaselineResult(precincts: PrecinctBaseline[]): RaceTotals {
  const t = blankRaceTotals();
  for (const p of precincts) {
    t.d += p.d; t.r += p.r; t.other += p.other;
    t.totalBallots += p.turnout;
    addMode(t.modeDem, p.modeDem);
    addMode(t.modeRep, p.modeRep);
    addMode(t.modeTurnout, p.modeTurnout);
  }
  t.marginVotes = t.d - t.r;
  const totalVotes = t.d + t.r + t.other;
  t.marginPct = totalVotes === 0 ? 0 : (t.marginVotes / totalVotes) * 100;
  return t;
}

/** Return votes for a specific candidate across the county under baseline. */
export function calculateCandidateResult(
  precincts: PrecinctBaseline[],
  candidateId: "clerkD" | "clerkR",
): number {
  let v = 0;
  for (const p of precincts) {
    v += candidateId === "clerkD" ? p.d : p.r;
  }
  return v;
}

function addMode(a: ModeBreakdown, b: ModeBreakdown) {
  a.ed += b.ed; a.early += b.early; a.vbm += b.vbm;
}

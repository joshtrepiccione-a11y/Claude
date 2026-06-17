// Target ranking: sort precincts by strategic value to the campaign under
// the active scenario. Deterministic — same inputs always yield same order.
// R-perspective: net-vote opportunity is net votes toward O'Donoghue.

import type { PrecinctRow } from "../data/types";
import { THRESHOLDS } from "../data/config";

export interface TargetRow extends PrecinctRow {
  rank: number;
}

export function rankTargetPrecincts(rows: PrecinctRow[]): TargetRow[] {
  // Filter to precincts with enough opportunity to matter.
  const filtered = rows.filter(
    (r) => r.netVoteOpportunity >= THRESHOLDS.minNetVoteOpportunity,
  );

  // Sort by net vote opportunity, then persuasion score as a tiebreaker.
  const sorted = filtered.sort((a, b) => {
    if (b.netVoteOpportunity !== a.netVoteOpportunity)
      return b.netVoteOpportunity - a.netVoteOpportunity;
    return b.persuasionScore - a.persuasionScore;
  });

  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}

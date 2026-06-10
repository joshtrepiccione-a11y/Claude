// Realism scoring: convert a ScenarioAssumptions + CountyResult into a
// qualitative bucket so users can sanity-check whether a path is plausible.

import type { CountyResult, PrecinctRow, ScenarioAssumptions } from "../data/types";

export type RealismBucket =
  | "Conservative"
  | "Plausible"
  | "Medium-High"
  | "Aggressive"
  | "Fantasy";

export interface RealismResult {
  bucket: RealismBucket;
  score: number; // 0 (most realistic) to 100 (least realistic)
  factors: Array<{ label: string; weight: number; note: string }>;
}

export function scoreScenarioRealism(
  a: ScenarioAssumptions,
  c: CountyResult,
  rows: PrecinctRow[],
): RealismResult {
  const factors: RealismResult["factors"] = [];

  // 1. Magnitude of county-wide swing.
  const swingPP = Math.abs(a.demSwing - a.repSwing);
  factors.push({
    label: "County swing",
    weight: Math.min(40, swingPP * 3.5),
    note: `${swingPP.toFixed(1)} pp county-wide swing`,
  });

  // 2. Required turnout change.
  factors.push({
    label: "Turnout change",
    weight: Math.min(20, Math.abs(a.turnoutDelta) * 100),
    note: `${(a.turnoutDelta * 100).toFixed(1)}% turnout change`,
  });

  // 3. Vote-mode margin swings.
  const modeSwingMag =
    Math.abs(a.vbmMarginSwing) + Math.abs(a.earlyMarginSwing) + Math.abs(a.edMarginSwing);
  factors.push({
    label: "Vote-mode swings",
    weight: Math.min(20, modeSwingMag * 1.2),
    note: `Σ|mode swing|=${modeSwingMag.toFixed(1)} pp`,
  });

  // 4. Number of precincts that need improvement vs. baseline.
  const improvingPrecincts = rows.filter((r) => r.netVoteOpportunity > 25).length;
  factors.push({
    label: "Precincts requiring lift",
    weight: Math.min(15, (improvingPrecincts / Math.max(1, rows.length)) * 30),
    note: `${improvingPrecincts}/${rows.length} precincts swing >25 D net`,
  });

  // 5. Reliance on opposition strongholds (large lifts in R+10 precincts).
  const strongholdLifts = rows.filter(
    (r) => r.baselineMarginPct <= -10 && r.netVoteOpportunity > 20,
  ).length;
  factors.push({
    label: "Reliance on R strongholds",
    weight: Math.min(15, strongholdLifts * 1.5),
    note: `${strongholdLifts} R+10 precincts asked to swing`,
  });

  // 6. Penalize wins that depend on a razor-thin county margin
  // (low confidence even if technically winning).
  if (c.electsD && c.scenario.marginVotes < 250 && c.scenario.marginVotes > 0) {
    factors.push({
      label: "Win fragility",
      weight: 8,
      note: `County margin only ${Math.round(c.scenario.marginVotes)} votes`,
    });
  }

  const score = clamp(
    factors.reduce((s, f) => s + f.weight, 0),
    0,
    100,
  );

  let bucket: RealismBucket;
  if (score < 12) bucket = "Conservative";
  else if (score < 28) bucket = "Plausible";
  else if (score < 50) bucket = "Medium-High";
  else if (score < 75) bucket = "Aggressive";
  else bucket = "Fantasy";

  return { bucket, score, factors };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

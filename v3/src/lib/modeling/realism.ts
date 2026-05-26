// Realism scoring: convert a ScenarioAssumptions + DistrictResult into a
// qualitative bucket so users can sanity-check whether a path is plausible.

import type {
  DistrictResult,
  PrecinctRow,
  ScenarioAssumptions,
} from "../data/types";

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
  d: DistrictResult,
  rows: PrecinctRow[],
): RealismResult {
  const factors: RealismResult["factors"] = [];

  // 1. Magnitude of districtwide swing — penalise the LARGER of the two
  // race swings (whichever is more aggressive sets the ceiling).
  const asmSwingPP = Math.abs(a.asmDemSwing - a.asmRepSwing);
  const senSwingPP = Math.abs(a.senDemSwing - a.senRepSwing);
  const totalSwingPP = Math.max(asmSwingPP, senSwingPP);
  factors.push({
    label: "District swing",
    weight: Math.min(40, totalSwingPP * 3.5),
    note: `max(${asmSwingPP.toFixed(1)} pp Asm, ${senSwingPP.toFixed(1)} pp Sen)`,
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

  // 4. Bullet vote + split-ticket assumptions (Assembly-only).
  // Note: the bullet-vote model in scenario.ts applies the penalty
  // symmetrically across parties; in reality bullet voting tends to hurt
  // the trailing candidate of the leading party more. High bullet rates
  // here are flagged as fragile by design.
  factors.push({
    label: "Bullet & split assumptions",
    weight: Math.min(10, a.bulletVoteRate * 25 + a.splitTicketRate * 25),
    note: `bullet=${(a.bulletVoteRate * 100).toFixed(0)}%, split=${(a.splitTicketRate * 100).toFixed(0)}% (Asm only)`,
  });

  // 5. Number of precincts that need improvement vs. baseline.
  const improvingPrecincts = rows.filter((r) => r.netVoteOpportunity > 25).length;
  factors.push({
    label: "Precincts requiring lift",
    weight: Math.min(15, (improvingPrecincts / Math.max(1, rows.length)) * 30),
    note: `${improvingPrecincts}/${rows.length} precincts swing >25 D net`,
  });

  // 6. Reliance on opposition strongholds (large lifts in R+10 precincts).
  const strongholdLifts = rows.filter(
    (r) => r.baselineSlateMarginPct <= -10 && r.netVoteOpportunity > 20,
  ).length;
  factors.push({
    label: "Reliance on R strongholds",
    weight: Math.min(15, strongholdLifts * 1.5),
    note: `${strongholdLifts} R+10 precincts asked to swing`,
  });

  // 7. Penalize wins that depend on the second-seat margin being razor-thin
  // (low confidence even if technically winning).
  if (d.electsOne && d.secondSeatMargin < 50 && d.secondSeatMargin > 0) {
    factors.push({
      label: "Second-seat fragility",
      weight: 8,
      note: `Second-seat margin only ${Math.round(d.secondSeatMargin)} votes`,
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

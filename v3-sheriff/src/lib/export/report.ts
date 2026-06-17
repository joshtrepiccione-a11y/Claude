// Plain-English memo generator. Outputs sit on top of the active scenario
// and the active baseline so memos always reflect the dashboard. R-perspective
// — built for O'Donoghue.

import { BASELINES, CANDIDATES, CONTEST } from "../data/config";
import type {
  BaselineId,
  CountyResult,
  PrecinctRow,
  ScenarioAssumptions,
  ScenarioPreset,
} from "../data/types";
import { rankTargetPrecincts } from "../modeling/targets";
import { calculateVoteModeImpact } from "../modeling/scenario";
import { scoreScenarioRealism } from "../modeling/realism";

export interface MemoSection {
  title: string;
  body: string;
}

export interface Memo {
  generatedAt: string;
  scenarioName: string;
  sections: MemoSection[];
}

const D = CANDIDATES.find((c) => c.id === "sheriffD")!;
const R = CANDIDATES.find((c) => c.id === "sheriffR")!;

function baselineLabel(id: BaselineId): string {
  return BASELINES.find((b) => b.id === id)?.label ?? id;
}

export function generateMemo(
  scenario: ScenarioPreset | null,
  assumptions: ScenarioAssumptions,
  county: CountyResult,
  rows: PrecinctRow[],
  baselineId: BaselineId,
  tEnv: number,
): Memo {
  const targets = rankTargetPrecincts(rows).slice(0, 10);
  const realism = scoreScenarioRealism(assumptions, county, rows);
  const modeImpact = calculateVoteModeImpact(rows);
  const scName = scenario ? scenario.name : "Custom Scenario";

  const sections: MemoSection[] = [];

  // 1. Executive Summary
  sections.push({
    title: "Executive Summary",
    body: executiveSummary(scName, county, modeImpact, realism.bucket),
  });

  // 2. Baseline Position
  sections.push({
    title: "Baseline Position",
    body:
      `Active baseline: ${baselineLabel(baselineId)}` +
      (baselineId === "projected2026" ? ` (turnout environment ${tEnv.toFixed(2)})` : "") +
      `. Baseline county margin ${signed(county.baseline.marginVotes)} votes ` +
      `(${county.baseline.marginPct.toFixed(1)} pp, R-perspective). Across ${rows.length} precincts.`,
  });

  // 3. Active Scenario
  sections.push({
    title: "Active Scenario",
    body:
      `Under "${scName}", projected Sheriff margin is ` +
      `${signed(county.scenario.marginVotes)} votes ` +
      `(${county.scenario.marginPct.toFixed(1)} pp R). ` +
      (scenario?.description ?? "Custom assumptions applied across the model."),
  });

  // 4. Votes to Hold
  sections.push({
    title: "Votes to Hold the Seat",
    body: county.electsR
      ? `${R.shortLabel} holds the seat in this scenario by ${Math.abs(Math.round(county.scenario.marginVotes)).toLocaleString()} votes.`
      : `${R.shortLabel} needs ${county.votesNeededR.toLocaleString()} additional net votes to overtake ${D.shortLabel}.`,
  });

  // 5. Top Municipalities
  const byMuni = new Map<string, number>();
  for (const r of rows) {
    byMuni.set(r.baseline.municipality, (byMuni.get(r.baseline.municipality) ?? 0) + r.netVoteOpportunity);
  }
  const topMunis = [...byMuni.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  sections.push({
    title: "Top Municipalities",
    body:
      `Five municipalities with the largest net R vote opportunity under this scenario: ` +
      topMunis.map(([m, v]) => `${m} (${signed(Math.round(v))})`).join(", ") + ".",
  });

  // 6. Top Target Precincts
  sections.push({
    title: "Top Target Precincts",
    body:
      `Top targets by net R opportunity: ` +
      targets
        .slice(0, 5)
        .map(
          (t) =>
            `${t.baseline.precinctName} (${t.baseline.municipality}, ${signed(Math.round(t.netVoteOpportunity))} net R, ${t.action})`,
        )
        .join("; ") + ".",
  });

  // 7. Turnout Sensitivity
  const eroding = rows
    .slice()
    .sort((a, b) => b.turnoutSensitivity - a.turnoutSensitivity)
    .slice(0, 5);
  sections.push({
    title: "Turnout Sensitivity",
    body:
      `Where O'Donoghue's 2023 off-year cushion erodes most under presidential turnout ` +
      `(2023 R-margin minus 2020 R-margin): ` +
      eroding
        .map((t) => `${t.baseline.precinctName} (${signed(Math.round(t.turnoutSensitivity))} pp)`)
        .join(", ") +
      `. These are the precincts that turn a Hold into a Threat as turnout rises.`,
  });

  // 8. Vote Mode Strategy
  sections.push({
    title: "Vote Mode Strategy",
    body:
      `Mode contributions to the R margin: ` +
      `VBM ${signed(Math.round(modeImpact.vbm))}, ` +
      `Early Vote ${signed(Math.round(modeImpact.early))}, ` +
      `Election Day ${signed(Math.round(modeImpact.ed))}. ` +
      `Focus mode: ${focusMode(modeImpact)}.`,
  });

  // 9. Race Mechanics
  sections.push({
    title: "Race Mechanics",
    body:
      `Single-seat county-wide race (${CONTEST.termYears}-year term, Election Day ${CONTEST.electionDay}). ` +
      `${D.label}: ${Math.round(county.scenario.d).toLocaleString()} votes. ` +
      `${R.label}: ${Math.round(county.scenario.r).toLocaleString()} votes. ` +
      `Margin: ${signed(county.scenario.marginVotes)} votes (R-perspective). ` +
      `${county.electsR ? `Projected ${R.shortLabel} win.` : `${R.shortLabel} needs ${county.votesNeededR.toLocaleString()} additional votes.`}`,
  });

  // 10. Scenario Realism
  sections.push({
    title: "Scenario Realism",
    body:
      `Realism rating: ${realism.bucket} (score ${Math.round(realism.score)}/100). ` +
      `Largest contributing factors: ` +
      realism.factors
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3)
        .map((f) => `${f.label} (${f.note})`)
        .join("; ") + ".",
  });

  // 11. Risks
  sections.push({
    title: "Risks",
    body: risks(county, assumptions),
  });

  // 12. Recommended Next Steps
  sections.push({
    title: "Recommended Next Steps",
    body:
      `Prioritize ${focusMode(modeImpact)} programming in the top ${Math.min(10, targets.length)} precincts. ` +
      `Bank Republican base turnout in the mainland strongholds (Hamilton, Galloway, Egg Harbor Township, Hammonton) ` +
      `while running damage control in Atlantic City and Pleasantville. ` +
      `Watch VBM and early-vote return rates weekly — mail is the Democrats' strongest mode in this county and the main threat as turnout rises.`,
  });

  // 13. Methodology
  sections.push({
    title: "Data Methodology",
    body:
      `Baselines are calibrated to certified municipality-level totals for the 2020 Sheriff, ` +
      `2023 Sheriff, and 2025 Governor races, distributed across precincts using the 2024 ` +
      `presidential spatial pattern with a uniform within-municipality shift. The projected-2026 ` +
      `baseline interpolates per precinct between the 2023 and 2020 layers. ` +
      `Scenario outputs are deterministic transformations of the selected baseline. ` +
      `Outputs are a model, not a prediction.`,
  });

  return {
    generatedAt: new Date().toISOString(),
    scenarioName: scName,
    sections,
  };
}

function focusMode(m: { ed: number; early: number; vbm: number }): string {
  const arr: Array<[string, number]> = [
    ["Vote by Mail", m.vbm],
    ["Early Vote", m.early],
    ["Election Day", m.ed],
  ];
  arr.sort((a, b) => b[1] - a[1]);
  return arr[0][0];
}

function risks(c: CountyResult, a: ScenarioAssumptions): string {
  const r: string[] = [];
  if (Math.abs(a.repSwing - a.demSwing) > 4)
    r.push("County-wide swing is large and may not be sustainable.");
  if (a.turnoutDelta > 0.07) r.push("Turnout assumption exceeds 7% above baseline.");
  if (c.electsR && Math.abs(c.scenario.marginVotes) < 250)
    r.push("Projected margin is narrow; reasonable variance could flip the race.");
  if (!c.electsR && c.votesNeededR > 8000)
    r.push("The remaining gap exceeds 8,000 votes — comparable to the full 2020 presidential-turnout deficit. Treat this scenario as a stress case, not a plan.");
  if (r.length === 0) r.push("No major scenario risks flagged.");
  return r.join(" ");
}

function signed(v: number): string {
  return (v >= 0 ? "+" : "") + Math.round(v).toLocaleString();
}

function executiveSummary(
  name: string,
  c: CountyResult,
  m: { ed: number; early: number; vbm: number },
  bucket: string,
): string {
  const focus = focusMode(m);
  const outcome = c.electsR
    ? `holds the Sheriff's office by ${Math.abs(Math.round(c.scenario.marginVotes)).toLocaleString()} votes`
    : `falls ${c.votesNeededR.toLocaleString()} votes short of ${D.shortLabel}`;
  return (
    `Under the ${name} scenario, ${R.label} ${outcome}. ` +
    `The largest modeled gain comes from ${focus}. Path rated ${bucket} difficulty.`
  );
}

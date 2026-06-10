// Plain-English memo generator. Outputs sit on top of the active scenario
// so memos always reflect the data the user sees in the dashboard.

import { CANDIDATES, CONTEST } from "../data/config";
import type {
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

const D = CANDIDATES.find((c) => c.id === "clerkD")!;
const R = CANDIDATES.find((c) => c.id === "clerkR")!;

export function generateMemo(
  scenario: ScenarioPreset | null,
  assumptions: ScenarioAssumptions,
  county: CountyResult,
  rows: PrecinctRow[],
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
      `The model is calibrated to the certified ${CONTEST.baseline.cycle} County Clerk result: ` +
      `${CONTEST.baseline.rCandidate} ${CONTEST.baseline.rVotes.toLocaleString()} / ` +
      `${CONTEST.baseline.dCandidate} ${CONTEST.baseline.dVotes.toLocaleString()} ` +
      `(baseline margin ${signed(county.baseline.marginVotes)} votes, ` +
      `${county.baseline.marginPct.toFixed(1)} pp). Across ${rows.length} precincts.`,
  });

  // 3. Active Scenario
  sections.push({
    title: "Active Scenario",
    body:
      `Under "${scName}", projected Clerk margin is ` +
      `${signed(county.scenario.marginVotes)} votes ` +
      `(${county.scenario.marginPct.toFixed(1)} pp). ` +
      (scenario?.description ?? "Custom assumptions applied across the model."),
  });

  // 4. Votes Needed
  sections.push({
    title: "Votes Needed",
    body: county.electsD
      ? `${D.shortLabel} wins this scenario by ${Math.abs(Math.round(county.scenario.marginVotes)).toLocaleString()} votes.`
      : `${D.shortLabel} needs ${county.votesNeededD.toLocaleString()} additional net votes to overtake ${R.shortLabel}.`,
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
      `Five municipalities with the largest D net-vote opportunity under this scenario: ` +
      topMunis.map(([m, v]) => `${m} (${signed(Math.round(v))})`).join(", ") + ".",
  });

  // 6. Top Target Precincts
  sections.push({
    title: "Top Target Precincts",
    body:
      `Top targets by net D opportunity: ` +
      targets
        .slice(0, 5)
        .map(
          (t) =>
            `${t.baseline.precinctName} (${t.baseline.municipality}, ${signed(Math.round(t.netVoteOpportunity))} net D, ${t.action})`,
        )
        .join("; ") + ".",
  });

  // 7. Vote Mode Strategy
  sections.push({
    title: "Vote Mode Strategy",
    body:
      `Mode contributions to the Clerk margin: ` +
      `VBM ${signed(Math.round(modeImpact.vbm))}, ` +
      `Early Vote ${signed(Math.round(modeImpact.early))}, ` +
      `Election Day ${signed(Math.round(modeImpact.ed))}. ` +
      `Focus mode: ${focusMode(modeImpact)}.`,
  });

  // 8. Race Mechanics
  sections.push({
    title: "Race Mechanics",
    body:
      `Single-seat county-wide race (${CONTEST.termYears}-year term). ` +
      `${D.label}: ${Math.round(county.scenario.d).toLocaleString()} votes. ` +
      `${R.label}: ${Math.round(county.scenario.r).toLocaleString()} votes. ` +
      `Margin: ${signed(county.scenario.marginVotes)} votes. ` +
      `${county.electsD ? `Projected ${D.shortLabel} win.` : `${D.shortLabel} needs ${county.votesNeededD.toLocaleString()} additional votes.`}`,
  });

  // 9. Scenario Realism
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

  // 10. Risks
  sections.push({
    title: "Risks",
    body: risks(county, assumptions),
  });

  // 11. Recommended Next Steps
  sections.push({
    title: "Recommended Next Steps",
    body:
      `Prioritize ${focusMode(modeImpact)} programming in the top ${Math.min(10, targets.length)} precincts. ` +
      `Anchor the program in the competitive mainland municipalities while protecting the Atlantic City / Pleasantville base. ` +
      `Track VBM return rates weekly — the baseline shows mail ballots are the strongest Democratic mode in this county.`,
  });

  // 12. Methodology
  sections.push({
    title: "Data Methodology",
    body:
      `Baseline figures are calibrated to the certified ${CONTEST.baseline.cycle} County Clerk county totals, ` +
      `distributed across precincts using the 2024 presidential spatial pattern with a uniform county-wide shift. ` +
      `Scenario outputs are deterministic transformations of the baseline. ` +
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
  if (Math.abs(a.demSwing - a.repSwing) > 4)
    r.push("County-wide swing is large and may not be sustainable.");
  if (a.turnoutDelta > 0.07) r.push("Turnout assumption exceeds 7% above baseline.");
  if (c.electsD && Math.abs(c.scenario.marginVotes) < 250)
    r.push("Projected margin is narrow; reasonable variance could flip the race back.");
  if (!c.electsD && c.votesNeededD > 8000)
    r.push("The remaining gap exceeds 8,000 votes — comparable to the entire 2021 deficit. Treat this scenario as a building block, not a finish line.");
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
  const outcome = c.electsD
    ? `wins the County Clerk race by ${Math.abs(Math.round(c.scenario.marginVotes)).toLocaleString()} votes`
    : `falls ${c.votesNeededD.toLocaleString()} votes short of ${R.shortLabel}`;
  return (
    `Under the ${name} scenario, ${D.label} ${outcome}. ` +
    `The largest modeled gain comes from ${focus}. Path rated ${bucket} difficulty.`
  );
}

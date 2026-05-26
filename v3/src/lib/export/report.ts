// Plain-English memo generator. Outputs sit on top of the active scenario
// so memos always reflect the data the user sees in the dashboard.

import { CANDIDATES, DISTRICT } from "../data/config";
import type {
  DistrictResult,
  PrecinctRow,
  ScenarioAssumptions,
  ScenarioPreset,
} from "../data/types";
import { rankTargetPrecincts } from "../modeling/targets";
import {
  calculateVoteModeImpact,
} from "../modeling/scenario";
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

export function generateMemo(
  scenario: ScenarioPreset | null,
  assumptions: ScenarioAssumptions,
  district: DistrictResult,
  rows: PrecinctRow[],
): Memo {
  const targets = rankTargetPrecincts(rows).slice(0, 10);
  const realism = scoreScenarioRealism(assumptions, district, rows);
  const modeImpact = calculateVoteModeImpact(rows);
  const scName = scenario ? scenario.name : "Custom Scenario";

  const sections: MemoSection[] = [];

  // 1. Executive Summary
  sections.push({
    title: "Executive Summary",
    body: executiveSummary(scName, district, modeImpact, realism.bucket),
  });

  // 2. Baseline Position
  sections.push({
    title: "Baseline Position",
    body:
      `The baseline slate margin is ${signed(district.baseline.slateMarginVotes)} votes ` +
      `(${district.baseline.slateMarginPct.toFixed(1)} pp). The Democratic slate received ` +
      `${Math.round(district.baseline.demSlate).toLocaleString()} votes and the Republican slate ` +
      `${Math.round(district.baseline.repSlate).toLocaleString()} votes across the district's ` +
      `${rows.length} precincts.`,
  });

  // 3. Active Scenario
  sections.push({
    title: "Active Scenario",
    body:
      `Under the "${scName}" scenario, the projected slate margin is ` +
      `${signed(district.scenario.slateMarginVotes)} votes ` +
      `(${district.scenario.slateMarginPct.toFixed(1)} pp). ` +
      (scenario?.description ?? "Custom assumptions applied across the model."),
  });

  // 4. Votes Needed
  sections.push({
    title: "Votes Needed",
    body:
      district.electsBoth
        ? `Both Democratic Assembly candidates are projected to win under this scenario, with a second-seat margin of ${Math.round(district.secondSeatMargin)} votes.`
        : district.electsOne
        ? `One Democratic Assembly candidate wins. ${district.votesNeededToElectBoth} additional votes are needed to elect the second.`
        : `${district.votesNeededToElectOne} additional votes are required to elect one Democratic Assembly candidate. ${district.votesNeededToElectBoth} are required to elect both.`,
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
      `The five municipalities offering the largest net Democratic vote opportunity are: ` +
      topMunis.map(([m, v]) => `${m} (${signed(Math.round(v))})`).join(", ") + ".",
  });

  // 6. Top Target Precincts
  sections.push({
    title: "Top Target Precincts",
    body:
      `Top targets by net vote opportunity: ` +
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
      `Mode contributions to scenario slate margin: ` +
      `Vote by Mail ${signed(Math.round(modeImpact.vbm))}, ` +
      `Early Vote ${signed(Math.round(modeImpact.early))}, ` +
      `Election Day ${signed(Math.round(modeImpact.ed))}. ` +
      `Focus mode: ${focusMode(modeImpact)}.`,
  });

  // 8. Assembly Candidate Mechanics
  const dA = CANDIDATES.find((c) => c.id === "dA")!.label;
  const dB = CANDIDATES.find((c) => c.id === "dB")!.label;
  sections.push({
    title: "Assembly Candidate Mechanics",
    body:
      `Projected order of finish: ` +
      district.finishers
        .map((f) => `${f.rank}. ${labelFor(f.id)} — ${Math.round(f.votes).toLocaleString()}`)
        .join("; ") +
      `. Projected seats: D ${district.seats.D}, R ${district.seats.R}. ` +
      `Drop-off between ${dA} and ${dB} in the scenario: ` +
      `${Math.round(Math.abs(district.scenario.dA - district.scenario.dB))} votes.`,
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
    body: risks(district, assumptions),
  });

  // 11. Recommended Next Steps
  sections.push({
    title: "Recommended Next Steps",
    body:
      `Prioritize ${focusMode(modeImpact)} programming in the top ${Math.min(10, targets.length)} precincts. ` +
      `Reduce A/B candidate drop-off through joint visibility and mail. Continue tracking realism factors as new data is added.`,
  });

  // 12. Methodology
  sections.push({
    title: "Data Methodology",
    body:
      `Baseline figures use modeled precinct totals for the ${DISTRICT.year} ${DISTRICT.chamber} race. ` +
      `Scenario outputs are deterministic transformations of the baseline using the assumptions shown on the Scenarios tab. ` +
      `Outputs are a model, not a prediction.`,
  });

  return {
    generatedAt: new Date().toISOString(),
    scenarioName: scName,
    sections,
  };
}

function focusMode(m: { ed: number; early: number; vbm: number }): string {
  const arr = [
    ["Vote by Mail", m.vbm],
    ["Early Vote", m.early],
    ["Election Day", m.ed],
  ] as const;
  arr.slice().sort((a, b) => b[1] - a[1]);
  const sorted = arr.slice().sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

function risks(d: DistrictResult, a: ScenarioAssumptions): string {
  const r: string[] = [];
  if (Math.abs(a.demSlateSwing - a.repSlateSwing) > 4)
    r.push("Districtwide swing is large and may not be sustainable.");
  if (a.turnoutDelta > 0.07)
    r.push("Turnout assumption is more than 7% above baseline.");
  if (a.bulletVoteRate > 0.15)
    r.push("Bullet voting at this rate would meaningfully suppress slate totals.");
  if (d.secondSeatMargin > 0 && d.secondSeatMargin < 80)
    r.push("Second-seat margin is razor-thin; reasonable variance could flip it back.");
  if (r.length === 0) r.push("No major scenario risks flagged.");
  return r.join(" ");
}

function labelFor(id: "dA" | "dB" | "rA" | "rB"): string {
  return CANDIDATES.find((c) => c.id === id)?.label ?? id;
}

function signed(v: number): string {
  return (v >= 0 ? "+" : "") + Math.round(v).toLocaleString();
}

function executiveSummary(
  name: string,
  d: DistrictResult,
  m: { ed: number; early: number; vbm: number },
  bucket: string,
): string {
  const focus = focusMode(m);
  if (d.electsBoth) {
    return `Under the ${name} scenario, the Democratic Assembly slate elects both candidates with a second-seat margin of ${Math.round(d.secondSeatMargin)} votes. The largest modeled gain comes from ${focus}. The path is rated ${bucket} difficulty.`;
  }
  if (d.electsOne) {
    return `Under the ${name} scenario, the Democratic Assembly slate elects one candidate. An additional ${d.votesNeededToElectBoth} votes would be needed to elect both. The largest modeled gain comes from ${focus}. The path is rated ${bucket} difficulty.`;
  }
  return `Under the ${name} scenario, the Democratic Assembly slate falls ${d.votesNeededToElectOne} votes short of electing one candidate. The largest modeled gain comes from ${focus}. The path is rated ${bucket} difficulty.`;
}

// Plain-English memo generator. Outputs sit on top of the active scenario
// so memos always reflect the data the user sees in the dashboard.
// Covers both the Senate race and the Assembly race, plus the full ticket.

import { CANDIDATES, DISTRICT } from "../data/config";
import type {
  DistrictResult,
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
      `Assembly: baseline slate margin ${signed(district.baseline.slateMarginVotes)} votes ` +
      `(${district.baseline.slateMarginPct.toFixed(1)} pp). ` +
      `Senate: baseline margin ${signed(district.senate.baseline.marginVotes)} votes ` +
      `(${district.senate.baseline.marginPct.toFixed(1)} pp). ` +
      `Across ${rows.length} precincts.`,
  });

  // 3. Active Scenario
  sections.push({
    title: "Active Scenario",
    body:
      `Under "${scName}", projected Assembly slate margin is ` +
      `${signed(district.scenario.slateMarginVotes)} votes ` +
      `(${district.scenario.slateMarginPct.toFixed(1)} pp); projected Senate margin is ` +
      `${signed(district.senate.scenario.marginVotes)} votes ` +
      `(${district.senate.scenario.marginPct.toFixed(1)} pp). ` +
      (scenario?.description ?? "Custom assumptions applied across the model."),
  });

  // 4. Votes Needed
  sections.push({
    title: "Votes Needed",
    body:
      [
        senateVotesNeededLine(district),
        assemblyVotesNeededLine(district),
      ].join(" "),
  });

  // 5. Full Ticket Outcome (Senate + Assembly = 0..3 seats)
  sections.push({
    title: "Full Ticket Outcome",
    body:
      `Projected ticket: ${district.ticket.summary} (out of 3 seats). ` +
      `Senate winner: ${district.ticket.senateWinner === "tie" ? "Tie" : district.ticket.senateWinner === "D" ? "Democrat" : "Republican"}. ` +
      `Assembly seats: D ${district.seats.D} / R ${district.seats.R}.`,
  });

  // 6. Top Municipalities
  const byMuni = new Map<string, number>();
  for (const r of rows) {
    byMuni.set(r.baseline.municipality, (byMuni.get(r.baseline.municipality) ?? 0) + r.netVoteOpportunity);
  }
  const topMunis = [...byMuni.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  sections.push({
    title: "Top Municipalities",
    body:
      `Five municipalities with the largest combined Senate+Assembly D vote opportunity: ` +
      topMunis.map(([m, v]) => `${m} (${signed(Math.round(v))})`).join(", ") + ".",
  });

  // 7. Top Target Precincts
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

  // 8. Vote Mode Strategy
  sections.push({
    title: "Vote Mode Strategy",
    body:
      `Mode contributions to Assembly slate margin: ` +
      `VBM ${signed(Math.round(modeImpact.vbm))}, ` +
      `Early Vote ${signed(Math.round(modeImpact.early))}, ` +
      `Election Day ${signed(Math.round(modeImpact.ed))}. ` +
      `Focus mode: ${focusMode(modeImpact)}.`,
  });

  // 9. Assembly Candidate Mechanics
  sections.push({
    title: "Assembly Candidate Mechanics",
    body:
      `Projected order of finish: ` +
      district.finishers
        .map((f) => `${f.rank}. ${labelFor(f.id)} — ${Math.round(f.votes).toLocaleString()}`)
        .join("; ") +
      `. Assembly seats: D ${district.seats.D}, R ${district.seats.R}. ` +
      `Second-seat margin: ${signed(district.secondSeatMargin)}. ` +
      `Assembly drop-off between D candidates: ` +
      `${Math.round(Math.abs(district.scenario.dA - district.scenario.dB))} votes.`,
  });

  // 10. Senate Race Mechanics
  sections.push({
    title: "Senate Race Mechanics",
    body:
      `Single-seat (4-year) race. ` +
      `Democratic Senate candidate: ${Math.round(district.senate.scenario.d).toLocaleString()} votes. ` +
      `Republican Senate candidate: ${Math.round(district.senate.scenario.r).toLocaleString()} votes. ` +
      `Margin: ${signed(district.senate.scenario.marginVotes)} votes. ` +
      `${district.senate.electsD ? "Projected D win." : `D needs ${district.senate.votesNeededD} additional votes.`}`,
  });

  // 11. Scenario Realism
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

  // 12. Risks
  sections.push({
    title: "Risks",
    body: risks(district, assumptions),
  });

  // 13. Recommended Next Steps
  sections.push({
    title: "Recommended Next Steps",
    body:
      `Prioritize ${focusMode(modeImpact)} programming in the top ${Math.min(10, targets.length)} precincts. ` +
      `Reduce Assembly A/B drop-off through joint visibility and mail. ` +
      `Coordinate Senate and Assembly field operations since most plausible paths lift both races together.`,
  });

  // 14. Methodology
  sections.push({
    title: "Data Methodology",
    body:
      `Baseline figures use modeled precinct totals for the ${DISTRICT.year} Senate and Assembly races (4-year Senate term, 2-year Assembly terms). ` +
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

function senateVotesNeededLine(d: DistrictResult): string {
  if (d.senate.electsD) {
    return `Senate: projected D win by ${Math.abs(Math.round(d.senate.scenario.marginVotes))} votes.`;
  }
  return `Senate: D needs ${d.senate.votesNeededD} additional votes to win.`;
}

function assemblyVotesNeededLine(d: DistrictResult): string {
  if (d.electsBoth) {
    return `Assembly: both D candidates projected to win; second-seat margin ${Math.round(d.secondSeatMargin)} votes.`;
  }
  if (d.electsOne) {
    return `Assembly: one D candidate wins; ${d.votesNeededToElectBoth} more votes needed for both.`;
  }
  return `Assembly: ${d.votesNeededToElectOne} more votes for one seat, ${d.votesNeededToElectBoth} for both.`;
}

function risks(d: DistrictResult, a: ScenarioAssumptions): string {
  const r: string[] = [];
  const maxSwing = Math.max(
    Math.abs(a.asmDemSwing - a.asmRepSwing),
    Math.abs(a.senDemSwing - a.senRepSwing),
  );
  if (maxSwing > 4) r.push("Districtwide swing is large and may not be sustainable.");
  if (a.turnoutDelta > 0.07) r.push("Turnout assumption exceeds 7% above baseline.");
  if (a.bulletVoteRate > 0.15)
    r.push("Bullet voting at this rate would meaningfully suppress Assembly slate totals (note: model applies the penalty symmetrically — real-world impact often falls on the trailing candidate of the leading party).");
  if (d.secondSeatMargin > 0 && d.secondSeatMargin < 80)
    r.push("Assembly second-seat margin is razor-thin; reasonable variance could flip it back.");
  if (d.senate.electsD && Math.abs(d.senate.scenario.marginVotes) < 150)
    r.push("Senate margin is narrow; ticket-split risk is elevated.");
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
  const senPart =
    d.senate.electsD
      ? `wins the Senate seat by ${Math.abs(Math.round(d.senate.scenario.marginVotes))} votes`
      : `falls ${d.senate.votesNeededD} votes short in the Senate`;
  const asmPart =
    d.electsBoth
      ? `elects both Assembly candidates (second-seat margin ${Math.round(d.secondSeatMargin)})`
      : d.electsOne
      ? `elects one Assembly candidate`
      : `does not elect an Assembly candidate (gap ${d.votesNeededToElectOne})`;
  return (
    `Under the ${name} scenario, the Democratic ticket ${senPart} and ${asmPart}. ` +
    `Full ticket: ${d.ticket.summary} of 3 seats. ` +
    `The largest modeled gain comes from ${focus}. Path rated ${bucket} difficulty.`
  );
}

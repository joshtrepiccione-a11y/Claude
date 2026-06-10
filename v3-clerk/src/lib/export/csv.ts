// CSV export helpers for the Targets tab and the Data tab.

import type { PrecinctRow } from "../data/types";
import type { TargetRow } from "../modeling/targets";

export function targetsToCSV(rows: TargetRow[]): string {
  const headers = [
    "Rank",
    "Precinct",
    "Municipality",
    "County",
    "Strategic Category",
    "Baseline Margin (pp)",
    "Scenario Margin (pp)",
    "Net Vote Opportunity",
    "Turnout Score",
    "Persuasion Score",
    "VBM Score",
    "Early Vote Score",
    "Election Day Score",
    "Recommended Action",
    "Vote Mode Priority",
    "Data Confidence",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.rank,
        csv(r.baseline.precinctName),
        csv(r.baseline.municipality),
        csv(r.baseline.county),
        csv(r.category),
        r.baselineMarginPct.toFixed(2),
        r.scenarioMarginPct.toFixed(2),
        Math.round(r.netVoteOpportunity),
        Math.round(r.turnoutScore),
        Math.round(r.persuasionScore),
        Math.round(r.vbmScore),
        Math.round(r.earlyScore),
        Math.round(r.edScore),
        csv(r.action),
        csv(r.voteModePriority.toUpperCase()),
        csv(r.baseline.baselineConfidence),
      ].join(","),
    );
  }
  return lines.join("\n");
}

export function precinctsToCSV(rows: PrecinctRow[]): string {
  const headers = [
    "Precinct", "Municipality", "County",
    "Registered Voters (Estimated)",
    "Baseline Turnout",
    "Baseline Bender (D)", "Baseline Giralo (R)",
    "Scenario Bender (D)", "Scenario Giralo (R)",
    "Baseline Margin (pp)", "Scenario Margin (pp)",
    "Net Vote Swing (D)",
    "Baseline Confidence",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const p = r.baseline;
    const s = r.scenario;
    lines.push(
      [
        csv(p.precinctName), csv(p.municipality), csv(p.county),
        Math.round(p.registeredVoters),
        Math.round(p.turnout),
        Math.round(p.d), Math.round(p.r),
        Math.round(s.d), Math.round(s.r),
        r.baselineMarginPct.toFixed(2), r.scenarioMarginPct.toFixed(2),
        Math.round(r.netVoteSwingD),
        csv(p.baselineConfidence),
      ].join(","),
    );
  }
  return lines.join("\n");
}

function csv(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadFile(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// CSV / share-link export helpers.

import type { PrecinctResult } from "../data/types";
import { marginPct, asmTicketMarginPct } from "./scenario";

type Row = Record<string, string | number>;

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: Row[]): string {
  const head = headers.join(",");
  const body = rows
    .map((r) => headers.map((h) => csvEscape(r[h] ?? "")).join(","))
    .join("\n");
  return head + "\n" + body + "\n";
}

export function precinctRows(
  results: PrecinctResult[],
  scoreById: Map<string, { persuasion: number; baseTurnout: number; vbm: number; overall: number; action: string }>,
): Row[] {
  return results.map((r) => {
    const p = r.feature.properties;
    const sc = scoreById.get(p.precinct);
    const senMarg = marginPct(r.sen.total);
    const baseMarg = marginPct(r.sen.baselineTotal);
    const asmMarg = asmTicketMarginPct(r.asm.total);
    return {
      precinct: p.precinct,
      municipality: p.municipality,
      county: p.county,
      total_votes: Math.round(r.sen.total.total),
      sen_baseline_margin_pct: round1(baseMarg),
      sen_scenario_margin_pct: round1(senMarg),
      sen_net_vote_delta: Math.round(
        r.sen.total.d - r.sen.baselineTotal.d - (r.sen.total.r - r.sen.baselineTotal.r),
      ),
      asm_ticket_margin_pct: round1(asmMarg),
      ed_share_pct: round1(pctOf(r.sen.byMode.ed.total, r.sen.total.total)),
      ev_share_pct: round1(pctOf(r.sen.byMode.early.total, r.sen.total.total)),
      vbm_share_pct: round1(pctOf(r.sen.byMode.vbm.total, r.sen.total.total)),
      persuasion_priority: sc?.persuasion ?? "",
      base_turnout_priority: sc?.baseTurnout ?? "",
      vbm_priority: sc?.vbm ?? "",
      overall_priority: sc?.overall ?? "",
      recommended_action: sc?.action ?? "",
    };
  });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function pctOf(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

const PRECINCT_HEADERS = [
  "precinct",
  "municipality",
  "county",
  "total_votes",
  "sen_baseline_margin_pct",
  "sen_scenario_margin_pct",
  "sen_net_vote_delta",
  "asm_ticket_margin_pct",
  "ed_share_pct",
  "ev_share_pct",
  "vbm_share_pct",
  "persuasion_priority",
  "base_turnout_priority",
  "vbm_priority",
  "overall_priority",
  "recommended_action",
];

const MUNI_HEADERS = [
  "municipality",
  "county",
  "precincts",
  "total_votes",
  "sen_baseline_margin_pct",
  "sen_scenario_margin_pct",
  "sen_net_vote_delta",
  "asm_ticket_margin_pct",
  "top_action",
];

export function precinctCsv(rows: Row[]): string {
  return toCsv(PRECINCT_HEADERS, rows);
}

export function muniCsv(rows: Row[]): string {
  return toCsv(MUNI_HEADERS, rows);
}

export function muniSummaryRows(
  results: PrecinctResult[],
  scoreById: Map<string, { persuasion: number; baseTurnout: number; vbm: number; overall: number; action: string }>,
): Row[] {
  const byMuni = new Map<string, PrecinctResult[]>();
  for (const r of results) {
    const m = r.feature.properties.municipality;
    if (!byMuni.has(m)) byMuni.set(m, []);
    byMuni.get(m)!.push(r);
  }
  const out: Row[] = [];
  for (const [muni, list] of byMuni) {
    const sd = list.reduce((a, r) => a + r.sen.total.d, 0);
    const sr = list.reduce((a, r) => a + r.sen.total.r, 0);
    const st = list.reduce((a, r) => a + r.sen.total.total, 0);
    const bd = list.reduce((a, r) => a + r.sen.baselineTotal.d, 0);
    const br = list.reduce((a, r) => a + r.sen.baselineTotal.r, 0);
    const bt = list.reduce((a, r) => a + r.sen.baselineTotal.total, 0);
    const ad = list.reduce((a, r) => a + r.asm.total.d_total, 0);
    const ar = list.reduce((a, r) => a + r.asm.total.r_total, 0);
    const at = list.reduce((a, r) => a + r.asm.total.total, 0);
    // Most common action in this muni
    const counts = new Map<string, number>();
    for (const r of list) {
      const sc = scoreById.get(r.feature.properties.precinct);
      if (sc?.action) counts.set(sc.action, (counts.get(sc.action) ?? 0) + 1);
    }
    let topAction = "";
    let topCount = 0;
    for (const [a, c] of counts) {
      if (c > topCount) { topAction = a; topCount = c; }
    }
    out.push({
      municipality: muni,
      county: list[0].feature.properties.county,
      precincts: list.length,
      total_votes: Math.round(st),
      sen_baseline_margin_pct: round1(bt > 0 ? ((bd - br) / bt) * 100 : 0),
      sen_scenario_margin_pct: round1(st > 0 ? ((sd - sr) / st) * 100 : 0),
      sen_net_vote_delta: Math.round((sd - bd) - (sr - br)),
      asm_ticket_margin_pct: round1(at > 0 ? ((ad - ar) / at) * 100 : 0),
      top_action: topAction,
    });
  }
  out.sort((a, b) => String(a.municipality).localeCompare(String(b.municipality)));
  return out;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

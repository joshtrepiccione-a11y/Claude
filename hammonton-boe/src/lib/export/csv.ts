// CSV export. Every column is a certified figure or direct arithmetic from one.

import type { BoeData } from "../data/types";
import { MODES, MODE_SHORT } from "../data/types";
import type { PrecinctMeasure } from "../measures";

function csv(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const pct = (v: number | null, d = 2) =>
  v === null || !isFinite(v) ? "" : (v * 100).toFixed(d);

/** The Turnaround table: one row per precinct. */
export function turnaroundToCSV(
  rows: PrecinctMeasure[],
  focus: string,
  fromYear: string,
  toYear: string,
  /** Years whose district rows combine every mode: their per-district mode
   *  figures are unknown, so the cells must be blank, not 0. */
  modeUnknown: { from: boolean; to: boolean } = { from: false, to: false },
): string {
  const headers = [
    "District",
    "Precinct",
    csv(`${fromYear} ${focus} votes`),
    `${fromYear} share %`,
    `${fromYear} support rate %`,
    `${fromYear} placing`,
    csv(`${toYear} ${focus} votes`),
    `${toYear} share %`,
    `${toYear} support rate %`,
    `${toYear} placing`,
    "Change in votes",
    "Change in share (pts)",
    "Flipped to focus",
    ...MODES.map((m) => csv(`${fromYear} ${MODE_SHORT[m]}`)),
    ...MODES.map((m) => csv(`${toYear} ${MODE_SHORT[m]}`)),
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csv(r.districtLabel),
        csv(r.precinct),
        r.fromVotes,
        pct(r.fromShare),
        pct(r.fromSupport),
        r.fromRank ?? "",
        r.toVotes,
        pct(r.toShare),
        pct(r.toSupport),
        r.toRank ?? "",
        r.deltaVotes,
        pct(r.deltaShare),
        r.flipped ? "yes" : "no",
        ...MODES.map((m) => (modeUnknown.from ? "" : r.fromModes[m] || 0)),
        ...MODES.map((m) => (modeUnknown.to ? "" : r.toModes[m] || 0)),
      ].join(","),
    );
  }
  return lines.join("\n");
}

/** The Results table for one year: precincts × candidates. */
export function resultsToCSV(data: BoeData, year: string): string {
  const tw = data.meta.townwide[year];
  const ballot = data.meta.candidatesByYear[year] ?? [];
  const headers = [
    "District",
    "Precinct",
    "Ballots cast",
    "Votes cast in contest",
    // Candidate names are county-supplied text and can contain a comma
    // ("Pullia, Mickey" is normal Clarity choice-text) -- unescaped they would
    // shift every header cell right of that name.
    ...ballot.map(csv),
    "Winner",
  ];
  const lines = [headers.join(",")];
  for (const f of data.features) {
    const p = f.properties;
    const y = p.years[year];
    lines.push(
      [
        csv(p.districtLabel),
        csv(p.precinct),
        y?.ballotsCast ?? "",
        y?.contestVotes ?? 0,
        ...ballot.map((c) => y?.candidates[c]?.votes ?? 0),
        csv(y?.tied ? `Tied: ${y.winners.join(" / ")}` : y?.winner ?? ""),
      ].join(","),
    );
  }
  // Town-level units the county reported outside any district.
  for (const [unit, u] of Object.entries(tw?.townLevelUnits ?? {})) {
    lines.push(
      [
        csv("(town-level)"),
        csv(unit),
        u.ballotsCast ?? "",
        Object.values(u.votes).reduce((a, b) => a + b, 0),
        ...ballot.map((c) => u.votes[c] ?? 0),
        "",
      ].join(","),
    );
  }
  lines.push(
    [
      csv("TOWN-WIDE"),
      csv(`${data.meta.municipality} total`),
      tw?.ballotsCast ?? "",
      tw?.contestVotes ?? 0,
      ...ballot.map(
        (c) => tw?.candidates.find((x) => x.name === c)?.votes ?? 0,
      ),
      csv(tw?.elected.join(" / ") ?? ""),
    ].join(","),
  );
  return lines.join("\n");
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

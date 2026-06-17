import { useMemo, useState } from "react";
import type { PrecinctRow } from "../lib/data/types";
import { rankTargetPrecincts } from "../lib/modeling/targets";
import {
  Card,
  Empty,
  Pill,
  Stat,
  Button,
  fmtNumber,
  fmtMargin,
  fmtSigned,
  partyOf,
} from "../components/UI";
import { useApp } from "../state/store";
import { STRATEGIC_CATEGORIES } from "../lib/data/config";
import { downloadFile, targetsToCSV } from "../lib/export/csv";

type SortKey =
  | "rank"
  | "precinct"
  | "municipality"
  | "category"
  | "baseline"
  | "scenario"
  | "net"
  | "sens"
  | "turnout"
  | "persuasion"
  | "vbm"
  | "early"
  | "ed";

export function Targets({ rows }: { rows: PrecinctRow[] }) {
  const { state } = useApp();
  const [minNet, setMinNet] = useState(state.minNetVoteFilter);
  const [muniFilter, setMuniFilter] = useState<string[]>(state.municipalityFilter);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const allRanked = useMemo(() => rankTargetPrecincts(rows), [rows]);

  const munis = useMemo(
    () => Array.from(new Set(rows.map((r) => r.baseline.municipality))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let f = allRanked.filter((r) => r.netVoteOpportunity >= minNet);
    if (muniFilter.length) f = f.filter((r) => muniFilter.includes(r.baseline.municipality));
    if (categoryFilter.length) f = f.filter((r) => categoryFilter.includes(r.category));
    return f.sort(sorter(sortKey, sortDir));
  }, [allRanked, minNet, muniFilter, categoryFilter, sortKey, sortDir]);

  const totalNet = filtered.reduce((s, r) => s + r.netVoteOpportunity, 0);
  const byMuni = new Map<string, number>();
  for (const r of filtered) {
    byMuni.set(r.baseline.municipality, (byMuni.get(r.baseline.municipality) ?? 0) + r.netVoteOpportunity);
  }
  const topMuni = [...byMuni.entries()].sort((a, b) => b[1] - a[1])[0];
  const modeCount = filtered.reduce(
    (m, r) => ({ ...m, [r.voteModePriority]: (m[r.voteModePriority] ?? 0) + 1 }),
    {} as Record<string, number>,
  );
  const topMode = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0];
  const actionCount = filtered.reduce(
    (m, r) => ({ ...m, [r.action]: (m[r.action] ?? 0) + 1 }),
    {} as Record<string, number>,
  );
  const topAction = Object.entries(actionCount).sort((a, b) => b[1] - a[1])[0];

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir(k === "rank" || k === "precinct" || k === "municipality" || k === "category" ? "asc" : "desc");
    }
  }

  function copySummary() {
    const lines = [
      `Top ${Math.min(20, filtered.length)} target precincts — total net R opportunity ${fmtSigned(totalNet)}`,
      ...filtered.slice(0, 20).map(
        (r) =>
          `${r.rank}. ${r.baseline.precinctName} (${r.baseline.municipality}) — ${fmtMargin(r.baselineMarginPct, partyOf(r.baselineMarginPct))} → ${fmtMargin(r.scenarioMarginPct, partyOf(r.scenarioMarginPct))}, ${fmtSigned(r.netVoteOpportunity)} net R, ${r.action}`,
      ),
    ];
    navigator.clipboard?.writeText(lines.join("\n"));
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-4 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            Target Precincts
          </h1>
          <p className="text-sm text-slate-600">
            Ranked by net Republican vote opportunity for O'Donoghue under the active scenario.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={copySummary}>Copy Target Summary</Button>
          <Button variant="secondary" onClick={() => downloadFile("atlantic_sheriff_targets.csv", targetsToCSV(filtered))}>
            Export Target CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card><Stat label="Total Targets" value={fmtNumber(filtered.length)} /></Card>
        <Card><Stat label="Total Net R Opportunity" value={fmtSigned(totalNet)} tone="good" /></Card>
        <Card><Stat label="Top Municipality" value={topMuni?.[0] ?? "—"} hint={topMuni ? fmtSigned(Math.round(topMuni[1])) : undefined} /></Card>
        <Card><Stat label="Top Vote Mode" value={(topMode?.[0] ?? "—").toUpperCase()} hint={topMode ? `${topMode[1]} precincts` : undefined} /></Card>
        <Card><Stat label="Top Action" value={topAction?.[0] ?? "—"} hint={topAction ? `${topAction[1]} precincts` : undefined} /></Card>
      </div>

      <Card title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Minimum net vote opportunity</label>
            <input
              type="number"
              className="w-full mt-1 border border-slate-300 rounded px-2 py-1 text-sm"
              value={minNet}
              onChange={(e) => setMinNet(parseFloat(e.target.value) || 0)}
            />
          </div>
          <MultiSelect label="Municipality" options={munis} selected={muniFilter} onChange={setMuniFilter} />
          <MultiSelect label="Strategic category" options={[...STRATEGIC_CATEGORIES]} selected={categoryFilter} onChange={setCategoryFilter} />
        </div>
      </Card>

      <Card title={`Target list (${filtered.length})`}>
        {filtered.length === 0 ? (
          <Empty title="No targets match the current filters" body="Lower the net-vote threshold or pick a different scenario." />
        ) : (
          <div className="overflow-auto thin-scroll">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500 sticky top-0 bg-white z-10">
                <tr>
                  <Th onClick={() => toggleSort("rank")} active={sortKey === "rank"} dir={sortDir} sticky>#</Th>
                  <Th onClick={() => toggleSort("precinct")} active={sortKey === "precinct"} dir={sortDir}>Precinct</Th>
                  <Th onClick={() => toggleSort("municipality")} active={sortKey === "municipality"} dir={sortDir}>Municipality</Th>
                  <Th onClick={() => toggleSort("category")} active={sortKey === "category"} dir={sortDir}>Category</Th>
                  <Th onClick={() => toggleSort("baseline")} active={sortKey === "baseline"} dir={sortDir}>Baseline</Th>
                  <Th onClick={() => toggleSort("scenario")} active={sortKey === "scenario"} dir={sortDir}>Scenario</Th>
                  <Th onClick={() => toggleSort("net")} active={sortKey === "net"} dir={sortDir} align="right">Net R</Th>
                  <Th onClick={() => toggleSort("sens")} active={sortKey === "sens"} dir={sortDir} align="right">Turnout Sens.</Th>
                  <Th onClick={() => toggleSort("turnout")} active={sortKey === "turnout"} dir={sortDir} align="right">Turnout</Th>
                  <Th onClick={() => toggleSort("persuasion")} active={sortKey === "persuasion"} dir={sortDir} align="right">Persuasion</Th>
                  <Th onClick={() => toggleSort("vbm")} active={sortKey === "vbm"} dir={sortDir} align="right">VBM</Th>
                  <Th onClick={() => toggleSort("early")} active={sortKey === "early"} dir={sortDir} align="right">EV</Th>
                  <Th onClick={() => toggleSort("ed")} active={sortKey === "ed"} dir={sortDir} align="right">ED</Th>
                  <th className="px-2 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.baseline.precinctId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-1.5 text-slate-500 sticky left-0 bg-white">{r.rank}</td>
                    <td className="px-2 py-1.5 font-medium">{r.baseline.precinctName}</td>
                    <td className="px-2 py-1.5 text-slate-600">{r.baseline.municipality}</td>
                    <td className="px-2 py-1.5"><Pill tone="navy">{r.category}</Pill></td>
                    <td className="px-2 py-1.5">{fmtMargin(r.baselineMarginPct, partyOf(r.baselineMarginPct))}</td>
                    <td className="px-2 py-1.5">{fmtMargin(r.scenarioMarginPct, partyOf(r.scenarioMarginPct))}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-emerald-700">{fmtSigned(r.netVoteOpportunity)}</td>
                    <td className={`px-2 py-1.5 text-right ${r.turnoutSensitivity > 6 ? "text-red-700 font-medium" : "text-slate-600"}`}>{fmtSigned(r.turnoutSensitivity)}</td>
                    <td className="px-2 py-1.5 text-right">{Math.round(r.turnoutScore)}</td>
                    <td className="px-2 py-1.5 text-right">{Math.round(r.persuasionScore)}</td>
                    <td className="px-2 py-1.5 text-right">{Math.round(r.vbmScore)}</td>
                    <td className="px-2 py-1.5 text-right">{Math.round(r.earlyScore)}</td>
                    <td className="px-2 py-1.5 text-right">{Math.round(r.edScore)}</td>
                    <td className="px-2 py-1.5 text-slate-700">{r.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (s: string[]) => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-slate-500">{label}</label>
      <select
        multiple
        value={selected}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
        className="w-full mt-1 border border-slate-300 rounded px-2 py-1 text-sm h-24"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  align = "left",
  sticky = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
  align?: "left" | "right";
  sticky?: boolean;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-2 py-2 cursor-pointer select-none ${align === "right" ? "text-right" : "text-left"} ${active ? "text-slate-900" : ""} ${sticky ? "sticky left-0 bg-white" : ""}`}
    >
      {children} {active ? (dir === "asc" ? "▲" : "▼") : ""}
    </th>
  );
}

function sorter(k: SortKey, dir: "asc" | "desc") {
  const sgn = dir === "asc" ? 1 : -1;
  return (a: ReturnType<typeof rankTargetPrecincts>[number], b: ReturnType<typeof rankTargetPrecincts>[number]) => {
    switch (k) {
      case "rank": return sgn * (a.rank - b.rank);
      case "precinct": return sgn * a.baseline.precinctName.localeCompare(b.baseline.precinctName);
      case "municipality": return sgn * a.baseline.municipality.localeCompare(b.baseline.municipality);
      case "category": return sgn * a.category.localeCompare(b.category);
      case "baseline": return sgn * (a.baselineMarginPct - b.baselineMarginPct);
      case "scenario": return sgn * (a.scenarioMarginPct - b.scenarioMarginPct);
      case "net": return sgn * (a.netVoteOpportunity - b.netVoteOpportunity);
      case "sens": return sgn * (a.turnoutSensitivity - b.turnoutSensitivity);
      case "turnout": return sgn * (a.turnoutScore - b.turnoutScore);
      case "persuasion": return sgn * (a.persuasionScore - b.persuasionScore);
      case "vbm": return sgn * (a.vbmScore - b.vbmScore);
      case "early": return sgn * (a.earlyScore - b.earlyScore);
      case "ed": return sgn * (a.edScore - b.edScore);
    }
  };
}

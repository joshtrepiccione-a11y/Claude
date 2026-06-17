import { useMemo, useState } from "react";
import { Card, Button, Pill, fmtNumber } from "../components/UI";
import type { PrecinctRow } from "../lib/data/types";
import {
  CANDIDATES,
  CONTEST,
  ATLANTIC_MUNICIPALITIES,
  isAtlanticMunicipality,
} from "../lib/data/config";
import type { CalibrationMeta } from "../lib/data/load";
import { downloadFile, precinctsToCSV } from "../lib/export/csv";

const CERTIFIED = [
  { id: "sheriff2020", label: "2020 Sheriff", note: "Presidential-year turnout (Threat)" },
  { id: "sheriff2023", label: "2023 Sheriff", note: "Off-year turnout (Hold)" },
  { id: "gov2025", label: "2025 Governor", note: "Recent environment signal" },
] as const;

export function Data({
  rows,
  warnings,
  calibration,
}: {
  rows: PrecinctRow[];
  warnings: string[];
  calibration: CalibrationMeta | null;
}) {
  const [csvPreview, setCsvPreview] = useState<{
    headers: string[];
    sample: string[][];
    errors: string[];
  } | null>(null);

  const muniCoverage = useMemo(() => {
    const have = new Set(rows.map((r) => r.baseline.municipality.toLowerCase()));
    return ATLANTIC_MUNICIPALITIES.map((m) => ({
      ...m,
      present: have.has(m.name.toLowerCase()),
    }));
  }, [rows]);

  function previewCSV(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.trim().split(/\r?\n/);
      const headers = (lines[0] || "").split(",").map((s) => s.trim());
      const required = [
        "precinct",
        "municipality",
        "county",
        "sheriff2023_d",
        "sheriff2023_r",
        "sheriff2020_d",
        "sheriff2020_r",
        "gov2025_d",
        "gov2025_r",
      ];
      const errors: string[] = [];
      for (const r of required) {
        if (!headers.includes(r)) errors.push(`Missing required column: ${r}`);
      }
      const muniIdx = headers.indexOf("municipality");
      const sample: string[][] = [];
      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        const cells = lines[i].split(",");
        sample.push(cells);
        if (muniIdx >= 0 && !isAtlanticMunicipality(cells[muniIdx])) {
          errors.push(`Row ${i}: municipality "${cells[muniIdx]}" is not in Atlantic County config`);
        }
      }
      setCsvPreview({ headers, sample, errors });
    };
    reader.readAsText(file);
  }

  const totals = calibration?.county_totals;

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Data & Methodology</h1>
        <p className="text-sm text-slate-600">
          Transparent view of what powers the dashboard, where the numbers come from, and how the three baselines are calibrated.
        </p>
      </div>

      {/* Three certified county results */}
      <Card title="Certified county results (the three layers)" subtitle="Real municipality-level certified totals anchor every layer.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CERTIFIED.map((c) => {
            const t = totals?.[c.id];
            const dWins = t ? t.d > t.r : false;
            return (
              <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800">{c.label}</div>
                  <Pill tone={dWins ? "dem" : "rep"}>{dWins ? "D win" : "R win"}</Pill>
                </div>
                <div className="text-xs text-slate-500 mb-2">{c.note}</div>
                {t ? (
                  <table className="text-sm w-full">
                    <tbody>
                      <tr><td className="text-red-700 py-0.5">Republican</td><td className="text-right font-semibold">{fmtNumber(t.r)}</td></tr>
                      <tr><td className="text-blue-700 py-0.5">Democrat</td><td className="text-right font-semibold">{fmtNumber(t.d)}</td></tr>
                      <tr className="border-t border-slate-100"><td className="py-0.5 text-slate-500">R margin</td><td className="text-right">{fmtNumber(t.r - t.d)}</td></tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="text-xs text-slate-400">No calibration metadata in GeoJSON.</div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          O'Donoghue (R) won the 2023 off-year Sheriff race but trailed in the high-turnout 2020 presidential-year electorate. The 2025 Governor result is a recent-environment signal, not a Sheriff layer. The projected-2026 baseline interpolates each precinct between the 2023 and 2020 Sheriff layers by a turnout-environment factor.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card title="Current data source">
          <ul className="text-sm space-y-1 text-slate-700">
            <li><strong>Source:</strong> Calibrated precinct GeoJSON (<code>data/atlantic_sheriff_precincts.geojson</code>)</li>
            <li><strong>Precincts:</strong> {rows.length}</li>
            <li><strong>Municipalities:</strong> {ATLANTIC_MUNICIPALITIES.length}</li>
            <li><strong>County:</strong> Atlantic</li>
            <li><strong>Election:</strong> {CONTEST.year} {CONTEST.office} ({CONTEST.termYears}-yr term, {CONTEST.electionDay})</li>
          </ul>
        </Card>
        <Card title="Data confidence">
          <p className="text-sm text-slate-700 mb-2">Every metric is internally tagged with a confidence label:</p>
          <div className="flex flex-wrap gap-2">
            <Pill tone="green">Certified</Pill>
            <Pill tone="dem">Calibrated</Pill>
            <Pill tone="navy">Modeled</Pill>
            <Pill tone="amber">Estimated</Pill>
            <Pill tone="purple">Scenario</Pill>
            <Pill tone="slate">Derived</Pill>
          </div>
        </Card>
        <Card title="Calibration method">
          <ul className="text-sm space-y-1 text-slate-700 list-disc list-inside">
            <li><strong>Anchor:</strong> {calibration?.anchor_level ?? "municipality (23) — certified totals"} (real).</li>
            <li><strong>Within-municipality distribution:</strong> {calibration?.precinct_distribution ?? "2024 presidential pattern, uniform per-muni shift"} (calibrated).</li>
            <li>Each municipality's certified D/R total is split across its precincts using the 2024 presidential spatial pattern.</li>
            <li>Scenario engine is deterministic — see <code>lib/modeling/scenario.ts</code>.</li>
            <li>Outputs are a model, not a prediction.</li>
          </ul>
        </Card>
      </div>

      <Card title="Candidate configuration">
        <table className="min-w-full text-sm">
          <thead className="text-xs text-slate-500 uppercase text-left">
            <tr><th className="px-2 py-1">Slot</th><th className="px-2 py-1">Label</th><th className="px-2 py-1">Party</th><th className="px-2 py-1">Role</th></tr>
          </thead>
          <tbody>
            {CANDIDATES.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-2 py-1 font-mono">{c.id}</td>
                <td className="px-2 py-1">{c.label}{c.isIncumbent ? " — incumbent" : ""}</td>
                <td className="px-2 py-1">{c.party}</td>
                <td className="px-2 py-1">{c.isClient ? <Pill tone="rep">Our candidate</Pill> : <Pill tone="slate">Opponent</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-500 mt-2">This model is built from the Republican perspective for {CONTEST.clientName}. Update in <code>src/lib/data/config.ts</code> if the matchup changes.</p>
      </Card>

      <Card title="Atlantic County municipality coverage">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {muniCoverage.map((m) => (
            <div key={m.name} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100">
              <span>{m.name}</span>
              <span className="text-xs">
                {m.present ? <Pill tone="green">✓</Pill> : <Pill tone="amber">missing</Pill>}
              </span>
            </div>
          ))}
        </div>
        {warnings.length > 0 && (
          <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 space-y-1">
            <div className="font-semibold">Validation warnings:</div>
            {warnings.slice(0, 8).map((w, i) => <div key={i}>{w}</div>)}
          </div>
        )}
      </Card>

      <Card
        title="Import data"
        subtitle="Validate a CSV against the schema before swapping it in (preview-only)."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "Precinct results CSV",
            "Vote mode results CSV",
            "GeoJSON precinct boundaries",
            "Voter file summary CSV",
            "Turnout history CSV",
          ].map((label) => (
            <div key={label} className="bg-slate-50 rounded p-3 border border-slate-100">
              <div className="text-sm font-medium text-slate-800 mb-1">{label}</div>
              <input
                type="file"
                accept={label.includes("GeoJSON") ? ".json,.geojson" : ".csv"}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.name.toLowerCase().endsWith(".csv")) previewCSV(f);
                }}
                className="text-xs"
              />
              <div className="text-[11px] text-slate-500 mt-1">Preview-only in this prototype.</div>
            </div>
          ))}
        </div>
        {csvPreview && (
          <div className="mt-3 text-sm">
            <div className="text-xs text-slate-500 mb-1">Headers detected: {csvPreview.headers.length}</div>
            {csvPreview.errors.length > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-xs space-y-0.5">
                {csvPreview.errors.map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-emerald-700 text-xs">All required columns present.</div>
            )}
          </div>
        )}
      </Card>

      <Card title="Export current data">
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => downloadFile("atlantic_sheriff_precincts.csv", precinctsToCSV(rows))}>
            Export precincts CSV ({fmtNumber(rows.length)} rows)
          </Button>
          <Button variant="ghost" onClick={() => downloadFile("atlantic_sheriff_config.json", JSON.stringify({ CONTEST, CANDIDATES, ATLANTIC_MUNICIPALITIES }, null, 2), "application/json")}>
            Export config JSON
          </Button>
        </div>
      </Card>

      <div className="text-center text-[11px] text-slate-500 italic">
        Outputs are modeled, not predictions.
      </div>
    </div>
  );
}

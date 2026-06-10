import { useMemo, useState } from "react";
import { Card, Button, Pill, fmtNumber } from "../components/UI";
import type { PrecinctRow } from "../lib/data/types";
import {
  CANDIDATES,
  CONTEST,
  ATLANTIC_MUNICIPALITIES,
  isAtlanticMunicipality,
} from "../lib/data/config";
import { downloadFile, precinctsToCSV } from "../lib/export/csv";

export function Data({ rows, warnings }: { rows: PrecinctRow[]; warnings: string[] }) {
  const [csvPreview, setCsvPreview] = useState<{
    headers: string[];
    sample: string[][];
    errors: string[];
  } | null>(null);

  // Coverage report.
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
        "precinct_id",
        "precinct_name",
        "municipality",
        "county",
        "registered_voters",
        "baseline_turnout",
        "baseline_dem_votes",
        "baseline_rep_votes",
        "election_day_votes",
        "early_votes",
        "vbm_votes",
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

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Data & Methodology</h1>
        <p className="text-sm text-slate-600">
          Transparent view of what powers the dashboard, where the numbers come from, and how to swap in certified results.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card title="Current data source">
          <ul className="text-sm space-y-1 text-slate-700">
            <li><strong>Source:</strong> Calibrated precinct GeoJSON (<code>data/atlantic_clerk_precincts.geojson</code>)</li>
            <li><strong>Precincts:</strong> {rows.length}</li>
            <li><strong>County:</strong> Atlantic</li>
            <li><strong>Election:</strong> {CONTEST.year} {CONTEST.office}</li>
            <li><strong>Baseline:</strong> Certified {CONTEST.baseline.cycle} Clerk result — {CONTEST.baseline.rCandidate} {CONTEST.baseline.rVotes.toLocaleString()} / {CONTEST.baseline.dCandidate} {CONTEST.baseline.dVotes.toLocaleString()}</li>
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
        <Card title="Methodology">
          <ul className="text-sm space-y-1 text-slate-700 list-disc list-inside">
            <li>County totals match the certified {CONTEST.baseline.cycle} Clerk result exactly.</li>
            <li>Per-precinct distribution interpolated from the 2024 presidential spatial pattern (−3.4 pp uniform shift, 0.634× turnout scale).</li>
            <li>Scenario engine is deterministic — see <code>lib/modeling/scenario.ts</code>.</li>
            <li>Outputs are a model, not a prediction.</li>
          </ul>
        </Card>
      </div>

      <Card title="Candidate configuration">
        <table className="min-w-full text-sm">
          <thead className="text-xs text-slate-500 uppercase text-left">
            <tr><th className="px-2 py-1">Slot</th><th className="px-2 py-1">Label</th><th className="px-2 py-1">Party</th><th className="px-2 py-1">Status</th></tr>
          </thead>
          <tbody>
            {CANDIDATES.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-2 py-1 font-mono">{c.id}</td>
                <td className="px-2 py-1">{c.label}{c.isIncumbent ? " — incumbent" : ""}</td>
                <td className="px-2 py-1">{c.party}</td>
                <td className="px-2 py-1">{c.isPlaceholder ? <Pill tone="amber">Placeholder</Pill> : <Pill tone="green">Confirmed</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-500 mt-2">Candidates are confirmed for the {CONTEST.year} general election. Update in <code>src/lib/data/config.ts</code> if the matchup changes.</p>
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
          <Button variant="secondary" onClick={() => downloadFile("atlantic_clerk_precincts.csv", precinctsToCSV(rows))}>
            Export precincts CSV ({fmtNumber(rows.length)} rows)
          </Button>
          <Button variant="ghost" onClick={() => downloadFile("atlantic_clerk_config.json", JSON.stringify({ CONTEST, CANDIDATES, ATLANTIC_MUNICIPALITIES }, null, 2), "application/json")}>
            Export config JSON
          </Button>
        </div>
      </Card>
    </div>
  );
}

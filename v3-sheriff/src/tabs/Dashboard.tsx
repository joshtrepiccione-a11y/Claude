import { useMemo } from "react";
import type { CountyResult, PrecinctRow } from "../lib/data/types";
import { CANDIDATES, CONTEST, BASELINES, marginTone } from "../lib/data/config";
import {
  Card,
  Empty,
  InfoIcon,
  Pill,
  SectionTitle,
  Stat,
  fmtMargin,
  fmtNumber,
  fmtSigned,
  partyOf,
} from "../components/UI";
import { PrecinctMap } from "../components/PrecinctMap";
import { useApp } from "../state/store";
import { rankTargetPrecincts } from "../lib/modeling/targets";
import { scoreScenarioRealism } from "../lib/modeling/realism";
import { calculateVoteModeImpact } from "../lib/modeling/scenario";
import { SCENARIO_BY_ID } from "../lib/scenarios/presets";
import { MAP_LAYERS, MAP_LAYER_BY_ID } from "../lib/data/mapLayers";

export function Dashboard({
  rows,
  county,
  geojson,
}: {
  rows: PrecinctRow[];
  county: CountyResult;
  geojson: GeoJSON.FeatureCollection;
}) {
  const { state, dispatch } = useApp();

  const baselineMarginParty = partyOf(county.baseline.marginPct);
  const scenarioMarginParty = partyOf(county.scenario.marginPct);
  const preset = state.scenarioId !== "custom" ? SCENARIO_BY_ID[state.scenarioId] : null;
  const activeBaseline = BASELINES.find((b) => b.id === state.baselineId)!;

  const realism = useMemo(
    () => scoreScenarioRealism(state.assumptions, county, rows),
    [state.assumptions, county, rows],
  );
  const modeImpact = useMemo(() => calculateVoteModeImpact(rows), [rows]);
  const topTargets = useMemo(() => rankTargetPrecincts(rows).slice(0, 8), [rows]);

  const programs = useMemo(() => {
    const items = [
      {
        name: "VBM / Early Parity",
        impact: Math.round(Math.abs(modeImpact.vbm) + Math.abs(modeImpact.early)),
        kind: "vbm" as const,
      },
      {
        name: "Persuasion Precincts",
        impact: Math.round(topTargets.slice(0, 5).reduce((s, t) => s + t.netVoteOpportunity, 0)),
        kind: "persuasion" as const,
      },
      {
        name: "R Base Turnout",
        impact: Math.round(
          rows
            .filter((r) => r.category === "Base Expansion")
            .reduce((s, r) => s + Math.max(0, r.turnoutScore * 4), 0),
        ),
        kind: "base" as const,
      },
    ];
    return items.sort((a, b) => b.impact - a.impact);
  }, [modeImpact, topTargets, rows]);

  const activeLayer = MAP_LAYER_BY_ID[state.mapLayer];

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            {CONTEST.displayName}
          </h1>
          <p className="text-sm text-slate-600">{CONTEST.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Pill tone="gold">Baseline: {activeBaseline.short}</Pill>
          <Pill tone="amber">Calibrated Precinct Baseline</Pill>
          <InfoIcon tip={`Active baseline: ${activeBaseline.label}. ${activeBaseline.description} County totals match the certified municipality-level results; per-precinct distribution uses the 2024 presidential spatial pattern.`} />
        </div>
      </div>

      {/* KPI row — 1 → 2 → 5 columns */}
      <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">
        Sheriff (single seat, {CONTEST.termYears}-year term) · Election Day {CONTEST.electionDay}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card>
          <Stat
            label={`Baseline Margin (${activeBaseline.short})`}
            value={fmtMargin(county.baseline.marginPct, baselineMarginParty)}
            hint={`${fmtSigned(county.baseline.marginVotes)} votes`}
            tone={marginTone(baselineMarginParty)}
          />
        </Card>
        <Card>
          <Stat
            label="Scenario Margin"
            value={fmtMargin(county.scenario.marginPct, scenarioMarginParty)}
            hint={`${fmtSigned(county.scenario.marginVotes)} votes`}
            tone={marginTone(scenarioMarginParty)}
          />
        </Card>
        <Card>
          <Stat
            label="Votes to Hold"
            value={county.electsR ? "Holds" : fmtNumber(county.votesNeededR)}
            hint="O'Donoghue vs. Riggin"
            tone={county.electsR ? "good" : "warn"}
          />
        </Card>
        <Card>
          <Stat
            label="Net R Vote Opportunity"
            value={fmtSigned(county.netGain)}
            hint="R-net votes added by this scenario"
            tone={county.netGain > 0 ? "good" : county.netGain < 0 ? "bad" : "neutral"}
          />
        </Card>
        <Card>
          <Stat
            label="Scenario Realism"
            value={realism.bucket}
            hint={`score ${Math.round(realism.score)}/100`}
            tone={realism.bucket === "Fantasy" || realism.bucket === "Aggressive" ? "warn" : realism.bucket === "Medium-High" ? "neutral" : "good"}
          />
        </Card>
      </div>

      {/* Projected Outcome */}
      <Card
        title="Projected Outcome — County Sheriff"
        subtitle={`Scenario: ${preset?.name ?? "Custom"} · Baseline: ${activeBaseline.short} — modeled, not a prediction`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(["sheriffR", "sheriffD"] as const).map((id) => {
            const cand = CANDIDATES.find((c) => c.id === id)!;
            const votes = id === "sheriffR" ? county.scenario.r : county.scenario.d;
            const seated =
              (id === "sheriffD" && county.winner === "D") ||
              (id === "sheriffR" && county.winner === "R");
            return (
              <div
                key={id}
                className={`rounded-lg border px-3 py-3 ${
                  seated
                    ? cand.party === "D" ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Pill tone={cand.party === "D" ? "dem" : "rep"}>{cand.shortLabel}</Pill>
                  <span className="text-[11px] text-slate-500">
                    {cand.isIncumbent ? "Incumbent · " : ""}{seated ? "Wins seat" : "Loses"}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-700 mt-2">{cand.label}</div>
                <div className="text-xl font-semibold mt-1">{fmtNumber(votes)}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <Pill tone="gold">Winner</Pill>
            <span className={
              county.winner === "D" ? "text-blue-700 font-semibold"
              : county.winner === "R" ? "text-red-700 font-semibold"
              : "font-semibold"
            }>
              {county.winner === "tie" ? "Tie" : CANDIDATES.find((c) => c.party === county.winner)?.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-slate-600">
            <span>
              Margin: <span className="font-semibold">{fmtSigned(county.scenario.marginVotes)} votes (R)</span>
            </span>
            <span>
              Ballots: <span className="font-semibold">{fmtNumber(county.scenario.totalBallots)}</span>
            </span>
          </div>
        </div>
      </Card>

      {/* Two-column: map + path-to-victory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card
            title="County Map"
            subtitle="Atlantic County precincts coloured by selected layer"
            right={
              <select
                value={state.mapLayer}
                onChange={(e) =>
                  dispatch({ type: "setMapLayer", layer: e.target.value as typeof state.mapLayer })
                }
                className="text-xs border border-slate-300 rounded px-2 py-1"
              >
                {MAP_LAYERS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            }
          >
            <div className="h-[340px] sm:h-[420px]">
              <PrecinctMap
                geojson={geojson}
                rows={rows}
                layer={state.mapLayer}
                selectedPrecinct={state.selectedPrecinct}
                onSelect={(id) => dispatch({ type: "selectPrecinct", id })}
              />
            </div>
            <Legend />
          </Card>
        </div>

        <Card title="Path to Hold" subtitle={`Active scenario: ${preset?.name ?? "Custom"}`}>
          <p className="text-sm text-slate-700 leading-relaxed">
            {summaryNarrative(county, preset?.name ?? "Custom Scenario", modeImpact)}
          </p>
          <SectionTitle>Recommended programs</SectionTitle>
          <ol className="space-y-2 mb-4">
            {programs.map((p, i) => (
              <li key={p.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-navy-100 text-navy-800 text-xs font-bold">
                    {i + 1}
                  </span>
                  {p.name}
                </span>
                <span className="text-emerald-700 font-medium">
                  {fmtSigned(p.impact)} net R votes
                </span>
              </li>
            ))}
          </ol>
          <SectionTitle>Realism</SectionTitle>
          <RealismBar bucket={realism.bucket} score={realism.score} />
          <ul className="text-xs text-slate-600 mt-3 space-y-1">
            {realism.factors
              .sort((a, b) => b.weight - a.weight)
              .slice(0, 4)
              .map((f) => (
                <li key={f.label}>
                  <strong>{f.label}:</strong> {f.note}
                </li>
              ))}
          </ul>
        </Card>
      </div>

      {/* Top targets */}
      <Card
        title="Top Target Precincts"
        subtitle="Highest net Republican vote opportunity under the active scenario"
      >
        {topTargets.length === 0 ? (
          <Empty title="No targets match the active scenario" body="Try a more aggressive preset or lower the minimum-opportunity filter." />
        ) : (
          <div className="overflow-auto thin-scroll">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Precinct</th>
                  <th className="px-2 py-2">Municipality</th>
                  <th className="px-2 py-2">Baseline</th>
                  <th className="px-2 py-2">Scenario</th>
                  <th className="px-2 py-2 text-right">Net R</th>
                  <th className="px-2 py-2">Mode</th>
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {topTargets.map((t) => (
                  <tr
                    key={t.baseline.precinctId}
                    className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => dispatch({ type: "selectPrecinct", id: t.baseline.precinctId })}
                  >
                    <td className="px-2 py-2 text-slate-500">{t.rank}</td>
                    <td className="px-2 py-2 font-medium">{t.baseline.precinctName}</td>
                    <td className="px-2 py-2 text-slate-600">{t.baseline.municipality}</td>
                    <td className="px-2 py-2">{fmtMargin(t.baselineMarginPct, partyOf(t.baselineMarginPct))}</td>
                    <td className="px-2 py-2">{fmtMargin(t.scenarioMarginPct, partyOf(t.scenarioMarginPct))}</td>
                    <td className="px-2 py-2 text-right font-semibold text-emerald-700">
                      {fmtSigned(t.netVoteOpportunity)}
                    </td>
                    <td className="px-2 py-2 uppercase">{t.voteModePriority}</td>
                    <td className="px-2 py-2">{t.category}</td>
                    <td className="px-2 py-2 text-slate-700">{t.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );

  function Legend() {
    return (
      <div className="mt-2">
        <div className="text-xs text-slate-500 mb-1">{activeLayer.description}</div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          {activeLayer.legend.map((i) => (
            <span key={i.l} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: i.c }} />
              {i.l}
            </span>
          ))}
        </div>
      </div>
    );
  }
}

function summaryNarrative(
  c: CountyResult,
  scenarioName: string,
  m: { ed: number; early: number; vbm: number },
): string {
  const lead = c.electsR
    ? `This scenario re-elects Sheriff Joe O'Donoghue`
    : `This scenario falls ${c.votesNeededR.toLocaleString()} votes short of holding the seat for O'Donoghue`;
  const focus = pickFocus(m);
  return `${lead}. The most efficient path under "${scenarioName}" leans on ${focus}, supplemented by persuasion in competitive mainland precincts and Republican base turnout in Hamilton, Galloway, and Egg Harbor Township. County margin moves from ${Math.round(c.baseline.marginVotes)} to ${Math.round(c.scenario.marginVotes)} votes (R-perspective).`;
}

function pickFocus(m: { ed: number; early: number; vbm: number }): string {
  const arr: Array<[string, number]> = [
    ["Vote by Mail parity", m.vbm],
    ["Early Vote parity", m.early],
    ["Election Day GOTV", m.ed],
  ];
  arr.sort((a, b) => b[1] - a[1]);
  return arr[0][0];
}

function RealismBar({ bucket, score }: { bucket: string; score: number }) {
  const buckets = ["Conservative", "Plausible", "Medium-High", "Aggressive", "Fantasy"];
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden border border-slate-200">
        <div className="flex-1 bg-emerald-300" />
        <div className="flex-1 bg-emerald-500" />
        <div className="flex-1 bg-amber-400" />
        <div className="flex-1 bg-orange-500" />
        <div className="flex-1 bg-red-600" />
      </div>
      <div className="flex justify-between text-[10px] mt-1 text-slate-500">
        {buckets.map((b) => (
          <span key={b} className={b === bucket ? "font-semibold text-slate-900" : ""}>
            {b}
          </span>
        ))}
      </div>
      <div className="text-xs text-slate-500 mt-1">Score: {Math.round(score)}/100</div>
    </div>
  );
}

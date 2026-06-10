import { useMemo } from "react";
import type { CountyResult, PrecinctRow } from "../lib/data/types";
import { CANDIDATES, CONTEST } from "../lib/data/config";
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
  const realism = useMemo(
    () => scoreScenarioRealism(state.assumptions, county, rows),
    [state.assumptions, county, rows],
  );
  const modeImpact = useMemo(() => calculateVoteModeImpact(rows), [rows]);
  const topTargets = useMemo(() => rankTargetPrecincts(rows).slice(0, 8), [rows]);

  // Top three recommended programs (heuristic: pick the modes with biggest absolute mode impact).
  const programs = useMemo(() => {
    const items = [
      {
        name: "VBM Chase Program",
        impact: Math.round(Math.abs(modeImpact.vbm)),
        kind: "vbm" as const,
      },
      {
        name: "Persuasion Precincts",
        impact: Math.round(topTargets.slice(0, 5).reduce((s, t) => s + t.netVoteOpportunity, 0)),
        kind: "persuasion" as const,
      },
      {
        name: "Base Turnout Expansion",
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
        <div className="flex items-center gap-2">
          <Pill tone="amber">
            Data Status: Calibrated Precinct Baseline
          </Pill>
          <InfoIcon tip={`County totals match the certified ${CONTEST.baseline.cycle} Clerk result exactly (Giralo ${CONTEST.baseline.rVotes.toLocaleString()} / Jiampetti ${CONTEST.baseline.dVotes.toLocaleString()}). Per-precinct distribution is interpolated from the 2024 presidential spatial pattern until certified precinct-level results are imported.`} />
        </div>
      </div>

      {/* KPI row */}
      <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">County Clerk (single seat, {CONTEST.termYears}-year term)</div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card>
          <Stat
            label="Baseline Margin (2021)"
            value={fmtMargin(county.baseline.marginPct, baselineMarginParty)}
            hint={`${fmtSigned(county.baseline.marginVotes)} votes`}
            tone={baselineMarginParty === "D" ? "good" : baselineMarginParty === "R" ? "bad" : "neutral"}
          />
        </Card>
        <Card>
          <Stat
            label="Scenario Margin"
            value={fmtMargin(county.scenario.marginPct, scenarioMarginParty)}
            hint={`${fmtSigned(county.scenario.marginVotes)} votes`}
            tone={scenarioMarginParty === "D" ? "good" : scenarioMarginParty === "R" ? "bad" : "neutral"}
          />
        </Card>
        <Card>
          <Stat
            label="Votes to Win"
            value={county.electsD ? "Won" : fmtNumber(county.votesNeededD)}
            hint="Bender vs. Giralo"
            tone={county.electsD ? "good" : "warn"}
          />
        </Card>
        <Card>
          <Stat
            label="Net Gain vs. Baseline"
            value={fmtSigned(county.netGain)}
            hint="D-net votes added by this scenario"
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
        title="Projected Outcome — County Clerk"
        subtitle={`Scenario: ${preset?.name ?? "Custom"} — modeled, not a prediction`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(["clerkD", "clerkR"] as const).map((id) => {
            const cand = CANDIDATES.find((c) => c.id === id)!;
            const votes = id === "clerkD" ? county.scenario.d : county.scenario.r;
            const seated =
              (id === "clerkD" && county.winner === "D") ||
              (id === "clerkR" && county.winner === "R");
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
            <Pill tone="navy">Winner</Pill>
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
              Margin: <span className="font-semibold">{fmtSigned(county.scenario.marginVotes)} votes</span>
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
                <option value="margin">Clerk Margin</option>
                <option value="net-vote-opportunity">Net Vote Opportunity</option>
                <option value="persuasion-opportunity">Persuasion</option>
                <option value="turnout-opportunity">Turnout</option>
                <option value="vote-mode-priority">Vote Mode Priority</option>
                <option value="risk">Risk</option>
                <option value="recommended-action">Recommended Action</option>
              </select>
            }
          >
            <div className="h-[420px]">
              <PrecinctMap
                geojson={geojson}
                rows={rows}
                layer={state.mapLayer}
                selectedPrecinct={state.selectedPrecinct}
                onSelect={(id) => dispatch({ type: "selectPrecinct", id })}
              />
            </div>
            <Legend layer={state.mapLayer} />
          </Card>
        </div>

        <Card title="Path to Victory" subtitle={`Active scenario: ${preset?.name ?? "Custom"}`}>
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
                  {fmtSigned(p.impact)} net votes
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
        subtitle="Highest net Democratic vote opportunity under the active scenario"
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
                  <th className="px-2 py-2 text-right">Net D</th>
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
                    onClick={() =>
                      dispatch({ type: "selectPrecinct", id: t.baseline.precinctId })
                    }
                  >
                    <td className="px-2 py-2 text-slate-500">{t.rank}</td>
                    <td className="px-2 py-2 font-medium">{t.baseline.precinctName}</td>
                    <td className="px-2 py-2 text-slate-600">{t.baseline.municipality}</td>
                    <td className="px-2 py-2">{fmtMargin(t.baselineMarginPct)}</td>
                    <td className="px-2 py-2">{fmtMargin(t.scenarioMarginPct)}</td>
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
}

function summaryNarrative(
  c: CountyResult,
  scenarioName: string,
  m: { ed: number; early: number; vbm: number },
): string {
  const lead = c.electsD
    ? `This scenario elects Lisa Bender as County Clerk`
    : `This scenario falls ${c.votesNeededD.toLocaleString()} votes short of unseating Joe Giralo`;
  const focus = pickFocus(m);
  return `${lead}. The most efficient path under "${scenarioName}" leans on ${focus}, supplemented by persuasion in competitive mainland precincts and base-turnout expansion in Atlantic City and Pleasantville. County margin moves from ${Math.round(c.baseline.marginVotes)} to ${Math.round(c.scenario.marginVotes)} votes.`;
}

function pickFocus(m: { ed: number; early: number; vbm: number }): string {
  const arr: Array<[string, number]> = [
    ["Vote by Mail improvement", m.vbm],
    ["Early Vote expansion", m.early],
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

function Legend({ layer }: { layer: string }) {
  const items =
    layer === "margin"
      ? [
          { c: "#7f1d1d", l: "Safe Giralo" },
          { c: "#c66266", l: "Lean Giralo" },
          { c: "#e2e8f0", l: "Toss-Up" },
          { c: "#7aa7d9", l: "Lean Bender" },
          { c: "#1e3a8a", l: "Safe Bender" },
        ]
      : layer === "net-vote-opportunity"
      ? [
          { c: "#b91c1c", l: "R opportunity" },
          { c: "#e2e8f0", l: "Neutral" },
          { c: "#1d4ed8", l: "D opportunity" },
        ]
      : layer === "vote-mode-priority"
      ? [
          { c: "#c08a2e", l: "Election Day" },
          { c: "#3f8f63", l: "Early Vote" },
          { c: "#7e57c2", l: "Vote by Mail" },
        ]
      : layer === "recommended-action"
      ? [
          { c: "#7e57c2", l: "VBM Ballot Chase" },
          { c: "#3f8f63", l: "Early Vote Push" },
          { c: "#3b6cb8", l: "Door-to-Door Canvass" },
          { c: "#c08a2e", l: "Persuasion Mail" },
          { c: "#b91c1c", l: "Damage Reduction" },
          { c: "#cbd5e1", l: "Monitor Only" },
        ]
      : [
          { c: "#f5f3ff", l: "Low" },
          { c: "#a78bfa", l: "Medium" },
          { c: "#5b21b6", l: "High" },
        ];
  return (
    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.l} className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: i.c }} />
          {i.l}
        </span>
      ))}
    </div>
  );
}

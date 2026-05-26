import { useMemo } from "react";
import type { DistrictResult, PrecinctRow } from "../lib/data/types";
import { CANDIDATES, DISTRICT } from "../lib/data/config";
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
  district,
  geojson,
}: {
  rows: PrecinctRow[];
  district: DistrictResult;
  geojson: GeoJSON.FeatureCollection;
}) {
  const { state, dispatch } = useApp();

  const baselineMarginParty = partyOf(district.baseline.slateMarginPct);
  const scenarioMarginParty = partyOf(district.scenario.slateMarginPct);
  const senateBaselineParty = partyOf(district.senate.baseline.marginPct);
  const senateScenarioParty = partyOf(district.senate.scenario.marginPct);
  const preset = state.scenarioId !== "custom" ? SCENARIO_BY_ID[state.scenarioId] : null;
  const realism = useMemo(
    () => scoreScenarioRealism(state.assumptions, district, rows),
    [state.assumptions, district, rows],
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
            {DISTRICT.displayName}
          </h1>
          <p className="text-sm text-slate-600">{DISTRICT.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="amber">
            Data Status: Modeled Precinct Baseline
          </Pill>
          <InfoIcon tip="This prototype uses modeled / interpolated precinct data for both the 2027 Senate (single-seat, 4-year term) and General Assembly (two-seat, 2-year terms) races until certified results are imported." />
        </div>
      </div>

      {/* Assembly KPI row */}
      <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">Assembly (two-seat slate)</div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card>
          <Stat
            label="Baseline Slate Margin"
            value={fmtMargin(district.baseline.slateMarginPct, baselineMarginParty)}
            hint={`${fmtSigned(district.baseline.slateMarginVotes)} votes`}
            tone={baselineMarginParty === "D" ? "good" : baselineMarginParty === "R" ? "bad" : "neutral"}
          />
        </Card>
        <Card>
          <Stat
            label="Votes to Elect One"
            value={district.electsOne ? "Won" : fmtNumber(district.votesNeededToElectOne)}
            hint="Top D candidate vs. top R candidate"
            tone={district.electsOne ? "good" : "warn"}
          />
        </Card>
        <Card>
          <Stat
            label="Votes to Elect Both"
            value={district.electsBoth ? "Won" : fmtNumber(district.votesNeededToElectBoth)}
            hint="Both Assembly seats"
            tone={district.electsBoth ? "good" : "warn"}
          />
        </Card>
        <Card>
          <Stat
            label="Scenario Slate Margin"
            value={fmtMargin(district.scenario.slateMarginPct, scenarioMarginParty)}
            hint={`${fmtSigned(district.scenario.slateMarginVotes)} votes`}
            tone={scenarioMarginParty === "D" ? "good" : scenarioMarginParty === "R" ? "bad" : "neutral"}
          />
        </Card>
        <Card>
          <Stat
            label="Second-Seat Margin"
            value={fmtSigned(district.secondSeatMargin)}
            hint={`${district.finishers[1] ? CANDIDATES.find((c) => c.id === district.finishers[1].id)?.shortLabel : "—"} vs. ${district.finishers[2] ? CANDIDATES.find((c) => c.id === district.finishers[2].id)?.shortLabel : "—"}`}
            tone={district.secondSeatMargin > 80 ? "good" : "warn"}
          />
        </Card>
      </div>

      {/* Senate KPI row */}
      <div className="text-xs uppercase tracking-wide text-slate-500 mt-2">Senate (single-seat, 4-year term)</div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card>
          <Stat
            label="Senate Baseline Margin"
            value={fmtMargin(district.senate.baseline.marginPct, senateBaselineParty)}
            hint={`${fmtSigned(district.senate.baseline.marginVotes)} votes`}
            tone={senateBaselineParty === "D" ? "good" : senateBaselineParty === "R" ? "bad" : "neutral"}
          />
        </Card>
        <Card>
          <Stat
            label="Senate Scenario Margin"
            value={fmtMargin(district.senate.scenario.marginPct, senateScenarioParty)}
            hint={`${fmtSigned(district.senate.scenario.marginVotes)} votes`}
            tone={senateScenarioParty === "D" ? "good" : senateScenarioParty === "R" ? "bad" : "neutral"}
          />
        </Card>
        <Card>
          <Stat
            label="Votes to Win Senate"
            value={district.senate.electsD ? "Won" : fmtNumber(district.senate.votesNeededD)}
            hint="D candidate vs. R candidate"
            tone={district.senate.electsD ? "good" : "warn"}
          />
        </Card>
        <Card>
          <Stat
            label="Full Ticket"
            value={`D ${district.ticket.D} / R ${district.ticket.R}`}
            hint="Senate + Assembly seats (0–3)"
            tone={district.ticket.D >= 2 ? "good" : district.ticket.D === 1 ? "neutral" : "bad"}
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

      {/* Projected Outcome — Senate + Assembly + Full Ticket */}
      <Card
        title="Projected Outcome — Full Ticket"
        subtitle={`Scenario: ${preset?.name ?? "Custom"} — modeled, not a prediction`}
      >
        {/* Senate row */}
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Senate (single seat)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {(["senD", "senR"] as const).map((id) => {
            const cand = CANDIDATES.find((c) => c.id === id)!;
            const votes = id === "senD" ? district.senate.scenario.d : district.senate.scenario.r;
            const seated =
              (id === "senD" && district.ticket.senateWinner === "D") ||
              (id === "senR" && district.ticket.senateWinner === "R");
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
                  <span className="text-[11px] text-slate-500">{seated ? "Wins seat" : "Loses"}</span>
                </div>
                <div className="text-sm font-medium text-slate-700 mt-2">{cand.label}</div>
                <div className="text-xl font-semibold mt-1">{fmtNumber(votes)}</div>
              </div>
            );
          })}
        </div>

        {/* Assembly row */}
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Assembly (top 2 of 4 win)</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {district.finishers.map((f) => {
            const cand = CANDIDATES.find((c) => c.id === f.id)!;
            return (
              <div
                key={f.id}
                className={`rounded-lg border px-3 py-3 ${
                  f.seated
                    ? f.party === "D" ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Pill tone={f.party === "D" ? "dem" : "rep"}>{cand.shortLabel}</Pill>
                  <span className="text-[11px] text-slate-500">Rank {f.rank}</span>
                </div>
                <div className="text-sm font-medium text-slate-700 mt-2">{cand.label}</div>
                <div className="text-xl font-semibold mt-1">{fmtNumber(f.votes)}</div>
                <div className="text-[11px] mt-1 text-slate-500">
                  {f.seated ? "Projected to win seat" : "Projected to lose"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ticket summary */}
        <div className="mt-4 border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <Pill tone="navy">Full ticket</Pill>
            <span>
              <span className="text-blue-700 font-semibold">D {district.ticket.D}</span>{" "}/{" "}
              <span className="text-red-700 font-semibold">R {district.ticket.R}</span>{" "}
              <span className="text-slate-500">of 3 seats</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-slate-600">
            <span>
              Senate winner:{" "}
              <span className={
                district.ticket.senateWinner === "D" ? "text-blue-700 font-semibold"
                : district.ticket.senateWinner === "R" ? "text-red-700 font-semibold"
                : "font-semibold"
              }>{district.ticket.senateWinner === "tie" ? "Tie" : district.ticket.senateWinner}</span>
            </span>
            <span>
              Assembly seats:{" "}
              <span className="text-blue-700 font-semibold">D {district.seats.D}</span> /{" "}
              <span className="text-red-700 font-semibold">R {district.seats.R}</span>
            </span>
            <span>
              Second-seat margin: <span className="font-semibold">{fmtSigned(district.secondSeatMargin)}</span>
            </span>
          </div>
        </div>
      </Card>

      {/* Two-column: map + path-to-victory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card
            title="District Map"
            subtitle="LD8 precincts coloured by selected layer"
            right={
              <select
                value={state.mapLayer}
                onChange={(e) =>
                  dispatch({ type: "setMapLayer", layer: e.target.value as typeof state.mapLayer })
                }
                className="text-xs border border-slate-300 rounded px-2 py-1"
              >
                <option value="slate-margin">Assembly Slate Margin</option>
                <option value="senate-margin">Senate Margin</option>
                <option value="ticket-seats">Full Ticket Lean</option>
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
            {summaryNarrative(district, preset?.name ?? "Custom Scenario", modeImpact)}
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
                  <th className="px-2 py-2">County</th>
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
                    <td className="px-2 py-2 text-slate-500">{t.baseline.county}</td>
                    <td className="px-2 py-2">{fmtMargin(t.baselineSlateMarginPct)}</td>
                    <td className="px-2 py-2">{fmtMargin(t.scenarioSlateMarginPct)}</td>
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
  d: DistrictResult,
  scenarioName: string,
  m: { ed: number; early: number; vbm: number },
): string {
  const lead =
    d.electsBoth
      ? `This scenario elects both Democratic Assembly candidates`
      : d.electsOne
      ? `This scenario elects one Democratic Assembly candidate`
      : `This scenario falls ${d.votesNeededToElectOne} votes short of electing a Democratic Assembly candidate`;
  const focus = pickFocus(m);
  return `${lead}. The most efficient path under "${scenarioName}" leans on ${focus}, supplemented by persuasion in competitive Burlington and Atlantic County precincts and modest base-turnout expansion. Slate margin moves from ${Math.round(d.baseline.slateMarginVotes)} to ${Math.round(d.scenario.slateMarginVotes)} votes.`;
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
    layer === "slate-margin"
      ? [
          { c: "#7f1d1d", l: "Safe R" },
          { c: "#c66266", l: "Lean R" },
          { c: "#e2e8f0", l: "Toss-Up" },
          { c: "#7aa7d9", l: "Lean D" },
          { c: "#1e3a8a", l: "Safe D" },
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

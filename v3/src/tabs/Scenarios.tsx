import { useMemo, useState } from "react";
import {
  Card,
  Button,
  Pill,
  fmtMargin,
  fmtSigned,
} from "../components/UI";
import { SCENARIO_PRESETS, SCENARIO_BY_ID } from "../lib/scenarios/presets";
import { useApp } from "../state/store";
import type {
  PrecinctBaseline,
  ScenarioAssumptions,
} from "../lib/data/types";
import { calculateScenarioResult } from "../lib/modeling/scenario";
import { scoreScenarioRealism } from "../lib/modeling/realism";
import {
  findWinningPath,
  type WinningPathFlavor,
} from "../lib/modeling/winningPath";

const FLAVORS: { id: WinningPathFlavor; label: string }[] = [
  { id: "balanced", label: "Balanced" },
  { id: "vbm-heavy", label: "VBM-heavy" },
  { id: "field-heavy", label: "Field-heavy" },
  { id: "persuasion-heavy", label: "Persuasion-heavy" },
  { id: "base-turnout-heavy", label: "Base-turnout-heavy" },
  { id: "low-budget", label: "Low-budget" },
  { id: "max-upside", label: "Maximum upside" },
];

export function Scenarios({ precincts }: { precincts: PrecinctBaseline[] }) {
  const { state, dispatch } = useApp();
  const [mode, setMode] = useState<"simple" | "expert">(state.uiMode);
  const [savedName, setSavedName] = useState("");
  const [flavor, setFlavor] = useState<WinningPathFlavor>("balanced");
  const [goal, setGoal] = useState<"electOne" | "electBoth">("electOne");

  const preset = state.scenarioId !== "custom" ? SCENARIO_BY_ID[state.scenarioId] : null;

  // Comparison table: active + saved.
  const comparison = useMemo(() => {
    const rows = state.saved.map((s) => ({
      id: s.id,
      name: s.name,
      assumptions: s.assumptions,
    }));
    rows.unshift({
      id: "active",
      name: preset ? `Active: ${preset.name}` : "Active: Custom",
      assumptions: state.assumptions,
    });
    return rows.map((r) => {
      const { district, rows: rs } = calculateScenarioResult(precincts, r.assumptions);
      const realism = scoreScenarioRealism(r.assumptions, district, rs);
      return {
        ...r,
        district,
        realism,
      };
    });
  }, [state.saved, state.assumptions, preset, precincts]);

  function onFindPath() {
    const result = findWinningPath(
      precincts,
      state.assumptions,
      { target: goal },
      flavor,
    );
    dispatch({ type: "setAssumptions", a: result.assumptions });
    alert(result.summary + (result.feasible ? "" : "\n(Heuristic stopped after iteration cap.)"));
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-4 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Scenarios</h1>
          <p className="text-sm text-slate-600">Pick a preset, tune assumptions, or ask the model to find a winning path.</p>
        </div>
        <div className="inline-flex border border-slate-300 rounded-md overflow-hidden">
          <button
            onClick={() => { setMode("simple"); dispatch({ type: "setUiMode", m: "simple" }); }}
            className={`px-3 py-1.5 text-sm ${mode === "simple" ? "bg-navy-900 text-white" : "bg-white text-slate-700"}`}
          >Simple</button>
          <button
            onClick={() => { setMode("expert"); dispatch({ type: "setUiMode", m: "expert" }); }}
            className={`px-3 py-1.5 text-sm ${mode === "expert" ? "bg-navy-900 text-white" : "bg-white text-slate-700"}`}
          >Expert</button>
        </div>
      </div>

      {mode === "simple" ? (
        <Card title="Simple Mode — Preset scenarios">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SCENARIO_PRESETS.map((p) => {
              const active = state.scenarioId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => dispatch({ type: "selectScenario", id: p.id })}
                  className={`text-left rounded-lg border p-3 transition ${
                    active ? "border-navy-700 ring-2 ring-navy-300 bg-navy-50" : "border-slate-200 hover:border-navy-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    {active && <Pill tone="navy">Active</Pill>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 mb-2">{p.mainLever}</div>
                  <p className="text-sm text-slate-700">{p.description}</p>
                </button>
              );
            })}
            <button
              onClick={() => dispatch({ type: "selectScenario", id: "custom" })}
              className={`text-left rounded-lg border p-3 transition ${
                state.scenarioId === "custom" ? "border-navy-700 ring-2 ring-navy-300 bg-navy-50" : "border-dashed border-slate-300 hover:border-navy-400"
              }`}
            >
              <div className="font-semibold text-slate-800">Custom</div>
              <p className="text-sm text-slate-700 mt-1">Switch to Expert Mode to fine-tune every assumption.</p>
            </button>
          </div>
        </Card>
      ) : (
        <Card title="Expert Mode — Assumption controls">
          <ExpertControls
            a={state.assumptions}
            onChange={(patch) => dispatch({ type: "setAssumptions", a: patch })}
          />
        </Card>
      )}

      <Card
        title="Find a Winning Path"
        subtitle="Deterministic heuristic — adjusts a small set of high-leverage knobs in a fixed order until the goal is met."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Goal</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as "electOne" | "electBoth")}
              className="block mt-1 text-sm border border-slate-300 rounded px-2 py-1.5"
            >
              <option value="electOne">Elect one Assembly candidate</option>
              <option value="electBoth">Elect both Assembly candidates</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Flavor</label>
            <select
              value={flavor}
              onChange={(e) => setFlavor(e.target.value as WinningPathFlavor)}
              className="block mt-1 text-sm border border-slate-300 rounded px-2 py-1.5"
            >
              {FLAVORS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          <Button onClick={onFindPath}>Find a Winning Path</Button>
          <p className="text-xs text-slate-500">Modeled recommendation — not a prediction.</p>
        </div>
      </Card>

      <Card title="Saved scenario comparison">
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={savedName}
            onChange={(e) => setSavedName(e.target.value)}
            placeholder="Name this scenario…"
            className="border border-slate-300 rounded px-2 py-1.5 text-sm flex-1 max-w-xs"
          />
          <Button
            variant="secondary"
            disabled={!savedName.trim()}
            onClick={() => {
              dispatch({ type: "saveScenario", name: savedName.trim() });
              setSavedName("");
            }}
          >Save current scenario</Button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2">Scenario</th>
                <th className="px-2 py-2">Result</th>
                <th className="px-2 py-2">Elect One?</th>
                <th className="px-2 py-2">Elect Both?</th>
                <th className="px-2 py-2 text-right">Net Vote Gain</th>
                <th className="px-2 py-2">Realism</th>
                <th className="px-2 py-2">Main Lever</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-2 py-2 font-medium">{r.name}</td>
                  <td className="px-2 py-2">{fmtMargin(r.district.scenario.slateMarginPct)}</td>
                  <td className="px-2 py-2">{r.district.electsOne ? <Pill tone="green">Yes</Pill> : <Pill tone="slate">No</Pill>}</td>
                  <td className="px-2 py-2">{r.district.electsBoth ? <Pill tone="green">Yes</Pill> : <Pill tone="slate">No</Pill>}</td>
                  <td className="px-2 py-2 text-right">{fmtSigned(r.district.netSlateGain)}</td>
                  <td className="px-2 py-2"><Pill tone={r.realism.bucket === "Fantasy" ? "amber" : "slate"}>{r.realism.bucket}</Pill></td>
                  <td className="px-2 py-2 text-slate-600 text-xs">{mainLever(r.assumptions)}</td>
                  <td className="px-2 py-2 text-right">
                    {r.id !== "active" && (
                      <button
                        onClick={() => dispatch({ type: "deleteSaved", id: r.id })}
                        className="text-xs text-slate-400 hover:text-red-600"
                      >Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function mainLever(a: ScenarioAssumptions): string {
  const items: Array<[string, number]> = [
    ["D slate swing", Math.abs(a.demSlateSwing - a.repSlateSwing)],
    ["Turnout", Math.abs(a.turnoutDelta * 100)],
    ["VBM swing", Math.abs(a.vbmMarginSwing)],
    ["Early swing", Math.abs(a.earlyMarginSwing)],
    ["Election Day swing", Math.abs(a.edMarginSwing)],
    ["Bullet", a.bulletVoteRate * 100],
  ];
  items.sort((a, b) => b[1] - a[1]);
  return items[0][0];
}

function ExpertControls({
  a,
  onChange,
}: {
  a: ScenarioAssumptions;
  onChange: (p: Partial<ScenarioAssumptions>) => void;
}) {
  const sliders: Array<[keyof ScenarioAssumptions, string, number, number, number, string]> = [
    ["turnoutDelta", "Districtwide turnout change", -0.2, 0.2, 0.005, "Δ (frac)"],
    ["demSlateSwing", "Democratic slate swing", -10, 10, 0.1, "pp"],
    ["repSlateSwing", "Republican slate swing", -10, 10, 0.1, "pp"],
    ["candidateAAdjustment", "Candidate A overperformance", -5, 5, 0.1, "pp"],
    ["candidateBAdjustment", "Candidate B overperformance", -5, 5, 0.1, "pp"],
    ["bulletVoteRate", "Bullet vote rate", 0, 0.4, 0.01, "frac"],
    ["splitTicketRate", "Split-ticket rate", 0, 0.3, 0.01, "frac"],
    ["vbmShare", "VBM turnout share (override)", 0, 1, 0.01, "frac"],
    ["earlyShare", "Early vote turnout share (override)", 0, 1, 0.01, "frac"],
    ["edShare", "Election Day turnout share (override)", 0, 1, 0.01, "frac"],
    ["vbmMarginSwing", "VBM margin swing", -10, 10, 0.1, "pp"],
    ["earlyMarginSwing", "Early vote margin swing", -10, 10, 0.1, "pp"],
    ["edMarginSwing", "Election Day margin swing", -10, 10, 0.1, "pp"],
  ];
  const overrideSum = a.vbmShare + a.earlyShare + a.edShare;
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sliders.map(([k, label, min, max, step, unit]) => (
          <div key={String(k)} className="bg-slate-50 rounded-md p-2.5 border border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">{label}</label>
              <span className="text-xs font-mono text-slate-600">
                {(a[k] as number).toFixed(unit === "pp" ? 1 : 2)} {unit}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={a[k] as number}
              onChange={(e) => onChange({ [k]: parseFloat(e.target.value) } as Partial<ScenarioAssumptions>)}
              className="w-full mt-1"
            />
          </div>
        ))}
      </div>
      {overrideSum > 0 && Math.abs(overrideSum - 1) > 0.05 && (
        <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          ⚠ Vote-mode shares add to {overrideSum.toFixed(2)} (not 1.00). The model normalises automatically, but consider adjusting.
        </div>
      )}
    </div>
  );
}

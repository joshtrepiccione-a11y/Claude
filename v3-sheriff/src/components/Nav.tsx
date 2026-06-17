import { useApp, type TabId } from "../state/store";
import { SCENARIO_PRESETS } from "../lib/scenarios/presets";
import { BASELINES } from "../lib/data/config";
import { Button } from "./UI";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "map", label: "Map", icon: "◰" },
  { id: "targets", label: "Targets", icon: "◎" },
  { id: "scenarios", label: "Scenarios", icon: "⚙" },
  { id: "report", label: "Report", icon: "▤" },
  { id: "data", label: "Data", icon: "≣" },
];

// Gold sheriff star/badge mark.
function StarBadge() {
  return (
    <svg viewBox="0 0 64 64" className="w-8 h-8 shrink-0" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#16203c" />
      <path
        d="M32 9l5.9 9.2 10.6 2.9-7 8.5 0.7 11-10.2-4.2-10.2 4.2 0.7-11-7-8.5 10.6-2.9z"
        fill="#d4af37"
        stroke="#b8932a"
        strokeWidth="1"
      />
      <circle cx="32" cy="30" r="5" fill="#16203c" />
    </svg>
  );
}

export function Nav({
  onShareScenario,
  onExportReport,
}: {
  onShareScenario: () => void;
  onExportReport: () => void;
}) {
  const { state, dispatch } = useApp();
  return (
    <>
      <header className="bg-navy-900 text-white sticky top-0 z-30 shadow">
        <div className="max-w-[1500px] mx-auto px-4 py-2 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 mr-2 shrink-0">
            <StarBadge />
            <div className="leading-tight">
              <div className="font-semibold text-sm tracking-tight">
                Re-Elect Sheriff O'Donoghue
              </div>
              <div className="text-[11px] text-navy-200">
                Atlantic County · 2026 · Scenario Model
              </div>
            </div>
          </div>

          {/* Desktop primary tabs */}
          <nav className="hidden md:flex items-center gap-1 grow" aria-label="Primary">
            {TABS.map((t) => {
              const active = state.tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => dispatch({ type: "setTab", tab: t.id })}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    active ? "bg-white text-navy-900" : "text-navy-100 hover:bg-navy-800"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0 grow md:grow-0 flex-wrap justify-end">
            <BaselineSelect />
            <div className="flex items-center gap-2">
              <label className="text-xs text-navy-200" htmlFor="scenario-select">
                Scenario
              </label>
              <select
                id="scenario-select"
                value={state.scenarioId}
                onChange={(e) => dispatch({ type: "selectScenario", id: e.target.value })}
                className="bg-navy-800 text-white text-sm rounded-md border border-navy-700 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              >
                {SCENARIO_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </div>
            <Button variant="secondary" onClick={onShareScenario}>
              Share
            </Button>
            <Button variant="primary" onClick={onExportReport}>
              Export
            </Button>
          </div>
        </div>

        {/* tEnv slider — only active for the projected2026 blend baseline. */}
        {state.baselineId === "projected2026" && (
          <div className="max-w-[1500px] mx-auto px-4 pb-2 flex items-center gap-3 text-xs text-navy-100">
            <span className="shrink-0">Turnout environment</span>
            <span className="shrink-0 text-navy-300">2023 off-year</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.tEnv}
              onChange={(e) => dispatch({ type: "setTEnv", v: parseFloat(e.target.value) })}
              className="flex-1 accent-[#d4af37]"
              aria-label="Turnout environment factor"
            />
            <span className="shrink-0 text-navy-300">2020 presidential</span>
            <span className="shrink-0 font-mono w-10 text-right text-[#d4af37]">
              {state.tEnv.toFixed(2)}
            </span>
          </div>
        )}
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-navy-900 border-t border-navy-700 grid grid-cols-6"
        aria-label="Primary mobile"
      >
        {TABS.map((t) => {
          const active = state.tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => dispatch({ type: "setTab", tab: t.id })}
              className={`flex flex-col items-center justify-center py-2 min-h-[56px] text-[10px] font-medium ${
                active ? "text-[#d4af37]" : "text-navy-200"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="text-base leading-none mb-0.5" aria-hidden="true">
                {t.icon}
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}

function BaselineSelect() {
  const { state, dispatch } = useApp();
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-navy-200" htmlFor="baseline-select">
        Baseline
      </label>
      <select
        id="baseline-select"
        value={state.baselineId}
        onChange={(e) =>
          dispatch({ type: "setBaseline", id: e.target.value as typeof state.baselineId })
        }
        className="bg-navy-800 text-white text-sm rounded-md border border-navy-700 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
      >
        {BASELINES.map((b) => (
          <option key={b.id} value={b.id}>
            {b.short}
          </option>
        ))}
      </select>
    </div>
  );
}

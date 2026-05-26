import { useApp, type TabId } from "../state/store";
import { SCENARIO_PRESETS } from "../lib/scenarios/presets";
import { Button } from "./UI";

const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "map", label: "Map" },
  { id: "targets", label: "Targets" },
  { id: "scenarios", label: "Scenarios" },
  { id: "report", label: "Report" },
  { id: "data", label: "Data" },
];

export function Nav({
  onShareScenario,
  onExportReport,
}: {
  onShareScenario: () => void;
  onExportReport: () => void;
}) {
  const { state, dispatch } = useApp();
  return (
    <header className="bg-navy-900 text-white sticky top-0 z-30 shadow">
      <div className="max-w-[1500px] mx-auto px-4 py-2 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2 mr-2 shrink-0">
          <div className="w-7 h-7 rounded bg-navy-700 flex items-center justify-center text-xs font-bold">
            P→V
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm tracking-tight">Path to Victory</div>
            <div className="text-[11px] text-navy-200">NJ LD8 · 2027 Assembly</div>
          </div>
        </div>

        <nav className="flex items-center gap-1 grow" aria-label="Primary">
          {TABS.map((t) => {
            const active = state.tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => dispatch({ type: "setTab", tab: t.id })}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  active
                    ? "bg-white text-navy-900"
                    : "text-navy-100 hover:bg-navy-800"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs text-navy-200 mr-1" htmlFor="scenario-select">
            Scenario
          </label>
          <select
            id="scenario-select"
            value={state.scenarioId}
            onChange={(e) =>
              dispatch({ type: "selectScenario", id: e.target.value })
            }
            className="bg-navy-800 text-white text-sm rounded-md border border-navy-700 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300"
          >
            {SCENARIO_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
          <Button variant="secondary" onClick={onShareScenario}>
            Share Scenario
          </Button>
          <Button variant="primary" onClick={onExportReport}>
            Export Report
          </Button>
        </div>
      </div>
    </header>
  );
}

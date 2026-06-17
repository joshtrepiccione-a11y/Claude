import { useEffect, useMemo, useState } from "react";
import { StoreProvider, useApp } from "./state/store";
import { Nav } from "./components/Nav";
import { Dashboard } from "./tabs/Dashboard";
import { MapTab } from "./tabs/MapTab";
import { Targets } from "./tabs/Targets";
import { Scenarios } from "./tabs/Scenarios";
import { Report } from "./tabs/Report";
import { Data } from "./tabs/Data";
import {
  loadCounty,
  selectBaseline,
  layerMarginPctR,
  type LoadedData,
} from "./lib/data/load";
import { calculateScenarioResult } from "./lib/modeling/scenario";

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { state, dispatch } = useApp();
  const [data, setData] = useState<LoadedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCounty().then(setData).catch((e) => setError(String(e)));
  }, []);

  // Turnout sensitivity per precinct: 2023 R-margin% − 2020 R-margin%.
  // Computed once from the raw layers; independent of the active baseline.
  const sensitivityById = useMemo(() => {
    const m = new Map<string, number>();
    if (!data) return m;
    for (const pl of data.layers) {
      m.set(pl.precinctId, layerMarginPctR(pl.sheriff2023) - layerMarginPctR(pl.sheriff2020));
    }
    return m;
  }, [data]);

  // Flatten the chosen baseline (or blend) into the engine's PrecinctBaseline[].
  const precincts = useMemo(() => {
    if (!data) return null;
    return selectBaseline(data.layers, state.baselineId, state.tEnv);
  }, [data, state.baselineId, state.tEnv]);

  const computed = useMemo(() => {
    if (!precincts) return null;
    return calculateScenarioResult(precincts, state.assumptions, sensitivityById);
  }, [precincts, state.assumptions, sensitivityById]);

  if (error) {
    return (
      <div className="p-8 text-red-700">
        <h1 className="font-bold mb-2">Failed to load Atlantic County data</h1>
        <pre className="text-xs">{error}</pre>
      </div>
    );
  }
  if (!data || !precincts || !computed) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        <div className="text-center">
          <div className="animate-pulse text-sm">Loading Atlantic County precinct data…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 md:pb-0">
      <Nav
        onShareScenario={() => navigator.clipboard?.writeText(window.location.href)}
        onExportReport={() => {
          dispatch({ type: "setTab", tab: "report" });
          setTimeout(() => window.print(), 200);
        }}
      />
      {state.tab === "dashboard" && (
        <Dashboard rows={computed.rows} county={computed.county} geojson={data.geojson} />
      )}
      {state.tab === "map" && <MapTab rows={computed.rows} geojson={data.geojson} />}
      {state.tab === "targets" && <Targets rows={computed.rows} />}
      {state.tab === "scenarios" && (
        <Scenarios precincts={precincts} sensitivityById={sensitivityById} />
      )}
      {state.tab === "report" && <Report rows={computed.rows} county={computed.county} />}
      {state.tab === "data" && (
        <Data rows={computed.rows} warnings={data.warnings} calibration={data.calibration} />
      )}
      <footer className="text-center text-xs text-slate-500 py-6 no-print">
        Re-Elect Sheriff Joe O'Donoghue · Atlantic County 2026 · Outputs are modeled, not predictions.
      </footer>
    </div>
  );
}

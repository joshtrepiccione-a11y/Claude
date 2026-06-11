import { useEffect, useMemo, useState } from "react";
import { StoreProvider, useApp } from "./state/store";
import { Nav } from "./components/Nav";
import { Dashboard } from "./tabs/Dashboard";
import { MapTab } from "./tabs/MapTab";
import { Targets } from "./tabs/Targets";
import { Scenarios } from "./tabs/Scenarios";
import { Report } from "./tabs/Report";
import { Data } from "./tabs/Data";
import { loadCounty, type LoadedData } from "./lib/data/load";
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

  const computed = useMemo(() => {
    if (!data) return null;
    return calculateScenarioResult(data.precincts, state.assumptions);
  }, [data, state.assumptions]);

  if (error) {
    return (
      <div className="p-8 text-red-700">
        <h1 className="font-bold mb-2">Failed to load Atlantic County data</h1>
        <pre className="text-xs">{error}</pre>
      </div>
    );
  }
  if (!data || !computed) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        <div className="text-center">
          <div className="animate-pulse text-sm">Loading Atlantic County precinct data…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav
        onShareScenario={() => navigator.clipboard?.writeText(window.location.href)}
        onExportReport={() => {
          dispatch({ type: "setTab", tab: "report" });
          // Defer print so the Report tab can mount.
          setTimeout(() => window.print(), 200);
        }}
      />
      {state.tab === "dashboard" && (
        <Dashboard rows={computed.rows} county={computed.county} geojson={data.geojson} />
      )}
      {state.tab === "map" && (
        <MapTab rows={computed.rows} geojson={data.geojson} />
      )}
      {state.tab === "targets" && <Targets rows={computed.rows} />}
      {state.tab === "scenarios" && <Scenarios precincts={data.precincts} />}
      {state.tab === "report" && (
        <Report rows={computed.rows} county={computed.county} />
      )}
      {state.tab === "data" && <Data rows={computed.rows} warnings={data.warnings} />}
      <footer className="text-center text-xs text-slate-500 py-6 no-print">
        Bender for County Clerk · Atlantic County 2026 · Outputs are modeled, not predictions.
      </footer>
    </div>
  );
}

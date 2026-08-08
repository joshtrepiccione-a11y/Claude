import { useEffect, useMemo, useState } from "react";
import { StoreProvider, useApp, type State } from "./state/store";
import { loadBoeData } from "./lib/data/load";
import type { BoeData } from "./lib/data/types";
import { Nav } from "./components/Nav";
import { Turnaround } from "./tabs/Turnaround";
import { MapTab } from "./tabs/MapTab";
import { Results } from "./tabs/Results";
import { About } from "./tabs/About";

export function App() {
  const [data, setData] = useState<BoeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBoeData()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const initial = useMemo<State | null>(() => {
    if (!data) return null;
    const years = data.meta.years;
    const latest = years[years.length - 1];
    const earliest = years[0];
    return {
      tab: "turnaround",
      focus: data.meta.focusCandidateDefault ?? data.meta.allCandidates[0] ?? null,
      year: latest,
      compareYear: earliest,
      mode: "all",
      // The 2021→2023 change map is the default view.
      metric: "change",
      selectedPrecinct: null,
    };
  }, [data]);

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="font-bold text-red-700 mb-2">
          Could not load the certified results
        </h1>
        <pre className="text-xs whitespace-pre-wrap text-slate-700">{error}</pre>
      </div>
    );
  }
  if (!data || !initial) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        <div className="animate-pulse text-sm">
          Loading certified Hammonton results…
        </div>
      </div>
    );
  }

  return (
    <StoreProvider initial={initial}>
      <Shell data={data} />
    </StoreProvider>
  );
}

function Shell({ data }: { data: BoeData }) {
  const { state } = useApp();
  const years = data.meta.years;
  const focus = state.focus ?? data.meta.allCandidates[0] ?? "";

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav data={data} />
      {state.tab === "turnaround" && (
        <Turnaround
          data={data}
          focus={focus}
          fromYear={years[0]}
          toYear={years[years.length - 1]}
        />
      )}
      {state.tab === "map" && (
        <MapTab data={data} focus={focus} years={years} />
      )}
      {state.tab === "results" && (
        <Results data={data} focus={focus} years={years} />
      )}
      {state.tab === "about" && <About data={data} focus={focus} />}
      <footer className="text-center text-xs text-slate-500 py-6 px-4 no-print">
        Hammonton School Board — Pullia Vote Patterns · {years.join(" → ")} ·
        Certified Atlantic County results. Measured, not modeled.
      </footer>
    </div>
  );
}

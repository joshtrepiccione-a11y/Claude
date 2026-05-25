import { useEffect, useMemo, useState } from "react";
import { useStore } from "./state/store";
import { loadPrecincts, uniqueMunis } from "./data/load";
import {
  readMuniOverridesFromUrl,
  readScenarioFromUrl,
  readUrl,
  writeUrl,
} from "./state/urlSync";
import type { PrecinctCollection } from "./data/types";
import { computeAll } from "./model/scenario";
import { AppHeader } from "./components/layout/AppHeader";
import { KpiBar } from "./components/layout/KpiBar";
import { ScenarioSummary } from "./components/panels/ScenarioSummary";
import { PathToVictory } from "./components/panels/PathToVictory";
import { PrecinctTable } from "./components/panels/PrecinctTable";
import { MunicipalityDashboard } from "./components/panels/MunicipalityDashboard";
import { DataNotes } from "./components/panels/DataNotes";
import { PrecinctMap } from "./components/map/PrecinctMap";
import { MapLayerControls } from "./components/map/MapLayerControls";
import { HoverPanel } from "./components/map/HoverPanel";
import { ExpertDrawer } from "./components/controls/ExpertDrawer";
import { makeContext, scorePrecinct } from "./model/scoring";
import { CANDIDATES } from "./data/candidates";

export function App() {
  const [fc, setFc] = useState<PrecinctCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expertOpen, setExpertOpen] = useState(false);
  const [hoveredPrecinct, setHoveredPrecinct] = useState<string | undefined>();
  const store = useStore();

  // Load data once.
  useEffect(() => {
    loadPrecincts()
      .then((data) => {
        setFc(data);
        const munis = uniqueMunis(data);
        // Set baseline defaults from the GeoJSON calibration block.
        const cal = data.features[0]?.properties.calibration;
        if (cal) {
          const def = {
            ...useStore.getState().baselineDefaults,
            bullet: cal.bullet_pct,
            intraD: cal.intra_d_d1,
            intraR: cal.intra_r_r1,
          };
          useStore.getState().setBaselineDefaults(def);
          // Apply URL state on top of fresh defaults.
          const urlUI = readUrl();
          if (urlUI.uiMode) useStore.getState().setUiMode(urlUI.uiMode);
          if (urlUI.view) useStore.getState().setView(urlUI.view);
          if (urlUI.raceFocus) useStore.getState().setRaceFocus(urlUI.raceFocus);
          if (urlUI.mapLayer) useStore.getState().setMapLayer(urlUI.mapLayer);
          const scen = readScenarioFromUrl(def);
          scen.muniOverrides = readMuniOverridesFromUrl(munis);
          useStore.getState().setScenario(scen);
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  const munis = useMemo(() => (fc ? uniqueMunis(fc) : []), [fc]);

  // Recompute results + scores whenever scenario or view changes.
  const results = useMemo(() => {
    if (!fc) return [];
    return computeAll(fc, {
      view: store.view,
      scenario: store.scenario,
      baselineDefaults: store.baselineDefaults,
    });
  }, [fc, store.view, store.scenario, store.baselineDefaults]);

  const scoringCtx = useMemo(() => makeContext(results), [results]);
  const scoresById = useMemo(() => {
    const m = new Map<string, ReturnType<typeof scorePrecinct>>();
    for (const r of results) {
      m.set(r.feature.properties.precinct, scorePrecinct(r, scoringCtx));
    }
    return m;
  }, [results, scoringCtx]);

  // URL sync (write on relevant state change).
  useEffect(() => {
    if (!fc) return;
    writeUrl(useStore.getState(), munis);
  }, [
    fc,
    munis,
    store.uiMode,
    store.view,
    store.raceFocus,
    store.mapLayer,
    store.scenario,
  ]);

  if (error) {
    return <div className="loading">Failed to load: {error}</div>;
  }
  if (!fc) {
    return <div className="loading">Loading LD8 precinct data…</div>;
  }

  return (
    <div className="app-shell">
      <AppHeader
        uiMode={store.uiMode}
        onUiModeChange={store.setUiMode}
        view={store.view}
        onViewChange={store.setView}
        raceFocus={store.raceFocus}
        onRaceFocusChange={store.setRaceFocus}
        onOpenExpert={() => setExpertOpen(true)}
        results={results}
        scoresById={scoresById}
      />
      <KpiBar
        results={results}
        scoresById={scoresById}
        raceFocus={store.raceFocus}
        candidates={CANDIDATES}
        view={store.view}
      />
      <div className="main-area" style={{ overflow: "auto" }}>
        <div className="main-map">
          <PrecinctMap
            results={results}
            scoresById={scoresById}
            mapLayer={store.mapLayer}
            raceFocus={store.raceFocus}
            mode={store.scenario.mode}
            onHover={setHoveredPrecinct}
            onSelect={store.setSelectedPrecinct}
            selectedPrecinct={store.selectedPrecinct}
          />
          <MapLayerControls
            uiMode={store.uiMode}
            mapLayer={store.mapLayer}
            onChange={store.setMapLayer}
          />
        </div>
        <div className="main-side">
          <ScenarioSummary
            results={results}
            scoresById={scoresById}
            raceFocus={store.raceFocus}
            candidates={CANDIDATES}
            view={store.view}
          />
          <HoverPanel
            results={results}
            scoresById={scoresById}
            hoveredId={hoveredPrecinct}
            selectedId={store.selectedPrecinct}
            mode={store.scenario.mode}
            view={store.view}
            candidates={CANDIDATES}
          />
        </div>
        <div className="lower-stack">
          <PathToVictory
            fc={fc}
            results={results}
            scenario={store.scenario}
            baselineDefaults={store.baselineDefaults}
            munis={munis}
            candidates={CANDIDATES}
          />
          {store.uiMode === "expert" && (
            <MunicipalityDashboard
              results={results}
              scoresById={scoresById}
              selectedMuni={store.selectedMuni}
              onSelectMuni={store.setSelectedMuni}
            />
          )}
          <PrecinctTable
            results={results}
            scoresById={scoresById}
            selectedPrecinct={store.selectedPrecinct}
            onSelectPrecinct={store.setSelectedPrecinct}
            uiMode={store.uiMode}
          />
          <DataNotes />
        </div>
      </div>
      <ExpertDrawer
        open={expertOpen}
        onClose={() => setExpertOpen(false)}
        munis={munis}
      />
    </div>
  );
}

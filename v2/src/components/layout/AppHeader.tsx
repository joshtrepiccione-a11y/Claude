import { useStore } from "../../state/store";
import { PRESETS } from "../../model/scenarioPresets";
import {
  downloadCsv,
  muniCsv,
  muniSummaryRows,
  precinctCsv,
  precinctRows,
} from "../../model/exportUtils";
import type { PrecinctResult, RaceKey, UiMode, ViewKey } from "../../data/types";
import type { ScorePrecinct } from "../panels/PrecinctTable";

type Props = {
  uiMode: UiMode;
  onUiModeChange: (m: UiMode) => void;
  view: ViewKey;
  onViewChange: (v: ViewKey) => void;
  raceFocus: RaceKey;
  onRaceFocusChange: (r: RaceKey) => void;
  onOpenExpert: () => void;
  results: PrecinctResult[];
  scoresById: Map<string, ScorePrecinct>;
};

export function AppHeader({
  uiMode,
  onUiModeChange,
  view,
  onViewChange,
  raceFocus,
  onRaceFocusChange,
  onOpenExpert,
  results,
  scoresById,
}: Props) {
  const store = useStore();
  const activePreset = store.scenario.activePreset;

  const handlePreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const next = preset.apply(store.scenario, store.baselineDefaults);
    store.setScenario(next);
    if (id !== "baseline") onViewChange("scenario");
  };

  const handleShare = async () => {
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      window.alert("Shareable URL copied to clipboard.");
    } catch {
      window.prompt("Copy this URL:", url);
    }
  };

  const handleExport = (kind: "precincts" | "munis") => {
    const scoreLite = new Map<string, { persuasion: number; baseTurnout: number; vbm: number; overall: number; action: string }>();
    for (const [k, v] of scoresById)
      scoreLite.set(k, {
        persuasion: v.persuasion,
        baseTurnout: v.baseTurnout,
        vbm: v.vbm,
        overall: v.overall,
        action: v.recommendation.primary,
      });
    if (kind === "precincts") {
      const rows = precinctRows(results, scoreLite);
      downloadCsv(`ld8_precincts_${Date.now()}.csv`, precinctCsv(rows));
    } else {
      const rows = muniSummaryRows(results, scoreLite);
      downloadCsv(`ld8_munis_${Date.now()}.csv`, muniCsv(rows));
    }
  };

  return (
    <header className="app-header">
      <h1>LD8 Campaign Intelligence</h1>
      <span className="sub">NJ Legislative District 8 · 2027 (hypothetical)</span>
      <span className="spacer" />

      <div className="control">
        <label className="muted tiny">Race</label>
        <select
          value={raceFocus}
          onChange={(e) => onRaceFocusChange(e.target.value as RaceKey)}
          aria-label="Race focus"
        >
          <option value="sen">State Senate</option>
          <option value="asm">General Assembly</option>
        </select>
      </div>

      <div className="control">
        <label className="muted tiny">View</label>
        <select
          value={view}
          onChange={(e) => onViewChange(e.target.value as ViewKey)}
          aria-label="View mode"
        >
          <option value="baseline">Baseline</option>
          <option value="scenario">Scenario</option>
        </select>
      </div>

      <div className="control">
        <label className="muted tiny">Preset</label>
        <select
          value={activePreset ?? "baseline"}
          onChange={(e) => handlePreset(e.target.value)}
          aria-label="Scenario preset"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id} title={p.description}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mode-toggle" role="tablist" aria-label="UI mode">
        <button
          className={uiMode === "candidate" ? "active" : ""}
          onClick={() => onUiModeChange("candidate")}
          role="tab"
          aria-selected={uiMode === "candidate"}
        >
          Candidate
        </button>
        <button
          className={uiMode === "expert" ? "active" : ""}
          onClick={() => onUiModeChange("expert")}
          role="tab"
          aria-selected={uiMode === "expert"}
        >
          Expert
        </button>
      </div>

      <button onClick={onOpenExpert} title="Open advanced controls">
        Sliders
      </button>
      <button onClick={() => handleExport("precincts")} title="Export precinct table CSV">
        CSV
      </button>
      <button onClick={handleShare} className="primary">
        Share
      </button>
    </header>
  );
}

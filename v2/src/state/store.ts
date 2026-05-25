// Global app store (Zustand). Holds UI mode + scenario state. Scenario
// math lives in src/model/scenario.ts; the store just owns state.

import { create } from "zustand";
import type {
  ModeKey,
  RaceKey,
  ScenarioState,
  UiMode,
  ViewKey,
} from "../data/types";

export type MapLayerKey =
  | "sen_margin"
  | "asm_margin"
  | "asm_outcome"
  | "turnout"
  | "net_change"
  | "strategic_priority";

export type AppState = {
  uiMode: UiMode;
  view: ViewKey;
  raceFocus: RaceKey;
  mapLayer: MapLayerKey;
  selectedPrecinct?: string;
  selectedMuni?: string;
  scenario: ScenarioState;
  baselineDefaults: ScenarioState;

  // actions
  setUiMode: (m: UiMode) => void;
  setView: (v: ViewKey) => void;
  setRaceFocus: (r: RaceKey) => void;
  setMapLayer: (l: MapLayerKey) => void;
  setSelectedPrecinct: (p: string | undefined) => void;
  setSelectedMuni: (m: string | undefined) => void;
  setMode: (m: "total" | ModeKey) => void;
  setScenario: (s: ScenarioState) => void;
  setBaselineDefaults: (s: ScenarioState) => void;
  resetScenario: () => void;
  updateScenario: (patch: Partial<ScenarioState>) => void;
};

const DEFAULT_SCENARIO: ScenarioState = {
  mode: "total",
  senSwing: { ed: 0, ev: 0, vbm: 0 },
  asmSwing: { ed: 0, ev: 0, vbm: 0 },
  cwShare: { ed: 55, ev: 15, vbm: 30 },
  bullet: 5,
  intraD: 50.07,
  intraR: 51.08,
  coattail: 0,
  muniOverrides: {},
};

export const useStore = create<AppState>((set, get) => ({
  uiMode: "candidate",
  view: "baseline",
  raceFocus: "sen",
  mapLayer: "strategic_priority",
  scenario: { ...DEFAULT_SCENARIO },
  baselineDefaults: { ...DEFAULT_SCENARIO },

  setUiMode: (m) => set({ uiMode: m }),
  setView: (v) => set({ view: v }),
  setRaceFocus: (r) => set({ raceFocus: r }),
  setMapLayer: (l) => set({ mapLayer: l }),
  setSelectedPrecinct: (p) => set({ selectedPrecinct: p }),
  setSelectedMuni: (m) => set({ selectedMuni: m }),
  setMode: (m) => set({ scenario: { ...get().scenario, mode: m } }),
  setScenario: (s) => set({ scenario: s }),
  setBaselineDefaults: (s) => set({ baselineDefaults: s }),
  resetScenario: () => set({ scenario: { ...get().baselineDefaults } }),
  updateScenario: (patch) =>
    set({ scenario: { ...get().scenario, ...patch } }),
}));

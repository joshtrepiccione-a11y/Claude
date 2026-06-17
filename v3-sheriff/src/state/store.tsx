// Minimal store using React useReducer/context pattern. Keeps the surface
// small and avoids extra dependencies. The store holds tab, baseline selector,
// turnout-environment knob, scenario, map view, and target/data filters.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { ScenarioAssumptions, VoteModeId, BaselineId } from "../lib/data/types";
import { defaultAssumptions } from "../lib/modeling/scenario";
import { SCENARIO_BY_ID } from "../lib/scenarios/presets";
import { DEFAULT_BASELINE_ID, DEFAULT_T_ENV } from "../lib/data/config";
import type { MapLayerId } from "../lib/data/mapLayers";

export type TabId = "dashboard" | "map" | "targets" | "scenarios" | "report" | "data";
export type MapLayer = MapLayerId;

export interface AppState {
  tab: TabId;
  baselineId: BaselineId;
  tEnv: number;                     // turnout environment for projected2026.
  scenarioId: string;
  assumptions: ScenarioAssumptions;
  mapLayer: MapLayer;
  voteModeFilter: VoteModeId | "all";
  selectedPrecinct: string | null;
  municipalityFilter: string[];
  uiMode: "simple" | "expert";
  minNetVoteFilter: number;
  saved: Array<{
    id: string;
    name: string;
    scenarioId: string;
    baselineId: BaselineId;
    tEnv: number;
    assumptions: ScenarioAssumptions;
    savedAt: string;
  }>;
}

const DEFAULT_SCENARIO = "replay-2023-hold";

const INITIAL: AppState = {
  tab: "dashboard",
  baselineId: DEFAULT_BASELINE_ID,
  tEnv: DEFAULT_T_ENV,
  scenarioId: DEFAULT_SCENARIO,
  assumptions: SCENARIO_BY_ID[DEFAULT_SCENARIO]?.assumptions ?? defaultAssumptions(),
  mapLayer: "margin",
  voteModeFilter: "all",
  selectedPrecinct: null,
  municipalityFilter: [],
  uiMode: "simple",
  minNetVoteFilter: 0,
  saved: [],
};

export type Action =
  | { type: "setTab"; tab: TabId }
  | { type: "setBaseline"; id: BaselineId }
  | { type: "setTEnv"; v: number }
  | { type: "selectScenario"; id: string }
  | { type: "setAssumptions"; a: Partial<ScenarioAssumptions> }
  | { type: "setMapLayer"; layer: MapLayer }
  | { type: "setVoteModeFilter"; m: VoteModeId | "all" }
  | { type: "selectPrecinct"; id: string | null }
  | { type: "setMuniFilter"; m: string[] }
  | { type: "setUiMode"; m: "simple" | "expert" }
  | { type: "setMinNetVote"; v: number }
  | { type: "saveScenario"; name: string }
  | { type: "deleteSaved"; id: string };

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case "setTab":
      return { ...s, tab: a.tab };
    case "setBaseline":
      return { ...s, baselineId: a.id, scenarioId: "custom" };
    case "setTEnv":
      return { ...s, tEnv: a.v, scenarioId: "custom" };
    case "selectScenario": {
      const preset = SCENARIO_BY_ID[a.id];
      if (!preset) return { ...s, scenarioId: a.id };
      return {
        ...s,
        scenarioId: a.id,
        assumptions: preset.assumptions,
        baselineId: preset.baselineId ?? s.baselineId,
        tEnv: preset.tEnv ?? s.tEnv,
      };
    }
    case "setAssumptions":
      return {
        ...s,
        assumptions: { ...s.assumptions, ...a.a },
        scenarioId: "custom",
      };
    case "setMapLayer":
      return { ...s, mapLayer: a.layer };
    case "setVoteModeFilter":
      return { ...s, voteModeFilter: a.m };
    case "selectPrecinct":
      return { ...s, selectedPrecinct: a.id };
    case "setMuniFilter":
      return { ...s, municipalityFilter: a.m };
    case "setUiMode":
      return { ...s, uiMode: a.m };
    case "setMinNetVote":
      return { ...s, minNetVoteFilter: a.v };
    case "saveScenario": {
      const id = String(Date.now());
      return {
        ...s,
        saved: [
          ...s.saved,
          {
            id,
            name: a.name,
            scenarioId: s.scenarioId,
            baselineId: s.baselineId,
            tEnv: s.tEnv,
            assumptions: s.assumptions,
            savedAt: new Date().toISOString(),
          },
        ],
      };
    }
    case "deleteSaved":
      return { ...s, saved: s.saved.filter((x) => x.id !== a.id) };
  }
}

const Ctx = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL, (init) => ({
    ...init,
    ...readUrl(),
  }));

  useEffect(() => {
    writeUrl(state);
  }, [state.tab, state.scenarioId, state.mapLayer, state.assumptions, state.baselineId, state.tEnv]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <StoreProvider>");
  return ctx;
}

function writeUrl(s: AppState) {
  const params = new URLSearchParams();
  if (s.tab !== "dashboard") params.set("tab", s.tab);
  if (s.scenarioId) params.set("sc", s.scenarioId);
  if (s.baselineId !== DEFAULT_BASELINE_ID) params.set("base", s.baselineId);
  if (s.baselineId === "projected2026") params.set("tenv", s.tEnv.toFixed(2));
  if (s.mapLayer !== "margin") params.set("layer", s.mapLayer);
  if (s.scenarioId === "custom") {
    const a = s.assumptions;
    const def = defaultAssumptions();
    for (const [k, v] of Object.entries(a) as [keyof ScenarioAssumptions, unknown][]) {
      if (k === "municipalityOverrides" || k === "precinctOverrides") continue;
      if (typeof v === "number" && v !== (def[k] as number)) {
        params.set(k, String(v));
      }
    }
  }
  const next = `#${params.toString()}`;
  if (next !== window.location.hash) {
    history.replaceState(null, "", next || window.location.pathname);
  }
}

function readUrl(): Partial<AppState> {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return {};
  const params = new URLSearchParams(hash);
  const out: Partial<AppState> = {};
  const tab = params.get("tab");
  if (tab) out.tab = tab as TabId;
  const base = params.get("base");
  if (base) out.baselineId = base as BaselineId;
  const tenv = params.get("tenv");
  if (tenv != null) out.tEnv = parseFloat(tenv);
  const sc = params.get("sc");
  if (sc) {
    out.scenarioId = sc;
    const preset = SCENARIO_BY_ID[sc];
    if (preset) {
      out.assumptions = preset.assumptions;
      if (preset.baselineId) out.baselineId = preset.baselineId;
      if (preset.tEnv != null) out.tEnv = preset.tEnv;
    }
  }
  const layer = params.get("layer");
  if (layer) out.mapLayer = layer as MapLayer;
  if (sc === "custom") {
    const a: ScenarioAssumptions = { ...defaultAssumptions() };
    let any = false;
    for (const k of Object.keys(a) as Array<keyof ScenarioAssumptions>) {
      const v = params.get(k);
      if (v != null && typeof a[k] === "number") {
        (a as Record<keyof ScenarioAssumptions, number | unknown>)[k] = parseFloat(v);
        any = true;
      }
    }
    if (any) out.assumptions = a;
  }
  return out;
}

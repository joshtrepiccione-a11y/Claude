// Minimal store using React useReducer/context pattern. Keeps the surface
// small and avoids extra dependencies. The store holds tab, scenario, map
// view, and target/data filters.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { ScenarioAssumptions, VoteModeId } from "../lib/data/types";
import { defaultAssumptions } from "../lib/modeling/scenario";
import { SCENARIO_BY_ID } from "../lib/scenarios/presets";

export type TabId = "dashboard" | "map" | "targets" | "scenarios" | "report" | "data";
export type MapLayer =
  | "margin"                        // Clerk race margin
  | "net-vote-opportunity"
  | "turnout-opportunity"
  | "persuasion-opportunity"
  | "vote-mode-priority"
  | "risk"
  | "recommended-action";

export interface AppState {
  tab: TabId;
  scenarioId: string;
  assumptions: ScenarioAssumptions;
  mapLayer: MapLayer;
  voteModeFilter: VoteModeId | "all";
  selectedPrecinct: string | null;
  municipalityFilter: string[];
  uiMode: "simple" | "expert";
  minNetVoteFilter: number;
  // Saved comparison scenarios.
  saved: Array<{
    id: string;
    name: string;
    scenarioId: string;
    assumptions: ScenarioAssumptions;
    savedAt: string;
  }>;
}

const INITIAL: AppState = {
  tab: "dashboard",
  scenarioId: "baseline-2021",
  assumptions: SCENARIO_BY_ID["baseline-2021"]?.assumptions ?? defaultAssumptions(),
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
    case "selectScenario": {
      const preset = SCENARIO_BY_ID[a.id];
      return {
        ...s,
        scenarioId: a.id,
        assumptions: preset ? preset.assumptions : s.assumptions,
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

  // Sync to URL whenever shareable state changes.
  useEffect(() => {
    writeUrl(state);
  }, [state.tab, state.scenarioId, state.mapLayer, state.assumptions]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <StoreProvider>");
  return ctx;
}

// URL sync: encode tab, scenario id, map layer, and any non-default
// assumption values into hash params.
function writeUrl(s: AppState) {
  const params = new URLSearchParams();
  if (s.tab !== "dashboard") params.set("tab", s.tab);
  if (s.scenarioId) params.set("sc", s.scenarioId);
  if (s.mapLayer !== "margin") params.set("layer", s.mapLayer);
  // Only encode assumptions if scenario is "custom" to keep urls short.
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
  const sc = params.get("sc");
  if (sc) {
    out.scenarioId = sc;
    if (SCENARIO_BY_ID[sc]) out.assumptions = SCENARIO_BY_ID[sc].assumptions;
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

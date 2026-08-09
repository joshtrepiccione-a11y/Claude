import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Mode } from "../lib/data/types";
import type { MetricId } from "../lib/data/mapLayers";

export type TabId = "turnaround" | "map" | "results" | "about";

export interface State {
  tab: TabId;
  /** Focus candidate. Defaults to the file's focusCandidateDefault (Pullia). */
  focus: string | null;
  /** Year shown on the map and in Results. */
  year: string;
  /** The year the map's change metric compares against. */
  compareYear: string;
  mode: Mode | "all";
  metric: MetricId;
  selectedPrecinct: string | null;
}

export type Action =
  | { type: "setTab"; tab: TabId }
  | { type: "setFocus"; focus: string }
  | { type: "setYear"; year: string }
  | { type: "setCompareYear"; year: string }
  | { type: "setMode"; mode: Mode | "all" }
  | { type: "setMetric"; metric: MetricId }
  | { type: "select"; precinct: string | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setTab":
      return { ...state, tab: action.tab };
    case "setFocus":
      return { ...state, focus: action.focus };
    case "setYear":
      return { ...state, year: action.year };
    case "setCompareYear":
      return { ...state, compareYear: action.year };
    case "setMode":
      return { ...state, mode: action.mode };
    case "setMetric":
      return { ...state, metric: action.metric };
    case "select":
      return { ...state, selectedPrecinct: action.precinct };
    default:
      return state;
  }
}

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(
  null,
);

export function StoreProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial: State;
}) {
  const [state, dispatch] = useReducer(reducer, initial);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside StoreProvider");
  return v;
}

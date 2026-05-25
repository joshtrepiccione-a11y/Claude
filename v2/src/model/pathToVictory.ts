// Path to Victory: rank candidate "moves" by net-vote impact.
//
// For each (muni, mode, direction) we compute the marginal impact of
// a standardized +3pt swing for the trailing side. Returns the top
// interventions ranked by absolute net vote payoff.

import type {
  PrecinctCollection,
  PrecinctResult,
  ScenarioState,
} from "../data/types";
import { computeAll, type ComputeOptions } from "./scenario";

export type Intervention = {
  id: string;
  muni: string;
  mode: "ed" | "ev" | "vbm";
  direction: "D" | "R";
  swingPts: number;
  netVotes: number;
  plausibility: 1 | 2 | 3 | 4 | 5;
  description: string;
};

export type PathInputs = {
  fc: PrecinctCollection;
  current: PrecinctResult[];
  state: ScenarioState;
  baselineDefaults: ScenarioState;
  munis: string[];
};

const STANDARD_SWING = 3;

function summarizeWinner(results: PrecinctResult[]): {
  winner: "D" | "R" | "tie";
  margin: number;
} {
  const d = results.reduce((a, r) => a + r.sen.total.d, 0);
  const r = results.reduce((a, x) => a + x.sen.total.r, 0);
  if (Math.abs(d - r) < 0.5) return { winner: "tie", margin: 0 };
  return { winner: d > r ? "D" : "R", margin: d - r };
}

/** Estimate plausibility heuristically: tight precincts in this muni
 * have moved more historically (we don't have multi-cycle yet, so this
 * is a proxy on competitiveness and mode share). */
function plausibility(
  muni: string,
  mode: "ed" | "ev" | "vbm",
  results: PrecinctResult[],
): 1 | 2 | 3 | 4 | 5 {
  const muniResults = results.filter(
    (r) => r.feature.properties.municipality === muni,
  );
  if (muniResults.length === 0) return 1;
  const totalVotes = muniResults.reduce((a, r) => a + r.sen.total.total, 0);
  const avgMargin =
    muniResults.reduce(
      (a, r) => a + (r.sen.total.d - r.sen.total.r) / Math.max(1, r.sen.total.total),
      0,
    ) / muniResults.length;
  // Closer to tied + higher volume + mode prominence => more plausible.
  const modeShare =
    muniResults.reduce((a, r) => {
      const t = r.sen.total.total || 1;
      const mt =
        mode === "ev" ? r.sen.byMode.early.total : r.sen.byMode[mode].total;
      return a + mt / t;
    }, 0) / muniResults.length;
  const score = (1 - Math.min(1, Math.abs(avgMargin))) * 0.5 +
    Math.min(1, totalVotes / 5000) * 0.3 +
    modeShare * 0.2;
  if (score > 0.7) return 5;
  if (score > 0.55) return 4;
  if (score > 0.4) return 3;
  if (score > 0.25) return 2;
  return 1;
}

/** Apply a +3pt swing for `direction` to (muni, mode) on top of the
 * current scenario, recompute, and return the net-vote delta vs the
 * current baseline. */
function tryIntervention(
  inputs: PathInputs,
  muni: string,
  mode: "ed" | "ev" | "vbm",
  direction: "D" | "R",
): Intervention {
  const sign = direction === "D" ? 1 : -1;
  const altState: ScenarioState = {
    ...inputs.state,
    muniOverrides: {
      ...inputs.state.muniOverrides,
      [muni]: {
        sen: {
          ...inputs.state.muniOverrides[muni]?.sen,
          ed: (inputs.state.muniOverrides[muni]?.sen.ed ?? 0) + (mode === "ed" ? sign * STANDARD_SWING : 0),
          ev: (inputs.state.muniOverrides[muni]?.sen.ev ?? 0) + (mode === "ev" ? sign * STANDARD_SWING : 0),
          vbm: (inputs.state.muniOverrides[muni]?.sen.vbm ?? 0) + (mode === "vbm" ? sign * STANDARD_SWING : 0),
        },
        asm: inputs.state.muniOverrides[muni]?.asm ?? {
          ed: 0,
          ev: 0,
          vbm: 0,
        },
      },
    },
  };
  const opts: ComputeOptions = {
    view: "scenario",
    scenario: altState,
    baselineDefaults: inputs.baselineDefaults,
  };
  const altResults = computeAll(inputs.fc, opts);
  const altD = altResults.reduce((a, r) => a + r.sen.total.d, 0);
  const altR = altResults.reduce((a, r) => a + r.sen.total.r, 0);
  const curD = inputs.current.reduce((a, r) => a + r.sen.total.d, 0);
  const curR = inputs.current.reduce((a, r) => a + r.sen.total.r, 0);
  const netVotes = altD - altR - (curD - curR);
  const modeLabel = mode === "ed" ? "Election Day" : mode === "ev" ? "Early Vote" : "VBM";
  return {
    id: `${muni}|${mode}|${direction}`,
    muni,
    mode,
    direction,
    swingPts: STANDARD_SWING,
    netVotes,
    plausibility: plausibility(muni, mode, inputs.current),
    description: `Shift ${modeLabel} in ${muni} by ${STANDARD_SWING} pts toward ${direction}`,
  };
}

/** Returns top interventions for the trailing side (or for either
 * side if `forceDirection` is set). */
export function findPathToVictory(
  inputs: PathInputs,
  options?: { forceDirection?: "D" | "R"; topN?: number },
): { trailingSide: "D" | "R" | "tie"; deficit: number; interventions: Intervention[] } {
  const summary = summarizeWinner(inputs.current);
  const direction: "D" | "R" =
    options?.forceDirection ?? (summary.winner === "R" ? "D" : "R");
  const deficit = Math.abs(summary.margin);
  const all: Intervention[] = [];
  for (const muni of inputs.munis) {
    for (const mode of ["ed", "ev", "vbm"] as const) {
      const iv = tryIntervention(inputs, muni, mode, direction);
      // Only retain helpful interventions (positive net for direction).
      const helpful = direction === "D" ? iv.netVotes > 0 : iv.netVotes < 0;
      if (helpful) all.push(iv);
    }
  }
  all.sort((a, b) => Math.abs(b.netVotes) - Math.abs(a.netVotes));
  const top = all.slice(0, options?.topN ?? 8);
  // Make netVotes always reported as net-toward-direction (positive).
  return {
    trailingSide: summary.winner === "tie" ? "tie" : summary.winner === "D" ? "R" : "D",
    deficit,
    interventions: top.map((iv) => ({ ...iv, netVotes: Math.abs(iv.netVotes) })),
  };
}

// Deterministic heuristic to suggest scenario assumptions that win/hold the
// Sheriff race for O'Donoghue or reach a margin goal. NOT an optimizer — it
// adjusts a small set of high-leverage knobs in a fixed order until the goal
// is met (or the search budget is exhausted) and reports the result.

import type { PrecinctBaseline, ScenarioAssumptions } from "../data/types";
import { calculateScenarioResult } from "./scenario";

export type WinningPathFlavor =
  | "balanced"
  | "vbm-heavy"
  | "field-heavy"
  | "persuasion-heavy"
  | "base-turnout-heavy"
  | "max-upside";

export interface WinningPathGoal {
  target:
    | "holdSheriff"     // Win / hold the County Sheriff seat for O'Donoghue
    | "marginVotes";    // Reach a specific R margin in votes
  marginVotes?: number;
}

export interface WinningPathResult {
  assumptions: ScenarioAssumptions;
  feasible: boolean;
  summary: string;
  iterations: number;
}

export function findWinningPath(
  precincts: PrecinctBaseline[],
  base: ScenarioAssumptions,
  goal: WinningPathGoal,
  flavor: WinningPathFlavor = "balanced",
): WinningPathResult {
  const a: ScenarioAssumptions = {
    ...base,
    municipalityOverrides: { ...base.municipalityOverrides },
    precinctOverrides: { ...base.precinctOverrides },
  };

  const knobs = knobSet(flavor);
  let iterations = 0;
  const budget = 120;

  while (iterations < budget) {
    const { county } = calculateScenarioResult(precincts, a);
    if (goalMet(county, goal)) {
      return {
        assumptions: a,
        feasible: true,
        summary: describePath(a, base, flavor) + ` (converged in ${iterations} iterations)`,
        iterations,
      };
    }
    knobs[iterations % knobs.length](a);
    iterations++;
  }
  return {
    assumptions: a,
    feasible: false,
    summary:
      `No path found in ${budget} iterations for goal "${goal.target}" under flavor "${flavor}". Try a different flavor or relax the goal.`,
    iterations,
  };
}

function goalMet(
  c: ReturnType<typeof calculateScenarioResult>["county"],
  g: WinningPathGoal,
): boolean {
  switch (g.target) {
    case "holdSheriff": return c.electsR;
    case "marginVotes": return c.scenario.marginVotes >= (g.marginVotes ?? 0);
  }
}

type Knob = (a: ScenarioAssumptions) => void;

function knobSet(flavor: WinningPathFlavor): Knob[] {
  // All knobs push toward R (O'Donoghue).
  const k: Record<string, Knob> = {
    vbm: (a) => (a.vbmMarginSwing += 0.5),
    early: (a) => (a.earlyMarginSwing += 0.5),
    ed: (a) => (a.edMarginSwing += 0.5),
    rSwing: (a) => (a.repSwing += 0.3),
    turnout: (a) => (a.turnoutDelta += 0.01),
  };
  switch (flavor) {
    case "vbm-heavy": return [k.vbm, k.vbm, k.vbm, k.rSwing, k.early];
    case "field-heavy": return [k.ed, k.ed, k.turnout, k.turnout, k.rSwing];
    case "persuasion-heavy": return [k.rSwing, k.rSwing, k.rSwing, k.vbm, k.early];
    case "base-turnout-heavy": return [k.turnout, k.turnout, k.turnout, k.ed, k.rSwing];
    case "max-upside": return [k.vbm, k.early, k.ed, k.rSwing, k.turnout];
    case "balanced":
    default: return [k.vbm, k.early, k.ed, k.rSwing, k.turnout];
  }
}

function describePath(
  a: ScenarioAssumptions,
  base: ScenarioAssumptions,
  flavor: WinningPathFlavor,
): string {
  const rSw = (a.repSwing - base.repSwing).toFixed(1);
  const t = ((a.turnoutDelta - base.turnoutDelta) * 100).toFixed(1);
  const vbm = (a.vbmMarginSwing - base.vbmMarginSwing).toFixed(1);
  const ev = (a.earlyMarginSwing - base.earlyMarginSwing).toFixed(1);
  const ed = (a.edMarginSwing - base.edMarginSwing).toFixed(1);
  return (
    `Found a ${flavor} path: +${rSw} pp county R swing, +${t}% turnout, ` +
    `+${vbm}/${ev}/${ed} pp VBM/EV/ED swings.`
  );
}

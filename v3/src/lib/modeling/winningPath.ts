// Deterministic heuristic to suggest scenario assumptions that elect one or
// both Assembly candidates, win the Senate, or sweep the full ticket. NOT
// an optimizer — it adjusts a small set of high-leverage knobs in a fixed
// order until the goal is met (or the search budget is exhausted) and
// reports the result.

import type {
  PrecinctBaseline,
  ScenarioAssumptions,
} from "../data/types";
import { calculateScenarioResult } from "./scenario";

export type WinningPathFlavor =
  | "balanced"
  | "vbm-heavy"
  | "field-heavy"
  | "persuasion-heavy"
  | "base-turnout-heavy"
  | "low-budget"
  | "max-upside";

export interface WinningPathGoal {
  target:
    | "electOne"        // Elect at least one Assembly D
    | "electBoth"       // Elect both Assembly Ds
    | "winSenate"       // Win the Senate seat
    | "sweepTicket"     // Win Senate + both Assembly seats (D 3 / R 0)
    | "marginVotes";
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
  const budget = 80;

  while (iterations < budget) {
    const { district } = calculateScenarioResult(precincts, a);
    if (goalMet(district, goal)) {
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
  d: ReturnType<typeof calculateScenarioResult>["district"],
  g: WinningPathGoal,
): boolean {
  switch (g.target) {
    case "electOne":   return d.electsOne;
    case "electBoth":  return d.electsBoth;
    case "winSenate":  return d.senate.electsD;
    case "sweepTicket": return d.electsBoth && d.senate.electsD;
    case "marginVotes": return d.scenario.slateMarginVotes >= (g.marginVotes ?? 0);
  }
}

type Knob = (a: ScenarioAssumptions) => void;

function knobSet(flavor: WinningPathFlavor): Knob[] {
  const k: Record<string, Knob> = {
    vbm: (a) => (a.vbmMarginSwing += 0.5),
    early: (a) => (a.earlyMarginSwing += 0.5),
    ed: (a) => (a.edMarginSwing += 0.5),
    // Push BOTH races' swings together — a campaign program tends to lift
    // both. Expert Mode can decouple them after the heuristic runs.
    dSwing: (a) => { a.asmDemSwing += 0.3; a.senDemSwing += 0.3; },
    turnout: (a) => (a.turnoutDelta += 0.01),
    abReduce: (a) => (a.candidateBAdjustment += 0.2),
    bullet: (a) => (a.bulletVoteRate = Math.max(0, a.bulletVoteRate - 0.01)),
  };
  switch (flavor) {
    case "vbm-heavy": return [k.vbm, k.vbm, k.vbm, k.dSwing, k.early];
    case "field-heavy": return [k.ed, k.ed, k.turnout, k.turnout, k.dSwing];
    case "persuasion-heavy": return [k.dSwing, k.dSwing, k.dSwing, k.vbm, k.early];
    case "base-turnout-heavy": return [k.turnout, k.turnout, k.turnout, k.ed, k.dSwing];
    case "low-budget": return [k.abReduce, k.bullet, k.vbm, k.dSwing];
    case "max-upside": return [k.vbm, k.early, k.ed, k.dSwing, k.turnout, k.abReduce];
    case "balanced":
    default: return [k.vbm, k.early, k.ed, k.dSwing, k.turnout, k.abReduce];
  }
}

function describePath(
  a: ScenarioAssumptions,
  base: ScenarioAssumptions,
  flavor: WinningPathFlavor,
): string {
  const asmD = (a.asmDemSwing - base.asmDemSwing).toFixed(1);
  const senD = (a.senDemSwing - base.senDemSwing).toFixed(1);
  const t = ((a.turnoutDelta - base.turnoutDelta) * 100).toFixed(1);
  const vbm = (a.vbmMarginSwing - base.vbmMarginSwing).toFixed(1);
  const ev = (a.earlyMarginSwing - base.earlyMarginSwing).toFixed(1);
  const ed = (a.edMarginSwing - base.edMarginSwing).toFixed(1);
  return (
    `Found a ${flavor} path: +${asmD} pp Assembly D swing, +${senD} pp Senate D swing, ` +
    `+${t}% turnout, +${vbm}/${ev}/${ed} pp VBM/EV/ED swings.`
  );
}

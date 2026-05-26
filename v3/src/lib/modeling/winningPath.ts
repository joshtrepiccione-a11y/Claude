// Deterministic heuristic to suggest scenario assumptions that elect one or
// both Democratic Assembly candidates. NOT an optimizer — it adjusts a small
// number of high-leverage knobs in a fixed order until the goal is met (or
// the search budget is exhausted) and reports the result.

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
  target: "electOne" | "electBoth" | "marginVotes";
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
  const a: ScenarioAssumptions = { ...base, municipalityOverrides: { ...base.municipalityOverrides }, precinctOverrides: { ...base.precinctOverrides } };

  // Determine which knobs to push and how aggressively.
  const knobs = knobSet(flavor);
  let iterations = 0;
  const budget = 60;

  while (iterations < budget) {
    const { district } = calculateScenarioResult(precincts, a);
    if (goalMet(district, goal)) {
      return {
        assumptions: a,
        feasible: true,
        summary: describePath(a, base, flavor) + ` (${iterations} iterations)`,
        iterations,
      };
    }
    // Apply one nudge from the knob list (round-robin).
    const k = knobs[iterations % knobs.length];
    k(a);
    iterations++;
  }
  return {
    assumptions: a,
    feasible: false,
    summary:
      "No path found under realism caps for the selected flavor. Try a more aggressive flavor or relax constraints.",
    iterations,
  };
}

function goalMet(
  d: ReturnType<typeof calculateScenarioResult>["district"],
  g: WinningPathGoal,
): boolean {
  if (g.target === "electOne") return d.electsOne;
  if (g.target === "electBoth") return d.electsBoth;
  if (g.target === "marginVotes")
    return d.scenario.slateMarginVotes >= (g.marginVotes ?? 0);
  return false;
}

type Knob = (a: ScenarioAssumptions) => void;

function knobSet(flavor: WinningPathFlavor): Knob[] {
  const k: Record<string, Knob> = {
    vbm: (a) => (a.vbmMarginSwing += 0.5),
    early: (a) => (a.earlyMarginSwing += 0.5),
    ed: (a) => (a.edMarginSwing += 0.5),
    dSwing: (a) => (a.demSlateSwing += 0.3),
    turnout: (a) => (a.turnoutDelta += 0.01),
    abReduce: (a) => (a.candidateBAdjustment += 0.2), // reduce A/B dropoff
    bullet: (a) => (a.bulletVoteRate = Math.max(0, a.bulletVoteRate - 0.01)),
  };
  switch (flavor) {
    case "vbm-heavy":
      return [k.vbm, k.vbm, k.vbm, k.dSwing, k.early];
    case "field-heavy":
      return [k.ed, k.ed, k.turnout, k.turnout, k.dSwing];
    case "persuasion-heavy":
      return [k.dSwing, k.dSwing, k.dSwing, k.vbm, k.early];
    case "base-turnout-heavy":
      return [k.turnout, k.turnout, k.turnout, k.ed, k.dSwing];
    case "low-budget":
      return [k.abReduce, k.bullet, k.vbm, k.dSwing];
    case "max-upside":
      return [k.vbm, k.early, k.ed, k.dSwing, k.turnout, k.abReduce];
    case "balanced":
    default:
      return [k.vbm, k.early, k.ed, k.dSwing, k.turnout, k.abReduce];
  }
}

function describePath(
  a: ScenarioAssumptions,
  base: ScenarioAssumptions,
  flavor: WinningPathFlavor,
): string {
  const dS = (a.demSlateSwing - base.demSlateSwing).toFixed(1);
  const t = ((a.turnoutDelta - base.turnoutDelta) * 100).toFixed(1);
  const vbm = (a.vbmMarginSwing - base.vbmMarginSwing).toFixed(1);
  const ev = (a.earlyMarginSwing - base.earlyMarginSwing).toFixed(1);
  const ed = (a.edMarginSwing - base.edMarginSwing).toFixed(1);
  return (
    `Found a ${flavor} path: +${dS} pp D slate swing, +${t}% turnout, ` +
    `+${vbm} pp VBM swing, +${ev} pp early-vote swing, +${ed} pp Election Day swing.`
  );
}

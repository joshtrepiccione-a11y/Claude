// Named scenario presets for the 2026 Sheriff race, built FOR O'Donoghue (R).
// The default baseline is the 2023 off-year Sheriff result (O'Donoghue's
// "Hold" win). Presets may also switch the baseline / turnout environment to
// stress-test the race against a presidential-style electorate.

import type { ScenarioPreset } from "../data/types";
import { defaultAssumptions } from "../modeling/scenario";

const blank = defaultAssumptions;

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "replay-2023-hold",
    name: "2023 Replay (Hold)",
    description:
      "No changes — re-runs O'Donoghue's certified 2023 off-year Sheriff win on the precinct grid. The base case for holding the seat.",
    mainLever: "None",
    baselineId: "sheriff2023",
    assumptions: { ...blank() },
  },
  {
    id: "turnout-2020-threat",
    name: "2020 Turnout (Threat)",
    description:
      "Switches to the 2020 presidential-year electorate — the high-turnout environment O'Donoghue lost. The clearest stress test for 2026.",
    mainLever: "Turnout environment",
    baselineId: "sheriff2020",
    assumptions: { ...blank() },
  },
  {
    id: "gov-2025-headwind",
    name: "2025 Governor Headwind",
    description:
      "Applies a ~3 pp Democratic shift on top of the 2023 baseline, reflecting the recent 2025 gubernatorial environment as a headwind for the GOP ticket.",
    mainLever: "Electoral environment",
    baselineId: "sheriff2023",
    assumptions: {
      ...blank(),
      demSwing: 3.0,
    },
  },
  {
    id: "midterm-blend",
    name: "Midterm Blend (default)",
    description:
      "Projected 2026: each precinct interpolates halfway between the 2023 off-year and 2020 presidential layers (turnout environment ≈ 0.5). A midterm sits between the two.",
    mainLever: "Projected turnout blend",
    baselineId: "projected2026",
    tEnv: 0.5,
    assumptions: { ...blank() },
  },
  {
    id: "base-turnout-r",
    name: "Base Turnout (R strongholds)",
    description:
      "Drive Republican base turnout in O'Donoghue's mainland strongholds (Hamilton, Galloway, Egg Harbor Township, Hammonton). Heavy on Election Day and Early Vote.",
    mainLever: "Base turnout",
    baselineId: "sheriff2023",
    assumptions: {
      ...blank(),
      turnoutDelta: 0.08,
      edMarginSwing: 1.5,
      earlyMarginSwing: 1.2,
      repSwing: 1.0,
    },
  },
  {
    id: "vbm-early-parity",
    name: "VBM / Early Parity",
    description:
      "Close the Democratic advantage in mail and early voting. Lifts R margin within the VBM and Early modes so O'Donoghue isn't buried before Election Day.",
    mainLever: "Vote by Mail / Early",
    baselineId: "sheriff2023",
    assumptions: {
      ...blank(),
      vbmMarginSwing: 5.0,
      earlyMarginSwing: 3.0,
      repSwing: 1.0,
    },
  },
  {
    id: "persuasion-swing",
    name: "Persuasion (swing precincts)",
    description:
      "Move swing voters in competitive mainland precincts (Galloway, Hamilton, Egg Harbor Township, Somers Point) toward O'Donoghue via mail and digital.",
    mainLever: "Persuasion",
    baselineId: "sheriff2023",
    assumptions: {
      ...blank(),
      repSwing: 4.0,
      vbmMarginSwing: 1.0,
    },
  },
  {
    id: "damage-control",
    name: "Damage Control (D strongholds)",
    description:
      "Limit the bleeding in Democratic strongholds — Atlantic City, Pleasantville, Egg Harbor City — so O'Donoghue's mainland margin survives. Defensive, modeled on the 2020 threat electorate.",
    mainLever: "Municipality defense",
    baselineId: "sheriff2020",
    assumptions: {
      ...blank(),
      repSwing: 1.0,
      municipalityOverrides: {
        "Atlantic City": 4.0,
        "Pleasantville City": 4.0,
        "Egg Harbor City": 3.0,
        "Buena Borough": 2.0,
      },
    },
  },
];

export const SCENARIO_BY_ID = Object.fromEntries(
  SCENARIO_PRESETS.map((p) => [p.id, p]),
);

// Named scenario presets for the 2026 Clerk race. The baseline is the
// certified 2021 result (Giralo R +10.8), so win-oriented presets describe
// the scale of improvement Bender needs over the 2021 Democratic showing.

import type { ScenarioPreset } from "../data/types";
import { defaultAssumptions } from "../modeling/scenario";

const blank = defaultAssumptions;

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "baseline-2021",
    name: "2021 Replay (Baseline)",
    description:
      "No changes — re-runs the certified 2021 Clerk result (Giralo 43,346 / Jiampetti 34,930, R+10.8) on the precinct grid.",
    mainLever: "None",
    assumptions: { ...blank() },
  },
  {
    id: "presidential-environment",
    name: "2024 Presidential Environment",
    description:
      "Shifts the county back to its 2024 presidential partisanship (≈ +3.4 pp more Democratic than the 2021 Clerk race). Closes the gap but does not win on its own.",
    mainLever: "Electoral environment",
    assumptions: {
      ...blank(),
      demSwing: 3.4,
    },
  },
  {
    id: "balanced-win",
    name: "Balanced Win Path",
    description:
      "Moderate gains across persuasion, VBM, and base turnout — roughly the combination Bender needs to overcome the 2021 deficit.",
    mainLever: "Multi-mode improvement",
    assumptions: {
      ...blank(),
      demSwing: 4.0,
      turnoutDelta: 0.05,
      vbmMarginSwing: 3.0,
      earlyMarginSwing: 2.0,
      edMarginSwing: 1.0,
    },
  },
  {
    id: "base-turnout",
    name: "Base Turnout Push",
    description:
      "Drive Democratic base turnout in Atlantic City, Pleasantville, and other safe-D precincts. Heavy on Election Day and Early Vote.",
    mainLever: "Base turnout",
    assumptions: {
      ...blank(),
      turnoutDelta: 0.08,
      edMarginSwing: 1.5,
      earlyMarginSwing: 1.2,
      demSwing: 1.0,
    },
  },
  {
    id: "vbm-chase",
    name: "VBM Chase Program",
    description:
      "Aggressive Vote by Mail ballot-chase program. Lifts VBM share of turnout and the D margin within the VBM mode.",
    mainLever: "Vote by Mail",
    assumptions: {
      ...blank(),
      vbmMarginSwing: 5.0,
      vbmShare: 0.4,
      earlyShare: 0.2,
      edShare: 0.4,
      demSwing: 1.5,
    },
  },
  {
    id: "persuasion",
    name: "Persuasion Path",
    description:
      "Move swing voters in competitive mainland precincts (Galloway, Hamilton, Egg Harbor Township, Somers Point) via mail and digital.",
    mainLever: "Persuasion",
    assumptions: {
      ...blank(),
      demSwing: 4.5,
      vbmMarginSwing: 1.0,
    },
  },
  {
    id: "election-day-surge",
    name: "Election Day Surge",
    description: "Field-heavy GOTV concentrated on Election Day.",
    mainLever: "Election Day",
    assumptions: {
      ...blank(),
      edMarginSwing: 3.5,
      turnoutDelta: 0.05,
      demSwing: 1.0,
    },
  },
  {
    id: "shore-towns",
    name: "Shore Town Focus",
    description:
      "Concentrated program in the shore municipalities — Bender's home turf of Somers Point plus Margate, Ventnor, Linwood, Northfield, and Brigantine.",
    mainLever: "Municipality targeting",
    assumptions: {
      ...blank(),
      demSwing: 2.0,
      municipalityOverrides: {
        "Somers Point City": 4.0,
        "Margate City": 3.0,
        "Ventnor City": 3.0,
        "Linwood City": 3.0,
        "Northfield City": 3.0,
        "Brigantine City": 2.5,
      },
    },
  },
  {
    id: "low-turnout-risk",
    name: "Low-Turnout Risk",
    description:
      "Stress test: turnout collapses below the 2021 level and D-leaning voters stay home.",
    mainLever: "Turnout risk",
    assumptions: {
      ...blank(),
      turnoutDelta: -0.1,
      demSwing: -1.5,
    },
  },
];

export const SCENARIO_BY_ID = Object.fromEntries(
  SCENARIO_PRESETS.map((p) => [p.id, p]),
);

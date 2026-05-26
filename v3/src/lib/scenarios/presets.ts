// Named scenario presets shown in the global scenario dropdown and on the
// Scenarios tab "Simple Mode" tiles.

import type { ScenarioPreset } from "../data/types";
import { defaultAssumptions } from "../modeling/scenario";

const blank = defaultAssumptions;

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "balanced-win",
    name: "Balanced Win Path",
    description:
      "Moderate gains across persuasion, VBM, and base turnout — the most plausible route to flipping both Assembly seats.",
    mainLever: "Multi-mode improvement",
    assumptions: {
      ...blank(),
      demSlateSwing: 2.0,
      turnoutDelta: 0.04,
      vbmMarginSwing: 2.5,
      earlyMarginSwing: 1.5,
      edMarginSwing: 0.5,
      candidateBAdjustment: 0.5,
    },
  },
  {
    id: "base-turnout",
    name: "Base Turnout Push",
    description:
      "Drive Democratic base turnout in safe-D precincts. Heavy on Election Day and Early Vote.",
    mainLever: "Base turnout",
    assumptions: {
      ...blank(),
      turnoutDelta: 0.08,
      edMarginSwing: 1.2,
      earlyMarginSwing: 1.0,
      demSlateSwing: 0.5,
    },
  },
  {
    id: "vbm-chase",
    name: "VBM Chase Program",
    description:
      "Aggressive Vote by Mail ballot-chase program. Lifts VBM share and Democratic mode-margin.",
    mainLever: "Vote by Mail",
    assumptions: {
      ...blank(),
      vbmMarginSwing: 5.0,
      vbmShare: 0.4,
      earlyShare: 0.2,
      edShare: 0.4,
      demSlateSwing: 1.0,
    },
  },
  {
    id: "persuasion",
    name: "Persuasion Path",
    description:
      "Move swing voters in competitive precincts via mail and digital. Smaller turnout effect.",
    mainLever: "Persuasion",
    assumptions: {
      ...blank(),
      demSlateSwing: 3.5,
      turnoutDelta: 0.0,
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
      demSlateSwing: 0.8,
    },
  },
  {
    id: "low-turnout-risk",
    name: "Low-Turnout Risk",
    description:
      "Stress test: what happens if turnout collapses and Democratic-leaning voters stay home.",
    mainLever: "Turnout risk",
    assumptions: {
      ...blank(),
      turnoutDelta: -0.1,
      demSlateSwing: -1.5,
    },
  },
  {
    id: "candidate-a-overperform",
    name: "Candidate A Overperformance",
    description:
      "Top of the Democratic ticket outperforms the running mate due to name ID or local presence.",
    mainLever: "Candidate A",
    assumptions: {
      ...blank(),
      candidateAAdjustment: 3.0,
      demSlateSwing: 1.0,
    },
  },
  {
    id: "candidate-b-underperform",
    name: "Candidate B Underperformance",
    description:
      "Democratic Candidate B trails the slate, increasing A/B drop-off risk.",
    mainLever: "Candidate B drag",
    assumptions: {
      ...blank(),
      candidateBAdjustment: -3.0,
    },
  },
  {
    id: "bullet-vote",
    name: "Bullet Vote Risk",
    description:
      "Higher rate of bullet voting reduces the slate's two-vote total — can hurt the trailing candidate of the leading party.",
    mainLever: "Bullet voting",
    assumptions: {
      ...blank(),
      bulletVoteRate: 0.18,
    },
  },
  {
    id: "split-ticket",
    name: "Split-Ticket Scenario",
    description:
      "Persuadable voters split their two Assembly votes across parties — compresses slate margins.",
    mainLever: "Split tickets",
    assumptions: {
      ...blank(),
      splitTicketRate: 0.12,
    },
  },
];

export const SCENARIO_BY_ID = Object.fromEntries(
  SCENARIO_PRESETS.map((p) => [p.id, p]),
);

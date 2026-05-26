// Named scenario presets. Each preset sets Senate AND Assembly swings;
// by default they move together because a campaign program tends to lift
// both races. Expert Mode can decouple them.

import type { ScenarioPreset } from "../data/types";
import { defaultAssumptions } from "../modeling/scenario";

const blank = defaultAssumptions;

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "balanced-win",
    name: "Balanced Win Path",
    description:
      "Moderate gains across persuasion, VBM, and base turnout. Lifts both Senate and Assembly slates together.",
    mainLever: "Multi-mode improvement",
    assumptions: {
      ...blank(),
      asmDemSwing: 2.0,
      senDemSwing: 2.0,
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
      "Drive Democratic base turnout in safe-D precincts. Heavy on Election Day and Early Vote; lifts the whole ticket.",
    mainLever: "Base turnout",
    assumptions: {
      ...blank(),
      turnoutDelta: 0.08,
      edMarginSwing: 1.2,
      earlyMarginSwing: 1.0,
      asmDemSwing: 0.5,
      senDemSwing: 0.5,
    },
  },
  {
    id: "vbm-chase",
    name: "VBM Chase Program",
    description:
      "Aggressive Vote by Mail ballot-chase program. Lifts VBM share and D mode-margin across both races.",
    mainLever: "Vote by Mail",
    assumptions: {
      ...blank(),
      vbmMarginSwing: 5.0,
      vbmShare: 0.4,
      earlyShare: 0.2,
      edShare: 0.4,
      asmDemSwing: 1.0,
      senDemSwing: 1.0,
    },
  },
  {
    id: "persuasion",
    name: "Persuasion Path",
    description:
      "Move swing voters in competitive precincts via mail and digital. Both races shift together.",
    mainLever: "Persuasion",
    assumptions: {
      ...blank(),
      asmDemSwing: 3.5,
      senDemSwing: 3.5,
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
      asmDemSwing: 0.8,
      senDemSwing: 0.8,
    },
  },
  {
    id: "low-turnout-risk",
    name: "Low-Turnout Risk",
    description:
      "Stress test: turnout collapses and D-leaning voters stay home. Both races suffer.",
    mainLever: "Turnout risk",
    assumptions: {
      ...blank(),
      turnoutDelta: -0.1,
      asmDemSwing: -1.5,
      senDemSwing: -1.5,
    },
  },
  {
    id: "candidate-a-overperform",
    name: "Candidate A Overperformance",
    description:
      "Top of the Democratic Assembly ticket outperforms the running mate. Senate moves only with shared mode swings.",
    mainLever: "Candidate A",
    assumptions: {
      ...blank(),
      candidateAAdjustment: 3.0,
      asmDemSwing: 1.0,
    },
  },
  {
    id: "candidate-b-underperform",
    name: "Candidate B Underperformance",
    description:
      "Democratic Assembly Candidate B trails the slate, increasing A/B drop-off risk. Senate unaffected.",
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
      "Higher rate of bullet voting suppresses Assembly slate totals. Senate unaffected (single-seat race).",
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
      "Voters split their two Assembly votes across parties. Compresses Assembly slate margin; can also drag the Senate via shared mode swings if combined with mode effects.",
    mainLever: "Split tickets",
    assumptions: {
      ...blank(),
      splitTicketRate: 0.12,
    },
  },
  {
    id: "senate-overperform",
    name: "Senate Overperformance",
    description:
      "Top-of-ticket Senate candidate runs ahead of the Assembly slate. Tests divergence between races.",
    mainLever: "Senate top-of-ticket",
    assumptions: {
      ...blank(),
      senDemSwing: 4.0,
      asmDemSwing: 1.5,
    },
  },
];

export const SCENARIO_BY_ID = Object.fromEntries(
  SCENARIO_PRESETS.map((p) => [p.id, p]),
);

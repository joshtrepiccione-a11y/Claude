// Scenario presets — each is a transform on the current ScenarioState.
// Documented so users understand what they change.

import type { ScenarioState } from "../data/types";

export type Preset = {
  id: string;
  label: string;
  description: string;
  apply: (s: ScenarioState, baselineDefaults: ScenarioState) => ScenarioState;
};

export const PRESETS: Preset[] = [
  {
    id: "baseline",
    label: "Reset to baseline",
    description: "Clear all scenario adjustments. Returns to the projected baseline.",
    apply: (_s, def) => ({ ...def, muniOverrides: {} }),
  },
  {
    id: "low-turnout",
    label: "Low-turnout local race",
    description: "Off-year mood. Electorate skews +5 Election Day, total turnout falls.",
    apply: (s) => ({
      ...s,
      cwShare: { ed: 65, ev: 12, vbm: 23 },
      activePreset: "low-turnout",
    }),
  },
  {
    id: "high-turnout",
    label: "High-turnout / presidential-style",
    description: "Bigger electorate. VBM rises to presidential-year levels.",
    apply: (s) => ({
      ...s,
      cwShare: { ed: 45, ev: 18, vbm: 37 },
      activePreset: "high-turnout",
    }),
  },
  {
    id: "strong-d-vbm",
    label: "Strong Democratic VBM",
    description: "+6 D-favorable swing in Vote by Mail across all precincts.",
    apply: (s) => ({
      ...s,
      senSwing: { ...s.senSwing, vbm: 6 },
      asmSwing: { ...s.asmSwing, vbm: 6 },
      activePreset: "strong-d-vbm",
    }),
  },
  {
    id: "strong-r-ed",
    label: "Strong Republican Election Day",
    description: "+6 R-favorable swing on Election Day across all precincts.",
    apply: (s) => ({
      ...s,
      senSwing: { ...s.senSwing, ed: -6 },
      asmSwing: { ...s.asmSwing, ed: -6 },
      activePreset: "strong-r-ed",
    }),
  },
  {
    id: "split-ticket",
    label: "Split-ticket Assembly",
    description:
      "Stretches intra-party gaps (D1 60% / R1 60%) and raises bullet rate to model split outcomes.",
    apply: (s) => ({
      ...s,
      intraD: 60,
      intraR: 60,
      bullet: 12,
      activePreset: "split-ticket",
    }),
  },
  {
    id: "anti-incumbent",
    label: "Anti-incumbent environment",
    description:
      "-4 swing for incumbent-side races (Senate R, Assembly D since both seats currently held by D).",
    apply: (s) => ({
      ...s,
      senSwing: {
        ed: (s.senSwing.ed ?? 0) + 4,
        ev: (s.senSwing.ev ?? 0) + 4,
        vbm: (s.senSwing.vbm ?? 0) + 4,
      },
      asmSwing: {
        ed: (s.asmSwing.ed ?? 0) - 4,
        ev: (s.asmSwing.ev ?? 0) - 4,
        vbm: (s.asmSwing.vbm ?? 0) - 4,
      },
      activePreset: "anti-incumbent",
    }),
  },
  {
    id: "top-of-ticket-d",
    label: "Top-of-ticket D boost",
    description: "+5 uniform swing toward Democrats across all races and modes.",
    apply: (s) => ({
      ...s,
      senSwing: { ed: 5, ev: 5, vbm: 5 },
      asmSwing: { ed: 5, ev: 5, vbm: 5 },
      activePreset: "top-of-ticket-d",
    }),
  },
  {
    id: "top-of-ticket-r",
    label: "Top-of-ticket R boost",
    description: "+5 uniform swing toward Republicans across all races and modes.",
    apply: (s) => ({
      ...s,
      senSwing: { ed: -5, ev: -5, vbm: -5 },
      asmSwing: { ed: -5, ev: -5, vbm: -5 },
      activePreset: "top-of-ticket-r",
    }),
  },
];

export function findPreset(id: string | undefined): Preset | undefined {
  if (!id) return undefined;
  return PRESETS.find((p) => p.id === id);
}

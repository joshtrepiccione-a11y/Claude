import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeAll, marginPct } from "../model/scenario";
import type { PrecinctCollection, ScenarioState } from "../data/types";

// Load the same GeoJSON the app uses at runtime.
const fc: PrecinctCollection = JSON.parse(
  readFileSync(resolve(__dirname, "../../public/data/ld8_precincts.geojson"), "utf-8"),
);

const baseDefaults: ScenarioState = {
  mode: "total",
  senSwing: { ed: 0, ev: 0, vbm: 0 },
  asmSwing: { ed: 0, ev: 0, vbm: 0 },
  cwShare: { ed: 55, ev: 15, vbm: 30 },
  bullet: fc.features[0].properties.calibration.bullet_pct,
  intraD: fc.features[0].properties.calibration.intra_d_d1,
  intraR: fc.features[0].properties.calibration.intra_r_r1,
  coattail: 0,
  muniOverrides: {},
};

describe("scenario math: baseline calibration", () => {
  const results = computeAll(fc, {
    view: "baseline",
    scenario: baseDefaults,
    baselineDefaults: baseDefaults,
  });

  it("Senate baseline aggregates to the certified 2023 total within rounding", () => {
    const d = results.reduce((a, r) => a + r.sen.total.d, 0);
    const r = results.reduce((a, x) => a + x.sen.total.r, 0);
    const t = results.reduce((a, x) => a + x.sen.total.total, 0);
    // Targets: 26648 / 28013 / 54661
    expect(Math.round(t)).toBe(54661);
    expect(Math.abs(Math.round(d) - 26648)).toBeLessThan(100);
    expect(Math.abs(Math.round(r) - 28013)).toBeLessThan(100);
  });

  it("Assembly baseline aggregates to the certified 2025 candidate-votes", () => {
    const d1 = results.reduce((a, r) => a + r.asm.total.d1, 0);
    const d2 = results.reduce((a, r) => a + r.asm.total.d2, 0);
    const r1 = results.reduce((a, r) => a + r.asm.total.r1, 0);
    const r2 = results.reduce((a, r) => a + r.asm.total.r2, 0);
    // Targets: Angelozzi 50168, Katz 50036, Torrissi 46262, Umba 44300
    expect(Math.abs(Math.round(d1) - 50168)).toBeLessThan(20);
    expect(Math.abs(Math.round(d2) - 50036)).toBeLessThan(20);
    expect(Math.abs(Math.round(r1) - 46262)).toBeLessThan(20);
    expect(Math.abs(Math.round(r2) - 44300)).toBeLessThan(20);
  });
});

describe("scenario math: swing effects are directional", () => {
  it("+5pt Senate swing across all modes moves D margin up", () => {
    const noSwing = computeAll(fc, {
      view: "scenario",
      scenario: { ...baseDefaults },
      baselineDefaults: baseDefaults,
    });
    const withSwing = computeAll(fc, {
      view: "scenario",
      scenario: { ...baseDefaults, senSwing: { ed: 5, ev: 5, vbm: 5 } },
      baselineDefaults: baseDefaults,
    });
    const sumMarg = (rs: any[]) => {
      let d = 0, r = 0, t = 0;
      for (const x of rs) {
        d += x.sen.total.d; r += x.sen.total.r; t += x.sen.total.total;
      }
      return marginPct({ d, r, total: t });
    };
    expect(sumMarg(withSwing)).toBeGreaterThan(sumMarg(noSwing));
  });

  it("-5pt Senate swing moves D margin down", () => {
    const noSwing = computeAll(fc, {
      view: "scenario",
      scenario: { ...baseDefaults },
      baselineDefaults: baseDefaults,
    });
    const withSwing = computeAll(fc, {
      view: "scenario",
      scenario: { ...baseDefaults, senSwing: { ed: -5, ev: -5, vbm: -5 } },
      baselineDefaults: baseDefaults,
    });
    const sumMarg = (rs: any[]) => {
      let d = 0, r = 0, t = 0;
      for (const x of rs) {
        d += x.sen.total.d; r += x.sen.total.r; t += x.sen.total.total;
      }
      return marginPct({ d, r, total: t });
    };
    expect(sumMarg(withSwing)).toBeLessThan(sumMarg(noSwing));
  });
});

import { z } from "zod";

const modeSlice = z.object({
  d: z.number(),
  r: z.number(),
  o: z.number(),
  total: z.number(),
});

const provLabel = z.enum([
  "real",
  "real-calibrated",
  "calibrated",
  "modeled",
  "estimated",
  "interpolated",
  "user-adjusted",
  "scenario",
]);

const modeRec = z.object({
  ed: provLabel,
  early: provLabel,
  vbm: provLabel,
});

export const precinctPropsSchema = z.object({
  county: z.string(),
  precinct: z.string(),
  municipality: z.string(),
  pres_harris: z.number(),
  pres_trump: z.number(),
  pres_other: z.number(),
  pres_total: z.number(),
  pres_margin_pct: z.number(),
  sen23_d: z.number(),
  sen23_r: z.number(),
  sen23_other: z.number(),
  sen23_total: z.number(),
  assem25_d1: z.number(),
  assem25_d2: z.number(),
  assem25_r1: z.number(),
  assem25_r2: z.number(),
  assem25_other: z.number(),
  assem25_total: z.number(),
  assem25_voters: z.number(),
  sen27_baseline_d: z.number(),
  sen27_baseline_r: z.number(),
  sen27_baseline_other: z.number(),
  sen27_baseline_total: z.number(),
  assem27_baseline_d: z.number(),
  assem27_baseline_r: z.number(),
  assem27_baseline_other: z.number(),
  assem27_baseline_voters: z.number(),
  sen27_modes: z.object({
    ed: modeSlice,
    early: modeSlice,
    vbm: modeSlice,
  }),
  assem27_modes: z.object({
    ed: modeSlice,
    early: modeSlice,
    vbm: modeSlice,
  }),
  mode_source: z.object({
    sen: modeRec,
    asm: modeRec,
  }),
  baseline_source: z.object({
    sen: provLabel,
    asm: provLabel,
  }),
  calibration: z.object({
    intra_d_d1: z.number(),
    intra_r_r1: z.number(),
    bullet_pct: z.number(),
  }),
});

export const precinctCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      properties: precinctPropsSchema,
      // Geometry left loose; Leaflet validates at render time.
      geometry: z.any(),
    }),
  ),
});

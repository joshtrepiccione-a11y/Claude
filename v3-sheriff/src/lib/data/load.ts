// Load and normalise the Atlantic County Sheriff precinct GeoJSON into the
// app's domain types. Each feature carries three election layers (2020 / 2023
// Sheriff, 2025 Governor); we keep all three per precinct and select/blend at
// render time via `selectBaseline`.

import type {
  PrecinctBaseline,
  PrecinctLayer,
  PrecinctLayers,
} from "./types";
import type { BaselineId, ConfidenceLabel } from "./config";
import { isAtlanticMunicipality } from "./config";

export interface CalibrationMeta {
  race: string;
  target_year: number;
  layers: Record<string, string>;
  anchor_level: string;
  precinct_distribution: string;
  county_totals: Record<string, { d: number; r: number }>;
}

export interface LoadedData {
  layers: PrecinctLayers[];
  geojson: GeoJSON.FeatureCollection;
  calibration: CalibrationMeta | null;
  warnings: string[];
}

interface ModeSlice {
  d: number;
  r: number;
  o: number;
  total: number;
}

interface UpstreamLayerModes {
  ed: ModeSlice;
  early: ModeSlice;
  vbm: ModeSlice;
}

// Upstream GeoJSON property shape we care about.
interface UpstreamProps {
  county: string;
  precinct: string;
  municipality: string;

  pres2024_d: number;
  pres2024_r: number;

  sheriff2020_d: number;
  sheriff2020_r: number;
  sheriff2020_total: number;
  sheriff2020_modes: UpstreamLayerModes;

  sheriff2023_d: number;
  sheriff2023_r: number;
  sheriff2023_total: number;
  sheriff2023_modes: UpstreamLayerModes;

  gov2025_d: number;
  gov2025_r: number;
  gov2025_total: number;
  gov2025_modes: UpstreamLayerModes;

  baseline_source?: Record<string, string>;
}

const DATA_URL = new URL(
  "./data/atlantic_sheriff_precincts.geojson",
  document.baseURI,
).toString();

export async function loadCounty(): Promise<LoadedData> {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to load precinct data (${res.status})`);
  const fc = (await res.json()) as GeoJSON.FeatureCollection & {
    calibration?: CalibrationMeta;
  };

  const warnings: string[] = [];
  const layers: PrecinctLayers[] = [];

  for (const feat of fc.features) {
    const p = feat.properties as unknown as UpstreamProps;
    if (!p) continue;

    if (!isAtlanticMunicipality(p.municipality)) {
      warnings.push(
        `Precinct "${p.precinct}" has municipality "${p.municipality}" not in Atlantic County config — skipped.`,
      );
      continue;
    }

    const confidence = coerceConfidence(p.baseline_source?.sheriff2023);

    layers.push({
      precinctId: p.precinct,
      precinctName: p.precinct,
      municipality: p.municipality,
      county: p.county,
      pres2024_d: p.pres2024_d || 0,
      pres2024_r: p.pres2024_r || 0,
      sheriff2020: buildLayer(p.sheriff2020_d, p.sheriff2020_r, p.sheriff2020_total, p.sheriff2020_modes),
      sheriff2023: buildLayer(p.sheriff2023_d, p.sheriff2023_r, p.sheriff2023_total, p.sheriff2023_modes),
      gov2025: buildLayer(p.gov2025_d, p.gov2025_r, p.gov2025_total, p.gov2025_modes),
      baselineConfidence: confidence,
    });
  }

  return {
    layers,
    geojson: fc,
    calibration: fc.calibration ?? null,
    warnings,
  };
}

function buildLayer(
  d: number,
  r: number,
  total: number,
  modes: UpstreamLayerModes,
): PrecinctLayer {
  const dd = d || 0;
  const rr = r || 0;
  const m = modes || {
    ed: { d: 0, r: 0, o: 0, total: 0 },
    early: { d: 0, r: 0, o: 0, total: 0 },
    vbm: { d: 0, r: 0, o: 0, total: 0 },
  };
  return {
    d: dd,
    r: rr,
    total: total || dd + rr,
    modeTurnout: { ed: m.ed.total, early: m.early.total, vbm: m.vbm.total },
    modeDem: { ed: m.ed.d, early: m.early.d, vbm: m.vbm.d },
    modeRep: { ed: m.ed.r, early: m.early.r, vbm: m.vbm.r },
  };
}

// ─────────────────────────────────────────────────────────────
// Baseline selection / blending
// ─────────────────────────────────────────────────────────────

const REG_MULTIPLIER = 2.2;

function lerp(a: number, b: number, t: number): number {
  return (1 - t) * a + t * b;
}

function blendLayer(a: PrecinctLayer, b: PrecinctLayer, t: number): PrecinctLayer {
  const blendMode = (
    ma: Record<"ed" | "early" | "vbm", number>,
    mb: Record<"ed" | "early" | "vbm", number>,
  ) => ({
    ed: lerp(ma.ed, mb.ed, t),
    early: lerp(ma.early, mb.early, t),
    vbm: lerp(ma.vbm, mb.vbm, t),
  });
  return {
    d: lerp(a.d, b.d, t),
    r: lerp(a.r, b.r, t),
    total: lerp(a.total, b.total, t),
    modeTurnout: blendMode(a.modeTurnout, b.modeTurnout),
    modeDem: blendMode(a.modeDem, b.modeDem),
    modeRep: blendMode(a.modeRep, b.modeRep),
  };
}

/** Resolve the active layer for a precinct given the baseline + turnout env. */
export function resolveLayer(
  pl: PrecinctLayers,
  baselineId: BaselineId,
  tEnv: number,
): PrecinctLayer {
  switch (baselineId) {
    case "sheriff2020":
      return pl.sheriff2020;
    case "sheriff2023":
      return pl.sheriff2023;
    case "projected2026":
      // 0 = pure 2023 off-year, 1 = pure 2020 presidential.
      return blendLayer(pl.sheriff2023, pl.sheriff2020, clamp01(tEnv));
  }
}

/**
 * Flatten the raw multi-layer precincts into a `PrecinctBaseline[]` for the
 * chosen baseline. This is the array the scenario engine consumes — it has
 * the same shape the single Clerk baseline had.
 */
export function selectBaseline(
  layers: PrecinctLayers[],
  baselineId: BaselineId,
  tEnv: number,
): PrecinctBaseline[] {
  return layers.map((pl) => {
    const lyr = resolveLayer(pl, baselineId, tEnv);
    const d = lyr.d;
    const r = lyr.r;
    const other = Math.max(0, lyr.total - d - r);
    const turnout = lyr.total || d + r + other;
    return {
      precinctId: pl.precinctId,
      precinctName: pl.precinctName,
      municipality: pl.municipality,
      county: pl.county,
      registeredVoters: turnout * REG_MULTIPLIER,
      registrationConfidence: "Estimated",
      turnout,
      d,
      r,
      other,
      modeTurnout: { ...lyr.modeTurnout },
      modeDem: { ...lyr.modeDem },
      modeRep: { ...lyr.modeRep },
      baselineId,
      baselineConfidence: pl.baselineConfidence,
    };
  });
}

/** R-margin% of a layer (R-perspective: + = R lead). */
export function layerMarginPctR(l: PrecinctLayer): number {
  const tot = l.d + l.r;
  return tot === 0 ? 0 : ((l.r - l.d) / tot) * 100;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function coerceConfidence(upstream: string | undefined): ConfidenceLabel {
  const v = (upstream ?? "calibrated").toLowerCase();
  if (v.includes("real") || v.includes("certified")) return "Calibrated";
  if (v.includes("calibrated")) return "Calibrated";
  if (v.includes("modeled")) return "Modeled";
  if (v.includes("estimated") || v.includes("interpolated")) return "Estimated";
  return "Calibrated";
}

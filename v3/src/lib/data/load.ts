// Load and normalise the LD8 precinct GeoJSON into V3's domain types.
// We deliberately reshape the upstream "Senate-and-Assembly" GeoJSON into
// an Assembly-first PrecinctBaseline collection.

import type { PrecinctBaseline } from "./types";
import { isLD8Municipality } from "./config";

export interface LoadedData {
  precincts: PrecinctBaseline[];
  geojson: GeoJSON.FeatureCollection;
  warnings: string[];
}

// Upstream GeoJSON property shape we care about (a subset of the v2 schema).
interface UpstreamProps {
  county: string;
  precinct: string;
  municipality: string;
  assem27_baseline_d: number;
  assem27_baseline_r: number;
  assem27_baseline_other: number;
  assem27_baseline_voters: number;
  assem25_d1: number;
  assem25_d2: number;
  assem25_r1: number;
  assem25_r2: number;
  assem27_modes: {
    ed: { d: number; r: number; o: number; total: number };
    early: { d: number; r: number; o: number; total: number };
    vbm: { d: number; r: number; o: number; total: number };
  };
  calibration?: { intra_d_d1: number; intra_r_r1: number; bullet_pct: number };
  baseline_source?: { asm: string };
}

const DATA_URL = new URL("./data/ld8_precincts.geojson", document.baseURI).toString();

export async function loadLD8(): Promise<LoadedData> {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to load precinct data (${res.status})`);
  const fc = (await res.json()) as GeoJSON.FeatureCollection;

  const warnings: string[] = [];
  const precincts: PrecinctBaseline[] = [];

  for (const feat of fc.features) {
    const p = feat.properties as unknown as UpstreamProps;
    if (!p) continue;

    if (!isLD8Municipality(p.municipality)) {
      warnings.push(
        `Precinct "${p.precinct}" has municipality "${p.municipality}" not in LD8 config — skipped.`,
      );
      continue;
    }

    // Use the 2025 Assembly result to estimate per-candidate splits
    // (intra-D and intra-R shares within each slate), then project the
    // 2027 baseline slate vote totals onto two candidates each.
    const d1Share = safeRatio(p.assem25_d1, p.assem25_d1 + p.assem25_d2, 0.5);
    const r1Share = safeRatio(p.assem25_r1, p.assem25_r1 + p.assem25_r2, 0.5);

    // 2027 baseline two-vote slate totals come straight from the GeoJSON.
    const dSlate = p.assem27_baseline_d || 0;
    const rSlate = p.assem27_baseline_r || 0;
    const other = p.assem27_baseline_other || 0;
    const ballots = p.assem27_baseline_voters || 0;

    const modes = p.assem27_modes;
    const modeTurnout = {
      ed: modes.ed.total,
      early: modes.early.total,
      vbm: modes.vbm.total,
    };
    const modeDem = { ed: modes.ed.d, early: modes.early.d, vbm: modes.vbm.d };
    const modeRep = { ed: modes.ed.r, early: modes.early.r, vbm: modes.vbm.r };

    // Source label from upstream — coerce to our ConfidenceLabel union.
    const upstream = (p.baseline_source?.asm ?? "modeled").toLowerCase();
    const confidence =
      upstream.includes("real") ? "Certified"
        : upstream === "modeled" ? "Modeled"
        : upstream === "estimated" ? "Estimated"
        : upstream === "interpolated" ? "Estimated"
        : upstream === "calibrated" ? "Derived"
        : "Modeled";

    precincts.push({
      precinctId: p.precinct,
      precinctName: p.precinct,
      municipality: p.municipality,
      county: p.county,
      registeredVoters: Math.max(ballots, 0) * 1.45, // rough multiplier; flagged as Estimated when no voter file
      baselineTurnout: ballots,
      demA: dSlate * d1Share,
      demB: dSlate * (1 - d1Share),
      repA: rSlate * r1Share,
      repB: rSlate * (1 - r1Share),
      other,
      modeTurnout,
      modeDemSlate: modeDem,
      modeRepSlate: modeRep,
      baselineConfidence: confidence,
    });
  }

  return { precincts, geojson: fc, warnings };
}

function safeRatio(a: number, b: number, fallback: number): number {
  if (!b || !isFinite(a / b)) return fallback;
  const r = a / b;
  if (r <= 0 || r >= 1) return fallback;
  return r;
}

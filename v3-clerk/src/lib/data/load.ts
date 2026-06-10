// Load and normalise the Atlantic County Clerk precinct GeoJSON into the
// app's domain types.

import type { PrecinctBaseline } from "./types";
import { isAtlanticMunicipality } from "./config";

export interface LoadedData {
  precincts: PrecinctBaseline[];
  geojson: GeoJSON.FeatureCollection;
  warnings: string[];
}

interface ModeSlice {
  d: number;
  r: number;
  o: number;
  total: number;
}

// Upstream GeoJSON property shape we care about.
interface UpstreamProps {
  county: string;
  precinct: string;
  municipality: string;

  clerk_baseline_d: number;
  clerk_baseline_r: number;
  clerk_baseline_other: number;
  clerk_baseline_total: number;
  clerk_modes: { ed: ModeSlice; early: ModeSlice; vbm: ModeSlice };

  baseline_source?: { clerk: string };
}

const DATA_URL = new URL("./data/atlantic_clerk_precincts.geojson", document.baseURI).toString();

export async function loadCounty(): Promise<LoadedData> {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to load precinct data (${res.status})`);
  const fc = (await res.json()) as GeoJSON.FeatureCollection;

  const warnings: string[] = [];
  const precincts: PrecinctBaseline[] = [];

  for (const feat of fc.features) {
    const p = feat.properties as unknown as UpstreamProps;
    if (!p) continue;

    if (!isAtlanticMunicipality(p.municipality)) {
      warnings.push(
        `Precinct "${p.precinct}" has municipality "${p.municipality}" not in Atlantic County config — skipped.`,
      );
      continue;
    }

    const d = p.clerk_baseline_d || 0;
    const r = p.clerk_baseline_r || 0;
    const other = p.clerk_baseline_other || 0;
    const total = p.clerk_baseline_total || d + r + other;

    const m = p.clerk_modes;
    const modeTurnout = { ed: m.ed.total, early: m.early.total, vbm: m.vbm.total };
    const modeDem = { ed: m.ed.d, early: m.early.d, vbm: m.vbm.d };
    const modeRep = { ed: m.ed.r, early: m.early.r, vbm: m.vbm.r };

    const confidence = coerceConfidence(p.baseline_source?.clerk);

    // Registered voters: the upstream GeoJSON does not carry a registration
    // count. Approximate it as 2.2 × Clerk ballot count (2021 was a low-
    // turnout off-year) and tag it as Estimated. Replace via voter-file import.
    const REG_MULTIPLIER = 2.2;

    precincts.push({
      precinctId: p.precinct,
      precinctName: p.precinct,
      municipality: p.municipality,
      county: p.county,

      registeredVoters: total * REG_MULTIPLIER,
      registrationConfidence: "Estimated",

      turnout: total,
      d,
      r,
      other,
      modeTurnout,
      modeDem,
      modeRep,
      baselineConfidence: confidence,
    });
  }

  return { precincts, geojson: fc, warnings };
}

function coerceConfidence(upstream: string | undefined): PrecinctBaseline["baselineConfidence"] {
  const v = (upstream ?? "modeled").toLowerCase();
  if (v.includes("real") || v === "certified") return "Certified";
  if (v === "calibrated") return "Calibrated";
  if (v === "modeled") return "Modeled";
  if (v === "estimated" || v === "interpolated") return "Estimated";
  return "Modeled";
}

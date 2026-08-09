import type { BoeData, DataMeta, PrecinctFeature } from "./types";

/**
 * Load the certified precinct file. `base` is Vite's BASE_URL so the app works
 * both at a site root and under a sub-path.
 */
export async function loadBoeData(): Promise<BoeData> {
  const url = `${import.meta.env.BASE_URL}data/hammonton_boe_precincts.geojson`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Could not load ${url} (HTTP ${res.status}). Run ` +
        `python3 scripts/build_hammonton_boe.py to regenerate it.`,
    );
  }
  const raw = (await res.json()) as {
    meta: DataMeta;
    features: PrecinctFeature[];
  };
  if (!raw?.meta || !Array.isArray(raw.features) || raw.features.length === 0) {
    throw new Error("Precinct file is present but empty or malformed.");
  }
  return {
    meta: raw.meta,
    features: raw.features,
    geojson: {
      type: "FeatureCollection",
      features: raw.features,
    } as GeoJSON.FeatureCollection,
  };
}

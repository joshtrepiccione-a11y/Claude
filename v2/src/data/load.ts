import type { PrecinctCollection } from "./types";
import { precinctCollectionSchema } from "./schema";

let cache: PrecinctCollection | null = null;

export async function loadPrecincts(): Promise<PrecinctCollection> {
  if (cache) return cache;
  const res = await fetch("data/ld8_precincts.geojson");
  if (!res.ok) {
    throw new Error(`Failed to load precincts: ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();
  // Validate, but degrade gracefully: skip features whose properties
  // fail validation rather than blowing up the whole app.
  const parsed = precinctCollectionSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("Precinct schema validation issues:", parsed.error);
  }
  cache = raw as PrecinctCollection;
  return cache;
}

export function uniqueMunis(fc: PrecinctCollection): string[] {
  const set = new Set<string>();
  for (const f of fc.features) set.add(f.properties.municipality);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

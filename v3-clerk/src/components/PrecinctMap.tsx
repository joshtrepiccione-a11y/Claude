// Leaflet precinct map. We use plain Leaflet (no react-leaflet) for tighter
// control over GeoJSON layer recolouring when the scenario or map layer changes.

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import type { PrecinctRow } from "../lib/data/types";
import type { MapLayer } from "../state/store";

interface Props {
  geojson: GeoJSON.FeatureCollection;
  rows: PrecinctRow[];
  layer: MapLayer;
  selectedPrecinct: string | null;
  onSelect: (id: string | null) => void;
  onHover?: (id: string | null) => void;
}

export function PrecinctMap({
  geojson,
  rows,
  layer,
  selectedPrecinct,
  onSelect,
  onHover,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  const rowById = useMemo(() => {
    const m = new Map<string, PrecinctRow>();
    for (const r of rows) m.set(r.baseline.precinctId, r);
    return m;
  }, [rows]);

  // Initialise map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      preferCanvas: true,
      attributionControl: false,
      zoomControl: true,
    }).setView([39.47, -74.63], 10);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      { maxZoom: 18, subdomains: "abcd" },
    ).addTo(map);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      { maxZoom: 18, subdomains: "abcd", pane: "shadowPane" },
    ).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, []);

  // Build / replace the GeoJSON layer when data or layer-mode changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    const gj = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
      style: (f) => {
        const id =
          (f?.properties as { precinct?: string } | undefined)?.precinct ?? "";
        const row = rowById.get(id);
        return styleFor(row, layer, selectedPrecinct === id);
      },
      onEachFeature: (feat, lyr) => {
        const id =
          (feat?.properties as { precinct?: string } | undefined)?.precinct ?? "";
        const row = rowById.get(id);
        lyr.on({
          click: () => onSelect(id),
          mouseover: (e) => {
            (e.target as L.Path).setStyle({ weight: 2.5, color: "#0a1020" });
            onHover?.(id);
          },
          mouseout: (e) => {
            const isSelected = selectedPrecinct === id;
            (e.target as L.Path).setStyle(
              styleFor(row, layer, isSelected) as L.PathOptions,
            );
            onHover?.(null);
          },
        });
        lyr.bindTooltip(
          row
            ? `${row.baseline.precinctName} — ${row.baseline.municipality}`
            : id,
          { sticky: true, direction: "top", opacity: 0.95 },
        );
      },
    });
    gj.addTo(map);
    layerRef.current = gj;
    try {
      const b = gj.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [12, 12] });
    } catch {
      /* no-op */
    }
  }, [geojson, rowById, layer, selectedPrecinct, onSelect, onHover]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden ring-1 ring-slate-200 bg-slate-50"
      role="region"
      aria-label="Atlantic County precinct map"
    />
  );
}

function styleFor(
  row: PrecinctRow | undefined,
  layer: MapLayer,
  selected: boolean,
): L.PathOptions {
  if (!row) {
    return {
      color: "#94a3b8",
      weight: selected ? 2.5 : 0.5,
      fillColor: "#e2e8f0",
      fillOpacity: 0.7,
    };
  }
  const color = colorFor(row, layer);
  return {
    color: selected ? "#0a1020" : "#475569",
    weight: selected ? 2.5 : 0.5,
    fillColor: color,
    fillOpacity: 0.82,
  };
}

export function colorFor(row: PrecinctRow, layer: MapLayer): string {
  switch (layer) {
    case "margin":
      return marginColor(row.scenarioMarginPct);
    case "net-vote-opportunity":
      return opportunityColor(row.netVoteOpportunity);
    case "turnout-opportunity":
      return scoreColor(row.turnoutScore);
    case "persuasion-opportunity":
      return scoreColor(row.persuasionScore);
    case "vote-mode-priority":
      return modeColor(row.voteModePriority);
    case "risk":
      return riskColor(row);
    case "recommended-action":
      return actionColor(row.action);
  }
}

function marginColor(pp: number): string {
  if (pp >= 10) return "#1e3a8a";       // safe D
  if (pp >= 4) return "#3b6cb8";        // lean D
  if (pp >= 1.5) return "#7aa7d9";      // tilt D
  if (pp >= -1.5) return "#e2e8f0";     // toss-up
  if (pp >= -4) return "#e6a1a4";       // tilt R
  if (pp >= -10) return "#c66266";      // lean R
  return "#7f1d1d";                     // safe R
}

function opportunityColor(net: number): string {
  if (net >= 80) return "#1d4ed8";
  if (net >= 40) return "#3b82f6";
  if (net >= 15) return "#93c5fd";
  if (net >= -15) return "#e2e8f0";
  if (net >= -40) return "#f87171";
  return "#b91c1c";
}

function scoreColor(s: number): string {
  if (s >= 80) return "#5b21b6";
  if (s >= 60) return "#7c3aed";
  if (s >= 40) return "#a78bfa";
  if (s >= 20) return "#ddd6fe";
  return "#f5f3ff";
}

function modeColor(m: "ed" | "early" | "vbm"): string {
  return m === "vbm" ? "#7e57c2" : m === "early" ? "#3f8f63" : "#c08a2e";
}

function riskColor(r: PrecinctRow): string {
  // Risk = the margin is fragile (toss-up territory under the scenario).
  const m = r.scenarioMarginPct;
  if (Math.abs(m) <= 1.5) return "#dc2626"; // high risk
  if (Math.abs(m) <= 4) return "#f59e0b";   // medium
  return "#10b981";                          // low
}

function actionColor(a: PrecinctRow["action"]): string {
  switch (a) {
    case "VBM Ballot Chase": return "#7e57c2";
    case "Early Vote Push": return "#3f8f63";
    case "Door-to-Door Canvass": return "#3b6cb8";
    case "Persuasion Mail": return "#c08a2e";
    case "Digital Retargeting": return "#06b6d4";
    case "Candidate Visit": return "#db2777";
    case "Yard Sign Visibility": return "#0891b2";
    case "Volunteer Recruitment": return "#1e40af";
    case "Damage Reduction": return "#b91c1c";
    case "Monitor Only":
    default:
      return "#cbd5e1";
  }
}

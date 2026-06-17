// Leaflet precinct map. We use plain Leaflet (no react-leaflet) for tighter
// control over GeoJSON layer recolouring when the scenario or map layer changes.
//
// QA fixes baked in:
//  * Build the GeoJSON layer ONLY when geojson/rows/layer change — NOT on
//    selection or hover. Handler callbacks, selectedPrecinct, the layer id,
//    and the rowById map are held in refs so the build effect doesn't depend
//    on them.
//  * Restyle on selection via a SEPARATE effect using eachLayer + setStyle.
//  * Cast (lyr as L.GeoJSON).feature before reading .properties.
//  * CARTO basemap attribution is provided and attributionControl stays on.

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import type { PrecinctRow } from "../lib/data/types";
import type { MapLayer } from "../state/store";
import { colorForRow } from "../lib/data/mapLayers";

interface Props {
  geojson: GeoJSON.FeatureCollection;
  rows: PrecinctRow[];
  layer: MapLayer;
  selectedPrecinct: string | null;
  onSelect: (id: string | null) => void;
  onHover?: (id: string | null) => void;
}

const CARTO_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function precinctIdOf(feature: GeoJSON.Feature | undefined): string {
  return (feature?.properties as { precinct?: string } | undefined)?.precinct ?? "";
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

  // Refs that the (stable) build effect reads without re-subscribing.
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const selectedRef = useRef(selectedPrecinct);
  const layerIdRef = useRef(layer);
  const rowByIdRef = useRef(rowById);
  onSelectRef.current = onSelect;
  onHoverRef.current = onHover;
  selectedRef.current = selectedPrecinct;
  layerIdRef.current = layer;
  rowByIdRef.current = rowById;

  // Initialise map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      preferCanvas: true,
      zoomControl: true,
    }).setView([39.47, -74.63], 10);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      { maxZoom: 18, subdomains: "abcd", attribution: CARTO_ATTRIB },
    ).addTo(map);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      { maxZoom: 18, subdomains: "abcd", pane: "shadowPane" },
    ).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, []);

  // Build / replace the GeoJSON layer ONLY when data or layer-mode changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    const gj = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
      style: (f) => {
        const id = precinctIdOf(f as GeoJSON.Feature | undefined);
        const row = rowByIdRef.current.get(id);
        return styleFor(row, layerIdRef.current, selectedRef.current === id);
      },
      onEachFeature: (feat, lyr) => {
        const id = precinctIdOf(feat as GeoJSON.Feature | undefined);
        lyr.on({
          click: () => onSelectRef.current(id),
          mouseover: (e) => {
            (e.target as L.Path).setStyle({ weight: 2.5, color: "#0a1020" });
            onHoverRef.current?.(id);
          },
          mouseout: (e) => {
            const row = rowByIdRef.current.get(id);
            const isSelected = selectedRef.current === id;
            (e.target as L.Path).setStyle(
              styleFor(row, layerIdRef.current, isSelected) as L.PathOptions,
            );
            onHoverRef.current?.(null);
          },
        });
        const row = rowByIdRef.current.get(id);
        lyr.bindTooltip(
          row ? `${row.baseline.precinctName} — ${row.baseline.municipality}` : id,
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
    // Intentionally depends only on geojson, rowById, layer — NOT selection.
  }, [geojson, rowById, layer]);

  // Restyle on selection via a SEPARATE effect — no layer rebuild.
  useEffect(() => {
    const gj = layerRef.current;
    if (!gj) return;
    gj.eachLayer((lyr) => {
      const feature = (lyr as L.GeoJSON).feature as GeoJSON.Feature | undefined;
      const id = precinctIdOf(feature);
      const row = rowByIdRef.current.get(id);
      (lyr as L.Path).setStyle(
        styleFor(row, layerIdRef.current, selectedPrecinct === id) as L.PathOptions,
      );
    });
  }, [selectedPrecinct]);

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
  const color = colorForRow(row, layer);
  return {
    color: selected ? "#0a1020" : "#475569",
    weight: selected ? 2.5 : 0.5,
    fillColor: color,
    fillOpacity: 0.82,
  };
}

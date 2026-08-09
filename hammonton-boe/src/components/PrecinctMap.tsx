// Leaflet precinct map for Hammonton. Plain Leaflet (no react-leaflet) for
// tighter control over recolouring.
//
// Carries the Sheriff app's map fixes:
//  * The GeoJSON layer is built ONLY when the geometry or the coloring inputs
//    change — never on selection or hover. Callbacks, the selected id and the
//    color function live in refs so the build effect doesn't depend on them.
//  * Selection restyles in place via a separate effect (eachLayer + setStyle).
//  * `(lyr as L.GeoJSON).feature` is cast before reading `.properties`.
//  * CARTO + OpenStreetMap attribution is provided and attributionControl stays on.
//  * Tooltips are permanent district labels (so identity is never carried by
//    fill color alone) plus a focusable/tappable detail tooltip.

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { PrecinctFeature } from "../lib/data/types";

const CARTO_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface Props {
  geojson: GeoJSON.FeatureCollection;
  colorOf: (f: PrecinctFeature) => string;
  tooltipOf: (f: PrecinctFeature) => string;
  selectedPrecinct: string | null;
  onSelect: (id: string | null) => void;
  /** Changing this string rebuilds the layer's colors. */
  colorKey: string;
}

function idOf(feature: GeoJSON.Feature | undefined): string {
  return (feature?.properties as { precinct?: string } | undefined)?.precinct ?? "";
}

export function PrecinctMap({
  geojson,
  colorOf,
  tooltipOf,
  selectedPrecinct,
  onSelect,
  colorKey,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selectedPrecinct);
  const colorOfRef = useRef(colorOf);
  const tooltipOfRef = useRef(tooltipOf);
  onSelectRef.current = onSelect;
  selectedRef.current = selectedPrecinct;
  colorOfRef.current = colorOf;
  tooltipOfRef.current = tooltipOf;

  // Initialise the map once, and tear it down on unmount -- this component is
  // destroyed whenever the user leaves the Map tab or the metric becomes
  // unavailable, and a Leaflet map left alive keeps its resize/zoom listeners
  // and tile requests running.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      preferCanvas: false,
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([39.64, -74.8], 12);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      { maxZoom: 18, subdomains: "abcd", attribution: CARTO_ATTRIB },
    ).addTo(map);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      { maxZoom: 18, subdomains: "abcd", pane: "shadowPane" },
    ).addTo(map);
    mapRef.current = map;
    const t = window.setTimeout(() => map.invalidateSize(), 100);
    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Build / replace the GeoJSON layer only when geometry or coloring changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    const gj = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
      style: (f) => {
        const feat = f as PrecinctFeature | undefined;
        return styleFor(
          feat ? colorOfRef.current(feat) : "#e2e8f0",
          selectedRef.current === idOf(f as GeoJSON.Feature),
        );
      },
      onEachFeature: (feat, lyr) => {
        const feature = feat as PrecinctFeature;
        const id = idOf(feat as GeoJSON.Feature);
        lyr.on({
          click: () => onSelectRef.current(id),
          keydown: (e) => {
            const ev = (e as unknown as { originalEvent: KeyboardEvent })
              .originalEvent;
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              onSelectRef.current(id);
            }
          },
          mouseover: (e) => (e.target as L.Path).setStyle({ weight: 3, color: "#0e1020" }),
          mouseout: (e) =>
            (e.target as L.Path).setStyle(
              styleFor(
                colorOfRef.current(feature),
                selectedRef.current === id,
              ) as L.PathOptions,
            ),
        });
        // A permanent district label keeps identity off hue alone; the tap /
        // hover tooltip carries the measured value.
        lyr.bindTooltip(feature.properties.districtLabel, {
          permanent: true,
          direction: "center",
          className: "precinct-label",
          opacity: 0.9,
        });
      },
    });
    gj.addTo(map);
    layerRef.current = gj;
    // Only now do the SVG paths exist, so this must run after addTo() --
    // inside onEachFeature getElement() is always undefined and the keyboard
    // handler below would be unreachable.
    gj.eachLayer((lyr) => {
      const feature = (lyr as L.GeoJSON).feature as PrecinctFeature | undefined;
      const el = (lyr as L.Path).getElement?.();
      if (!el || !feature) return;
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", tooltipOfRef.current(feature));
    });
    try {
      const b = gj.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [16, 16] });
    } catch {
      /* no-op */
    }
    // Depends only on geometry + coloring — NOT on selection.
  }, [geojson, colorKey]);

  // Keep each shape's accessible name in step with the metric on show.
  useEffect(() => {
    const gj = layerRef.current;
    if (!gj) return;
    gj.eachLayer((lyr) => {
      const feature = (lyr as L.GeoJSON).feature as PrecinctFeature | undefined;
      const el = (lyr as L.Path).getElement?.();
      if (el && feature) {
        el.setAttribute("aria-label", tooltipOf(feature));
        el.setAttribute("aria-pressed", String(
          selectedPrecinct === feature.properties.precinct));
      }
    });
  }, [tooltipOf, selectedPrecinct]);

  // Restyle on selection in a separate effect; no layer rebuild.
  useEffect(() => {
    const gj = layerRef.current;
    if (!gj) return;
    gj.eachLayer((lyr) => {
      const feature = (lyr as L.GeoJSON).feature as PrecinctFeature | undefined;
      if (!feature) return;
      (lyr as L.Path).setStyle(
        styleFor(
          colorOfRef.current(feature),
          selectedPrecinct === feature.properties.precinct,
        ) as L.PathOptions,
      );
    });
  }, [selectedPrecinct]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden ring-1 ring-slate-200 bg-slate-50"
      role="region"
      aria-label="Hammonton election district map"
    />
  );
}

function styleFor(fill: string, selected: boolean): L.PathOptions {
  return {
    color: selected ? "#0e1020" : "#64748b",
    weight: selected ? 3 : 1,
    fillColor: fill,
    fillOpacity: 0.85,
  };
}

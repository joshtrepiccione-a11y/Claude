import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import type {
  PrecinctResult,
  RaceKey,
  ScenarioState,
} from "../../data/types";
import { asmOutcome, asmTicketMarginPct, marginPct } from "../../model/scenario";
import type { MapLayerKey } from "../../state/store";
import type { ScorePrecinct } from "../panels/PrecinctTable";

type Props = {
  results: PrecinctResult[];
  scoresById: Map<string, ScorePrecinct>;
  mapLayer: MapLayerKey;
  raceFocus: RaceKey;
  mode: ScenarioState["mode"];
  onHover: (id: string | undefined) => void;
  onSelect: (id: string | undefined) => void;
  selectedPrecinct?: string;
};

function marginColor(pct: number): string {
  const a = Math.max(-1, Math.min(1, pct / 40));
  if (a >= 0) {
    const t = a;
    const r = Math.round(255 + (44 - 255) * t);
    const g = Math.round(255 + (126 - 255) * t);
    const b = Math.round(255 + (248 - 255) * t);
    return `rgb(${r},${g},${b})`;
  }
  const t = -a;
  const r = Math.round(255 + (210 - 255) * t);
  const g = Math.round(255 + (63 - 255) * t);
  const b = Math.round(255 + (63 - 255) * t);
  return `rgb(${r},${g},${b})`;
}

function turnoutColor(total: number, maxTotal: number): string {
  const t = Math.min(1, total / Math.max(1, maxTotal));
  const r = Math.round(30 + (240 - 30) * t);
  const g = Math.round(30 + (200 - 30) * t);
  const b = Math.round(40 + (60 - 40) * t);
  return `rgb(${r},${g},${b})`;
}

function priorityColor(score: number): string {
  // Purple/yellow diverging (party-neutral)
  const t = score / 100;
  if (t < 0.5) {
    const k = t * 2;
    const r = Math.round(42 + (107 - 42) * k);
    const g = Math.round(45 + (91 - 45) * k);
    const b = Math.round(53 + (149 - 53) * k);
    return `rgb(${r},${g},${b})`;
  }
  const k = (t - 0.5) * 2;
  const r = Math.round(107 + (245 - 107) * k);
  const g = Math.round(91 + (200 - 91) * k);
  const b = Math.round(149 + (122 - 149) * k);
  return `rgb(${r},${g},${b})`;
}

function netChangeColor(delta: number): string {
  // Green/orange diverging
  const norm = Math.max(-1, Math.min(1, delta / 200));
  if (norm >= 0) {
    const t = norm;
    const r = Math.round(255 + (88 - 255) * t);
    const g = Math.round(255 + (200 - 255) * t);
    const b = Math.round(255 + (120 - 255) * t);
    return `rgb(${r},${g},${b})`;
  }
  const t = -norm;
  const r = Math.round(255 + (230 - 255) * t);
  const g = Math.round(255 + (140 - 255) * t);
  const b = Math.round(255 + (60 - 255) * t);
  return `rgb(${r},${g},${b})`;
}

const OUTCOME_COLOR: Record<string, string> = {
  "2D": "#2c7ef8",
  "1D1R-D": "#6fa8f7",
  "1D1R-R": "#e07a7a",
  "2R": "#d23f3f",
};

export function PrecinctMap({
  results,
  scoresById,
  mapLayer,
  raceFocus,
  mode,
  onHover,
  onSelect,
  selectedPrecinct,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  // Max turnout for ramp normalization
  const maxTurnout = useMemo(() => {
    let m = 1;
    for (const r of results) {
      const t =
        mode === "total"
          ? r.sen.total.total
          : r.sen.byMode[mode].total;
      if (t > m) m = t;
    }
    return m;
  }, [results, mode]);

  const styleFor = useMemo(() => {
    return (feat: any): L.PathOptions => {
      const id = feat.properties.precinct;
      const r = results.find((x) => x.feature.properties.precinct === id);
      if (!r) {
        return { color: "#1a1f27", weight: 0.4, fillColor: "#444", fillOpacity: 0.5 };
      }
      let fill = "#444";
      const senS = mode === "total" ? r.sen.total : r.sen.byMode[mode];
      const asmS = mode === "total" ? r.asm.total : r.asm.byMode[mode];
      switch (mapLayer) {
        case "sen_margin":
          fill = marginColor(marginPct(senS));
          break;
        case "asm_margin":
          fill = marginColor(asmTicketMarginPct(asmS));
          break;
        case "asm_outcome": {
          const out = asmOutcome(asmS);
          fill = OUTCOME_COLOR[out.code];
          break;
        }
        case "turnout":
          fill = turnoutColor(senS.total, maxTurnout);
          break;
        case "net_change": {
          const delta =
            r.sen.total.d -
            r.sen.baselineTotal.d -
            (r.sen.total.r - r.sen.baselineTotal.r);
          fill = netChangeColor(delta);
          break;
        }
        case "strategic_priority": {
          const sc = scoresById.get(id);
          fill = priorityColor(sc?.overall ?? 0);
          break;
        }
      }
      const isSelected = id === selectedPrecinct;
      return {
        color: isSelected ? "#fff" : "#1a1f27",
        weight: isSelected ? 2 : 0.4,
        fillColor: fill,
        fillOpacity: 0.85,
      };
    };
  }, [mapLayer, mode, maxTurnout, results, scoresById, selectedPrecinct]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const m = L.map(containerRef.current, {
      preferCanvas: true,
      zoomControl: true,
    }).setView([39.85, -74.75], 10);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 18,
    }).addTo(m);
    mapRef.current = m;
    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, []);

  // Build geojson layer once (or when results change features)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || results.length === 0) return;
    if (layerRef.current) {
      m.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    const fc = {
      type: "FeatureCollection" as const,
      features: results.map((r) => r.feature),
    };
    const layer = L.geoJSON(fc as any, {
      style: styleFor as any,
      onEachFeature: (feat, lyr) => {
        const id = feat.properties.precinct;
        lyr.on("mouseover", () => {
          (lyr as L.Path).setStyle({ weight: 2, color: "#fff" });
          onHover(id);
        });
        lyr.on("mouseout", () => {
          layer.resetStyle(lyr);
          onHover(undefined);
        });
        lyr.on("click", () => onSelect(id));
      },
    }).addTo(m);
    try {
      m.fitBounds(layer.getBounds(), { padding: [16, 16] });
    } catch {}
    layerRef.current = layer;
    void raceFocus; // raceFocus doesn't change geometry; included in deps for completeness
  }, [results.length, raceFocus]);

  // Update style when layer/mode/selection changes
  useEffect(() => {
    if (layerRef.current) layerRef.current.setStyle(styleFor as any);
  }, [styleFor]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

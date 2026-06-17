import { useMemo } from "react";
import type { PrecinctRow } from "../lib/data/types";
import { useApp } from "../state/store";
import { PrecinctMap } from "../components/PrecinctMap";
import { PrecinctDrawer } from "../components/Drawer";
import { Card, Pill } from "../components/UI";
import { MAP_LAYERS, MAP_LAYER_BY_ID } from "../lib/data/mapLayers";

export function MapTab({
  rows,
  geojson,
}: {
  rows: PrecinctRow[];
  geojson: GeoJSON.FeatureCollection;
}) {
  const { state, dispatch } = useApp();

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (
        state.municipalityFilter.length &&
        !state.municipalityFilter.includes(r.baseline.municipality)
      )
        return false;
      return true;
    });
  }, [rows, state.municipalityFilter]);

  const munis = useMemo(
    () => Array.from(new Set(rows.map((r) => r.baseline.municipality))).sort(),
    [rows],
  );

  const selectedRow =
    rows.find((r) => r.baseline.precinctId === state.selectedPrecinct) ?? null;

  const activeLayer = MAP_LAYER_BY_ID[state.mapLayer];

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-3 space-y-3">
          <Card title="Map layer">
            <div className="flex flex-col gap-1">
              {MAP_LAYERS.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="radio"
                    name="layer"
                    checked={state.mapLayer === l.id}
                    onChange={() => dispatch({ type: "setMapLayer", layer: l.id })}
                  />
                  {l.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">{activeLayer.description}</p>
          </Card>

          <Card title="Vote Mode">
            <select
              value={state.voteModeFilter}
              onChange={(e) =>
                dispatch({
                  type: "setVoteModeFilter",
                  m: e.target.value as "all" | "ed" | "early" | "vbm",
                })
              }
              className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
            >
              <option value="all">All</option>
              <option value="ed">Election Day</option>
              <option value="early">Early Vote</option>
              <option value="vbm">Vote by Mail</option>
            </select>
          </Card>

          <Card title="Filters">
            <MultiCheck
              label="Municipality"
              options={munis}
              selected={state.municipalityFilter}
              onChange={(m) => dispatch({ type: "setMuniFilter", m })}
            />
          </Card>
        </aside>

        <main className="lg:col-span-6">
          <Card
            title={`Precinct map (${filtered.length})`}
            right={<Pill tone="gold">{activeLayer.shortLabel}</Pill>}
          >
            <div className="h-[340px] sm:h-[520px] lg:h-[640px]">
              <PrecinctMap
                geojson={geojson}
                rows={filtered}
                layer={state.mapLayer}
                selectedPrecinct={state.selectedPrecinct}
                onSelect={(id) => dispatch({ type: "selectPrecinct", id })}
              />
            </div>
            <Legend />
          </Card>
        </main>

        {/* Desktop drawer */}
        <aside className="hidden lg:block lg:col-span-3">
          <PrecinctDrawer
            row={selectedRow}
            onClose={() => dispatch({ type: "selectPrecinct", id: null })}
          />
        </aside>
      </div>

      {/* Mobile/tablet bottom sheet for precinct detail */}
      {selectedRow && (
        <div className="lg:hidden fixed inset-0 z-40 flex items-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => dispatch({ type: "selectPrecinct", id: null })}
            aria-hidden="true"
          />
          <div className="relative w-full max-h-[80vh] overflow-auto thin-scroll rounded-t-2xl bg-white p-3 pb-24 shadow-2xl">
            <PrecinctDrawer
              row={selectedRow}
              onClose={() => dispatch({ type: "selectPrecinct", id: null })}
            />
          </div>
        </div>
      )}
    </div>
  );

  function Legend() {
    return (
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
        {activeLayer.legend.map((i) => (
          <span key={i.l} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: i.c }} />
            {i.l}
          </span>
        ))}
      </div>
    );
  }
}

function MultiCheck({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (s: string[]) => void;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      <div className="max-h-44 overflow-auto thin-scroll text-sm space-y-1">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(o)}
              onChange={() =>
                onChange(
                  selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o],
                )
              }
            />
            <span>{o}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="text-xs text-slate-500 hover:text-slate-800 mt-1"
        >
          Clear
        </button>
      )}
    </div>
  );
}

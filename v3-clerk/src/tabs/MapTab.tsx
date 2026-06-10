import { useMemo } from "react";
import type { PrecinctRow } from "../lib/data/types";
import { useApp, type MapLayer } from "../state/store";
import { PrecinctMap } from "../components/PrecinctMap";
import { PrecinctDrawer } from "../components/Drawer";
import { Card, Pill } from "../components/UI";

const LAYERS: { id: MapLayer; label: string }[] = [
  { id: "margin", label: "Clerk Margin" },
  { id: "net-vote-opportunity", label: "Net Vote Opportunity" },
  { id: "turnout-opportunity", label: "Turnout Opportunity" },
  { id: "persuasion-opportunity", label: "Persuasion Opportunity" },
  { id: "vote-mode-priority", label: "Vote Mode Priority" },
  { id: "risk", label: "Risk" },
  { id: "recommended-action", label: "Recommended Action" },
];

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

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-3 space-y-3">
          <Card title="Map layer">
            <div className="flex flex-col gap-1">
              {LAYERS.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-sm">
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
            right={<Pill tone="amber">Calibrated baseline</Pill>}
          >
            <div className="h-[640px]">
              <PrecinctMap
                geojson={geojson}
                rows={filtered}
                layer={state.mapLayer}
                selectedPrecinct={state.selectedPrecinct}
                onSelect={(id) => dispatch({ type: "selectPrecinct", id })}
              />
            </div>
          </Card>
        </main>

        <aside className="lg:col-span-3">
          <PrecinctDrawer
            row={selectedRow}
            onClose={() => dispatch({ type: "selectPrecinct", id: null })}
          />
        </aside>
      </div>
    </div>
  );
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
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </div>
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

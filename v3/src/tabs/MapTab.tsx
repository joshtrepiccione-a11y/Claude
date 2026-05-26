import { useMemo } from "react";
import type { PrecinctRow } from "../lib/data/types";
import { useApp, type MapLayer, type RaceView } from "../state/store";
import { PrecinctMap } from "../components/PrecinctMap";
import { PrecinctDrawer } from "../components/Drawer";
import { Card, Pill } from "../components/UI";

const LAYERS: { id: MapLayer; label: string }[] = [
  { id: "slate-margin", label: "Assembly Slate Margin" },
  { id: "senate-margin", label: "Senate Margin" },
  { id: "ticket-seats", label: "Full Ticket Lean" },
  { id: "candidate-a-margin", label: "Assembly Candidate A Margin" },
  { id: "candidate-b-margin", label: "Assembly Candidate B Margin" },
  { id: "net-vote-opportunity", label: "Net Vote Opportunity (S+A)" },
  { id: "turnout-opportunity", label: "Turnout Opportunity" },
  { id: "persuasion-opportunity", label: "Persuasion Opportunity" },
  { id: "vote-mode-priority", label: "Vote Mode Priority" },
  { id: "risk", label: "Risk" },
  { id: "recommended-action", label: "Recommended Action" },
];

const RACE_VIEWS: { id: RaceView; label: string }[] = [
  { id: "slate", label: "Assembly Slate" },
  { id: "senate", label: "Senate (single-seat)" },
  { id: "ticket", label: "Full Ticket (0–3 seats)" },
  { id: "dA", label: "Democratic Assembly Candidate A" },
  { id: "dB", label: "Democratic Assembly Candidate B" },
  { id: "rA", label: "Republican Assembly Candidate A" },
  { id: "rB", label: "Republican Assembly Candidate B" },
  { id: "dropoff", label: "Assembly Candidate Drop-Off" },
  { id: "bullet", label: "Bullet Vote Risk (Assembly)" },
  { id: "split", label: "Split Ticket Risk" },
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
      if (
        state.countyFilter.length &&
        !state.countyFilter.includes(r.baseline.county)
      )
        return false;
      return true;
    });
  }, [rows, state.municipalityFilter, state.countyFilter]);

  const munis = useMemo(
    () => Array.from(new Set(rows.map((r) => r.baseline.municipality))).sort(),
    [rows],
  );
  const counties = useMemo(
    () => Array.from(new Set(rows.map((r) => r.baseline.county))).sort(),
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

          <Card title="Race / Candidate View">
            <select
              value={state.raceView}
              onChange={(e) =>
                dispatch({ type: "setRaceView", v: e.target.value as RaceView })
              }
              className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
            >
              {RACE_VIEWS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
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
              label="County"
              options={counties}
              selected={state.countyFilter}
              onChange={(c) => dispatch({ type: "setCountyFilter", c })}
            />
            <div className="h-2" />
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
            right={<Pill tone="amber">Modeled baseline</Pill>}
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

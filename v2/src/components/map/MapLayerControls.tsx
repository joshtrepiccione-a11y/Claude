import type { UiMode } from "../../data/types";
import type { MapLayerKey } from "../../state/store";

type Props = {
  uiMode: UiMode;
  mapLayer: MapLayerKey;
  onChange: (l: MapLayerKey) => void;
};

const ALL_LAYERS: { id: MapLayerKey; label: string; section: string }[] = [
  { id: "strategic_priority", label: "Strategic Priority", section: "Opportunity" },
  { id: "net_change", label: "Net Vote Change", section: "Opportunity" },
  { id: "sen_margin", label: "Senate Margin (D−R)", section: "Result" },
  { id: "asm_margin", label: "Assembly Ticket Margin", section: "Result" },
  { id: "asm_outcome", label: "Assembly Outcome (2D / split / 2R)", section: "Result" },
  { id: "turnout", label: "Turnout", section: "Volume" },
];

const CANDIDATE_LAYERS: { id: MapLayerKey; label: string }[] = [
  { id: "strategic_priority", label: "Where the action is" },
  { id: "sen_margin", label: "Who's winning" },
  { id: "turnout", label: "Turnout" },
];

export function MapLayerControls({ uiMode, mapLayer, onChange }: Props) {
  if (uiMode === "candidate") {
    return (
      <div className="map-layer-controls" role="radiogroup" aria-label="Map layer">
        <strong>Map view</strong>
        {CANDIDATE_LAYERS.map((l) => (
          <label key={l.id}>
            <input
              type="radio"
              name="layer"
              checked={mapLayer === l.id}
              onChange={() => onChange(l.id)}
            />
            {l.label}
          </label>
        ))}
      </div>
    );
  }
  // Expert: full list grouped by section
  const sections = Array.from(new Set(ALL_LAYERS.map((l) => l.section)));
  return (
    <div className="map-layer-controls" role="radiogroup" aria-label="Map layer">
      <strong>Map layer</strong>
      {sections.map((sec) => (
        <div key={sec} style={{ paddingTop: 4 }}>
          <div className="muted tiny" style={{ padding: "2px 5px" }}>{sec}</div>
          {ALL_LAYERS.filter((l) => l.section === sec).map((l) => (
            <label key={l.id}>
              <input
                type="radio"
                name="layer"
                checked={mapLayer === l.id}
                onChange={() => onChange(l.id)}
              />
              {l.label}
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

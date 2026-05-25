import type {
  Candidates,
  PrecinctResult,
  ScenarioState,
  ViewKey,
} from "../../data/types";
import { asmOutcome, asmTicketMarginPct, marginPct } from "../../model/scenario";
import { ACTION_COLORS, ACTION_LABELS } from "../../model/scoring";
import type { ScorePrecinct } from "../panels/PrecinctTable";

type Props = {
  results: PrecinctResult[];
  scoresById: Map<string, ScorePrecinct>;
  hoveredId?: string;
  selectedId?: string;
  mode: ScenarioState["mode"];
  view: ViewKey;
  candidates: Candidates;
};

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function HoverPanel({
  results,
  scoresById,
  hoveredId,
  selectedId,
  mode,
  view,
  candidates,
}: Props) {
  const id = hoveredId ?? selectedId;
  if (!id) {
    return (
      <section className="panel" style={{ marginTop: 12 }}>
        <h2>Precinct Detail</h2>
        <p className="muted">Hover or click a precinct on the map.</p>
      </section>
    );
  }
  const r = results.find((x) => x.feature.properties.precinct === id);
  if (!r) return null;
  const sc = scoresById.get(id);
  const sen = mode === "total" ? r.sen.total : r.sen.byMode[mode];
  const asm = mode === "total" ? r.asm.total : r.asm.byMode[mode];
  const senMarg = marginPct(sen);
  const asmMarg = asmTicketMarginPct(asm);
  const outcome = asmOutcome(asm);
  const winSet = new Set(outcome.top2.map((c) => c.name));
  const ackWin = (k: string) =>
    winSet.has(k) ? <span style={{ color: "#6ee787", fontSize: 10, marginLeft: 4 }}>WIN</span> : null;

  return (
    <section className="panel" style={{ marginTop: 12 }}>
      <h2>Precinct Detail</h2>
      <h3 style={{ margin: "0 0 4px" }}>{r.feature.properties.precinct}</h3>
      <p className="muted tiny" style={{ margin: 0 }}>
        {r.feature.properties.municipality} · {r.feature.properties.county} County
      </p>
      <div style={{ marginTop: 10, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
        <h3>State Senate</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "2px 8px", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
          <span>{candidates.sen_d}</span><span>{fmt(sen.d)}</span><span className="muted">{sen.total ? ((sen.d/sen.total)*100).toFixed(1) : "0.0"}%</span>
          <span>{candidates.sen_r}</span><span>{fmt(sen.r)}</span><span className="muted">{sen.total ? ((sen.r/sen.total)*100).toFixed(1) : "0.0"}%</span>
          <span>Other</span><span>{fmt(sen.o)}</span><span className="muted">{sen.total ? ((sen.o/sen.total)*100).toFixed(1) : "0.0"}%</span>
          <span><strong>Margin</strong></span><span></span><span style={{ color: senMarg >= 0 ? "var(--dem)" : "var(--rep)" }}>{senMarg >= 0 ? "+" : ""}{senMarg.toFixed(1)}%</span>
        </div>
      </div>
      <div style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
        <h3>Assembly (vote-for-2 · {outcome.code})</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "2px 8px", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
          <span>{candidates.asm_d1}{ackWin("d1")}</span><span>{fmt(asm.d1)}</span><span className="muted">{asm.total ? ((asm.d1/asm.total)*100).toFixed(1) : "0.0"}%</span>
          <span>{candidates.asm_d2}{ackWin("d2")}</span><span>{fmt(asm.d2)}</span><span className="muted">{asm.total ? ((asm.d2/asm.total)*100).toFixed(1) : "0.0"}%</span>
          <span>{candidates.asm_r1}{ackWin("r1")}</span><span>{fmt(asm.r1)}</span><span className="muted">{asm.total ? ((asm.r1/asm.total)*100).toFixed(1) : "0.0"}%</span>
          <span>{candidates.asm_r2}{ackWin("r2")}</span><span>{fmt(asm.r2)}</span><span className="muted">{asm.total ? ((asm.r2/asm.total)*100).toFixed(1) : "0.0"}%</span>
          <span>Other</span><span>{fmt(asm.o)}</span><span className="muted">{asm.total ? ((asm.o/asm.total)*100).toFixed(1) : "0.0"}%</span>
          <span><strong>Ticket margin</strong></span><span></span><span style={{ color: asmMarg >= 0 ? "var(--dem)" : "var(--rep)" }}>{asmMarg >= 0 ? "+" : ""}{asmMarg.toFixed(1)}%</span>
        </div>
      </div>
      {sc && (
        <div style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
          <h3>Strategic Recommendation</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                background: ACTION_COLORS[sc.recommendation.primary] + "33",
                color: ACTION_COLORS[sc.recommendation.primary],
                border: `1px solid ${ACTION_COLORS[sc.recommendation.primary]}66`,
              }}
            >
              {ACTION_LABELS[sc.recommendation.primary]}
            </span>
            <span className="muted tiny">
              Priority {sc.overall} · confidence {"●".repeat(sc.recommendation.confidence)}
            </span>
          </div>
          <p className="muted tiny" style={{ margin: 0 }}>
            {sc.recommendation.reasoning.join(" · ")}
          </p>
        </div>
      )}
      <div style={{ padding: "6px 0 0", borderTop: "1px solid var(--border)" }}>
        <span className={`badge ${view === "scenario" ? "scenario" : "calibrated"}`}>
          {view === "scenario" ? "Scenario" : "Calibrated"}
        </span>{" "}
        <span className="muted tiny">
          {view === "scenario" ? "based on calibrated baseline + sliders" : "district aggregate certified, distribution interpolated"}
        </span>
      </div>
    </section>
  );
}

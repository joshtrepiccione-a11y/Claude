import { useMemo } from "react";
import type { PrecinctResult } from "../../data/types";
import { ACTION_LABELS } from "../../model/scoring";
import type { ScorePrecinct } from "./PrecinctTable";

type Props = {
  results: PrecinctResult[];
  scoresById: Map<string, ScorePrecinct>;
  selectedMuni?: string;
  onSelectMuni: (m: string | undefined) => void;
};

type MuniRow = {
  muni: string;
  county: string;
  precincts: number;
  baseMargin: number;
  scenMargin: number;
  netDelta: number;
  totalVotes: number;
  strongestMode: "Election Day" | "Early Vote" | "Vote by Mail";
  classification: string;
  topAction: string;
};

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function classify(row: {
  scenMargin: number;
  baseMargin: number;
  totalVotes: number;
  medianVotes: number;
}): string {
  const { scenMargin, baseMargin, totalVotes, medianVotes } = row;
  if (Math.abs(scenMargin) > 20) return totalVotes < medianVotes ? "Low-ROI Area" : "Opposition Stronghold";
  if (Math.abs(scenMargin) < 5 && totalVotes > medianVotes) return "Persuasion Battleground";
  if (Math.sign(scenMargin) === Math.sign(baseMargin) && Math.abs(scenMargin) < Math.abs(baseMargin) - 2)
    return "Defensive Hold";
  if (Math.abs(scenMargin) > 10 && totalVotes > medianVotes) return "Base Turnout Opportunity";
  if (totalVotes > medianVotes && Math.abs(scenMargin) < 12) return "High-Volume Swing";
  return "Standard Target";
}

export function MunicipalityDashboard({
  results,
  scoresById,
  selectedMuni,
  onSelectMuni,
}: Props) {
  const rows: MuniRow[] = useMemo(() => {
    const byMuni = new Map<string, PrecinctResult[]>();
    for (const r of results) {
      const m = r.feature.properties.municipality;
      if (!byMuni.has(m)) byMuni.set(m, []);
      byMuni.get(m)!.push(r);
    }
    const out: MuniRow[] = [];
    const muniTotals: number[] = [];
    for (const [, list] of byMuni)
      muniTotals.push(list.reduce((a, r) => a + r.sen.total.total, 0));
    muniTotals.sort((a, b) => a - b);
    const median = muniTotals.length ? muniTotals[Math.floor(muniTotals.length / 2)] : 0;
    for (const [muni, list] of byMuni) {
      const sd = list.reduce((a, r) => a + r.sen.total.d, 0);
      const sr = list.reduce((a, r) => a + r.sen.total.r, 0);
      const st = list.reduce((a, r) => a + r.sen.total.total, 0);
      const bd = list.reduce((a, r) => a + r.sen.baselineTotal.d, 0);
      const br = list.reduce((a, r) => a + r.sen.baselineTotal.r, 0);
      const bt = list.reduce((a, r) => a + r.sen.baselineTotal.total, 0);
      const ed = list.reduce((a, r) => a + r.sen.byMode.ed.total, 0);
      const ev = list.reduce((a, r) => a + r.sen.byMode.early.total, 0);
      const vbm = list.reduce((a, r) => a + r.sen.byMode.vbm.total, 0);
      const modeMax = Math.max(ed, ev, vbm);
      const strongestMode =
        modeMax === ed ? "Election Day" : modeMax === ev ? "Early Vote" : "Vote by Mail";
      const scenMargin = st > 0 ? ((sd - sr) / st) * 100 : 0;
      const baseMargin = bt > 0 ? ((bd - br) / bt) * 100 : 0;
      const netDelta = sd - bd - (sr - br);
      const classification = classify({
        scenMargin,
        baseMargin,
        totalVotes: st,
        medianVotes: median,
      });
      // Most-common action
      const counts = new Map<string, number>();
      for (const r of list) {
        const sc = scoresById.get(r.feature.properties.precinct);
        if (sc) counts.set(sc.recommendation.primary, (counts.get(sc.recommendation.primary) ?? 0) + 1);
      }
      let topAction = "—";
      let topCount = 0;
      for (const [a, c] of counts) {
        if (c > topCount) { topAction = ACTION_LABELS[a as keyof typeof ACTION_LABELS] ?? a; topCount = c; }
      }
      out.push({
        muni,
        county: list[0].feature.properties.county,
        precincts: list.length,
        baseMargin,
        scenMargin,
        netDelta,
        totalVotes: st,
        strongestMode,
        classification,
        topAction,
      });
    }
    out.sort((a, b) => Math.abs(b.netDelta) - Math.abs(a.netDelta));
    return out;
  }, [results, scoresById]);

  return (
    <section className="panel">
      <h2>Municipality Dashboard</h2>
      <p className="muted tiny">
        Sorted by absolute net-vote shift vs baseline. Click a card to filter
        the map and table to that municipality.
      </p>
      <div className="muni-grid">
        {rows.map((r) => (
          <div
            key={r.muni}
            className={`muni-card ${selectedMuni === r.muni ? "selected" : ""}`}
            onClick={() => onSelectMuni(selectedMuni === r.muni ? undefined : r.muni)}
            role="button"
            tabIndex={0}
          >
            <div className="muni-name">
              <span>{r.muni}</span>
              <span className="muted tiny">{r.precincts} prec.</span>
            </div>
            <div className="muni-class">{r.classification}</div>
            <div className="stat-row">
              <span>Baseline</span>
              <span className="val">{r.baseMargin >= 0 ? "+" : ""}{r.baseMargin.toFixed(1)}%</span>
            </div>
            <div className="stat-row">
              <span>Scenario</span>
              <span className="val">{r.scenMargin >= 0 ? "+" : ""}{r.scenMargin.toFixed(1)}%</span>
            </div>
            <div className="stat-row">
              <span>Net Δ</span>
              <span className="val" style={{ color: r.netDelta >= 0 ? "#6ee787" : "#f78787" }}>
                {r.netDelta >= 0 ? "+" : ""}{fmt(r.netDelta)}
              </span>
            </div>
            <div className="stat-row">
              <span>Votes</span>
              <span className="val">{fmt(r.totalVotes)}</span>
            </div>
            <div className="stat-row">
              <span>Strong mode</span>
              <span className="val">{r.strongestMode}</span>
            </div>
            <div className="stat-row">
              <span>Top action</span>
              <span className="val">{r.topAction}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

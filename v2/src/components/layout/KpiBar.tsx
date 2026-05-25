import type {
  Candidates,
  PrecinctResult,
  RaceKey,
  ViewKey,
} from "../../data/types";
import { asmTicketMarginPct, marginPct } from "../../model/scenario";
import {
  rateRace,
  RATING_COLORS,
  RATING_TEXT_COLORS,
} from "../../model/dataConfidence";
import type { ScorePrecinct } from "../panels/PrecinctTable";

type Props = {
  results: PrecinctResult[];
  scoresById: Map<string, ScorePrecinct>;
  raceFocus: RaceKey;
  candidates: Candidates;
  view: ViewKey;
};

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function KpiBar({ results, scoresById, raceFocus, candidates, view }: Props) {
  // Aggregate Senate totals
  let sD = 0,
    sR = 0,
    sT = 0,
    bD = 0,
    bR = 0,
    bT = 0;
  let aD = 0,
    aR = 0,
    aT = 0,
    abD = 0,
    abR = 0,
    abT = 0;
  for (const r of results) {
    sD += r.sen.total.d;
    sR += r.sen.total.r;
    sT += r.sen.total.total;
    bD += r.sen.baselineTotal.d;
    bR += r.sen.baselineTotal.r;
    bT += r.sen.baselineTotal.total;
    aD += r.asm.total.d_total;
    aR += r.asm.total.r_total;
    aT += r.asm.total.total;
    abD += r.asm.baselineTotal.d_total;
    abR += r.asm.baselineTotal.r_total;
    abT += r.asm.baselineTotal.total;
  }
  const senMargPct = sT > 0 ? ((sD - sR) / sT) * 100 : 0;
  const senBaseMargPct = bT > 0 ? ((bD - bR) / bT) * 100 : 0;
  const asmMargPct = aT > 0 ? ((aD - aR) / aT) * 100 : 0;
  const asmBaseMargPct = abT > 0 ? ((abD - abR) / abT) * 100 : 0;

  const isSen = raceFocus === "sen";
  const marg = isSen ? senMargPct : asmMargPct;
  const baseMarg = isSen ? senBaseMargPct : asmBaseMargPct;
  const winner = marg > 0 ? "D" : marg < 0 ? "R" : "tie";
  const winnerName = isSen
    ? winner === "D"
      ? candidates.sen_d
      : winner === "R"
      ? candidates.sen_r
      : "tied"
    : winner === "D"
    ? "Democratic ticket"
    : "Republican ticket";
  const voteMarg = isSen
    ? Math.abs(sD - sR)
    : Math.abs(aD - aR);
  const baseVoteMarg = isSen
    ? Math.abs(bD - bR)
    : Math.abs(abD - abR);

  const rating = rateRace(marg, baseMarg);

  // Top opportunity / risk by precinct net-vote delta (Senate-based,
  // since priority scoring uses Senate).
  let top: { name: string; delta: number; mUni: string } | undefined;
  let risk: { name: string; delta: number; mUni: string } | undefined;
  for (const r of results) {
    const delta =
      r.sen.total.d -
      r.sen.baselineTotal.d -
      (r.sen.total.r - r.sen.baselineTotal.r);
    if (!top || Math.abs(delta) > Math.abs(top.delta)) {
      top = {
        name: r.feature.properties.precinct,
        delta,
        mUni: r.feature.properties.municipality,
      };
    }
    // Risk = largest erosion of currently-winning side
    const sign = senMargPct >= 0 ? 1 : -1;
    const erosion = -sign * delta;
    if (!risk || erosion > risk.delta) {
      risk = {
        name: r.feature.properties.precinct,
        delta: erosion,
        mUni: r.feature.properties.municipality,
      };
    }
  }

  const winnerCls = winner === "D" ? "dem" : winner === "R" ? "rep" : "";
  const marginCls = marg >= 0 ? "pos" : "neg";

  // Cushion vs. deficit framing
  const isLeading =
    (view === "baseline" && Math.abs(marg) > 0) ||
    (view === "scenario" && Math.abs(marg) > 0);
  const votesLabel = isLeading ? "Margin (votes)" : "Vote gap";
  void scoresById; // currently used only for richer Top-Opportunity descriptions; kept for future use
  return (
    <div className="kpi-bar" role="region" aria-label="Key indicators">
      <div className="kpi-card">
        <p className="kpi-label">Projected Winner</p>
        <p className="kpi-value smaller">
          <span className={winnerCls}>{winnerName}</span>
        </p>
        <p className="kpi-sub">{isSen ? "State Senate" : "Assembly (top 2 wins)"}</p>
      </div>
      <div className="kpi-card">
        <p className="kpi-label">Margin %</p>
        <p className="kpi-value">
          <span className={marginCls}>
            {marg >= 0 ? "+" : ""}
            {marg.toFixed(1)}%
          </span>
        </p>
        <p className="kpi-sub">
          baseline {baseMarg >= 0 ? "+" : ""}
          {baseMarg.toFixed(1)}%
        </p>
      </div>
      <div className="kpi-card">
        <p className="kpi-label">{votesLabel}</p>
        <p className="kpi-value">{fmt(voteMarg)}</p>
        <p className="kpi-sub">baseline {fmt(baseVoteMarg)}</p>
      </div>
      <div className="kpi-card">
        <p className="kpi-label">Race Rating</p>
        <p className="kpi-value smaller">
          <span
            className="rating-badge"
            style={{
              background: RATING_COLORS[rating],
              color: RATING_TEXT_COLORS[rating],
            }}
          >
            {rating}
          </span>
        </p>
        <p className="kpi-sub">vs baseline</p>
      </div>
      <div className="kpi-card">
        <p className="kpi-label">Top Opportunity</p>
        <p className="kpi-value smaller">
          {top ? `${top.mUni}` : "—"}
        </p>
        <p className="kpi-sub">
          {top
            ? `${top.delta >= 0 ? "+" : ""}${fmt(Math.abs(top.delta))} net ${
                top.delta >= 0 ? "D" : "R"
              } · ${top.name.slice(0, 30)}`
            : ""}
        </p>
      </div>
      <div className="kpi-card">
        <p className="kpi-label">Top Risk</p>
        <p className="kpi-value smaller">{risk ? risk.mUni : "—"}</p>
        <p className="kpi-sub">
          {risk
            ? `${fmt(Math.max(0, risk.delta))} vote erosion of leader`
            : ""}
        </p>
      </div>
    </div>
  );
}

void marginPct;
void asmTicketMarginPct;

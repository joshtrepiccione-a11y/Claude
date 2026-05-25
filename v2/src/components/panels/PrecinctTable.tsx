import { useMemo, useState } from "react";
import type { ActionTag, PrecinctResult, UiMode } from "../../data/types";
import {
  ACTION_COLORS,
  ACTION_LABELS,
  type ScoringContext,
} from "../../model/scoring";
import { marginPct } from "../../model/scenario";

export type ScorePrecinct = {
  persuasion: number;
  baseTurnout: number;
  vbm: number;
  overall: number;
  recommendation: {
    primary: ActionTag;
    reasoning: string[];
    confidence: 1 | 2 | 3;
    leaningParty: "D" | "R" | "competitive";
  };
};

type Props = {
  results: PrecinctResult[];
  scoresById: Map<string, ScorePrecinct>;
  selectedPrecinct?: string;
  onSelectPrecinct: (id: string | undefined) => void;
  uiMode: UiMode;
};

type Row = {
  precinct: string;
  muni: string;
  baseMargin: number;
  scenMargin: number;
  netDelta: number;
  total: number;
  edShare: number;
  evShare: number;
  vbmShare: number;
  persuasion: number;
  baseTurnout: number;
  vbm: number;
  overall: number;
  action: ActionTag;
  reasoning: string[];
};

type SortKey = keyof Row;
type SortDir = "asc" | "desc";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
function pct(n: number, sign = true): string {
  return `${sign && n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}
function priorityColor(score: number): string {
  // Purple/yellow ramp, decoupled from D/R
  if (score >= 80) return "rgba(245, 200, 122, 0.35)";
  if (score >= 60) return "rgba(245, 200, 122, 0.2)";
  if (score >= 40) return "rgba(107, 91, 149, 0.3)";
  if (score >= 20) return "rgba(107, 91, 149, 0.2)";
  return "rgba(50, 50, 60, 0.3)";
}

export function PrecinctTable({
  results,
  scoresById,
  selectedPrecinct,
  onSelectPrecinct,
  uiMode,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [muniFilter, setMuniFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<ActionTag | "">("");
  const [minPriority, setMinPriority] = useState<number>(0);
  const [search, setSearch] = useState<string>("");

  const rows: Row[] = useMemo(() => {
    return results.map((r) => {
      const sc = scoresById.get(r.feature.properties.precinct)!;
      const total = r.sen.total.total;
      const m = marginPct(r.sen.total);
      const bm = marginPct(r.sen.baselineTotal);
      const net =
        r.sen.total.d -
        r.sen.baselineTotal.d -
        (r.sen.total.r - r.sen.baselineTotal.r);
      return {
        precinct: r.feature.properties.precinct,
        muni: r.feature.properties.municipality,
        baseMargin: bm,
        scenMargin: m,
        netDelta: net,
        total,
        edShare: total > 0 ? (r.sen.byMode.ed.total / total) * 100 : 0,
        evShare: total > 0 ? (r.sen.byMode.early.total / total) * 100 : 0,
        vbmShare: total > 0 ? (r.sen.byMode.vbm.total / total) * 100 : 0,
        persuasion: sc.persuasion,
        baseTurnout: sc.baseTurnout,
        vbm: sc.vbm,
        overall: sc.overall,
        action: sc.recommendation.primary,
        reasoning: sc.recommendation.reasoning,
      };
    });
  }, [results, scoresById]);

  const filtered: Row[] = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (muniFilter && r.muni !== muniFilter) return false;
      if (actionFilter && r.action !== actionFilter) return false;
      if (r.overall < minPriority) return false;
      if (lower && !r.precinct.toLowerCase().includes(lower) && !r.muni.toLowerCase().includes(lower))
        return false;
      return true;
    });
  }, [rows, muniFilter, actionFilter, minPriority, search]);

  const sorted: Row[] = useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [filtered, sortKey, sortDir]);

  const munis = useMemo(
    () => Array.from(new Set(rows.map((r) => r.muni))).sort(),
    [rows],
  );

  const handleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir(typeof rows[0]?.[k] === "number" ? "desc" : "asc");
    }
  };

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th onClick={() => handleSort(k)} title="Click to sort">
      {label}
      {sortKey === k ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );

  // Visible columns based on UI mode
  const expert = uiMode === "expert";

  return (
    <section className="panel">
      <h2>Ranked Precincts ({sorted.length} of {rows.length})</h2>
      <div className="table-filters">
        <input
          type="text"
          placeholder="Search precinct / muni…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search"
        />
        <select
          value={muniFilter}
          onChange={(e) => setMuniFilter(e.target.value)}
          aria-label="Filter by municipality"
        >
          <option value="">All municipalities</option>
          {munis.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as ActionTag | "")}
          aria-label="Filter by recommended action"
        >
          <option value="">All actions</option>
          {(Object.keys(ACTION_LABELS) as ActionTag[]).map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]}
            </option>
          ))}
        </select>
        <label className="muted tiny">
          Min priority {minPriority}
          <input
            type="range"
            min={0}
            max={100}
            value={minPriority}
            onChange={(e) => setMinPriority(+e.target.value)}
            style={{ width: 120, marginLeft: 8, verticalAlign: "middle" }}
          />
        </label>
        {(muniFilter || actionFilter || minPriority > 0 || search) && (
          <button
            onClick={() => {
              setMuniFilter("");
              setActionFilter("");
              setMinPriority(0);
              setSearch("");
            }}
            style={{ background: "transparent", color: "var(--accent)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 5, fontSize: 12, cursor: "pointer" }}
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="precinct-table-wrap">
        <table className="precinct-table">
          <thead>
            <tr>
              <Th k="precinct" label="Precinct" />
              <Th k="muni" label="Muni" />
              <Th k="baseMargin" label="Base mg" />
              <Th k="scenMargin" label="Scen mg" />
              <Th k="netDelta" label="Net Δ" />
              <Th k="total" label="Votes" />
              {expert && <Th k="edShare" label="ED %" />}
              {expert && <Th k="evShare" label="EV %" />}
              {expert && <Th k="vbmShare" label="VBM %" />}
              {expert && <Th k="persuasion" label="Persuade" />}
              {expert && <Th k="baseTurnout" label="Base TO" />}
              {expert && <Th k="vbm" label="VBM pri" />}
              <Th k="overall" label="Priority" />
              <Th k="action" label="Action" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.precinct}
                className={selectedPrecinct === r.precinct ? "selected" : ""}
                onClick={() => onSelectPrecinct(selectedPrecinct === r.precinct ? undefined : r.precinct)}
                title={r.reasoning.join(" · ")}
              >
                <td>{r.precinct}</td>
                <td>{r.muni}</td>
                <td className={`num ${r.baseMargin >= 0 ? "pos" : "neg"}`}>{pct(r.baseMargin)}</td>
                <td className={`num ${r.scenMargin >= 0 ? "pos" : "neg"}`}>{pct(r.scenMargin)}</td>
                <td className={`num ${r.netDelta >= 0 ? "pos" : "neg"}`}>
                  {r.netDelta >= 0 ? "+" : ""}
                  {fmt(r.netDelta)}
                </td>
                <td className="num">{fmt(r.total)}</td>
                {expert && <td className="num">{r.edShare.toFixed(0)}%</td>}
                {expert && <td className="num">{r.evShare.toFixed(0)}%</td>}
                {expert && <td className="num">{r.vbmShare.toFixed(0)}%</td>}
                {expert && (
                  <td className="num">
                    <span className="priority-cell" style={{ background: priorityColor(r.persuasion) }}>
                      {r.persuasion}
                    </span>
                  </td>
                )}
                {expert && (
                  <td className="num">
                    <span className="priority-cell" style={{ background: priorityColor(r.baseTurnout) }}>
                      {r.baseTurnout}
                    </span>
                  </td>
                )}
                {expert && (
                  <td className="num">
                    <span className="priority-cell" style={{ background: priorityColor(r.vbm) }}>
                      {r.vbm}
                    </span>
                  </td>
                )}
                <td className="num">
                  <span className="priority-cell" style={{ background: priorityColor(r.overall) }}>
                    {r.overall}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "1px 6px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 600,
                      background: ACTION_COLORS[r.action] + "33",
                      color: ACTION_COLORS[r.action],
                      border: `1px solid ${ACTION_COLORS[r.action]}66`,
                    }}
                  >
                    {ACTION_LABELS[r.action]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

void ({} as ScoringContext); // type-only import reference

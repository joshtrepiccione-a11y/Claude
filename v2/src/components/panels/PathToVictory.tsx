import { useMemo, useState } from "react";
import type {
  Candidates,
  PrecinctCollection,
  PrecinctResult,
  ScenarioState,
} from "../../data/types";
import { findPathToVictory } from "../../model/pathToVictory";

type Props = {
  fc: PrecinctCollection;
  results: PrecinctResult[];
  scenario: ScenarioState;
  baselineDefaults: ScenarioState;
  munis: string[];
  candidates: Candidates;
};

type Perspective = "auto" | "D" | "R";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function PathToVictory({
  fc,
  results,
  scenario,
  baselineDefaults,
  munis,
}: Props) {
  const [perspective, setPerspective] = useState<Perspective>("auto");

  // Compute current Senate margin
  const senD = results.reduce((a, r) => a + r.sen.total.d, 0);
  const senR = results.reduce((a, r) => a + r.sen.total.r, 0);
  const leadingSide: "D" | "R" | "tie" =
    Math.abs(senD - senR) < 0.5 ? "tie" : senD > senR ? "D" : "R";

  const pathSide: "D" | "R" | undefined =
    perspective === "auto"
      ? leadingSide === "D"
        ? "R"
        : leadingSide === "R"
        ? "D"
        : undefined
      : perspective;

  const result = useMemo(() => {
    return findPathToVictory(
      { fc, current: results, state: scenario, baselineDefaults, munis },
      { forceDirection: pathSide, topN: 8 },
    );
  }, [fc, results, scenario, baselineDefaults, munis, pathSide]);

  const isHoldingLead =
    (perspective === "auto" && leadingSide !== "tie" && pathSide !== leadingSide) ||
    (perspective !== "auto" && perspective === leadingSide);

  // Cumulative running total
  let running = 0;
  const enriched = result.interventions.map((iv, i) => {
    running += iv.netVotes;
    const reachesTarget = running >= result.deficit;
    return { ...iv, rank: i + 1, runningTotal: running, reachesTarget };
  });

  const headerTitle = isHoldingLead
    ? `Path to Holding the Lead (${result.trailingSide === "D" ? "R" : "D"})`
    : `Path to Victory (${result.trailingSide})`;

  const dotChar = (n: number) =>
    "●".repeat(n) + "○".repeat(5 - n);

  return (
    <section className="panel">
      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap" }}>
        <h2 style={{ flex: 1 }}>{headerTitle}</h2>
        <div className="path-perspective-toggle" role="tablist" aria-label="Path perspective">
          <button
            className={perspective === "auto" ? "active" : ""}
            onClick={() => setPerspective("auto")}
          >
            Auto (trailing)
          </button>
          <button
            className={perspective === "D" ? "active" : ""}
            onClick={() => setPerspective("D")}
          >
            D path
          </button>
          <button
            className={perspective === "R" ? "active" : ""}
            onClick={() => setPerspective("R")}
          >
            R path
          </button>
        </div>
      </div>
      <p className="muted tiny">
        {leadingSide === "tie"
          ? "Race is currently tied."
          : `${leadingSide} leads by ${fmt(Math.abs(senD - senR))} votes.`}{" "}
        Standardized +3 pt swing per (muni × mode), ranked by net-vote payoff
        toward the focused side. Plausibility (dots) is heuristic — based on
        muni vote volume, current competitiveness, and mode prominence.
      </p>
      {enriched.length === 0 ? (
        <p className="muted">No helpful interventions found.</p>
      ) : (
        <ol className="path-list">
          {enriched.map((iv) => (
            <li key={iv.id} className="path-row">
              <div className="rank">{iv.rank}</div>
              <div className="desc">
                {iv.description}
                <div className="muted tiny" style={{ marginTop: 2 }}>
                  Running total:{" "}
                  <strong style={{ color: iv.reachesTarget ? "#6ee787" : "var(--text)" }}>
                    {fmt(iv.runningTotal)} votes
                  </strong>
                  {iv.reachesTarget && pathSide && !isHoldingLead
                    ? " — enough to flip the race"
                    : ""}
                </div>
              </div>
              <div className="net pos">+{fmt(iv.netVotes)}</div>
              <div className="plaus" title={`Plausibility: ${iv.plausibility}/5`}>
                {dotChar(iv.plausibility)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

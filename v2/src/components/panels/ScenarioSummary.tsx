import type {
  Candidates,
  PrecinctResult,
  RaceKey,
  ViewKey,
} from "../../data/types";
import { rateRace } from "../../model/dataConfidence";
import type { ScorePrecinct } from "./PrecinctTable";

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

/**
 * Most-sensitive vote-mode finder: which mode's +1pt swing produces
 * the largest change in margin? Approximated from existing baseline
 * vs. scenario data (the swing slider already moved each mode by a
 * known amount; we use that to derive sensitivity).
 *
 * Falls back to "ED" when no signal.
 */
function mostSensitiveMode(results: PrecinctResult[]): {
  mode: "Election Day" | "Early Vote" | "Vote by Mail";
  perPtVotes: number;
} {
  // Approximate sensitivity by reading mode volumes; bigger volume =
  // bigger absolute net-vote effect per point of swing.
  let ed = 0,
    ev = 0,
    vbm = 0;
  for (const r of results) {
    ed += r.sen.byMode.ed.total;
    ev += r.sen.byMode.early.total;
    vbm += r.sen.byMode.vbm.total;
  }
  // A +1pt swing in mode M moves (M_total / 100) votes (half each way
  // in shiftShares = ~M_total / 50). Use that as the votes-per-pt.
  const candidates = [
    { mode: "Election Day" as const, perPtVotes: ed / 50 },
    { mode: "Early Vote" as const, perPtVotes: ev / 50 },
    { mode: "Vote by Mail" as const, perPtVotes: vbm / 50 },
  ];
  candidates.sort((a, b) => b.perPtVotes - a.perPtVotes);
  return candidates[0];
}

export function ScenarioSummary({
  results,
  raceFocus,
  candidates,
  view,
}: Props) {
  if (results.length === 0) return null;

  // Aggregate
  let sD = 0, sR = 0, sT = 0;
  let bD = 0, bR = 0, bT = 0;
  for (const r of results) {
    sD += r.sen.total.d;
    sR += r.sen.total.r;
    sT += r.sen.total.total;
    bD += r.sen.baselineTotal.d;
    bR += r.sen.baselineTotal.r;
    bT += r.sen.baselineTotal.total;
  }
  // Assembly aggregate
  let aD = 0, aR = 0, aT = 0;
  let abD = 0, abR = 0, abT = 0;
  for (const r of results) {
    aD += r.asm.total.d_total;
    aR += r.asm.total.r_total;
    aT += r.asm.total.total;
    abD += r.asm.baselineTotal.d_total;
    abR += r.asm.baselineTotal.r_total;
    abT += r.asm.baselineTotal.total;
  }

  const isSen = raceFocus === "sen";
  const scenD = isSen ? sD : aD;
  const scenR = isSen ? sR : aR;
  const baseD = isSen ? bD : abD;
  const baseR = isSen ? bR : abR;
  const scenT = isSen ? sT : aT;
  const baseT = isSen ? bT : abT;
  const scenMarg = scenT > 0 ? ((scenD - scenR) / scenT) * 100 : 0;
  const baseMarg = baseT > 0 ? ((baseD - baseR) / baseT) * 100 : 0;
  const voteMarg = Math.abs(scenD - scenR);
  const voteDelta = (scenD - scenR) - (baseD - baseR);
  const rating = rateRace(scenMarg, baseMarg);
  const winner: "D" | "R" | "tie" =
    scenMarg > 0.05 ? "D" : scenMarg < -0.05 ? "R" : "tie";
  const winnerName = isSen
    ? winner === "D"
      ? candidates.sen_d
      : winner === "R"
      ? candidates.sen_r
      : "tied"
    : winner === "D"
    ? "the Democratic ticket"
    : winner === "R"
    ? "the Republican ticket"
    : "the parties (split / tied)";
  const raceName = isSen ? "State Senate" : "General Assembly";

  // Top 3 munis by absolute net-vote change.
  const muniDelta = new Map<string, number>();
  for (const r of results) {
    const m = r.feature.properties.municipality;
    const delta =
      r.sen.total.d - r.sen.baselineTotal.d - (r.sen.total.r - r.sen.baselineTotal.r);
    muniDelta.set(m, (muniDelta.get(m) ?? 0) + delta);
  }
  const topMunis = Array.from(muniDelta.entries())
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([name, d]) => `${name} (${d >= 0 ? "+" : ""}${fmt(d)} D)`);

  const sens = mostSensitiveMode(results);

  // Takeaway sentence: side-aware
  let takeaway: string;
  if (view === "baseline") {
    takeaway =
      "This is the projected baseline — no scenario adjustments applied. Toggle to Scenario to model interventions.";
  } else if (rating === "Flipped") {
    takeaway = `Scenario flips the result from the baseline. Validate the underlying assumptions are realistic before treating this as a target.`;
  } else if (rating === "Toss-up") {
    takeaway = `Within statistical noise. Both sides have a plausible path; small shifts (~1 pt) in ${sens.mode} can change the outcome.`;
  } else if (winner === "D") {
    takeaway = `D-side strategy: lock in the lead by holding margins in the top 3 munis above. R-side strategy: focus persuasion + ${sens.mode} turnout in those same areas to compress the gap.`;
  } else if (winner === "R") {
    takeaway = `R-side strategy: hold the lead in the largest-volume munis. D-side strategy: invest in ${sens.mode} performance and persuasion in the top municipalities listed above.`;
  } else {
    takeaway = `Result is exactly tied in this scenario — strategic interventions are highest-leverage right now.`;
  }

  return (
    <section className="panel scenario-summary">
      <h2>What This Means</h2>
      <div className="summary-body">
        <p>
          Under this scenario, <strong>{winnerName}</strong>{" "}
          {winner === "tie"
            ? "ties"
            : `wins the ${raceName} race`}{" "}
          by{" "}
          <strong>
            {fmt(voteMarg)} votes ({scenMarg >= 0 ? "+" : ""}
            {scenMarg.toFixed(1)}%)
          </strong>
          . That's a{" "}
          <strong>
            {voteDelta >= 0 ? "+" : ""}
            {fmt(voteDelta)}-vote change vs baseline
          </strong>
          , rating the race <strong>{rating}</strong>.
        </p>
        <p>
          The biggest net-vote movement comes from <strong>{topMunis.join(", ")}</strong>.
          The scenario is most sensitive to <strong>{sens.mode}</strong> —
          a 1-point swing there moves the margin by{" "}
          <strong>~{fmt(sens.perPtVotes)} votes</strong>.
        </p>
        <p>
          <strong>Takeaway:</strong> {takeaway}
        </p>
      </div>
      <div className="source-line">
        <span className="badge calibrated">Calibrated</span>{" "}
        district aggregates from 2023 Senate &amp; 2025 Assembly · per-precinct
        distribution interpolated from 2024 presidential · mode breakdowns modeled.
      </div>
    </section>
  );
}

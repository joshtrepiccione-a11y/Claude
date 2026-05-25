// Strategic Priority Scoring — transparent, documented formula.
//
// All scores are 0-100. Inputs that depend on missing data degrade
// gracefully: their weight is redistributed across remaining inputs
// and the score's confidence indicator shrinks.
//
// NOTE: voter-file and demographic-derived inputs (turnout_gap,
// registration_advantage, overperformance_residual) are Phase 2.
// v2.0 ships with these signals absent; the score-formula degrades
// gracefully without them.

import type {
  ActionTag,
  PrecinctResult,
  PrecinctScore,
  Recommendation,
} from "../data/types";
import { marginPct } from "./scenario";

export type ScoringContext = {
  /** Maximum total Senate-mode votes seen across the district. Used
   * for volume normalization. */
  maxTotalVotes: number;
  /** Median total votes per precinct (for "above median" rules). */
  medianTotalVotes: number;
  /** District-wide projected margin pct (signed). */
  districtMargin: number;
};

/** Min-max normalization to 0..1, clamped. */
function norm(v: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

/** Competitiveness peaks at |margin| = 0 and falls off by 25 pts. */
function competitiveness(marginAbs: number): number {
  return Math.max(0, 1 - marginAbs / 25);
}

/**
 * Persuasion priority: where moving voters matters most.
 *
 * Weights:
 *  0.50 margin competitiveness (closer = higher)
 *  0.30 vote volume (normalized)
 *  0.20 mode swing potential (sum of |swing| caps across modes)
 */
function persuasionScore(p: PrecinctResult, ctx: ScoringContext): number {
  const m = marginPct(p.sen.total);
  const comp = competitiveness(Math.abs(m));
  const volume = norm(p.sen.total.total, 0, ctx.maxTotalVotes);
  // Modeled swing potential: how much can margin move given the data?
  // Proxy: the spread between baseline and scenario margin, normalized.
  const swing = Math.abs(
    marginPct(p.sen.total) - marginPct(p.sen.baselineTotal),
  );
  const swingNorm = norm(swing, 0, 15);
  const raw = 0.5 * comp + 0.3 * volume + 0.2 * swingNorm;
  return Math.round(raw * 100);
}

/**
 * Base turnout priority: where mobilizing existing leans matters most.
 *
 * Weights:
 *  0.50 own-side margin strength (further from 0, same direction as district lean)
 *  0.30 vote volume
 *  0.20 mode concentration (if VBM or EV is dominant, turnout
 *       interventions are higher-leverage in those channels)
 */
function baseTurnoutScore(p: PrecinctResult, ctx: ScoringContext): number {
  const m = marginPct(p.sen.total);
  // Strong margin in either direction = high base potential.
  const strength = Math.min(1, Math.abs(m) / 30);
  const volume = norm(p.sen.total.total, 0, ctx.maxTotalVotes);
  // Mode concentration: Herfindahl across ED/EV/VBM.
  const shares = ["ed", "early", "vbm"].map((k) => {
    const total = p.sen.total.total || 1;
    return (p.sen.byMode[k as "ed"].total || 0) / total;
  });
  const hhi = shares.reduce((a, s) => a + s * s, 0);
  const conc = Math.max(0, (hhi - 0.34) / 0.66); // 0.34 = perfectly even
  const raw = 0.5 * strength + 0.3 * volume + 0.2 * conc;
  return Math.round(raw * 100);
}

/**
 * VBM priority: where VBM channel is high-leverage.
 *
 * Weights:
 *  0.50 VBM share of mode mix
 *  0.30 VBM D-lean (or R-lean) absolute magnitude
 *  0.20 vote volume
 */
function vbmScore(p: PrecinctResult, ctx: ScoringContext): number {
  const total = p.sen.total.total || 1;
  const vbm = p.sen.byMode.vbm.total / total;
  const vbmShare = norm(vbm, 0.1, 0.5);
  const vbmMarg = marginPct(p.sen.byMode.vbm);
  const vbmLean = Math.min(1, Math.abs(vbmMarg) / 30);
  const volume = norm(p.sen.total.total, 0, ctx.maxTotalVotes);
  const raw = 0.5 * vbmShare + 0.3 * vbmLean + 0.2 * volume;
  return Math.round(raw * 100);
}

/**
 * Overall strategic priority: the layer most users should see by
 * default in Candidate Mode. Blends the sub-scores plus a "net vote
 * opportunity" term derived from the scenario delta.
 */
function overallScore(
  sub: { persuasion: number; baseTurnout: number; vbm: number },
  p: PrecinctResult,
  ctx: ScoringContext,
): number {
  const netDelta = Math.abs(
    p.sen.total.d - p.sen.baselineTotal.d - (p.sen.total.r - p.sen.baselineTotal.r),
  );
  const netNorm = norm(netDelta, 0, 200);
  const subMax = Math.max(sub.persuasion, sub.baseTurnout, sub.vbm) / 100;
  const volume = norm(p.sen.total.total, 0, ctx.maxTotalVotes);
  const raw = 0.4 * netNorm + 0.3 * subMax + 0.3 * volume;
  void ctx.districtMargin; // currently unused; reserved for trend signal
  return Math.round(raw * 100);
}

/**
 * Rules-based recommendation engine. Each rule is independent and
 * traceable; the highest-priority rule fires. Reasoning is included
 * for tooltip display.
 */
function recommend(
  p: PrecinctResult,
  scores: { persuasion: number; baseTurnout: number; vbm: number },
  ctx: ScoringContext,
): Recommendation {
  const m = marginPct(p.sen.total);
  const baseMarg = marginPct(p.sen.baselineTotal);
  const netD = p.sen.total.d - p.sen.baselineTotal.d;
  const total = p.sen.total.total;
  const lean: Recommendation["leaningParty"] =
    Math.abs(m) < 3 ? "competitive" : m > 0 ? "D" : "R";

  // Tiny / settled precinct
  if (total < 100 && Math.abs(m) > 20) {
    return {
      primary: "monitor_only",
      reasoning: [`Small precinct (${Math.round(total)} votes)`, "settled margin"],
      confidence: 3,
      leaningParty: lean,
    };
  }
  if (Math.abs(m) > 30 && total < ctx.medianTotalVotes * 0.6) {
    return {
      primary: "low_priority",
      reasoning: ["Far from competitive", "below-median volume"],
      confidence: 3,
      leaningParty: lean,
    };
  }

  // Persuasion: narrow margin, decent volume
  if (Math.abs(m) <= 5 && total > ctx.medianTotalVotes * 0.7) {
    return {
      primary: "persuasion_mail",
      reasoning: [
        `Narrow margin (${m >= 0 ? "+" : ""}${m.toFixed(1)}%)`,
        "above-median vote volume",
        "high persuasion ROI",
      ],
      confidence: 3,
      leaningParty: lean,
    };
  }

  // VBM chase: high VBM share + favorable VBM lean
  const vbmShare = total > 0 ? p.sen.byMode.vbm.total / total : 0;
  const vbmMarg = marginPct(p.sen.byMode.vbm);
  if (vbmShare > 0.28 && scores.vbm > 60) {
    return {
      primary: "vbm_chase",
      reasoning: [
        `VBM is ${(vbmShare * 100).toFixed(0)}% of turnout`,
        `${vbmMarg >= 0 ? "D" : "R"}-leaning VBM (${vbmMarg >= 0 ? "+" : ""}${vbmMarg.toFixed(1)}%)`,
        "high VBM priority score",
      ],
      confidence: 2,
      leaningParty: lean,
    };
  }

  // Defensive hold: leading side losing ground in scenario
  if (Math.abs(baseMarg) > 3 && Math.sign(m) === Math.sign(baseMarg)) {
    const erosion = Math.abs(baseMarg) - Math.abs(m);
    if (erosion > 2 && total > ctx.medianTotalVotes) {
      return {
        primary: "defensive_hold",
        reasoning: [
          `${baseMarg > 0 ? "D" : "R"}-leaning baseline (${baseMarg >= 0 ? "+" : ""}${baseMarg.toFixed(1)}%)`,
          `scenario erodes margin by ${erosion.toFixed(1)} pts`,
          "above-median vote volume",
        ],
        confidence: 2,
        leaningParty: lean,
      };
    }
  }

  // Base turnout: strong margin + meaningful volume
  if (scores.baseTurnout > 55 && Math.abs(m) > 8) {
    return {
      primary: "base_turnout",
      reasoning: [
        `${m > 0 ? "D" : "R"}-leaning by ${Math.abs(m).toFixed(1)} pts`,
        "favorable base turnout score",
      ],
      confidence: 2,
      leaningParty: lean,
    };
  }

  // Net-D shift large => digital ad spend follows
  if (Math.abs(netD) > 60) {
    return {
      primary: "digital_ad",
      reasoning: [
        `Net ${netD >= 0 ? "D" : "R"} shift of ${Math.abs(Math.round(netD))} votes`,
        "high modeled responsiveness",
      ],
      confidence: 2,
      leaningParty: lean,
    };
  }

  return {
    primary: "monitor_only" as ActionTag,
    reasoning: ["No rule fires strongly"],
    confidence: 1,
    leaningParty: lean,
  };
}

export function scorePrecinct(
  p: PrecinctResult,
  ctx: ScoringContext,
): PrecinctScore {
  const persuasion = persuasionScore(p, ctx);
  const baseTurnout = baseTurnoutScore(p, ctx);
  const vbm = vbmScore(p, ctx);
  const overall = overallScore({ persuasion, baseTurnout, vbm }, p, ctx);
  const recommendation = recommend(p, { persuasion, baseTurnout, vbm }, ctx);
  return { persuasion, baseTurnout, vbm, overall, recommendation };
}

export function makeContext(results: PrecinctResult[]): ScoringContext {
  const totals = results.map((r) => r.sen.total.total).sort((a, b) => a - b);
  const maxTotalVotes = totals.length ? totals[totals.length - 1] : 1;
  const medianTotalVotes =
    totals.length === 0
      ? 0
      : totals.length % 2
      ? totals[(totals.length - 1) / 2]
      : (totals[totals.length / 2 - 1] + totals[totals.length / 2]) / 2;
  const sumD = results.reduce((a, r) => a + r.sen.total.d, 0);
  const sumR = results.reduce((a, r) => a + r.sen.total.r, 0);
  const sumT = results.reduce((a, r) => a + r.sen.total.total, 0);
  const districtMargin = sumT > 0 ? ((sumD - sumR) / sumT) * 100 : 0;
  return { maxTotalVotes, medianTotalVotes, districtMargin };
}

export const ACTION_LABELS: Record<ActionTag, string> = {
  vbm_chase: "VBM Chase",
  ev_push: "Early Vote Push",
  ed_turnout: "Election Day Turnout",
  persuasion_mail: "Persuasion",
  door_knock: "Door Knock",
  candidate_visit: "Candidate Visit",
  digital_ad: "Digital / Geofence",
  base_turnout: "Base Turnout",
  defensive_hold: "Defensive Hold",
  low_priority: "Low Priority",
  monitor_only: "Monitor Only",
};

// Used by the badge primitive to color recommended actions categorically.
export const ACTION_COLORS: Record<ActionTag, string> = {
  vbm_chase: "#6eddd0",
  ev_push: "#8fb8ff",
  ed_turnout: "#f6c177",
  persuasion_mail: "#c2a3ff",
  door_knock: "#9fe27a",
  candidate_visit: "#f78fb3",
  digital_ad: "#7ad6e0",
  base_turnout: "#a9d186",
  defensive_hold: "#e0a878",
  low_priority: "#6b7280",
  monitor_only: "#4b5563",
};

// Used for short, sortable enum labels in the precinct table.
export function actionShortLabel(a: ActionTag): string {
  return ACTION_LABELS[a];
}

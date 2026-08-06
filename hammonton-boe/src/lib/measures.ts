// The Pullia lens: every measure the app displays, derived from certified
// figures only. No swings, no projections, no interpolation — each function
// here is arithmetic over numbers the county published.
//
// Where the county did not publish something (2023 vote modes, for instance),
// the measure reports itself UNAVAILABLE with a reason rather than guessing.
// Callers render the reason; they never substitute a number.

import type {
  BoeData,
  Mode,
  ModeCounts,
  PrecinctFeature,
  YearTownwide,
} from "./data/types";
import { MODES } from "./data/types";
import { candidateColors, isNonCandidate } from "./data/palette";

export interface Unavailable {
  available: false;
  reason: string;
}

export type Measure<T> = ({ available: true } & T) | Unavailable;

const zeroModes = (): ModeCounts => ({
  election_day: 0,
  early: 0,
  vbm: 0,
  provisional: 0,
});

function sumModes(m: ModeCounts): number {
  return MODES.reduce((a, k) => a + (m[k] || 0), 0);
}

/** Fraction of a mode bundle that each mode accounts for. */
export function modeMix(m: ModeCounts): ModeCounts {
  const t = sumModes(m);
  const out = zeroModes();
  if (t <= 0) return out;
  for (const k of MODES) out[k] = (m[k] || 0) / t;
  return out;
}

// ── Town-wide, one year ──────────────────────────────────────────────

export interface FocusYear {
  year: string;
  votes: number;
  modes: ModeCounts;
  /** Share of all votes cast in the contest. */
  share: number;
  /** Votes ÷ ballots cast, when the county published a ballot count. */
  supportRate: number | null;
  rank: number | null;
  elected: boolean;
  seatsUp: number;
  contestVotes: number;
  ballotsCast: number | null;
  /** The candidate's own mode mix, and the whole field's, for comparison. */
  mix: ModeCounts;
  fieldMix: ModeCounts;
  /** mix − fieldMix, in points. Positive = over-indexes on that mode. */
  lean: ModeCounts;
  modeCoverage: YearTownwide["modeCoverage"];
}

export function focusYear(
  data: BoeData,
  year: string,
  focus: string,
): FocusYear | null {
  const tw = data.meta.townwide[year];
  if (!tw) return null;
  const me = tw.candidates.find((c) => c.name === focus);
  if (!me) return null;
  const mix = modeMix(me.modes);
  const fieldMix = modeMix(tw.fieldModes);
  const lean = zeroModes();
  for (const k of MODES) lean[k] = mix[k] - fieldMix[k];
  return {
    year,
    votes: me.votes,
    modes: me.modes,
    share: me.share,
    supportRate: tw.ballotsCast ? me.votes / tw.ballotsCast : null,
    rank: me.rank,
    elected: me.elected,
    seatsUp: tw.seatsUp,
    contestVotes: tw.contestVotes,
    ballotsCast: tw.ballotsCast,
    mix,
    fieldMix,
    lean,
    modeCoverage: tw.modeCoverage,
  };
}

// ── The turnaround: first year → last year ───────────────────────────

export interface ModeContribution {
  mode: Mode;
  from: number;
  to: number;
  delta: number;
  /** Share of the net gain this mode accounts for (signed gains only). */
  shareOfGain: number;
}

export interface Turnaround {
  from: FocusYear;
  to: FocusYear;
  deltaVotes: number;
  deltaShare: number;
  deltaSupportRate: number | null;
  deltaRank: number | null;
  electedChanged: boolean;
  /** "How the win was built" — only when BOTH years published mode splits. */
  contribution: Measure<{ parts: ModeContribution[]; netGain: number }>;
}

export function turnaround(
  data: BoeData,
  focus: string,
  fromYear: string,
  toYear: string,
): Turnaround | null {
  const a = focusYear(data, fromYear, focus);
  const b = focusYear(data, toYear, focus);
  if (!a || !b) return null;

  const netGain = b.votes - a.votes;
  let contribution: Turnaround["contribution"];
  const missing = [a, b].filter((y) => y.modeCoverage === "none");
  if (missing.length > 0) {
    contribution = {
      available: false,
      reason:
        `The county published no vote-mode split for ` +
        `${missing.map((y) => y.year).join(" or ")}, so the ` +
        `${netGain >= 0 ? "gain" : "change"} of ` +
        `${Math.abs(netGain).toLocaleString()} votes cannot be attributed to ` +
        `Election Day, Early Voting or Vote by Mail. Attributing it would ` +
        `require estimating figures the county never certified.`,
    };
  } else {
    const parts: ModeContribution[] = MODES.map((m) => ({
      mode: m,
      from: a.modes[m] || 0,
      to: b.modes[m] || 0,
      delta: (b.modes[m] || 0) - (a.modes[m] || 0),
      shareOfGain: 0,
    }));
    const gross = parts.reduce((s, p) => s + Math.abs(p.delta), 0);
    for (const p of parts) p.shareOfGain = gross > 0 ? p.delta / gross : 0;
    contribution = { available: true, parts, netGain };
  }

  return {
    from: a,
    to: b,
    deltaVotes: netGain,
    deltaShare: b.share - a.share,
    deltaSupportRate:
      a.supportRate !== null && b.supportRate !== null
        ? b.supportRate - a.supportRate
        : null,
    deltaRank: a.rank !== null && b.rank !== null ? a.rank - b.rank : null,
    electedChanged: a.elected !== b.elected,
    contribution,
  };
}

// ── Per precinct ─────────────────────────────────────────────────────

export interface PrecinctMeasure {
  precinct: string;
  districtLabel: string;
  district: number;
  fromVotes: number;
  toVotes: number;
  deltaVotes: number;
  fromShare: number;
  toShare: number;
  deltaShare: number;
  fromSupport: number | null;
  toSupport: number | null;
  deltaSupport: number | null;
  fromRank: number | null;
  toRank: number | null;
  fromWinner: string | null;
  toWinner: string | null;
  /** Trailed the precinct in the first year, led it in the last. */
  flipped: boolean;
  fromModes: ModeCounts;
  toModes: ModeCounts;
  fromContest: number;
  toContest: number;
  fromBallots: number | null;
  toBallots: number | null;
}

function rankIn(
  feature: PrecinctFeature,
  year: string,
  focus: string,
): number | null {
  const y = feature.properties.years[year];
  if (!y) return null;
  const entries = Object.entries(y.candidates).filter(
    ([n]) => !isNonCandidate(n),
  );
  if (entries.length === 0) return null;
  entries.sort((p, q) => q[1].votes - p[1].votes);
  const i = entries.findIndex(([n]) => n === focus);
  return i < 0 ? null : i + 1;
}

export function precinctMeasures(
  data: BoeData,
  focus: string,
  fromYear: string,
  toYear: string,
): PrecinctMeasure[] {
  return data.features.map((f) => {
    const p = f.properties;
    const ya = p.years[fromYear];
    const yb = p.years[toYear];
    const ca = ya?.candidates[focus];
    const cb = yb?.candidates[focus];
    const fromRank = rankIn(f, fromYear, focus);
    const toRank = rankIn(f, toYear, focus);
    const fromSupport = ca?.supportRate ?? null;
    const toSupport = cb?.supportRate ?? null;
    return {
      precinct: p.precinct,
      districtLabel: p.districtLabel,
      district: p.district,
      fromVotes: ca?.votes ?? 0,
      toVotes: cb?.votes ?? 0,
      deltaVotes: (cb?.votes ?? 0) - (ca?.votes ?? 0),
      fromShare: ca?.share ?? 0,
      toShare: cb?.share ?? 0,
      deltaShare: (cb?.share ?? 0) - (ca?.share ?? 0),
      fromSupport,
      toSupport,
      deltaSupport:
        fromSupport !== null && toSupport !== null
          ? toSupport - fromSupport
          : null,
      fromRank,
      toRank,
      fromWinner: ya?.winner ?? null,
      toWinner: yb?.winner ?? null,
      // Outright lead in the later year only — a tie is not "coming to lead".
      flipped: ya?.winner !== focus && yb?.winner === focus && !yb?.tied,
      fromModes: ca?.modes ?? zeroModes(),
      toModes: cb?.modes ?? zeroModes(),
      fromContest: ya?.contestVotes ?? 0,
      toContest: yb?.contestVotes ?? 0,
      fromBallots: ya?.ballotsCast ?? null,
      toBallots: yb?.ballotsCast ?? null,
    };
  });
}

/** One year's per-precinct figures for the focus candidate, in a given mode. */
export function precinctValue(
  f: PrecinctFeature,
  year: string,
  focus: string,
  mode: Mode | "all",
): { votes: number; share: number; supportRate: number | null } | null {
  const y = f.properties.years[year];
  const c = y?.candidates[focus];
  if (!y || !c) return null;
  if (mode === "all") {
    return { votes: c.votes, share: c.share, supportRate: c.supportRate };
  }
  const votes = c.modes[mode] || 0;
  // Denominators must match the numerator's mode, so a share is only
  // meaningful when the whole field is broken out the same way.
  const fieldInMode = Object.values(y.candidates).reduce(
    (s, cc) => s + (cc.modes[mode] || 0),
    0,
  );
  return {
    votes,
    share: fieldInMode > 0 ? votes / fieldInMode : 0,
    supportRate: null,
  };
}

/** Which modes actually carry data for a year, so controls can disable the rest. */
export function availableModes(data: BoeData, year: string): Mode[] {
  const tw = data.meta.townwide[year];
  if (!tw) return [];
  return MODES.filter((m) => (tw.fieldModes[m] || 0) > 0);
}

/** True when a per-precinct mode breakdown exists (not just town-wide buckets). */
export function hasPrecinctModes(data: BoeData, year: string): boolean {
  return data.features.some((f) => {
    const y = f.properties.years[year];
    if (!y) return false;
    return Object.values(y.candidates).some((c) =>
      MODES.some((m) => (c.modes[m] || 0) > 0),
    );
  });
}

/** Candidates who placed first in at least one precinct that year. */
export function precinctWinners(data: BoeData, year: string): string[] {
  const seen = new Set<string>();
  for (const f of data.features) {
    for (const w of f.properties.years[year]?.winners ?? []) seen.add(w);
  }
  return Array.from(seen);
}

/**
 * The one place colors are derived. Every view calls this, so a candidate wears
 * the same color in the tables, the bars, the drawer and the map.
 */
export function colorsForYear(
  data: BoeData,
  year: string,
  focus: string,
): Record<string, string> {
  return candidateColors(
    data.meta.candidatesByYear[year] ?? [],
    focus,
    precinctWinners(data, year),
  );
}

// ── Formatting ───────────────────────────────────────────────────────

export const fmtInt = (n: number) =>
  isFinite(n) ? Math.round(n).toLocaleString() : "—";

export const fmtSigned = (n: number) =>
  isFinite(n) ? (n >= 0 ? "+" : "−") + Math.abs(Math.round(n)).toLocaleString() : "—";

export const fmtPct = (v: number | null, digits = 1) =>
  v === null || !isFinite(v) ? "—" : `${(v * 100).toFixed(digits)}%`;

export const fmtPctSigned = (v: number | null, digits = 1) =>
  v === null || !isFinite(v)
    ? "—"
    : `${v >= 0 ? "+" : "−"}${(Math.abs(v) * 100).toFixed(digits)} pts`;

export const ordinal = (n: number | null) => {
  if (n === null || !isFinite(n)) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ONE central map-layer config, consumed by the map controls, the legend and
// the Leaflet layer. Adding a metric here makes it appear everywhere.
//
// Each metric declares how it colors a precinct and what its legend says.
// Metrics that depend on data the county did not publish report themselves
// unavailable through `availableFor` rather than rendering an empty map.

import type { BoeData, Mode, PrecinctFeature } from "./types";
import { MODE_LABEL } from "./types";
import {
  DIV_LEGEND,
  INK,
  SEQ_LEGEND,
  TIED_COLOR,
  diverging,
  sequential,
} from "./palette";
import {
  colorsForYear,
  fmtPct,
  fmtPctSigned,
  hasPrecinctMode,
  precinctValue,
} from "../measures";

export type MetricId =
  | "change"
  | "support"
  | "lean"
  | "winner"
  | "turnout";

export interface LegendItem {
  c: string;
  l: string;
}

export interface MetricContext {
  data: BoeData;
  focus: string;
  year: string;
  compareYear: string;
  mode: Mode | "all";
}

export interface MetricConfig {
  id: MetricId;
  label: string;
  shortLabel: string;
  description: string;
  /** Diverging metrics get a signed legend; sequential a magnitude legend. */
  colorFn: (f: PrecinctFeature, ctx: MetricContext) => string;
  legend: (ctx: MetricContext) => LegendItem[];
  /** Null when usable; a reason string when the data cannot support it. */
  availableFor: (ctx: MetricContext) => string | null;
  /** Value shown in the map tooltip. */
  valueLabel: (f: PrecinctFeature, ctx: MetricContext) => string;
}

/**
 * The two compared years, always earliest → latest, so "change" reads forward
 * in time no matter which year the user has selected for display.
 */
export function chronological(ctx: MetricContext): [string, string] {
  return [ctx.compareYear, ctx.year].sort() as [string, string];
}

/** Share of the contest's votes in a precinct, for the focus candidate. */
function shareOf(f: PrecinctFeature, ctx: MetricContext, year: string): number | null {
  const v = precinctValue(f, year, ctx.focus, ctx.mode);
  return v ? v.share : null;
}

function supportOf(f: PrecinctFeature, ctx: MetricContext, year: string): number | null {
  const y = f.properties.years[year];
  const c = y?.candidates[ctx.focus];
  if (!c) return null;
  if (ctx.mode !== "all") return null;
  return c.supportRate;
}

/**
 * The range a sequential metric actually spans across the mapped districts.
 *
 * A fixed domain (say 0–60% support) puts every Hammonton district in the top
 * two steps of the ramp and the map reads as one flat colour, hiding a real
 * 7-point spread. Scaling to the observed range shows it — but stretching a
 * narrow range across a full ramp can just as easily imply a difference that
 * is not there, so the legend below is labelled with these endpoints rather
 * than a bare "Lower → Higher". The reader sees the span, not just the ramp.
 */
function rangeOf(
  ctx: MetricContext,
  value: (f: PrecinctFeature) => number | null,
): { min: number; max: number } | null {
  const vs = ctx.data.features
    .map(value)
    .filter((v): v is number => v !== null && isFinite(v));
  if (!vs.length) return null;
  return { min: Math.min(...vs), max: Math.max(...vs) };
}

/** Position within the observed range; mid-ramp when every value is equal. */
function within(v: number, r: { min: number; max: number } | null): number {
  if (!r || r.max === r.min) return 0.5;
  return (v - r.min) / (r.max - r.min);
}

const ballotsOf =
  (ctx: MetricContext) =>
  (f: PrecinctFeature): number | null =>
    f.properties.years[ctx.year]?.ballotsCast ?? null;

export const METRICS: MetricConfig[] = [
  {
    id: "change",
    label: "Change between years",
    shortLabel: "Change",
    description:
      "Change in the focus candidate's share of the votes cast in each " +
      "precinct, first year to last. Teal = he gained ground; orange = he lost it.",
    colorFn: (f, ctx) => {
      const [from, to] = chronological(ctx);
      const a = shareOf(f, ctx, from);
      const b = shareOf(f, ctx, to);
      if (a === null || b === null) return INK.noData;
      return diverging(b - a, 0.08);
    },
    legend: () => DIV_LEGEND,
    availableFor: (ctx) => {
      if (ctx.year === ctx.compareYear)
        return "Pick two different years to see the change between them.";
      return modeBlocked(ctx, chronological(ctx));
    },
    valueLabel: (f, ctx) => {
      const [from, to] = chronological(ctx);
      const a = shareOf(f, ctx, from);
      const b = shareOf(f, ctx, to);
      return a === null || b === null ? "—" : fmtPctSigned(b - a);
    },
  },
  {
    id: "support",
    label: "Support rate",
    shortLabel: "Support",
    description:
      "The focus candidate's votes as a share of ballots cast in the precinct " +
      "— the share of voters who chose him.",
    colorFn: (f, ctx) => {
      const v = supportOf(f, ctx, ctx.year);
      if (v === null) return INK.noData;
      return sequential(within(v, rangeOf(ctx, (o) => supportOf(o, ctx, ctx.year))));
    },
    legend: (ctx) => {
      const r = rangeOf(ctx, (f) => supportOf(f, ctx, ctx.year));
      return [
        { c: SEQ_LEGEND[0], l: r ? fmtPct(r.min) : "Lower" },
        { c: SEQ_LEGEND[1], l: "" },
        { c: SEQ_LEGEND[2], l: "" },
        { c: SEQ_LEGEND[3], l: r ? fmtPct(r.max) : "Higher" },
      ];
    },
    availableFor: (ctx) => {
      const tw = ctx.data.meta.townwide[ctx.year];
      if (ctx.mode !== "all")
        return "Support rate compares votes to ballots cast, which the county reports only for all modes combined.";
      if (!tw?.ballotsCast)
        return `The county published no ballot counts for ${ctx.year}, so votes cannot be compared to the number of voters. The Results tab shows share of votes cast instead.`;
      return null;
    },
    valueLabel: (f, ctx) => fmtPct(supportOf(f, ctx, ctx.year)),
  },
  {
    id: "lean",
    label: "Mode lean",
    shortLabel: "Mode lean",
    description:
      "How far the focus candidate's mix of Election Day / Early / Mail votes " +
      "differs from the whole field's in that precinct. Teal = he over-indexes " +
      "on the selected mode; orange = he under-indexes.",
    colorFn: (f, ctx) => {
      const mode = ctx.mode;
      if (mode === "all") return INK.noData;
      const y = f.properties.years[ctx.year];
      const c = y?.candidates[ctx.focus];
      if (!y || !c) return INK.noData;
      const mine = c.votes > 0 ? (c.modes[mode] || 0) / c.votes : 0;
      const fieldTotal = Object.values(y.candidates).reduce(
        (s, cc) => s + cc.votes,
        0,
      );
      const fieldMode = Object.values(y.candidates).reduce(
        (s, cc) => s + (cc.modes[mode] || 0),
        0,
      );
      const field = fieldTotal > 0 ? fieldMode / fieldTotal : 0;
      return diverging(mine - field, 0.1);
    },
    legend: () => DIV_LEGEND,
    availableFor: (ctx) => {
      if (ctx.mode === "all")
        return "Pick a single vote mode to see where the candidate over- or under-indexes on it.";
      // Must test the SELECTED mode: 2021 has per-precinct Election Day data,
      // which would wrongly clear the check for mail or early.
      return modeBlocked(ctx, [ctx.year]);
    },
    valueLabel: (f, ctx) => {
      const mode = ctx.mode;
      const y = f.properties.years[ctx.year];
      const c = y?.candidates[ctx.focus];
      if (!y || !c || mode === "all") return "—";
      const mine = c.votes > 0 ? (c.modes[mode] || 0) / c.votes : 0;
      const fieldTotal = Object.values(y.candidates).reduce((s, cc) => s + cc.votes, 0);
      const fieldMode = Object.values(y.candidates).reduce(
        (s, cc) => s + (cc.modes[mode] || 0),
        0,
      );
      return fmtPctSigned(mine - (fieldTotal > 0 ? fieldMode / fieldTotal : 0));
    },
  },
  {
    id: "winner",
    label: "Precinct winner",
    shortLabel: "Winner",
    description: "Who placed first in each precinct that year.",
    colorFn: (f, ctx) => {
      const y = f.properties.years[ctx.year];
      if (!y) return INK.noData;
      // A tie is a real result with no single winner — it gets its own fill
      // rather than being resolved to one of the tied names.
      if (y.tied) return TIED_COLOR;
      return y.winner ? winnerColorsFor(ctx)[y.winner] ?? INK.noData : INK.noData;
    },
    legend: (ctx) => {
      const colors = winnerColorsFor(ctx);
      const winners = new Set(
        ctx.data.features.flatMap(
          (f) => f.properties.years[ctx.year]?.winners ?? [],
        ),
      );
      const items = (ctx.data.meta.candidatesByYear[ctx.year] ?? [])
        .filter((n) => winners.has(n))
        .map((l) => ({ c: colors[l] ?? INK.noData, l }));
      if (ctx.data.features.some((f) => f.properties.years[ctx.year]?.tied)) {
        items.push({ c: TIED_COLOR, l: "Tied — no single winner" });
      }
      return items;
    },
    availableFor: () => null,
    valueLabel: (f, ctx) => {
      const y = f.properties.years[ctx.year];
      if (!y) return "—";
      return y.tied ? `Tied: ${y.winners.join(" / ")}` : y.winner ?? "—";
    },
  },
  {
    id: "turnout",
    label: "Turnout",
    shortLabel: "Turnout",
    description:
      "Ballots cast in the precinct — context for how much vote each area holds.",
    colorFn: (f, ctx) => {
      const y = f.properties.years[ctx.year];
      if (!y?.ballotsCast) return INK.noData;
      return sequential(within(y.ballotsCast, rangeOf(ctx, ballotsOf(ctx))));
    },
    legend: (ctx) => {
      const r = rangeOf(ctx, ballotsOf(ctx));
      return [
        { c: SEQ_LEGEND[0], l: r ? `${r.min.toLocaleString()} ballots` : "Fewer ballots" },
        { c: SEQ_LEGEND[1], l: "" },
        { c: SEQ_LEGEND[2], l: "" },
        { c: SEQ_LEGEND[3], l: r ? r.max.toLocaleString() : "More" },
      ];
    },
    availableFor: (ctx) =>
      ctx.data.meta.townwide[ctx.year]?.ballotsCast
        ? null
        : `The county published no ballot counts for ${ctx.year}.`,
    valueLabel: (f, ctx) => {
      const b = f.properties.years[ctx.year]?.ballotsCast;
      return b ? b.toLocaleString() : "—";
    },
  },
];

/**
 * Null when the selected mode is usable for every year given, otherwise the
 * reason it is not. A mode the county only ever reported as a town-wide bucket
 * has no per-precinct figures, so mapping it would show zeros that look
 * measured.
 */
function modeBlocked(ctx: MetricContext, years: string[]): string | null {
  if (ctx.mode === "all") return null;
  const missing = years.filter((y) => !hasPrecinctMode(ctx.data, y, ctx.mode as Mode));
  if (missing.length === 0) return null;
  const label = MODE_LABEL[ctx.mode as Mode];
  // "bucket" is only true where the county actually reported separate
  // town-level units; a year that merely publishes a town-wide breakdown has
  // no buckets at all.
  const viaBuckets = missing.some(
    (y) => Object.keys(ctx.data.meta.townwide[y]?.townLevelUnits ?? {}).length > 0,
  );
  return (
    `${missing.join(" and ")} ${label} votes are not reported per district` +
    `${viaBuckets ? " — the county reported them as separate town-wide units" : ""}` +
    `, so this cannot be mapped. Switch to All, or see the Turnaround and ` +
    `Results tabs for the town-wide figures.`
  );
}

function winnerColorsFor(ctx: MetricContext): Record<string, string> {
  return colorsForYear(ctx.data, ctx.year, ctx.focus);
}

export const METRIC_BY_ID = Object.fromEntries(
  METRICS.map((m) => [m.id, m]),
) as Record<MetricId, MetricConfig>;

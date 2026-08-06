// ONE central map-layer config, consumed by the map controls, the legend and
// the Leaflet layer. Adding a metric here makes it appear everywhere.
//
// Each metric declares how it colors a precinct and what its legend says.
// Metrics that depend on data the county did not publish report themselves
// unavailable through `availableFor` rather than rendering an empty map.

import type { BoeData, Mode, PrecinctFeature } from "./types";
import {
  DIV_LEGEND,
  INK,
  SEQ_LEGEND,
  diverging,
  sequential,
} from "./palette";
import { colorsForYear, hasPrecinctModes, precinctValue } from "../measures";

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

const pct = (v: number | null, d = 1) =>
  v === null || !isFinite(v) ? "—" : `${(v * 100).toFixed(d)}%`;
const pctSigned = (v: number | null, d = 1) =>
  v === null || !isFinite(v)
    ? "—"
    : `${v >= 0 ? "+" : "−"}${(Math.abs(v) * 100).toFixed(d)} pts`;

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
    availableFor: (ctx) =>
      ctx.year === ctx.compareYear
        ? "Pick two different years to see the change between them."
        : null,
    valueLabel: (f, ctx) => {
      const [from, to] = chronological(ctx);
      const a = shareOf(f, ctx, from);
      const b = shareOf(f, ctx, to);
      return a === null || b === null ? "—" : pctSigned(b - a);
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
      return sequential(v / 0.6);
    },
    legend: () => [
      { c: SEQ_LEGEND[0], l: "Lower" },
      { c: SEQ_LEGEND[1], l: "" },
      { c: SEQ_LEGEND[2], l: "" },
      { c: SEQ_LEGEND[3], l: "Higher" },
    ],
    availableFor: (ctx) => {
      const tw = ctx.data.meta.townwide[ctx.year];
      if (ctx.mode !== "all")
        return "Support rate compares votes to ballots cast, which the county reports only for all modes combined.";
      if (!tw?.ballotsCast)
        return `The county published no ballot counts for ${ctx.year}, so votes cannot be compared to the number of voters. The Results tab shows share of votes cast instead.`;
      return null;
    },
    valueLabel: (f, ctx) => pct(supportOf(f, ctx, ctx.year)),
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
      if (!hasPrecinctModes(ctx.data, ctx.year))
        return `${ctx.year} vote modes are not reported per precinct, so mode lean cannot be mapped. The Turnaround tab shows the town-wide mode mix instead.`;
      return null;
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
      return pctSigned(mine - (fieldTotal > 0 ? fieldMode / fieldTotal : 0));
    },
  },
  {
    id: "winner",
    label: "Precinct winner",
    shortLabel: "Winner",
    description: "Who placed first in each precinct that year.",
    colorFn: (f, ctx) => {
      const w = f.properties.years[ctx.year]?.winner;
      if (!w) return INK.noData;
      return winnerColorsFor(ctx)[w] ?? INK.noData;
    },
    legend: (ctx) => {
      const colors = winnerColorsFor(ctx);
      const winners = new Set(
        ctx.data.features
          .map((f) => f.properties.years[ctx.year]?.winner)
          .filter((w): w is string => !!w),
      );
      return (ctx.data.meta.candidatesByYear[ctx.year] ?? [])
        .filter((n) => winners.has(n))
        .map((l) => ({ c: colors[l] ?? INK.noData, l }));
    },
    availableFor: () => null,
    valueLabel: (f, ctx) => f.properties.years[ctx.year]?.winner ?? "—",
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
      const max = Math.max(
        ...ctx.data.features.map(
          (o) => o.properties.years[ctx.year]?.ballotsCast ?? 0,
        ),
      );
      return sequential(max > 0 ? y.ballotsCast / max : 0);
    },
    legend: () => [
      { c: SEQ_LEGEND[0], l: "Fewer ballots" },
      { c: SEQ_LEGEND[1], l: "" },
      { c: SEQ_LEGEND[2], l: "" },
      { c: SEQ_LEGEND[3], l: "More" },
    ],
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

function winnerColorsFor(ctx: MetricContext): Record<string, string> {
  return colorsForYear(ctx.data, ctx.year, ctx.focus);
}

export const METRIC_BY_ID = Object.fromEntries(
  METRICS.map((m) => [m.id, m]),
) as Record<MetricId, MetricConfig>;

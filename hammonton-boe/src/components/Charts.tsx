// Chart marks for the app. Thin bars, rounded data-ends anchored to the
// baseline, a 2px surface gap between stacked segments, direct labels on every
// mark (which is also what relieves the sub-3:1 contrast warning on two of the
// candidate hues), and a hover tooltip on every mark.

import type { Mode, ModeCounts } from "../lib/data/types";
import { MODES, MODE_LABEL, MODE_SHORT } from "../lib/data/types";
import { MODE_COLOR } from "../lib/data/palette";
import { fmtInt, fmtPct } from "../lib/measures";
import { Swatch } from "./UI";

export interface RankedRow {
  name: string;
  votes: number;
  share: number;
  color: string;
  isFocus?: boolean;
  elected?: boolean;
  rank?: number | null;
}

/** Ranked horizontal bars — one per candidate, focus candidate emphasised. */
export function RankedBars({
  rows,
  seatsUp,
}: {
  rows: RankedRow[];
  seatsUp?: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.votes));
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <li
          key={r.name}
          className={`rounded-md px-2 py-1.5 -mx-2 ${
            r.isFocus ? "bg-focus-soft ring-1 ring-focus-ring" : ""
          }`}
          title={`${r.name}: ${fmtInt(r.votes)} votes (${fmtPct(r.share, 2)})`}
        >
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="flex items-center gap-1.5 min-w-0">
              <Swatch color={r.color} />
              <span
                className={`text-sm truncate ${
                  r.isFocus ? "font-semibold text-focus-deep" : "text-slate-700"
                }`}
              >
                {r.name}
              </span>
              {r.elected && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 shrink-0">
                  Elected
                </span>
              )}
            </span>
            <span className="text-sm text-slate-700 tnum shrink-0">
              {fmtInt(r.votes)}{" "}
              <span className="text-slate-400">{fmtPct(r.share, 1)}</span>
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm"
              style={{
                width: `${(r.votes / max) * 100}%`,
                background: r.color,
              }}
            />
          </div>
          {seatsUp !== undefined && i + 1 === seatsUp && (
            <div className="relative mt-2 mb-1" aria-hidden="true">
              <div className="border-t border-dashed border-slate-300" />
              <span className="absolute -top-2 left-0 bg-white px-1 text-[10px] uppercase tracking-wide text-slate-400">
                {seatsUp} seats
              </span>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/** A stacked composition bar for a mode mix. Segments carry a 2px surface gap. */
export function StackedModeBar({
  counts,
  label,
  showLabels = true,
}: {
  counts: ModeCounts;
  label: string;
  showLabels?: boolean;
}) {
  const total = MODES.reduce((s, m) => s + (counts[m] || 0), 0);
  const parts = MODES.filter((m) => (counts[m] || 0) > 0);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs text-slate-500 tnum">{fmtInt(total)}</span>
      </div>
      <div className="flex gap-[2px] h-3" role="img" aria-label={`${label}: ${
        parts.map((m) => `${MODE_LABEL[m]} ${fmtPct((counts[m] || 0) / (total || 1))}`).join(", ")
      }`}>
        {parts.map((m) => (
          <div
            key={m}
            className="h-full first:rounded-l-sm last:rounded-r-sm"
            style={{
              width: `${((counts[m] || 0) / (total || 1)) * 100}%`,
              background: MODE_COLOR[m],
            }}
            title={`${MODE_LABEL[m]}: ${fmtInt(counts[m] || 0)} (${fmtPct(
              (counts[m] || 0) / (total || 1),
            )})`}
          />
        ))}
      </div>
      {showLabels && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {parts.map((m) => (
            <li key={m} className="flex items-center gap-1 text-[11px] text-slate-600">
              <Swatch color={MODE_COLOR[m]} />
              {MODE_SHORT[m]}{" "}
              <span className="tnum text-slate-500">
                {fmtPct((counts[m] || 0) / (total || 1), 0)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * "How the win was built": the net vote change split into per-mode
 * contributions. Gains sit right of the zero line, losses left of it.
 */
export function ContributionBar({
  parts,
}: {
  parts: { mode: Mode; delta: number }[];
}) {
  const scale = Math.max(1, ...parts.map((p) => Math.abs(p.delta)));
  return (
    <div className="space-y-2">
      {parts.map((p) => {
        const w = (Math.abs(p.delta) / scale) * 50;
        return (
          <div key={p.mode} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs text-slate-600 flex items-center gap-1.5">
              <Swatch color={MODE_COLOR[p.mode]} />
              {MODE_LABEL[p.mode]}
            </span>
            <div className="relative flex-1 h-4">
              <div
                className="absolute inset-y-0 left-1/2 w-px bg-slate-300"
                aria-hidden="true"
              />
              <div
                className="absolute inset-y-0.5 rounded-sm"
                style={{
                  background: MODE_COLOR[p.mode],
                  left: p.delta >= 0 ? "50%" : `${50 - w}%`,
                  width: `${w}%`,
                }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs tnum text-slate-700">
              {p.delta >= 0 ? "+" : "−"}
              {fmtInt(Math.abs(p.delta))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

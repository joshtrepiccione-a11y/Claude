// Precinct detail. A bottom sheet under ~768px, a side card above it.

import type { BoeData, PrecinctFeature } from "../lib/data/types";
import { MODES } from "../lib/data/types";
import { isNonCandidate } from "../lib/data/palette";
import {
  fmtInt,
  fmtPct,
  fmtPctSigned,
  fmtSigned,
  ordinal,
  precinctMeasures,
  colorsForYear,
} from "../lib/measures";
import { RankedBars, StackedModeBar, type RankedRow } from "./Charts";
import { Card, Pill } from "./UI";

export function PrecinctDrawer({
  data,
  feature,
  focus,
  year,
  compareYear,
  onClose,
}: {
  data: BoeData;
  feature: PrecinctFeature | null;
  focus: string;
  year: string;
  compareYear: string;
  onClose: () => void;
}) {
  if (!feature) {
    return (
      <Card title="District detail" subtitle="Select a district on the map">
        <p className="text-sm text-slate-500 py-6 text-center">
          Tap a district to see every candidate's certified vote there, plus{" "}
          {focus}'s share, support rate and change between years.
        </p>
      </Card>
    );
  }

  const p = feature.properties;
  const y = p.years[year];
  const tw = data.meta.townwide[year];
  const colors = colorsForYear(data, year, focus);
  // Always compare earliest → latest so the change reads forward in time,
  // whichever year the map is currently showing.
  const [fromYear, toYear] = [compareYear, year].sort();
  const m = precinctMeasures(data, focus, fromYear, toYear).find(
    (x) => x.precinct === p.precinct,
  );

  const rows: RankedRow[] = Object.entries(y?.candidates ?? {})
    .map(([name, c]) => ({
      name,
      votes: c.votes,
      share: c.share,
      color: colors[name] ?? "#a3aacb",
      isFocus: name === focus,
      elected: tw?.elected.includes(name),
    }))
    .sort((a, b) => {
      if (isNonCandidate(a.name) !== isNonCandidate(b.name)) {
        return isNonCandidate(a.name) ? 1 : -1;
      }
      return b.votes - a.votes;
    });

  const mine = y?.candidates[focus];
  const hasModes = mine ? MODES.some((k) => (mine.modes[k] || 0) > 0) : false;
  // The pills describe the year on screen, which may be either end of the pair.
  const displayedRank = year === toYear ? m?.toRank : m?.fromRank;

  return (
    <Card
      title={`${p.districtLabel} — ${p.municipality}`}
      subtitle={`${year} certified results · ${fmtInt(y?.contestVotes ?? 0)} votes cast${
        y?.ballotsCast ? ` · ${fmtInt(y.ballotsCast)} ballots` : ""
      }`}
      right={
        <button
          aria-label="Close district detail"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 text-xl leading-none w-11 h-11 sm:w-8 sm:h-8 inline-flex items-center justify-center"
        >
          ×
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Pill tone="focus">
            {focus}: {fmtInt(mine?.votes ?? 0)} votes
          </Pill>
          <Pill tone="outline">{fmtPct(mine?.share ?? 0)} of votes cast</Pill>
          {mine?.supportRate != null && (
            <Pill tone="outline">
              {fmtPct(mine.supportRate)} support rate
            </Pill>
          )}
          {displayedRank != null && (
            <Pill tone="slate">{ordinal(displayedRank)} here</Pill>
          )}
          {m?.flipped && <Pill tone="good">Flipped to {focus}</Pill>}
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            All candidates, {year}
          </div>
          <RankedBars rows={rows} seatsUp={tw?.seatsUp} />
        </div>

        {hasModes && mine && (
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              {focus}'s vote by mode
            </div>
            <StackedModeBar counts={mine.modes} label={`${year}`} />
          </div>
        )}

        {m && fromYear !== toYear && (
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              {fromYear} → {toYear} change here
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Box label={`${fromYear} votes`} value={fmtInt(m.fromVotes)} />
              <Box label={`${toYear} votes`} value={fmtInt(m.toVotes)} />
              <Box label="Change in votes" value={fmtSigned(m.deltaVotes)} />
              <Box
                label="Change in share"
                value={fmtPctSigned(m.deltaShare)}
              />
              <Box
                label={`${fromYear} placing`}
                value={ordinal(m.fromRank)}
              />
              <Box label={`${toYear} placing`} value={ordinal(m.toRank)} />
            </div>
            {!data.meta.precinctComparability.directlyComparable && (
              <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                These two years count different ballots in a district row — see
                About for what the county reported each year.
              </p>
            )}
          </div>
        )}

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Won here
          </div>
          <div className="text-sm text-slate-700">
            {y?.winner ?? "—"}{" "}
            <span className="text-slate-400">
              ({fmtInt(y?.winnerVotes ?? 0)} votes)
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 italic">
          Certified figures as reported by Atlantic County. Vote for{" "}
          {tw?.seatsUp ?? "—"}, so shares across candidates sum to well over
          100%.
        </p>
      </div>
    </Card>
  );
}

function Box({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-md px-3 py-2 border border-slate-100">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-800 mt-0.5 tnum">
        {value}
      </div>
    </div>
  );
}

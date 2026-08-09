// The default view: what changed for the focus candidate between the two
// elections. Every figure is certified or direct arithmetic from certified
// numbers.

import { useMemo, useState } from "react";
import type { BoeData } from "../lib/data/types";
import { MODES, MODE_LABEL } from "../lib/data/types";
import {
  fmtInt,
  fmtPct,
  fmtPctSigned,
  fmtSigned,
  ordinal,
  precinctMeasures,
  turnaround,
  type PrecinctMeasure,
} from "../lib/measures";
import { ContributionBar, StackedModeBar } from "../components/Charts";
import { Card, Pill, SectionTitle, Stat, Unavailable, Button, InfoIcon } from "../components/UI";
import { downloadFile, turnaroundToCSV } from "../lib/export/csv";

type SortKey = keyof Pick<
  PrecinctMeasure,
  "districtLabel" | "fromVotes" | "toVotes" | "deltaVotes" | "fromShare" | "toShare" | "deltaShare"
>;

export function Turnaround({
  data,
  focus,
  fromYear,
  toYear,
}: {
  data: BoeData;
  focus: string;
  fromYear: string;
  toYear: string;
}) {
  const t = useMemo(
    () => turnaround(data, focus, fromYear, toYear),
    [data, focus, fromYear, toYear],
  );
  const rows = useMemo(
    () => precinctMeasures(data, focus, fromYear, toYear),
    [data, focus, fromYear, toYear],
  );
  const [sort, setSort] = useState<SortKey>("deltaShare");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const x = a[sort];
      const y = b[sort];
      const cmp =
        typeof x === "string" && typeof y === "string"
          ? x.localeCompare(y)
          : Number(x) - Number(y);
      return asc ? cmp : -cmp;
    });
    return out;
  }, [rows, sort, asc]);

  if (!t) {
    return (
      <main className="max-w-[1500px] mx-auto p-4">
        <Unavailable
          reason={`${focus} does not appear in both ${fromYear} and ${toYear}, so there is no turnaround to measure. Pick a candidate who ran in both years.`}
        />
      </main>
    );
  }

  const gained = t.deltaVotes >= 0;
  const flipped = rows.filter((r) => r.flipped);
  const biggest = [...rows].sort((a, b) => b.deltaShare - a.deltaShare).slice(0, 3);

  return (
    <main className="max-w-[1500px] mx-auto p-4 space-y-4">
      {/* Headline */}
      <Card>
        <div className="grid md:grid-cols-3 gap-4">
          <YearPanel
            year={t.from.year}
            elected={t.from.elected}
            rank={t.from.rank}
            seats={t.from.seatsUp}
            votes={t.from.votes}
            share={t.from.share}
            support={t.from.supportRate}
          />
          <div className="flex flex-col justify-center items-center text-center border-y md:border-y-0 md:border-x border-slate-100 py-3 md:py-0">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Net change
            </div>
            <div
              className={`text-4xl font-semibold mt-1 ${
                gained ? "text-focus-deep" : "text-slate-900"
              }`}
            >
              {fmtSigned(t.deltaVotes)}
            </div>
            <div className="text-xs text-slate-500 mt-1">votes town-wide</div>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <Pill tone="outline">{fmtPctSigned(t.deltaShare)} share</Pill>
              {t.deltaRank !== null && t.deltaRank !== 0 && (
                <Pill tone="outline">
                  {t.deltaRank > 0 ? "Up" : "Down"} {Math.abs(t.deltaRank)} place
                  {Math.abs(t.deltaRank) === 1 ? "" : "s"}
                </Pill>
              )}
            </div>
          </div>
          <YearPanel
            year={t.to.year}
            elected={t.to.elected}
            rank={t.to.rank}
            seats={t.to.seatsUp}
            votes={t.to.votes}
            share={t.to.share}
            support={t.to.supportRate}
          />
        </div>
        {t.electedChanged && (
          <p className="mt-4 text-sm text-slate-700 bg-focus-soft border border-focus-ring rounded-lg px-3 py-2">
            <strong className="text-focus-deep">{focus}</strong> finished{" "}
            {ordinal(t.from.rank)} of {countCandidates(data, t.from.year)} in{" "}
            {t.from.year} for {t.from.seatsUp} seats —{" "}
            {t.from.elected ? "elected" : "not elected"} — and{" "}
            {ordinal(t.to.rank)} of {countCandidates(data, t.to.year)} in{" "}
            {t.to.year} for {t.to.seatsUp} seats —{" "}
            {t.to.elected ? "elected" : "not elected"}. Both placements are
            derived from the certified town-wide totals, not entered by hand.
          </p>
        )}
      </Card>

      {/* How the win was built */}
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Card
          title="How the change was built"
          subtitle={`${fmtSigned(t.deltaVotes)} votes, split by how those votes were cast`}
        >
          {t.contribution.available ? (
            <>
              <ContributionBar parts={t.contribution.parts} />
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                {t.contribution.parts
                  .filter((p) => p.delta !== 0)
                  .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                  .map((p) => (
                    <li key={p.mode}>
                      <strong className="text-slate-800">
                        {fmtSigned(p.delta)}
                      </strong>{" "}
                      from {MODE_LABEL[p.mode]} ({fmtInt(p.from)} →{" "}
                      {fmtInt(p.to)})
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <Unavailable reason={t.contribution.reason} />
          )}
        </Card>

        <Card
          title="Mode mix"
          subtitle={`How ${focus}'s votes were cast, against the whole field`}
        >
          <div className="space-y-4">
            {[t.from, t.to].map((y) =>
              y.modeCoverage === "none" ? (
                <div key={y.year}>
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                    {y.year}
                  </div>
                  <Unavailable
                    reason={`The county published no vote-mode split for ${y.year} — every mode is folded into the district totals.`}
                  />
                </div>
              ) : (
                <div key={y.year} className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {y.year}
                    {y.modeCoverage === "town-level" && (
                      <span className="ml-1 normal-case tracking-normal text-slate-400">
                        (town-wide)
                      </span>
                    )}
                  </div>
                  <StackedModeBar counts={y.modes} label={focus} />
                  <StackedModeBar
                    counts={data.meta.townwide[y.year].fieldModes}
                    label="All candidates"
                    showLabels={false}
                  />
                  <ul className="text-xs text-slate-600 space-y-0.5">
                    {MODES.filter((m) => y.fieldMix[m] > 0).map((m) => (
                      <li key={m}>
                        {MODE_LABEL[m]}: {fmtPct(y.mix[m], 1)} of his vote vs{" "}
                        {fmtPct(y.fieldMix[m], 1)} of the field —{" "}
                        <strong className="text-slate-800">
                          {fmtPctSigned(y.lean[m])}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>
        </Card>
      </div>

      {/* Where it moved */}
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <Card title="Biggest share gains" subtitle="By district">
          <ol className="space-y-2">
            {biggest.map((r) => (
              <li key={r.precinct} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{r.districtLabel}</span>
                <span className="tnum text-slate-800 font-medium">
                  {fmtPctSigned(r.deltaShare)}
                </span>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Districts he came to lead" subtitle={`Trailed in ${fromYear}, led in ${toYear}`}>
          {flipped.length > 0 ? (
            <ul className="space-y-2">
              {flipped.map((r) => (
                <li key={r.precinct} className="text-sm text-slate-700">
                  <strong>{r.districtLabel}</strong> — {r.fromWinner} →{" "}
                  <span className="text-focus-deep font-medium">{focus}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              {focus} did not place first in any district in {toYear}. In a
              vote-for-{t.to.seatsUp} race a candidate is elected on the town-wide
              total, so leading individual districts is not required — he placed{" "}
              {ordinal(t.to.rank)} town-wide.
            </p>
          )}
        </Card>
        <Card title="Town-wide context">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label={`${fromYear} votes cast`}
              value={fmtInt(t.from.contestVotes)}
              hint={t.from.ballotsCast ? `${fmtInt(t.from.ballotsCast)} ballots` : undefined}
            />
            <Stat
              label={`${toYear} votes cast`}
              value={fmtInt(t.to.contestVotes)}
              hint={t.to.ballotsCast ? `${fmtInt(t.to.ballotsCast)} ballots` : undefined}
            />
          </div>
        </Card>
      </div>

      {/* Precinct table */}
      <Card
        title="District by district"
        subtitle={`${focus}, ${fromYear} vs ${toYear}`}
        right={
          <Button
            onClick={() =>
              downloadFile(
                `hammonton-boe-${focus.replace(/\W+/g, "-").toLowerCase()}-${fromYear}-${toYear}.csv`,
                turnaroundToCSV(sorted, focus, fromYear, toYear, {
                  from: modeUnknownIn(data, fromYear),
                  to: modeUnknownIn(data, toYear),
                }),
              )
            }
          >
            Export CSV
          </Button>
        }
      >
        {!data.meta.precinctComparability.directlyComparable && (
          <p className="mb-3 text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 leading-snug">
            <strong>Read these rows with care.</strong>{" "}
            {data.meta.precinctComparability.note}
          </p>
        )}
        <div className="overflow-x-auto thin-scroll -mx-4 px-4">
          <table className="data-table w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <Th k="districtLabel" sort={sort} asc={asc} set={setSort} setAsc={setAsc}>
                  District
                </Th>
                <Th k="fromVotes" sort={sort} asc={asc} set={setSort} setAsc={setAsc} right>
                  {fromYear} votes
                </Th>
                <Th k="fromShare" sort={sort} asc={asc} set={setSort} setAsc={setAsc} right>
                  {fromYear} share
                </Th>
                <Th k="toVotes" sort={sort} asc={asc} set={setSort} setAsc={setAsc} right>
                  {toYear} votes
                </Th>
                <Th k="toShare" sort={sort} asc={asc} set={setSort} setAsc={setAsc} right>
                  {toYear} share
                </Th>
                <Th k="deltaVotes" sort={sort} asc={asc} set={setSort} setAsc={setAsc} right>
                  Δ votes
                </Th>
                <Th k="deltaShare" sort={sort} asc={asc} set={setSort} setAsc={setAsc} right>
                  Δ share
                </Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.precinct} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-700">
                    {r.districtLabel}
                    {r.flipped && (
                      <Pill tone="good" className="ml-2">
                        Flipped
                      </Pill>
                    )}
                  </td>
                  <td className="py-2 text-right tnum">{fmtInt(r.fromVotes)}</td>
                  <td className="py-2 text-right tnum text-slate-500">
                    {fmtPct(r.fromShare)}
                  </td>
                  <td className="py-2 text-right tnum">{fmtInt(r.toVotes)}</td>
                  <td className="py-2 text-right tnum text-slate-500">
                    {fmtPct(r.toShare)}
                  </td>
                  <td className="py-2 text-right tnum font-medium">
                    {fmtSigned(r.deltaVotes)}
                  </td>
                  <td className="py-2 text-right tnum font-medium">
                    {fmtPctSigned(r.deltaShare)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-slate-500 flex items-start gap-2">
        <InfoIcon tip="Each voter may pick up to the number of open seats, so candidate shares are shares of all votes cast in the contest and sum to far more than 100% across candidates." />
        <span>
          Vote for {t.to.seatsUp}: shares are of all votes cast in the contest,
          so they sum to well over 100% across candidates. See About.
        </span>
      </p>
    </main>
  );
}

/** True when that year's district rows combine every mode, so a per-district
 *  mode figure is unknown rather than zero. */
function modeUnknownIn(data: BoeData, year: string): boolean {
  return (data.meta.townwide[year]?.districtBasis ??
    data.meta.precinctComparability.districtBasis?.[year] ??
    "all-modes") === "all-modes";
}

function countCandidates(data: BoeData, year: string): number {
  return (data.meta.townwide[year]?.candidates ?? []).filter((c) => c.isCandidate)
    .length;
}

function YearPanel({
  year,
  elected,
  rank,
  seats,
  votes,
  share,
  support,
}: {
  year: string;
  elected: boolean;
  rank: number | null;
  seats: number;
  votes: number;
  share: number;
  support: number | null;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <SectionTitle>{year}</SectionTitle>
        <Pill tone={elected ? "good" : "slate"} className="mb-3">
          {elected ? "Elected" : "Not elected"}
        </Pill>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Votes" value={fmtInt(votes)} accent />
        <Stat label="Placed" value={ordinal(rank)} hint={`of ${seats} seats`} />
        <Stat label="Share of votes" value={fmtPct(share)} />
        <Stat
          label="Support rate"
          value={support === null ? "—" : fmtPct(support)}
          hint={support === null ? "no ballot count published" : "of ballots cast"}
        />
      </div>
    </div>
  );
}

function Th({
  k,
  sort,
  asc,
  set,
  setAsc,
  children,
  right,
}: {
  k: SortKey;
  sort: SortKey;
  asc: boolean;
  set: (k: SortKey) => void;
  setAsc: (v: boolean) => void;
  children: React.ReactNode;
  right?: boolean;
}) {
  const active = sort === k;
  return (
    <th className={`py-2 font-medium ${right ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => (active ? setAsc(!asc) : (set(k), setAsc(false)))}
        className="inline-flex items-center gap-1 hover:text-slate-700"
        aria-sort={active ? (asc ? "ascending" : "descending") : "none"}
      >
        {children}
        <span aria-hidden="true" className={active ? "" : "text-slate-300"}>
          {active ? (asc ? "▲" : "▼") : "▽"}
        </span>
      </button>
    </th>
  );
}

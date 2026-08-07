// Per-year certified results: precincts × candidates, with the town-wide
// totals and the elected winners marked.

import { useState } from "react";
import type { BoeData, Mode } from "../lib/data/types";
import { MODES, MODE_LABEL } from "../lib/data/types";
import { isNonCandidate } from "../lib/data/palette";
import { availableModes, colorsForYear, fmtInt, fmtPct, ordinal } from "../lib/measures";
import type { DistrictBasis } from "../lib/data/types";
import { RankedBars, type RankedRow } from "../components/Charts";
import { Button, Card, Legend, Pill, Segmented, Swatch, Unavailable } from "../components/UI";
import { downloadFile, resultsToCSV } from "../lib/export/csv";

export function Results({
  data,
  focus,
  years,
}: {
  data: BoeData;
  focus: string;
  years: string[];
}) {
  const [year, setYear] = useState(years[years.length - 1]);
  const [mode, setMode] = useState<Mode | "all">("all");
  const tw = data.meta.townwide[year];
  const ballot = data.meta.candidatesByYear[year] ?? [];
  const colors = colorsForYear(data, year, focus);
  const modesHere = availableModes(data, year);

  // Under a mode filter the denominator has to be that mode's votes too --
  // pairing a mode-filtered count with the all-modes share puts two different
  // numerators in the same row.
  const modeTotal =
    mode === "all"
      ? tw.contestVotes
      : tw.candidates.reduce((a, c) => a + (c.modes[mode] || 0), 0);
  const rows: RankedRow[] = tw.candidates
    .map((c) => {
      const votes = mode === "all" ? c.votes : c.modes[mode] || 0;
      return {
      name: c.name,
      votes,
      share: modeTotal > 0 ? votes / modeTotal : 0,
      color: colors[c.name] ?? "#a3aacb",
      isFocus: c.name === focus,
      elected: c.elected,
      rank: c.rank,
      };
    })
    .sort((a, b) => {
      if (isNonCandidate(a.name) !== isNonCandidate(b.name)) {
        return isNonCandidate(a.name) ? 1 : -1;
      }
      return b.votes - a.votes;
    });

  const townUnits = Object.entries(tw.townLevelUnits ?? {});

  // What a district cell can honestly say under a mode filter.
  //   election-day : districts ARE the Election Day returns, so the other
  //                  modes are genuinely zero there.
  //   all-modes    : every mode is folded in, so a single mode is UNKNOWN per
  //                  district — showing 0 would invent a certified figure.
  // Read the required per-year copy, and fail SAFE: an unknown basis must
  // suppress district mode figures, never invent zeros for them.
  const basis: DistrictBasis =
    tw.districtBasis ??
    data.meta.precinctComparability.districtBasis?.[year] ??
    "all-modes";
  const districtModeKnown = mode === "all" || basis !== "all-modes";

  return (
    <main className="max-w-[1500px] mx-auto p-4 space-y-4">
      <Card>
        <div className="flex flex-wrap gap-x-6 gap-y-3 items-start">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">
              Year
            </div>
            <Segmented
              label="Year"
              value={year}
              options={years.map((y) => ({ id: y, label: y }))}
              onChange={(y) => {
                setYear(y);
                // Same stranding the map guards against: a mode the new year
                // does not report leaves its own button disabled and unclickable.
                if (mode !== "all" && !availableModes(data, y).includes(mode)) {
                  setMode("all");
                }
              }}
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">
              Vote mode
            </div>
            <Segmented
              label="Vote mode"
              value={mode}
              options={[
                { id: "all" as const, label: "All" },
                ...MODES.map((m) => ({
                  id: m,
                  label: MODE_LABEL[m],
                  disabledReason: modesHere.includes(m)
                    ? null
                    : `${year}: the county reported no ${MODE_LABEL[m]} figures for this contest.`,
                })),
              ]}
              onChange={(m) => setMode(m as Mode | "all")}
            />
          </div>
          <div className="grow" />
          <Button
            onClick={() =>
              downloadFile(
                `hammonton-boe-results-${year}.csv`,
                resultsToCSV(data, year),
              )
            }
          >
            Export CSV
          </Button>
        </div>
        <p className="text-xs text-slate-600 mt-3">
          Vote for {tw.seatsUp}. {fmtInt(tw.contestVotes)} votes cast
          {tw.ballotsCast ? ` across ${fmtInt(tw.ballotsCast)} ballots` : ""}. The
          top {tw.seatsUp} town-wide are elected: {tw.elected.join(", ")}.
        </p>
      </Card>

      <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] gap-4">
        <Card
          title={`Town-wide, ${year}`}
          subtitle={
            mode === "all"
              ? "All vote modes"
              : `${MODE_LABEL[mode]} only — elected is still the all-modes result`
          }
        >
          {mode !== "all" && !modesHere.includes(mode) ? (
            <Unavailable
              reason={`The county published no ${MODE_LABEL[mode]} figures for ${year}.`}
            />
          ) : (
            // The seat cutoff belongs to the town-wide, all-modes ranking.
            // Drawing it over a mode-filtered order would put a candidate who
            // was never elected above the line.
            <RankedBars
              rows={rows}
              seatsUp={mode === "all" ? tw.seatsUp : undefined}
              seatTie={tw.seatTie}
            />
          )}
        </Card>

        <Card
          title={`By district, ${year}`}
          subtitle="Certified votes per candidate"
        >
          <div className="mb-3">
            <Legend
              items={ballot.map((c) => ({ c: colors[c] ?? "#a3aacb", l: c }))}
            />
          </div>
          {!districtModeKnown && (
            <p className="mb-3 text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 leading-snug">
              <strong>Not known by district.</strong> {year} district rows
              combine every vote mode, so {MODE_LABEL[mode as Mode]} cannot be
              broken out per district — those cells read “—” rather than 0. The
              town-wide row below is the certified {MODE_LABEL[mode as Mode]}{" "}
              figure.
            </p>
          )}
          <div className="overflow-x-auto thin-scroll -mx-4 px-4">
            <table className="data-table w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-medium">District</th>
                  <th className="py-2 font-medium text-right">Ballots</th>
                  {ballot.map((c) => (
                    <th key={c} className="py-2 font-medium text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Swatch color={colors[c] ?? "#a3aacb"} />
                        {shortName(c)}
                      </span>
                    </th>
                  ))}
                  <th className="py-2 font-medium">Won here</th>
                </tr>
              </thead>
              <tbody>
                {data.features.map((f) => {
                  const p = f.properties;
                  const y = p.years[year];
                  return (
                    <tr key={p.precinct} className="border-b border-slate-100">
                      <td className="py-2 font-medium text-slate-700">
                        {p.districtLabel}
                      </td>
                      <td className="py-2 text-right tnum text-slate-500">
                        {y?.ballotsCast ? fmtInt(y.ballotsCast) : "—"}
                      </td>
                      {ballot.map((c) => {
                        const cell = y?.candidates[c];
                        const v =
                          mode === "all" ? cell?.votes ?? 0 : cell?.modes[mode] ?? 0;
                        return (
                          <td
                            key={c}
                            className={`py-2 text-right tnum ${
                              c === focus ? "font-semibold text-focus-deep" : ""
                            }`}
                          >
                            {districtModeKnown ? fmtInt(v) : "—"}
                          </td>
                        );
                      })}
                      <td className="py-2 text-slate-600">
                        {y?.tied
                          ? `Tied — ${y.winners.join(" / ")}`
                          : y?.winner ?? "—"}
                      </td>
                    </tr>
                  );
                })}

                {townUnits.length > 0 && (
                  <>
                    <tr>
                      <td
                        colSpan={ballot.length + 3}
                        className="pt-4 pb-1 text-xs uppercase tracking-wide text-slate-500"
                      >
                        Reported town-wide, not by district
                      </td>
                    </tr>
                    {townUnits.map(([unit, u]) => (
                      <tr key={unit} className="border-b border-slate-100">
                        <td className="py-2 text-slate-700">
                          {unit}
                          {u.mode && (
                            <Pill tone="outline" className="ml-2">
                              {MODE_LABEL[u.mode]}
                            </Pill>
                          )}
                        </td>
                        <td className="py-2 text-right tnum text-slate-500">
                          {u.ballotsCast ? fmtInt(u.ballotsCast) : "—"}
                        </td>
                        {ballot.map((c) => (
                          <td
                            key={c}
                            className={`py-2 text-right tnum ${
                              c === focus ? "font-semibold text-focus-deep" : ""
                            }`}
                          >
                            {/* u.votes is a total, not a per-mode breakdown, and
                                u.mode is only the first mode found. Show the
                                total when it is this unit's mode, 0 when the
                                unit is single-mode and this is not it, and "—"
                                when the unit spans modes so the split is
                                unknown. */}
                            {mode === "all" || u.mode === mode
                              ? fmtInt(u.votes[c] ?? 0)
                              : u.modeCount && u.modeCount > 1
                              ? "—"
                              : fmtInt(0)}
                          </td>
                        ))}
                        <td className="py-2 text-slate-400">—</td>
                      </tr>
                    ))}
                  </>
                )}

                <tr className="border-t-2 border-slate-300 font-semibold">
                  <td className="py-2 text-slate-800">Town-wide</td>
                  <td className="py-2 text-right tnum">
                    {tw.ballotsCast ? fmtInt(tw.ballotsCast) : "—"}
                  </td>
                  {ballot.map((c) => {
                    const cc = tw.candidates.find((x) => x.name === c);
                    const v =
                      mode === "all" ? cc?.votes ?? 0 : cc?.modes[mode] ?? 0;
                    return (
                      <td
                        key={c}
                        className={`py-2 text-right tnum ${
                          c === focus ? "text-focus-deep" : ""
                        }`}
                      >
                        {fmtInt(v)}
                      </td>
                    );
                  })}
                  <td className="py-2 text-slate-600 font-normal text-xs">
                    Elected: {tw.elected.join(", ")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
            {tw.candidates
              .filter((c) => c.isCandidate)
              .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
              .map((c) => (
                <li key={c.name} className="flex items-center gap-1.5">
                  <Swatch color={colors[c.name] ?? "#a3aacb"} />
                  <span className={c.name === focus ? "font-semibold text-focus-deep" : ""}>
                    {ordinal(c.rank)} {c.name}
                  </span>
                  <span className="text-slate-400 tnum">
                    {fmtInt(c.votes)} · {fmtPct(c.share)}
                  </span>
                  {c.elected && (
                    <span className="text-[10px] font-semibold uppercase text-emerald-700">
                      Elected
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : full;
}

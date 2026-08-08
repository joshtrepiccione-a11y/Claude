import type { BoeData } from "../lib/data/types";
import { MODE_LABEL } from "../lib/data/types";
import { fmtInt } from "../lib/measures";
import { Card, Pill } from "../components/UI";

export function About({ data, focus }: { data: BoeData; focus: string }) {
  const meta = data.meta;
  return (
    <main className="max-w-[900px] mx-auto p-4 space-y-4">
      <Card title="What this is">
        <div className="prose-sm text-sm text-slate-700 space-y-3">
          <p>
            A vote-pattern explorer for the{" "}
            <strong>Hammonton Board of Education</strong> elections of{" "}
            {meta.years.join(" and ")}, built around{" "}
            <strong className="text-focus-deep">{focus}</strong> — what his vote
            looked like across the town's {data.features.length} election
            districts, and what changed between the two contests.
          </p>
          <p className="bg-focus-soft border border-focus-ring rounded-lg px-3 py-2">
            <strong>Results as certified — measured, not modeled.</strong> Every
            number here is a certified figure published by Atlantic County, or
            direct arithmetic on those figures (sums, shares, ranks,
            differences). There are no projections, no swings, no turnout
            assumptions and no estimated values anywhere in this app. Where the
            county did not publish something, the app says so instead of filling
            the gap.
          </p>
        </div>
      </Card>

      <Card title="Where the numbers come from">
        <dl className="text-sm text-slate-700 space-y-2">
          <Row label="Source">{meta.source}</Row>
          <Row label="Municipality">{meta.municipality}</Row>
          <Row label="Districts">
            {data.features.map((f) => f.properties.districtLabel).join(", ")} —
            filtered from the county precinct boundaries already in this
            repository
          </Row>
          {meta.years.map((y) => {
            const tw = meta.townwide[y];
            return (
              <Row key={y} label={y}>
                vote for {tw.seatsUp} · {tw.candidates.filter((c) => c.isCandidate).length}{" "}
                candidates · {fmtInt(tw.contestVotes)} votes cast
                {tw.ballotsCast ? ` · ${fmtInt(tw.ballotsCast)} ballots` : ""} ·
                elected: {tw.elected.join(", ")}
              </Row>
            );
          })}
        </dl>
        <p className="text-xs text-slate-500 mt-3">
          The candidate lists, seat counts, winners and totals above are all read
          out of the certified file — none of them are written into the app.
        </p>
      </Card>

      <Card title="Vote-for-N: why the shares add up to more than 100%">
        <p className="text-sm text-slate-700">
          These are nonpartisan, multi-seat races. In a{" "}
          <strong>vote-for-{meta.townwide[meta.years[0]]?.seatsUp}</strong>{" "}
          contest each voter may pick up to that many candidates, so the total
          number of votes cast is far larger than the number of ballots. Two
          different measures follow from that, and this app keeps them apart:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>
            <strong>Share of votes cast</strong> — a candidate's votes divided by
            all votes cast in the contest. Across candidates these sum to 100%,
            but a candidate with 20% is not "20% of voters."
          </li>
          <li>
            <strong>Support rate</strong> — a candidate's votes divided by{" "}
            <em>ballots cast</em>: the share of voters who chose them. Across
            candidates these sum to well over 100%, and that is expected. Support
            rate is only shown for a year where the county published a ballot
            count.
          </li>
        </ul>
      </Card>

      <Card title="Where the two county publications disagree">
        <div className="text-sm text-slate-700 space-y-3">
          <p>
            Atlantic County published 2023 twice: as a results website, and as a
            per-municipality workbook. They agree on every district figure and
            on every vote-mode total. They differ by three votes in one place,
            and this app says which side it is on rather than quietly picking
            one.
          </p>
          <p>
            The workbook carries a separate <strong>“Handcount - VBM”</strong>{" "}
            line — one vote each for Kelli Fallon, Bob Lolio and Shawn K.
            McCloud — that its Grand Total includes and the website's town-wide
            figures exclude. This app uses the website basis, because that is
            the basis the district results and the county's published field
            mode totals both reconcile against; adopting the other would leave
            three votes with no district and no mode. So three candidates read
            one vote lower here than in the workbook's Grand Total column.
          </p>
          <p className="text-slate-600">
            Nothing else moves: the ranking, the seats and{" "}
            <strong className="text-focus-deep">{focus}</strong>'s placement are
            identical under either basis.
          </p>
        </div>
      </Card>

      <Card title="What the county reported each year">
        <p className="text-sm text-slate-700 mb-3">
          The two elections were not published the same way, which limits some
          comparisons. This is the single most important caveat in the app:
        </p>
        <ul className="space-y-3 text-sm text-slate-700">
          {meta.years.map((y) => {
            const cov = meta.precinctComparability.byYear[y];
            const basis = meta.precinctComparability.districtBasis?.[y];
            const units = Object.keys(meta.townwide[y].townLevelUnits ?? {});
            return (
              <li key={y} className="flex gap-3">
                <Pill tone="outline" className="shrink-0 h-fit">
                  {y}
                </Pill>
                <span>
                  {cov === "district" &&
                    "Vote modes reported per district — every mode measure works at precinct level."}
                  {cov === "town-level" && basis === "election-day" && (
                    <>
                      District rows are <strong>Election Day only</strong>. Mail,
                      early and provisional votes were reported town-wide
                      {units.length > 0 ? ` (${units.join(", ")})` : ""}, so they
                      cannot be attributed to any one district.
                    </>
                  )}
                  {cov === "town-level" && basis === "all-modes" && (
                    <>
                      District rows <strong>combine every mode</strong>, and the
                      county published the mode split only town-wide. So the
                      town-wide mode mix and the contribution breakdown are
                      exact, but mode cannot be mapped by district.
                    </>
                  )}
                  {cov === "none" && (
                    <>
                      <strong>No vote-mode split was published.</strong> Every
                      mode is folded into the district totals, so mode mix, mode
                      lean and the mode contribution breakdown are unavailable
                      for this year.
                    </>
                  )}
                  {/* Fallback: never leave the bullet blank if a field is
                      missing (an older cached geojson has no districtBasis). */}
                  {cov === "town-level" &&
                    basis !== "election-day" &&
                    basis !== "all-modes" && (
                      <>
                        Vote modes are reported <strong>town-wide only</strong>,
                        not per district.
                      </>
                    )}
                </span>
              </li>
            );
          })}
        </ul>
        {!meta.precinctComparability.directlyComparable && (
          <p className="mt-3 text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
            {meta.precinctComparability.note}
          </p>
        )}
      </Card>

      <Card title="How each measure is calculated">
        <dl className="text-sm text-slate-700 space-y-2">
          <Row label="Votes">As certified, town-wide and per district.</Row>
          <Row label="Share of votes cast">
            candidate votes ÷ all votes cast in that contest and unit.
          </Row>
          <Row label="Support rate">
            candidate votes ÷ ballots cast in that unit. Blank where the county
            published no ballot count.
          </Row>
          <Row label="Mode mix">
            the split of a candidate's own votes across{" "}
            {Object.values(MODE_LABEL).join(" / ")}.
          </Row>
          <Row label="Mode lean">
            the candidate's mode mix minus the whole field's, in points. Positive
            means they over-index on that mode.
          </Row>
          <Row label="Rank and elected">
            rank by town-wide total among candidates; the top{" "}
            <em>seats up</em> are elected. Write-in and Personal Choice lines are
            counted in the totals but never occupy a seat.
          </Row>
          <Row label="Change">
            the later year's figure minus the earlier one — a measured
            difference between two certified results, not a swing or a forecast.
          </Row>
          <Row label="Mode contribution">
            the change in a candidate's votes within each mode; the parts sum to
            the net change. Shown only when both years published a mode split.
          </Row>
        </dl>
      </Card>

      <Card title="Colour and accessibility">
        <p className="text-sm text-slate-700">
          No colour in this app encodes a political party — these are nonpartisan
          races. {focus} carries one violet highlight throughout. Other
          candidates use a colourblind-safe categorical palette, magnitude uses a
          single-hue sequential ramp, and change uses a diverging ramp with a
          neutral midpoint. Every chart labels its marks directly and every map
          district carries its number, so meaning is never carried by colour
          alone; the Results tab is a full table view of the same figures.
        </p>
      </Card>

      {meta.warnings.length > 0 && (
        <Card title="Build warnings">
          <ul className="text-sm text-amber-800 space-y-1">
            {meta.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[150px_minmax(0,1fr)] gap-x-3">
      <dt className="text-xs uppercase tracking-wide text-slate-500 pt-0.5">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

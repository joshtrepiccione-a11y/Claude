#!/usr/bin/env python3
"""Pivot the validated data/hammonton_boe_real.csv into the app's GeoJSON.

    python3 scripts/build_hammonton_boe.py

Reads:
    data/hammonton_boe_real.csv        long format, one row per year/precinct/candidate
    data/atlantic_precincts.geojson    county precincts (filtered to Hammonton)

Writes:
    hammonton-boe/public/data/hammonton_boe_precincts.geojson

Everything written is REAL and certified, or a direct arithmetic consequence of
certified numbers (sums, shares, ranks). Nothing is interpolated, modeled, or
spread across units. Where the county did not report something -- per-district
vote modes, for instance -- the output records that it is unavailable rather
than inventing a value.

Two structural facts about the source data drive the schema, and both are
carried into the output so the UI can state them plainly:

  1. Vote-mode coverage differs by year. In 2021 the county reported districts
     as Election Day returns with mail / early / provisional as TOWN-LEVEL
     buckets; in 2023 it folded every mode into the district rows and published
     the split only town-wide (see data/hammonton_boe_townwide_modes.csv).
     Either way the split is known town-wide and NOT per district.
     `modeCoverage` records how much detail exists; `districtBasis` records
     what one district row actually contains -- different questions.

  2. Because of (1), a district's 2021 row and its 2023 row do not describe the
     same electorate (Election Day only vs. all modes). Town-wide totals ARE
     directly comparable. `precinctComparability` flags this so per-precinct
     deltas can be labelled honestly.
"""

import csv
import json
import os
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hammonton_common import (  # noqa: E402
    district_of, is_candidate, load_townwide_modes, to_int as i)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CSV_IN = os.path.join(ROOT, "data", "hammonton_boe_real.csv")
GEOJSON_IN = os.path.join(ROOT, "data", "atlantic_precincts.geojson")
TOWN_MODES = os.path.join(ROOT, "data", "hammonton_boe_townwide_modes.csv")
OUT = os.path.join(ROOT, "hammonton-boe", "public", "data",
                   "hammonton_boe_precincts.geojson")

MUNICIPALITY = "Hammonton Town"
MODES = ["election_day", "early", "vbm", "provisional"]
FOCUS_MATCH = "pullia"   # case-insensitive substring; the default focus


def main():
    if not os.path.exists(CSV_IN):
        sys.exit(f"missing {CSV_IN}")
    with open(CSV_IN, newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        sys.exit("CSV has no rows")

    # ---- Fold the long rows into structures -------------------------------
    # votes[year][district][candidate] = {mode: n, "total": n}
    votes = defaultdict(lambda: defaultdict(dict))
    # town_level[year][bucket][candidate] = {...}  (non-geographic units)
    town_level = defaultdict(lambda: defaultdict(dict))
    ballots = defaultdict(dict)          # year -> unit -> ballots_cast
    dup_rows = []                        # year/unit/candidate seen more than once
    seats = {}                           # year -> seats_up
    candidates = defaultdict(list)       # year -> ordered candidate names

    for r in rows:
        year = i(r["year"])
        unit = (r["precinct"] or "").strip()
        cand = (r["candidate"] or "").strip()
        rec = {m: i(r.get(f"votes_{m}")) for m in MODES}
        rec["total"] = i(r.get("votes_total"))
        if cand not in candidates[year]:
            candidates[year].append(cand)
        if r.get("seats_up", "").strip():
            seats[year] = i(r["seats_up"])
        d = district_of(unit)
        bucket = town_level[year][unit] if d is None else votes[year][d]
        if cand in bucket:
            # Two CSV rows landed on the same year/unit/candidate. Assigning
            # here would silently drop the first row's votes from the district,
            # the town-wide total and every share. Sum instead, and surface it
            # -- the validator treats this as a hard error, so the two agree.
            dup_rows.append(f"{year} / {unit} / {cand}")
            for k in list(MODES) + ["total"]:
                rec[k] += bucket[cand][k]
        bucket[cand] = rec
        if r.get("ballots_cast", "").strip():
            ballots[year][unit] = i(r["ballots_cast"])

    years = sorted(votes)

    # The county may publish a town-wide mode split even when it publishes no
    # per-district one. Where present this table is authoritative for the
    # town-wide figures; per-precinct mode measures still require district-level
    # data and stay unavailable without it.
    town_modes = load_townwide_modes(TOWN_MODES)

    # ---- Town-wide totals, ranks, elected ---------------------------------
    warnings_townwide = []
    is_cand = is_candidate

    townwide = {}
    for y in years:
        agg = defaultdict(lambda: {m: 0 for m in MODES} | {"total": 0})
        for d in votes[y]:
            for c, rec in votes[y][d].items():
                for k in list(MODES) + ["total"]:
                    agg[c][k] += rec[k]
        for bucket in town_level[y]:
            for c, rec in town_level[y][bucket].items():
                for k in list(MODES) + ["total"]:
                    agg[c][k] += rec[k]
        # Prefer the declared town-wide split; verify it against the rows
        # wherever the rows carry modes too, so the two can never drift.
        # A split that does not reconcile is worse than none: it puts an
        # exact-looking breakdown behind a wrong number. Refuse to write it
        # rather than warning and applying it anyway.
        fatal = []
        covered = {c for c in agg if (y, c) in town_modes}
        uncovered = sorted(set(agg) - covered)
        if covered and uncovered:
            fatal.append(
                f"{y}: town-wide mode split covers {len(covered)} of "
                f"{len(agg)} choices; missing " + ", ".join(uncovered)
                + ". A partial split understates the field mix and inflates "
                  "every candidate's lean.")
        for c in sorted(covered):
            declared_modes = town_modes[(y, c)]
            from_rows = {m: agg[c][m] for m in MODES}
            if any(from_rows.values()) and from_rows != declared_modes:
                fatal.append(
                    f"{y} / {c}: town-wide mode split {declared_modes} "
                    f"disagrees with the sum of the rows {from_rows}.")
            if sum(declared_modes.values()) != agg[c]["total"]:
                fatal.append(
                    f"{y} / {c}: town-wide mode split sums to "
                    f"{sum(declared_modes.values())}, not the certified total "
                    f"{agg[c]['total']}.")
        if fatal:
            sys.exit("REFUSING TO BUILD -- the town-wide mode split does not "
                     "reconcile:\n  " + "\n  ".join(fatal))
        for c in covered:
            for m in MODES:
                agg[c][m] = town_modes[(y, c)][m]

        contest_votes = sum(v["total"] for v in agg.values())
        totals_only = {c: v["total"] for c, v in agg.items() if is_cand(c)}
        # Standard competition ranking: equal totals share a rank, so no
        # candidate is ordered ahead of another by name.
        rank = {}
        for c, v in totals_only.items():
            rank[c] = 1 + sum(
                1 for other in totals_only.values() if other > v)
        n_seats = seats.get(y, 0)
        elected = [c for c, rk in rank.items() if n_seats and rk <= n_seats]
        # If more candidates tie into the seat range than there are seats, the
        # contest is not resolvable from vote counts alone (NJ breaks such ties
        # by lot). Say so rather than picking one.
        seat_tie = n_seats and len(elected) > n_seats
        if seat_tie:
            cutoff = [c for c in elected
                      if sum(1 for o in totals_only.values()
                             if o > totals_only[c]) + 1 == max(
                                 rank[e] for e in elected)]
            warnings_townwide.append(
                f"{y}: {len(elected)} candidates tie into {n_seats} seat(s) "
                f"({', '.join(sorted(cutoff))}) — the certified totals do not "
                f"resolve who is seated.")
        # Present the seated candidates strongest first, ballot order within a tie.
        elected.sort(key=lambda c: (rank[c], candidates[y].index(c)))

        # What a DISTRICT row contains -- which is a different question from
        # what is known town-wide, and the one the comparability note needs.
        dist_modes = {m for d in votes[y] for rec in votes[y][d].values()
                      for m in MODES if rec[m]}
        district_basis = ("all-modes" if not dist_modes
                          else "election-day" if dist_modes == {"election_day"}
                          else "by-mode")
        # How much mode detail exists at all, and at what level. Town-level
        # BUCKET rows are mode evidence too -- dropping them would classify a
        # bucket-only year as having no modes while its fieldModes were
        # non-zero.
        bucket_modes = {m for u in town_level[y] for rec in town_level[y][u].values()
                        for m in MODES if rec[m]}
        has_town = bool(covered) and not uncovered
        mode_reported = has_town or bool(dist_modes) or bool(bucket_modes)
        coverage = ("none" if not mode_reported
                    else "district" if district_basis == "by-mode"
                    else "town-level")

        townwide[y] = {
            "seatsUp": n_seats,
            "contestVotes": contest_votes,
            "ballotsCast": sum(ballots[y].values()) or None,
            "candidates": [
                {
                    "name": c,
                    "isCandidate": is_cand(c),
                    "votes": agg[c]["total"],
                    "modes": {m: agg[c][m] for m in MODES},
                    "share": (agg[c]["total"] / contest_votes) if contest_votes else 0.0,
                    "rank": rank.get(c),
                    "elected": c in elected,
                }
                for c in candidates[y]
            ],
            "elected": elected,
            "seatTie": bool(seat_tie),
            "modeCoverage": coverage,
            "districtBasis": district_basis,
            "fieldModes": {m: sum(agg[c][m] for c in agg) for m in MODES},
            "townLevelUnits": {
                u: {
                    "ballotsCast": ballots[y].get(u),
                    "votes": {c: rec["total"] for c, rec in town_level[y][u].items()},
                    "mode": next((m for m in MODES
                                  if any(rec[m] for rec in town_level[y][u].values())),
                                 None),
                }
                for u in town_level[y]
            },
        }

    # A district row means different things in different years when one year
    # folds every mode in and another reports Election Day only.
    coverages = {y: townwide[y]["modeCoverage"] for y in years}
    bases = {y: townwide[y]["districtBasis"] for y in years}
    comparable = len(set(bases.values())) <= 1
    precinct_comparability = {
        "directlyComparable": comparable,
        "note": (
            "District rows describe the same electorate in every year."
            if comparable else
            "District rows are NOT the same electorate across years: "
            + "; ".join(
                f"{y} districts are "
                + {"election-day": "Election Day only (mail, early and "
                                   "provisional reported town-wide)",
                   "all-modes": "all modes combined",
                   "by-mode": "split by mode"}[bases[y]]
                for y in years)
            + ". Town-wide totals are directly comparable; per-precinct changes "
              "also reflect this reporting difference."),
        "byYear": coverages,
        "districtBasis": bases,
    }

    # ---- Focus candidate ---------------------------------------------------
    all_names = sorted({c for y in years for c in candidates[y]})
    focus = next((c for c in all_names if FOCUS_MATCH in c.lower()), None)

    # ---- Geometry ----------------------------------------------------------
    fc = json.load(open(GEOJSON_IN))
    feats = [ft for ft in fc["features"]
             if ft["properties"].get("municipality") == MUNICIPALITY]
    if not feats:
        sys.exit(f"no {MUNICIPALITY} features in {GEOJSON_IN}")

    out_feats = []
    geo_districts = set()
    for ft in feats:
        d = district_of(ft["properties"].get("precinct", ""))
        if d is None:
            continue
        geo_districts.add(d)
        label = f"{MUNICIPALITY} {d:02d}"
        per_year = {}
        for y in years:
            cmap = votes[y].get(d, {})
            contest = sum(rec["total"] for rec in cmap.values())
            real = {c: rec["total"] for c, rec in cmap.items() if is_cand(c)}
            top = max(real.values()) if real else None
            # A tie for first is a real outcome, not something to break by
            # name. Report every candidate on the top count and let the UI
            # say "tied" rather than inventing a single winner.
            leaders = [c for c in candidates[y] if real.get(c) == top] if real else []
            bc = ballots[y].get(label)
            per_year[str(y)] = {
                "contestVotes": contest,
                "ballotsCast": bc,
                "winner": leaders[0] if len(leaders) == 1 else None,
                "winners": leaders,
                "tied": len(leaders) > 1,
                "winnerVotes": top,
                "candidates": {
                    c: {
                        "votes": rec["total"],
                        "modes": {m: rec[m] for m in MODES},
                        "share": (rec["total"] / contest) if contest else 0.0,
                        "supportRate": (rec["total"] / bc) if bc else None,
                    }
                    for c, rec in cmap.items()
                },
            }
        out_feats.append({
            "type": "Feature",
            "geometry": ft["geometry"],
            "properties": {
                "precinct": label,
                "district": d,
                "districtLabel": f"D{d:02d}",
                "municipality": MUNICIPALITY,
                "county": ft["properties"].get("county", "Atlantic"),
                "years": per_year,
            },
        })
    out_feats.sort(key=lambda f: f["properties"]["district"])

    # Coverage check: every district in the CSV has geometry and vice versa.
    csv_districts = {d for y in years for d in votes[y]}
    warnings = list(warnings_townwide)
    if dup_rows:
        warnings.append(
            "duplicate rows summed rather than dropped (run "
            "validate_hammonton_csv.py, which rejects these): "
            + ", ".join(sorted(set(dup_rows))))
    if csv_districts - geo_districts:
        warnings.append(f"districts in CSV without geometry: "
                        f"{sorted(csv_districts - geo_districts)}")
    if geo_districts - csv_districts:
        warnings.append(f"districts with geometry but no results: "
                        f"{sorted(geo_districts - csv_districts)}")

    out = {
        "type": "FeatureCollection",
        "meta": {
            "title": "Hammonton Board of Education — certified precinct results",
            "source": ("Atlantic County certified by-district results "
                       "(Clarity `detail.xml` export)"),
            "municipality": MUNICIPALITY,
            "years": [str(y) for y in years],
            "focusCandidateDefault": focus,
            "candidatesByYear": {str(y): candidates[y] for y in years},
            "allCandidates": all_names,
            "townwide": {str(y): townwide[y] for y in years},
            "precinctComparability": precinct_comparability,
            "measured": ("All figures are certified results or direct "
                         "arithmetic from them. Nothing is modeled or projected."),
            "warnings": warnings,
        },
        "features": out_feats,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(out, f, separators=(",", ":"))

    print(f"wrote {OUT}")
    print(f"  {len(out_feats)} Hammonton districts, years {', '.join(map(str, years))}")
    print(f"  focus candidate: {focus}")
    for y in years:
        t = townwide[y]
        seated = ", ".join(t["elected"])
        print(f"  {y}: vote for {t['seatsUp']}, {t['contestVotes']:,} votes, "
              f"mode coverage = {t['modeCoverage']}")
        print(f"        elected: {seated}")
        if focus:
            me = next((c for c in t["candidates"] if c["name"] == focus), None)
            if me:
                print(f"        {focus}: {me['votes']:,} votes, rank {me['rank']}, "
                      f"{'ELECTED' if me['elected'] else 'not elected'}")
    for w in warnings:
        print(f"  WARN: {w}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

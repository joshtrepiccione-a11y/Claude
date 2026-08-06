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
spread across units. Where the county did not report something -- 2023 vote
modes, for instance -- the output records that it is unavailable rather than
inventing a value.

Two structural facts about the source data drive the schema, and both are
carried into the output so the UI can state them plainly:

  1. Vote-mode coverage differs by year. In 2021 the county reported districts
     as Election Day returns with mail / early / provisional as TOWN-LEVEL
     buckets; in 2023 it folded every mode into the district rows and published
     no split at all. `modeCoverage` per year records which it is.

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

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CSV_IN = os.path.join(ROOT, "data", "hammonton_boe_real.csv")
GEOJSON_IN = os.path.join(ROOT, "data", "atlantic_precincts.geojson")
OUT = os.path.join(ROOT, "hammonton-boe", "public", "data",
                   "hammonton_boe_precincts.geojson")

MUNICIPALITY = "Hammonton Town"
MODES = ["election_day", "early", "vbm", "provisional"]
NON_CANDIDATE = re.compile(r"write[\s-]*in|personal\s+choice", re.I)
FOCUS_MATCH = "pullia"   # case-insensitive substring; the default focus


def district_of(name: str):
    m = re.search(r"\bdist(?:rict)?\.?\s*(\d+)", name or "", re.I)
    if m:
        return int(m.group(1))
    if re.search(r"mail|prov|early|\bev\b|absentee", name or "", re.I):
        return None
    nums = re.findall(r"\d+", name or "")
    return int(nums[-1]) if nums else None


def i(v):
    v = (str(v) if v is not None else "").strip().replace(",", "")
    return int(float(v)) if v else 0


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
        if d is None:
            town_level[year][unit][cand] = rec
        else:
            votes[year][d][cand] = rec
        if r.get("ballots_cast", "").strip():
            ballots[year][unit] = i(r["ballots_cast"])

    years = sorted(votes)

    # ---- Town-wide totals, ranks, elected ---------------------------------
    def is_cand(n):
        return not NON_CANDIDATE.search(n)

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
        contest_votes = sum(v["total"] for v in agg.values())
        ranked = sorted(((v["total"], c) for c, v in agg.items() if is_cand(c)),
                        reverse=True)
        rank = {c: n for n, (_, c) in enumerate(ranked, start=1)}
        n_seats = seats.get(y, 0)
        elected = [c for c, rk in rank.items() if n_seats and rk <= n_seats]

        # Does any unit report a mode split this year?
        mode_reported = any(
            rec[m] for src in (votes[y], town_level[y]) for u in src
            for rec in src[u].values() for m in MODES)
        # Are the mode figures attributable to districts, or town-level only?
        district_mode = any(
            rec[m] for d in votes[y] for rec in votes[y][d].values() for m in MODES)
        coverage = ("none" if not mode_reported
                    else "district" if district_mode and not town_level[y]
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
            "modeCoverage": coverage,
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
    comparable = len(set(coverages.values())) <= 1
    precinct_comparability = {
        "directlyComparable": comparable,
        "note": (
            "District rows describe the same electorate in every year."
            if comparable else
            "District rows are NOT the same electorate across years: "
            + "; ".join(
                f"{y} districts are "
                + ("Election Day only (mail/early/provisional reported town-wide)"
                   if coverages[y] == "town-level"
                   else "all modes combined" if coverages[y] == "none"
                   else "split by mode")
                for y in years)
            + ". Town-wide totals are directly comparable; per-precinct changes "
              "also reflect this reporting difference."),
        "byYear": coverages,
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
            ranked = sorted(((rec["total"], c) for c, rec in cmap.items() if is_cand(c)),
                            reverse=True)
            bc = ballots[y].get(label)
            per_year[str(y)] = {
                "contestVotes": contest,
                "ballotsCast": bc,
                "winner": ranked[0][1] if ranked else None,
                "winnerVotes": ranked[0][0] if ranked else None,
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
    warnings = []
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

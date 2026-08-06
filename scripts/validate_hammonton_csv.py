#!/usr/bin/env python3
"""Validate data/hammonton_boe_real.csv against the import contract.

Mirrors scripts/validate_sheriff_csv.py in spirit, but every check here is
INTERNAL to the file plus the precinct geometry. There are no hardcoded
external vote totals to check against: the certified numbers are whatever the
CSV says, and the validator's job is to prove the file is self-consistent.

Checks:
  1. Required columns present; vote cells are non-negative integers (blank = 0).
  2. Precinct coverage: every Hammonton district in the geojson appears for
     every (year, candidate); no candidate is missing a district.
  3. Mode consistency: election_day + early + vbm + provisional == votes_total
     per row, for any row that reports modes at all.
  4. Town-wide reconcile: each candidate's summed rows equal the town-wide
     total the COUNTY declared, read from data/hammonton_boe_declared_totals.csv.
     This is the check that catches a dropped or duplicated precinct row --
     summing the rows and comparing to themselves would be circular. Skipped
     with a warning if the declared-totals file is absent.
  5. seats_up and ballots_cast are consistent within each (year[, precinct]).

Tolerated (reported as warnings, not failures):
  * A missing or all-zero provisional column.
  * A TOTALS-ONLY year: no row reports any mode split. Mode measures are then
    unavailable for that year and the app labels it as such.
  * Town-level mode rows (e.g. "Hammonton Mail-In") that carry no geometry --
    these are counted separately and excluded from the per-district reconcile.

Exit code 0 = PASS (warnings allowed), 1 = FAIL (hard errors).

Usage:
    python3 scripts/validate_hammonton_csv.py [path-to-csv]
"""

import csv
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hammonton_common import NON_CANDIDATE, district_of, to_int as _to_int  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_CSV = os.path.join(ROOT, "data", "hammonton_boe_real.csv")
DECLARED = os.path.join(ROOT, "data", "hammonton_boe_declared_totals.csv")
GEOJSON = os.path.join(ROOT, "data", "atlantic_precincts.geojson")

MUNICIPALITY = "Hammonton Town"

REQUIRED = ["year", "precinct", "candidate", "votes_total"]
MODE_COLS = [
    "votes_election_day",
    "votes_early",
    "votes_vbm",
    "votes_provisional",
]
OPTIONAL = MODE_COLS + ["ballots_cast", "seats_up"]

def to_int(v, where, errors):
    try:
        n = _to_int(v)
    except ValueError:
        errors.append(f"{where}: non-integer value {(v or '').strip()!r}")
        return 0
    if n < 0:
        errors.append(f"{where}: negative value {n}")
    return n


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV
    errors, warnings = [], []

    if not os.path.exists(path):
        print(f"FAIL: {path} not found.")
        return 1

    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        print("FAIL: file has no data rows.")
        return 1

    headers = set(rows[0].keys())
    for col in REQUIRED:
        if col not in headers:
            errors.append(f"missing required column: {col}")
    if errors:
        return _report(errors, warnings)

    present_modes = [c for c in MODE_COLS if c in headers]
    for c in MODE_COLS:
        if c not in headers:
            warnings.append(f"column {c} absent -- treated as 0 for every row.")

    # ---- Geometry: which districts must be covered? -----------------------
    fc = json.load(open(GEOJSON))
    geo_districts = set()
    for ft in fc["features"]:
        if ft["properties"].get("municipality") == MUNICIPALITY:
            d = district_of(ft["properties"].get("precinct", ""))
            if d:
                geo_districts.add(d)
    if not geo_districts:
        errors.append(f"no {MUNICIPALITY} districts found in {GEOJSON}")
        return _report(errors, warnings)

    # ---- Walk the rows ----------------------------------------------------
    # by_year[year][candidate][district] = votes_total
    by_year = {}
    town_rows = {}           # year -> {candidate -> votes} for non-geographic rows
    seats = {}               # year -> set of seats_up values seen
    ballots = {}             # (year, precinct) -> set of ballots_cast seen
    mode_reported = {}       # year -> bool, did any row carry a mode split
    prov_seen = {}           # year -> bool, any nonzero provisional
    seen_keys = set()

    for i, row in enumerate(rows, start=2):  # row 1 = header
        where = f"row {i}"
        y_raw = (row.get("year") or "").strip()
        if not y_raw.isdigit():
            errors.append(f"{where}: bad year {y_raw!r}")
            continue
        year = int(y_raw)
        precinct = (row.get("precinct") or "").strip()
        cand = (row.get("candidate") or "").strip()
        if not precinct or not cand:
            errors.append(f"{where}: blank precinct or candidate")
            continue

        key = (year, precinct, cand)
        if key in seen_keys:
            errors.append(f"{where}: duplicate row for {year} / {precinct} / {cand}")
        seen_keys.add(key)

        total = to_int(row.get("votes_total"), where, errors)
        modes = {c: to_int(row.get(c), where, errors) for c in present_modes}
        mode_sum = sum(modes.values())
        any_mode = any(v != 0 for v in modes.values())

        by_year.setdefault(year, {})
        mode_reported.setdefault(year, False)
        prov_seen.setdefault(year, False)
        if any_mode:
            mode_reported[year] = True
            # Check 3: modes must reconcile to the row total.
            if mode_sum != total:
                errors.append(
                    f"{where}: mode split {mode_sum} != votes_total {total} "
                    f"({year} / {precinct} / {cand})")
        if modes.get("votes_provisional", 0) > 0:
            prov_seen[year] = True

        seats.setdefault(year, set())
        s_raw = (row.get("seats_up") or "").strip()
        if s_raw:
            seats[year].add(to_int(s_raw, where, errors))

        b_raw = (row.get("ballots_cast") or "").strip()
        if b_raw:
            ballots.setdefault((year, precinct), set()).add(
                to_int(b_raw, where, errors))

        dist = district_of(precinct)
        if dist is None:
            town_rows.setdefault(year, {})
            town_rows[year][cand] = town_rows[year].get(cand, 0) + total
        else:
            by_year[year].setdefault(cand, {})
            if dist in by_year[year][cand]:
                errors.append(f"{where}: repeated district {dist} for {cand} in {year}")
            by_year[year][cand][dist] = total

    # ---- Check 2: coverage -------------------------------------------------
    for year in sorted(by_year):
        for cand, dmap in sorted(by_year[year].items()):
            missing = sorted(geo_districts - set(dmap))
            extra = sorted(set(dmap) - geo_districts)
            if missing:
                errors.append(
                    f"{year} / {cand}: missing district(s) "
                    + ", ".join(f"{d:02d}" for d in missing))
            if extra:
                errors.append(
                    f"{year} / {cand}: district(s) not in geojson: "
                    + ", ".join(f"{d:02d}" for d in extra))

    # ---- Check 5: seats_up / ballots_cast consistency ----------------------
    for year, vals in sorted(seats.items()):
        if not vals:
            warnings.append(f"{year}: no seats_up given -- elected/not cannot be derived.")
        elif len(vals) > 1:
            errors.append(f"{year}: conflicting seats_up values {sorted(vals)}")
    for (year, precinct), vals in sorted(ballots.items()):
        if len(vals) > 1:
            errors.append(
                f"{year} / {precinct}: conflicting ballots_cast {sorted(vals)}")
    if not ballots:
        warnings.append(
            "ballots_cast absent everywhere -- support rate (votes / ballots) "
            "cannot be computed; the app falls back to contest vote share and "
            "labels it as such.")

    # ---- Check 4: reconcile against the county's OWN town-wide totals ------
    # Summing the precinct rows and comparing that to itself would prove
    # nothing. The county publishes each candidate's town-wide total as a
    # separate figure; comparing the two is what actually catches a dropped,
    # duplicated or mistyped precinct row.
    declared = {}
    if os.path.exists(DECLARED):
        with open(DECLARED, newline="") as f:
            for r in csv.DictReader(f):
                try:
                    y = int((r.get("year") or "").strip())
                except ValueError:
                    continue
                declared[(y, (r.get("candidate") or "").strip())] = to_int(
                    r.get("declared_votes"), f"{DECLARED}", errors)
    else:
        warnings.append(
            f"{os.path.basename(DECLARED)} not found -- the town-wide "
            "reconcile is SKIPPED, so a dropped precinct row would not be "
            "caught. Generate it with ingest_clarity_detail.py.")

    print(f"Geometry: {len(geo_districts)} {MUNICIPALITY} districts "
          f"({', '.join(f'{d:02d}' for d in sorted(geo_districts))}).\n")

    for year in sorted(by_year):
        seat_n = sorted(seats.get(year, {0}))[0] if seats.get(year) else 0
        totals = {c: sum(d.values()) for c, d in by_year[year].items()}
        for c, v in town_rows.get(year, {}).items():
            totals[c] = totals.get(c, 0) + v
        contest = sum(totals.values())

        # Check 4 proper: every candidate's summed rows vs the declared total.
        years_declared = {y for (y, _) in declared}
        if year in years_declared:
            checked = 0
            for cand, summed in sorted(totals.items()):
                exp = declared.get((year, cand))
                if exp is None:
                    errors.append(
                        f"{year} / {cand}: appears in the results but has no "
                        f"declared town-wide total to reconcile against.")
                    continue
                checked += 1
                if summed != exp:
                    errors.append(
                        f"{year} / {cand}: precinct rows sum to {summed:,} but "
                        f"the county's declared town-wide total is {exp:,} "
                        f"(off by {summed - exp:+,}).")
            for (y, cand) in sorted(declared):
                if y == year and cand not in totals:
                    errors.append(
                        f"{year} / {cand}: has a declared town-wide total but "
                        f"no rows in the results file.")
            print(f"{year} -- reconciled {checked} candidate total(s) against "
                  f"the county's declared figures.")
        elif declared:
            warnings.append(
                f"{year}: no declared town-wide totals on file, so the "
                "reconcile is skipped for this year.")

        print(f"{year} -- seats up: {seat_n or '?'}   contest votes cast: {contest:,}"
              + ("   [TOTALS-ONLY: no mode split reported]"
                 if not mode_reported.get(year) else ""))
        ranked = sorted(
            ((v, c) for c, v in totals.items() if not NON_CANDIDATE.search(c)),
            reverse=True)
        for rank, (v, c) in enumerate(ranked, start=1):
            elected = "ELECTED" if seat_n and rank <= seat_n else ""
            share = (v / contest * 100) if contest else 0.0
            print(f"   {rank}. {c:24s} {v:>7,}  {share:5.2f}%  {elected}")
        for c, v in sorted(totals.items()):
            if NON_CANDIDATE.search(c):
                print(f"   -- {c:24s} {v:>7,}  (not a candidate; never seated)")
        if not mode_reported.get(year):
            warnings.append(
                f"{year}: totals-only year -- no candidate reports a mode split. "
                "Mode mix, mode lean and the mode contribution breakdown are "
                "unavailable for this year.")
        elif not prov_seen.get(year):
            warnings.append(f"{year}: provisional votes are absent or all zero.")
        if town_rows.get(year):
            print(f"   (+ {len(town_rows[year])} town-level non-geographic row(s) "
                  "-- excluded from the per-district reconcile)")
        print()

    missing_years = [y for y in (2021, 2023) if y not in by_year]
    if missing_years:
        warnings.append(
            "no rows for year(s): " + ", ".join(map(str, missing_years))
            + " -- turnaround measures need both 2021 and 2023.")

    return _report(errors, warnings)


def _report(errors, warnings):
    for w in warnings:
        print(f"WARN: {w}")
    if errors:
        for e in errors:
            print(f"FAIL: {e}")
        print(f"\n{len(errors)} error(s). Fix and re-run.")
        return 1
    print("PASS -- file is internally consistent"
          + (" (with warnings)" if warnings else "") + ".")
    return 0


if __name__ == "__main__":
    sys.exit(main())

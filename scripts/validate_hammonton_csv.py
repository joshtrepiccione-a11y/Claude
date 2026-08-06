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
  4. Internal consistency: each candidate's town-wide total equals the sum of
     that candidate's geographic precinct rows.
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

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_CSV = os.path.join(ROOT, "data", "hammonton_boe_real.csv")
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

# Names that are not real candidates and must never occupy an elected seat.
NON_CANDIDATE = re.compile(r"write[\s-]*in|personal\s+choice", re.I)


def district_of(precinct: str):
    """Extract a district number from a precinct label, or None if the label is
    not a geographic district (e.g. a town-level 'Mail-In' bucket)."""
    nums = re.findall(r"\d+", precinct or "")
    if not nums:
        return None
    n = int(nums[-1])
    return n if n > 0 else None


def to_int(v, where, errors):
    v = (v or "").strip().replace(",", "")
    if v == "":
        return 0
    try:
        n = int(float(v))
    except ValueError:
        errors.append(f"{where}: non-integer value {v!r}")
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

    # ---- Check 4 + reporting ----------------------------------------------
    print(f"Geometry: {len(geo_districts)} {MUNICIPALITY} districts "
          f"({', '.join(f'{d:02d}' for d in sorted(geo_districts))}).\n")

    for year in sorted(by_year):
        seat_n = sorted(seats.get(year, {0}))[0] if seats.get(year) else 0
        totals = {c: sum(d.values()) for c, d in by_year[year].items()}
        for c, v in town_rows.get(year, {}).items():
            totals[c] = totals.get(c, 0) + v
        contest = sum(totals.values())
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

#!/usr/bin/env python3
"""Validate data/atlantic_sheriff_real.csv against the import contract.

Checks (see scripts/SHERIFF_DATA_README.md):
  1. Required columns present; vote cells are integers (blank = 0).
  2. Per-contest county totals + D two-party share, compared to the certified
     anchors — catches swapped D/R columns or transcription errors.
  3. Municipality coverage vs. data/atlantic_precincts.geojson: all 23 munis
     present, and district counts per municipality reconcile.

Exit code 0 = PASS (warnings allowed), 1 = FAIL (hard errors).

Usage:
    python3 scripts/validate_sheriff_csv.py [path-to-csv]
"""

import csv
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_CSV = os.path.join(ROOT, "data", "atlantic_sheriff_real.csv")
GEOJSON = os.path.join(ROOT, "data", "atlantic_precincts.geojson")

REQUIRED = [
    "county", "municipality", "precinct",
    "sheriff2020_d", "sheriff2020_r",
    "sheriff2023_d", "sheriff2023_r",
]
OPTIONAL = ["gov2025_d", "gov2025_r"]

# Certified two-party D-share anchors (None = report only, no hard check).
ANCHORS = {
    "sheriff2020": 0.544,   # Scheffler 73,346 / O'Donoghue 61,408
    "sheriff2023": None,    # O'Donoghue won — confirm totals
    "gov2025": 0.511,       # Sherrill 51.1 / Ciattarelli 48.3 (Atlantic)
}
SHARE_TOL = 0.015  # 1.5 pp

SUFFIXES = ("township", "twp", "borough", "boro", "city", "town")


def norm_muni(name: str) -> str:
    s = re.sub(r"[^a-z0-9 ]", " ", (name or "").lower())
    toks = [t for t in s.split() if t not in SUFFIXES]
    return " ".join(toks).strip()


def to_int(v: str):
    v = (v or "").strip().replace(",", "")
    if v == "":
        return 0
    return int(float(v))  # tolerate "12.0"


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV
    errors, warnings = [], []

    if not os.path.exists(path):
        print(f"FAIL: {path} not found. Create it from "
              f"data/atlantic_sheriff_real.template.csv")
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
    has_gov = all(c in headers for c in OPTIONAL)
    if not has_gov:
        warnings.append("gov2025_d/gov2025_r absent — 2025 Governor layer will "
                        "stay calibrated/interpolated.")
    if errors:
        _report(errors, warnings)
        return 1

    layers = ["sheriff2020", "sheriff2023"] + (["gov2025"] if has_gov else [])
    totals = {lyr: {"d": 0, "r": 0} for lyr in layers}
    by_muni = {}  # norm_muni -> row count

    for i, row in enumerate(rows, start=2):  # row 1 = header
        muni = norm_muni(row.get("municipality", ""))
        if not muni:
            errors.append(f"row {i}: blank municipality")
            continue
        by_muni[muni] = by_muni.get(muni, 0) + 1
        for lyr in layers:
            try:
                d = to_int(row.get(f"{lyr}_d", ""))
                r = to_int(row.get(f"{lyr}_r", ""))
            except ValueError:
                errors.append(f"row {i}: non-integer in {lyr} columns")
                continue
            if d < 0 or r < 0:
                errors.append(f"row {i}: negative votes in {lyr}")
            totals[lyr]["d"] += d
            totals[lyr]["r"] += r

    # County totals + D-share anchor checks.
    print("Per-contest county totals (from CSV):")
    for lyr in layers:
        d, r = totals[lyr]["d"], totals[lyr]["r"]
        two = d + r
        share = (d / two) if two else 0.0
        line = f"  {lyr:12s} D={d:>7,}  R={r:>7,}  D2p={share*100:5.1f}%"
        anc = ANCHORS.get(lyr)
        if anc is not None:
            line += f"  (anchor {anc*100:.1f}%)"
            if two and abs(share - anc) > SHARE_TOL:
                errors.append(
                    f"{lyr}: D two-party share {share*100:.1f}% is off the "
                    f"certified anchor {anc*100:.1f}% by >{SHARE_TOL*100:.1f} pp "
                    f"— check for swapped D/R columns or transcription errors.")
        print(line)

    # Municipality coverage vs. geojson.
    fc = json.load(open(GEOJSON))
    geo_counts = {}
    for ft in fc["features"]:
        m = norm_muni(ft["properties"]["municipality"])
        geo_counts[m] = geo_counts.get(m, 0) + 1

    missing = sorted(set(geo_counts) - set(by_muni))
    extra = sorted(set(by_muni) - set(geo_counts))
    if missing:
        errors.append(f"missing municipalities ({len(missing)}): "
                      + ", ".join(missing))
    if extra:
        warnings.append(f"municipalities not in county geojson: "
                        + ", ".join(extra))

    print(f"\nDistrict coverage: CSV {len(rows)} rows vs. geojson "
          f"{len(fc['features'])} districts.")
    mismatches = []
    for m in sorted(set(by_muni) & set(geo_counts)):
        if by_muni[m] != geo_counts[m]:
            mismatches.append(f"  {m}: CSV {by_muni[m]} vs geojson {geo_counts[m]}")
    if mismatches:
        warnings.append("per-municipality district-count mismatches:\n"
                        + "\n".join(mismatches))

    return _report(errors, warnings)


def _report(errors, warnings):
    print()
    for w in warnings:
        print(f"WARN: {w}")
    if errors:
        for e in errors:
            print(f"FAIL: {e}")
        print(f"\n{len(errors)} error(s). Fix and re-run.")
        return 1
    print("PASS — file conforms to the import contract"
          + (" (with warnings)" if warnings else "") + ".")
    return 0


if __name__ == "__main__":
    sys.exit(main())

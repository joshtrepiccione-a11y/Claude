#!/usr/bin/env python3
"""Ingest real county-clerk mode-of-voting data into nj_cd2_precincts.geojson.

Workflow:
  1. Drop CSV files into data/raw/. Any number, any names ending .csv.
  2. Run:  python3 scripts/ingest.py
  3. The script overwrites the `ed_*`, `early_*`, `vbm_*` fields on
     matching precincts with real numbers and flips that precinct/mode's
     `mode_source.<mode>` from "modeled" to "real". Precincts/modes
     without provided data stay modeled.

CSV schema (header row required; column order doesn't matter):

  county      One of: Atlantic, Cape May, Cumberland, Salem, Gloucester
  precinct    Precinct name in whatever form the clerk publishes
  mode        ed | election_day | machine    -> Election Day
              early | ev                     -> Early Voting
              vbm | mail | mail_in | absentee -> Vote by Mail
  harris      D presidential votes (int)
  trump       R presidential votes (int)
  other       (optional, default 0)
  total       (optional, default harris+trump+other)

One row per (precinct, mode). Whitespace and case are forgiving.
Unmatched rows are reported but don't fail the build.
"""

from __future__ import annotations
import csv
import json
import os
import sys
from collections import defaultdict

from normalize import normalize_clerk_name, normalize_shapefile_name
from modes import apply_modeled_split

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEOJSON = os.path.join(REPO, "data", "nj_cd2_precincts.geojson")
RAW_DIR = os.path.join(REPO, "data", "raw")

MODE_ALIASES = {
    "ed": "ed", "election_day": "ed", "electionday": "ed", "machine": "ed", "polling": "ed",
    "early": "early", "ev": "early", "early_voting": "early", "earlyvoting": "early", "in_person_early": "early",
    "vbm": "vbm", "mail": "vbm", "mail_in": "vbm", "mailin": "vbm",
    "absentee": "vbm", "vote_by_mail": "vbm", "votebymail": "vbm",
}


def canonical_mode(s: str) -> str | None:
    return MODE_ALIASES.get(s.strip().lower().replace(" ", "_"))


def canonical_county(s: str) -> str:
    return s.strip().title().replace(" County", "")


def read_raw_csvs() -> dict:
    """Returns {(county, muni_slug, ward, district): {mode: {h,t,o,total,src_row}}}"""
    out: dict = defaultdict(dict)
    unmatched: list = []
    if not os.path.isdir(RAW_DIR):
        return out, unmatched
    for fname in sorted(os.listdir(RAW_DIR)):
        if not fname.lower().endswith(".csv"):
            continue
        path = os.path.join(RAW_DIR, fname)
        with open(path, newline="", encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)
            # Normalize header
            reader.fieldnames = [h.strip().lower() for h in reader.fieldnames or []]
            for i, row in enumerate(reader, start=2):
                row = {k.strip().lower(): (v or "").strip() for k, v in row.items()}
                county = canonical_county(row.get("county", ""))
                mode = canonical_mode(row.get("mode", ""))
                precinct = row.get("precinct", "")
                if not (county and mode and precinct):
                    unmatched.append((fname, i, "missing required field", row))
                    continue
                key_geom = normalize_clerk_name(precinct)
                if key_geom is None:
                    unmatched.append((fname, i, "unparseable precinct name", row))
                    continue
                try:
                    h = int(float(row.get("harris", "0") or 0))
                    t = int(float(row.get("trump", "0") or 0))
                    o = int(float(row.get("other", "0") or 0))
                except ValueError:
                    unmatched.append((fname, i, "non-numeric vote count", row))
                    continue
                tot_raw = row.get("total", "")
                tot = int(float(tot_raw)) if tot_raw else (h + t + o)
                key = (county, *key_geom)
                out[key][mode] = {"harris": h, "trump": t, "other": o, "total": tot, "src": f"{fname}:{i}"}
    return out, unmatched


def main():
    with open(GEOJSON) as fh:
        fc = json.load(fh)

    real_data, unmatched = read_raw_csvs()
    print(f"Loaded {sum(len(v) for v in real_data.values())} precinct×mode rows "
          f"from {len(real_data)} precincts in data/raw/", file=sys.stderr)

    # Reset every feature's mode fields to modeled defaults. Idempotency:
    # the final state is a deterministic function of pres_* (real) and
    # data/raw/ (real overrides) only.
    for feat in fc["features"]:
        apply_modeled_split(feat["properties"])

    # Build a lookup of geojson features by normalized key
    by_key: dict = {}
    for feat in fc["features"]:
        p = feat["properties"]
        nk = normalize_shapefile_name(p["precinct"])
        if nk is None:
            continue
        by_key[(p["county"], *nk)] = feat

    matched = 0
    overrides = 0
    for key, modes in real_data.items():
        feat = by_key.get(key)
        if feat is None:
            unmatched.append(("(join)", 0, f"no matching geojson feature for {key}", {}))
            continue
        matched += 1
        p = feat["properties"]
        ms = p.setdefault("mode_source", {"ed": "modeled", "early": "modeled", "vbm": "modeled"})
        for mode, vals in modes.items():
            p[f"{mode}_harris"] = vals["harris"]
            p[f"{mode}_trump"]  = vals["trump"]
            p[f"{mode}_other"]  = vals["other"]
            p[f"{mode}_total"]  = vals["total"]
            tot = max(1, vals["total"])
            p[f"{mode}_margin_pct"] = round((vals["harris"] - vals["trump"]) / tot * 100, 2)
            ms[mode] = "real"
            overrides += 1

    with open(GEOJSON, "w") as fh:
        json.dump(fc, fh, separators=(",", ":"))

    print(f"Matched {matched} precincts; replaced {overrides} mode tallies with real numbers.", file=sys.stderr)
    if unmatched:
        print(f"\n{len(unmatched)} rows could not be applied:", file=sys.stderr)
        for src, ln, reason, row in unmatched[:25]:
            print(f"  {src}#{ln}: {reason}  {row}", file=sys.stderr)
        if len(unmatched) > 25:
            print(f"  ... and {len(unmatched) - 25} more", file=sys.stderr)


if __name__ == "__main__":
    main()

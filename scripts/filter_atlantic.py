#!/usr/bin/env python3
"""Filter NJ-2 precinct GeoJSON down to Atlantic County and add a
`municipality` property derived from the precinct name.

Reads:  data/nj_cd2_precincts.geojson
Writes: data/atlantic_precincts.geojson

Run once after copying the NJ-2 data file into this repo. The resulting
file is what the site loads at runtime.
"""
import json
import os
import re
import sys

SRC = "data/nj_cd2_precincts.geojson"
DST = "data/atlantic_precincts.geojson"

# Strip one or more trailing whitespace-separated digit groups.
# Examples:
#   "Atlantic City 01 04"   -> "Atlantic City"
#   "Brigantine City 04"    -> "Brigantine City"
#   "Mullica Township 01"   -> "Mullica Township"
#   "Egg Harbor Township 16 02" -> "Egg Harbor Township"
TRAILING_NUMS = re.compile(r"(\s+\d+)+\s*$")


def municipality_of(precinct: str) -> str:
    return TRAILING_NUMS.sub("", precinct).strip()


def main() -> int:
    if not os.path.exists(SRC):
        print(f"missing input: {SRC}", file=sys.stderr)
        return 1
    with open(SRC, "r", encoding="utf-8") as fh:
        fc = json.load(fh)

    out_features = []
    municipalities = {}
    for feat in fc.get("features", []):
        props = feat.get("properties") or {}
        if props.get("county") != "Atlantic":
            continue
        muni = municipality_of(str(props.get("precinct", "")))
        props["municipality"] = muni
        municipalities[muni] = municipalities.get(muni, 0) + 1
        feat["properties"] = props
        out_features.append(feat)

    out = {"type": "FeatureCollection", "features": out_features}
    with open(DST, "w", encoding="utf-8") as fh:
        json.dump(out, fh)

    print(f"wrote {DST}: {len(out_features)} precincts, "
          f"{len(municipalities)} municipalities")
    for name, n in sorted(municipalities.items(), key=lambda x: (-x[1], x[0])):
        print(f"  {n:>3}  {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

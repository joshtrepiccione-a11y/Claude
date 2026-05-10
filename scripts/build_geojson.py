#!/usr/bin/env python3
"""Build data/nj_cd2_precincts.geojson from upstream sources.

Expects the working directory to contain:
  - 2024 NJ Precincts.{shp,shx,dbf,prj,cpg}  (from NJ24.zip)
  - nj02.geojson                              (from unitedstates/districts)

Writes data/nj_cd2_precincts.geojson relative to the repo root.
"""

import json
import os
import sys

import shapefile
from shapely.geometry import shape, mapping
from shapely.prepared import prep

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, "data", "nj_cd2_precincts.geojson")

WHOLE = {"Atlantic", "Cape May", "Cumberland", "Salem"}
PARTIAL = {"Burlington", "Camden", "Gloucester"}

MODES = [
    ("ed",    0.55, -8),
    ("early", 0.15, +4),
    ("vbm",   0.30, +12),
]


def split_mode(harris, trump, other, total, share, d_shift_pt):
    mode_votes = round(total * share)
    mode_other = round(other * share)
    two_way = mode_votes - mode_other
    if two_way <= 0:
        return {"harris": 0, "trump": 0, "other": mode_other, "total": mode_votes}
    base_d_pct = harris / max(1, harris + trump)
    new_d_pct = max(0.02, min(0.98, base_d_pct + d_shift_pt / 100.0))
    h = round(two_way * new_d_pct)
    t = two_way - h
    return {"harris": h, "trump": t, "other": mode_other, "total": mode_votes}


def main():
    with open("nj02.geojson") as f:
        cd2 = shape(json.load(f)["geometry"])
    cd2_prep = prep(cd2)

    r = shapefile.Reader("2024 NJ Precincts")
    features = []
    for sr in r.shapeRecords():
        cou = sr.record["CouName"]
        if cou not in WHOLE and cou not in PARTIAL:
            continue
        if cou in PARTIAL:
            rp = shape(sr.shape.__geo_interface__).representative_point()
            if not cd2_prep.contains(rp):
                continue
        geom = shape(sr.shape.__geo_interface__).simplify(0.00005, preserve_topology=True)
        h = int(sr.record["Harris"])
        t = int(sr.record["Trump"])
        o = int(sr.record["Other"])
        tot = int(sr.record["Total"])
        safe = max(1, tot)
        props = {
            "county": cou,
            "precinct": sr.record["PrecName"],
            "pres_harris": h, "pres_trump": t, "pres_other": o, "pres_total": tot,
            "pres_margin_pct": round((h - t) / safe * 100, 2),
            "pres_harris_pct": round(h / safe * 100, 2),
            "pres_trump_pct":  round(t / safe * 100, 2),
        }
        for key, share, shift in MODES:
            m = split_mode(h, t, o, tot, share, shift)
            props[f"{key}_harris"] = m["harris"]
            props[f"{key}_trump"]  = m["trump"]
            props[f"{key}_other"]  = m["other"]
            props[f"{key}_total"]  = m["total"]
            mt = max(1, m["total"])
            props[f"{key}_margin_pct"] = round((m["harris"] - m["trump"]) / mt * 100, 2)
        features.append({"type": "Feature", "properties": props, "geometry": mapping(geom)})

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f, separators=(",", ":"))
    print(f"wrote {OUT}: {len(features)} features", file=sys.stderr)


if __name__ == "__main__":
    main()

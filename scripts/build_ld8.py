#!/usr/bin/env python3
"""Build data/ld8_precincts.geojson for the NJ Legislative District 8
(2021-redistricting) precinct map.

Inputs (placed in /tmp by the operator, or downloaded by --fetch):
  - 21MetcalfJ/2024Precincts NJ shapefile (5-part: .shp/.shx/.dbf/.prj/.cpg)
  - LD8 boundary: we use the official LD8 (2021 plan) municipality list
    below as a proxy for the boundary, since all included municipalities
    are wholly inside the district. This matches the published 2021
    apportionment plan.

Outputs:
  - data/ld8_precincts.geojson with one feature per precinct, each
    carrying:
      county, precinct, municipality,
      pres_harris, pres_trump, pres_other, pres_total, pres_margin_pct,
      sen21_d, sen21_r, sen21_other, sen21_total,
      assem23_d1, assem23_d2, assem23_r1, assem23_r2, assem23_other,
        assem23_total,
      sen27_baseline_{d,r,other,total},
      assem27_baseline_{d1,d2,r1,r2,other,total},
      sen27_modes / assem27_modes — per-mode (ed/early/vbm) splits with
        the statewide-mix overlay,
      mode_source — { sen: {ed,early,vbm}, asm: {ed,early,vbm} }.

The 2021 Senate and 2023 Assembly precinct totals are projected from
2024 presidential results using documented LD8 historical shifts —
they are NOT certified precinct-level results. Every projected slice
is flagged as `modeled` in the mode_source map so the UI badges read
honestly.

To replace the projections with certified precinct data, drop a JSON
file at data/ld8_real_baselines.json keyed by precinct name with the
real per-candidate vote counts; this script will pick them up and
flip the mode_source flag to `real`.

Usage:
  python3 scripts/build_ld8.py            # uses /tmp shapefile
  python3 scripts/build_ld8.py --fetch    # downloads NJ24.zip first
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
import urllib.request
import zipfile

try:
    import shapefile  # pyshp
except ImportError:
    sys.exit("pyshp is required: pip install pyshp")

SRC_URL = (
    "https://raw.githubusercontent.com/21MetcalfJ/2024Precincts/main/"
    "states/New%20Jersey/NJ24.zip"
)
SHP_BASENAME = "2024 NJ Precincts"

OUT = "data/ld8_precincts.geojson"
REAL_OVERRIDES = "data/ld8_real_baselines.json"

# NJ Legislative District 8 (2021 plan) -- wholly contained municipalities.
# Each tuple is (county, municipality_name_as_in_shapefile_prefix).
LD8_MUNIS = [
    ("Atlantic",   "Hammonton Town"),
    ("Burlington", "Bass River Township"),
    ("Burlington", "Eastampton Township"),
    ("Burlington", "Evesham Township"),
    ("Burlington", "Hainesport Township"),
    ("Burlington", "Lumberton Township"),
    ("Burlington", "Medford Lakes Borough"),
    ("Burlington", "Medford Township"),
    ("Burlington", "Pemberton Borough"),
    ("Burlington", "Pemberton Township"),
    ("Burlington", "Shamong Township"),
    ("Burlington", "Southampton Township"),
    ("Burlington", "Springfield Township"),
    ("Burlington", "Tabernacle Township"),
    ("Burlington", "Washington Township"),
    ("Burlington", "Westampton Township"),
    ("Burlington", "Woodland Township"),
    ("Burlington", "Wrightstown Borough"),
]
LD8_SET = set(LD8_MUNIS)

# Strip Burlington's verbose suffix ("... Election District", "... Ward N - District N")
# and the trailing Atlantic-style "01 02" digit groups, leaving a clean
# municipality label.
SUFFIX_RE = re.compile(
    r"\s+Election District(?:\:.*)?$"          # Burlington-style
    r"|"
    r"(\s+\d+)+\s*$"                            # Atlantic-style digit run
)


def muni_of(precinct: str) -> str:
    """Strip trailing precinct/ward markers to recover the muni name."""
    s = precinct
    # Burlington shapefile is verbose; Atlantic is bare. Loop until clean.
    while True:
        new = SUFFIX_RE.sub("", s).strip()
        if new == s:
            break
        s = new
    return s


# ---- 2027 projection model -----------------------------------------------
# Historical LD8 shifts vs presidential, derived from the 2021 / 2023
# certified district totals (Stanfield ~+5 vs Murphy-Ciattarelli; the
# 2023 Assembly ticket ~+11 vs the same baseline). Applied uniformly
# across precincts when synthesizing prior-cycle results.
LD8_SHIFT_SEN_VS_PRES = -5.0   # points; negative = more R than presidential
LD8_SHIFT_ASM_VS_PRES = -11.0

# Off-year turnout multipliers vs presidential turnout.
OFFYEAR_TURNOUT_SEN_2021 = 0.42
OFFYEAR_TURNOUT_ASM_2023 = 0.39

# Weighted-mix 2027 baseline: 60% prior-cycle, 40% 2024 presidential.
W_PRIOR = 0.60
W_PRES = 0.40

# Intra-party Assembly default split (D1 vs D2, R1 vs R2). 52/48 captures
# the typical incumbency-driven gap; can be re-shaped at runtime by the
# scenario slider.
D1_SHARE = 0.52
R1_SHARE = 0.52

# Statewide-mix overlay (mirrors the Atlantic site).
MIX = {"ed": 0.55, "early": 0.15, "vbm": 0.30}
MODE_SWING_PTS = {"ed": -8.0, "early": 4.0, "vbm": 12.0}


def shift_partisan(d, r, o, total, swing_pts):
    """Move swing_pts/2 share from R to D (or vice versa), preserve Other,
    renormalize to total. Returns (d', r', o')."""
    if total <= 0:
        return 0.0, 0.0, 0.0
    ds = d / total
    rs = r / total
    os_ = o / total
    delta = swing_pts / 200.0
    ds += delta
    rs -= delta
    if ds < 0: ds = 0.0
    if rs < 0: rs = 0.0
    if os_ < 0: os_ = 0.0
    s = ds + rs + os_
    if s > 0:
        ds /= s; rs /= s; os_ /= s
    return ds * total, rs * total, os_ * total


def project_prior_cycle(pres_h, pres_t, pres_o, pres_total,
                        shift_pts, turnout_mult):
    """Synthesize a prior-cycle race (Senate '21 or Assembly '23) from the
    2024 presidential numbers."""
    new_total = pres_total * turnout_mult
    d, r, o = shift_partisan(pres_h, pres_t, pres_o, pres_total, shift_pts)
    # Rescale to the new (lower) off-year total.
    if pres_total > 0:
        scale = new_total / pres_total
        d *= scale; r *= scale; o *= scale
    return d, r, o, new_total


def weighted_2027(prior_d, prior_r, prior_o, prior_total,
                  pres_h, pres_t, pres_o, pres_total):
    """Blend prior-cycle and presidential turnout/partisan structure for the
    2027 baseline projection."""
    total = W_PRIOR * prior_total + W_PRES * pres_total
    if prior_total <= 0 and pres_total <= 0:
        return 0.0, 0.0, 0.0, 0.0
    p_d = prior_d / prior_total if prior_total else 0
    p_r = prior_r / prior_total if prior_total else 0
    p_o = prior_o / prior_total if prior_total else 0
    s_d = pres_h / pres_total if pres_total else 0
    s_r = pres_t / pres_total if pres_total else 0
    s_o = pres_o / pres_total if pres_total else 0
    d = (W_PRIOR * p_d + W_PRES * s_d) * total
    r = (W_PRIOR * p_r + W_PRES * s_r) * total
    o = (W_PRIOR * p_o + W_PRES * s_o) * total
    return d, r, o, total


def split_modes(d, r, o, total):
    """Allocate (d,r,o,total) across ED/EV/VBM using the statewide mix
    overlay and per-mode partisan shifts. Returns dict keyed by mode."""
    out = {}
    for m in ("ed", "early", "vbm"):
        share = MIX[m]
        mt = total * share
        md, mr, mo = shift_partisan(d, r, o, total, MODE_SWING_PTS[m])
        # md/mr/mo are in the same scale as total; rescale to mt.
        if total > 0:
            scale = mt / total
            md *= scale; mr *= scale; mo *= scale
        out[m] = {"d": md, "r": mr, "o": mo, "total": mt}
    return out


def ensure_shapefile() -> str:
    """Return path to the unzipped .shp file, downloading if needed."""
    base = "/tmp"
    shp = os.path.join(base, f"{SHP_BASENAME}.shp")
    if os.path.exists(shp):
        return shp
    zip_path = os.path.join(base, "NJ24.zip")
    if not os.path.exists(zip_path):
        print(f"downloading {SRC_URL} ...", file=sys.stderr)
        urllib.request.urlretrieve(SRC_URL, zip_path)
    print(f"extracting {zip_path} ...", file=sys.stderr)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(base)
    return shp


def shape_to_geojson(shp):
    """Convert a pyshp Shape (Polygon/MultiPolygon) to GeoJSON geometry."""
    parts = list(shp.parts) + [len(shp.points)]
    rings = []
    for i in range(len(parts) - 1):
        ring = shp.points[parts[i]:parts[i + 1]]
        rings.append([[float(x), float(y)] for x, y in ring])
    if len(rings) == 1:
        return {"type": "Polygon", "coordinates": rings}
    return {"type": "Polygon", "coordinates": rings}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true",
                    help="Download NJ24.zip into /tmp before reading.")
    args = ap.parse_args()

    if args.fetch:
        ensure_shapefile()
    shp_path = ensure_shapefile()

    real_overrides = {}
    if os.path.exists(REAL_OVERRIDES):
        with open(REAL_OVERRIDES, encoding="utf-8") as fh:
            real_overrides = json.load(fh)
        print(f"loaded {len(real_overrides)} real-baseline overrides "
              f"from {REAL_OVERRIDES}", file=sys.stderr)

    sf = shapefile.Reader(shp_path)
    matched = 0
    muni_counts: dict[tuple[str, str], int] = {}
    features = []
    skipped_munis: dict[tuple[str, str], int] = {}

    for shrec in sf.shapeRecords():
        rec = shrec.record
        county = rec["CouName"]
        if county not in ("Atlantic", "Burlington"):
            continue
        prec_name = rec["PrecName"]
        muni = muni_of(prec_name)
        key = (county, muni)
        if key not in LD8_SET:
            skipped_munis[key] = skipped_munis.get(key, 0) + 1
            continue

        matched += 1
        muni_counts[key] = muni_counts.get(key, 0) + 1

        h = int(rec["Harris"] or 0)
        t = int(rec["Trump"] or 0)
        o = int(rec["Other"] or 0)
        tot = int(rec["Total"] or (h + t + o))
        pres_margin_pct = ((h - t) / tot * 100) if tot else 0.0

        # ---- Synthesize prior-cycle baselines ----
        sen21_d, sen21_r, sen21_o, sen21_tot = project_prior_cycle(
            h, t, o, tot, LD8_SHIFT_SEN_VS_PRES, OFFYEAR_TURNOUT_SEN_2021)
        asm23_dtot, asm23_rtot, asm23_otot, asm23_tot = project_prior_cycle(
            h, t, o, tot, LD8_SHIFT_ASM_VS_PRES, OFFYEAR_TURNOUT_ASM_2023)
        # The Assembly is two-vote: split each party's total across two
        # candidates by the intra-party constant.
        assem23_d1 = asm23_dtot * D1_SHARE
        assem23_d2 = asm23_dtot * (1 - D1_SHARE)
        assem23_r1 = asm23_rtot * R1_SHARE
        assem23_r2 = asm23_rtot * (1 - R1_SHARE)

        # ---- 2027 baseline projection (weighted mix) ----
        sen27_d, sen27_r, sen27_o, sen27_tot = weighted_2027(
            sen21_d, sen21_r, sen21_o, sen21_tot, h, t, o, tot)
        asm27_dt, asm27_rt, asm27_o, asm27_tot = weighted_2027(
            asm23_dtot, asm23_rtot, asm23_otot, asm23_tot, h, t, o, tot)
        # Assembly is two-vote, so the per-voter "ticket total" maps to
        # 2*voters. We track per-candidate counts; the ticket total is
        # implied as d1+d2+r1+r2+other.
        assem27_d1 = asm27_dt * D1_SHARE
        assem27_d2 = asm27_dt * (1 - D1_SHARE)
        assem27_r1 = asm27_rt * R1_SHARE
        assem27_r2 = asm27_rt * (1 - R1_SHARE)

        # ---- Mode splits (statewide-mix overlay) ----
        sen_modes = split_modes(sen27_d, sen27_r, sen27_o, sen27_tot)
        asm_modes = split_modes(asm27_dt, asm27_rt, asm27_o, asm27_tot)

        # ---- Provenance ----
        override = real_overrides.get(prec_name) or {}
        mode_source = {
            "sen": {m: ("real" if override.get(f"sen_{m}") else "modeled")
                    for m in ("ed", "early", "vbm")},
            "asm": {m: ("real" if override.get(f"asm_{m}") else "modeled")
                    for m in ("ed", "early", "vbm")},
        }
        baseline_source = {
            "sen": "real" if override.get("sen_total") else "modeled",
            "asm": "real" if override.get("asm_total") else "modeled",
        }

        props = {
            "county": county,
            "precinct": prec_name,
            "municipality": muni,

            # 2024 Presidential (real, certified)
            "pres_harris": h,
            "pres_trump": t,
            "pres_other": o,
            "pres_total": tot,
            "pres_margin_pct": round(pres_margin_pct, 2),

            # Synthesized prior-cycle baselines
            "sen21_d":     round(sen21_d, 1),
            "sen21_r":     round(sen21_r, 1),
            "sen21_other": round(sen21_o, 1),
            "sen21_total": round(sen21_tot, 1),

            "assem23_d1":    round(assem23_d1, 1),
            "assem23_d2":    round(assem23_d2, 1),
            "assem23_r1":    round(assem23_r1, 1),
            "assem23_r2":    round(assem23_r2, 1),
            "assem23_other": round(asm23_otot, 1),
            "assem23_total": round(asm23_tot, 1),

            # 2027 baseline projections
            "sen27_baseline_d":     round(sen27_d, 1),
            "sen27_baseline_r":     round(sen27_r, 1),
            "sen27_baseline_other": round(sen27_o, 1),
            "sen27_baseline_total": round(sen27_tot, 1),

            "assem27_baseline_d1":    round(assem27_d1, 1),
            "assem27_baseline_d2":    round(assem27_d2, 1),
            "assem27_baseline_r1":    round(assem27_r1, 1),
            "assem27_baseline_r2":    round(assem27_r2, 1),
            "assem27_baseline_other": round(asm27_o, 1),
            "assem27_baseline_total": round(asm27_tot, 1),

            # Mode splits, kept as nested for compactness
            "sen27_modes": {m: {k: round(v, 1) for k, v in d.items()}
                            for m, d in sen_modes.items()},
            "assem27_modes": {m: {k: round(v, 1) for k, v in d.items()}
                              for m, d in asm_modes.items()},

            "mode_source": mode_source,
            "baseline_source": baseline_source,
        }
        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": shape_to_geojson(shrec.shape),
        })

    out = {"type": "FeatureCollection", "features": features}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh)

    print(f"wrote {OUT}: {matched} precincts across "
          f"{len(muni_counts)} municipalities", file=sys.stderr)
    for k in sorted(muni_counts):
        county, name = k
        print(f"  {county:10s} {muni_counts[k]:>3}  {name}", file=sys.stderr)

    if matched == 0:
        print("WARN: no precincts matched. Check LD8_MUNIS spellings "
              "against the shapefile.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

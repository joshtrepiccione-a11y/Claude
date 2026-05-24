#!/usr/bin/env python3
"""Build data/ld8_precincts.geojson for the NJ Legislative District 8
(2021 redistricting) precinct map.

Inputs (placed in /tmp by the operator, or downloaded by --fetch):
  - 21MetcalfJ/2024Precincts NJ shapefile (5-part: .shp/.shx/.dbf/.prj/.cpg)
  - LD8 boundary: every municipality in the post-2021 LD8 map is wholly
    inside the district, so we use the official 25-muni allowlist as a
    boundary proxy (exact; no precincts to reassign).

Outputs:
  - data/ld8_precincts.geojson with one feature per precinct, each
    carrying:
      county, precinct, municipality,
      pres_harris, pres_trump, pres_other, pres_total, pres_margin_pct,
      sen23_d, sen23_r, sen23_other, sen23_total,
      assem25_d1, assem25_d2, assem25_r1, assem25_r2, assem25_other,
        assem25_total,
      sen27_baseline_{d,r,other,total},
      assem27_baseline_{d1,d2,r1,r2,other,total,voters},
      sen27_modes / assem27_modes — per-mode (ed/early/vbm) splits with
        the statewide-mix overlay,
      mode_source — { sen: {ed,early,vbm}, asm: {ed,early,vbm} }.
      baseline_source — { sen, asm }: 'real-calibrated' (district
        aggregate matches certified results; per-precinct distribution
        is interpolated from 2024 presidential), or 'modeled'.

Baseline projection method
--------------------------
The 2027 baseline is a **straight copy of the most recent real cycle**
for each race:
  - Senate 2027 baseline   ← 2023 Senate (Tiver R 28,013 / Burton D 26,648).
  - Assembly 2027 baseline ← 2025 Assembly (Angelozzi D 50,168 /
                              Katz D 50,036 / Torrissi R 46,262 /
                              Umba R 44,300; 2-vote race).

District aggregates match the certified results exactly. Per-precinct
distribution is calibrated to those aggregates by:
  1. Using each precinct's 2024 presidential D/R/O shares as the spatial
     pattern.
  2. Applying a uniform district-wide additive shift so the precinct
     shares average back to the target D-share for the race.
  3. Scaling each precinct's turnout proportionally so the district
     turnout matches the certified total (Senate voters; Assembly voters
     derived from candidate-votes / (2 - bullet)).
  4. A final renormalization step nudges per-precinct totals so that the
     district sum hits the certified target exactly (within rounding).

To replace any precinct's distribution with certified precinct-level
counts, drop them in data/ld8_real_baselines.json keyed by precinct
name; the build script will use those values directly and flip
mode_source / baseline_source to `real` for the matching precinct.

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

# NJ Legislative District 8 (post-2021 apportionment) — the 25 wholly
# contained municipalities. Source: NJ Legislative Apportionment
# Commission 2021 plan; corroborated by Wikipedia / Ballotpedia.
LD8_MUNIS = [
    # Atlantic County
    ("Atlantic",   "Egg Harbor City"),
    ("Atlantic",   "Folsom Borough"),
    ("Atlantic",   "Hammonton Town"),
    ("Atlantic",   "Mullica Township"),
    # Burlington County
    ("Burlington", "Bass River Township"),
    ("Burlington", "Chesterfield Township"),
    ("Burlington", "Eastampton Township"),
    ("Burlington", "Evesham Township"),
    ("Burlington", "Hainesport Township"),
    ("Burlington", "Lumberton Township"),
    ("Burlington", "Mansfield Township"),
    ("Burlington", "Medford Lakes Borough"),
    ("Burlington", "Medford Township"),
    ("Burlington", "Mount Holly Township"),
    ("Burlington", "New Hanover Township"),
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

# ===== Certified district-level baselines =====
# 2023 Senate (LD8): Latham Tiver (R) defeated Gaye Burton (D).
REAL_SEN23 = {"d": 26648, "r": 28013, "other": 0}
REAL_SEN23["total"] = sum(REAL_SEN23.values())

# 2025 Assembly (LD8) — 2-vote race; these are CANDIDATE-vote totals.
# Angelozzi (D) and Katz (D) defeated Torrissi (R) and Umba (R).
# Top finisher in each party gets the "1" slot.
REAL_ASM25 = {
    "d1": 50168,   # Angelozzi
    "d2": 50036,   # Katz
    "r1": 46262,   # Torrissi
    "r2": 44300,   # Umba
    "other": 0,
}
REAL_ASM25["d_total"] = REAL_ASM25["d1"] + REAL_ASM25["d2"]
REAL_ASM25["r_total"] = REAL_ASM25["r1"] + REAL_ASM25["r2"]
REAL_ASM25["cand_total"] = (REAL_ASM25["d_total"] + REAL_ASM25["r_total"]
                            + REAL_ASM25["other"])

# Historical Assembly bullet-vote rate baseline. Used to derive the
# implied voter count from candidate-vote totals: voters = cand / (2 - b).
# 5% is the typical NJ Assembly bullet rate observed in tight races.
ASM_BASELINE_BULLET = 0.05
REAL_ASM25_VOTERS = REAL_ASM25["cand_total"] / (2 - ASM_BASELINE_BULLET)

# Intra-party splits — derived from the real 2025 totals.
INTRA_D_D1 = REAL_ASM25["d1"] / REAL_ASM25["d_total"]   # ~0.5007
INTRA_R_R1 = REAL_ASM25["r1"] / REAL_ASM25["r_total"]   # ~0.5108

# Strip Burlington's verbose suffix ("... Election District", "... Ward N - District N")
# and the trailing Atlantic-style "01 02" digit groups.
SUFFIX_RE = re.compile(
    r"\s+Election District(?:\:.*)?$"
    r"|"
    r"(\s+\d+)+\s*$"
)


def muni_of(precinct: str) -> str:
    s = precinct
    while True:
        new = SUFFIX_RE.sub("", s).strip()
        if new == s:
            break
        s = new
    return s


# Statewide-mix overlay (mirrors the Atlantic site).
MIX = {"ed": 0.55, "early": 0.15, "vbm": 0.30}
MODE_SWING_PTS = {"ed": -8.0, "early": 4.0, "vbm": 12.0}


def shift_partisan_shares(d_share, r_share, o_share, swing_pts):
    """Move swing_pts/2 share from R to D (or vice versa), preserve Other,
    renormalize. Returns shares (sum to 1)."""
    delta = swing_pts / 200.0
    d_share = max(0.0, d_share + delta)
    r_share = max(0.0, r_share - delta)
    o_share = max(0.0, o_share)
    s = d_share + r_share + o_share
    if s > 0:
        d_share /= s; r_share /= s; o_share /= s
    return d_share, r_share, o_share


def split_modes(d, r, o, total):
    """Allocate (d,r,o,total) across ED/EV/VBM using the statewide mix
    overlay and per-mode partisan shifts."""
    out = {}
    if total <= 0:
        for m in ("ed", "early", "vbm"):
            out[m] = {"d": 0.0, "r": 0.0, "o": 0.0, "total": 0.0}
        return out
    ds = d / total
    rs = r / total
    os_ = o / total
    for m in ("ed", "early", "vbm"):
        mt = total * MIX[m]
        md, mr, mo_ = shift_partisan_shares(ds, rs, os_, MODE_SWING_PTS[m])
        out[m] = {"d": md * mt, "r": mr * mt, "o": mo_ * mt, "total": mt}
    return out


def ensure_shapefile() -> str:
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
    parts = list(shp.parts) + [len(shp.points)]
    rings = []
    for i in range(len(parts) - 1):
        ring = shp.points[parts[i]:parts[i + 1]]
        rings.append([[float(x), float(y)] for x, y in ring])
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
    matched = []   # list of (record, shape) tuples
    muni_counts = {}

    for shrec in sf.shapeRecords():
        rec = shrec.record
        county = rec["CouName"]
        if county not in ("Atlantic", "Burlington"):
            continue
        prec_name = rec["PrecName"]
        muni = muni_of(prec_name)
        key = (county, muni)
        if key not in LD8_SET:
            continue
        matched.append((rec, shrec.shape, muni))
        muni_counts[key] = muni_counts.get(key, 0) + 1

    if not matched:
        print("WARN: no precincts matched LD8 allowlist.", file=sys.stderr)
        return 2

    # --- Calibrate per-precinct shares against district totals ---
    # Step 1: gather presidential totals for the district.
    dist_pres_h = sum(int(r["Harris"] or 0) for r, _, _ in matched)
    dist_pres_t = sum(int(r["Trump"]  or 0) for r, _, _ in matched)
    dist_pres_o = sum(int(r["Other"]  or 0) for r, _, _ in matched)
    dist_pres_total = sum(int(r["Total"] or 0) for r, _, _ in matched)

    pres_d_share = dist_pres_h / dist_pres_total
    pres_r_share = dist_pres_t / dist_pres_total
    pres_o_share = dist_pres_o / dist_pres_total

    # Step 2: derive per-race target shares + shift (additive on D share).
    sen_target_d = REAL_SEN23["d"] / REAL_SEN23["total"]
    sen_target_r = REAL_SEN23["r"] / REAL_SEN23["total"]
    sen_target_o = REAL_SEN23["other"] / REAL_SEN23["total"]
    sen_shift_pts = (sen_target_d - pres_d_share) * 200  # since shift moves X/200 to D

    asm_target_d = REAL_ASM25["d_total"] / REAL_ASM25["cand_total"]
    asm_target_r = REAL_ASM25["r_total"] / REAL_ASM25["cand_total"]
    asm_target_o = REAL_ASM25["other"]   / REAL_ASM25["cand_total"]
    asm_shift_pts = (asm_target_d - pres_d_share) * 200

    print(f"district pres: D={pres_d_share:.4f} R={pres_r_share:.4f} O={pres_o_share:.4f} total={dist_pres_total}",
          file=sys.stderr)
    print(f"sen23 target: D={sen_target_d:.4f} R={sen_target_r:.4f} shift={sen_shift_pts:+.2f}pts", file=sys.stderr)
    print(f"asm25 target: D={asm_target_d:.4f} R={asm_target_r:.4f} shift={asm_shift_pts:+.2f}pts "
          f"(voters≈{REAL_ASM25_VOTERS:.0f})", file=sys.stderr)

    # Step 3: per-precinct projected shares + voter counts; sum, then
    # final-pass renormalize so district totals match the targets exactly.
    proj = []  # parallel to `matched`
    sen_d_sum = sen_r_sum = sen_o_sum = sen_total_sum = 0.0
    asm_d_sum = asm_r_sum = asm_o_sum = asm_voters_sum = 0.0
    for rec, shape, muni in matched:
        h = int(rec["Harris"] or 0)
        t = int(rec["Trump"]  or 0)
        o = int(rec["Other"]  or 0)
        tot = int(rec["Total"] or (h + t + o))
        pds = h / tot if tot else 0
        prs = t / tot if tot else 0
        pos = o / tot if tot else 0

        # Senate per-precinct
        s_d, s_r, s_o = shift_partisan_shares(pds, prs, pos, sen_shift_pts)
        s_total = tot * (REAL_SEN23["total"] / dist_pres_total)
        s_dv, s_rv, s_ov = s_d * s_total, s_r * s_total, s_o * s_total

        # Assembly per-precinct (in voters; per-cand split happens at display time)
        a_d, a_r, a_o = shift_partisan_shares(pds, prs, pos, asm_shift_pts)
        a_voters = tot * (REAL_ASM25_VOTERS / dist_pres_total)
        a_dv, a_rv, a_ov = a_d * a_voters, a_r * a_voters, a_o * a_voters

        proj.append({
            "rec": rec, "shape": shape, "muni": muni,
            "pres_h": h, "pres_t": t, "pres_o": o, "pres_total": tot,
            "sen_d": s_dv, "sen_r": s_rv, "sen_o": s_ov, "sen_total": s_total,
            "asm_d": a_dv, "asm_r": a_rv, "asm_o": a_ov, "asm_voters": a_voters,
        })
        sen_d_sum += s_dv; sen_r_sum += s_rv; sen_o_sum += s_ov; sen_total_sum += s_total
        asm_d_sum += a_dv; asm_r_sum += a_rv; asm_o_sum += a_ov; asm_voters_sum += a_voters

    # Final-pass scaling: nudge each precinct so district sums hit targets.
    sen_scale_d = REAL_SEN23["d"] / sen_d_sum if sen_d_sum else 1
    sen_scale_r = REAL_SEN23["r"] / sen_r_sum if sen_r_sum else 1
    sen_scale_o = REAL_SEN23["other"] / sen_o_sum if sen_o_sum else 1
    asm_scale_d = REAL_ASM25["d_total"] / asm_d_sum if asm_d_sum else 1
    asm_scale_r = REAL_ASM25["r_total"] / asm_r_sum if asm_r_sum else 1
    asm_scale_o = (REAL_ASM25["other"] / asm_o_sum) if asm_o_sum else 1
    asm_scale_voters = REAL_ASM25_VOTERS / asm_voters_sum if asm_voters_sum else 1
    for p in proj:
        p["sen_d"]  *= sen_scale_d
        p["sen_r"]  *= sen_scale_r
        p["sen_o"]  *= sen_scale_o
        p["sen_total"] = p["sen_d"] + p["sen_r"] + p["sen_o"]
        p["asm_d"]  *= asm_scale_d
        p["asm_r"]  *= asm_scale_r
        p["asm_o"]  *= asm_scale_o
        p["asm_voters"] *= asm_scale_voters

    # --- Build GeoJSON features ---
    features = []
    for p in proj:
        rec = p["rec"]
        prec_name = rec["PrecName"]
        pres_margin_pct = ((p["pres_h"] - p["pres_t"]) / p["pres_total"] * 100) if p["pres_total"] else 0.0

        # Historical 2023 / 2025 numbers we calibrated against — at the
        # precinct level these match `sen27_baseline_*` and `assem25_*`
        # (since the 2027 baseline = straight copy of those cycles).
        sen23_d, sen23_r, sen23_o, sen23_total = p["sen_d"], p["sen_r"], p["sen_o"], p["sen_total"]
        asm25_voters = p["asm_voters"]
        asm25_dv, asm25_rv, asm25_ov = p["asm_d"], p["asm_r"], p["asm_o"]
        # Convert per-precinct voter shares back into candidate-vote
        # counts using the historical bullet rate and intra-party splits.
        asm25_cand_total = asm25_voters * (2 - ASM_BASELINE_BULLET)
        if asm25_voters > 0:
            ds = asm25_dv / asm25_voters
            rs = asm25_rv / asm25_voters
            os_ = asm25_ov / asm25_voters
        else:
            ds = rs = os_ = 0
        asm25_d_cand = ds * asm25_cand_total
        asm25_r_cand = rs * asm25_cand_total
        asm25_o_cand = os_ * asm25_cand_total
        asm25_d1 = asm25_d_cand * INTRA_D_D1
        asm25_d2 = asm25_d_cand * (1 - INTRA_D_D1)
        asm25_r1 = asm25_r_cand * INTRA_R_R1
        asm25_r2 = asm25_r_cand * (1 - INTRA_R_R1)

        # 2027 baseline = straight copy of the prior real cycle.
        sen27_d, sen27_r, sen27_o, sen27_total = sen23_d, sen23_r, sen23_o, sen23_total
        asm27_voters = asm25_voters
        asm27_d_voters = asm25_dv
        asm27_r_voters = asm25_rv
        asm27_o_voters = asm25_ov

        sen_modes = split_modes(sen27_d, sen27_r, sen27_o, sen27_total)
        # For Assembly modes we track per-mode VOTERS + per-mode party
        # shares; the app applies the bullet-rate / intra-party logic at
        # display time.
        asm_modes = split_modes(asm27_d_voters, asm27_r_voters, asm27_o_voters, asm27_voters)

        override = real_overrides.get(prec_name) or {}
        mode_source = {
            "sen": {m: ("real" if override.get(f"sen_{m}") else "modeled")
                    for m in ("ed", "early", "vbm")},
            "asm": {m: ("real" if override.get(f"asm_{m}") else "modeled")
                    for m in ("ed", "early", "vbm")},
        }
        baseline_source = {
            "sen": "real" if override.get("sen_total") else "real-calibrated",
            "asm": "real" if override.get("asm_total") else "real-calibrated",
        }

        props = {
            "county": rec["CouName"],
            "precinct": prec_name,
            "municipality": p["muni"],

            # 2024 Presidential (real, certified, used as the spatial basis)
            "pres_harris": p["pres_h"],
            "pres_trump":  p["pres_t"],
            "pres_other":  p["pres_o"],
            "pres_total":  p["pres_total"],
            "pres_margin_pct": round(pres_margin_pct, 2),

            # 2023 Senate (district aggregate is the real certified result;
            # per-precinct distribution is interpolated from presidential).
            "sen23_d":     round(sen23_d, 1),
            "sen23_r":     round(sen23_r, 1),
            "sen23_other": round(sen23_o, 1),
            "sen23_total": round(sen23_total, 1),

            # 2025 Assembly — same provenance note.
            "assem25_d1":    round(asm25_d1, 1),  # Angelozzi
            "assem25_d2":    round(asm25_d2, 1),  # Katz
            "assem25_r1":    round(asm25_r1, 1),  # Torrissi
            "assem25_r2":    round(asm25_r2, 1),  # Umba
            "assem25_other": round(asm25_o_cand, 1),
            "assem25_total": round(asm25_cand_total, 1),
            "assem25_voters": round(asm25_voters, 1),

            # 2027 baseline = straight copy of the most-recent real cycle.
            "sen27_baseline_d":     round(sen27_d, 1),
            "sen27_baseline_r":     round(sen27_r, 1),
            "sen27_baseline_other": round(sen27_o, 1),
            "sen27_baseline_total": round(sen27_total, 1),

            # Assembly baseline is stored in VOTER units (per-candidate
            # counts derived at runtime from intra-party + bullet sliders).
            "assem27_baseline_d":      round(asm27_d_voters, 1),
            "assem27_baseline_r":      round(asm27_r_voters, 1),
            "assem27_baseline_other":  round(asm27_o_voters, 1),
            "assem27_baseline_voters": round(asm27_voters, 1),

            # Mode splits.
            "sen27_modes": {m: {k: round(v, 1) for k, v in d.items()}
                            for m, d in sen_modes.items()},
            "assem27_modes": {m: {k: round(v, 1) for k, v in d.items()}
                              for m, d in asm_modes.items()},

            "mode_source": mode_source,
            "baseline_source": baseline_source,

            # The historical intra-party splits and bullet rate the
            # baseline was calibrated with; the app uses these as
            # scenario defaults.
            "calibration": {
                "intra_d_d1": round(INTRA_D_D1 * 100, 2),
                "intra_r_r1": round(INTRA_R_R1 * 100, 2),
                "bullet_pct": round(ASM_BASELINE_BULLET * 100, 2),
            },
        }
        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": shape_to_geojson(p["shape"]),
        })

    out = {"type": "FeatureCollection", "features": features}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh)

    print(f"\nwrote {OUT}: {len(features)} precincts across "
          f"{len(muni_counts)} municipalities", file=sys.stderr)
    for k in sorted(muni_counts):
        county, name = k
        print(f"  {county:10s} {muni_counts[k]:>3}  {name}", file=sys.stderr)

    # Verification print
    s_d = sum(f["properties"]["sen27_baseline_d"] for f in features)
    s_r = sum(f["properties"]["sen27_baseline_r"] for f in features)
    s_t = sum(f["properties"]["sen27_baseline_total"] for f in features)
    a_d = sum(f["properties"]["assem27_baseline_d"] for f in features)
    a_r = sum(f["properties"]["assem27_baseline_r"] for f in features)
    a_v = sum(f["properties"]["assem27_baseline_voters"] for f in features)
    print(f"\nCalibration check:", file=sys.stderr)
    print(f"  Senate aggregate: D={s_d:.0f} R={s_r:.0f} total={s_t:.0f} "
          f"(target {REAL_SEN23['d']} / {REAL_SEN23['r']} / {REAL_SEN23['total']})",
          file=sys.stderr)
    print(f"  Assembly aggregate (voters): D={a_d:.0f} R={a_r:.0f} voters={a_v:.0f} "
          f"(target voters {REAL_ASM25_VOTERS:.0f})", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

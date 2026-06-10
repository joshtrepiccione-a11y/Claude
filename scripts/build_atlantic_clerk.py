#!/usr/bin/env python3
"""Build the Atlantic County Clerk precinct GeoJSON for the v3-clerk app.

Reads data/atlantic_precincts.geojson (151 Atlantic County precincts with
2024 presidential results and ED/EV/VBM mode slices) and emits
v3-clerk/public/data/atlantic_clerk_precincts.geojson with a 2026 County
Clerk baseline calibrated to the certified 2021 County Clerk result:

    Joseph J. Giralo (R)   43,346
    Lisa Jiampetti (D)     34,930
    (R +10.75 two-party; 78,276 two-party votes county-wide)

Method (same approach as scripts/build_ld8.py):
  1. Each precinct's 2024 presidential two-party D share gives the spatial
     pattern.
  2. A uniform county-wide additive shift is applied so the turnout-weighted
     average D share hits the certified 2021 two-party D share (44.63%).
  3. Per-precinct turnout is scaled uniformly so the county total equals the
     certified 78,276 two-party votes, then a final renormalisation nudges
     the D and R columns so county sums match the certified totals exactly.
  4. Mode (ED/EV/VBM) slices reuse each precinct's presidential mode pattern
     with the same uniform shift, rescaled so mode sums match the precinct
     totals. Mode slices are tagged "modeled".

Write-ins/other are not carried (no certified county-wide figure was used);
the baseline is the certified two-party result.
"""

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "data", "atlantic_precincts.geojson")
OUT = os.path.join(HERE, "..", "v3-clerk", "public", "data", "atlantic_clerk_precincts.geojson")

# Certified 2021 Atlantic County Clerk general election totals.
CLERK_R_2021 = 43346  # Joseph J. Giralo (R)
CLERK_D_2021 = 34930  # Lisa Jiampetti (D)
CLERK_TOTAL = CLERK_D_2021 + CLERK_R_2021
TARGET_D_SHARE = CLERK_D_2021 / CLERK_TOTAL

MODES = ("ed", "early", "vbm")


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def main():
    with open(SRC) as f:
        fc = json.load(f)

    feats = fc["features"]

    # Per-precinct two-party presidential pattern.
    rows = []
    for ft in feats:
        p = ft["properties"]
        d = p["pres_harris"]
        r = p["pres_trump"]
        two = d + r
        rows.append({
            "feat": ft,
            "d2p": (d / two) if two else 0.5,
            "two": two,
        })

    county_two = sum(x["two"] for x in rows)
    turnout_k = CLERK_TOTAL / county_two

    # Solve the uniform shift delta so the turnout-weighted clamped D share
    # averages to the certified target. Clamping rarely binds; iterate to
    # convergence anyway.
    delta = TARGET_D_SHARE - sum(x["d2p"] * x["two"] for x in rows) / county_two
    for _ in range(40):
        wsum = sum(clamp(x["d2p"] + delta, 0.02, 0.98) * x["two"] for x in rows)
        err = TARGET_D_SHARE - wsum / county_two
        if abs(err) < 1e-10:
            break
        delta += err

    # Provisional precinct totals, then exact renormalisation per column.
    for x in rows:
        t = x["two"] * turnout_k
        dsh = clamp(x["d2p"] + delta, 0.02, 0.98)
        x["t"] = t
        x["dv"] = t * dsh
        x["rv"] = t * (1 - dsh)

    d_k = CLERK_D_2021 / sum(x["dv"] for x in rows)
    r_k = CLERK_R_2021 / sum(x["rv"] for x in rows)

    # Largest-remainder rounding so county sums match certified exactly.
    def round_column(key, scale, target):
        vals = [x[key] * scale for x in rows]
        floors = [int(v) for v in vals]
        rem = sorted(range(len(vals)), key=lambda i: vals[i] - floors[i], reverse=True)
        short = target - sum(floors)
        for i in rem[:short]:
            floors[i] += 1
        return floors

    d_final = round_column("dv", d_k, CLERK_D_2021)
    r_final = round_column("rv", r_k, CLERK_R_2021)

    out_feats = []
    for x, dv, rv in zip(rows, d_final, r_final):
        ft = x["feat"]
        p = ft["properties"]
        total = dv + rv

        # Mode slices: precinct's presidential mode pattern + same shift,
        # rescaled so the mode columns sum to the precinct totals.
        mt_raw, md_raw = {}, {}
        for m in MODES:
            mt = p[f"{m}_total"]
            mdv = p[f"{m}_harris"]
            mrv = p[f"{m}_trump"]
            m2 = mdv + mrv
            dsh = clamp(((mdv / m2) if m2 else x["d2p"]) + delta, 0.02, 0.98)
            mt_raw[m] = mt
            md_raw[m] = dsh
        t_sum = sum(mt_raw.values()) or 1
        modes = {}
        m_totals = {m: total * mt_raw[m] / t_sum for m in MODES}
        d_prov = {m: m_totals[m] * md_raw[m] for m in MODES}
        d_scale = dv / (sum(d_prov.values()) or 1)
        for m in MODES:
            mdv = min(m_totals[m], d_prov[m] * d_scale)
            modes[m] = {
                "d": round(mdv, 1),
                "r": round(m_totals[m] - mdv, 1),
                "o": 0,
                "total": round(m_totals[m], 1),
            }

        out_feats.append({
            "type": "Feature",
            "geometry": ft["geometry"],
            "properties": {
                "county": p["county"],
                "precinct": p["precinct"],
                "municipality": p["municipality"],
                "clerk_baseline_d": dv,
                "clerk_baseline_r": rv,
                "clerk_baseline_other": 0,
                "clerk_baseline_total": total,
                "clerk_modes": modes,
                "baseline_source": {"clerk": "calibrated"},
                "mode_source": p.get("mode_source", {m: "modeled" for m in MODES}),
            },
        })

    out = {
        "type": "FeatureCollection",
        "calibration": {
            "race": "Atlantic County Clerk",
            "baseline_cycle": 2021,
            "certified": {"giralo_r": CLERK_R_2021, "jiampetti_d": CLERK_D_2021},
            "spatial_pattern": "2024 presidential two-party shares",
            "uniform_shift_pp": round(delta * 100, 3),
            "turnout_scale": round(turnout_k, 5),
        },
        "features": out_feats,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(out, f, separators=(",", ":"))

    sd = sum(f["properties"]["clerk_baseline_d"] for f in out_feats)
    sr = sum(f["properties"]["clerk_baseline_r"] for f in out_feats)
    print(f"precincts: {len(out_feats)}")
    print(f"uniform shift: {delta * 100:+.2f} pp; turnout scale: {turnout_k:.4f}")
    print(f"county D: {sd} (target {CLERK_D_2021})  county R: {sr} (target {CLERK_R_2021})")
    assert sd == CLERK_D_2021 and sr == CLERK_R_2021


if __name__ == "__main__":
    main()

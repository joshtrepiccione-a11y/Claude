#!/usr/bin/env python3
"""Build the Atlantic County Sheriff precinct GeoJSON for the v3-sheriff app.

Calibrates three contest layers to REAL certified MUNICIPALITY-level results
from data/atlantic_sheriff_real.csv:

  sheriff2020 : 2020 Sheriff — Scheffler (D) def. O'Donoghue (R)   [presidential-year / high turnout]
  sheriff2023 : 2023 Sheriff — O'Donoghue (R) def. Scheffler (D)   [off-year / low turnout]
  gov2025     : 2025 Governor — Sherrill (D) vs Ciattarelli (R)    [recent environment signal]

Each municipality's certified D/R totals are distributed across that
municipality's precincts using the precinct's 2024 presidential two-party
pattern (turnout weight + D-share), with a uniform within-municipality shift so
the precinct D-shares average back to the municipality's real D-share, then
largest-remainder rounding so EVERY municipality's precinct sums match the
certified totals exactly. Per-precinct ED/EV/VBM mode slices reuse the
precinct's 2024 presidential mode pattern.

Provenance: municipality totals are REAL (certified); within-municipality
precinct distribution is CALIBRATED (interpolated). 2024 presidential is passed
through per precinct as a reference/environment layer.

Output: v3-sheriff/public/data/atlantic_sheriff_precincts.geojson
"""

import csv
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GEO = os.path.join(ROOT, "data", "atlantic_precincts.geojson")
CSV = os.path.join(ROOT, "data", "atlantic_sheriff_real.csv")
OUT = os.path.join(ROOT, "v3-sheriff", "public", "data", "atlantic_sheriff_precincts.geojson")

LAYERS = ["sheriff2020", "sheriff2023", "gov2025"]
MODES = ("ed", "early", "vbm")
SUFFIXES = ("township", "twp", "borough", "boro", "city", "town")


def base_name(name: str):
    s = re.sub(r"[^a-z0-9 ]", " ", (name or "").lower())
    toks = s.split()
    suffix = toks[-1] if toks and toks[-1] in SUFFIXES else ""
    base = " ".join(t for t in toks if t not in SUFFIXES)
    return base, suffix


def join_municipalities(csv_munis, geo_munis):
    """Map each CSV municipality name to its exact GeoJSON name."""
    geo_by_full = {m.lower(): m for m in geo_munis}
    geo_by_base = {}
    for m in geo_munis:
        b, suf = base_name(m)
        geo_by_base.setdefault(b, []).append((suf, m))
    mapping = {}
    for cm in csv_munis:
        if cm.lower() in geo_by_full:           # exact match (e.g. Egg Harbor City)
            mapping[cm] = geo_by_full[cm.lower()]
            continue
        b, suf = base_name(cm)
        cands = geo_by_base.get(b, [])
        if len(cands) == 1:
            mapping[cm] = cands[0][1]
        else:
            # disambiguate by suffix class (township vs city/borough/town)
            want_twp = suf in ("township", "twp")
            pick = [g for s, g in cands if (s in ("township", "twp")) == want_twp]
            if len(pick) != 1:
                raise SystemExit(f"ambiguous municipality join for {cm!r}: {cands}")
            mapping[cm] = pick[0]
    return mapping


def lr_round(weights, target):
    """Largest-remainder integer allocation of `target` over float `weights`."""
    target = int(round(target))
    s = sum(weights)
    if s <= 0:
        out = [0] * len(weights)
        for i in range(target):
            out[i % len(weights)] += 1
        return out
    raw = [target * w / s for w in weights]
    floors = [int(x) for x in raw]
    rem = target - sum(floors)
    order = sorted(range(len(raw)), key=lambda i: raw[i] - floors[i], reverse=True)
    for i in order[:rem]:
        floors[i] += 1
    return floors


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def main():
    fc = json.load(open(GEO))
    feats = fc["features"]
    rows = list(csv.DictReader(open(CSV)))

    csv_munis = [r["municipality"] for r in rows]
    geo_munis = sorted({f["properties"]["municipality"] for f in feats})
    m2geo = join_municipalities(csv_munis, geo_munis)
    certified = {m2geo[r["municipality"]]: r for r in rows}

    # Group precinct features by municipality.
    by_muni = {}
    for ft in feats:
        by_muni.setdefault(ft["properties"]["municipality"], []).append(ft)
    assert set(by_muni) == set(certified), (
        f"muni mismatch: {set(by_muni) ^ set(certified)}")

    # result[precinct][layer] = {"d":int,"r":int,"modes":{...}}
    result = {ft["properties"]["precinct"]: {} for ft in feats}

    for layer in LAYERS:
        for muni, group in by_muni.items():
            cer = certified[muni]
            Dm = int(cer[f"{layer}_d"] or 0)
            Rm = int(cer[f"{layer}_r"] or 0)
            total_m = Dm + Rm

            # presidential two-party turnout weight + D-share per precinct
            w, dshare = [], []
            for ft in group:
                p = ft["properties"]
                h, t = p["pres_harris"], p["pres_trump"]
                two = h + t
                w.append(two)
                dshare.append((h / two) if two else 0.5)
            sw = sum(w) or 1.0
            wn = [x / sw for x in w]

            # uniform within-muni shift so turnout-weighted D-share hits target
            tgt = (Dm / total_m) if total_m else 0.5
            delta = tgt - sum(wn[i] * dshare[i] for i in range(len(group)))
            for _ in range(60):
                cur = sum(wn[i] * clamp(dshare[i] + delta, 0.02, 0.98) for i in range(len(group)))
                err = tgt - cur
                if abs(err) < 1e-12:
                    break
                delta += err

            # provisional per-precinct D and turnout, then exact LR rounding
            prov_d, prov_turn = [], []
            for i in range(len(group)):
                turn = total_m * wn[i]
                ds = clamp(dshare[i] + delta, 0.02, 0.98)
                prov_turn.append(turn)
                prov_d.append(turn * ds)
            d_int = lr_round(prov_d, Dm)
            r_prov = [prov_turn[i] - prov_d[i] for i in range(len(group))]
            r_int = lr_round(r_prov, Rm)

            for i, ft in enumerate(group):
                pid = ft["properties"]["precinct"]
                p = ft["properties"]
                # mode weights from presidential pattern, per party
                dw = [max(0.0, p[f"{m}_harris"]) for m in MODES]
                rw = [max(0.0, p[f"{m}_trump"]) for m in MODES]
                dmode = lr_round(dw, d_int[i])
                rmode = lr_round(rw, r_int[i])
                modes = {}
                for k, m in enumerate(MODES):
                    modes[m] = {"d": dmode[k], "r": rmode[k], "o": 0,
                                "total": dmode[k] + rmode[k]}
                result[pid][layer] = {
                    "d": d_int[i], "r": r_int[i],
                    "total": d_int[i] + r_int[i], "modes": modes,
                }

    # Build output features.
    out_feats = []
    for ft in feats:
        p = ft["properties"]
        pid = p["precinct"]
        props = {
            "county": p["county"],
            "precinct": pid,
            "municipality": p["municipality"],
            "pres2024_d": p["pres_harris"],
            "pres2024_r": p["pres_trump"],
            "baseline_source": {lyr: "muni-real / precinct-calibrated" for lyr in LAYERS},
        }
        for lyr in LAYERS:
            r = result[pid][lyr]
            props[f"{lyr}_d"] = r["d"]
            props[f"{lyr}_r"] = r["r"]
            props[f"{lyr}_total"] = r["total"]
            props[f"{lyr}_modes"] = r["modes"]
        out_feats.append({"type": "Feature", "geometry": ft["geometry"], "properties": props})

    out = {
        "type": "FeatureCollection",
        "calibration": {
            "race": "Atlantic County Sheriff",
            "target_year": 2026,
            "layers": {
                "sheriff2020": "2020 Sheriff (presidential-year electorate)",
                "sheriff2023": "2023 Sheriff (off-year electorate)",
                "gov2025": "2025 Governor (recent environment signal)",
            },
            "anchor_level": "municipality (23) — certified totals",
            "precinct_distribution": "2024 presidential pattern, uniform per-muni shift",
            "county_totals": {lyr: {
                "d": sum(int(r[f"{lyr}_d"] or 0) for r in rows),
                "r": sum(int(r[f"{lyr}_r"] or 0) for r in rows),
            } for lyr in LAYERS},
        },
        "features": out_feats,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w"), separators=(",", ":"))

    # ---- verification ----
    print(f"precincts: {len(out_feats)}  municipalities: {len(by_muni)}")
    ok = True
    for lyr in LAYERS:
        cd = sum(f["properties"][f"{lyr}_d"] for f in out_feats)
        cr = sum(f["properties"][f"{lyr}_r"] for f in out_feats)
        td = sum(int(r[f"{lyr}_d"] or 0) for r in rows)
        tr = sum(int(r[f"{lyr}_r"] or 0) for r in rows)
        two = cd + cr
        share = cd / two * 100 if two else 0
        match = (cd == td and cr == tr)
        ok &= match
        print(f"  {lyr:12s} D={cd:>7,} R={cr:>7,}  D2p={share:5.1f}%  "
              f"{'WIN:'+('D' if cd>cr else 'R'):6s} county-match={match}")
    # per-muni exactness
    muni_ok = True
    for muni, group in by_muni.items():
        for lyr in LAYERS:
            gd = sum(result[ft['properties']['precinct']][lyr]['d'] for ft in group)
            gr = sum(result[ft['properties']['precinct']][lyr]['r'] for ft in group)
            cer = certified[muni]
            if gd != int(cer[f"{lyr}_d"] or 0) or gr != int(cer[f"{lyr}_r"] or 0):
                muni_ok = False
                print(f"  MUNI MISMATCH {muni} {lyr}: {gd}/{gr} vs {cer[f'{lyr}_d']}/{cer[f'{lyr}_r']}")
    print(f"per-municipality exact match: {muni_ok}")
    assert ok and muni_ok, "calibration did not reproduce certified totals exactly"
    print(f"wrote {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()

"""Shared mode-of-voting model.

The fallback / modeled split applied to a precinct's certified
presidential totals when real per-mode data isn't available.

Methodology: NJ 2024 statewide turnout by mode was approximately
55% Election Day, 30% Vote by Mail, 15% Early Voting, with a strong
partisan skew (R-leaning on Election Day, D-leaning by mail).
We apply the statewide mix uniformly per precinct, with the
two-way D-R margin shifted by mode.
"""

MODES = [
    # (key, share_of_turnout, dem_shift_pp_vs_baseline)
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


def apply_modeled_split(props: dict) -> None:
    """Reset ed_*, early_*, vbm_* fields and mode_source to the modeled
    defaults derived from pres_* fields."""
    h = props["pres_harris"]
    t = props["pres_trump"]
    o = props["pres_other"]
    tot = props["pres_total"]
    for key, share, shift in MODES:
        m = split_mode(h, t, o, tot, share, shift)
        props[f"{key}_harris"] = m["harris"]
        props[f"{key}_trump"]  = m["trump"]
        props[f"{key}_other"]  = m["other"]
        props[f"{key}_total"]  = m["total"]
        mt = max(1, m["total"])
        props[f"{key}_margin_pct"] = round((m["harris"] - m["trump"]) / mt * 100, 2)
    props["mode_source"] = {"ed": "modeled", "early": "modeled", "vbm": "modeled"}

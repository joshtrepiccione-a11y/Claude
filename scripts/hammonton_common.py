"""Shared helpers for the Hammonton BOE scripts.

These live in one place because the ingest, the validator and the builder must
agree exactly on how a reporting-unit label is classified. When each script
carried its own copy of `district_of`, they drifted: the validator's version
lacked the mail/early/provisional guard, so a town-level bucket whose label
happens to contain a digit ("Hammonton EV 2") was a geographic district to the
validator and a town-level bucket to the builder. The coverage check only means
something if all three classify identically.
"""

import csv
import os
import re

MODES = ["election_day", "early", "vbm", "provisional"]

MODE_LABEL = {
    "election_day": "Election Day",
    "early": "Early Voting",
    "vbm": "Vote by Mail",
    "provisional": "Provisional",
}

# Ballot lines that are counted in the totals but can never occupy a seat.
NON_CANDIDATE = re.compile(r"write[\s-]*in|personal\s+choice", re.I)

# A label naming a vote-mode bucket rather than a place.
_MODE_BUCKET = re.compile(r"mail|prov|early|\bev\b|absentee", re.I)
_EXPLICIT_DISTRICT = re.compile(r"\bdist(?:rict)?\.?\s*(\d+)", re.I)


def district_of(name):
    """District number if the label names a geographic district, else None.

    An explicit "Dist N" wins outright. Otherwise any mode-bucket wording means
    the unit is town-level, even when the label carries digits. Only then does
    the trailing-number fallback apply.
    """
    name = name or ""
    m = _EXPLICIT_DISTRICT.search(name)
    if m:
        return int(m.group(1))
    if _MODE_BUCKET.search(name):
        return None
    nums = re.findall(r"\d+", name)
    return int(nums[-1]) if nums else None


def is_candidate(name):
    return not NON_CANDIDATE.search(name or "")


def to_int(v):
    """Parse a vote cell. Blank is 0; '12.0' and '1,234' are tolerated."""
    v = (str(v) if v is not None else "").strip().replace(",", "")
    if v == "":
        return 0
    return int(float(v))


# ---- Shared loaders -------------------------------------------------------
# The builder and the validator MUST read these files identically. Keeping the
# parsing here is the same lesson `district_of` taught: two copies drift, and
# a drifted classifier produced a real bug.

def load_townwide_modes(path):
    """(year, candidate) -> {mode: votes}. Empty dict when the file is absent."""
    out = {}
    if not os.path.exists(path):
        return out
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            try:
                year = int((r.get("year") or "").strip())
            except ValueError:
                continue
            cand = (r.get("candidate") or "").strip()
            out[(year, cand)] = {m: to_int(r.get(f"votes_{m}")) for m in MODES}
    return out


def load_field_modes(path):
    """year -> {mode: votes}, the county's published field totals per mode."""
    out = {}
    if not os.path.exists(path):
        return out
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            try:
                year = int((r.get("year") or "").strip())
            except ValueError:
                continue
            mode = (r.get("mode") or "").strip()
            if mode in MODES:
                out.setdefault(year, {})[mode] = to_int(r.get("votes"))
    return out

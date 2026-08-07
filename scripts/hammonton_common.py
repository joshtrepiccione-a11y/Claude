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

class DataFileError(Exception):
    """A data file is malformed in a way that would silently lose votes."""


def load_townwide_modes(path):
    """(year, candidate) -> {mode: votes}. Empty dict when the file is absent.

    Raises on a duplicate key: overwriting would apply the last row and drop
    the first with no diagnostic, which is precisely how a stale copy-pasted
    split would sneak in. Every other reader in this pipeline rejects
    duplicates; these loaders must not be the lax ones.
    """
    out = {}
    if not os.path.exists(path):
        return out
    with open(path, newline="") as f:
        for n, r in enumerate(csv.DictReader(f), start=2):
            raw = (r.get("year") or "").strip()
            if not raw:
                continue
            try:
                year = int(raw)
            except ValueError:
                raise DataFileError(
                    f"{path} row {n}: unparseable year {raw!r}")
            cand = (r.get("candidate") or "").strip()
            if (year, cand) in out:
                raise DataFileError(
                    f"{path} row {n}: duplicate entry for {year} / {cand}")
            out[(year, cand)] = {m: to_int(r.get(f"votes_{m}")) for m in MODES}
    return out


def load_field_modes(path):
    """year -> {mode: votes}, the county's published field totals per mode."""
    out = {}
    if not os.path.exists(path):
        return out
    with open(path, newline="") as f:
        for n, r in enumerate(csv.DictReader(f), start=2):
            raw = (r.get("year") or "").strip()
            if not raw:
                continue
            try:
                year = int(raw)
            except ValueError:
                raise DataFileError(
                    f"{path} row {n}: unparseable year {raw!r}")
            mode = (r.get("mode") or "").strip()
            if mode not in MODES:
                raise DataFileError(
                    f"{path} row {n}: unknown mode {mode!r}")
            if mode in out.get(year, {}):
                raise DataFileError(
                    f"{path} row {n}: duplicate entry for {year} / {mode}")
            out.setdefault(year, {})[mode] = to_int(r.get("votes"))
    return out

#!/usr/bin/env python3
"""Convert a Clarity `detail.xml` election export into the long-format rows of
data/hammonton_boe_real.csv.

This exists so the certified numbers are MACHINE-transcribed straight from the
county's own export -- nothing is retyped by hand, so there is no transcription
risk. Point it at a new year's export and that year drops in unchanged.

    python3 scripts/ingest_clarity_detail.py detail.xml --contest "Local BOE- Hammonton"

Output goes to stdout as CSV rows (no header) unless --merge is given, in which
case the rows are merged into data/hammonton_boe_real.csv, replacing any rows
already present for that year.

How Clarity reports vote modes
------------------------------
Atlantic County's export encodes vote mode in the PRECINCT NAME rather than as
a VoteType dimension. A contest's precinct list looks like:

    Hammonton Dist 01 ... Dist 07     <- polling place (Election Day) returns
    Hammonton Mail-in                 <- town-level, not attributable to a district
    Hammonton EV                      <- town-level
    Hammonton Provisional             <- town-level
    Hammonton EV Prov                 <- town-level

So a district row carries only that district's Election Day votes, and the
mail / early / provisional votes exist ONLY as town-wide buckets. This script
records exactly that and never spreads a town-level bucket across districts.

If a future export uses real VoteType children (named "Election Day",
"Mail-in", "Early Voting", "Provisional"), the mode split is read from those
instead and written per district -- handled automatically below.
"""

import argparse
import csv
import os
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hammonton_common import district_of, to_int  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_CSV = os.path.join(ROOT, "data", "hammonton_boe_real.csv")
DEFAULT_DECLARED = os.path.join(ROOT, "data",
                                "hammonton_boe_declared_totals.csv")

HEADER = ["year", "precinct", "candidate", "votes_total", "votes_election_day",
          "votes_early", "votes_vbm", "votes_provisional", "ballots_cast",
          "seats_up"]

# Precinct-name -> vote mode, for exports that encode mode in the name.
MODE_PATTERNS = [
    (re.compile(r"\bev\s*prov", re.I), "provisional"),
    (re.compile(r"\bprovisional\b", re.I), "provisional"),
    (re.compile(r"mail[\s-]*in|absentee|vbm", re.I), "vbm"),
    (re.compile(r"\bev\b|early", re.I), "early"),
]
# VoteType names -> mode, for exports that use a real VoteType dimension.
VOTETYPE_MODES = {
    "election day": "election_day", "election": "election_day",
    "mail-in": "vbm", "mail in": "vbm", "absentee": "vbm", "absentee/mail": "vbm",
    "early voting": "early", "early": "early", "advance in person": "early",
    "provisional": "provisional",
}


def mode_of(name: str):
    for pat, mode in MODE_PATTERNS:
        if pat.search(name):
            return mode
    return "election_day"


def clean(text: str) -> str:
    """'- MICKEY PULLIA' -> 'Mickey Pullia'; leave write-in labels readable."""
    s = re.sub(r"^[\s\-–]+", "", (text or "").strip())
    s = re.sub(r"\s+", " ", s)
    if s.isupper():
        s = " ".join(w.capitalize() if len(w) > 1 else w for w in s.split())
        # Restore common intercaps the naive capitalize() flattens.
        s = re.sub(r"\bMc([a-z])", lambda m: "Mc" + m.group(1).upper(), s)
        s = re.sub(r"\bO'([a-z])", lambda m: "O'" + m.group(1).upper(), s)
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xml")
    ap.add_argument("--contest", required=True,
                    help="Contest 'text' attribute, or a substring of it.")
    ap.add_argument("--year", type=int, default=None,
                    help="Override the year (default: from <ElectionDate>).")
    ap.add_argument("--precinct-prefix", default="Hammonton Town",
                    help="How to label geographic districts in the CSV.")
    ap.add_argument("--merge", action="store_true",
                    help="Merge into data/hammonton_boe_real.csv.")
    ap.add_argument("--csv", default=DEFAULT_CSV)
    ap.add_argument("--declared", default=DEFAULT_DECLARED,
                    help="Where to record the county's own town-wide totals.")
    args = ap.parse_args()

    root = ET.parse(args.xml).getroot()
    date = (root.findtext("ElectionDate") or "").strip()
    year = args.year or int(re.search(r"(\d{4})", date).group(1))

    matches = [c for c in root.findall("Contest")
               if c.get("text") == args.contest
               or args.contest.lower() in (c.get("text") or "").lower()]
    if not matches:
        sys.exit(f"no contest matching {args.contest!r}. Available:\n  "
                 + "\n  ".join(sorted(c.get("text") or "" for c in root.findall("Contest"))))
    if len(matches) > 1:
        sys.exit("ambiguous --contest; matched: "
                 + ", ".join(c.get("text") for c in matches))
    contest = matches[0]
    seats = int(contest.get("voteFor") or 0)

    # ballotsCast per precinct, from the election-wide turnout block.
    ballots = {}
    vt = root.find("VoterTurnout")
    if vt is not None and vt.find("Precincts") is not None:
        for p in vt.find("Precincts").findall("Precinct"):
            ballots[p.get("name")] = int(p.get("ballotsCast") or 0)

    # cell[(precinct, candidate)][mode] = votes
    cell, precincts, candidates = {}, [], []
    uses_votetype_modes = False
    for ch in contest.findall("Choice"):
        cand = clean(ch.get("text"))
        if cand not in candidates:
            candidates.append(cand)
        for vtype in ch.findall("VoteType"):
            vmode = VOTETYPE_MODES.get((vtype.get("name") or "").strip().lower())
            if vmode and vmode != "election_day":
                uses_votetype_modes = True
            for p in vtype.findall("Precinct"):
                pname = p.get("name")
                if pname not in precincts:
                    precincts.append(pname)
                votes = int(p.get("votes") or 0)
                # Mode comes from the VoteType when the export provides one,
                # otherwise from the precinct label.
                mode = vmode if vmode else mode_of(pname)
                if vmode == "election_day" and not uses_votetype_modes:
                    mode = mode_of(pname)
                k = (pname, cand)
                cell.setdefault(k, {})
                cell[k][mode] = cell[k].get(mode, 0) + votes

    rows = []
    for pname in precincts:
        d = district_of(pname)
        label = (f"{args.precinct_prefix} {d:02d}" if d is not None
                 else pname.strip())
        for cand in candidates:
            modes = cell.get((pname, cand), {})
            total = sum(modes.values())
            rows.append({
                "year": year,
                "precinct": label,
                "candidate": cand,
                "votes_total": total,
                "votes_election_day": modes.get("election_day", 0) or "",
                "votes_early": modes.get("early", 0) or "",
                "votes_vbm": modes.get("vbm", 0) or "",
                "votes_provisional": modes.get("provisional", 0) or "",
                "ballots_cast": ballots.get(pname, "") or "",
                "seats_up": seats or "",
            })

    # Collapse duplicate labels (e.g. two provisional buckets mapping to one
    # town-level row) by summing -- the validator forbids duplicate keys.
    merged = {}
    for r in rows:
        k = (r["year"], r["precinct"], r["candidate"])
        if k in merged:
            prev = merged[k]
            for f in ("votes_total", "votes_election_day", "votes_early",
                      "votes_vbm", "votes_provisional"):
                a, b = prev[f] or 0, r[f] or 0
                prev[f] = (int(a) + int(b)) or ""
            prev["votes_total"] = int(prev["votes_total"] or 0)
            # ballots_cast adds across collapsed buckets too.
            a, b = prev["ballots_cast"] or 0, r["ballots_cast"] or 0
            prev["ballots_cast"] = (int(a) + int(b)) or ""
        else:
            merged[k] = r
    out = list(merged.values())

    sys.stderr.write(
        f"{year}: contest {contest.get('text')!r}, vote for {seats}, "
        f"{len(candidates)} choices, {len(precincts)} reporting units "
        f"({sum(1 for p in precincts if district_of(p) is not None)} districts + "
        f"{sum(1 for p in precincts if district_of(p) is None)} town-level), "
        f"{len(out)} rows.\n")
    if not uses_votetype_modes:
        sys.stderr.write(
            "  NOTE: export encodes mode in precinct names, so district rows are "
            "Election Day only and mail/early/provisional are town-level.\n")

    if args.merge:
        # The county publishes each candidate's town-wide total as its own
        # figure, separate from the district lines. Recording it lets the
        # validator reconcile the two -- which is what catches a dropped or
        # duplicated precinct row. Summing the districts here instead would
        # make the check circular and worthless.
        declared = []
        if os.path.exists(args.declared):
            with open(args.declared, newline="") as f:
                declared = [r for r in csv.DictReader(f)
                            if (r.get("year") or "").strip() != str(year)]
        for ch in contest.findall("Choice"):
            declared.append({
                "year": year,
                "candidate": clean(ch.get("text")),
                "declared_votes": int(ch.get("totalVotes") or 0),
                "source": "Clarity detail.xml Choice/@totalVotes",
            })
        with open(args.declared, "w", newline="") as f:
            w = csv.DictWriter(
                f, fieldnames=["year", "candidate", "declared_votes", "source"])
            w.writeheader()
            for r in sorted(declared, key=lambda r: (int(r["year"]),
                                                     str(r["candidate"]))):
                w.writerow(r)
        sys.stderr.write(f"  declared totals -> {args.declared}\n")

        existing = []
        if os.path.exists(args.csv):
            with open(args.csv, newline="") as f:
                existing = [r for r in csv.DictReader(f)
                            if (r.get("year") or "").strip() != str(year)]
        with open(args.csv, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=HEADER)
            w.writeheader()
            for r in sorted(existing + out,
                            key=lambda r: (int(r["year"]), str(r["precinct"]))):
                w.writerow({k: r.get(k, "") for k in HEADER})
        sys.stderr.write(f"  merged into {args.csv}\n")
    else:
        w = csv.DictWriter(sys.stdout, fieldnames=HEADER)
        for r in out:
            w.writerow(r)
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Ingest Atlantic County's "Condensed - Website" results workbook.

    python3 scripts/ingest_boe_workbook.py "2023 General Election Results - Condensed - Website.xlsx" \
            --sheet Hammonton \
            --contest "Members of the Local Board of Education" \
            --year 2023 [--merge]

The county publishes the same election twice, in two different shapes:

  * the results **website**, which is where `data/hammonton_boe_real.csv`'s 2023
    district totals came from -- every mode folded into the district row; and
  * this **workbook**, one sheet per municipality, which splits each district
    into Election Day / Vote by Mail and reports Early Voting, Provisionals and
    a "Handcount - VBM" line as town-level rows.

The workbook carries one figure the website page does not: the **Public Count**
block, ballots cast per district per mode. That is the denominator the support
rate needs, and it is the only thing this script writes into the CSV.

Everything else the workbook contains is read anyway and used to *check* the
data already in the repo -- eight reconciles across three files. The numbers are
machine-transcribed from the workbook, never retyped, and `--merge` refuses to
write if any check fails.

One documented disagreement between the two publications survives, by design:
the workbook's `Handcount - VBM` row gives Fallon, Lolio and McCloud one extra
vote each, which the website's district page and its field-mode totals both
exclude. The repo stays on the website basis -- it is the basis every other
published figure reconciles against -- and the script reports the difference
rather than silently adopting either side. See README.md.
"""

import argparse
import csv
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hammonton_common import (  # noqa: E402
    MODES, district_of, load_field_modes, load_townwide_modes, to_int)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CSV_PATH = os.path.join(ROOT, "data", "hammonton_boe_real.csv")
DECLARED = os.path.join(ROOT, "data", "hammonton_boe_declared_totals.csv")
TOWN_MODES = os.path.join(ROOT, "data", "hammonton_boe_townwide_modes.csv")
FIELD_MODES = os.path.join(ROOT, "data", "hammonton_boe_field_modes.csv")

# Column headers the workbook uses, mapped onto this repo's mode keys. The
# candidate block and the Public Count block label the same modes differently
# ("Election Day" vs "Machine"), so both spellings resolve here.
HEADER_TO_MODE = {
    "election day": "election_day",
    "machine": "election_day",
    "early voting": "early",
    "vote by mail": "vbm",
    "provisional": "provisional",
    "provisionals": "provisional",
}
# The town-level rows below the districts, by their label in column A.
TOWN_ROW_LABELS = {
    "total": "total",
    "early voting": "early",
    "provisionals": "provisional",
    "handcount - vbm": "handcount_vbm",
    "grand total": "grand_total",
}
PUBLIC_COUNT_TITLE = "public count"


def norm(v):
    """Squash a header cell to a comparable key."""
    return re.sub(r"\s+", " ", str(v or "").strip()).casefold()


def alnum(v):
    return re.sub(r"[^a-z0-9]", "", str(v or "").casefold())


class Bail(Exception):
    """The workbook does not have the shape this script knows how to read."""


# ---- Locating things in the sheet ----------------------------------------
# Nothing below is addressed by a hardcoded row or column number. The sheet is
# a merged-cell layout of ~80 columns holding eight unrelated contests; reading
# "column 62" would break the moment the county adds a race, and would break
# silently, which is the failure mode this repo cannot tolerate.

def find_mode_header_row(ws):
    """The row that labels each column's vote mode.

    Found as the row carrying the most recognised mode headers -- every
    contest on the sheet repeats them, so it wins by a wide margin.
    """
    best, best_n = None, 0
    for r in range(1, min(ws.max_row, 40) + 1):
        n = sum(1 for c in range(1, ws.max_column + 1)
                if norm(ws.cell(row=r, column=c).value) in HEADER_TO_MODE)
        if n > best_n:
            best, best_n = r, n
    if best is None or best_n < 2:
        raise Bail("no row of vote-mode column headers found")
    return best


def find_block(ws, title):
    """(min_col, max_col) of the merged banner naming a contest or block."""
    want = norm(title)
    hits = [m for m in ws.merged_cells.ranges
            if norm(ws.cell(row=m.min_row, column=m.min_col).value) == want]
    if not hits:
        raise Bail(f"no merged header cell reading {title!r} on this sheet")
    if len(hits) > 1:
        raise Bail(f"{title!r} appears {len(hits)} times; cannot tell which")
    m = hits[0]
    return m.min_col, m.max_col


def read_candidate_columns(ws, block, mode_row, title_row):
    """[(name, {mode: column})] for the candidates inside a contest block.

    A candidate begins wherever the mode row starts a fresh "Election Day";
    the name is whatever is written above it, joined -- the workbook splits it
    across a given-name row and a surname row.
    """
    lo, hi = block
    out = []
    for c in range(lo, hi + 1):
        mode = HEADER_TO_MODE.get(norm(ws.cell(row=mode_row, column=c).value))
        if mode is None:
            continue
        if mode == "election_day":
            parts = [str(ws.cell(row=r, column=c).value).strip()
                     for r in range(title_row + 1, mode_row)
                     if ws.cell(row=r, column=c).value not in (None, "")]
            if not parts:
                raise Bail(f"column {c} has vote counts but no name above them")
            out.append((" ".join(parts), {}))
        if not out:
            raise Bail(f"column {c} is a {mode!r} column with no candidate")
        out[-1][1][mode] = c
    if not out:
        raise Bail("no candidate columns found in the contest block")
    return out


def read_public_count_columns(ws, block, mode_row):
    lo, hi = block
    cols = {}
    for c in range(lo, hi + 1):
        mode = HEADER_TO_MODE.get(norm(ws.cell(row=mode_row, column=c).value))
        if mode is None:
            continue
        if mode in cols:
            raise Bail(f"Public Count has two {mode!r} columns")
        cols[mode] = c
    missing = [m for m in MODES if m not in cols]
    if missing:
        raise Bail("Public Count is missing column(s): " + ", ".join(missing))
    return cols


def read_row_layout(ws, mode_row, label_col=1):
    """(district rows, subtotal row, town-level rows) below the header."""
    districts, town = {}, {}
    for r in range(mode_row + 1, ws.max_row + 1):
        label = str(ws.cell(row=r, column=label_col).value or "").strip()
        if not label:
            continue
        d = district_of(label)
        if d is not None:
            if d in districts:
                raise Bail(f"district {d} appears twice (rows "
                           f"{districts[d]} and {r})")
            districts[d] = r
        elif norm(label) in TOWN_ROW_LABELS:
            key = TOWN_ROW_LABELS[norm(label)]
            if key in town:
                raise Bail(f"town-level row {label!r} appears twice")
            town[key] = r
    if not districts:
        raise Bail("no 'Dist NN' rows found in the label column")
    # The unlabelled row straight after the last district is the sheet's own
    # subtotal. It is the sheet checking itself, so it is worth having, but the
    # script does not depend on it existing.
    last = max(districts.values())
    subtotal = last + 1 if not str(
        ws.cell(row=last + 1, column=label_col).value or "").strip() else None
    return districts, subtotal, town


# ---- Reading -------------------------------------------------------------

def read_sheet(ws, contest, verbose=True):
    mode_row = find_mode_header_row(ws)
    block = find_block(ws, contest)
    title_row = next(m.min_row for m in ws.merged_cells.ranges
                     if norm(ws.cell(row=m.min_row,
                                     column=m.min_col).value) == norm(contest))
    cands = read_candidate_columns(ws, block, mode_row, title_row)
    pc_block = find_block(ws, PUBLIC_COUNT_TITLE)
    pc_cols = read_public_count_columns(ws, pc_block, mode_row)
    districts, subtotal_row, town_rows = read_row_layout(ws, mode_row)

    def cell(r, c):
        return to_int(ws.cell(row=r, column=c).value)

    data = {
        "mode_row": mode_row,
        "contest_cols": block,
        "districts": sorted(districts),
        # by_district[d][candidate][mode] -- only the modes the workbook
        # reports at district level (Election Day and Vote by Mail).
        "by_district": {
            d: {name: {m: cell(r, c) for m, c in cols.items()}
                for name, cols in cands}
            for d, r in sorted(districts.items())
        },
        # ballots[d][mode] -- the Public Count block, all four modes.
        "ballots": {
            d: {m: cell(r, c) for m, c in pc_cols.items()}
            for d, r in sorted(districts.items())
        },
        # town[candidate][key] for Total / Early Voting / Provisionals /
        # Handcount - VBM / Grand Total.
        "town": {
            name: {k: cell(r, cols["election_day"])
                   for k, r in town_rows.items()}
            for name, cols in cands
        },
        "town_ballots": ({m: cell(subtotal_row, c) for m, c in pc_cols.items()}
                         if subtotal_row else None),
        "subtotal": ({name: {m: cell(subtotal_row, c) for m, c in cols.items()}
                      for name, cols in cands} if subtotal_row else None),
        "names": [name for name, _ in cands],
    }
    if verbose:
        print(f"Sheet layout: mode headers on row {mode_row}; contest columns "
              f"{block[0]}-{block[1]}; Public Count columns "
              f"{min(pc_cols.values())}-{max(pc_cols.values())}; "
              f"{len(districts)} district rows; "
              f"town-level rows {sorted(town_rows)}.")
        print(f"Candidates read from the sheet: {', '.join(data['names'])}\n")
    return data


def match_names(sheet_names, csv_names):
    """Sheet name -> the candidate name already used in the repo's CSV.

    Matched on the letters and digits alone, so "Mickey" + "PULLIA" resolves to
    "Mickey Pullia" without a lookup table to fall out of date. An ambiguous or
    unmatched name is fatal: quietly ingesting a name the CSV does not use
    would add a phantom candidate.
    """
    by_key = {}
    for c in csv_names:
        by_key.setdefault(alnum(c), []).append(c)
    out, problems = {}, []
    for s in sheet_names:
        hits = by_key.get(alnum(s), [])
        if len(hits) == 1:
            out[s] = hits[0]
        else:
            problems.append(
                f"{s!r} matches {len(hits)} candidate(s) in the CSV")
    if problems:
        raise Bail("cannot line the workbook's names up with the CSV:\n  "
                   + "\n  ".join(problems)
                   + "\n  CSV has: " + ", ".join(sorted(csv_names)))
    return out


# ---- Checks --------------------------------------------------------------

def reconcile(data, names, year, csv_rows, errors, notes):
    """Every cross-check, against the sheet itself and against the repo."""
    by_d = data["by_district"]
    districts = data["districts"]
    town = data["town"]

    # 0. The subtotal, Total and Grand Total rows are SUM() formulas, so they
    #    are only readable from the values Excel cached alongside them. A
    #    workbook re-saved by a tool that does not evaluate formulas keeps the
    #    formulas and drops the cache, and every one of those cells then reads
    #    as blank -- which would otherwise surface as a wall of "the sheet says
    #    0" errors that say nothing about the actual cause.
    computed = any(by_d[d][s][m] for d in districts for s in data["names"]
                   for m in ("election_day", "vbm"))
    # Only the summed cells matter here. Early Voting and Provisionals are
    # typed-in numbers and survive a formula-less save, so including them would
    # mask exactly the case this is meant to catch.
    cached = any(v for row in (data["subtotal"] or {}).values()
                 for v in row.values()) or any(
                     row.get(k) for row in town.values()
                     for k in ("total", "grand_total"))
    if computed and not cached:
        raise Bail(
            "the sheet's subtotal, Total and Grand Total rows are all blank. "
            "They are SUM() formulas, so this workbook was saved without "
            "cached results -- open it in Excel or LibreOffice and save, or "
            "pass the county's original file.")

    # 1. The sheet's own subtotal row, per candidate and per mode.
    if data["subtotal"]:
        for s in data["names"]:
            for m in ("election_day", "vbm"):
                got = sum(by_d[d][s][m] for d in districts)
                exp = data["subtotal"][s][m]
                if got != exp:
                    errors.append(
                        f"{s} / {m}: districts sum to {got:,} but the sheet's "
                        f"own subtotal row says {exp:,}")
        print(f"[1] district rows sum to the sheet's subtotal row for all "
              f"{len(data['names'])} candidates x 2 modes.")
    else:
        notes.append("the sheet has no subtotal row under the districts, so "
                     "that self-check did not run.")

    # 2. Total = Election Day + Vote by Mail; Grand Total = Total + Early +
    #    Provisionals + Handcount. The sheet states all of these, so they are
    #    an arithmetic check on the transcription, not an assumption.
    for s in data["names"]:
        ed = sum(by_d[d][s]["election_day"] for d in districts)
        vbm = sum(by_d[d][s]["vbm"] for d in districts)
        t = town[s]
        if "total" in t and ed + vbm != t["total"]:
            errors.append(f"{s}: Election Day {ed:,} + Vote by Mail {vbm:,} "
                          f"!= the sheet's Total row {t['total']:,}")
        if "grand_total" in t:
            parts = t.get("total", ed + vbm) + t.get("early", 0) \
                + t.get("provisional", 0) + t.get("handcount_vbm", 0)
            if parts != t["grand_total"]:
                errors.append(
                    f"{s}: Total + Early + Provisionals + Handcount = "
                    f"{parts:,} != the sheet's Grand Total {t['grand_total']:,}")
    print("[2] Total and Grand Total rows reconcile with their parts.")

    # 3. Public Count: districts sum to the sheet's subtotal.
    if data["town_ballots"]:
        for m in MODES:
            got = sum(data["ballots"][d][m] for d in districts)
            exp = data["town_ballots"][m]
            if got != exp:
                errors.append(f"ballots / {m}: districts sum to {got:,} but "
                              f"the subtotal row says {exp:,}")
        print("[3] Public Count district rows sum to the subtotal row for all "
              "four modes.")

    # 4. Against data/hammonton_boe_townwide_modes.csv -- the split the app
    #    already shows. The workbook reaches it a different way (districts for
    #    Election Day and mail, town rows for early and provisional), so
    #    agreement is real corroboration, not a restatement.
    stored = load_townwide_modes(TOWN_MODES)
    checked = 0
    for s, c in names.items():
        have = stored.get((year, c))
        if have is None:
            notes.append(f"{c}: no stored town-wide mode split to check.")
            continue
        wb = {
            "election_day": sum(by_d[d][s]["election_day"] for d in districts),
            "early": town[s].get("early", 0),
            "vbm": sum(by_d[d][s]["vbm"] for d in districts),
            "provisional": town[s].get("provisional", 0),
        }
        checked += 1
        if wb != have:
            errors.append(
                f"{c}: workbook mode split {wb} != the stored split {have}")
    print(f"[4] town-wide mode split confirmed against the workbook for "
          f"{checked} candidate(s).")

    # 5. Against data/hammonton_boe_field_modes.csv, per mode across everyone.
    field = load_field_modes(FIELD_MODES).get(year, {})
    if field:
        for m in MODES:
            if m not in field:
                continue
            # Choices the workbook omits entirely (write-ins) still count
            # toward the county's field total; take them from the stored split.
            wb_total = sum(
                (sum(by_d[d][s][m] for d in districts) if m in ("election_day", "vbm")
                 else town[s].get({"early": "early",
                                   "provisional": "provisional"}[m], 0))
                for s in data["names"])
            others = sum(v[m] for (y, c), v in stored.items()
                         if y == year and c not in names.values())
            if wb_total + others != field[m]:
                errors.append(
                    f"field total / {m}: workbook {wb_total:,} + choices not in "
                    f"the workbook {others:,} = {wb_total + others:,}, but the "
                    f"county's published field total is {field[m]:,}")
        print("[5] published field mode totals reconcile with the workbook.")

    # 6. Against data/hammonton_boe_declared_totals.csv. The website basis
    #    excludes the Handcount - VBM line; report that rather than absorb it.
    declared = {}
    if os.path.exists(DECLARED):
        with open(DECLARED, newline="") as f:
            for r in csv.DictReader(f):
                if (r.get("year") or "").strip() == str(year):
                    declared[(r.get("candidate") or "").strip()] = to_int(
                        r.get("declared_votes"))
    handcount = {}
    for s, c in names.items():
        if c not in declared:
            continue
        t = town[s]
        website_basis = t.get("total", 0) + t.get("early", 0) \
            + t.get("provisional", 0)
        if website_basis != declared[c]:
            errors.append(
                f"{c}: workbook Total + Early + Provisionals = "
                f"{website_basis:,} but the declared town-wide total is "
                f"{declared[c]:,}")
        if t.get("handcount_vbm"):
            handcount[c] = t["handcount_vbm"]
    print(f"[6] declared town-wide totals reconcile with the workbook for "
          f"{len(declared)} candidate(s), on the website basis.")
    if handcount:
        notes.append(
            "the workbook's Grand Total includes a 'Handcount - VBM' line the "
            "website's figures exclude: "
            + ", ".join(f"{c} +{n}" for c, n in sorted(handcount.items()))
            + ". The repo stays on the website basis, which every other "
              "published figure reconciles against. Ranks are unchanged.")

    # 7. Against the district totals already in data/hammonton_boe_real.csv.
    #    The website rolls early and provisional votes into the district; the
    #    workbook does not. The leftover must therefore be non-negative in
    #    every district and add up to the town's early + provisional votes.
    csv_by_d = {}
    for r in csv_rows:
        if to_int(r["year"]) != year:
            continue
        d = district_of(r["precinct"])
        if d is not None:
            csv_by_d.setdefault(d, {})[r["candidate"].strip()] = to_int(
                r["votes_total"])
    if csv_by_d:
        if sorted(csv_by_d) != districts:
            errors.append(f"CSV covers districts {sorted(csv_by_d)} but the "
                          f"workbook covers {districts}")
        for s, c in names.items():
            resid = {}
            for d in districts:
                have = csv_by_d.get(d, {}).get(c)
                if have is None:
                    errors.append(f"{year} / D{d:02d}: {c} is in the workbook "
                                  f"but not in the CSV")
                    continue
                resid[d] = have - by_d[d][s]["election_day"] - by_d[d][s]["vbm"]
                if resid[d] < 0:
                    errors.append(
                        f"{year} / D{d:02d} / {c}: the CSV's district total "
                        f"{have:,} is less than the workbook's Election Day + "
                        f"Vote by Mail {have - resid[d]:,}")
            want = town[s].get("early", 0) + town[s].get("provisional", 0)
            if resid and sum(resid.values()) != want:
                errors.append(
                    f"{c}: the CSV's district totals leave {sum(resid.values()):,} "
                    f"unaccounted for after the workbook's Election Day and "
                    f"mail votes, but the town's early + provisional votes are "
                    f"{want:,}")
        print("[7] the CSV's district totals are the workbook's district votes "
              "plus exactly the town's early and provisional votes.")

    # 8. Ballots must be able to carry the votes: with N seats, a district's
    #    votes cannot exceed N x its ballots.
    seats = {to_int(r["seats_up"]) for r in csv_rows
             if to_int(r["year"]) == year and (r.get("seats_up") or "").strip()}
    if len(seats) == 1 and csv_by_d:
        n = seats.pop()
        for d in districts:
            cast = sum(data["ballots"][d].values())
            votes = sum(csv_by_d.get(d, {}).values())
            if votes > n * cast:
                errors.append(
                    f"{year} / D{d:02d}: {votes:,} votes cast on {cast:,} "
                    f"ballots exceeds the {n:,}-per-ballot ceiling")
        print(f"[8] every district's votes fit inside {n} x its ballots.")


# ---- Writing -------------------------------------------------------------

def merge_ballots(csv_rows, fieldnames, data, year):
    """Fill ballots_cast on the year's district rows. Returns (rows, n)."""
    if "ballots_cast" not in fieldnames:
        raise Bail("the CSV has no ballots_cast column to fill")
    per_district = {d: sum(m.values()) for d, m in data["ballots"].items()}
    changed = 0
    for r in csv_rows:
        if to_int(r["year"]) != year:
            continue
        d = district_of(r["precinct"])
        if d is None or d not in per_district:
            continue
        new = str(per_district[d])
        old = (r.get("ballots_cast") or "").strip()
        if old and old != new:
            raise Bail(f"{year} / {r['precinct']}: CSV already says "
                       f"ballots_cast={old}, workbook says {new}")
        if old != new:
            r["ballots_cast"] = new
            changed += 1
    return csv_rows, changed


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("workbook")
    ap.add_argument("--sheet", required=True, help="municipality sheet name")
    ap.add_argument("--contest", required=True, help="contest banner text")
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--csv", default=CSV_PATH)
    ap.add_argument("--merge", action="store_true",
                    help="write ballots_cast back into the CSV")
    args = ap.parse_args()

    try:
        import openpyxl
    except ImportError:
        sys.exit("openpyxl is required: python3 -m pip install openpyxl")

    if not os.path.exists(args.workbook):
        sys.exit(f"missing {args.workbook}")
    wb = openpyxl.load_workbook(args.workbook, data_only=True)
    if args.sheet not in wb.sheetnames:
        sys.exit(f"no sheet {args.sheet!r}; the workbook has: "
                 + ", ".join(wb.sheetnames))
    with open(args.csv, newline="") as f:
        rdr = csv.DictReader(f)
        csv_rows, fieldnames = list(rdr), rdr.fieldnames

    errors, notes = [], []
    try:
        data = read_sheet(wb[args.sheet], args.contest)
        csv_names = {r["candidate"].strip() for r in csv_rows
                     if to_int(r["year"]) == args.year}
        names = match_names(data["names"], csv_names)
        reconcile(data, names, args.year, csv_rows, errors, notes)
    except Bail as e:
        sys.exit(f"REFUSING TO INGEST -- {e}")

    print()
    total = {m: sum(data["ballots"][d][m] for d in data["districts"])
             for m in MODES}
    print(f"Ballots cast, {args.year} ({args.sheet}):")
    for d in data["districts"]:
        b = data["ballots"][d]
        print(f"   D{d:02d}  " + "  ".join(f"{m}={b[m]:>5,}" for m in MODES)
              + f"   total={sum(b.values()):>6,}")
    print("   ---  " + "  ".join(f"{m}={total[m]:>5,}" for m in MODES)
          + f"   total={sum(total.values()):>6,}")
    print()

    for n in notes:
        print(f"NOTE: {n}")
    if errors:
        print()
        for e in errors:
            print(f"ERROR: {e}")
        sys.exit(f"\nREFUSING TO INGEST -- {len(errors)} check(s) failed; "
                 f"{args.csv} is unchanged.")

    if not args.merge:
        print("\nAll checks passed. Re-run with --merge to write ballots_cast "
              f"into {os.path.relpath(args.csv, ROOT)}.")
        return 0

    rows, changed = merge_ballots(csv_rows, fieldnames, data, args.year)
    with open(args.csv, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"\nAll checks passed. Wrote ballots_cast on {changed} row(s) of "
          f"{os.path.relpath(args.csv, ROOT)}.")
    print("Next: python3 scripts/validate_hammonton_csv.py "
          "&& python3 scripts/build_hammonton_boe.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())

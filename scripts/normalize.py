"""Precinct name normalization.

County clerks publish precinct names in different formats than the
statewide shapefile. This module reduces both to the same canonical
tuple so they can be joined.

Shapefile format:  "Egg Harbor Township 00 16"
                   "Brigantine City 01"          (no ward)
                   "Atlantic City 01 04"

County PDFs often look like:
                   "EGG HARBOR TWP - WARD 0 - DIST 16"
                   "EGG HARBOR TOWNSHIP DIST 16"
                   "Egg Harbor Township 0-16"
                   "Egg Harbor Twp 16"
                   "Brigantine 1"
                   "Atlantic City Ward 1 Dist 4"

Canonical tuple: (muni_slug, ward, district) where:
  - muni_slug:  lowercased municipality name with all whitespace
                collapsed and the suffix Township/Borough/City/Town/Village
                stripped. Punctuation removed.
  - ward:       int (0 if no ward)
  - district:   int

Example: both "Egg Harbor Township 00 16" and "EGG HARBOR TWP - WARD 0 - DIST 16"
normalize to ("egg harbor", 0, 16).
"""

from __future__ import annotations
import re

_SUFFIX_RE = re.compile(
    r"\b(township|twp|tp|borough|boro|city|town|village)\b",
    re.IGNORECASE,
)
_WS = re.compile(r"\s+")
_PUNCT = re.compile(r"[^\w\s]")


def _slug_muni(text: str) -> str:
    text = _PUNCT.sub(" ", text)
    text = _SUFFIX_RE.sub(" ", text)
    return _WS.sub(" ", text).strip().lower()


_SHAPEFILE_TAIL = re.compile(r"^(.*?)(?:\s+(\d{1,2}))?\s+(\d{1,3})$")


def normalize_shapefile_name(name: str) -> tuple[str, int, int] | None:
    """Parse names from the 2024 NJ Precincts shapefile.

    Returns (muni_slug, ward, district) or None if unparseable.
    """
    n = name.strip()
    m = _SHAPEFILE_TAIL.match(n)
    if not m:
        return None
    muni, ward, district = m.group(1), m.group(2), m.group(3)
    return (_slug_muni(muni), int(ward) if ward else 0, int(district))


_WARD_DIST_PATTERNS = [
    re.compile(r"\bw(?:ard)?\s*0*(\d{1,2})\s*[-,/\s]+\s*d(?:ist(?:rict)?)?\s*0*(\d{1,3})\b", re.IGNORECASE),
    re.compile(r"\bd(?:ist(?:rict)?)?\s*0*(\d{1,3})\b", re.IGNORECASE),
    re.compile(r"\b(\d{1,2})\s*[-/]\s*(\d{1,3})\b"),
    re.compile(r"\b(\d{1,3})\s*$"),
]


def normalize_clerk_name(name: str) -> tuple[str, int, int] | None:
    """Parse a precinct name from county-clerk source data.

    Tries common patterns: 'Ward N District M', 'Dist M', 'N-M', 'M'.
    Returns (muni_slug, ward, district) or None if unparseable.
    """
    s = name.strip()
    ward = 0
    district = None
    body = s
    # Pattern 1: explicit ward + district
    m = _WARD_DIST_PATTERNS[0].search(s)
    if m:
        ward = int(m.group(1))
        district = int(m.group(2))
        body = s[: m.start()]
    else:
        # Pattern 2: "Dist N"
        m = _WARD_DIST_PATTERNS[1].search(s)
        if m:
            district = int(m.group(1))
            body = s[: m.start()]
        else:
            # Pattern 3: "N-M"
            m = _WARD_DIST_PATTERNS[2].search(s)
            if m:
                ward = int(m.group(1))
                district = int(m.group(2))
                body = s[: m.start()]
            else:
                # Pattern 4: trailing number alone => district
                m = _WARD_DIST_PATTERNS[3].search(s)
                if m:
                    district = int(m.group(1))
                    body = s[: m.start()]
    if district is None:
        return None
    return (_slug_muni(body), ward, district)


# ---------- self-test ----------
if __name__ == "__main__":
    pairs = [
        ("Egg Harbor Township 00 16", "EGG HARBOR TWP - WARD 0 - DIST 16"),
        ("Egg Harbor Township 00 16", "Egg Harbor Township 0-16"),
        ("Egg Harbor Township 00 16", "Egg Harbor Twp Dist 16"),
        ("Atlantic City 01 04", "Atlantic City Ward 1 District 4"),
        ("Atlantic City 01 04", "ATLANTIC CITY 1-4"),
        ("Brigantine City 01", "Brigantine 1"),
        ("Brigantine City 01", "BRIGANTINE CITY DIST 1"),
        ("Vineland City 06 08", "Vineland Ward 6 Dist 8"),
        ("Stow Creek Township 00 01", "Stow Creek Twp 1"),
    ]
    fails = 0
    for a, b in pairs:
        na = normalize_shapefile_name(a)
        nb = normalize_clerk_name(b)
        ok = na == nb
        fails += 0 if ok else 1
        print(f"{'OK ' if ok else 'FAIL'}  {a!r:42}  ->  {na}")
        print(f"      {b!r:42}  ->  {nb}")
    print(f"\n{fails} failures of {len(pairs)}")

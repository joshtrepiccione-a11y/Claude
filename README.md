# NJ-2 Precinct Map — 2024 General Election

Interactive precinct-level map of New Jersey's 2nd Congressional District,
modeled on the 270toWin interface but scoped to a single district and
layered by mode of voting (Total / Election Day / Early Voting / Vote by
Mail).

## Run

It's a static site. Any HTTP server will do:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

`file://` won't work because `app.js` uses `fetch()` to load the GeoJSON.

## Features

- Choropleth of all 472 precincts in NJ-2 by D−R margin or turnout.
- Layer toggle: Total / Election Day / Early Voting / Vote by Mail.
- Hover tooltip with per-precinct breakdown.
- District-wide tally panel that updates with the active mode.
- URL hash captures the current view for sharing (`#mode=vbm&metric=turnout`).

## Data provenance

**District scope.** Filtered to the post-2022 NJ-2 (118th Congress) by
running a point-in-polygon test of each precinct's representative point
against the official district shape from
[unitedstates/districts](https://github.com/unitedstates/districts)
(2022 cycle). The 4 counties wholly inside NJ-2 (Atlantic, Cape May,
Cumberland, Salem) are included in full; Gloucester contributes 59
precincts that fall inside the district line.

**Precinct boundaries and presidential totals.** The 2024 NJ precincts
shapefile compiled by [@Twizzyu](https://twitter.com/Twizzyu) and
distributed via
[21MetcalfJ/2024Precincts](https://github.com/21MetcalfJ/2024Precincts),
reprojected to WGS84 and simplified to ~5 m tolerance with Shapely.
Presidential vote totals (Harris / Trump / Other) are from the same
source, which the author notes excludes allocated provisional ballots
and was collected before certification.

**Mode-of-voting splits.** The source data does **not** publish
Election Day / Early Voting / Vote by Mail breakdowns by precinct — NJ
counties report mode splits at the county level, with only Election Day
machine votes assigned to precincts in most public tabulations.

So the mode layers in this app are **modeled**, not measured. Per
precinct, the actual presidential totals are split using NJ 2024
statewide mode shares and partisan-skew offsets:

| Mode          | Share of turnout | D−R shift vs. precinct baseline |
| ------------- | ---------------- | ------------------------------- |
| Election Day  | 55%              | −8 pt                           |
| Early Voting  | 15%              | +4 pt                           |
| Vote by Mail  | 30%              | +12 pt                          |

These rates approximate the statewide pattern reported by the NJ
Division of Elections for the 2024 general (Republicans
disproportionately voted on Election Day; Democrats disproportionately
voted by mail) but are applied uniformly — they do not capture
precinct-to-precinct variation in mode preference. Each mode-specific
view in the UI carries a `modeled` badge. Aggregating the three modes
back to the precinct level reproduces the real totals (±1 vote from
rounding).

## Rebuilding the data file

The processing pipeline is not committed because the upstream shapefile
is ~14 MB. To regenerate `data/nj_cd2_precincts.geojson`:

```sh
pip3 install pyshp shapely
mkdir -p /tmp/nj && cd /tmp/nj
curl -sLO https://raw.githubusercontent.com/21MetcalfJ/2024Precincts/main/states/New%20Jersey/NJ24.zip
unzip -q NJ24.zip
curl -sLo nj02.geojson https://raw.githubusercontent.com/unitedstates/districts/gh-pages/cds/2022/NJ-2/shape.geojson
python3 /path/to/scripts/build_geojson.py
```

See `scripts/build_geojson.py` for the full pipeline.

## Limitations

- Mode splits are modeled, not measured. Treat them as illustrative.
- Burlington and Camden counties also have small slivers of NJ-2 in some
  earlier maps; under the current (post-2022) boundary, the
  point-in-polygon filter places 0 precincts from those counties inside
  NJ-2. If a future redistricting changes that, re-run the pipeline.
- Boundaries reflect 2024 election-day precincts as published by the
  source compiler; minor disagreements with county BoE precinct names
  are possible.

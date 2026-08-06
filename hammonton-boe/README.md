# Hammonton School Board — Pullia Vote Patterns (2021 → 2023)

A candidate-focused vote-pattern explorer for the **Hammonton Board of
Education** elections of **2021** and **2023**, built around Mickey Pullia's
loss-to-win turnaround.

This is **not** a planning or scenario tool. It displays and measures certified
results only — no swings, projections, turnout assumptions or interpolation.
Where the county did not publish a figure, the app says so rather than
estimating it.

## Stack

React + TypeScript + Vite + Leaflet + Tailwind (v3, compiled — no runtime CDNs).
Standalone from `v3-clerk` / `v3-sheriff`; neither is modified.

```bash
npm install
npm run dev        # http://localhost:5174
npm run build      # tsc -b && vite build  →  dist/
npm run typecheck
```

Deploy config is included for both hosts (`netlify.toml`, `vercel.json`); build
`npm run build`, publish `dist`. On Netlify set the site's **Base directory** to
`hammonton-boe`.

## Data pipeline

Run from the repository root:

```bash
# 1. Ingest a county Clarity export into the long-format CSV
python3 scripts/ingest_clarity_detail.py detail.xml \
        --contest "Local BOE- Hammonton" --merge

# 2. Prove the file is internally consistent
python3 scripts/validate_hammonton_csv.py

# 3. Pivot it onto the Hammonton precinct geometry
python3 scripts/build_hammonton_boe.py
```

| File | Role |
|---|---|
| `data/hammonton_boe_real.csv` | the certified results, long format (one row per year × precinct × candidate) |
| `data/hammonton_boe_declared_totals.csv` | the county's own town-wide total per candidate — an independent figure, not a sum of the rows |
| `scripts/hammonton_common.py` | the shared reporting-unit classifier all three scripts use |
| `scripts/ingest_clarity_detail.py` | converts a county `detail.xml` into those rows — the numbers are machine-transcribed, never retyped |
| `scripts/validate_hammonton_csv.py` | required columns, integer cells, precinct coverage, mode consistency, town-wide reconcile |
| `scripts/build_hammonton_boe.py` | pivots to `public/data/hammonton_boe_precincts.geojson` |

Candidate lists, seat counts (`voteFor`), winners, totals and the elected sets
are all **read out of the certified data** — none are hardcoded. The focus
candidate is matched by the case-insensitive substring `pullia`.

The validator is the safety net. It checks that each row's mode split sums to
its total, that every district is covered for every year and candidate, and —
the one that actually catches a bad digit — that each candidate's summed rows
equal the town-wide total the **county itself declared**, held separately in
`hammonton_boe_declared_totals.csv`. Summing the rows and comparing them to
themselves would be circular and would catch nothing; reconciling against an
independently published figure catches a dropped, duplicated or mistyped row.
Change any district's votes by 100 and the validator exits non-zero.

Ties are never broken by name. When two candidates share the top count in a
precinct, the winner is recorded as tied rather than resolved — D03 in 2021 is
a real 221–221 tie.

### Sanity check the data reproduces

The validator derives, from the numbers alone:

- **2021** — vote for 3, 10,840 votes cast, 5,145 ballots. Pullia **5th of 6, not elected**.
- **2023** — vote for 3, 8,831 votes cast. Pullia **3rd of 5, elected**.

## Two caveats the data forces

**1. Vote modes are reported differently in each year.** Atlantic County
encodes vote mode in the *precinct name*, not as a separate dimension:

- **2021** — `Hammonton Dist 01…07` are Election Day returns; `Mail-in`, `EV`,
  `Provisional` and `EV Prov` are **town-level** buckets (3,397 of 10,840 votes)
  that cannot be attributed to any district.
- **2023** — no mode split at all; every mode is folded into the district rows
  (D01–D07 sum exactly to the town-wide 8,831).

So per-precinct mode measures do not exist for either year, and the
"how the win was built" mode decomposition needs both years' splits — it
reports itself unavailable until a 2023 export with mode detail is added. Drop
one in via `ingest_clarity_detail.py` and every mode measure lights up with no
code change.

**2. A district row is not the same electorate in both years** (Election Day
only in 2021 vs. all modes in 2023). Town-wide totals *are* directly
comparable. The app carries this warning on the Turnaround table, in the
precinct drawer, and on the About tab.

## Colour

No colour encodes a political party — these are nonpartisan, vote-for-N races.
Pullia carries one violet highlight (`#4a3aa7`) throughout. The palette was
validated with the `dataviz` skill's checker against the white card surface;
see the header comment in `src/lib/data/palette.ts` for the results. Precinct
winners are deliberately assigned the front palette slots so the choropleth
only ever shows fills that clear the all-pairs colourblind gates, while every
candidate keeps one colour across every view.

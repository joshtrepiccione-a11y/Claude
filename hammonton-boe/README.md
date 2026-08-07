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
`npm run build`, publish `dist`.

### Netlify

Create a **new** site — do not repoint the existing one. The repository root
carries its own `netlify.toml` dedicating the current Netlify site to
`v3-clerk`; changing that site's base directory would take the Clerk app down.

1. Add new site → Import an existing project → this repository.
2. Set **Base directory** to `hammonton-boe`. Leave build command and publish
   directory blank — with the base set, Netlify reads `hammonton-boe/netlify.toml`,
   which already specifies `npm install && npm run build`, `publish = "dist"`
   (relative to the base) and Node 20.

A one-click "Deploy to Netlify" badge is deliberately not offered here: it
cannot set a base directory, so it would pick up the root config and deploy
`v3-clerk` instead.

### Vercel

Add New → Project → import the repository → set **Root Directory** to
`hammonton-boe`. `vercel.json` supplies the rest.

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
| `data/hammonton_boe_townwide_modes.csv` | the certified town-wide Election Day / Early / Mail / Provisional split per candidate |
| `data/hammonton_boe_field_modes.csv` | the county's published total per mode — the second dimension check 6 reconciles against |
| `scripts/hammonton_common.py` | the shared reporting-unit classifier and data-file loaders all three scripts use |
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

The town-wide mode split is checked in two directions: each candidate's four
modes must sum to their declared total, and each mode summed across candidates
must equal the county's published field total. One alone is not enough — moving
votes between two modes of the *same* candidate leaves the total untouched, and
that is exactly the shape of the one hand-derived row in the repo. The builder
refuses to write a split that fails either check rather than shipping it with a
warning.

Ties are never broken by name, anywhere. Every ranking — the builder's, the
validator's and the app's — uses standard competition ranking, so equal totals
share a rank rather than being ordered by whatever came first. A precinct whose
top count is shared is recorded as **tied** rather than resolved: D03 in 2021 is
a real 221–221 tie, and both candidates read "1st here".

### Sanity check the data reproduces

The validator derives, from the numbers alone:

- **2021** — vote for 3, 10,840 votes cast, 5,145 ballots. Pullia **5th of 6, not elected**.
- **2023** — vote for 3, 8,831 votes cast. Pullia **3rd of 5, elected**.

### The turnaround, decomposed

The app computes this at render time (`src/lib/measures.ts`), not the validator.
Pullia's net **+152** votes is **+180 Election Day, +6 Early Voting, −29 Vote by
Mail, −5 Provisional** — he gained on Election Day and *lost* ground on mail,
the opposite of the usual assumption about what drove the win.

Its backstop is check 6: the parts can only be wrong if the town-wide mode
split is wrong, and that split has to reconcile in two directions at once —
per candidate against the declared total, and per mode against the county's
published field totals.

## Two caveats the data forces

**1. Vote modes are known town-wide, never by district.** Atlantic County
published the two years in different shapes:

- **2021** — `Hammonton Dist 01…07` are Election Day returns; `Mail-in`, `EV`,
  `Provisional` and `EV Prov` are **separate town-level reporting units**
  (3,397 of 10,840 votes) that cannot be attributed to any district.
- **2023** — district rows **combine every mode** (D01–D07 sum exactly to the
  town-wide 8,831), and the mode split is published only as a town-wide
  breakdown.

So the town-wide mode mix and the contribution breakdown are exact for both
years, but mode can never be **mapped by district** — the map's mode-dependent
metrics say so rather than drawing zeros.

One 2023 figure is derived rather than read: Shawn K. McCloud's row is obscured
in the source, so his Election Day / Early / Mail counts are the published
field totals minus the other five choices. That is exact arithmetic on certified
numbers, and it is confirmed twice over — it reproduces both his visible
provisional count (21) and his certified total (1,592). The derivation is
recorded in the `source` column.

**2. A district row is not the same electorate in both years** (Election Day
only in 2021 vs. all modes in 2023). Town-wide totals *are* directly
comparable. The app carries this warning on the Turnaround table, in the
precinct drawer, and on the About tab.

## What the app will not do

Where the county did not publish a figure, nothing renders a 0 in its place:

- district cells for a mode that a year reports only town-wide read **"—"**,
  and the CSV export leaves them **blank** rather than exporting 0;
- map controls for such a mode are **disabled with a reason**;
- a tied precinct shows both names and its own map fill;
- if more candidates tie into the seat range than there are seats, the ranked
  bars say so instead of implying the cutoff resolved it.

## Colour

No colour encodes a political party — these are nonpartisan, vote-for-N races.
Pullia carries one violet highlight (`#4a3aa7`) throughout. The palette was
validated with the `dataviz` skill's checker against the white card surface;
see the header comment in `src/lib/data/palette.ts` for the results. Precinct
winners are deliberately assigned the front palette slots so the choropleth
only ever shows fills that clear the all-pairs colourblind gates, while every
candidate keeps one colour across every view.

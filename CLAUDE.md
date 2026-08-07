# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What's here

A set of standalone election-data web apps for Atlantic County, NJ, sharing the
precinct geometry in `data/`. Each app is self-contained — its own
`package.json`, build and deploy config — and they must not be cross-edited.

| Directory | What it is |
|---|---|
| `hammonton-boe/` | Hammonton Board of Education vote-pattern explorer, 2021 → 2023. Measures certified results only. |
| `v3-clerk/` | Atlantic County Clerk scenario model (Path to Victory). |
| `v2/`, root `app.js` / `index.html` | Earlier LD8 dashboards. |
| `data/` | Shared precinct GeoJSON + the certified result CSVs. |
| `scripts/` | Python data pipelines that turn certified results into app GeoJSON. |

## Commands

Web apps (run inside the app directory, e.g. `hammonton-boe/`):

```bash
npm install
npm run dev         # Vite dev server
npm run build       # tsc -b && vite build  →  dist/   (must pass before committing)
npm run typecheck
```

Hammonton BOE data pipeline (run from the repository root, in this order):

```bash
python3 scripts/ingest_clarity_detail.py detail.xml --contest "Local BOE- Hammonton" --merge
python3 scripts/validate_hammonton_csv.py      # the repo's de facto test suite
python3 scripts/build_hammonton_boe.py         # refuses to write if data does not reconcile
```

There is no unit-test framework. **`validate_hammonton_csv.py` is the test** —
run it after any change to `data/hammonton_boe_*.csv` or to the scripts, and
treat a non-zero exit as a failing build. `build_hammonton_boe.py` exits
non-zero rather than writing a GeoJSON whose numbers do not reconcile.

## Architecture notes that span files

**The pipeline is CSV → validate → GeoJSON → app.** The apps never parse
certified results; they read one pre-built GeoJSON. Changing a measure usually
means changing the builder *and* the app's `src/lib/`.

**`scripts/hammonton_common.py` exists to stop drift.** Reporting-unit
classification (`district_of`) and the data-file loaders live there because
each script previously carried its own copy and they diverged, producing a real
classification bug. Add shared parsing there, never inline.

**Reconciliation is against independent figures, never self.** Summing rows and
comparing to their own sum proves nothing. The validator reconciles against the
county's separately published totals (`*_declared_totals.csv`) and per-mode
field totals (`*_field_modes.csv`).

**Never invent a certified figure.** Where the county did not publish
something, the data and the UI say so — `"—"`, a disabled control with a
reason, or an `Unavailable` panel — rather than rendering 0. Ties are reported
as ties, never resolved by candidate name.

## Branch conventions

Development for automated Claude Code sessions happens on branches named
`claude/<purpose>-<suffix>` (e.g., `claude/initial-setup-SjVdw`). Push work to
the branch specified for the current session; do not push to `main` without
explicit instruction.

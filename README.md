# Atlantic County, NJ — 2024 Presidential precinct map + scenario tool

A single-page static site that renders all 151 precincts of Atlantic
County, NJ for the 2024 general election (presidential race) and lets
the user model "what-if" outcomes by mode of voting (Election Day,
Early Voting, Vote by Mail) at the county and per-municipality level.

This is a companion to the parent NJ-2 site
(<https://github.com/joshtrepiccione-a11y/Claude/tree/claude/electoral-map-nj-district-W3bJJ>).
It reuses the NJ-2 precinct GeoJSON, filtered down to the 151 features
where `properties.county == "Atlantic"`.

## Run

```
python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no dependencies, no framework. Just Leaflet + plain JS.

## Deploy

The site ships via GitHub Pages from
`.github/workflows/pages.yml`. The workflow runs on every push to
`main` and to this feature branch, and can be triggered manually
(`workflow_dispatch`). One-time setup in the repo: **Settings &rarr;
Pages &rarr; Source: GitHub Actions**. After that, pushes auto-deploy.

The artifact is the entire repo (it's all static — `index.html`,
`app.js`, `style.css`, `data/`); GitHub Pages serves `index.html` at
the site root.

## File layout

```
index.html
app.js
style.css
data/
  atlantic_precincts.geojson    # 151 Atlantic County precincts
scripts/
  filter_atlantic.py            # one-shot: produces the GeoJSON above
```

To regenerate `data/atlantic_precincts.geojson`:

```
# put the NJ-2 file at data/nj_cd2_precincts.geojson, then:
python3 scripts/filter_atlantic.py
```

The script also adds a `municipality` field to each feature, derived by
stripping the trailing whitespace-separated digit groups from
`precinct` (e.g., `"Atlantic City 01 04" -> "Atlantic City"`,
`"Brigantine City 04" -> "Brigantine City"`).

## Data provenance

Every precinct carries a `mode_source` field marking each of
`ed` / `early` / `vbm` as `real` or `modeled`. The presidential total is
real for every precinct (certified 2024 figures). Mode breakdowns are
modeled by default using the statewide-mix overlay from the parent NJ-2
project: ED 55% / EV 15% / VBM 30% of turnout; partisan shifts ED &minus;8
/ EV +4 / VBM +12 relative to the precinct's baseline margin.

The UI surfaces this everywhere:

- The Vote-mode panel shows a per-mode badge: `real`, `modeled`, or
  `NN% real` when sources are mixed across precincts.
- The Precinct hover panel shows the per-precinct per-mode badge.
- In **Scenario** view, every badge flips to `scenario`, with the
  underlying `real`/`modeled` provenance preserved in the tooltip and
  in the totals-panel meta line (e.g., `scenario (based on modeled)`).

## Scenario controls

Toggle **View &rarr; Scenario** to enable the sliders. Everything in
baseline view continues to work the same; flipping the switch makes the
map and the county totals reflect hypothetical numbers.

Two tiers:

1. **County-wide** (applied to all 151 precincts):
   - D&minus;R swing for ED / EV / VBM (&minus;15 to +15 points each).
   - Mode share of turnout for ED / EV / VBM (ranges 30-80 / 0-40 / 0-60).
2. **Per-municipality overrides** for all 23 municipalities (collapsible):
   - D&minus;R swing for ED / EV / VBM (&minus;20 to +20 points each),
     applied **on top of** the county-wide swing.

### How a swing is applied

For each precinct and each mode, a swing of X points moves X/2 share
from Trump to Harris (or vice versa). Other-party share is preserved
and the three shares are renormalized to sum to 1, with negatives
clamped to 0. The mode total is then multiplied through to get new
H/T/O counts.

### How the mode-share sliders behave

The three share sliders are coupled. When you drag one, the other two
are scaled proportionally so the three always sum to 100%. If a slider
hits its bound, the remainder is absorbed by the others; if the result
still doesn't sum to 100%, all three are renormalized in a final pass
(so a slider may snap back from a bound). Defaults are the county's
real ED/EV/VBM mix (about 55.0 / 15.0 / 30.0 from the modeled splits).

### Flips and deltas

When scenario view is on, the County-totals panel adds:

- `vs certified` deltas for Harris / Trump / Other counts and margin.
- A flipped-precinct count and list, computed against each precinct's
  certified presidential margin (sign change in the total-mode margin).

The hover panel adds `vs certified` H/T deltas and a margin delta for
the precinct currently under the cursor.

## URL state

The hash encodes the full state so a link reproduces an exact scenario.
Recognized keys:

- `mode=total|ed|early|vbm`
- `metric=margin|turnout`
- `view=scenario` (baseline is the default and is omitted)
- `sw=ED,EV,VBM` — three county-wide D&minus;R swings (points)
- `sh=ED,EV,VBM` — three county-wide mode shares (percent)
- `mu=IDX:ED,EV,VBM;IDX:...` — per-municipality overrides, where `IDX`
  is the 0-based index into the alphabetically-sorted municipality
  list. Munis with all-zero overrides are omitted.

Defaults are omitted from the URL; the bare site URL is the baseline
view.

## Out of scope (intentionally not built)

- Per-precinct hand-paint editor
- Demographic overlays
- Other races on the same ballot
- Real-time data ingestion
- Compare-to-2020

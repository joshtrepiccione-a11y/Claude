# NJ Legislative District 8 — 2027 general (hypothetical) precinct map + scenario tool

A single-page static site that renders the 121 precincts of NJ
Legislative District 8 (2021 redistricting plan) for a hypothetical
2027 general election. The 2027 ballot models the real LD8 ballot
structure:

- 1 State Senate seat (1 D, 1 R)
- 2 General Assembly seats (2 D, 2 R; each voter picks up to 2)

This is a sibling to the Atlantic County site (which lives on its own
branch and is not modified by this project). The file layout, dark
theme, color ramps, URL-hash convention, and provenance badge ethic
are all reused from that codebase.

## Run

```
python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no dependencies, no framework. Just Leaflet + plain JS.

## File layout

```
index.html
app.js
style.css
data/
  ld8_precincts.geojson           # 121 LD8 precincts (built artifact)
  ld8_real_baselines.json         # optional override: real precinct totals
scripts/
  build_ld8.py                    # filters the NJ24 shapefile → LD8 GeoJSON
```

## Rebuilding the data file

```
# Either let the script download the NJ24 shapefile into /tmp:
python3 scripts/build_ld8.py --fetch
# ...or pre-place it and just run:
python3 scripts/build_ld8.py
```

The script:

1. Downloads (or reads) the 2024 NJ precincts shapefile compiled by
   @Twizzyu via
   [21MetcalfJ/2024Precincts](https://github.com/21MetcalfJ/2024Precincts).
2. Filters to LD8 precincts. Because every municipality in the 2021
   LD8 map is wholly inside the district, we use the official
   municipality allowlist as a proxy for the boundary (this is exact;
   no split precincts need to be reassigned):
   - **Atlantic**: Hammonton Town
   - **Burlington**: Bass River, Eastampton, Evesham, Hainesport,
     Lumberton, Medford, Medford Lakes, Pemberton Borough, Pemberton
     Township, Shamong, Southampton, Springfield, Tabernacle,
     Washington, Westampton, Woodland, Wrightstown
3. Derives `municipality` by stripping precinct/ward suffixes from the
   shapefile's `PrecName` field (Burlington uses verbose suffixes like
   `... Election District: Ward 1 - District 2`; Atlantic uses bare
   `... 01 02` digit runs).
4. Synthesizes baseline numbers for 2021 Senate and 2023 Assembly per
   precinct (see "Baseline projection method" below), then produces a
   2027 baseline as a 60/40 weighted mix of the prior cycle and the
   2024 presidential turnout.
5. Splits each (race, baseline) into ED/EV/VBM using the statewide-mix
   overlay (ED 55%, EV 15%, VBM 30%; partisan shifts ED −8 / EV +4 /
   VBM +12). These splits are flagged as `modeled` in `mode_source`.
6. If `data/ld8_real_baselines.json` is present, it is consulted for
   per-precinct overrides — drop in real certified 2021/2023
   precinct-level numbers and the script will mark `mode_source` /
   `baseline_source` as `real` for those precincts. See the script for
   the expected JSON shape.

## Baseline projection method

Real, certified precinct-level data for the 2021 Senate and 2023
Assembly races is not included by default. Instead we project each
precinct's prior cycle from its 2024 presidential numbers, using the
**district-level** certified margins as the shift constant:

| Race                | District margin (real) | Per-precinct shift vs presidential |
|---------------------|------------------------|------------------------------------|
| 2021 Senate         | ≈ R+5                  | −5.0 points                        |
| 2023 Assembly ticket| ≈ R+11                 | −11.0 points                       |

The per-precinct shift is applied uniformly: each precinct's
presidential D-share moves toward R by 5 (Senate) or 11 (Assembly)
points, with Other-party share preserved and the result renormalized
and clamped (same half-shift logic as the Atlantic site). Turnout is
scaled to typical off-year levels (42% of presidential for 2021, 39%
for 2023).

The 2027 baseline is a weighted mix:

```
sen27_baseline   = 0.60 * sen21_projected   + 0.40 * pres24_real
assem27_baseline = 0.60 * assem23_projected + 0.40 * pres24_real
```

This blends the structural Republican lean of LD8 legislative races
with the latest political environment. Every precinct-race baseline is
flagged `modeled` until real numbers are supplied.

## UI

Sidebar left, map right. Dark theme.

### Map

Choropleth of LD8 precincts, colored by one of:

- **Senate margin (D−R)** — diverging red/blue ramp, ±40 pts.
- **Assembly ticket margin** — `(D1+D2)−(R1+R2)` / candidate-votes,
  same ramp.
- **Assembly outcome** — 4 categorical colors: `2D`, `1D1R-D-led`,
  `1D1R-R-led`, `2R`.
- **Turnout** — yellow ramp scaled to the largest precinct turnout in
  the active mode.

### Controls

| Control            | Behavior                                                   |
|--------------------|------------------------------------------------------------|
| **View**           | `Baseline (projection)` or `Scenario`                      |
| **Race focus**     | `Senate` / `Assembly` — emphasizes that race in the hover panel; map coloring is independent. |
| **Vote mode**      | `Total` / `ED` / `EV` / `VBM`                              |
| **Color by**       | one of the four metrics above                              |
| **Senate D−R swing**   | per-mode ED/EV/VBM, −15 to +15 pts                     |
| **Assembly D−R swing** | per-mode ED/EV/VBM, −15 to +15 pts                     |
| **Turnout mix**    | ED/EV/VBM shares (coupled, sum to 100%)                   |
| **Bullet-vote rate**| 0–30%, default **8%**. Share of Assembly voters who cast only one vote instead of two. Total Assembly candidate-votes = voters × (2 − b). |
| **D ticket: D1 share** | 30–70%, default 52%. Splits D ticket between D1 and D2 candidates. |
| **R ticket: R1 share** | 30–70%, default 52%. Same for R.                       |
| **Sen→Asm coattail**   | 0.0–1.0, default 0.0. Fraction of the Senate swing added to the Assembly swing in each mode. |
| **Per-municipality overrides** | 6 sliders per muni (Sen ED/EV/VBM, Asm ED/EV/VBM), −20 to +20 each, on top of district-wide. |

### District totals panel

Two race blocks:

- **Senate**: per-candidate counts + pct, stacked bar, winner badge.
  In scenario view, vs-baseline deltas and a flipped-precinct list
  (precincts whose Senate winner changed from baseline → scenario).
- **Assembly**: per-candidate counts + pct, top-2 finishers marked
  `WIN`, ticket margin, voter count. In scenario view, vs-baseline
  deltas per candidate and an outcome-change list (precincts whose
  top-2 composition changed, e.g. `2R → 1D1R-R`).

### Hover panel

Both race blocks for the hovered precinct, with the race-focus block
shown first. Each block carries a `real / modeled / scenario`
provenance badge for the active mode. In scenario view, both blocks
show vs-baseline deltas per candidate and an outcome-change line for
Assembly.

## Provenance

Every (precinct, race, mode) tuple has a tri-state label:

- **`real`** — baseline reuses certified prior-cycle votes verbatim
  (only when the override JSON supplies them).
- **`modeled`** — 2027 projection from presidential + cycle shifts,
  or a mode-overlay split.
- **`scenario (based on real/modeled)`** — sliders are active; the
  underlying source is preserved in parentheses.

This shows up in three places:

1. The Vote-mode panel's per-mode badge (district-wide aggregate).
2. The hover panel's per-race badge.
3. The District-totals panel's per-race meta line.

## URL state

The hash encodes the full scenario so a link reproduces an exact
view. Recognized keys (defaults omitted):

| Key       | Meaning                                                       |
|-----------|---------------------------------------------------------------|
| `mode`    | `total` / `ed` / `ev` / `vbm`                                 |
| `metric`  | `sen_margin` / `asm_margin` / `asm_outcome` / `turnout`       |
| `race`    | `sen` / `asm` (race-focus)                                    |
| `view`    | `scenario` (baseline is the default and is omitted)           |
| `sen_sw`  | `ED,EV,VBM` Senate swings (points)                            |
| `asm_sw`  | `ED,EV,VBM` Assembly ticket swings (points)                   |
| `sh`      | `ED,EV,VBM` turnout-mix shares (percent)                      |
| `b`       | bullet-vote rate (percent)                                    |
| `id`      | D1 share of D ticket (percent)                                |
| `ir`      | R1 share of R ticket (percent)                                |
| `co`      | Sen→Asm coattail (0..1)                                       |
| `mu`      | `IDX:senED,senEV,senVBM,asmED,asmEV,asmVBM;IDX:...` per-muni overrides; `IDX` indexes the alphabetically-sorted muni list. |

## Math notes

- **Senate D−R swing of X points** moves X/200 share from R to D
  (half-shift), with Other-party share preserved and the three shares
  renormalized after clamping negatives to 0.
- **Assembly ticket D−R swing of X points** does the same on the
  ticket-level shares (D1+D2 vs R1+R2 vs Other voters). Each party's
  ticket voters are then split between its two candidates using the
  intra-party slider (default 52/48).
- **Bullet voting**: with rate `b`, total Assembly candidate-votes =
  voters × (2 − b). The per-party ticket share is applied to the
  candidate-vote pool, then split intra-party.
- **Coattail c**: effective Assembly swing for a (muni, mode) =
  `cwAsm[mode] + muniAsm[mode] + c × (cwSen[mode] + muniSen[mode])`.

## Hypothetical candidate names

The 2027 slates are unknown. The site uses generic placeholder
surnames for clarity:

- Senate: **Adams (D)** vs **Bennett (R)**
- Assembly: **Carter (D)** / **Daniels (D)** vs **Edwards (R)** /
  **Foster (R)**

Replace them in `app.js` (`CAND` object) if you want to slot in real
nominees once they're known.

## Out of scope (intentionally not built)

- Primary-election modeling
- Per-precinct hand-paint editor
- Demographic overlays
- Other races on the same ballot
- Multi-cycle comparison (2023 vs 2025 vs 2027)
- Write-in candidates beyond the Other bucket

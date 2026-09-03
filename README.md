# NJ Legislative District 8

This repo holds two unrelated projects, each with its own Vercel deployment:

- **LD8 election map / scenario tools** at the repository root (below).
- **[`post186/`](post186/)** — the Frank M. Calletta American Legion Post 186
  website (Next.js + Postgres). It deploys as a separate Vercel project whose
  **Root Directory** is set to `post186`; see
  [`post186/DEPLOY.md`](post186/DEPLOY.md).

## LD8 election map

The LD8 election map / scenario tools, plus a County Clerk adaptation:

| Version | Path | Stack | Purpose |
|---------|------|-------|---------|
| **v3-clerk** | `v3-clerk/` | React + TypeScript + Vite | **2026 Atlantic County Clerk scenario model** — Lisa Bender (D) vs. Joseph J. Giralo (R, incumbent), single-race adaptation of the v3 app calibrated to the certified 2021 Clerk result |
| **v2** (current) | `v2/` | React + TypeScript + Vite | Campaign intelligence dashboard — Scenario Summary, Path to Victory, Strategic Priority scoring, Ranked Precinct Table, Municipality Dashboard, CSV export, Candidate/Expert modes |
| v1 (legacy) | `index.html`, `app.js`, `style.css` | Vanilla JS + Leaflet | Original precinct map + scenario sliders, preserved for reference |

**v2 is the deployed production site.** Run it with:

```
cd v2 && npm install && npm run dev    # http://localhost:5173
cd v2 && npm run build                  # production build → v2/dist
cd v2 && npm test                       # vitest suite
```

See [`docs/v2-spec.md`](docs/v2-spec.md) for the v2 product spec.

---

## v3-clerk — 2026 Atlantic County Clerk (Bender vs. Giralo)

A single-race fork of the v3 LD8 scenario app for the **2026 Atlantic
County Clerk** general election: challenger **Lisa Bender (D, Somers
Point)** vs. incumbent **Joseph J. Giralo (R)**. The race is county-wide,
covering all 23 Atlantic County municipalities (151 precincts).

```
cd v3-clerk && npm install && npm run dev   # http://localhost:5173
cd v3-clerk && npm run build                 # production build → v3-clerk/dist
```

**Baseline.** Calibrated to the certified 2021 County Clerk result —
Giralo (R) **43,346** / Lisa Jiampetti (D) **34,930** (R +10.75
two-party). County sums match the certified totals exactly. Per-precinct
distribution is interpolated from each precinct's 2024 presidential
two-party share with a −3.40 pp uniform county-wide shift and a 0.634×
turnout scale (rebuild with `python3 scripts/build_atlantic_clerk.py`).

**Model.** Tabs: Dashboard (KPIs, projected outcome, county map, path to
victory), Map (7 layers + precinct drawer), Targets (ranked precinct
table + CSV), Scenarios (9 presets incl. "2021 Replay" baseline and a
"Find a Winning Path" heuristic), Report (plain-English campaign memo),
Data (methodology, coverage, import validation, exports). Headline
calibration checks: the *2021 Replay* preset reproduces R+10.75; the
*2024 Presidential Environment* preset closes the gap to ≈R+4; the
*Balanced Win Path* preset flips the county ≈D+0.75 (~600 votes).

Outputs are a model, not a prediction.

---

## v1 (legacy)

A single-page static site that renders all 149 precincts of NJ
Legislative District 8 (post-2021 redistricting) for a hypothetical
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
  ld8_precincts.geojson           # 149 LD8 precincts (built artifact)
  ld8_real_baselines.json         # optional override: real precinct totals
scripts/
  build_ld8.py                    # filters NJ24 shapefile → LD8 GeoJSON
.github/workflows/pages.yml       # auto-deploys to GitHub Pages on push
```

## Rebuilding the data file

```
python3 scripts/build_ld8.py --fetch
```

The script downloads the 2024 NJ precincts shapefile compiled by
@Twizzyu via
[21MetcalfJ/2024Precincts](https://github.com/21MetcalfJ/2024Precincts),
filters to the 25 LD8 municipalities, calibrates per-precinct
projections to the certified 2023 Senate and 2025 Assembly district
totals, and emits `data/ld8_precincts.geojson`.

## LD8 composition (post-2021 redistricting)

Every municipality in the LD8 map is wholly inside the district — no
split precincts. The build script uses this 25-muni allowlist as the
boundary:

**Atlantic County (4):** Egg Harbor City, Folsom, Hammonton, Mullica

**Burlington County (21):** Bass River, Chesterfield, Eastampton,
Evesham, Hainesport, Lumberton, Mansfield, Medford, Medford Lakes,
Mount Holly, New Hanover, Pemberton Borough, Pemberton Township,
Shamong, Southampton, Springfield, Tabernacle, Washington, Westampton,
Woodland, Wrightstown

## Baseline projection method

The 2027 baseline is a **straight copy of the most recent real cycle**
for each race:

| Race           | Source race | Certified district totals                                                |
|----------------|-------------|--------------------------------------------------------------------------|
| 2027 Senate    | 2023 Senate | Tiver (R) **28,013** / Burton (D) **26,648** (R+2.5)                     |
| 2027 Assembly  | 2025 Assembly | Angelozzi (D) **50,168** / Katz (D) **50,036** / Torrissi (R) **46,262** / Umba (R) **44,300** (D+5.1) |

District aggregates match the certified totals **exactly**. Per-precinct
distribution is interpolated as follows:

1. Each precinct's 2024 presidential D/R/O shares give the spatial
   pattern.
2. A uniform district-wide additive shift is applied so the precinct
   shares average back to the target D-share for the race (Senate
   shift ≈ −1.62 pts vs presidential; Assembly shift ≈ +5.93 pts).
3. Each precinct's turnout is scaled so the district sum hits the
   certified total exactly (54,661 voters for Senate; 97,829 voters
   for Assembly, implied from candidate-votes / (2 − bullet)).
4. A final renormalization step nudges per-precinct totals so the
   district sums match the targets to within rounding.

Per-precinct mode breakdowns (ED/EV/VBM) are modeled by the same
statewide-mix overlay used by the Atlantic site (ED 55% / EV 15% /
VBM 30%; partisan shifts ED −8 / EV +4 / VBM +12).

To plug in **certified precinct-level** results and replace the
interpolation, drop them into `data/ld8_real_baselines.json` keyed by
precinct name; the script will flip the affected `mode_source` /
`baseline_source` flags to `real`.

## Candidates

Senate incumbent Latham Tiver was elected in 2023 to a four-year term
that runs through 2027, so the 2027 Senate slate is open on both
sides. Both Assembly incumbents (Andrea Katz and Anthony Angelozzi)
flipped LD8 to a 2-Democrat ticket in 2025. The 2027 slate models
both incumbents seeking re-election:

- **Senate**: *Democratic Senate Candidate* vs **Latham Tiver (R)**
- **Assembly**: **Anthony Angelozzi (D)** + **Andrea Katz (D)** vs
  *Republican Assembly Candidate 1* + *Republican Assembly Candidate 2*

The Assembly intra-party defaults match the 2025 result: Angelozzi
took 50.07% of the D ticket (D1 = top finisher), Torrissi took 51.08%
of the R ticket. Bullet-vote rate default is 5%.

Update the `CAND` object in `app.js` to swap in real Republican
nominees once the 2027 slate is known.

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

| Control                | Behavior                                                   |
|------------------------|------------------------------------------------------------|
| **View**               | `Baseline (projection)` or `Scenario`                      |
| **Race focus**         | `Senate` / `Assembly` — emphasizes that race in the hover panel; map coloring is independent. |
| **Vote mode**          | `Total` / `ED` / `EV` / `VBM`                              |
| **Color by**           | one of the four metrics above                              |
| **Senate D−R swing**   | per-mode ED/EV/VBM, −15 to +15 pts                         |
| **Assembly D−R swing** | per-mode ED/EV/VBM, −15 to +15 pts                         |
| **Turnout mix**        | ED/EV/VBM shares (coupled, sum to 100%)                    |
| **Bullet-vote rate**   | 0–30%, default **5%** (2025 calibration).                  |
| **D1 (Angelozzi) share** | 30–70%, default **50.07%** (2025 calibration).           |
| **R1 share**           | 30–70%, default **51.08%** (2025 calibration).             |
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
shown first. Each block carries a `real / calibrated / modeled /
scenario` provenance badge for the active mode.

## Provenance

A four-state label per (precinct, race, mode) tuple:

- **`real`** — baseline reuses certified precinct-level votes verbatim
  (only when the override JSON supplies them).
- **`calibrated`** (a.k.a. `real-calibrated`) — the **district
  aggregate** is real and matches the certified 2023 Senate or 2025
  Assembly totals exactly; the **per-precinct distribution** is
  interpolated from 2024 presidential. This is the default for
  baseline totals.
- **`modeled`** — used for mode breakdowns (ED/EV/VBM splits are
  always modeled unless overrides supply real per-mode data).
- **`scenario (based on …)`** — sliders are active; the underlying
  source is preserved in parentheses.

## URL state

The hash encodes the full scenario so a link reproduces an exact view.
Recognized keys (defaults omitted):

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
  ticket-level candidate-vote shares (D1+D2 vs R1+R2 vs Other). Each
  party's ticket pool is then split between its two candidates using
  the intra-party slider.
- **Bullet voting**: with rate `b`, total Assembly candidate-votes =
  voters × (2 − b). Default `b` is the 2025 historical rate (5%).
- **Coattail c**: effective Assembly swing for a (muni, mode) =
  `cwAsm[mode] + muniAsm[mode] + c × (cwSen[mode] + muniSen[mode])`.

## Data sources

- Precinct geometries + 2024 presidential: NJ Precincts shapefile from
  [21MetcalfJ/2024Precincts](https://github.com/21MetcalfJ/2024Precincts).
- 2023 LD8 Senate certified totals: NJ Division of Elections.
- 2025 LD8 Assembly certified totals: NJ Division of Elections.
- LD8 post-2021 municipality list: NJ Apportionment Commission 2021
  plan; corroborated by
  [Wikipedia](https://en.wikipedia.org/wiki/New_Jersey%27s_8th_legislative_district)
  and Ballotpedia.

## Out of scope (intentionally not built)

- Primary-election modeling
- Per-precinct hand-paint editor
- Demographic overlays
- Other races on the same ballot
- Multi-cycle comparison (2023 vs 2025 vs 2027)
- Write-in candidates beyond the Other bucket

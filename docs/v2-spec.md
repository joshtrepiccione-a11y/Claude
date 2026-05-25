# LD8 Campaign Intelligence Dashboard — v2 Specification

Integrated brief: original LD8 prototype spec + v2 refinements. This is
the canonical document for the rewrite. It supersedes the conversation
prompts that produced v1 and answers the open `[DECIDE]` items.

## 0. Status

**v1 (shipped, on `claude/initial-setup-SjVdw`):**
- Static site (HTML + plain JS + Leaflet), zero build step.
- LD8 precinct map: 149 precincts, 25 municipalities (4 Atlantic + 21
  Burlington), 2021-redistricting boundaries.
- Two races: 1 Senate seat, 2 Assembly seats (vote-for-two).
- Baselines calibrated to certified 2023 Senate (Tiver/Burton) and 2025
  Assembly (Angelozzi/Katz vs. Torrissi/Umba) district aggregates;
  per-precinct distribution interpolated from 2024 presidential.
- Scenario engine: per-mode Sen/Asm swings, coupled turnout mix,
  bullet-vote rate, intra-party D1/R1 splits, Sen→Asm coattail,
  per-muni overrides for all 25 munis.
- 4 color-by metrics (Senate margin / Assembly ticket margin / Assembly
  outcome / turnout), URL-hash state, provenance badges.
- Deployed on Vercel + GitHub Pages workflow.

**v2 goal:** turn it from a "modeling toy" into a prescriptive
**campaign intelligence dashboard** that answers *"so what should the
campaign do?"* — for either side of the race, while preserving all v1
modeling functionality.

## 1. Directional decisions (locked in)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Stack | **React + TypeScript + Vite** (full migration) |
| 2 | Partisan framing | **Party-neutral** — works for D, R, or third-party perspective |
| 3 | Data scope | **Ambitious** — voter file + demographics + multi-cycle history |
| 4 | Build sequence | **The stated top 7 first**, then phase 2 features |

## 2. Goals & non-goals

### 2.1 Goals
1. Answer "where do votes need to come from?" — at precinct, muni, and
   mode granularity.
2. Answer "what should the campaign do?" — concrete recommended
   actions per geography.
3. Be usable by both a **candidate** (plain English, minimal sliders)
   and an **operator** (full modeling controls preserved).
4. Be **honest about data**: every prescriptive output is traceable to
   a labeled source (certified / calibrated / modeled / scenario /
   estimated / user-adjusted).
5. Be reusable for **other races and districts** by changing data and
   configuration only, not code.

### 2.2 Non-goals (carryover from v1, still excluded)
- Primary-election modeling
- Per-precinct hand-paint editor
- Write-in candidates beyond an Other bucket
- Real-time results ingestion
- Mass-comms send (no email/SMS triggering from the tool itself)

### 2.3 Non-goals added for v2
- **Not a voter contact platform.** v2 produces target lists; it does
  not initiate canvasses, calls, or texts.
- **Not a poll aggregator.** No live polling overlays.
- **No fundraising features.** Resource allocation framing is implicit
  in "priority" only; dollar amounts are out of scope.

## 3. Users & modes

### 3.1 Personas
- **Candidate** (non-technical): reads the dashboard, needs to know
  "am I winning, and what should I focus on this week."
- **Campaign manager** (semi-technical): drives target lists, ranks
  precincts, exports CSVs for field/comms.
- **Consultant / analyst** (expert): runs scenarios, stress-tests
  assumptions, models alternative pathways.
- **Reporter / observer** (party-neutral): inspects the model without
  taking a side; checks data provenance.

### 3.2 Mode toggle (top header)

**Candidate Mode** (default for first-time visitors)
- KPI cards + Scenario Summary + Path to Victory + 3-row "Top
  opportunities" table.
- Sliders hidden behind a "Try a scenario" drawer with 4 presets and
  one master swing.
- Plain-English narrative everywhere.

**Expert Mode**
- Everything in Candidate Mode, plus all v1 sliders (per-mode Sen/Asm
  swings, bullet rate, intra-party, coattail, per-muni overrides).
- Full precinct table, all map layers, scenario presets dropdown.
- Map gets a layer selector instead of one-at-a-time radio.

Mode persists in URL (`mode=candidate|expert`) and `localStorage`.

## 4. Architecture

### 4.1 Stack
- **Vite + React 18 + TypeScript** (strict mode).
- **Leaflet** via `react-leaflet` (preserves v1 map behavior).
- **Zustand** for global app state (scenario, mode, selection) — small,
  middleware-friendly, easy URL-sync.
- **TanStack Table** for the ranked precinct table (sorting, filtering,
  column visibility, virtualized rows).
- **Recharts** for vote-mode analysis bars + sensitivity sparklines.
- **CSS modules** + a small design-token layer (no Tailwind unless we
  later decide; the v1 dark theme is the visual baseline).
- **No backend.** All computation runs in the browser over a static
  GeoJSON + a small JSON sidecar for non-geographic data.

### 4.2 File layout
```
v2/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── public/
│   ├── data/
│   │   ├── ld8_precincts.geojson          # geometry + baseline
│   │   ├── ld8_demographics.json          # ACS overlays per precinct
│   │   ├── ld8_voterfile.json             # registered, turnout history
│   │   ├── ld8_history.json               # multi-cycle results
│   │   └── ld8_metadata.json              # candidates, dates, sources
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── state/
    │   ├── store.ts                       # zustand root store
    │   ├── urlSync.ts                     # hash <-> store
    │   └── selectors.ts                   # derived state
    ├── data/
    │   ├── load.ts                        # fetch + validate GeoJSONs
    │   ├── types.ts                       # all domain TS types
    │   └── schema.ts                      # zod validators
    ├── model/
    │   ├── scenario.ts                    # v1 math: swings, modes, etc.
    │   ├── scoring.ts                     # priority scores
    │   ├── recommendations.ts             # rules-based actions
    │   ├── scenarioPresets.ts             # preset definitions
    │   ├── pathToVictory.ts               # path-finding logic
    │   ├── voteModeAnalysis.ts            # mode sensitivity
    │   ├── assemblyMechanics.ts           # bullet/coattail/intra
    │   ├── dataConfidence.ts              # provenance + badges
    │   └── exportUtils.ts                 # CSV / PDF builders
    ├── components/
    │   ├── layout/
    │   │   ├── AppHeader.tsx
    │   │   ├── KpiBar.tsx
    │   │   ├── ModeToggle.tsx
    │   │   └── ExportControls.tsx
    │   ├── map/
    │   │   ├── PrecinctMap.tsx
    │   │   ├── MapLayerControls.tsx
    │   │   └── HoverPanel.tsx
    │   ├── panels/
    │   │   ├── ScenarioSummary.tsx
    │   │   ├── PathToVictory.tsx
    │   │   ├── MunicipalityDashboard.tsx
    │   │   ├── PrecinctTable.tsx
    │   │   ├── VoteModeAnalysis.tsx
    │   │   ├── DataNotes.tsx
    │   │   └── AssemblyInsights.tsx
    │   ├── controls/
    │   │   ├── ScenarioPresets.tsx
    │   │   ├── ExpertSliders.tsx          # all v1 sliders
    │   │   ├── MuniOverrides.tsx
    │   │   └── RaceSelector.tsx
    │   └── primitives/
    │       ├── StrategicPriorityBadge.tsx
    │       ├── RecommendedActionBadge.tsx
    │       ├── ProvenanceBadge.tsx
    │       └── Sparkline.tsx
    ├── styles/
    │   ├── tokens.css                     # colors, spacing, type
    │   └── globals.css
    └── tests/
        ├── scoring.test.ts
        ├── pathToVictory.test.ts
        ├── recommendations.test.ts
        └── scenario.test.ts
```

### 4.3 State management

**Zustand store shape** (TypeScript):
```ts
type AppState = {
  // UI mode
  uiMode: "candidate" | "expert";
  view: "baseline" | "scenario";

  // Selection
  raceFocus: "sen" | "asm";
  mapLayer: MapLayerKey;
  selectedPrecinct?: string;
  selectedMuni?: string;

  // Modeling state (preserved from v1)
  scenario: {
    mode: "total" | "ed" | "early" | "vbm";
    senSwing: ModeTriplet;
    asmSwing: ModeTriplet;
    cwShare:  ModeTriplet;
    bullet: number;
    intraD: number;
    intraR: number;
    coattail: number;
    muniOverrides: Record<string, MuniOverride>;
    activePreset?: string;
  };

  // Filtering (precinct table)
  filters: {
    munis: string[];
    actions: ActionTag[];
    minPriority: number;
    minVotes: number;
  };
};
```

### 4.4 Component → logic separation

**Rule:** components never compute scenario math, scoring, or
recommendations. They consume **selectors** (derived state) only.
- All math lives in `src/model/*.ts`, fully unit-testable.
- Components import a `useScenarioResult()` hook (or similar) and
  render. This is non-negotiable because the v2 prompt's prescriptive
  features can't be debugged if logic is tangled into JSX.

### 4.5 Migration from v1 (zero-downtime path)

1. Create `v2/` subtree. v1 keeps running at `/`.
2. Build out v2 in parallel; Vercel previews from PR branches.
3. When v2 hits parity + ships top-7, replace `/` content with v2
   build output. v1 archived to `legacy/v1/` branch.
4. URL-hash schema is **backward-compatible**: every v1 hash key
   (`mode`, `metric`, `race`, `view`, `sen_sw`, `asm_sw`, `sh`, `b`,
   `id`, `ir`, `co`, `mu`) is parsed by v2 unchanged. v2 adds new keys
   only (`ui`, `layer`, `preset`, `sel`, `f`).
5. The `data/ld8_precincts.geojson` produced by `scripts/build_ld8.py`
   is consumed unchanged by v2 (with the new sidecar JSONs joined at
   load time).

## 5. Data pipeline (ambitious scope)

### 5.1 Inputs (target layout under `data/`)

| File | Source | Confidence | Notes |
|------|--------|------------|-------|
| `ld8_precincts.geojson` | 21MetcalfJ/2024Precincts, NJ DoS 2023/25 | certified (aggregates) + calibrated (precinct shares) | Already produced by v1 build script. |
| `ld8_demographics.json` | ACS 5-year tract data → precinct via areal interpolation | estimated | Age, education, race/ethnicity, income, owner-occupied — at the precinct level. |
| `ld8_voterfile.json` | NJ public voter file (Statewide Voter Registration System) | certified (per-voter) → aggregated to precinct | Registered voters by party, registration date, vote-history flags (2020 / 2021 / 2022 / 2023 / 2024 / 2025). |
| `ld8_history.json` | NJ DoS certified results | certified | Multi-cycle precinct-level results (2017, 2019, 2021, 2023, 2025) for trend analysis and overperformance. |
| `ld8_metadata.json` | Hand-curated | curated | Candidate names, key dates, hometown muni for each candidate, news links. |

### 5.2 Data engineering work required for v2

1. **Voter file ingest pipeline** (`scripts/ingest_voterfile.py`):
   request NJ voter file (FOIA / public records), aggregate to
   precinct, join to GeoJSON by precinct name.
2. **ACS demographics pipeline** (`scripts/ingest_acs.py`): pull
   block-group level ACS via Census API, areal-interpolate to
   precinct polygons.
3. **Historical results joiner** (`scripts/ingest_history.py`):
   compile certified precinct-level results across cycles. NJ DoS
   publishes these as PDFs per district; this is the most labor-
   intensive piece.
4. **Schema validation**: each sidecar JSON validated with `zod` on
   load; failing precincts get degraded (gray) instead of breaking
   the app.

### 5.3 Confidence taxonomy (six states)

| Label | Meaning | Example |
|-------|---------|---------|
| **Certified** | Verbatim from a certifying authority (NJ DoS, Census). | 2025 Assembly district totals. |
| **Calibrated** | District aggregate is certified; per-precinct distribution is interpolated. | v1 Senate baseline. |
| **Modeled** | Computed from rules + assumptions, no direct certification. | Statewide-mix mode breakdowns. |
| **Estimated** | Statistical estimate with documented method. | ACS demographics areal-interpolated to precinct. |
| **Interpolated** | Spatial or temporal interpolation between known data points. | Demographics where ACS tracts cross precinct boundaries. |
| **User-adjusted** | The user moved a slider or overrode a value. | Anything in scenario view. |
| **Scenario** | A composite badge: `Scenario (based on <underlying>)`. | What baseline becomes when sliders are active. |

Every visible metric carries a badge. Every recommendation includes
its inputs' confidence in its tooltip.

## 6. Party-neutral framing rules

The new prompt's example language (*"Democrats win"*, *"VBM Chase"*)
implies a partisan POV. v2 stays neutral by following these rules:

### 6.1 Summary writer

Three template families, chosen by current scenario state:

1. **D-leading scenario:** "Under this scenario, the Democratic
   candidate (Anthony Angelozzi-style ticket) wins the Senate race by
   1,245 votes (D+2.3%)."
2. **R-leading scenario:** "Under this scenario, Latham Tiver (R)
   holds the Senate seat by 1,800 votes (R+3.3%)."
3. **Tied/very close:** "Within statistical noise. Either party can
   plausibly win depending on +/- 0.5 pt swings in the modeled
   assumptions."

The Summary **names whichever side is leading** — no party gets
implicit endorsement.

### 6.2 Path to Victory adapts to losing side

When the scenario shows a D win, Path to Victory shows **the R path
back** (and a "Hold the lead" view for the D side). When R is winning,
the reverse. Both perspectives are always accessible via a small
"Perspective" toggle in that panel.

```
[Sen] Hold the lead (D)  |  Path to victory (R)
[Asm] Hold both seats (D)  |  Win one seat (R)
```

This makes the tool useful to either campaign without picking sides.

### 6.3 Recommendations

Recommendations carry a **lean tag** rather than a "we" perspective:

| Bad (partisan) | Good (neutral) |
|---|---|
| "Send Democratic VBM chase mail in Evesham" | "VBM chase — D-leaning precinct (D+12 in 2025); high net-D opportunity (+420 if VBM share rises 3 pts)" |
| "Defend Mount Laurel" | "Defensive hold for D — currently D-leaning; high vote volume; scenario shift risk" |

Each recommendation reads symmetrically: replace "D" with "R" and the
sentence still makes sense.

### 6.4 Color palette respects neutrality

- D-leaning: blue family.
- R-leaning: red family.
- Strategic priority (the most important layer): a **purple/yellow
  diverging ramp**, not red/blue — so the "where the action is" layer
  is decoupled from partisanship.
- Recommended-action badges: a categorical palette with no R/D
  semantic association.

## 7. Feature catalog

Each subsection maps to a numbered section of the v2 prompt. Sections
include scope, interactions, data dependencies, and integration with
v1.

### 7.1 Scenario Summary panel (v2 §1, top-7 priority #1)

**Scope.** Always-visible panel (Candidate Mode: hero position; Expert
Mode: top-right of main content). Generates a 4-6 sentence plain-
English summary that updates on every scenario change.

**Inputs.**
- Current scenario state.
- Computed: scenario margin, vs-baseline delta, biggest-net-change
  muni list (top 3), most-sensitive vote mode (computed by
  finite-difference: which mode's +1pt swing produces the largest
  margin change?).

**Output (template).**
> Under this scenario, **{Party} wins the {Race} race by {votes}**
> votes (**{margin pct}**). That's a **{delta}-vote change from
> baseline**, putting the race in **{Safe|Lean|Tilt|Toss-up|Flipped}**
> territory.
>
> The biggest net-vote movement comes from **{muni1}, {muni2}, and
> {muni3}**. The scenario is most sensitive to **{mode}** — a 1 point
> swing in {mode} moves the margin by **{X}** votes.
>
> **Takeaway:** {takeaway sentence keyed to the losing side's path}.

**Race-rating thresholds** (configurable in `dataConfidence.ts`):
- Safe: > 10 pt margin
- Lean: 5-10 pt
- Tilt: 2-5 pt
- Toss-up: 0-2 pt
- Flipped: scenario winner ≠ baseline winner

**Provenance line under the summary:** every input gets a tiny badge
trail (`based on: 2025 Assembly certified · scenario-adjusted`).

### 7.2 Path to Victory module (v2 §2, top-7 #2)

**Scope.** Ranked list of "interventions" — each is a specific
move the losing-side campaign could make, with the net-vote payoff.

**Algorithm.**
For each (muni × mode × direction-of-swing), compute the net-vote
delta of a **standardized +3pt swing** for the losing side (clamped to
realistic per-muni ceilings). Rank by absolute net-vote impact.

```ts
function pathToVictory(state, losingSide): Intervention[]
```

Returns top N=8 interventions:
```
1. Improve VBM margin in Evesham by 3 pts: +420 net votes
   (Evesham has 32 precincts and 18% VBM share — high leverage)
2. Increase turnout in Mount Laurel D precincts by 5%: +310 net votes
3. Reduce R Election Day margin in Hammonton by 2 pts: +180 net votes
   ...
8. Persuasion in Medford swing precincts: +60 net votes
```

Each row includes:
- The intervention.
- Net votes if achieved.
- "Plausibility" (heuristic 1-5 dots — based on historical movement in
  comparable precincts).
- Cumulative running total: "if you achieve #1+#2+#3, you net +910 —
  enough to flip the race."

**If the focused side is already winning**, the header becomes "Path
to Holding the Lead" and the same algorithm runs against the *winning*
side — i.e., "which moves would lock in the lead even if the
environment turns 3 points more hostile?"

### 7.3 Ranked Precinct Table (v2 §3, top-7 #3)

**Library.** TanStack Table with virtualized rows (149 in LD8 but
designed for districts with 500+).

**Columns.**

| Column | Type | Source |
|---|---|---|
| Precinct ID | string | data |
| Muni | string | data |
| Baseline margin | pct (signed) | model |
| Scenario margin | pct (signed) | model |
| Net vote Δ | int (signed) | model |
| Total votes | int | model |
| Turnout vs. registered | pct | data (voter file) |
| ED share | pct | data |
| EV share | pct | data |
| VBM share | pct | data |
| Persuasion priority | 0-100 | scoring.ts |
| Base turnout priority | 0-100 | scoring.ts |
| VBM priority | 0-100 | scoring.ts |
| Overall priority | 0-100 | scoring.ts |
| Recommended action | enum | recommendations.ts |
| Provenance | badges | dataConfidence.ts |

**Sorting.** Click any column. Default sort: Overall priority desc.

**Filtering.** Filter by muni (multi-select), recommended action
(multi-select), min priority slider, min total votes slider.

**Selection.** Click a row → map zooms to precinct, hover panel locks
to it, Scenario Summary becomes "for this precinct" mode.

**Empty state.** If voter-file data is missing for a precinct, the
turnout-related columns render `—` with a tooltip explaining that
turnout-gap requires voter-file integration. Scoring degrades
gracefully — sub-scores that depend on missing data are excluded from
the overall weighted score, not zeroed.

### 7.4 Strategic Priority Scoring (v2 §4)

**Module:** `src/model/scoring.ts`, fully documented, no black boxes.

**Inputs available per precinct:**
- `total_votes` (volume)
- `margin` (competitiveness)
- `net_vote_opportunity` (model output)
- `swing_potential` (modeled response to +3pt swing)
- `vote_mode_concentration` (Herfindahl of ED/EV/VBM shares)
- `turnout_gap` (registered − turned out, when voter file available)
- `candidate_overperformance` (precinct's prior-cycle deviation from
  district-average — when historical data available)

**Sub-scores (each 0-100, computed via min-max normalization across
the district):**

```ts
PersuasionPriority = 0.40 * margin_competitiveness
                   + 0.30 * total_votes_norm
                   + 0.20 * swing_potential
                   + 0.10 * overperformance_residual

BaseTurnoutPriority = 0.40 * own_side_margin_strength
                    + 0.30 * turnout_gap            // gracefully skipped if missing
                    + 0.20 * total_votes_norm
                    + 0.10 * registration_advantage // voter-file dependent

VBMPriority = 0.40 * vbm_share_advantage
            + 0.30 * own_side_vbm_lean
            + 0.20 * net_vote_opportunity
            + 0.10 * mode_concentration_inverse

OverallPriority = 0.40 * net_vote_opportunity
                + 0.30 * max(persuasion, base, vbm)
                + 0.20 * total_votes_norm
                + 0.10 * margin_uncertainty
```

**Graceful degradation:** when a sub-input is missing, its weight is
redistributed across remaining inputs. The score's confidence
indicator (a 1-3 dot indicator next to the score badge) shrinks
accordingly.

**Inverse-distance plausibility check:** before showing a score >80,
verify at least one comparable precinct exists in the district with
real data showing similar movement is achievable. If not, cap the
score and add a "speculative" footnote.

### 7.5 Municipality Dashboard (v2 §5)

**Scope.** A grid (Expert) or list (Candidate) of muni cards. Each
card shows:

```
Evesham Township                              [Persuasion Battleground]
─────────────────────────────────────────────────────────────────────
Baseline:  D+8.2 (4,231 votes)        Scenario:  D+11.4 (5,890 votes)
Net Δ:     +1,659 votes (D-favorable)
Strongest mode: VBM (28% of muni turnout)
Top precincts: Evesham 04, Evesham 18, Evesham 22 (sortable)
Recommended action: VBM Chase
```

**Classifications** (rules in `recommendations.ts`):
- Base Turnout Opportunity — own side strong, turnout below district
  median, large registered-voter pool.
- Persuasion Battleground — margin within ±5 pts, total votes above
  median.
- Defensive Hold — own side leading, scenario shows negative shift,
  high vote volume.
- Low-ROI Area — far from competitive, small vote volume.
- Opposition Stronghold — opposing side wins by >15, low persuasion
  ROI.
- High-Volume Swing Area — large vote volume, margin within ±10,
  swing potential >median.

**Interaction.** Click muni → map zooms + filters + table filters to
its precincts. Click again to deselect.

### 7.6 Map Layer Improvements (v2 §6)

**v1 layers preserved:**
- Senate margin (D−R)
- Assembly ticket margin
- Assembly outcome (2D / 1D1R-D / 1D1R-R / 2R categorical)
- Turnout

**v2 new layers:**
- Net vote change (baseline → scenario, diverging green/orange)
- VBM strength (sequential blue)
- EV strength (sequential blue)
- ED strength (sequential blue)
- Persuasion opportunity (sequential purple)
- Base turnout opportunity (sequential teal)
- **Overall strategic priority** — **the default in Candidate Mode**,
  uses a purple/yellow diverging ramp deliberately decoupled from
  red/blue.

**Layer selector UI:**
- Candidate Mode: a 3-option radio (Result / Opportunity / Turnout)
  that picks the obvious layer for each category.
- Expert Mode: a full dropdown with all 11 layers, plus per-layer
  legends and accessibility options (a "high-contrast" toggle).

### 7.7 Scenario Presets (v2 §7, top-7 #5)

**Module:** `src/model/scenarioPresets.ts` — each preset is a typed
object with a label, description, and a partial scenario delta:

```ts
type Preset = {
  id: string;
  label: string;
  description: string;
  // Applied as a delta on top of current scenario, or as a full reset
  // (presets["baseline"] does the latter).
  apply: (s: ScenarioState) => ScenarioState;
};
```

**Initial preset list:**

| ID | Label | What it changes |
|---|---|---|
| `baseline` | Reset to baseline | All sliders to defaults. |
| `low-turnout` | Low-turnout local race | Turnout scaled to 65% of 2025; ED share +5 (off-year ED bias). |
| `high-turnout` | Presidential-style electorate | Turnout scaled to 130% of 2025; VBM share +5. |
| `strong-d-vbm` | Strong Democratic VBM | VBM swing +6 D. |
| `strong-r-ed` | Strong Republican Election Day | ED swing +6 R. |
| `split-ticket` | Split-ticket Assembly | Intra-D shifted to favor incumbent; bullet rate +5. |
| `hometown-bump` | Candidate hometown bump | +8 in candidate's home muni (from metadata.json). |
| `anti-incumbent` | Anti-incumbent environment | -4 swing against current officeholders in their seat. |
| `top-of-ticket-boost` | Top-of-ticket boost | +5 uniform swing for whichever party wins national environment slider. |
| `top-of-ticket-drag` | Top-of-ticket drag | -5 uniform swing same logic. |

**UI.** Dropdown in the AppHeader. Hovering a preset shows the
description tooltip; clicking applies. Active preset is a chip in the
header with an X to clear.

### 7.8 Data Source and Confidence Labels (v2 §8, top-7 #4)

**`DataNotes` panel:** collapsible bottom-of-page section. Includes:

- Per-data-source confidence + last-updated date + link to source.
- Per-precinct provenance heatmap (so a user can see which precincts
  have voter-file coverage, which are interpolated, etc.).
- Known limitations:
  - ACS demographics interpolation error margin.
  - Voter file lag (typically 2-6 weeks behind real time).
  - Statewide-mix overlay assumption (ED 55%, EV 15%, VBM 30%).
  - District-aggregate calibration approach (per-precinct shapes from
    presidential).
- "How to improve this" notes pointing to `ld8_real_baselines.json`
  override path.

**Inline confidence badges** appear on every KPI card, every summary
sentence, every precinct table cell, and every recommendation. The
ProvenanceBadge primitive renders them consistently.

### 7.9 Export Features (v2 §9, top-7 #7)

**Phase 1 (must ship in v2.0):**
- **CSV: Precinct table** — every column the user has visible, plus a
  metadata header row indicating scenario state and timestamp.
- **CSV: Muni summary** — one row per muni.
- **Copyable share URL** — already in v1, port over verbatim.

**Phase 2 (architectural placeholder in v2.0, full ship in v2.1):**
- **PDF Strategy Report** — `react-pdf` or print-to-PDF via a
  dedicated `/report` route. One-page summary + multi-page detail:
  1. Race overview (KPIs + scenario summary)
  2. Path to Victory (top 8 interventions)
  3. Top 20 target precincts (table)
  4. Muni breakdown (cards)
  5. Key assumptions + data notes

`exportUtils.ts` has the full architecture; PDF rendering can be
stubbed initially with a "Generate report (preview)" button that opens
a print-friendly HTML view.

### 7.10 Better Layout and Visual Hierarchy (v2 §10)

**Top header (sticky):**
```
[LD8 Campaign Intelligence]  [Race ▾ Senate · Assembly]  [Mode: Candidate | Expert]
[Preset ▾ Baseline]  [⇣ Export]  [⌘K Share]
```

**KPI bar (sticky under header):**
```
| Projected winner | Margin | Votes needed* | Race rating | Top opportunity | Top risk |
```
\* In a "leading" scenario, "Votes needed" becomes "Cushion".

**Main row:**
```
| MAP (60%)                                  | SCENARIO SUMMARY (40%)        |
|                                            | (always visible)              |
```

**Lower content (vertical stack, full width):**
1. Path to Victory
2. Municipality Dashboard
3. Ranked Precinct Table
4. Vote Mode Analysis
5. Data Notes

**Expert drawer:** slide-out right-side panel triggered from the header
("Expert controls"). Contains all v1 sliders + per-muni overrides.

**Responsive breakpoints:**
- ≥1280px: layout as described.
- 768-1279px: KPIs wrap to 2 rows; map+summary stack vertically; table
  becomes scrollable.
- <768px: KPI carousel; everything stacked; expert drawer becomes a
  full-screen modal. Sliders get coarser steps (0.5 → 1).

### 7.11 Recommended Actions Engine (v2 §11)

**Module:** `src/model/recommendations.ts`. Rules are a pure
function:

```ts
type ActionTag =
  | "vbm_chase" | "ev_push" | "ed_turnout"
  | "persuasion_mail" | "door_knock" | "candidate_visit"
  | "digital_ad" | "base_turnout" | "low_priority" | "monitor_only";

function recommendAction(p: Precinct, scen: ScenarioResult): {
  primary: ActionTag;
  secondary?: ActionTag;
  reasoning: string[];     // each line is one "because" clause
  confidence: 1 | 2 | 3;
};
```

**Initial rule set (transparent, in code comments + DataNotes):**

| Condition | Action | Reasoning template |
|---|---|---|
| persuasion_priority > 70 && margin_pct ∈ [-5, +5] | persuasion_mail | "Narrow margin, high vote volume." |
| base_turnout_priority > 70 && turnout_gap > 15% | base_turnout | "Strong lean, large untapped registered base." |
| vbm_priority > 70 && vbm_lean_own > 8 | vbm_chase | "Own side already wins VBM by {X}; chase more." |
| total_votes < 100 && margin_pct outside ±20 | monitor_only | "Small, settled precinct." |
| volume > muni_median && Δ_scenario < -50 | defensive_hold (own side leading) | "Vote volume is large and scenario shows erosion." |
| muni == candidate_hometown && proximity_to_election < 30d | candidate_visit | "Hometown muni; rally / personal touch." |
| vbm_share > 30% && vbm_swing > +3 own side | vbm_chase | "VBM is high-volume and trending favorably." |
| margin near zero && total_votes > muni_median | persuasion_mail | "Persuasion ROI peaks at competitive precincts." |

Each rule fires independently; the highest-confidence + highest-impact
rule wins. `reasoning` array becomes a tooltip on the
RecommendedActionBadge primitive.

### 7.12 Vote Mode Analysis section (v2 §12)

**Panel.** Shows:
- A 3-bar chart (ED / EV / VBM) for both Senate and Assembly, with D
  vs. R split.
- A **sensitivity sparkline**: how much does the scenario margin change
  per ±1pt swing in each mode?
- A geographic mini-map showing which munis each mode dominates.

**Plain-English line:**
> "Vote-by-Mail is currently 28% of LD8 turnout but accounts for 41% of
> Democratic margin. A 5-point shift in VBM partisanship would change
> the Senate result by ±1,400 votes — larger than the same shift in
> ED (740) or EV (210)."

### 7.13 Assembly-Specific Improvements (v2 §13)

**Panel.** "Assembly Insights" — only renders when Race Focus is
Assembly.

**Includes:**
- Ticket-level result (D total vs. R total).
- Candidate-level result with bar chart of all 4 candidates.
- **Bullet-vote impact gauge**: slider preview showing how the result
  changes from 0 to 30% bullet rate.
- **Split-ticket detector**: flags 1D1R scenarios with R1>R2 large
  intra-party gap as historically realistic; flags configurations
  that produce mathematically extreme outcomes (e.g., 30% bullet +
  70/30 intra-party + 15pt swing) with a "this is improbable" badge.
- **Coattail visualization**: when coattail > 0, render the implied
  Sen → Asm swing as a faint arrow chart.

**Plain-English explanation example (computed from current scenario):**
> "This scenario produces a split Assembly result because R1 (Torrissi)
> outperforms R2 by 4.6 pts while Democratic bullet voting is elevated
> at 12%. Historically, NJ Assembly produces a split outcome in
> approximately 14% of races with these conditions."

### 7.14 Accessibility & Responsiveness (v2 §14)

**Mandatory:**
- WCAG 2.1 AA contrast on all text, all badges.
- All map information available in non-color form (table, tooltips).
- Keyboard navigation: every interactive control reachable via Tab;
  Enter/Space to activate; arrow keys to move sliders.
- Screen reader labels on all sliders, maps (with a textual fallback
  data summary), and badges.
- `prefers-reduced-motion`: disables tooltip fade-ins, sparkline
  animations.
- Color-blind-safe palette toggle (deuteranopia / protanopia /
  tritanopia presets) in DataNotes panel.

**Responsive:** see §7.10.

### 7.15 Error Handling and Empty States (v2 §17)

- Missing precinct geometry: skipped from map, listed in DataNotes
  with reason.
- Missing voter file for a precinct: turnout-gap columns and base-
  turnout sub-score render `—`; tooltip explains.
- Missing demographics: persuasion overlays render `—`.
- Scenario produces NaN (e.g., 100% bullet rate + 0 voters):
  inputs auto-clamped to safe bounds; toast notification explains.
- Export fail: inline error with retry; CSV regenerated client-side
  with a copy-to-clipboard fallback.
- All errors use plain language, never expose stack traces.

## 8. Build sequence

### Phase 0 — Scaffolding (1 sprint)
- Vite + React + TS project under `v2/`.
- Port v1 data files; load and validate with zod.
- Port v1 scenario math to `model/scenario.ts`; unit tests verify
  baseline totals match certified.
- Port v1 map + sliders as React components (functional parity, ugly
  layout is fine).
- URL-hash compatibility layer.

**Definition of done:** v2 renders the v1 map with all v1 controls;
every v1 URL works in v2.

### Phase 1 — The stated top 7 (in order)
1. **Scenario Summary panel** (§7.1) + KPI bar (§7.10 partial)
2. **Path to Victory** (§7.2) — with both perspectives toggle
3. **Ranked Precinct Table** (§7.3) — TanStack + basic columns
4. **Data Confidence Labels** (§7.8) — ProvenanceBadge primitive +
   inline badges everywhere
5. **Scenario Presets** (§7.7)
6. **Candidate/Expert mode toggle** (§3.2) — reorganize layout per
   §7.10
7. **CSV Export** (§7.9 phase 1)

**Definition of done:** every feature in this list is functional with
all v1 modeling preserved. Ship this as v2.0.

### Phase 2 — Depth (post-launch)
- Strategic Priority Scoring full module (§7.4) — sub-scores, fallback
  logic, confidence indicators.
- Recommendations Engine (§7.11) — full rule set, reasoning tooltips.
- Municipality Dashboard (§7.5).
- Map layer expansion (§7.6) — all 11 layers.
- Vote Mode Analysis (§7.12).
- Assembly Insights (§7.13).

### Phase 3 — Polish
- PDF Strategy Report (§7.9 phase 2).
- Accessibility audit + colorblind palettes (§7.14).
- Multi-district configuration: extract LD8-specific assumptions into
  a `district.config.ts` so a v3 LD3 / LD11 / muni-level deployment is
  a config swap.

## 9. Open questions / risks

1. **Voter-file acquisition.** NJ's SVRS is technically public but
   requires a formal request. Timeline uncertain. **Mitigation:** v2.0
   ships without voter-file data using degraded-but-graceful behavior
   in scoring; voter-file integration is Phase 2.
2. **Historical results coverage.** NJ DoS publishes precinct-level
   results inconsistently across counties and cycles. Atlantic and
   Burlington may have different PDF formats. **Mitigation:** start
   with district-aggregate history (which we have); plumb precinct-
   level history as a Phase 2 enhancement.
3. **Demographic interpolation error.** ACS block-group → precinct
   areal interpolation introduces material error in small precincts.
   **Mitigation:** label all demographic-derived scoring as
   "estimated"; expose interpolation method in DataNotes.
4. **Candidate names for 2027 unknown sides.** Senate D challenger and
   Assembly R candidates unknown. Already placeholdered; metadata
   config makes swap trivial when slates are announced.
5. **Plausibility of "Path to Victory" recommendations.** A user could
   read "+3pt swing in Evesham VBM" as feasible advice — it might
   not be. **Mitigation:** plausibility dots (§7.2) and explicit
   "speculative" badge on out-of-distribution recommendations.
6. **Multi-district reusability.** v2 hard-codes LD8 in many places.
   The Phase 3 config extraction is real engineering. **Mitigation:**
   `district.config.ts` shape sketched up front; LD8 constants
   centralized from Phase 0.

## 10. Definition of done for v2.0

- Vercel deploy of `v2/` replaces the current site at `/`.
- Every v1 feature works (scenario math, URL hash, map, sliders).
- Top-7 features from §8 Phase 1 all shipped.
- Test suite (Vitest): `model/scenario.test.ts`, `scoring.test.ts`,
  `pathToVictory.test.ts`, `recommendations.test.ts` — all green.
- Lighthouse: Performance ≥85, Accessibility ≥95.
- No console errors with any v1 URL hash.
- DataNotes panel auditable: every visible metric traces to a labeled
  source.
- README updated; CHANGELOG entry; v1 archived in `legacy/v1`.

## 11. Next recommended improvements (v2.1+)

- Voter-file integration once SVRS request lands.
- PDF Strategy Report.
- Multi-district config: `district.config.ts` + a `/districts/ld11/`
  route as proof of reusability.
- Recommendation back-testing: replay 2023 / 2025 with v2's
  recommendation engine, measure "would-have-been-right" rate.
- A/B framework: lets a user compare two scenarios side-by-side.

## 12. Commands (post-implementation)

```bash
# Dev
cd v2 && npm install && npm run dev

# Test
npm run test
npm run test -- --coverage

# Lint / typecheck
npm run typecheck
npm run lint

# Build
npm run build
npm run preview

# Deploy
git push origin <branch>   # Vercel previews automatically
```

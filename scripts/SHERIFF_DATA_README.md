# Atlantic County Sheriff — real precinct results drop-in

This is the **import contract** for replacing the model's calibrated
(interpolated) baselines with **real, certified precinct/district-level
results** from the Atlantic County Clerk's Office.

When `data/atlantic_sheriff_real.csv` is present and passes validation, the
Sheriff build script uses the real per-district numbers (provenance `real`)
instead of county-calibrated interpolation (provenance `calibrated`).

## The file: `data/atlantic_sheriff_real.csv`

One row per election district. Header (exact column names, order flexible):

| Column | Required | Meaning |
|---|---|---|
| `county` | yes | "Atlantic" |
| `municipality` | yes | e.g. "Mullica Township", "Atlantic City" |
| `precinct` | yes | district label as published, e.g. "Mullica Township 01" |
| `sheriff2020_d` | yes | 2020 Sheriff — Eric Scheffler (D) votes |
| `sheriff2020_r` | yes | 2020 Sheriff — Joseph O'Donoghue (R) votes |
| `sheriff2023_d` | yes | 2023 Sheriff — Eric Scheffler (D) votes |
| `sheriff2023_r` | yes | 2023 Sheriff — Joseph O'Donoghue (R) votes |
| `gov2025_d` | optional | 2025 Governor — Mikie Sherrill (D) votes |
| `gov2025_r` | optional | 2025 Governor — Jack Ciattarelli (R) votes |

Notes:
- Vote columns are integers. Blank/missing = 0.
- Per-method (mail / early / machine / provisional) splits are **not needed** —
  the build reuses each precinct's 2024 presidential ED/EV/VBM spatial pattern
  for mode allocation (same approach the Clerk model used).
- District naming need not match the GeoJSON exactly; the validator reconciles
  at the **municipality** level (counts + sums), which is robust to label
  differences. Exact district mapping is finalized in the build.

## Certified county anchors (sanity checks the validator runs)

| Contest | D | R | D two-party share |
|---|---|---|---|
| 2020 Sheriff | Scheffler 73,346 | O'Donoghue 61,408 | 54.4% |
| 2023 Sheriff | Scheffler (confirm) | O'Donoghue (confirm) | O'Donoghue won |
| 2025 Governor (Atlantic) | Sherrill | Ciattarelli | 51.1% |

The validator flags any contest whose CSV-summed D-share is off the known
anchor by more than ~1.5 pp — this catches swapped D/R columns or transcription
errors immediately.

## Workflow

1. Pull the certified by-district results (e.g. via Claude for Chrome from the
   county results portal) into `data/atlantic_sheriff_real.csv`.
2. `python3 scripts/validate_sheriff_csv.py` → fix anything it flags.
3. Build the Sheriff GeoJSON; provenance flips to `real` for any layer fully
   covered by the CSV, `calibrated` for any layer still interpolated.

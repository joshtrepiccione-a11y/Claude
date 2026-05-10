# Raw county-clerk data

Drop CSV files here, then run:

```sh
python3 scripts/ingest.py
```

Each CSV row represents one (precinct × mode) tally. The ingest is
**idempotent**: every run resets all mode fields to the modeled
defaults derived from the certified presidential totals, then
overlays the contents of this folder. Remove a file and rerun to
revert that data to modeled.

## Schema

Header row is required. Column names are case-insensitive. Extra
columns are ignored.

| column     | required | notes |
|------------|----------|-------|
| `county`   | yes      | One of `Atlantic`, `Cape May`, `Cumberland`, `Salem`, `Gloucester` |
| `precinct` | yes      | Precinct name in any common form (e.g. `Egg Harbor Twp Dist 16`, `Atlantic City Ward 1 Dist 4`, `Brigantine 1`, `Vineland 6-8`) |
| `mode`     | yes      | `ed` / `election_day` / `machine` — Election Day<br/>`early` / `ev` — Early Voting<br/>`vbm` / `mail_in` / `absentee` — Vote by Mail |
| `harris`   | yes      | Harris (D) votes, integer |
| `trump`    | yes      | Trump (R) votes, integer |
| `other`    | no       | Sum of all other candidates (default 0) |
| `total`    | no       | Total ballots cast for president in this mode (default `harris+trump+other`) |

## Example

```csv
county,precinct,mode,harris,trump,other,total
Atlantic,Brigantine 1,ED,180,260,5,445
Atlantic,Brigantine 1,Early,40,55,1,96
Atlantic,Brigantine 1,VBM,95,40,0,135
Atlantic,Atlantic City 1-4,election_day,420,80,3,503
```

## Source list

These are the sources to pull from. Most are publicly hosted but
blocked from my sandbox, so the download has to be done by a human.

**NJ Division of Elections — official certified results (per-county PDFs):**
- Atlantic:    `https://www.nj.gov/state/elections/assets/pdf/election-results/2024/2024-official-general-results-president-atlantic.pdf`
- Cape May:    `https://www.nj.gov/state/elections/assets/pdf/election-results/2024/2024-official-general-results-president-capemay.pdf`
- Cumberland:  `https://www.nj.gov/state/elections/assets/pdf/election-results/2024/2024-official-general-results-president-cumberland.pdf`
- Gloucester:  `https://www.nj.gov/state/elections/assets/pdf/election-results/2024/2024-official-general-results-president-gloucester.pdf`
- Salem:       `https://www.nj.gov/state/elections/assets/pdf/election-results/2024/2024-official-general-results-president-salem.pdf`

These tend to be the cleanest format. Each precinct row typically
has columns for Machine (Election Day), Mail-In, Provisional, and
Early Voting. Allocate Provisional to Election Day for these
purposes (or skip — they're <1% of votes).

**County clerk pages (alternate / supplementary):**
- Atlantic:   https://www.atlanticcountyclerk.org/elections-2/elections-results/
- Cape May:   https://www.capemaycountyvotes.com/  (or county clerk PDF archive)
- Cumberland: https://ccclerknj.com/election-information/election-results/
- Gloucester: https://gloucestercountynj.gov/418/Current-Election-Results
- Salem:      https://www.salemcountyclerk.com/elections (or board of elections)

**NJ State ArcGIS — precinct boundaries (we already have these, but for
reference):**
- NJ voting precincts feature service via NJGIN:
  `https://maps.nj.gov/arcgis/rest/services/Applications/Boundaries/MapServer`
  (look for `Voting_Districts` or `Election_Districts` layer)
- NJOGIS data portal: `https://njogis-newjersey.opendata.arcgis.com/`

## Tips for PDF extraction

The NJ DoE PDFs are table-structured. Good tooling:
- `tabula-py` or the `tabula` Java CLI — handles the typical NJ
  certified-results layout well.
- `camelot-py` — fall back if tabula misses rows.
- Manual cleanup in a spreadsheet is often faster for the five
  CD-2 counties (~600 precincts total) than tuning the parser.

After extraction, save as CSV with the schema above and drop it
here. Unmatched precinct names are logged to stderr — fix the
names in the CSV and rerun.

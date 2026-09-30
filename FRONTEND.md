# Frontend preview and methodology

The static frontend belongs at the outer repository root, alongside `sql/`.
No existing SQL, CSV or README files were changed. Nothing was committed or pushed.

## Preview

Double-click `index.html` in this folder. An internet connection is required for
Chart.js 4.4.8 from jsDelivr; all other website content is local. If the CDN fails,
the charts fall back to expandable data tables.

Optional HTTP preview, if Python is on your PATH:

```powershell
cd 'D:\Projects\Netflix-Data-Analysis'
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Stop the server with Ctrl+C. No npm or Node is used.

## Added files

- `index.html`: complete semantic page and section structure.
- `styles.css`: responsive dark visual system.
- `script.js`: charts, filtering, search, accordions and SQL copy controls.
- `assets/catalogue-data.js`: verified aggregate data and original SQL solutions.
- `tools/build_data.py`: optional standard-library aggregate regeneration helper.
- `FRONTEND.md`: preview instructions, data assumptions and deployment notes.

## Sources and reproducibility

The actual source is `Netflix-Data-Analysis/data/netflix_titles (2).csv`, not
`data/netflix_titles.csv`. The generator supports either location. It reads the
entire CSV with a standards-compliant CSV parser. The source SHA-256 is embedded
in the generated data object. It also reads all three SQL files, extracts the
exact schema and all 15 query bodies, and derives difficulty from query structure.

To refresh after editing your source files:

```powershell
python tools/build_data.py
```

The site does not need this command to run; generated data is already included.
The chart values reproduce CSV aggregations in Python; they are not represented
as results executed against your local PostgreSQL database.

## Counting rules

- 8,807 rows, 12 CSV columns, 8,807 unique show IDs, no exact duplicate titles.
- 6,131 Movies and 2,676 TV Shows. Release years span 1925–2021.
- 122 distinct named country tokens. Split comma-separated fields, trim whitespace,
  and omit empty tokens. Seven empty country tokens occur within nonblank fields.
  This is a documented tightening of Q4, which does not explicitly exclude them.
- Multi-country and multi-genre titles contribute once per listed association.
  These totals are not mutually exclusive and do not describe viewing popularity.
- 17 distinct nonempty raw rating strings include three duration-like values.
  Excluding these yields 14 valid categories. Four records have missing ratings.
  No values are corrected or moved between fields.
- Missing means empty or whitespace-only CSV cells; PostgreSQL NULL interpretation
  depends on CSV import settings. The CSV `cast` column maps to SQL `casts`.
- Missing director: 2,634; cast: 825; country: 831; addition date: 10; duration: 3.
- Dates are parsed as English month-name dates after trimming. All nonempty dates
  parsed successfully. Addition dates span 2008-01-01 through 2021-09-25.
  Addition charts exclude missing dates and label 2021 as partial. Zero-count years
  are filled between observed endpoints for an honest timeline.
- India uses an exact country token, not a substring: 1,046 associated titles.
  The India spotlight is fixed to all India titles and explicitly labelled as such.
- Dashboard type filters affect the six main charts, not full-catalogue KPI cards,
  general insights or the India spotlight. The on-page status explains this.
- Q15's substring keyword classification is a heuristic, not a content safety rating.
- Tied chart ranks are ordered alphabetically for deterministic presentation.
  Original SQL remains unchanged, including its existing tie handling.

## Before deployment

The nested `Netflix-Data-Analysis/` folder is an embedded Git repository tracked
as a gitlink in the outer repository. Its dataset is not an ordinary tracked
outer-repository file. This pre-existing structure was preserved. Review it before
publishing the raw dataset. The website does not rely on that nested folder at
runtime: it uses `assets/catalogue-data.js` and the outer `sql/` source files.

For GitHub Pages later, use the outer repository root: Settings → Pages → Deploy
from a branch → main → /(root). Include all frontend files and the existing `sql/`
directory. No deployment, commit, push or repository settings change was performed.

All displayed analytical values were calculated from the source CSV. No values
were borrowed from the reference website. Exact local PostgreSQL import state and
query execution results remain unverified. Review the site before publication.

## Validation performed

- Served the actual D: repository through a loopback-only Python HTTP server.
- Inspected desktop (1280 px), tablet (768 px) and mobile (390 px) layouts.
- Confirmed seven rendered charts, chart tooltips, chart tables, both content-type
  filters, all 15 questions, all difficulty filters, India search, empty-search
  feedback, accordion toggling and exact SQL clipboard copying.
- Checked navigation targets and GitHub repository/profile destinations.
- No page-level horizontal overflow at tested widths; SQL code scrolls internally.
- No captured JavaScript warnings or errors during testing.
- Cross-checked record, content-type, rating and release-year aggregates with an
  independent in-memory SQLite calculation; verified every displayed SQL body
  occurs unchanged in the original source. All relative resource paths resolve.
- SHA-256 checks confirm the original dataset, SQL files and root README are unchanged.
- Automated direct `file://` navigation was blocked by the testing browser's URL
  policy. HTTP preview was verified; direct-file preview was not browser-tested.

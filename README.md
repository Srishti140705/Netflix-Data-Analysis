# Netflix Data Analysis

**SQL-Driven Content Intelligence with PostgreSQL**

![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat)
![SQL](https://img.shields.io/badge/Analysis-SQL-E50914?style=flat)
![JavaScript](https://img.shields.io/badge/Dashboard-JavaScript-F7DF1E?style=flat)

An analysis of Netflix’s movies and TV shows catalogue, combining PostgreSQL exploration, 15 SQL business problems and an interactive dashboard. The project examines content, geography, people and time while preserving the original dataset and documenting analytical choices.

**Author:** Srishti Raj

## Project Overview

This project uses PostgreSQL and SQL to identify patterns across:

- Movies vs TV Shows and content ratings.
- Original release years and Netflix addition trends.
- Countries and genres/categories.
- Actor appearances and director credits.
- India-associated titles, genres and actors.

The analysis describes the supplied historical catalogue. Title counts do not measure audience demand, viewing hours or business performance.

## Live Dashboard

The project includes an interactive Netflix-inspired web dashboard built with **HTML, CSS, JavaScript and Chart.js**.

**Live Demo: Coming after GitHub Pages deployment**

## Project Workflow

```text
Netflix CSV
    → PostgreSQL
    → Data Exploration
    → Data Quality Assessment
    → SQL Business Analysis
    → Insights
    → Interactive Dashboard
```

## Dataset

The following statistics were verified from the project CSV:

| Metric | Value |
| --- | ---: |
| Total titles | 8,807 |
| Columns | 12 |
| Movies | 6,131 |
| TV Shows | 2,676 |
| Original release years | 1925–2021 |
| Distinct named country tokens | 122 |
| Titles associated with India | 1,046 |

The dataset records show ID, content type, title, director, cast, country, date added, release year, rating, duration, genre/category and description.

Country and genre fields can contain multiple comma-separated values. Country counts split and trim those values and exclude empty tokens; a title associated with multiple countries contributes to each country. India-associated content uses an exact country-token match.

## Data Quality

| Finding | Records |
| --- | ---: |
| Missing director | 2,634 |
| Missing cast | 825 |
| Missing country | 831 |
| Missing addition date | 10 |
| Missing duration | 3 |
| Missing rating | 4 |
| Duration-like values in the raw rating field | 3 |

**The raw dataset is preserved.** Quality issues are handled within analytical transformations rather than silently overwriting or deleting source records.

Blank CSV values are treated as missing for dataset profiling. Their SQL `NULL` representation depends on import settings. Rating charts exclude missing and duration-like values, producing 14 valid rating categories. Addition-date analysis omits missing dates, and movie duration in minutes is analysed separately from TV-show seasons.

See [data exploration and quality checks](sql/02_data_exploration.sql) for the SQL approach.

## PostgreSQL Database

The dataset was imported into PostgreSQL and analysed using structured SQL queries. The single `netflix` table supports exploration across content, geography, people, ratings and time.

```sql
CREATE TABLE netflix (
    show_id VARCHAR(10) PRIMARY KEY,
    type VARCHAR(20),
    title TEXT,
    director TEXT,
    casts TEXT,
    country TEXT,
    date_added VARCHAR(50),
    release_year INT,
    rating VARCHAR(20),
    duration VARCHAR(30),
    listed_in TEXT,
    description TEXT
);
```

The CSV column `cast` maps to `casts` in PostgreSQL. Addition dates are stored as text in the source schema and converted with `TO_DATE()` when required.

Full definition: [sql/01_schema.sql](sql/01_schema.sql).

## SQL Business Problems

1. Movies vs TV Shows distribution.
2. Most common rating for each content type.
3. Release years producing the most content.
4. Countries with the most Netflix titles.
5. Most common genres/categories.
6. Longest movies.
7. TV Shows with the most seasons.
8. Directors with the most titles.
9. Actors appearing in the most titles.
10. Netflix content associated with India.
11. Most common genres in Indian Netflix content.
12. Actors appearing most frequently in Indian content.
13. Netflix additions over time.
14. Most recently added titles.
15. Description classification using violence-related keywords.

Complete SQL solutions are available in [sql/03_business_analysis.sql](sql/03_business_analysis.sql).

The description classification uses substring matches for `kill`, `violence` and `murder`. It is a keyword-based exploration, not a content safety assessment.

## SQL Techniques Demonstrated

| Analytical task | Techniques |
| --- | --- |
| Grouping and aggregation | `GROUP BY`, `ORDER BY`, aggregate functions, `FILTER` |
| Conditional analysis | `CASE`, `ILIKE` |
| Multi-stage queries | CTEs, subqueries |
| Ranking and proportions | Window functions, `RANK()`, `PARTITION BY` |
| Expanding multi-value fields | `STRING_TO_ARRAY()`, `UNNEST()`, `CROSS JOIN LATERAL` |
| String and numeric transformations | `REGEXP_REPLACE()`, `CAST()`, `TRIM()` |
| Date analysis | `TO_DATE()`, `EXTRACT()` |

## Interactive Dashboard

The dashboard presents precomputed aggregates derived from the project CSV. It does not connect the browser to a local PostgreSQL instance or load the full CSV at runtime.

- **KPI cards:** catalogue size, Movies, TV Shows, countries, ratings and release-year range.
- **Seven interactive charts:** Movies vs TV Shows, ratings, countries, genres, release years, content additions and India-focused genre analysis.
- **Exploration:** chart tooltips, accessible data tables, content-type filters and an India spotlight with actor and content-mix summaries.
- **SQL catalogue:** search across business problems, Basic / Intermediate / Advanced filters and full-width question cards.
- **SQL solutions:** a centered modal with syntax coloring, Copy SQL, close-button and Escape support.
- **Responsive presentation:** layouts for desktop, tablet and mobile.

The optional Python helper in `tools/` reproduces the dashboard aggregates. Dataset statistics and dashboard values are CSV-derived; they are distinct from validation of query execution in a local PostgreSQL instance.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Data & Database | PostgreSQL, SQL, pgAdmin |
| Frontend | HTML5, CSS3, JavaScript, Chart.js |
| Development | Python, Git, GitHub |
| Deployment target | GitHub Pages |

## Project Structure

Intended repository layout:

```text
Netflix-Data-Analysis/
├── data/
├── sql/
│   ├── 01_schema.sql
│   ├── 02_data_exploration.sql
│   └── 03_business_analysis.sql
├── assets/
├── tools/
├── index.html
├── styles.css
├── script.js
├── FRONTEND.md
└── README.md
```

The current local CSV is located at `Netflix-Data-Analysis/data/netflix_titles (2).csv` inside the nested project folder. The intended layout above does not imply that the source has been moved. See [FRONTEND.md](FRONTEND.md) for source-path and deployment notes.

## Running the Project

### Database analysis

1. Install PostgreSQL and open pgAdmin.
2. Create or select a database and run the `CREATE TABLE` statement in [sql/01_schema.sql](sql/01_schema.sql).
3. Import the Netflix CSV into `netflix` using CSV format with a header. Keep the schema’s column order, map `cast` to `casts`, and check missing-value handling.
4. Run the validation queries in the schema file, followed by [sql/02_data_exploration.sql](sql/02_data_exploration.sql).
5. Execute the business queries in [sql/03_business_analysis.sql](sql/03_business_analysis.sql) and inspect their results in your local instance.

### Frontend preview

From the repository root, run:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Then visit [http://127.0.0.1:8000](http://127.0.0.1:8000). Stop the server with `Ctrl+C`.

**Chart.js is loaded through a CDN, so interactive charts require internet access.** The frontend uses static files and requires no backend database connection or npm build step.

## Repository

**GitHub:** [Srishti140705/Netflix-Data-Analysis](https://github.com/Srishti140705/Netflix-Data-Analysis)

**Author:** [Srishti Raj](https://github.com/Srishti140705)

## Disclaimer

This is an independent educational and data analytics project. It is not affiliated with or endorsed by Netflix.

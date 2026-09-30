"""Reproduce static dashboard aggregates using only Python's standard library.

Usage: python tools/build_data.py [--source REPOSITORY] [--output REPOSITORY]
The website itself requires no Python, build step, or database connection.
"""
import argparse
import csv
import hashlib
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[1])
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1])
args = parser.parse_args()
root = args.source
csv_path = root / 'data/netflix_titles.csv'
if not csv_path.exists():
    csv_path = root / 'Netflix-Data-Analysis/data/netflix_titles (2).csv'
with csv_path.open(encoding='utf-8-sig', newline='') as stream:
    reader = csv.DictReader(stream)
    rows = list(reader)
    fields = reader.fieldnames

def split(value):
    return [part.strip() for part in value.split(',') if part.strip()]

def ranked(counter, limit=10):
    return sorted(counter.items(), key=lambda item: (-item[1], str(item[0])))[:limit]

def expanded(items, field):
    return Counter(part for row in items for part in split(row[field]))

def aggregate(items):
    dates = [(row, datetime.strptime(row['date_added'].strip(), '%B %d, %Y'))
             for row in items if row['date_added'].strip()]
    return {
        'total': len(items),
        'mix': ranked(Counter(row['type'] for row in items)),
        'ratings': ranked(Counter(row['rating'] for row in items
                                 if row['rating'].strip() and not row['rating'].endswith('min'))),
        'countries': ranked(expanded(items, 'country')),
        'genres': ranked(expanded(items, 'listed_in')),
        'releases': sorted(Counter(int(row['release_year']) for row in items).items()),
        'additions': sorted(Counter(date.year for _, date in dates).items()),
        'directors': ranked(expanded(items, 'director')),
        'actors': ranked(expanded(items, 'cast')),
    }

india = [row for row in rows if 'India' in split(row['country'])]
schema_text = (root / 'sql/01_schema.sql').read_text(encoding='utf-8-sig')
exploration = (root / 'sql/02_data_exploration.sql').read_text(encoding='utf-8-sig')
business = (root / 'sql/03_business_analysis.sql').read_text(encoding='utf-8-sig')
schema_body = re.search(r'CREATE TABLE netflix \((.*?)\);', schema_text, re.S).group(1)
schema = [line.strip().rstrip(',').split(' ', 1) for line in schema_body.strip().splitlines()]
explanations = [
    'Compare title counts and calculate each content type’s share using a window total.',
    'Exclude missing and duration-like ratings, then rank ratings within each content type. Ties are retained.',
    'Group the catalogue by original release year and return the ten largest groups.',
    'Expand comma-separated countries before counting each country’s title associations.',
    'Expand category lists to measure catalogue representation, rather than audience popularity.',
    'Extract numeric minutes from valid movie durations and rank the longest films.',
    'Extract season counts for TV shows; seasons are never compared with movie minutes.',
    'Split co-director credits and exclude empty names before counting appearances.',
    'Expand cast credits and count title appearances for each named actor.',
    'Match India as an exact country token, deduplicate show IDs and calculate the Indian content mix.',
    'Isolate India-associated titles, expand their categories and rank genre frequencies.',
    'Isolate India-associated titles and expand cast credits to rank actor appearances.',
    'Parse addition dates and aggregate yearly totals alongside separate movie and TV-show counts.',
    'Parse addition dates and sort the ten most recent titles, with alphabetical tie-breaking.',
    'Use substring matches for kill, violence and murder. This is a keyword heuristic, not a safety rating.'
]
questions = []
for match in re.finditer(r'-- Q(\d+)\. (.*?)\n-- =+\n(.*?)(?=\n-- =+\n-- Q|\Z)', business, re.S):
    number = int(match.group(1))
    title = re.sub(r'\s*\n--\s*', ' ', match.group(2)).strip()
    sql = match.group(3).strip()
    difficulty = 'Advanced' if re.search(r'\bWITH\b|\bOVER\s*\(', sql) else 'Intermediate' if re.search(r'UNNEST|REGEXP_REPLACE|TO_DATE|FROM\s*\(', sql) else 'Basic'
    questions.append(dict(number=number, title=title, sql=sql, difficulty=difficulty, explanation=explanations[number - 1]))
assert len(questions) == 15
assert [question['number'] for question in questions] == list(range(1, 16))
missing = {field: sum(not row[field].strip() for row in rows) for field in fields}
dates = [datetime.strptime(row['date_added'].strip(), '%B %d, %Y') for row in rows if row['date_added'].strip()]
techniques = ['SELECT', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'CASE', 'WITH', 'RANK()', 'PARTITION BY', 'FILTER', 'STRING_TO_ARRAY()', 'UNNEST()', 'CROSS JOIN LATERAL', 'REGEXP_REPLACE()', 'CAST()', 'TRIM()', 'ILIKE', 'TO_DATE()', 'EXTRACT()']
all_sql = schema_text + exploration + business
assert all(technique.replace('()', '') in all_sql for technique in techniques)
data = {
    'source': csv_path.relative_to(root).as_posix(),
    'sha256': hashlib.sha256(csv_path.read_bytes()).hexdigest(),
    'fields': fields, 'schema': schema, 'questions': questions, 'techniques': techniques,
    'all': aggregate(rows), 'movies': aggregate([row for row in rows if row['type'] == 'Movie']),
    'shows': aggregate([row for row in rows if row['type'] == 'TV Show']), 'india': aggregate(india),
    'quality': {'missing': missing, 'uniqueIds': len({row['show_id'] for row in rows}),
                'duplicateTitleGroups': sum(count > 1 for count in Counter(row['title'] for row in rows).values()),
                'invalidRatings': sum(row['rating'].endswith('min') for row in rows),
                'rawRatingValues': len({row['rating'] for row in rows if row['rating'].strip()}),
                'emptyCountryTokens': sum(not token.strip() for row in rows if row['country'].strip() for token in row['country'].split(','))},
    'countryCount': len(expanded(rows, 'country')),
    'ratingCount': len({row['rating'] for row in rows if row['rating'].strip() and not row['rating'].endswith('min')}),
    'dateRange': [min(dates).date().isoformat(), max(dates).date().isoformat()],
    'releaseRange': [min(int(row['release_year']) for row in rows), max(int(row['release_year']) for row in rows)],
}
(args.output / 'assets').mkdir(parents=True, exist_ok=True)
(args.output / 'assets/catalogue-data.js').write_text(
    '// Generated from the project CSV and unchanged PostgreSQL source; run tools/build_data.py to refresh.\n'
    + 'window.NETFLIX_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(json.dumps({key: data[key] for key in ['source', 'countryCount', 'ratingCount', 'releaseRange', 'dateRange', 'quality']}, indent=2))
print('Totals:', data['all']['total'], data['all']['mix'], 'India:', data['india']['total'])

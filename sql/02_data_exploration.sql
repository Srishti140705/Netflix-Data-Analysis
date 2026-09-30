-- ============================================================
-- Netflix Data Analysis
-- Data Exploration & Quality Assessment
-- ============================================================
-- Purpose:
-- Explore the Netflix dataset before performing business
-- analysis. These queries check dataset size, uniqueness,
-- missing values, distributions, and potential data-quality
-- issues.
-- ============================================================


-- ============================================================
-- 1. DATASET SIZE
-- ============================================================

SELECT COUNT(*) AS total_records
FROM netflix;


-- ============================================================
-- 2. UNIQUE SHOW IDs
-- Check whether every record has a unique show_id.
-- ============================================================

SELECT
    COUNT(*) AS total_records,
    COUNT(DISTINCT show_id) AS unique_show_ids
FROM netflix;


-- ============================================================
-- 3. DUPLICATE TITLES
-- Identify titles appearing more than once.
-- ============================================================

SELECT
    title,
    COUNT(*) AS occurrences
FROM netflix
GROUP BY title
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;


-- ============================================================
-- 4. MISSING VALUE ANALYSIS
-- Count NULL values across important columns.
-- ============================================================

SELECT
    COUNT(*) FILTER (WHERE show_id IS NULL) AS missing_show_id,
    COUNT(*) FILTER (WHERE type IS NULL) AS missing_type,
    COUNT(*) FILTER (WHERE title IS NULL) AS missing_title,
    COUNT(*) FILTER (WHERE director IS NULL) AS missing_director,
    COUNT(*) FILTER (WHERE casts IS NULL) AS missing_cast,
    COUNT(*) FILTER (WHERE country IS NULL) AS missing_country,
    COUNT(*) FILTER (WHERE date_added IS NULL) AS missing_date_added,
    COUNT(*) FILTER (WHERE release_year IS NULL) AS missing_release_year,
    COUNT(*) FILTER (WHERE rating IS NULL) AS missing_rating,
    COUNT(*) FILTER (WHERE duration IS NULL) AS missing_duration,
    COUNT(*) FILTER (WHERE listed_in IS NULL) AS missing_genre,
    COUNT(*) FILTER (WHERE description IS NULL) AS missing_description
FROM netflix;


-- ============================================================
-- 5. CONTENT TYPE DISTRIBUTION
-- Compare Movies and TV Shows and calculate their percentage
-- of the complete catalogue.
-- ============================================================

SELECT
    type,
    COUNT(*) AS total_titles,
    ROUND(
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (),
        2
    ) AS percentage
FROM netflix
GROUP BY type
ORDER BY total_titles DESC;


-- ============================================================
-- 6. RELEASE YEAR RANGE
-- Find the earliest and latest release years.
-- ============================================================

SELECT
    MIN(release_year) AS earliest_release,
    MAX(release_year) AS latest_release
FROM netflix;


-- ============================================================
-- 7. TITLES BY RELEASE YEAR
-- Explore how titles are distributed across release years.
-- ============================================================

SELECT
    release_year,
    COUNT(*) AS total_titles
FROM netflix
GROUP BY release_year
ORDER BY release_year DESC;


-- ============================================================
-- 8. RATING DISTRIBUTION
-- Examine all content ratings and their frequency.
-- ============================================================

SELECT
    rating,
    COUNT(*) AS total_titles
FROM netflix
GROUP BY rating
ORDER BY total_titles DESC;


-- ============================================================
-- 9. SUSPICIOUS RATING VALUES
-- Some records may contain duration values in the rating field.
-- ============================================================

SELECT
    show_id,
    title,
    type,
    rating,
    duration
FROM netflix
WHERE rating LIKE '%min';


-- ============================================================
-- 10. DURATION VALUES
-- Movies use minutes while TV Shows use number of seasons.
-- ============================================================

SELECT DISTINCT duration
FROM netflix
WHERE duration IS NOT NULL
ORDER BY duration;


-- ============================================================
-- 11. COUNTRY DISTRIBUTION
-- Inspect the most common country values.
-- Some records contain multiple countries in one field.
-- ============================================================

SELECT
    country,
    COUNT(*) AS total_titles
FROM netflix
WHERE country IS NOT NULL
GROUP BY country
ORDER BY total_titles DESC
LIMIT 20;


-- ============================================================
-- 12. GENRE / CATEGORY DISTRIBUTION
-- listed_in can contain multiple categories in one field.
-- ============================================================

SELECT
    listed_in,
    COUNT(*) AS total_titles
FROM netflix
WHERE listed_in IS NOT NULL
GROUP BY listed_in
ORDER BY total_titles DESC
LIMIT 20;


-- ============================================================
-- 13. DATE ADDED INSPECTION
-- date_added was imported as text and can later be converted
-- into PostgreSQL DATE values during analysis.
-- ============================================================

SELECT
    date_added
FROM netflix
WHERE date_added IS NOT NULL
LIMIT 20;


-- ============================================================
-- 14. BLANK STRING CHECK
-- Check whether missing information exists as empty strings
-- rather than SQL NULL values.
-- ============================================================

SELECT
    COUNT(*) FILTER (
        WHERE title IS NOT NULL
        AND TRIM(title) = ''
    ) AS blank_title,

    COUNT(*) FILTER (
        WHERE director IS NOT NULL
        AND TRIM(director) = ''
    ) AS blank_director,

    COUNT(*) FILTER (
        WHERE casts IS NOT NULL
        AND TRIM(casts) = ''
    ) AS blank_cast,

    COUNT(*) FILTER (
        WHERE country IS NOT NULL
        AND TRIM(country) = ''
    ) AS blank_country,

    COUNT(*) FILTER (
        WHERE rating IS NOT NULL
        AND TRIM(rating) = ''
    ) AS blank_rating

FROM netflix;


-- ============================================================
-- DATA QUALITY NOTES / CLEANING STRATEGY
-- ============================================================

-- 1. The original dataset is preserved without modifying or
--    deleting raw records.
--
-- 2. Missing director, cast, country, rating, or date values
--    will be handled within individual analytical queries.
--
-- 3. NULL directors will be excluded only when performing
--    director-specific analysis.
--
-- 4. Multiple countries stored in one field will be separated
--    using STRING_TO_ARRAY() and UNNEST().
--
-- 5. Multiple genres/categories stored in listed_in will also
--    be separated using STRING_TO_ARRAY() and UNNEST().
--
-- 6. date_added will be converted when required using:
--
--    TO_DATE(TRIM(date_added), 'Month DD, YYYY')
--
-- 7. duration contains two different measurements:
--       Movies   -> minutes
--       TV Shows -> seasons
--    These will therefore be analyzed separately.
--
-- 8. Suspicious values discovered in fields such as rating
--    will not be silently overwritten. They will be handled
--    appropriately during analysis.
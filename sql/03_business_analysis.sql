-- ============================================================
-- Netflix Data Analysis
-- Business Problems & SQL Solutions
-- ============================================================


-- ============================================================
-- Q1. What is the distribution of Movies vs TV Shows?
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
-- Q2. What is the most common rating for each content type?
-- ============================================================

WITH rating_counts AS (
    SELECT
        type,
        rating,
        COUNT(*) AS total_titles
    FROM netflix
    WHERE rating IS NOT NULL
      AND rating NOT LIKE '%min'
    GROUP BY type, rating
),
ranked_ratings AS (
    SELECT
        type,
        rating,
        total_titles,
        RANK() OVER (
            PARTITION BY type
            ORDER BY total_titles DESC
        ) AS rating_rank
    FROM rating_counts
)
SELECT
    type,
    rating,
    total_titles
FROM ranked_ratings
WHERE rating_rank = 1;


-- ============================================================
-- Q3. Which release years produced the most content?
-- ============================================================

SELECT
    release_year,
    COUNT(*) AS total_titles
FROM netflix
GROUP BY release_year
ORDER BY total_titles DESC
LIMIT 10;


-- ============================================================
-- Q4. Which countries contribute the most Netflix content?
-- ============================================================

SELECT
    TRIM(country_name) AS country,
    COUNT(*) AS total_titles
FROM netflix
CROSS JOIN LATERAL
    UNNEST(STRING_TO_ARRAY(country, ',')) AS country_name
WHERE country IS NOT NULL
GROUP BY TRIM(country_name)
ORDER BY total_titles DESC
LIMIT 10;


-- ============================================================
-- Q5. What are the most popular Netflix genres/categories?
-- ============================================================

SELECT
    TRIM(genre_name) AS genre,
    COUNT(*) AS total_titles
FROM netflix
CROSS JOIN LATERAL
    UNNEST(STRING_TO_ARRAY(listed_in, ',')) AS genre_name
WHERE listed_in IS NOT NULL
GROUP BY TRIM(genre_name)
ORDER BY total_titles DESC
LIMIT 10;

-- ============================================================
-- Q6. What are the longest movies on Netflix?
-- ============================================================

SELECT
    title,
    release_year,
    country,
    duration,
    CAST(REGEXP_REPLACE(duration, '[^0-9]', '', 'g') AS INTEGER)
        AS duration_minutes
FROM netflix
WHERE type = 'Movie'
  AND duration IS NOT NULL
  AND duration LIKE '%min'
ORDER BY duration_minutes DESC
LIMIT 10;


-- ============================================================
-- Q7. Which TV Shows have the highest number of seasons?
-- ============================================================

SELECT
    title,
    release_year,
    country,
    duration,
    CAST(REGEXP_REPLACE(duration, '[^0-9]', '', 'g') AS INTEGER)
        AS number_of_seasons
FROM netflix
WHERE type = 'TV Show'
  AND duration IS NOT NULL
  AND duration LIKE '%Season%'
ORDER BY number_of_seasons DESC
LIMIT 10;


-- ============================================================
-- Q8. Which directors have the most titles on Netflix?
-- ============================================================

SELECT
    TRIM(director_name) AS director,
    COUNT(*) AS total_titles
FROM netflix
CROSS JOIN LATERAL
    UNNEST(STRING_TO_ARRAY(director, ',')) AS director_name
WHERE director IS NOT NULL
  AND TRIM(director_name) <> ''
GROUP BY TRIM(director_name)
ORDER BY total_titles DESC, director
LIMIT 10;


-- ============================================================
-- Q9. Which actors appear in the most Netflix titles?
-- ============================================================

SELECT
    TRIM(actor_name) AS actor,
    COUNT(*) AS total_titles
FROM netflix
CROSS JOIN LATERAL
    UNNEST(STRING_TO_ARRAY(casts, ',')) AS actor_name
WHERE casts IS NOT NULL
  AND TRIM(actor_name) <> ''
GROUP BY TRIM(actor_name)
ORDER BY total_titles DESC, actor
LIMIT 10;


-- ============================================================
-- Q10. How much Netflix content is associated with India?
-- ============================================================

WITH expanded_countries AS (
    SELECT
        n.show_id,
        n.type,
        TRIM(country_name) AS country
    FROM netflix AS n
    CROSS JOIN LATERAL
        UNNEST(STRING_TO_ARRAY(n.country, ',')) AS country_name
    WHERE n.country IS NOT NULL
),

india_titles AS (
    SELECT DISTINCT
        show_id,
        type
    FROM expanded_countries
    WHERE country = 'India'
)

SELECT
    type,
    COUNT(*) AS total_titles,
    ROUND(
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (),
        2
    ) AS percentage_of_indian_content
FROM india_titles
GROUP BY type
ORDER BY total_titles DESC;


-- ============================================================
-- Q11. What are the most common genres in Indian Netflix
--      content?
-- ============================================================

WITH indian_content AS (
    SELECT DISTINCT
        n.show_id,
        n.listed_in
    FROM netflix AS n
    CROSS JOIN LATERAL
        UNNEST(STRING_TO_ARRAY(n.country, ',')) AS country_name
    WHERE n.country IS NOT NULL
      AND TRIM(country_name) = 'India'
),

expanded_genres AS (
    SELECT
        show_id,
        TRIM(genre_name) AS genre
    FROM indian_content
    CROSS JOIN LATERAL
        UNNEST(STRING_TO_ARRAY(listed_in, ',')) AS genre_name
    WHERE listed_in IS NOT NULL
)

SELECT
    genre,
    COUNT(*) AS total_titles
FROM expanded_genres
WHERE genre <> ''
GROUP BY genre
ORDER BY total_titles DESC, genre
LIMIT 10;


-- ============================================================
-- Q12. Which actors appear most frequently in Netflix titles
--      associated with India?
-- ============================================================

WITH indian_content AS (
    SELECT DISTINCT
        n.show_id,
        n.casts
    FROM netflix AS n
    CROSS JOIN LATERAL
        UNNEST(STRING_TO_ARRAY(n.country, ',')) AS country_name
    WHERE n.country IS NOT NULL
      AND TRIM(country_name) = 'India'
),

expanded_cast AS (
    SELECT
        show_id,
        TRIM(actor_name) AS actor
    FROM indian_content
    CROSS JOIN LATERAL
        UNNEST(STRING_TO_ARRAY(casts, ',')) AS actor_name
    WHERE casts IS NOT NULL
)

SELECT
    actor,
    COUNT(*) AS total_titles
FROM expanded_cast
WHERE actor <> ''
GROUP BY actor
ORDER BY total_titles DESC, actor
LIMIT 10;


-- ============================================================
-- Q13. How has the number of titles added to Netflix changed
--      over time?
-- ============================================================

WITH valid_dates AS (
    SELECT
        show_id,
        type,
        TO_DATE(TRIM(date_added), 'Month DD, YYYY') AS added_date
    FROM netflix
    WHERE date_added IS NOT NULL
      AND TRIM(date_added) <> ''
)

SELECT
    EXTRACT(YEAR FROM added_date)::INTEGER AS year_added,
    COUNT(*) AS total_titles_added,
    COUNT(*) FILTER (WHERE type = 'Movie') AS movies_added,
    COUNT(*) FILTER (WHERE type = 'TV Show') AS tv_shows_added
FROM valid_dates
GROUP BY EXTRACT(YEAR FROM added_date)
ORDER BY year_added;


-- ============================================================
-- Q14. Which titles were most recently added to Netflix?
-- ============================================================

SELECT
    title,
    type,
    release_year,
    country,
    TO_DATE(TRIM(date_added), 'Month DD, YYYY') AS added_date
FROM netflix
WHERE date_added IS NOT NULL
  AND TRIM(date_added) <> ''
ORDER BY added_date DESC, title
LIMIT 10;


-- ============================================================
-- Q15. How can Netflix titles be categorized based on
--      potentially violent keywords in their descriptions?
-- ============================================================

SELECT
    content_category,
    COUNT(*) AS total_titles,
    ROUND(
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (),
        2
    ) AS percentage
FROM (
    SELECT
        CASE
            WHEN description ILIKE '%kill%'
              OR description ILIKE '%violence%'
              OR description ILIKE '%murder%'
            THEN 'Contains Violence-Related Keywords'
            ELSE 'Other Content'
        END AS content_category
    FROM netflix
    WHERE description IS NOT NULL
) AS categorized_content
GROUP BY content_category
ORDER BY total_titles DESC;
-- ============================================================
-- Netflix Data Analysis
-- PostgreSQL Database Schema
-- ============================================================

-- Create the Netflix titles table
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

-- ============================================================
-- Data Validation
-- ============================================================

-- Total number of records
SELECT COUNT(*) AS total_records
FROM netflix;

-- Preview dataset
SELECT *
FROM netflix
LIMIT 10;

-- Content type distribution
SELECT
    type,
    COUNT(*) AS total
FROM netflix
GROUP BY type;
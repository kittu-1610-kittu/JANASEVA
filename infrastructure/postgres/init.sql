-- PostgreSQL initialization script
-- Runs once when the DB container is first created.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'vector extension not available, continuing without vector';
END
$$;
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- for fuzzy text search
CREATE EXTENSION IF NOT EXISTS unaccent;  -- for accent-insensitive search

-- Set timezone
SET timezone = 'Asia/Kolkata';

-- Create text search configuration with unaccent support
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'janaseva_tsc') THEN
    CREATE TEXT SEARCH CONFIGURATION janaseva_tsc (COPY = simple);
    ALTER TEXT SEARCH CONFIGURATION janaseva_tsc
      ALTER MAPPING FOR hword, hword_part, word WITH unaccent, simple;
  END IF;
END
$$;

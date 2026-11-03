-- ==============================================================================
-- 001_extensions.sql
-- Enable necessary PostgreSQL & PostGIS extensions
-- ==============================================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists postgis with schema extensions;

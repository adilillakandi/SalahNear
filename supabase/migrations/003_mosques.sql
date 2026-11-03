-- ==============================================================================
-- 003_mosques.sql
-- Kerala Mosque Directory with PostGIS Geospatial Point Column
-- ==============================================================================

create table if not exists public.mosques (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  alternate_name text,
  address text,
  city_or_locality text,
  district text not null,
  state text not null default 'Kerala',
  pincode text,
  location extensions.geography(Point, 4326) not null,
  contact_number text,
  source text,
  source_reference text,
  verification_status text not null default 'verified' check (
    verification_status in ('pending', 'under_review', 'verified', 'rejected', 'inactive')
  ),
  attendance_radius_m integer not null default 100,
  timezone text not null default 'Asia/Kolkata',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Spatial GiST index for fast radius searches
create index if not exists mosques_location_gix
  on public.mosques using gist(location);

-- Regional and status filter indexes
create index if not exists mosques_district_idx
  on public.mosques(district);

create index if not exists mosques_active_status_idx
  on public.mosques(is_active, verification_status);

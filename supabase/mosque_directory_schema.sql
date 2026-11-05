-- ==============================================================================
-- SALAHNEAR: MOSQUE DIRECTORY & OSM STAGING PIPELINE SCHEMA
-- Table Definitions, Geofencing, Entrance Coordinates, PostGIS Synchronization,
-- Mosque Admin Assignment, Stored Procedures, Views, RLS, and Direct Action Queries
-- Compatible with PostgreSQL 15+ / PostGIS / Supabase
-- ==============================================================================

-- Ensure extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 1. MOSQUES TABLE ENHANCEMENTS & GEOFENCING
-- ==============================================================================
create table if not exists public.mosques (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  alternate_name text,
  name_ml text,                                  -- Malayalam Script Name (e.g. മിശ്കാൽ പള്ളി)
  address text,
  city_or_locality text,
  district text not null,
  state text not null default 'Kerala',
  pincode text,
  
  -- Spatial Coordinates & Geofencing
  latitude double precision not null default 11.2425,
  longitude double precision not null default 75.7765,
  entrance_latitude double precision,
  entrance_longitude double precision,
  attendance_radius_m integer not null default 80, -- Anti-fraud check-in radius (30m - 200m)
  
  -- PostGIS Geography Location (Point, 4326)
  location extensions.geography(Point, 4326),

  -- OSM Staging & Verification Pipeline
  verification_status text not null default 'verified' check (
    verification_status in (
      'pending',          -- Staged candidate from OpenStreetMap / Overpass API
      'under_review',     -- Under review by District Admin committee
      'verified',         -- Officially calibrated, validated & active
      'needs_correction', -- Marker / entrance coordinates need realignment
      'rejected',         -- Non-existent / duplicate / invalid candidate
      'archived',         -- Retired / historical record
      'inactive'          -- Temporarily closed
    )
  ),
  verification_notes text,
  source_type text not null default 'admin_entry' check (
    source_type in ('admin_entry', 'osm_staging', 'mahal_committee', 'community_submission')
  ),
  osm_id text,                                    -- OpenStreetMap node/way identifier if imported

  -- Features & Status
  qr_checkin_enabled boolean not null default true,
  is_active boolean not null default true,
  timezone text not null default 'Asia/Kolkata',

  -- Audit Metadata
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure all enhanced columns exist if mosques table was created in an earlier migration
alter table public.mosques add column if not exists name_ml text;
alter table public.mosques add column if not exists latitude double precision default 11.2425;
alter table public.mosques add column if not exists longitude double precision default 75.7765;
alter table public.mosques add column if not exists entrance_latitude double precision;
alter table public.mosques add column if not exists entrance_longitude double precision;
alter table public.mosques add column if not exists attendance_radius_m integer not null default 80;
alter table public.mosques add column if not exists verification_notes text;
alter table public.mosques add column if not exists source_type text not null default 'admin_entry';
alter table public.mosques add column if not exists osm_id text;
alter table public.mosques add column if not exists qr_checkin_enabled boolean not null default true;
alter table public.mosques add column if not exists verified_by uuid references public.profiles(id);
alter table public.mosques add column if not exists verified_at timestamptz;
alter table public.mosques add column if not exists is_active boolean not null default true;

-- Update check constraint on verification_status
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'mosques_verification_status_check') then
    alter table public.mosques drop constraint mosques_verification_status_check;
  end if;
  alter table public.mosques add constraint mosques_verification_status_check check (
    verification_status in (
      'pending',
      'under_review',
      'verified',
      'rejected',
      'needs_correction',
      'archived',
      'inactive'
    )
  );
end;
$$;

-- Performance & Spatial Indexes
create index if not exists mosques_district_idx on public.mosques(district);
create index if not exists mosques_pipeline_status_idx on public.mosques(verification_status, is_active);
create index if not exists mosques_name_idx on public.mosques(name);
create index if not exists mosques_name_ml_idx on public.mosques(name_ml);

-- ==============================================================================
-- 2. TRIGGER: AUTO-SYNCHRONIZE POSTGIS GEOGRAPHY & COORDINATES
-- Ensures location, latitude, longitude, and entrance coordinates stay synchronized
-- ==============================================================================
create or replace function public.sync_mosque_coordinates()
returns trigger as $$
begin
  -- 1. Ensure entrance coordinates default to center coordinates if not specified
  if new.entrance_latitude is null and new.latitude is not null then
    new.entrance_latitude := new.latitude;
  end if;
  if new.entrance_longitude is null and new.longitude is not null then
    new.entrance_longitude := new.longitude;
  end if;

  -- 2. Populate PostGIS location point from lat/lng if available
  if new.latitude is not null and new.longitude is not null then
    new.location := extensions.st_setsrid(
      extensions.st_makepoint(new.longitude, new.latitude),
      4326
    )::extensions.geography;
  elsif new.location is not null then
    new.latitude := extensions.st_y(new.location::extensions.geometry);
    new.longitude := extensions.st_x(new.location::extensions.geometry);
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_mosque_coordinates on public.mosques;
create trigger trg_sync_mosque_coordinates
  before insert or update on public.mosques
  for each row execute function public.sync_mosque_coordinates();

-- Synchronize existing rows if any
update public.mosques
set updated_at = now()
where location is null and latitude is not null and longitude is not null;

-- ==============================================================================
-- 3. MOSQUE ADMINS TABLE (USER DELEGATION & COMMITTEE PERMISSIONS)
-- ==============================================================================
create table if not exists public.mosque_admins (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(mosque_id, user_id)
);

create index if not exists mosque_admins_mosque_idx on public.mosque_admins(mosque_id);
create index if not exists mosque_admins_user_idx on public.mosque_admins(user_id);

-- ==============================================================================
-- 4. REAL-TIME VIEW: MOSQUE DIRECTORY VIEW (WITH SECURITY_INVOKER = ON)
-- Compliant with Supabase Security Advisor (0010_security_definer_view)
-- ==============================================================================
drop view if exists public.mosques_directory_view cascade;

create view public.mosques_directory_view
with (security_invoker = on)
as
select
  m.id,
  m.name,
  m.alternate_name,
  m.name_ml,
  m.address,
  m.city_or_locality,
  m.district,
  m.state,
  m.pincode,
  m.latitude,
  m.longitude,
  coalesce(m.entrance_latitude, m.latitude) as entrance_latitude,
  coalesce(m.entrance_longitude, m.longitude) as entrance_longitude,
  m.attendance_radius_m,
  m.verification_status,
  m.verification_notes,
  m.source_type,
  m.osm_id,
  m.qr_checkin_enabled,
  m.is_active,
  m.created_at,
  m.updated_at,
  
  -- Aggregated Assigned Mosque Admin Count
  count(distinct ma.user_id) as assigned_admins_count,
  
  -- Latest Active Prayer Schedule Version
  coalesce(
    (select ps.version
     from public.prayer_schedules ps
     where ps.mosque_id = m.id
     order by ps.prayer_date desc, ps.version desc
     limit 1),
    1
  ) as schedule_version

from public.mosques m
left join public.mosque_admins ma on ma.mosque_id = m.id
group by m.id;

-- ==============================================================================
-- 5. STORED PROCEDURE: SAVE MOSQUE CONFIGURATION (REGISTER OR UPDATE)
-- ==============================================================================
create or replace function public.save_mosque_configuration(
  p_mosque_id uuid default null,                -- Pass null for new registration, or UUID to update
  p_name text default null,
  p_name_ml text default null,
  p_city_or_locality text default null,
  p_district text default null,
  p_latitude double precision default 11.2425,
  p_longitude double precision default 75.7765,
  p_entrance_latitude double precision default null,
  p_entrance_longitude double precision default null,
  p_attendance_radius_m integer default 80,
  p_verification_notes text default null,
  p_verification_status text default 'verified'
)
returns jsonb as $$
declare
  v_id uuid := p_mosque_id;
  v_is_new boolean := false;
  v_actor text := coalesce(auth.jwt() ->> 'email', 'Administrator');
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Mosque name is required.';
  end if;

  if p_district is null or length(trim(p_district)) = 0 then
    raise exception 'District is required.';
  end if;

  if v_id is null then
    -- Register New Mosque
    v_is_new := true;
    insert into public.mosques (
      name,
      name_ml,
      city_or_locality,
      district,
      state,
      latitude,
      longitude,
      entrance_latitude,
      entrance_longitude,
      attendance_radius_m,
      verification_notes,
      verification_status,
      verified_by,
      verified_at,
      qr_checkin_enabled,
      is_active
    ) values (
      trim(p_name),
      nullif(trim(p_name_ml), ''),
      nullif(trim(p_city_or_locality), ''),
      trim(p_district),
      'Kerala',
      p_latitude,
      p_longitude,
      coalesce(p_entrance_latitude, p_latitude),
      coalesce(p_entrance_longitude, p_longitude),
      coalesce(p_attendance_radius_m, 80),
      nullif(trim(p_verification_notes), ''),
      coalesce(p_verification_status, 'verified'),
      auth.uid(),
      now(),
      true,
      true
    )
    returning id into v_id;

    -- Create Initial Default Prayer Schedule
    insert into public.prayer_schedules (
      mosque_id,
      prayer_date,
      fajr_start, dhuhr_start, asr_start, maghrib_start, isha_start,
      fajr_iqamah, dhuhr_iqamah, asr_iqamah, maghrib_iqamah, isha_iqamah,
      jummah_iqamah,
      version,
      source_type
    ) values (
      v_id,
      current_date,
      '05:08:00', '12:18:00', '15:37:00', '18:07:00', '19:19:00',
      '05:30:00', '12:45:00', '16:00:00', '18:15:00', '19:45:00',
      '12:45:00',
      1,
      'verified_mosque'
    )
    on conflict (mosque_id, prayer_date) do nothing;

    -- Audit log
    insert into public.audit_logs (actor_name, action, target_table, target_id, changes)
    values (v_actor, 'REGISTER_NEW_MOSQUE', 'mosques', v_id::text, jsonb_build_object(
      'name', p_name,
      'name_ml', p_name_ml,
      'district', p_district,
      'radius_m', p_attendance_radius_m,
      'latitude', p_latitude,
      'longitude', p_longitude
    ));

  else
    -- Update Existing Mosque Configuration
    update public.mosques
    set
      name = trim(p_name),
      name_ml = nullif(trim(p_name_ml), ''),
      city_or_locality = nullif(trim(p_city_or_locality), ''),
      district = trim(p_district),
      latitude = p_latitude,
      longitude = p_longitude,
      entrance_latitude = coalesce(p_entrance_latitude, p_latitude),
      entrance_longitude = coalesce(p_entrance_longitude, p_longitude),
      attendance_radius_m = coalesce(p_attendance_radius_m, attendance_radius_m),
      verification_notes = coalesce(nullif(trim(p_verification_notes), ''), verification_notes),
      verification_status = coalesce(p_verification_status, verification_status),
      updated_at = now()
    where id = v_id;

    -- Audit log
    insert into public.audit_logs (actor_name, action, target_table, target_id, changes)
    values (v_actor, 'CALIBRATE_MOSQUE', 'mosques', v_id::text, jsonb_build_object(
      'name', p_name,
      'name_ml', p_name_ml,
      'district', p_district,
      'radius_m', p_attendance_radius_m,
      'latitude', p_latitude,
      'longitude', p_longitude,
      'entrance_latitude', p_entrance_latitude,
      'entrance_longitude', p_entrance_longitude
    ));
  end if;

  return jsonb_build_object(
    'success', true,
    'mosque_id', v_id,
    'is_new', v_is_new,
    'name', p_name,
    'district', p_district
  );
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 6. STORED PROCEDURE: UPDATE MOSQUE PIPELINE STATUS (VERIFY, REJECT, ETC.)
-- ==============================================================================
create or replace function public.update_mosque_pipeline_status(
  p_mosque_id uuid,
  p_status text,
  p_notes text default null
)
returns jsonb as $$
declare
  v_mosque_name text;
  v_actor text := coalesce(auth.jwt() ->> 'email', 'Administrator');
begin
  if p_status not in ('pending', 'under_review', 'verified', 'rejected', 'needs_correction', 'archived', 'inactive') then
    raise exception 'Invalid pipeline status: %', p_status;
  end if;

  select name into v_mosque_name from public.mosques where id = p_mosque_id;
  if not found then
    raise exception 'Mosque % not found.', p_mosque_id;
  end if;

  update public.mosques
  set
    verification_status = p_status,
    verification_notes = coalesce(nullif(trim(p_notes), ''), verification_notes),
    verified_by = case when p_status = 'verified' then auth.uid() else verified_by end,
    verified_at = case when p_status = 'verified' then now() else verified_at end,
    updated_at = now()
  where id = p_mosque_id;

  -- Audit log
  insert into public.audit_logs (actor_name, action, target_table, target_id, changes)
  values (v_actor, 'MOSQUE_' || upper(p_status), 'mosques', p_mosque_id::text, jsonb_build_object(
    'status', p_status,
    'mosque_name', v_mosque_name,
    'notes', p_notes
  ));

  return jsonb_build_object(
    'success', true,
    'mosque_id', p_mosque_id,
    'status', p_status
  );
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 7. STORED PROCEDURE: ASSIGN MOSQUE ADMIN BY EMAIL
-- Looks up the user profile, grants mosque_admin role, and links to mosque_admins
-- ==============================================================================
create or replace function public.assign_mosque_admin_by_email(
  p_mosque_id uuid,
  p_email text,
  p_assigned_by uuid default auth.uid()
)
returns jsonb as $$
declare
  v_user_id uuid;
  v_mosque_name text;
  v_actor text := coalesce(auth.jwt() ->> 'email', 'Administrator');
begin
  -- 1. Check mosque exists
  select name into v_mosque_name from public.mosques where id = p_mosque_id;
  if not found then
    raise exception 'Mosque % not found.', p_mosque_id;
  end if;

  -- 2. Lookup user in auth.users by email
  select id into v_user_id
  from auth.users
  where email = lower(trim(p_email));

  -- Fallback: check public.profiles if username matches
  if v_user_id is null then
    select id into v_user_id
    from public.profiles
    where username = lower(trim(p_email));
  end if;

  if v_user_id is null then
    raise exception 'No registered user found with email or username "%". Please ensure the user has signed up or been provisioned first.', p_email;
  end if;

  -- 3. Insert into mosque_admins table
  insert into public.mosque_admins (mosque_id, user_id, assigned_by)
  values (p_mosque_id, v_user_id, p_assigned_by)
  on conflict (mosque_id, user_id) do nothing;

  -- 4. Grant mosque_admin role in user_roles table if not already super/state/district admin
  if not exists (
    select 1 from public.user_roles
    where user_id = v_user_id and role in ('super_admin', 'state_admin', 'district_admin')
  ) then
    insert into public.user_roles (user_id, role, is_active)
    values (v_user_id, 'mosque_admin', true)
    on conflict (user_id, role) do update set is_active = true;
  end if;

  -- 5. Audit log
  insert into public.audit_logs (actor_name, action, target_table, target_id, changes)
  values (v_actor, 'ASSIGN_MOSQUE_ADMIN', 'mosque_admins', p_mosque_id::text, jsonb_build_object(
    'email', p_email,
    'user_id', v_user_id,
    'mosque_name', v_mosque_name
  ));

  return jsonb_build_object(
    'success', true,
    'mosque_id', p_mosque_id,
    'user_id', v_user_id,
    'email', p_email,
    'mosque_name', v_mosque_name
  );
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.mosques enable row level security;
alter table public.mosque_admins enable row level security;

-- Drop existing policies to prevent conflicts
drop policy if exists "Mosques are readable by everyone" on public.mosques;
drop policy if exists "Admins manage mosques" on public.mosques;
drop policy if exists "Mosque admins readable by authenticated" on public.mosque_admins;
drop policy if exists "Admins manage mosque_admins" on public.mosque_admins;

-- Policy 1: Verified active mosques readable by mobile app users and public
create policy "Mosques are readable by everyone"
  on public.mosques for select to anon, authenticated
  using (
    (verification_status = 'verified' and is_active = true) or
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin', 'district_admin', 'mosque_admin')
    )
  );

-- Policy 2: Admins can insert, update, or calibrate mosques
create policy "Admins manage mosques"
  on public.mosques for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and (
          ur.role in ('super_admin', 'state_admin', 'district_admin') or
          exists (
            select 1 from public.mosque_admins ma
            where ma.user_id = auth.uid() and ma.mosque_id = mosques.id
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and (
          ur.role in ('super_admin', 'state_admin', 'district_admin') or
          exists (
            select 1 from public.mosque_admins ma
            where ma.user_id = auth.uid() and ma.mosque_id = mosques.id
          )
        )
    )
  );

-- Policy 3: Mosque Admin assignments viewable by authenticated users
create policy "Mosque admins readable by authenticated"
  on public.mosque_admins for select to authenticated
  using (true);

-- Policy 4: Mosque Admin assignments manageable by Super/District Admins
create policy "Admins manage mosque_admins"
  on public.mosque_admins for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin', 'district_admin')
    )
  );

-- Permissions grants
grant select on public.mosques to anon, authenticated;
grant insert, update, delete on public.mosques to authenticated;
grant select on public.mosque_admins to authenticated;
grant insert, update, delete on public.mosque_admins to authenticated;
grant select on public.mosques_directory_view to anon, authenticated;
grant execute on function public.save_mosque_configuration to authenticated;
grant execute on function public.update_mosque_pipeline_status to authenticated;
grant execute on function public.assign_mosque_admin_by_email to authenticated;

-- ==============================================================================
-- 9. DIRECT SQL QUERIES FOR EVERY ACTION (READY TO RUN IN SUPABASE SQL EDITOR)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- ACTION 1: REGISTER A NEW MOSQUE
-- ------------------------------------------------------------------------------
-- SELECT public.save_mosque_configuration(
--   p_name                => 'Mishkal Mosque',
--   p_name_ml             => 'മിശ്കാൽ പള്ളി (കുറ്റിച്ചിറ)',
--   p_city_or_locality    => 'Kuttichira, Kozhikode',
--   p_district            => 'Kozhikode',
--   p_latitude            => 11.2425,
--   p_longitude           => 75.7765,
--   p_entrance_latitude   => 11.2425,
--   p_entrance_longitude  => 75.7765,
--   p_attendance_radius_m => 80,
--   p_verification_notes  => 'Verified via Kuttichira Mahal Committee records and on-site entrance inspection.'
-- );

-- ------------------------------------------------------------------------------
-- ACTION 2: CALIBRATE COORDINATES & GEOFENCE RADIUS
-- ------------------------------------------------------------------------------
-- SELECT public.save_mosque_configuration(
--   p_mosque_id           => '00000000-0000-0000-0000-000000000000',
--   p_name                => 'Kallai Juma Masjid',
--   p_name_ml             => 'കല്ലായ് ജുമാ മസ്ജിദ്',
--   p_city_or_locality    => 'Kallai, Kozhikode',
--   p_district            => 'Kozhikode',
--   p_latitude            => 11.2338,
--   p_longitude           => 75.7951,
--   p_entrance_latitude   => 11.2338,
--   p_entrance_longitude  => 75.7951,
--   p_attendance_radius_m => 70,
--   p_verification_notes  => 'Standard roadside entrance geofence calibrated.'
-- );

-- ------------------------------------------------------------------------------
-- ACTION 3: UPDATE PIPELINE STATUS (VERIFY, UNDER REVIEW, REJECT, CORRECTION)
-- ------------------------------------------------------------------------------
-- SELECT public.update_mosque_pipeline_status(
--   p_mosque_id => '00000000-0000-0000-0000-000000000000',
--   p_status    => 'verified',
--   p_notes     => 'Approved after physical entrance survey.'
-- );

-- ------------------------------------------------------------------------------
-- ACTION 4: ASSIGN MOSQUE ADMINISTRATOR BY EMAIL
-- ------------------------------------------------------------------------------
-- SELECT public.assign_mosque_admin_by_email(
--   p_mosque_id => '00000000-0000-0000-0000-000000000000',
--   p_email     => 'imam@mishkalmosque.org'
-- );

-- ------------------------------------------------------------------------------
-- ACTION 5: QUERY MOSQUES WITH SEARCH & DISTRICT FILTERS
-- ------------------------------------------------------------------------------
-- SELECT *
-- FROM public.mosques_directory_view
-- WHERE (name ILIKE '%mishkal%' OR name_ml ILIKE '%മിശ്കാൽ%' OR city_or_locality ILIKE '%mishkal%')
--   AND (district = 'Kozhikode' OR 'All Districts' = 'All Districts')
-- ORDER BY name ASC;


-- ==============================================================================
-- SALAHNEAR: IQAMAH TIMETABLE & PRAYER SCHEDULES SCHEMA
-- Timetable Management, Separate Adhan vs Iqamah Times, Friday Jummah & Khutbah,
-- Versioning History, RLS Policies, Stored Procedures, and Direct SQL
-- Compatible with PostgreSQL 15+ / Supabase
-- ==============================================================================

-- 1. EXTEND PRAYER SCHEDULES TABLE
create table if not exists public.prayer_schedules (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  prayer_date date not null default current_date,

  -- Astronomical / Adhan Start Times
  fajr_start time not null default '05:08:00',
  dhuhr_start time not null default '12:18:00',
  asr_start time not null default '15:37:00',
  maghrib_start time not null default '18:07:00',
  isha_start time not null default '19:19:00',

  -- Announced Congregational Iqamah Times
  fajr_iqamah time not null default '05:30:00',
  dhuhr_iqamah time not null default '12:45:00',
  asr_iqamah time not null default '16:00:00',
  maghrib_iqamah time not null default '18:15:00',
  isha_iqamah time not null default '19:45:00',

  -- Friday Jummah & Khutbah Times
  jummah_iqamah time not null default '12:45:00',
  khutbah_start time default '12:30:00',

  -- Verification Window (in minutes post-Iqamah)
  verification_window_mins integer not null default 15,

  -- Timetable Source & Priority
  source_type text not null default 'verified_mosque'
    check (source_type in ('verified_mosque', 'admin_entry', 'authority_source', 'calculated')),

  -- Versioning & Effective Date Range
  version integer not null default 1,
  effective_from date not null default current_date,
  effective_until date,
  change_reason text,

  -- Audit Metadata
  approved_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(mosque_id, prayer_date)
);

-- Ensure all enhanced columns exist if prayer_schedules was created earlier
alter table public.prayer_schedules add column if not exists fajr_start time not null default '05:08:00';
alter table public.prayer_schedules add column if not exists dhuhr_start time not null default '12:18:00';
alter table public.prayer_schedules add column if not exists asr_start time not null default '15:37:00';
alter table public.prayer_schedules add column if not exists maghrib_start time not null default '18:07:00';
alter table public.prayer_schedules add column if not exists isha_start time not null default '19:19:00';
alter table public.prayer_schedules add column if not exists fajr_iqamah time not null default '05:30:00';
alter table public.prayer_schedules add column if not exists dhuhr_iqamah time not null default '12:45:00';
alter table public.prayer_schedules add column if not exists asr_iqamah time not null default '16:00:00';
alter table public.prayer_schedules add column if not exists maghrib_iqamah time not null default '18:15:00';
alter table public.prayer_schedules add column if not exists isha_iqamah time not null default '19:45:00';
alter table public.prayer_schedules add column if not exists jummah_iqamah time not null default '12:45:00';
alter table public.prayer_schedules add column if not exists khutbah_start time default '12:30:00';
alter table public.prayer_schedules add column if not exists verification_window_mins integer not null default 15;
alter table public.prayer_schedules add column if not exists source_type text not null default 'verified_mosque';
alter table public.prayer_schedules add column if not exists version integer not null default 1;
alter table public.prayer_schedules add column if not exists effective_from date not null default current_date;
alter table public.prayer_schedules add column if not exists effective_until date;
alter table public.prayer_schedules add column if not exists change_reason text;
alter table public.prayer_schedules add column if not exists updated_by uuid references public.profiles(id);
alter table public.prayer_schedules add column if not exists updated_at timestamptz not null default now();

-- Performance Indexes
create index if not exists prayer_schedules_lookup_idx on public.prayer_schedules(mosque_id, prayer_date);
create index if not exists prayer_schedules_effective_idx on public.prayer_schedules(mosque_id, effective_from desc);

-- ==============================================================================
-- 2. TIMETABLE REVISION HISTORY TABLE (PRESERVES IMMUTABLE AUDIT TRAIL)
-- ==============================================================================
create table if not exists public.prayer_schedule_history (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.prayer_schedules(id) on delete set null,
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  version integer not null,
  effective_from date not null,
  effective_until date,

  -- Snapshot of Iqamah Times
  fajr_iqamah time not null,
  dhuhr_iqamah time not null,
  asr_iqamah time not null,
  maghrib_iqamah time not null,
  isha_iqamah time not null,
  jummah_iqamah time not null,
  khutbah_start time,

  change_reason text,
  updated_by uuid references public.profiles(id),
  archived_at timestamptz not null default now()
);

create index if not exists schedule_history_mosque_idx on public.prayer_schedule_history(mosque_id, version desc);

-- ==============================================================================
-- 3. ACTIVE IQAMAH TIMETABLE VIEW (FOR FLUTTER CLIENT & ADMIN CARDS)
-- ==============================================================================
drop view if exists public.active_iqamah_timetables cascade;

create view public.active_iqamah_timetables
with (security_invoker = on)
as
select distinct on (ps.mosque_id)
  ps.id as schedule_id,
  ps.mosque_id,
  m.name as mosque_name,
  m.name_ml as mosque_name_ml,
  m.district,
  m.state,
  ps.version,
  ps.verification_window_mins,
  ps.fajr_start,
  ps.fajr_iqamah,
  ps.dhuhr_start,
  ps.dhuhr_iqamah,
  ps.asr_start,
  ps.asr_iqamah,
  ps.maghrib_start,
  ps.maghrib_iqamah,
  ps.isha_start,
  ps.isha_iqamah,
  ps.jummah_iqamah,
  ps.khutbah_start,
  ps.source_type,
  ps.change_reason,
  ps.effective_from,
  ps.updated_at
from public.prayer_schedules ps
join public.mosques m on m.id = ps.mosque_id
order by ps.mosque_id, ps.prayer_date desc, ps.version desc;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.prayer_schedules enable row level security;
alter table public.prayer_schedule_history enable row level security;

-- Drop prior policies
drop policy if exists "Prayer schedules are readable by everyone" on public.prayer_schedules;
drop policy if exists "Admins manage prayer schedules" on public.prayer_schedules;
drop policy if exists "Prayer schedule history readable by everyone" on public.prayer_schedule_history;
drop policy if exists "Admins insert schedule history" on public.prayer_schedule_history;

-- Policy 1: Timetables are publicly readable by mobile clients and admins
create policy "Prayer schedules are readable by everyone"
  on public.prayer_schedules for select to anon, authenticated
  using (true);

-- Policy 2: Admins (super_admin, state_admin, district_admin, or assigned mosque_admin) can insert/update
create policy "Admins manage prayer schedules"
  on public.prayer_schedules for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and (
          ur.role in ('super_admin', 'state_admin', 'district_admin') or
          exists (
            select 1 from public.mosque_admins ma
            where ma.user_id = auth.uid() and ma.mosque_id = prayer_schedules.mosque_id
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
            where ma.user_id = auth.uid() and ma.mosque_id = prayer_schedules.mosque_id
          )
        )
    )
  );

-- History Policies
create policy "Prayer schedule history readable by everyone"
  on public.prayer_schedule_history for select to authenticated
  using (true);

create policy "Admins insert schedule history"
  on public.prayer_schedule_history for insert to authenticated
  with check (true);

grant select on public.prayer_schedules to anon, authenticated;
grant insert, update on public.prayer_schedules to authenticated;
grant select on public.active_iqamah_timetables to anon, authenticated;
grant select on public.prayer_schedule_history to authenticated;

-- ==============================================================================
-- 5. STORED PROCEDURE: ATOMIC IQAMAH TIMETABLE PUBLISHING & VERSIONING
-- ==============================================================================
create or replace function public.publish_iqamah_timetable(
  p_mosque_id uuid,
  p_fajr_iqamah time,
  p_dhuhr_iqamah time,
  p_asr_iqamah time,
  p_maghrib_iqamah time,
  p_isha_iqamah time,
  p_jummah_iqamah time,
  p_khutbah_start time default '12:30:00',
  p_change_reason text default 'Scheduled timetable update'
)
returns jsonb as $$
declare
  v_old_rec public.prayer_schedules%rowtype;
  v_new_version integer := 1;
  v_new_id uuid;
  v_mosque_name text;
  v_actor text := coalesce(auth.jwt() ->> 'email', 'Mosque Administrator');
begin
  -- 1. Verify mosque exists
  select name into v_mosque_name from public.mosques where id = p_mosque_id;
  if not found then
    raise exception 'Mosque with ID % not found', p_mosque_id;
  end if;

  -- 2. Fetch existing schedule to archive and increment version
  select * into v_old_rec
  from public.prayer_schedules
  where mosque_id = p_mosque_id
  order by version desc
  limit 1;

  if v_old_rec.id is not null then
    v_new_version := v_old_rec.version + 1;

    -- Archive current version to history
    insert into public.prayer_schedule_history (
      schedule_id,
      mosque_id,
      version,
      effective_from,
      effective_until,
      fajr_iqamah,
      dhuhr_iqamah,
      asr_iqamah,
      maghrib_iqamah,
      isha_iqamah,
      jummah_iqamah,
      khutbah_start,
      change_reason,
      updated_by,
      archived_at
    ) values (
      v_old_rec.id,
      p_mosque_id,
      v_old_rec.version,
      v_old_rec.effective_from,
      current_date,
      v_old_rec.fajr_iqamah,
      v_old_rec.dhuhr_iqamah,
      v_old_rec.asr_iqamah,
      v_old_rec.maghrib_iqamah,
      v_old_rec.isha_iqamah,
      v_old_rec.jummah_iqamah,
      v_old_rec.khutbah_start,
      v_old_rec.change_reason,
      auth.uid(),
      now()
    );
  end if;

  -- 3. Upsert into prayer_schedules
  insert into public.prayer_schedules (
    mosque_id,
    prayer_date,
    fajr_start,
    dhuhr_start,
    asr_start,
    maghrib_start,
    isha_start,
    fajr_iqamah,
    dhuhr_iqamah,
    asr_iqamah,
    maghrib_iqamah,
    isha_iqamah,
    jummah_iqamah,
    khutbah_start,
    source_type,
    version,
    effective_from,
    change_reason,
    updated_by,
    updated_at
  ) values (
    p_mosque_id,
    current_date,
    coalesce(v_old_rec.fajr_start, '05:08:00'),
    coalesce(v_old_rec.dhuhr_start, '12:18:00'),
    coalesce(v_old_rec.asr_start, '15:37:00'),
    coalesce(v_old_rec.maghrib_start, '18:07:00'),
    coalesce(v_old_rec.isha_start, '19:19:00'),
    p_fajr_iqamah,
    p_dhuhr_iqamah,
    p_asr_iqamah,
    p_maghrib_iqamah,
    p_isha_iqamah,
    p_jummah_iqamah,
    p_khutbah_start,
    'verified_mosque',
    v_new_version,
    current_date,
    p_change_reason,
    auth.uid(),
    now()
  )
  on conflict (mosque_id, prayer_date) do update set
    fajr_iqamah = excluded.fajr_iqamah,
    dhuhr_iqamah = excluded.dhuhr_iqamah,
    asr_iqamah = excluded.asr_iqamah,
    maghrib_iqamah = excluded.maghrib_iqamah,
    isha_iqamah = excluded.isha_iqamah,
    jummah_iqamah = excluded.jummah_iqamah,
    khutbah_start = excluded.khutbah_start,
    version = excluded.version,
    effective_from = excluded.effective_from,
    change_reason = excluded.change_reason,
    updated_by = excluded.updated_by,
    updated_at = now()
  returning id into v_new_id;

  -- 4. Record Audit Log
  insert into public.audit_logs (
    actor_name,
    action,
    target_table,
    target_id,
    changes
  ) values (
    v_actor,
    'UPDATE_IQAMAH_SCHEDULE',
    'prayer_schedules',
    p_mosque_id::text,
    jsonb_build_object(
      'mosque_id', p_mosque_id,
      'mosque_name', v_mosque_name,
      'version', v_new_version,
      'fajr_iqamah', p_fajr_iqamah::text,
      'dhuhr_iqamah', p_dhuhr_iqamah::text,
      'asr_iqamah', p_asr_iqamah::text,
      'maghrib_iqamah', p_maghrib_iqamah::text,
      'isha_iqamah', p_isha_iqamah::text,
      'jummah_iqamah', p_jummah_iqamah::text,
      'khutbah_start', p_khutbah_start::text,
      'reason', p_change_reason
    )
  );

  return jsonb_build_object(
    'success', true,
    'schedule_id', v_new_id,
    'mosque_id', p_mosque_id,
    'mosque_name', v_mosque_name,
    'version', v_new_version,
    'fajr_iqamah', p_fajr_iqamah::text,
    'dhuhr_iqamah', p_dhuhr_iqamah::text,
    'asr_iqamah', p_asr_iqamah::text,
    'maghrib_iqamah', p_maghrib_iqamah::text,
    'isha_iqamah', p_isha_iqamah::text,
    'jummah_iqamah', p_jummah_iqamah::text,
    'khutbah_start', p_khutbah_start::text
  );
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 6. DIRECT SQL QUERY EXAMPLES (CAN BE RUN DIRECTLY IN SUPABASE SQL EDITOR)
-- ==============================================================================

/*
-- [1] PUBLISH A NEW TIMETABLE VIA STORED PROCEDURE:
SELECT public.publish_iqamah_timetable(
  '<MOSQUE_UUID>',
  '05:30:00', -- Fajr Iqamah
  '12:45:00', -- Dhuhr Iqamah
  '16:00:00', -- Asr Iqamah
  '18:15:00', -- Maghrib Iqamah
  '19:45:00', -- Isha Iqamah
  '12:45:00', -- Friday Jummah Iqamah
  '12:30:00', -- Khutbah start
  'Seasonal winter timing adjustment'
);

-- [2] VIEW CURRENT ACTIVE IQAMAH TIMETABLE FOR ALL MOSQUES:
SELECT
  mosque_name,
  mosque_name_ml,
  district,
  version,
  fajr_iqamah,
  dhuhr_iqamah,
  asr_iqamah,
  maghrib_iqamah,
  isha_iqamah,
  jummah_iqamah,
  khutbah_start,
  verification_window_mins,
  updated_at
FROM public.active_iqamah_timetables
ORDER BY mosque_name;

-- [3] DIRECT SQL UPSERT FOR A SINGLE MOSQUE:
INSERT INTO public.prayer_schedules (
  mosque_id,
  prayer_date,
  fajr_start, fajr_iqamah,
  dhuhr_start, dhuhr_iqamah,
  asr_start, asr_iqamah,
  maghrib_start, maghrib_iqamah,
  isha_start, isha_iqamah,
  jummah_iqamah, khutbah_start,
  version, source_type
) VALUES (
  '<MOSQUE_UUID>',
  CURRENT_DATE,
  '05:05:00', '05:30:00',
  '12:15:00', '12:45:00',
  '15:35:00', '16:00:00',
  '18:05:00', '18:15:00',
  '19:20:00', '19:45:00',
  '12:45:00', '12:30:00',
  1, 'verified_mosque'
)
ON CONFLICT (mosque_id, prayer_date) DO UPDATE SET
  fajr_iqamah = EXCLUDED.fajr_iqamah,
  dhuhr_iqamah = EXCLUDED.dhuhr_iqamah,
  asr_iqamah = EXCLUDED.asr_iqamah,
  maghrib_iqamah = EXCLUDED.maghrib_iqamah,
  isha_iqamah = EXCLUDED.isha_iqamah,
  jummah_iqamah = EXCLUDED.jummah_iqamah,
  khutbah_start = EXCLUDED.khutbah_start,
  version = public.prayer_schedules.version + 1,
  updated_at = NOW();

-- [4] VIEW VERSION AUDIT HISTORY FOR A MOSQUE:
SELECT
  version,
  effective_from,
  effective_until,
  fajr_iqamah,
  dhuhr_iqamah,
  asr_iqamah,
  maghrib_iqamah,
  isha_iqamah,
  jummah_iqamah,
  change_reason,
  archived_at
FROM public.prayer_schedule_history
WHERE mosque_id = '<MOSQUE_UUID>'
ORDER BY version DESC;
*/


-- ==============================================================================
-- 005_prayer_schedules.sql
-- Mosque-specific daily schedules: Start times and official Iqamah times
-- ==============================================================================

create table if not exists public.prayer_schedules (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  prayer_date date not null,
  fajr_start time not null,
  dhuhr_start time not null,
  asr_start time not null,
  maghrib_start time not null,
  isha_start time not null,
  fajr_iqamah time,
  dhuhr_iqamah time,
  asr_iqamah time,
  maghrib_iqamah time,
  isha_iqamah time,
  source_type text not null default 'admin_entry',
  approved_by uuid references public.profiles(id),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  unique(mosque_id, prayer_date)
);

create index if not exists prayer_schedules_lookup_idx
  on public.prayer_schedules(mosque_id, prayer_date);

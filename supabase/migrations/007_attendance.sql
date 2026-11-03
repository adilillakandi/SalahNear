-- ==============================================================================
-- 007_attendance.sql
-- Attendance Submissions & Verification State
-- ==============================================================================

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  prayer_type text not null check (
    prayer_type in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')
  ),
  prayer_date date not null,
  status text not null default 'pending' check (
    status in ('pending', 'verified', 'flagged', 'rejected')
  ),
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  points_awarded integer not null default 0,
  idempotency_key text not null,
  unique(user_id, prayer_type, prayer_date),
  unique(user_id, idempotency_key)
);

create index if not exists attendance_user_date_idx
  on public.attendance(user_id, prayer_date);

create index if not exists attendance_mosque_prayer_idx
  on public.attendance(mosque_id, prayer_date, prayer_type);

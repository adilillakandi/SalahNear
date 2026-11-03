-- ==============================================================================
-- 010_points_ledger.sql
-- Immutable points ledger for gamification and streaks
-- ==============================================================================

create table if not exists public.user_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attendance_id uuid references public.attendance(id) on delete set null,
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_points_user_created_idx
  on public.user_points(user_id, created_at desc);

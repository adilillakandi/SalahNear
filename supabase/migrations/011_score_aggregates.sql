-- ==============================================================================
-- 011_score_aggregates.sql
-- Streaks, daily aggregates, and optimized Leaderboard view
-- ==============================================================================

create table if not exists public.user_streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_attendance_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_user_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score_date date not null,
  verified_count integer not null default 0,
  points_earned integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, score_date)
);

create index if not exists daily_user_scores_date_idx
  on public.daily_user_scores(score_date);

-- Materialized or direct view for community leaderboard
create or replace view public.leaderboard_view as
select
  p.id as user_id,
  p.full_name as display_name,
  p.avatar_url,
  p.district,
  m.name as mosque_name,
  coalesce(s.current_streak, 0) as current_streak,
  coalesce(sum(pt.points), 0)::integer as total_points
from public.profiles p
left join public.mosques m on m.id = p.home_mosque_id
left join public.user_streaks s on s.user_id = p.id
left join public.user_points pt on pt.user_id = p.id
group by p.id, p.full_name, p.avatar_url, p.district, m.name, s.current_streak;

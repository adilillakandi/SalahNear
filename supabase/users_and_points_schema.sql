-- ==============================================================================
-- SALAHNEAR: USER MANAGEMENT, POINTS LEDGER & LEADERBOARD MODERATION SCHEMA
-- Complete SQL Schema, Stored Procedures, Triggers, RLS, and Direct Queries
-- Compatible with PostgreSQL 15+ / Supabase
-- ==============================================================================

-- 1. ENHANCE PROFILES TABLE (ACCOUNT STATUS & MODERATION)
alter table public.profiles add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'suspended', 'flagged', 'banned'));
alter table public.profiles add column if not exists suspension_reason text;
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspended_by uuid references public.profiles(id);
alter table public.profiles add column if not exists is_leaderboard_hidden boolean not null default false;
alter table public.profiles add column if not exists phone_number text;

create index if not exists profiles_status_idx on public.profiles(account_status);
create index if not exists profiles_district_idx on public.profiles(district);

-- 2. APPEND-ONLY POINTS LEDGER (USER_POINTS)
create table if not exists public.user_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attendance_id uuid references public.attendance(id) on delete set null,
  points integer not null, -- positive for awards, negative for deductions/penalties
  activity_type text not null default 'admin_adjustment'
    check (activity_type in (
      'prayer_attendance',
      'streak_bonus',
      'friend_encounter',
      'admin_award',
      'admin_penalty',
      'admin_adjustment',
      'admin_reversal',
      'dispute_resolution',
      'correction'
    )),
  reason text not null default 'Administrative points adjustment',
  notes text, -- alias / additional notes
  adjusted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Ensure optional columns exist if user_points was created in earlier migrations
alter table public.user_points add column if not exists activity_type text not null default 'admin_adjustment';
alter table public.user_points add column if not exists notes text;
alter table public.user_points add column if not exists adjusted_by uuid references public.profiles(id);

create index if not exists user_points_user_created_idx on public.user_points(user_id, created_at desc);
create index if not exists user_points_activity_idx on public.user_points(activity_type);
create index if not exists user_points_created_desc_idx on public.user_points(created_at desc);

-- 3. USER STREAKS TABLE
create table if not exists public.user_streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_attendance_date date,
  updated_at timestamptz not null default now()
);

-- 4. REAL-TIME LEADERBOARD VIEW (WITH TIE-BREAKING & MODERATION FILTERS)
-- Drop prior view definition if column names differ
drop view if exists public.leaderboard_view cascade;

create view public.leaderboard_view as
select
  p.id as user_id,
  p.full_name as display_name,
  p.full_name,
  p.username,
  p.avatar_url,
  p.district,
  p.state,
  p.account_status,
  p.is_leaderboard_hidden,
  m.name as mosque_name,
  m.name as home_mosque_name,
  coalesce(s.current_streak, 0) as current_streak,
  coalesce(s.longest_streak, 0) as longest_streak,
  coalesce(sum(pt.points), 0)::integer as total_points,
  dense_rank() over (
    order by coalesce(sum(pt.points), 0) desc, coalesce(s.current_streak, 0) desc, p.created_at asc
  ) as rank
from public.profiles p
left join public.mosques m on m.id = p.home_mosque_id
left join public.user_streaks s on s.user_id = p.id
left join public.user_points pt on pt.user_id = p.id
where p.account_status != 'banned'
  and p.is_leaderboard_hidden = false
group by p.id, p.full_name, p.username, p.avatar_url, p.district, p.state, p.account_status, p.is_leaderboard_hidden, m.name, s.current_streak, s.longest_streak, p.created_at;

-- 5. ROW LEVEL SECURITY (RLS) FOR USER_POINTS
alter table public.user_points enable row level security;

-- Drop legacy policies if existing
drop policy if exists "Users can view their own points ledger" on public.user_points;
drop policy if exists "Admins can manage points ledger" on public.user_points;
drop policy if exists "Admins can insert points adjustments" on public.user_points;

-- Policy 1: Members can only read their own ledger
create policy "Users can view their own points ledger"
  on public.user_points for select to authenticated
  using (auth.uid() = user_id);

-- Policy 2: Admins (super_admin, state_admin, support_admin) can view all ledger records
create policy "Admins can view all points"
  on public.user_points for select to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin', 'district_admin', 'support_admin')
    )
  );

-- Policy 3: Authorized Admins can insert points adjustments
create policy "Admins can insert points adjustments"
  on public.user_points for insert to authenticated
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin', 'support_admin')
    )
  );

grant select on public.user_points to authenticated;
grant insert on public.user_points to authenticated;
grant select on public.leaderboard_view to anon, authenticated;

-- ==============================================================================
-- 6. STORED PROCEDURE: ATOMIC POINTS ADJUSTMENT (AWARD & DEDUCTION)
-- ==============================================================================
create or replace function public.adjust_user_points(
  p_user_id uuid,
  p_points integer,
  p_reason text,
  p_activity_type text default null
)
returns jsonb as $$
declare
  v_user_name text;
  v_prev_total integer;
  v_new_total integer;
  v_actor text;
  v_action_type text;
  v_ledger_id uuid;
  v_resolved_activity text;
begin
  -- 1. Validate inputs
  if p_points = 0 then
    raise exception 'Points adjustment cannot be zero';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'A valid reason is required for points adjustment';
  end if;

  -- 2. Verify target user exists
  select full_name into v_user_name from public.profiles where id = p_user_id;
  if not found then
    raise exception 'User with ID % not found', p_user_id;
  end if;

  -- 3. Calculate current balance
  select coalesce(sum(points), 0)::integer into v_prev_total
  from public.user_points
  where user_id = p_user_id;

  -- 4. Determine activity type
  if p_activity_type is not null then
    v_resolved_activity := p_activity_type;
  elsif p_points > 0 then
    v_resolved_activity := 'admin_award';
  else
    v_resolved_activity := 'admin_penalty';
  end if;

  -- 5. Insert into append-only points ledger
  insert into public.user_points (
    user_id,
    points,
    activity_type,
    reason,
    notes,
    adjusted_by
  ) values (
    p_user_id,
    p_points,
    v_resolved_activity,
    p_reason,
    p_reason,
    auth.uid()
  ) returning id into v_ledger_id;

  -- 6. Recalculate new total balance
  select coalesce(sum(points), 0)::integer into v_new_total
  from public.user_points
  where user_id = p_user_id;

  -- 7. Record in audit log
  v_actor := coalesce(auth.jwt() ->> 'email', 'Super Admin');
  v_action_type := case when p_points > 0 then 'POINTS_AWARDED' else 'POINTS_DEDUCTED' end;

  insert into public.audit_logs (
    actor_name,
    action,
    target_table,
    target_id,
    changes
  ) values (
    v_actor,
    v_action_type,
    'user_points',
    p_user_id::text,
    jsonb_build_object(
      'ledger_id', v_ledger_id,
      'user_id', p_user_id,
      'user_name', v_user_name,
      'points_delta', p_points,
      'previous_points', v_prev_total,
      'new_total_points', v_new_total,
      'activity_type', v_resolved_activity,
      'reason', p_reason
    )
  );

  return jsonb_build_object(
    'success', true,
    'ledger_id', v_ledger_id,
    'user_id', p_user_id,
    'user_name', v_user_name,
    'points_delta', p_points,
    'previous_points', v_prev_total,
    'new_total_points', v_new_total,
    'reason', p_reason
  );
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 7. STORED PROCEDURE: MODERATE USER STATUS (SUSPEND, BAN, RESTORE)
-- ==============================================================================
create or replace function public.moderate_user_account(
  p_user_id uuid,
  p_status text, -- 'active', 'suspended', 'banned', 'flagged'
  p_reason text,
  p_hide_from_leaderboard boolean default null
)
returns jsonb as $$
declare
  v_actor text := coalesce(auth.jwt() ->> 'email', 'Super Admin');
  v_user_name text;
  v_hide boolean;
begin
  select full_name into v_user_name from public.profiles where id = p_user_id;
  if not found then
    raise exception 'User with ID % not found', p_user_id;
  end if;

  v_hide := coalesce(p_hide_from_leaderboard, (p_status in ('suspended', 'banned')));

  update public.profiles
  set
    account_status = p_status,
    suspension_reason = case when p_status in ('suspended', 'banned', 'flagged') then p_reason else null end,
    suspended_at = case when p_status in ('suspended', 'banned') then now() else null end,
    suspended_by = case when p_status in ('suspended', 'banned') then auth.uid() else null end,
    is_leaderboard_hidden = v_hide,
    updated_at = now()
  where id = p_user_id;

  -- Record audit log
  insert into public.audit_logs (actor_name, action, target_table, target_id, changes)
  values (
    v_actor,
    'USER_ACCOUNT_STATUS_CHANGED',
    'profiles',
    p_user_id::text,
    jsonb_build_object('status', p_status, 'reason', p_reason, 'is_leaderboard_hidden', v_hide)
  );

  return jsonb_build_object('success', true, 'user_id', p_user_id, 'new_status', p_status);
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 8. DIRECT SQL QUERY EXAMPLES (CAN BE RUN DIRECTLY IN SUPABASE SQL EDITOR)
-- ==============================================================================

/*
-- [1] AWARD POINTS (+25 PTS) VIA STORED PROCEDURE:
SELECT public.adjust_user_points(
  '<USER_UUID>',
  25,
  'Bonus for Ramadan Tahajjud special congregation attendance'
);

-- [2] DEDUCT POINTS (-15 PTS) VIA STORED PROCEDURE:
SELECT public.adjust_user_points(
  '<USER_UUID>',
  -15,
  'Penalty for unverified borderline mock-location submission'
);

-- [3] DIRECT SQL INSERT TO AWARD POINTS (+20 PTS):
INSERT INTO public.user_points (
  user_id,
  points,
  activity_type,
  reason
) VALUES (
  '<USER_UUID>',
  20,
  'admin_award',
  'Approved attendance dispute claim #104'
);

-- [4] DIRECT SQL INSERT TO DEDUCT POINTS (-10 PTS):
INSERT INTO public.user_points (
  user_id,
  points,
  activity_type,
  reason
) VALUES (
  '<USER_UUID>',
  -10,
  'admin_penalty',
  'Reversal of invalid QR check-in outside geo-fence'
);

-- [5] VIEW RUNNING LEDGER STATEMENT FOR A USER:
SELECT
  id,
  points,
  activity_type,
  reason,
  created_at,
  SUM(points) OVER (ORDER BY created_at ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
FROM public.user_points
WHERE user_id = '<USER_UUID>'
ORDER BY created_at DESC;

-- [6] VIEW TOP 20 ON THE LEADERBOARD:
SELECT
  rank,
  full_name,
  username,
  district,
  home_mosque_name,
  current_streak,
  total_points
FROM public.leaderboard_view
ORDER BY rank ASC
LIMIT 20;

-- [7] SUSPEND USER AND HIDE FROM LEADERBOARD:
SELECT public.moderate_user_account(
  '<USER_UUID>',
  'suspended',
  'GPS spoofing investigation pending'
);
*/


-- ==============================================================================
-- SALAHNEAR: SUPPORT CASES & DISPUTE RESOLUTION COMPLETE SCHEMA
-- Covers customer support, grievance redressal, attendance dispute arbitrations,
-- mock-location investigations, account recovery, and points adjustments.
-- PostgreSQL 15+ / Supabase Compatible
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- ==============================================================================
-- 2. SCHEMA DEFINITION & EXTENSIONS
-- ==============================================================================

create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_name text,
  user_email text,
  contact_phone text,
  category text not null,
  title text not null,
  description text not null,
  status text not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  internal_notes text,
  resolution_summary text,
  related_mosque_id uuid references public.mosques(id) on delete set null,
  related_attendance_id uuid references public.attendance(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist if table was already created in earlier migration
alter table public.support_cases add column if not exists user_name text;
alter table public.support_cases add column if not exists user_email text;
alter table public.support_cases add column if not exists contact_phone text;
alter table public.support_cases add column if not exists related_mosque_id uuid references public.mosques(id) on delete set null;
alter table public.support_cases add column if not exists related_attendance_id uuid references public.attendance(id) on delete set null;
alter table public.support_cases add column if not exists resolved_at timestamptz;
alter table public.support_cases add column if not exists resolved_by uuid references public.profiles(id) on delete set null;
alter table public.support_cases add column if not exists updated_at timestamptz not null default now();

-- Update check constraints safely
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'support_cases_category_check') then
    alter table public.support_cases drop constraint support_cases_category_check;
  end if;
  alter table public.support_cases add constraint support_cases_category_check check (
    category in (
      'attendance_dispute',
      'mock_location',
      'points_dispute',
      'mosque_correction',
      'account_recovery',
      'friend_dispute',
      'general'
    )
  );

  if exists (select 1 from pg_constraint where conname = 'support_cases_status_check') then
    alter table public.support_cases drop constraint support_cases_status_check;
  end if;
  alter table public.support_cases add constraint support_cases_status_check check (
    status in (
      'open',
      'in_progress',
      'waiting_for_user',
      'resolved',
      'closed'
    )
  );
end;
$$;

create index if not exists support_cases_user_idx on public.support_cases(user_id);
create index if not exists support_cases_status_idx on public.support_cases(status, category);
create index if not exists support_cases_created_idx on public.support_cases(created_at desc);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.support_cases enable row level security;

drop policy if exists "Users view own support cases" on public.support_cases;
drop policy if exists "Users create own support cases" on public.support_cases;
drop policy if exists "Admins manage support cases" on public.support_cases;

-- Congregants can view their own submitted tickets
create policy "Users view own support cases"
  on public.support_cases for select to authenticated
  using (auth.uid() = user_id);

-- Congregants can create support tickets from the mobile app
create policy "Users create own support cases"
  on public.support_cases for insert to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- Administrators have full management access over all tickets
create policy "Admins manage support cases"
  on public.support_cases for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin', 'district_admin', 'support_admin', 'attendance_reviewer')
    )
  );

grant select, insert, update, delete on public.support_cases to authenticated, anon;

-- ==============================================================================
-- 4. CONSOLIDATED DIRECTORY VIEW: SUPPORT_CASES_VIEW
-- Joins profiles, assigned staff, and mosque references
-- ==============================================================================
create or replace view public.support_cases_view
with (security_invoker = on)
as
select
  sc.id,
  sc.user_id,
  coalesce(sc.user_name, p.full_name, 'Community Member') as user_name,
  coalesce(sc.user_email, p.email, u.email, 'user@salahnear.org') as user_email,
  sc.contact_phone,
  sc.category,
  sc.title,
  sc.description,
  sc.status,
  sc.assigned_to as assigned_to_id,
  coalesce(ap.full_name, 'Unassigned') as assigned_to,
  sc.internal_notes,
  sc.resolution_summary,
  sc.related_attendance_id,
  sc.related_mosque_id,
  m.name as related_mosque_name,
  sc.resolved_at,
  sc.created_at,
  sc.updated_at
from public.support_cases sc
left join public.profiles p on p.id = sc.user_id
left join auth.users u on u.id = sc.user_id
left join public.profiles ap on ap.id = sc.assigned_to
left join public.mosques m on m.id = sc.related_mosque_id;

grant select on public.support_cases_view to authenticated, anon;

-- ==============================================================================
-- 5. ATOMIC STORED PROCEDURE: RESOLVE / UPDATE SUPPORT CASE
-- Updates status, records notes, logs audit trail, and optionally grants points
-- ==============================================================================
create or replace function public.resolve_support_case(
  p_case_id uuid,
  p_status text,
  p_internal_notes text default null,
  p_resolution_summary text default null,
  p_points_to_award integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_user_name text;
  v_category text;
  v_actor_name text := coalesce(auth.jwt() ->> 'email', 'Support Admin');
begin
  select user_id, user_name, category into v_user_id, v_user_name, v_category
  from public.support_cases
  where id = p_case_id;

  if not found then
    raise exception 'Support ticket with ID % not found', p_case_id;
  end if;

  -- 1. Update support case
  update public.support_cases
  set
    status = p_status,
    internal_notes = coalesce(p_internal_notes, internal_notes),
    resolution_summary = coalesce(p_resolution_summary, resolution_summary),
    resolved_at = case when p_status in ('resolved', 'closed') then now() else resolved_at end,
    resolved_by = case when p_status in ('resolved', 'closed') then auth.uid() else resolved_by end,
    updated_at = now()
  where id = p_case_id;

  -- 2. If points to award > 0 and user_id is present, credit points ledger
  if p_points_to_award > 0 and v_user_id is not null then
    insert into public.user_points (
      user_id,
      points,
      reason,
      notes,
      activity_type
    ) values (
      v_user_id,
      p_points_to_award,
      'support_arbitration_credit',
      coalesce(p_resolution_summary, 'Dispute resolved in favor of congregant'),
      'admin_adjustment'
    );
  end if;

  -- 3. Record Audit Log
  insert into public.audit_logs (
    actor_id,
    actor_name,
    action,
    target_table,
    target_id,
    reason,
    changes
  ) values (
    auth.uid(),
    v_actor_name,
    'SUPPORT_CASE_' || upper(p_status),
    'support_cases',
    p_case_id::text,
    p_resolution_summary,
    jsonb_build_object(
      'status', p_status,
      'category', v_category,
      'user_id', v_user_id,
      'internal_notes', p_internal_notes,
      'resolution_summary', p_resolution_summary,
      'points_awarded', p_points_to_award
    )
  );

  return jsonb_build_object(
    'success', true,
    'case_id', p_case_id,
    'status', p_status,
    'points_awarded', p_points_to_award
  );
end;
$$;

grant execute on function public.resolve_support_case(uuid, text, text, text, integer) to authenticated, anon;

-- ==============================================================================
-- 6. ATOMIC STORED PROCEDURE: ASSIGN SUPPORT CASE
-- Assigns ticket to designated administrative staff member
-- ==============================================================================
create or replace function public.assign_support_case(
  p_case_id uuid,
  p_assigned_to_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_staff_name text;
begin
  select full_name into v_staff_name from public.profiles where id = p_assigned_to_user_id;

  update public.support_cases
  set
    assigned_to = p_assigned_to_user_id,
    status = case when status = 'open' then 'in_progress' else status end,
    updated_at = now()
  where id = p_case_id;

  insert into public.audit_logs (
    actor_id,
    actor_name,
    action,
    target_table,
    target_id,
    changes
  ) values (
    auth.uid(),
    'Support Admin',
    'SUPPORT_CASE_ASSIGNED',
    'support_cases',
    p_case_id::text,
    jsonb_build_object(
      'assigned_to_id', p_assigned_to_user_id,
      'assigned_to_name', coalesce(v_staff_name, 'Staff Member')
    )
  );

  return jsonb_build_object('success', true, 'case_id', p_case_id, 'assigned_to', v_staff_name);
end;
$$;

grant execute on function public.assign_support_case(uuid, uuid) to authenticated, anon;

-- ==============================================================================
-- 7. ATOMIC STORED PROCEDURE: DELETE SUPPORT CASE
-- Deletes ticket and writes immutable audit log
-- ==============================================================================
create or replace function public.delete_support_case(
  p_case_id uuid,
  p_reason text default 'Deleted by Support Admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_title text;
  v_user_name text;
begin
  select title, user_name into v_title, v_user_name from public.support_cases where id = p_case_id;

  if not found then
    raise exception 'Support ticket with ID % not found', p_case_id;
  end if;

  delete from public.support_cases where id = p_case_id;

  insert into public.audit_logs (
    actor_id,
    actor_name,
    action,
    target_table,
    target_id,
    reason,
    changes
  ) values (
    auth.uid(),
    'Support Admin',
    'SUPPORT_CASE_DELETED',
    'support_cases',
    p_case_id::text,
    p_reason,
    jsonb_build_object('title', v_title, 'user_name', v_user_name, 'reason', p_reason)
  );

  return jsonb_build_object('success', true, 'case_id', p_case_id);
end;
$$;

grant execute on function public.delete_support_case(uuid, text) to authenticated, anon;

-- ==============================================================================
-- 8. SAFE SAMPLE SEEDING SCRIPT
-- Populates representative Kerala disputes if table is empty
-- ==============================================================================
do $$
declare
  v_count integer;
  v_user_id uuid;
  v_staff_id uuid;
  v_mosque_id uuid;
begin
  select count(*) into v_count from public.support_cases;

  if v_count = 0 then
    -- Try to find sample user and staff
    select id into v_user_id from public.profiles where username ilike '%fahad%' or full_name ilike '%salman%' limit 1;
    select id into v_staff_id from public.profiles where email ilike '%support%' or full_name ilike '%fathima%' limit 1;
    select id into v_mosque_id from public.mosques where name ilike '%mishkal%' limit 1;

    -- Dispute 1: Attendance Dispute (Heavy Rain GPS Drift)
    insert into public.support_cases (
      user_name, user_email, category, title, description,
      status, assigned_to, internal_notes, created_at
    ) values (
      'Salman Faris', 'salman_mlp@gmail.com', 'attendance_dispute',
      'Flagged attendance at Town Valiya Juma Masjid',
      'My Fajr check-in was flagged for distance. I was inside the courtyard where GPS satellite reception was temporarily drifting due to heavy monsoon rain.',
      'in_progress', v_staff_id,
      'Inspecting device accuracy and satellite signal fix timestamp.',
      now() - interval '1 day'
    );

    -- Dispute 2: Mosque Gate Coordinates Correction
    insert into public.support_cases (
      user_name, user_email, category, title, description,
      status, assigned_to, internal_notes, created_at
    ) values (
      'Zameer KP', 'zameer_knr@gmail.com', 'mosque_correction',
      'Kallai Juma Masjid Entrance Gate Coordinates',
      'The geofence center is on the north boundary wall instead of the main entrance road. Users parked in the south lot get distance alerts.',
      'open', null,
      'Needs District Admin site coordinate calibration check.',
      now() - interval '2 days'
    );

    -- Dispute 3: Points Calculation Dispute (Resolved)
    insert into public.support_cases (
      user_name, user_email, category, title, description,
      status, assigned_to, internal_notes, resolution_summary, resolved_at, created_at
    ) values (
      'Aisha Siddiqa', 'aisha_ekm@gmail.com', 'points_dispute',
      'Jummah Congregation Points Calculation',
      'Attended Friday Jummah prayer on Oct 31, but streak did not increment automatically.',
      'resolved', v_staff_id,
      'Verified attendance proof manually. Granted 5 points correction ledger entry.',
      'Manual attendance points credited (+5 pts). User streak adjusted.',
      now() - interval '3 days',
      now() - interval '4 days'
    );

    -- Dispute 4: Account Recovery / Phone Number Migration
    insert into public.support_cases (
      user_name, user_email, category, title, description,
      status, assigned_to, internal_notes, created_at
    ) values (
      'Rashid P', 'rashid_clt@gmail.com', 'account_recovery',
      'New Phone Number OTP Migration',
      'Changed mobile number from +91 98471... to +91 94472... requesting profile history migration.',
      'waiting_for_user', v_staff_id,
      'Requested previous phone number billing receipt confirmation.',
      now() - interval '3 days'
    );
  end if;
end;
$$;

-- ==============================================================================
-- 9. DIRECT SQL QUERY EXAMPLES FOR EVERY ACTION
-- ==============================================================================

/*
-- [1] LIST ALL OPEN SUPPORT TICKETS:
SELECT * FROM public.support_cases_view
WHERE status IN ('open', 'in_progress')
ORDER BY created_at DESC;

-- [2] FILTER TICKETS BY CATEGORY:
SELECT * FROM public.support_cases_view
WHERE category = 'attendance_dispute';

-- [3] SEARCH TICKETS BY USER OR KEYWORD:
SELECT * FROM public.support_cases_view
WHERE title ILIKE '%fajr%' OR user_name ILIKE '%salman%';

-- [4] ASSIGN TICKET TO SUPPORT OFFICER:
SELECT public.assign_support_case(
  '<CASE_UUID>'::uuid,
  '<STAFF_PROFILE_UUID>'::uuid
);

-- [5] RESOLVE DISPUTE & AWARD 5 POINTS COMPENSATION:
SELECT public.resolve_support_case(
  '<CASE_UUID>'::uuid,
  'resolved',
  'Verified physical presence with local Mahal committee.',
  'Attendance approved manually. Credited +5 points to user streak ledger.',
  5 -- Awards 5 points to the user's ledger
);

-- [6] DELETE SPAM / DUPLICATE TICKET:
SELECT public.delete_support_case(
  '<CASE_UUID>'::uuid,
  'Duplicate submission'
);
*/


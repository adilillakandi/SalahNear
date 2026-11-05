-- ==============================================================================
-- SALAHNEAR: IMMUTABLE AUDIT TRAIL & COMPLIANCE LOG COMPLETE SCHEMA
-- System-wide append-only flight recorder for all administrative actions,
-- security overrides, points adjustments, and role mutations.
-- PostgreSQL 15+ / Supabase Compatible
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- ==============================================================================
-- 2. IMMUTABLE AUDIT LOGS TABLE & COLUMN EXTENSIONS
-- ==============================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,
  entity_type text,
  entity_id text,
  target_table text not null default 'system',
  target_id text,
  before_state jsonb,
  after_state jsonb,
  changes jsonb,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Ensure all columns exist safely
alter table public.audit_logs add column if not exists actor_name text;
alter table public.audit_logs add column if not exists entity_type text;
alter table public.audit_logs add column if not exists entity_id text;
alter table public.audit_logs add column if not exists before_state jsonb;
alter table public.audit_logs add column if not exists after_state jsonb;
alter table public.audit_logs add column if not exists changes jsonb;
alter table public.audit_logs add column if not exists reason text;
alter table public.audit_logs add column if not exists ip_address text;
alter table public.audit_logs add column if not exists user_agent text;

-- Indexes for lightning fast searching and filtering
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action);
create index if not exists audit_logs_target_idx on public.audit_logs(target_table, target_id);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);

-- ==============================================================================
-- 3. STRICT IMMUTABILITY ENFORCEMENT (APPEND-ONLY INTEGRITY TRIGGER)
-- Ensures that NO user, admin, or script can alter or delete existing audit logs
-- ==============================================================================
create or replace function public.enforce_audit_log_immutability()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'UPDATE' then
    raise exception 'SECURITY VIOLATION: public.audit_logs is an immutable append-only compliance ledger. UPDATE operations are strictly prohibited.';
  elsif TG_OP = 'DELETE' then
    raise exception 'SECURITY VIOLATION: public.audit_logs is an immutable append-only compliance ledger. DELETE operations are strictly prohibited.';
  end if;
  return null;
end;
$$;

drop trigger if exists trg_prevent_audit_log_tampering on public.audit_logs;
create trigger trg_prevent_audit_log_tampering
  before update or delete on public.audit_logs
  for each row execute function public.enforce_audit_log_immutability();

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.audit_logs enable row level security;

drop policy if exists "Admins view audit logs" on public.audit_logs;
drop policy if exists "Authenticated insert audit logs" on public.audit_logs;
drop policy if exists "Deny update on audit logs" on public.audit_logs;
drop policy if exists "Deny delete on audit logs" on public.audit_logs;

-- Read policy: Only Super Admins, State Admins, and District Admins can inspect compliance logs
create policy "Admins view audit logs"
  on public.audit_logs for select to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin', 'district_admin')
    )
  );

-- Insert policy: Authenticated staff can write audit log entries
create policy "Authenticated insert audit logs"
  on public.audit_logs for insert to authenticated
  with check (true);

grant select on public.audit_logs to authenticated;
grant insert on public.audit_logs to authenticated, anon;

-- ==============================================================================
-- 5. CONSOLIDATED AUDIT DIRECTORY VIEW: AUDIT_LOGS_VIEW
-- Joins profiles to ensure human-readable administrator names and emails
-- ==============================================================================
create or replace view public.audit_logs_view
with (security_invoker = on)
as
select
  al.id,
  al.actor_id as actor_user_id,
  coalesce(al.actor_name, p.full_name, 'Admin Officer') as actor_name,
  p.email as actor_email,
  al.action,
  coalesce(al.entity_type, al.target_table, 'system') as entity_type,
  coalesce(al.entity_id, al.target_id, '') as entity_id,
  al.target_table,
  al.target_id,
  al.before_state,
  al.after_state,
  coalesce(al.after_state, al.changes) as changes,
  al.reason,
  al.ip_address,
  al.user_agent,
  al.created_at
from public.audit_logs al
left join public.profiles p on p.id = al.actor_id
order by al.created_at desc;

grant select on public.audit_logs_view to authenticated, anon;

-- ==============================================================================
-- 6. STORED PROCEDURE: RECORD AUDIT EVENT
-- Standardized procedure for recording compliance audit entries across all services
-- ==============================================================================
create or replace function public.log_audit_event(
  p_action text,
  p_target_table text,
  p_target_id text default null,
  p_changes jsonb default null,
  p_before_state jsonb default null,
  p_after_state jsonb default null,
  p_reason text default null,
  p_actor_name text default null,
  p_ip_address text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_log_id uuid;
  v_actor_name text := coalesce(p_actor_name, auth.jwt() ->> 'email', 'Super Admin');
begin
  insert into public.audit_logs (
    actor_id,
    actor_name,
    action,
    entity_type,
    entity_id,
    target_table,
    target_id,
    before_state,
    after_state,
    changes,
    reason,
    ip_address,
    user_agent,
    created_at
  ) values (
    auth.uid(),
    v_actor_name,
    upper(trim(p_action)),
    p_target_table,
    p_target_id,
    p_target_table,
    p_target_id,
    p_before_state,
    p_after_state,
    coalesce(p_after_state, p_changes),
    p_reason,
    p_ip_address,
    p_user_agent,
    now()
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

grant execute on function public.log_audit_event(text, text, text, jsonb, jsonb, jsonb, text, text, text, text) to authenticated, anon;

-- ==============================================================================
-- 7. SAFE SAMPLE SEEDING SCRIPT
-- Populates representative compliance audit entries if table is empty
-- ==============================================================================
do $$
declare
  v_count integer;
  v_super_id uuid;
  v_reviewer_id uuid;
  v_mosque_id uuid;
begin
  select count(*) into v_count from public.audit_logs;

  if v_count = 0 then
    select id into v_super_id from public.profiles where email ilike '%superadmin%' limit 1;
    select id into v_reviewer_id from public.profiles where email ilike '%reviewer%' limit 1;
    select id into v_mosque_id from public.mosques where name ilike '%mishkal%' limit 1;

    -- Log 1: Mosque Verification
    insert into public.audit_logs (
      actor_id, actor_name, action, entity_type, entity_id, target_table, target_id,
      before_state, after_state, changes, reason, ip_address, created_at
    ) values (
      v_super_id, 'Dr. Abdul Rahman Koya', 'MOSQUE_VERIFIED',
      'mosques', coalesce(v_mosque_id::text, 'm1'), 'mosques', coalesce(v_mosque_id::text, 'm1'),
      '{"status": "pending", "attendance_radius_m": 60}'::jsonb,
      '{"status": "verified", "attendance_radius_m": 80}'::jsonb,
      '{"name": "Mishkal Mosque", "status": "verified", "attendance_radius_m": 80}'::jsonb,
      'Verified through on-site committee visit and Mahal records confirmation',
      '103.112.214.10', now() - interval '1 day'
    );

    -- Log 2: Attendance Verification
    insert into public.audit_logs (
      actor_id, actor_name, action, entity_type, entity_id, target_table, target_id,
      before_state, after_state, changes, reason, ip_address, created_at
    ) values (
      v_reviewer_id, 'Musthafa Kamal (Attendance Reviewer)', 'ATTENDANCE_VERIFIED',
      'attendance', 'att_rev_3', 'attendance', 'att_rev_3',
      '{"status": "pending", "points": 0}'::jsonb,
      '{"status": "verified", "points": 5}'::jsonb,
      '{"user": "Aisha Siddiqa", "decision": "verified", "points_awarded": 5}'::jsonb,
      'Camera proof inside prayer hall with verified SHA-256 and genuine GPS fix',
      '117.204.18.42', now() - interval '2 days'
    );

    -- Log 3: Timetable Adjustment
    insert into public.audit_logs (
      actor_name, action, entity_type, entity_id, target_table, target_id,
      before_state, after_state, changes, reason, ip_address, created_at
    ) values (
      'Imam Rashid Moulavi (Mosque Admin)', 'UPDATE_IQAMAH_SCHEDULE',
      'prayer_schedules', 'm1', 'prayer_schedules', 'm1',
      '{"fajr_iqamah": "05:25", "version": 3}'::jsonb,
      '{"fajr_iqamah": "05:30", "version": 4}'::jsonb,
      '{"fajr_iqamah": "05:30", "version": 4}'::jsonb,
      'Seasonal winter twilight timing adjustment approved by Mahal committee',
      '103.88.24.5', now() - interval '3 days'
    );

    -- Log 4: Manual Points Adjustment
    insert into public.audit_logs (
      actor_id, actor_name, action, entity_type, entity_id, target_table, target_id,
      before_state, after_state, changes, reason, ip_address, created_at
    ) values (
      v_super_id, 'Dr. Abdul Rahman Koya', 'POINTS_ADJUSTMENT',
      'user_points', 'u_101', 'user_points', 'u_101',
      '{"total_points": 310}'::jsonb,
      '{"total_points": 320}'::jsonb,
      '{"delta": 10, "reason": "Verified manual Jummah attendance confirmation"}'::jsonb,
      'App dispute resolution for network drop during Jummah check-in',
      '103.112.214.10', now() - interval '4 days'
    );

    -- Log 5: Attendance Flagged for Spoofing
    insert into public.audit_logs (
      actor_id, actor_name, action, entity_type, entity_id, target_table, target_id,
      before_state, after_state, changes, reason, ip_address, created_at
    ) values (
      v_reviewer_id, 'Musthafa Kamal (Attendance Reviewer)', 'ATTENDANCE_FLAGGED',
      'attendance', 'att_rev_2', 'attendance', 'att_rev_2',
      '{"status": "pending"}'::jsonb,
      '{"status": "flagged"}'::jsonb,
      '{"user": "Salman Faris", "reason": "Mock location spoofing detected"}'::jsonb,
      'Android MockProvider signal active and distance exceeded configured radius',
      '117.204.18.42', now() - interval '5 days'
    );
  end if;
end;
$$;

-- ==============================================================================
-- 8. DIRECT SQL QUERY EXAMPLES FOR COMPLIANCE AUDITING
-- ==============================================================================

/*
-- [1] VIEW RECENT 50 AUDIT LOGS:
SELECT * FROM public.audit_logs_view
LIMIT 50;

-- [2] FILTER AUDIT LOGS BY SPECIFIC ENTITY (e.g. user_roles or mosques):
SELECT * FROM public.audit_logs_view
WHERE entity_type = 'user_roles';

-- [3] SEARCH AUDIT LOGS BY ADMINISTRATOR OR ACTION:
SELECT * FROM public.audit_logs_view
WHERE actor_name ILIKE '%Abdul Rahman%' OR action = 'MOSQUE_VERIFIED';

-- [4] RECORD AN AUDIT EVENT VIA STORED PROCEDURE:
SELECT public.log_audit_event(
  'SECURITY_OVERRIDE',
  'profiles',
  '<USER_UUID>',
  '{"override": "manual_badge_restoration"}'::jsonb,
  '{"badge": "silver"}'::jsonb,
  '{"badge": "gold"}'::jsonb,
  'Technical glitched streak restored per committee approval'
);
*/

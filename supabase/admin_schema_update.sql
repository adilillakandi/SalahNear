-- ============================================================================
-- SalahNear — Admin System Schema Updates & Enhancements
-- Aligned with: SalahNear_Admin_Side_Integration_Guide.md
-- ============================================================================

-- 1. EXTEND USER_ROLES TABLE WITH SCOPING & STATUS
do $$
begin
  -- Drop existing check constraint if present to allow new admin roles
  if exists (
    select 1 from pg_constraint where conname = 'user_roles_role_check'
  ) then
    alter table public.user_roles drop constraint user_roles_role_check;
  end if;
end;
$$;

alter table public.user_roles add column if not exists state text default 'Kerala';
alter table public.user_roles add column if not exists district text;
alter table public.user_roles add column if not exists is_active boolean not null default true;
alter table public.user_roles add column if not exists assigned_by uuid references public.profiles(id);
alter table public.user_roles add column if not exists updated_at timestamptz not null default now();

alter table public.user_roles add constraint user_roles_role_check check (
  role in (
    'super_admin',
    'state_admin',
    'district_admin',
    'mosque_admin',
    'attendance_reviewer',
    'support_admin',
    'reviewer',
    'user'
  )
);

create index if not exists user_roles_user_active_idx on public.user_roles(user_id, is_active);
create index if not exists user_roles_role_district_idx on public.user_roles(role, district);

-- 2. EXTEND MOSQUES TABLE FOR OSM PIPELINE & GEOFENCING
alter table public.mosques add column if not exists name_ml text;
alter table public.mosques add column if not exists entrance_latitude double precision;
alter table public.mosques add column if not exists entrance_longitude double precision;
alter table public.mosques add column if not exists qr_checkin_enabled boolean not null default true;
alter table public.mosques add column if not exists verification_notes text;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'mosques_verification_status_check'
  ) then
    alter table public.mosques drop constraint mosques_verification_status_check;
  end if;
end;
$$;

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

-- 3. EXTEND PRAYER SCHEDULES FOR IQAMAH TIMETABLES & VERSIONING
alter table public.prayer_schedules add column if not exists effective_from date default current_date;
alter table public.prayer_schedules add column if not exists effective_until date;
alter table public.prayer_schedules add column if not exists jummah_iqamah time;
alter table public.prayer_schedules add column if not exists change_reason text;
alter table public.prayer_schedules add column if not exists updated_by uuid references public.profiles(id);
alter table public.prayer_schedules add column if not exists updated_at timestamptz not null default now();

-- 4. EXTEND AUDIT LOGS FOR COMPLETE REASONING & BEFORE/AFTER STATE
alter table public.audit_logs add column if not exists actor_name text;
alter table public.audit_logs add column if not exists entity_type text;
alter table public.audit_logs add column if not exists entity_id text;
alter table public.audit_logs add column if not exists before_state jsonb;
alter table public.audit_logs add column if not exists after_state jsonb;
alter table public.audit_logs add column if not exists reason text;
alter table public.audit_logs add column if not exists user_agent text;

create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

-- 5. NEW TABLE: ANNOUNCEMENTS (PLATFORM, STATE, DISTRICT, MOSQUE)
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  language text not null default 'en' check (language in ('en', 'ml', 'both')),
  scope_type text not null check (scope_type in ('platform', 'state', 'district', 'mosque')),
  scope_target text, -- 'Kerala', 'Kozhikode', or Mosque UUID (null for platform)
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz default now(),
  expires_at timestamptz,
  send_push boolean not null default false,
  author_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_scope_idx on public.announcements(scope_type, scope_target, status);
create index if not exists announcements_published_idx on public.announcements(published_at desc);

-- 6. NEW TABLE: MOSQUE EVENTS
create table if not exists public.mosque_events (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  title text not null,
  description text,
  event_date timestamptz not null,
  venue text,
  image_url text,
  status text not null default 'published' check (status in ('draft', 'published', 'cancelled', 'completed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mosque_events_mosque_idx on public.mosque_events(mosque_id, event_date);
create index if not exists mosque_events_status_idx on public.mosque_events(status);

-- 7. NEW TABLE: SUPPORT CASES & DISPUTES
create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  category text not null check (
    category in (
      'account_recovery',
      'attendance_dispute',
      'mosque_correction',
      'mock_location',
      'points_dispute',
      'friend_dispute',
      'general'
    )
  ),
  title text not null,
  description text not null,
  status text not null default 'open' check (
    status in ('open', 'in_progress', 'waiting_for_user', 'resolved', 'closed')
  ),
  assigned_to uuid references public.profiles(id),
  internal_notes text,
  resolution_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_cases_user_idx on public.support_cases(user_id);
create index if not exists support_cases_status_idx on public.support_cases(status, category);

-- 8. HELPER SECURITY FUNCTION: GET ADMIN SCOPE
create or replace function public.get_admin_scope(p_user_id uuid)
returns jsonb
language plpgsql
security definer
stable
as $$
declare
  v_role record;
  v_mosques uuid[];
begin
  select role, state, district, is_active into v_role
  from public.user_roles
  where user_id = p_user_id and is_active = true
  order by case
    when role = 'super_admin' then 1
    when role = 'state_admin' then 2
    when role = 'district_admin' then 3
    when role = 'mosque_admin' then 4
    when role in ('attendance_reviewer', 'reviewer') then 5
    when role = 'support_admin' then 6
    else 7
  end
  limit 1;

  if not found then
    return jsonb_build_object('is_admin', false, 'role', 'user');
  end if;

  select coalesce(array_agg(mosque_id), '{}'::uuid[]) into v_mosques
  from public.mosque_admins
  where user_id = p_user_id;

  return jsonb_build_object(
    'is_admin', true,
    'role', v_role.role,
    'state', v_role.state,
    'district', v_role.district,
    'assigned_mosques', v_mosques,
    'is_active', v_role.is_active
  );
end;
$$;

-- 9. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
alter table public.announcements enable row level security;
alter table public.mosque_events enable row level security;
alter table public.support_cases enable row level security;

-- Drop prior policies if present
drop policy if exists "Published announcements readable by everyone" on public.announcements;
drop policy if exists "Admins manage announcements" on public.announcements;
drop policy if exists "Public can view mosque events" on public.mosque_events;
drop policy if exists "Admins manage mosque events" on public.mosque_events;
drop policy if exists "Users view own support cases" on public.support_cases;
drop policy if exists "Users create own support cases" on public.support_cases;
drop policy if exists "Admins manage support cases" on public.support_cases;

-- Announcements policies
create policy "Published announcements readable by everyone"
  on public.announcements for select to anon, authenticated
  using (status = 'published');

create policy "Admins manage announcements"
  on public.announcements for all to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and is_active = true
        and role in ('super_admin', 'state_admin', 'district_admin', 'mosque_admin')
    )
  );

-- Mosque Events policies
create policy "Public can view mosque events"
  on public.mosque_events for select to anon, authenticated
  using (status in ('published', 'completed'));

create policy "Admins manage mosque events"
  on public.mosque_events for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and (
          ur.role = 'super_admin' or
          exists (
            select 1 from public.mosque_admins ma
            where ma.user_id = auth.uid() and ma.mosque_id = mosque_events.mosque_id
          )
        )
    )
  );

-- Support Cases policies
create policy "Users view own support cases"
  on public.support_cases for select to authenticated
  using (auth.uid() = user_id);

create policy "Users create own support cases"
  on public.support_cases for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Admins manage support cases"
  on public.support_cases for all to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and is_active = true
        and role in ('super_admin', 'support_admin')
    )
  );

-- Schema Grants
grant all on public.announcements to anon, authenticated, service_role;
grant all on public.mosque_events to anon, authenticated, service_role;
grant all on public.support_cases to anon, authenticated, service_role;


-- ==============================================================================
-- SALAHNEAR: ADMINISTRATOR & ROLE MANAGEMENT COMPLETE SCHEMA
-- Covers all elements, views, stored procedures, RLS policies, and actions
-- for the "Administrator & Role Management" console (/administrators)
-- PostgreSQL 15+ / Supabase Compatible
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- ==============================================================================
-- 2. SCHEMA DEFINITION & SAFE COLUMN EXTENSIONS
-- ==============================================================================

-- Ensure public.profiles columns exist
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists state text not null default 'Kerala';
alter table public.profiles add column if not exists district text;
alter table public.profiles add column if not exists home_mosque_id uuid references public.mosques(id) on delete set null;
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Ensure public.user_roles table & columns exist
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  state text not null default 'Kerala',
  district text,
  is_active boolean not null default true,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, role)
);

alter table public.user_roles add column if not exists state text not null default 'Kerala';
alter table public.user_roles add column if not exists district text;
alter table public.user_roles add column if not exists is_active boolean not null default true;
alter table public.user_roles add column if not exists assigned_by uuid references public.profiles(id) on delete set null;
alter table public.user_roles add column if not exists updated_at timestamptz not null default now();

-- Role check constraint
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'user_roles_role_check') then
    alter table public.user_roles drop constraint user_roles_role_check;
  end if;
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
end;
$$;

create index if not exists user_roles_user_active_idx on public.user_roles(user_id, is_active);
create index if not exists user_roles_role_district_idx on public.user_roles(role, district);

-- Ensure public.mosque_admins table exists (for Mosque Admins venue scoping)
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

-- Ensure public.audit_logs table exists
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,
  target_table text not null,
  target_id text,
  changes jsonb,
  ip_address text,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs add column if not exists actor_name text;
alter table public.audit_logs add column if not exists reason text;

create index if not exists audit_logs_target_idx on public.audit_logs(target_table, target_id);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.user_roles enable row level security;
alter table public.mosque_admins enable row level security;
alter table public.audit_logs enable row level security;

-- user_roles policies
drop policy if exists "Users read own role" on public.user_roles;
drop policy if exists "Admins view all roles" on public.user_roles;
drop policy if exists "Super admin manages user roles" on public.user_roles;

create policy "Users read own role"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

create policy "Admins view all roles"
  on public.user_roles for select to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin', 'district_admin')
    )
  );

create policy "Super admin manages user roles"
  on public.user_roles for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin')
    )
  );

-- mosque_admins policies
drop policy if exists "Public view mosque admins" on public.mosque_admins;
drop policy if exists "Super admins manage mosque admins" on public.mosque_admins;

create policy "Public view mosque admins"
  on public.mosque_admins for select to authenticated
  using (true);

create policy "Super admins manage mosque admins"
  on public.mosque_admins for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin')
    )
  );

-- audit_logs policies
drop policy if exists "Admins view audit logs" on public.audit_logs;
drop policy if exists "Super admins insert audit logs" on public.audit_logs;

create policy "Admins view audit logs"
  on public.audit_logs for select to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin')
    )
  );

create policy "Super admins insert audit logs"
  on public.audit_logs for insert to authenticated
  with check (true);

grant select on public.user_roles to authenticated, anon;
grant select on public.mosque_admins to authenticated, anon;
grant select on public.audit_logs to authenticated;

-- ==============================================================================
-- 4. DIRECTORY QUERY PROCEDURE: GET_ADMIN_DIRECTORY
-- Returns consolidated administrative directory with auth email and scopes
-- ==============================================================================
create or replace function public.get_admin_directory()
returns table (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  role text,
  state text,
  district text,
  is_active boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  assigned_mosque_id uuid,
  assigned_mosque_name text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return query
  select
    ur.id,
    ur.user_id,
    coalesce(u.email, p.email, 'admin@salahnear.org')::text as email,
    coalesce(p.full_name, 'Administrative Officer')::text as full_name,
    ur.role::text,
    ur.state::text,
    ur.district::text,
    ur.is_active,
    ur.created_at,
    u.last_sign_in_at,
    ma.mosque_id as assigned_mosque_id,
    m.name::text as assigned_mosque_name
  from public.user_roles ur
  left join auth.users u on u.id = ur.user_id
  left join public.profiles p on p.id = ur.user_id
  left join public.mosque_admins ma on ma.user_id = ur.user_id
  left join public.mosques m on m.id = ma.mosque_id
  where ur.role in ('super_admin', 'state_admin', 'district_admin', 'mosque_admin', 'attendance_reviewer', 'support_admin', 'reviewer')
  order by ur.created_at desc;
end;
$$;

grant execute on function public.get_admin_directory() to authenticated, anon;

-- ==============================================================================
-- 5. ATOMIC STORED PROCEDURE: PROVISION NEW ADMINISTRATOR
-- Provisions auth.users credentials, profiles row, user_roles row,
-- mosque_admins assignment, and audit log in a single atomic transaction.
-- ==============================================================================
create or replace function public.provision_administrator(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_district text default null,
  p_mosque_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_encrypted_pw text;
  v_actor_name text := coalesce(auth.jwt() ->> 'email', 'Super Admin');
  v_user_meta jsonb;
begin
  -- Validate Role
  if p_role not in ('super_admin', 'state_admin', 'district_admin', 'mosque_admin', 'attendance_reviewer', 'support_admin') then
    raise exception 'Invalid admin role: %. Allowed: super_admin, state_admin, district_admin, mosque_admin, attendance_reviewer, support_admin', p_role;
  end if;

  if p_email is null or trim(p_email) = '' then
    raise exception 'Email address is required.';
  end if;

  if p_password is null or length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;

  if p_full_name is null or trim(p_full_name) = '' then
    raise exception 'Full name is required.';
  end if;

  -- 1. Encrypt password using Blowfish salt
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
  v_user_meta := jsonb_build_object('full_name', trim(p_full_name));

  -- 2. Lookup or create auth.users entry
  select id into v_user_id from auth.users where email = lower(trim(p_email));

  if v_user_id is not null then
    -- User exists: update password & set email confirmed
    update auth.users
    set
      encrypted_password = v_encrypted_pw,
      raw_user_meta_data = v_user_meta,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
    where id = v_user_id;
  else
    -- Create new user in auth.users
    v_user_id := gen_random_uuid();

    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      lower(trim(p_email)),
      v_encrypted_pw,
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      v_user_meta,
      'authenticated',
      'authenticated',
      now(),
      now()
    );
  end if;

  -- 3. Upsert profile in public.profiles
  insert into public.profiles (
    id,
    full_name,
    email,
    username,
    state,
    district,
    home_mosque_id,
    account_status
  ) values (
    v_user_id,
    trim(p_full_name),
    lower(trim(p_email)),
    split_part(lower(trim(p_email)), '@', 1),
    'Kerala',
    p_district,
    p_mosque_id,
    'active'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    district = coalesce(excluded.district, profiles.district),
    home_mosque_id = coalesce(excluded.home_mosque_id, profiles.home_mosque_id),
    account_status = 'active',
    updated_at = now();

  -- 4. Upsert role in public.user_roles
  insert into public.user_roles (
    user_id,
    role,
    state,
    district,
    is_active,
    assigned_by
  ) values (
    v_user_id,
    p_role,
    'Kerala',
    p_district,
    true,
    auth.uid()
  )
  on conflict (user_id, role) do update set
    district = excluded.district,
    is_active = true,
    updated_at = now();

  -- 5. If role is mosque_admin, assign to public.mosque_admins
  if p_role = 'mosque_admin' and p_mosque_id is not null then
    insert into public.mosque_admins (
      mosque_id,
      user_id,
      assigned_by
    ) values (
      p_mosque_id,
      v_user_id,
      auth.uid()
    )
    on conflict (mosque_id, user_id) do nothing;
  end if;

  -- 6. Record Audit Log
  insert into public.audit_logs (
    actor_id,
    actor_name,
    action,
    target_table,
    target_id,
    changes
  ) values (
    auth.uid(),
    v_actor_name,
    'ADMIN_ACCOUNT_PROVISIONED',
    'user_roles',
    v_user_id::text,
    jsonb_build_object(
      'user_id', v_user_id,
      'email', lower(trim(p_email)),
      'full_name', trim(p_full_name),
      'role', p_role,
      'district', p_district,
      'mosque_id', p_mosque_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', lower(trim(p_email)),
    'full_name', trim(p_full_name),
    'role', p_role,
    'district', p_district,
    'mosque_id', p_mosque_id
  );
end;
$$;

-- Alias for backwards compatibility with previous caller references
create or replace function public.create_admin_account(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_district text default null,
  p_mosque_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
begin
  return public.provision_administrator(
    p_email,
    p_password,
    p_full_name,
    p_role,
    p_district,
    p_mosque_id
  );
end;
$$;

grant execute on function public.provision_administrator(text, text, text, text, text, uuid) to authenticated, anon;
grant execute on function public.create_admin_account(text, text, text, text, text, uuid) to authenticated, anon;

-- ==============================================================================
-- 6. ATOMIC STORED PROCEDURE: SUSPEND / REACTIVATE ADMINISTRATOR STATUS
-- ==============================================================================
create or replace function public.toggle_admin_status(
  p_user_role_id uuid,
  p_is_active boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_role text;
  v_email text;
  v_name text;
begin
  select
    ur.user_id,
    ur.role,
    coalesce(p.full_name, 'Administrative Officer'),
    coalesce(u.email, p.email, 'admin@salahnear.org')
  into v_user_id, v_role, v_name, v_email
  from public.user_roles ur
  left join public.profiles p on p.id = ur.user_id
  left join auth.users u on u.id = ur.user_id
  where ur.id = p_user_role_id;

  if not found then
    raise exception 'Administrative record with ID % not found', p_user_role_id;
  end if;

  update public.user_roles
  set
    is_active = p_is_active,
    updated_at = now()
  where id = p_user_role_id;

  -- Record audit log
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
    'Super Admin',
    case when p_is_active then 'ADMIN_ACTIVATED' else 'ADMIN_SUSPENDED' end,
    'user_roles',
    p_user_role_id::text,
    p_reason,
    jsonb_build_object(
      'user_id', v_user_id,
      'full_name', v_name,
      'email', v_email,
      'role', v_role,
      'is_active', p_is_active,
      'reason', p_reason
    )
  );

  return jsonb_build_object(
    'success', true,
    'role_id', p_user_role_id,
    'user_id', v_user_id,
    'is_active', p_is_active,
    'role', v_role
  );
end;
$$;

grant execute on function public.toggle_admin_status(uuid, boolean, text) to authenticated, anon;

-- ==============================================================================
-- 7. ATOMIC STORED PROCEDURE: REVOKE ADMINISTRATOR ROLE
-- ==============================================================================
create or replace function public.revoke_admin_role(
  p_user_role_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_role text;
  v_email text;
  v_name text;
begin
  select
    ur.user_id,
    ur.role,
    coalesce(p.full_name, 'Administrative Officer'),
    coalesce(u.email, p.email, 'admin@salahnear.org')
  into v_user_id, v_role, v_name, v_email
  from public.user_roles ur
  left join public.profiles p on p.id = ur.user_id
  left join auth.users u on u.id = ur.user_id
  where ur.id = p_user_role_id;

  if not found then
    raise exception 'Administrative record with ID % not found', p_user_role_id;
  end if;

  -- Delete from user_roles
  delete from public.user_roles where id = p_user_role_id;

  -- Also delete from mosque_admins if mosque_admin
  if v_role = 'mosque_admin' then
    delete from public.mosque_admins where user_id = v_user_id;
  end if;

  -- Record audit log
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
    'Super Admin',
    'ADMIN_ROLE_REVOKED',
    'user_roles',
    p_user_role_id::text,
    p_reason,
    jsonb_build_object(
      'user_id', v_user_id,
      'full_name', v_name,
      'email', v_email,
      'role', v_role,
      'reason', p_reason
    )
  );

  return jsonb_build_object('success', true, 'role_id', p_user_role_id);
end;
$$;

grant execute on function public.revoke_admin_role(uuid, text) to authenticated, anon;

-- ==============================================================================
-- 8. SEEDING / BOOTSTRAP INITIAL STAFF ACCOUNTS (SAFE IDEMPOTENT BLOCK)
-- Sets up default platform staff if not already present
-- ==============================================================================
do $$
declare
  v_super_admin_id uuid;
  v_district_admin_id uuid;
  v_reviewer_id uuid;
  v_mosque_id uuid;
begin
  -- Fetch existing mosque (e.g. Mishkal Mosque) or fallback
  select id into v_mosque_id from public.mosques where name ilike '%mishkal%' limit 1;

  -- Provision Super Admin
  perform public.provision_administrator(
    'superadmin@salahnear.org',
    'SuperAdmin#2026',
    'Dr. Abdul Rahman Koya',
    'super_admin',
    null,
    null
  );

  -- Provision Kozhikode District Admin
  perform public.provision_administrator(
    'district.calicut@salahnear.org',
    'CalicutAdmin#2026',
    'Zuhair Ahmed',
    'district_admin',
    'Kozhikode',
    null
  );

  -- Provision Attendance Reviewer
  perform public.provision_administrator(
    'reviewer.kamal@salahnear.org',
    'ReviewerKamal#2026',
    'Musthafa Kamal',
    'attendance_reviewer',
    null,
    null
  );

  -- Provision Support Admin
  perform public.provision_administrator(
    'support.fathima@salahnear.org',
    'SupportFathima#2026',
    'Fathima Beegum',
    'support_admin',
    null,
    null
  );

  -- Provision Mosque Admin (if mosque found)
  if v_mosque_id is not null then
    perform public.provision_administrator(
      'imam@mishkalmosque.org',
      'MishkalAdmin#2026',
      'Imam Rashid Moulavi',
      'mosque_admin',
      'Kozhikode',
      v_mosque_id
    );
  end if;
end;
$$;

-- ==============================================================================
-- 9. DIRECT SQL QUERY EXAMPLES FOR EVERY PAGE ELEMENT & ACTION
-- ==============================================================================

/*
-- [ELEMENT 1: ADMIN DIRECTORY LISTING]
-- Returns all administrators with role, authorized scope, status, and last activity
SELECT * FROM public.get_admin_directory();

-- [ELEMENT 2: FILTER BY ROLE]
SELECT * FROM public.get_admin_directory()
WHERE role = 'district_admin';

-- [ELEMENT 3: SEARCH BY NAME, EMAIL, OR DISTRICT]
SELECT * FROM public.get_admin_directory()
WHERE full_name ILIKE '%zuhair%'
   OR email ILIKE '%zuhair%'
   OR district ILIKE '%kozhikode%';

-- [ACTION 1: PROVISION NEW ADMINISTRATOR DIRECTLY (WITH EMAIL & PASSWORD)]
SELECT public.provision_administrator(
  'district.malappuram@salahnear.org',
  'MlpAdmin#2026',
  'Ibrahim Kutty',
  'district_admin',
  'Malappuram'
);

-- [ACTION 2: PROVISION MOSQUE ADMIN FOR SPECIFIC MOSQUE]
SELECT public.provision_administrator(
  'imam.palayam@salahnear.org',
  'Palayam#2026',
  'Usthad Suhaib',
  'mosque_admin',
  'Thiruvananthapuram',
  (SELECT id FROM public.mosques WHERE name ILIKE '%Palayam%' LIMIT 1)
);

-- [ACTION 3: SUSPEND AN ADMINISTRATOR]
SELECT public.toggle_admin_status(
  '<USER_ROLE_UUID>'::uuid,
  false,
  'Routine administrative rotation'
);

-- [ACTION 4: REACTIVATE AN ADMINISTRATOR]
SELECT public.toggle_admin_status(
  '<USER_ROLE_UUID>'::uuid,
  true,
  'Reactivation after clearance'
);

-- [ACTION 5: REVOKE ADMINISTRATOR ROLE]
SELECT public.revoke_admin_role(
  '<USER_ROLE_UUID>'::uuid,
  'Staff departed organisation'
);
*/

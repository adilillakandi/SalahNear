-- ==============================================================================
-- SALAHNEAR: ADMINISTRATOR PROVISIONING & ROLE ASSIGNMENT SCHEMA
-- Functions, Stored Procedures, RLS, and Direct SQL for Super Admins
-- Compatible with PostgreSQL 15+ / Supabase
-- ==============================================================================

-- 1. ENSURE EXTENSIONS ARE PRESENT
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- 2. USER ROLES TABLE & EXTENSIONS
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  state text not null default 'Kerala',
  district text,
  is_active boolean not null default true,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, role)
);

alter table public.user_roles add column if not exists state text not null default 'Kerala';
alter table public.user_roles add column if not exists district text;
alter table public.user_roles add column if not exists is_active boolean not null default true;
alter table public.user_roles add column if not exists assigned_by uuid references public.profiles(id);
alter table public.user_roles add column if not exists updated_at timestamptz not null default now();

-- Update check constraint safely
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

-- 3. MOSQUE ADMINS TABLE (FOR MOSQUE-LEVEL ROLE ASSIGNMENTS)
create table if not exists public.mosque_admins (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(mosque_id, user_id)
);

create index if not exists mosque_admins_mosque_idx on public.mosque_admins(mosque_id);
create index if not exists mosque_admins_user_idx on public.mosque_admins(user_id);

-- 4. ROW LEVEL SECURITY (RLS)
alter table public.user_roles enable row level security;
alter table public.mosque_admins enable row level security;

drop policy if exists "Users read own role" on public.user_roles;
drop policy if exists "Admins view all roles" on public.user_roles;
drop policy if exists "Super admin manages user roles" on public.user_roles;

-- Policy: Users can view their own role
create policy "Users read own role"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

-- Policy: Administrators can view all roles
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

-- Policy: Super Admins can manage (insert, update, delete) roles
create policy "Super admin manages user roles"
  on public.user_roles for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role = 'super_admin'
    )
  );

-- Mosque Admins policies
drop policy if exists "Public can view mosque admins" on public.mosque_admins;
drop policy if exists "Super admins manage mosque admins" on public.mosque_admins;

create policy "Public can view mosque admins"
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

grant select on public.user_roles to authenticated;
grant select on public.mosque_admins to authenticated;

-- ==============================================================================
-- 5. STORED PROCEDURE: CREATE ADMIN USER DIRECTLY WITH EMAIL & PASSWORD
-- ==============================================================================
create or replace function public.create_admin_account(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_district text default null,
  p_mosque_id uuid default null
)
returns jsonb as $$
declare
  v_user_id uuid;
  v_encrypted_pw text;
  v_actor text := coalesce(auth.jwt() ->> 'email', 'Super Admin');
  v_user_meta jsonb;
begin
  -- Validate Role
  if p_role not in ('super_admin', 'state_admin', 'district_admin', 'mosque_admin', 'attendance_reviewer', 'support_admin') then
    raise exception 'Invalid admin role: %. Allowed: super_admin, state_admin, district_admin, mosque_admin, attendance_reviewer, support_admin', p_role;
  end if;

  if p_email is null or trim(p_email) = '' then
    raise exception 'Email address is required';
  end if;

  if p_password is null or length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  -- 1. Encrypt password using Blowfish crypt
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
  v_user_meta := jsonb_build_object('full_name', p_full_name);

  -- 2. Check if user already exists in auth.users
  select id into v_user_id from auth.users where email = lower(trim(p_email));

  if v_user_id is not null then
    -- User already exists: update password & confirmation
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

  -- 3. Ensure profile exists in public.profiles
  insert into public.profiles (
    id,
    full_name,
    username,
    state,
    district,
    home_mosque_id,
    account_status
  ) values (
    v_user_id,
    p_full_name,
    split_part(p_email, '@', 1),
    'Kerala',
    p_district,
    p_mosque_id,
    'active'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    district = coalesce(excluded.district, profiles.district),
    home_mosque_id = coalesce(excluded.home_mosque_id, profiles.home_mosque_id),
    account_status = 'active',
    updated_at = now();

  -- 4. Upsert admin role into public.user_roles
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

  -- 5. If mosque_admin and mosque_id provided, assign in public.mosque_admins
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
    actor_name,
    action,
    target_table,
    target_id,
    changes
  ) values (
    v_actor,
    'ADMIN_ACCOUNT_PROVISIONED',
    'user_roles',
    v_user_id::text,
    jsonb_build_object(
      'user_id', v_user_id,
      'email', lower(trim(p_email)),
      'full_name', p_full_name,
      'role', p_role,
      'district', p_district,
      'mosque_id', p_mosque_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', lower(trim(p_email)),
    'full_name', p_full_name,
    'role', p_role,
    'district', p_district,
    'mosque_id', p_mosque_id
  );
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 6. STORED PROCEDURE: PROMOTE EXISTING USER TO ADMIN ROLE
-- ==============================================================================
create or replace function public.assign_admin_role(
  p_user_id uuid,
  p_role text,
  p_district text default null,
  p_mosque_id uuid default null
)
returns jsonb as $$
declare
  v_user_name text;
begin
  select full_name into v_user_name from public.profiles where id = p_user_id;
  if not found then
    raise exception 'User with ID % does not exist', p_user_id;
  end if;

  insert into public.user_roles (
    user_id,
    role,
    state,
    district,
    is_active,
    assigned_by
  ) values (
    p_user_id,
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

  if p_role = 'mosque_admin' and p_mosque_id is not null then
    insert into public.mosque_admins (mosque_id, user_id, assigned_by)
    values (p_mosque_id, p_user_id, auth.uid())
    on conflict (mosque_id, user_id) do nothing;
  end if;

  return jsonb_build_object('success', true, 'user_id', p_user_id, 'role', p_role);
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 7. DIRECT SQL QUERY EXAMPLES (CAN BE RUN DIRECTLY IN SUPABASE SQL EDITOR)
-- ==============================================================================

/*
-- [1] CREATE A MOSQUE ADMINISTRATOR (WITH EMAIL & PASSWORD):
SELECT public.create_admin_account(
  'imam.mishkal@salahnear.org',
  'MishkalSecure#2026',
  'Imam Rashid Moulavi',
  'mosque_admin',
  'Kozhikode',
  'a1111111-1111-1111-1111-111111111111'
);

-- [2] CREATE A DISTRICT ADMINISTRATOR:
SELECT public.create_admin_account(
  'district.calicut@salahnear.org',
  'CalicutAdmin#2026',
  'Zuhair Ahmed',
  'district_admin',
  'Kozhikode'
);

-- [3] CREATE AN ATTENDANCE REVIEWER:
SELECT public.create_admin_account(
  'reviewer.kamal@salahnear.org',
  'ReviewerKamal#2026',
  'Musthafa Kamal',
  'attendance_reviewer'
);

-- [4] CREATE A SUPPORT ADMINISTRATOR:
SELECT public.create_admin_account(
  'support.fathima@salahnear.org',
  'SupportFathima#2026',
  'Fathima Beegum',
  'support_admin'
);

-- [5] LIST ALL ACTIVE ADMINISTRATORS & ASSIGNED MOSQUES:
SELECT
  ur.id AS role_id,
  ur.user_id,
  p.full_name,
  u.email,
  ur.role,
  ur.district,
  ur.is_active,
  m.name AS assigned_mosque_name,
  ur.created_at
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.mosque_admins ma ON ma.user_id = ur.user_id
LEFT JOIN public.mosques m ON m.id = ma.mosque_id
WHERE ur.role != 'user'
ORDER BY ur.created_at DESC;

-- [6] DEACTIVATE / SUSPEND AN ADMINISTRATOR:
UPDATE public.user_roles
SET is_active = false, updated_at = now()
WHERE user_id = '<USER_UUID>' AND role = 'district_admin';

-- [7] REACTIVATE AN ADMINISTRATOR:
UPDATE public.user_roles
SET is_active = true, updated_at = now()
WHERE user_id = '<USER_UUID>';
*/


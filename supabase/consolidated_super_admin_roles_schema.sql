-- ==============================================================================
-- SALAHNEAR PLATFORM: CONSOLIDATED SUPER ADMIN & MOSQUE ADMIN ARCHITECTURE
-- ==============================================================================
-- Description:
-- Consolidates administrative responsibilities into two distinct roles:
-- 1. super_admin: Full statewide management across all 14 Kerala districts,
--    including mosque directory verification, attendance proofs review, user
--    moderation, support cases & disputes arbitration, and immutable audit logs.
-- 2. mosque_admin: Individual venue administrator scoped strictly to their assigned
--    mosque venue (prayer timetables, live dynamic QR check-in kiosk, venue notices).
--
-- Obsolete subordinate roles (district_admin, attendance_reviewer, support_admin,
-- state_admin, reviewer) are migrated directly into super_admin.
-- ==============================================================================

-- 1. MIGRATE EXISTING OBSOLETE ROLES TO SUPER_ADMIN
update public.user_roles
set role = 'super_admin'
where role in ('district_admin', 'attendance_reviewer', 'support_admin', 'state_admin', 'reviewer');

-- 2. UPDATE ROLE CHECK CONSTRAINT
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'user_roles_role_check') then
    alter table public.user_roles drop constraint user_roles_role_check;
  end if;

  alter table public.user_roles add constraint user_roles_role_check check (
    role in (
      'super_admin',
      'mosque_admin',
      'user'
    )
  );
end;
$$;

-- 3. UPDATE GET_ADMIN_DIRECTORY PROCEDURE
drop function if exists public.get_admin_directory();

create or replace function public.get_admin_directory()
returns table (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  role text,
  district text,
  assigned_mosque_id uuid,
  assigned_mosque_name text,
  is_active boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  return query
  select
    ur.id,
    ur.user_id,
    coalesce(u.email, p.email, 'admin@salahnear.org')::text as email,
    coalesce(p.full_name, split_part(u.email, '@', 1), 'Platform Administrator')::text as full_name,
    ur.role::text,
    ur.district::text,
    ma.mosque_id as assigned_mosque_id,
    m.name::text as assigned_mosque_name,
    ur.is_active,
    ur.created_at,
    u.last_sign_in_at
  from public.user_roles ur
  left join auth.users u on u.id = ur.user_id
  left join public.profiles p on p.id = ur.user_id
  left join public.mosque_admins ma on ma.user_id = ur.user_id
  left join public.mosques m on m.id = ma.mosque_id
  where ur.role in ('super_admin', 'mosque_admin')
  order by ur.created_at desc;
end;
$$;

grant execute on function public.get_admin_directory() to authenticated, anon;

-- 4. UPDATE PROVISION_ADMINISTRATOR PROCEDURE
drop function if exists public.provision_administrator(text, text, text, text, text, uuid);
drop function if exists public.provision_administrator;

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
  -- Validate Role: Only super_admin and mosque_admin are permitted
  if p_role not in ('super_admin', 'mosque_admin') then
    raise exception 'Invalid admin role: %. Allowed roles are: super_admin, mosque_admin', p_role;
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
    -- User exists: update password & ensure email confirmed
    update auth.users
    set
      encrypted_password = v_encrypted_pw,
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || v_user_meta,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
    where id = v_user_id;
  else
    -- User does not exist: insert into auth.users
    v_user_id := gen_random_uuid();
    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      lower(trim(p_email)),
      v_encrypted_pw,
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      v_user_meta,
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  end if;

  -- 3. Upsert into public.profiles
  insert into public.profiles (
    id,
    email,
    full_name,
    state,
    home_mosque_id,
    updated_at
  ) values (
    v_user_id,
    lower(trim(p_email)),
    trim(p_full_name),
    'Kerala',
    p_mosque_id,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    home_mosque_id = coalesce(excluded.home_mosque_id, public.profiles.home_mosque_id),
    updated_at = now();

  -- 4. Upsert into public.user_roles
  insert into public.user_roles (
    user_id,
    role,
    state,
    district,
    is_active,
    updated_at
  ) values (
    v_user_id,
    p_role,
    'Kerala',
    null,
    true,
    now()
  )
  on conflict (user_id, role) do update set
    is_active = true,
    updated_at = now();

  -- 5. If mosque_admin, record venue assignment in public.mosque_admins
  if p_role = 'mosque_admin' and p_mosque_id is not null then
    insert into public.mosque_admins (
      mosque_id,
      user_id
    ) values (
      p_mosque_id,
      v_user_id
    )
    on conflict (mosque_id, user_id) do nothing;
  end if;

  -- 6. Log audit event
  insert into public.audit_logs (
    actor_id,
    actor_name,
    action,
    target_table,
    target_id,
    changes,
    created_at
  ) values (
    auth.uid(),
    v_actor_name,
    'ADMIN_PROVISIONED',
    'user_roles',
    v_user_id::text,
    jsonb_build_object(
      'email', lower(trim(p_email)),
      'full_name', trim(p_full_name),
      'role', p_role,
      'mosque_id', p_mosque_id
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', lower(trim(p_email)),
    'role', p_role,
    'message', 'Administrator account provisioned successfully.'
  );
end;
$$;

grant execute on function public.provision_administrator(text, text, text, text, text, uuid) to authenticated, anon;

-- 5. COMPATIBILITY ALIAS: CREATE_ADMIN_ACCOUNT
drop function if exists public.create_admin_account(text, text, text, text, text, uuid);
drop function if exists public.create_admin_account;

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
set search_path = public, auth, extensions
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

grant execute on function public.create_admin_account(text, text, text, text, text, uuid) to authenticated, anon;

-- 6. PROVISION REAL SUPER ADMIN (ADIL KT) & DECOMMISSION MOCK ACCOUNTS
do $$
declare
  v_koya_id uuid;
  v_moulavi_id uuid;
begin
  -- 1. Provision Official Super Admin: Adil KT
  perform public.provision_administrator(
    'adhilktillakandi@gmail.com',
    'adilSalaNear66',
    'Adil KT',
    'super_admin',
    null,
    null
  );

  -- 2. Decommission placeholder Super Admin (Dr. Abdul Rahman Koya)
  select id into v_koya_id from auth.users where email in ('superadmin@salahnear.org', 'superadmin@salahnear.com');
  if v_koya_id is not null then
    delete from public.mosque_admins where user_id = v_koya_id;
    delete from public.user_roles where user_id = v_koya_id;
    delete from public.profiles where id = v_koya_id;
    delete from auth.users where id = v_koya_id;
  end if;

  -- 3. Decommission placeholder Mosque Admin (Imam Rashid Moulavi)
  select id into v_moulavi_id from auth.users where email in ('imam@mishkalmosque.org', 'mosque_admin@salahnear.org');
  if v_moulavi_id is not null then
    delete from public.mosque_admins where user_id = v_moulavi_id;
    delete from public.user_roles where user_id = v_moulavi_id;
    delete from public.profiles where id = v_moulavi_id;
    delete from auth.users where id = v_moulavi_id;
  end if;
end;
$$;


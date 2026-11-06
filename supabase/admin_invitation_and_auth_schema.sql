-- ==============================================================================
-- SALAHNEAR PLATFORM: ADMIN INVITATIONS, ACCEPTANCE & AUTHENTICATION SCHEMA
-- ==============================================================================
-- Features:
-- 1. admin_invitations table: Tracks pending, accepted, and expired invitations.
-- 2. create_admin_invitation: Provisions an admin in a pending state with a secure token.
-- 3. get_invitation_details: Validates token and returns invite details for the acceptance page.
-- 4. accept_admin_invitation: Activates the admin account upon invitation acceptance.
-- 5. verify_admin_credentials: Securely authenticates Super Admins and Mosque Admins.
-- 6. Updated get_admin_directory: Surfaces invitation status for all staff members.
-- ==============================================================================

-- 1. CREATE ADMIN_INVITATIONS TABLE
create table if not exists public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  role text not null check (role in ('super_admin', 'mosque_admin')),
  mosque_id uuid references public.mosques(id) on delete set null,
  token text unique not null,
  password_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by text default 'Super Admin',
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days'),
  accepted_at timestamptz
);

-- Indexes for lightning fast lookups
create index if not exists idx_admin_invitations_token on public.admin_invitations(token);
create index if not exists idx_admin_invitations_email on public.admin_invitations(lower(trim(email)));
create index if not exists idx_admin_invitations_status on public.admin_invitations(status);

-- Enable RLS and define permissive security definer access
alter table public.admin_invitations enable row level security;

drop policy if exists "Allow anon read invitations by token" on public.admin_invitations;
create policy "Allow anon read invitations by token"
  on public.admin_invitations
  for select
  using (true);

drop policy if exists "Allow authenticated and service role manage invitations" on public.admin_invitations;
create policy "Allow authenticated and service role manage invitations"
  on public.admin_invitations
  for all
  using (true)
  with check (true);

grant all on table public.admin_invitations to postgres, authenticated, anon, service_role;

-- 2. GET_ADMIN_DIRECTORY WITH INVITATION STATUS
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
  invitation_status text,
  invitation_token text,
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
    coalesce(ai.status, case when ur.is_active then 'accepted' else 'inactive' end)::text as invitation_status,
    ai.token::text as invitation_token,
    ur.created_at,
    u.last_sign_in_at
  from public.user_roles ur
  left join auth.users u on u.id = ur.user_id
  left join public.profiles p on p.id = ur.user_id
  left join public.mosque_admins ma on ma.user_id = ur.user_id
  left join public.mosques m on m.id = ma.mosque_id
  left join lateral (
    select status, token
    from public.admin_invitations ai_inner
    where lower(trim(ai_inner.email)) = lower(trim(coalesce(u.email, p.email)))
    order by ai_inner.created_at desc
    limit 1
  ) ai on true
  where ur.role in ('super_admin', 'mosque_admin')
  order by ur.created_at desc;
end;
$$;

grant execute on function public.get_admin_directory() to authenticated, anon, service_role;

-- 3. CREATE_ADMIN_INVITATION PROCEDURE
drop function if exists public.create_admin_invitation(text, text, text, text, uuid, text);
drop function if exists public.create_admin_invitation;

create or replace function public.create_admin_invitation(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_mosque_id uuid default null,
  p_invited_by text default 'Super Admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_encrypted_pw text;
  v_token text;
  v_invitation_id uuid;
  v_mosque_name text;
begin
  -- Validate Role
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

  if p_role = 'mosque_admin' and p_mosque_id is not null then
    select name into v_mosque_name from public.mosques where id = p_mosque_id;
  end if;

  -- Generate secure random invitation token
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

  -- 1. Create or lookup auth.users entry (disabled / unconfirmed until invitation accepted)
  select id into v_user_id from auth.users where email = lower(trim(p_email));

  if v_user_id is not null then
    update auth.users
    set
      encrypted_password = v_encrypted_pw,
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', trim(p_full_name)),
      updated_at = now()
    where id = v_user_id;
  else
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
      null, -- email confirmed only upon accepting invitation
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('full_name', trim(p_full_name)),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  end if;

  -- 2. Upsert public.profiles
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

  -- 3. Upsert public.user_roles (is_active = false until accepted)
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
    false, -- Pending acceptance!
    now()
  )
  on conflict (user_id, role) do update set
    is_active = false,
    updated_at = now();

  -- 4. Assign mosque if mosque_admin
  if p_role = 'mosque_admin' and p_mosque_id is not null then
    insert into public.mosque_admins (mosque_id, user_id)
    values (p_mosque_id, v_user_id)
    on conflict (mosque_id, user_id) do nothing;
  end if;

  -- 5. Revoke any prior pending invitations for this email
  update public.admin_invitations
  set status = 'revoked'
  where lower(trim(email)) = lower(trim(p_email)) and status = 'pending';

  -- 6. Insert new invitation record
  insert into public.admin_invitations (
    email,
    full_name,
    role,
    mosque_id,
    token,
    password_hash,
    status,
    invited_by,
    created_at,
    expires_at
  ) values (
    lower(trim(p_email)),
    trim(p_full_name),
    p_role,
    p_mosque_id,
    v_token,
    v_encrypted_pw,
    'pending',
    p_invited_by,
    now(),
    now() + interval '7 days'
  )
  returning id into v_invitation_id;

  -- 7. Audit log
  insert into public.audit_logs (
    actor_name,
    action,
    target_table,
    target_id,
    changes,
    created_at
  ) values (
    p_invited_by,
    'ADMIN_INVITATION_CREATED',
    'admin_invitations',
    v_invitation_id::text,
    jsonb_build_object(
      'email', lower(trim(p_email)),
      'full_name', trim(p_full_name),
      'role', p_role,
      'mosque_id', p_mosque_id,
      'mosque_name', v_mosque_name
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'user_id', v_user_id,
    'email', lower(trim(p_email)),
    'full_name', trim(p_full_name),
    'role', p_role,
    'mosque_name', v_mosque_name,
    'token', v_token,
    'expires_at', (now() + interval '7 days')
  );
end;
$$;

grant execute on function public.create_admin_invitation(text, text, text, text, uuid, text) to authenticated, anon, service_role;

-- Compatibility wrapper for provision_administrator
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
begin
  return public.create_admin_invitation(
    p_email,
    p_password,
    p_full_name,
    p_role,
    p_mosque_id,
    'Super Admin'
  );
end;
$$;

grant execute on function public.provision_administrator(text, text, text, text, text, uuid) to authenticated, anon, service_role;

-- 4. GET_INVITATION_DETAILS PROCEDURE (Used by the acceptance page)
drop function if exists public.get_invitation_details(text);

create or replace function public.get_invitation_details(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_inv record;
  v_mosque_name text := null;
begin
  if p_token is null or trim(p_token) = '' then
    return jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Invitation token is missing.');
  end if;

  select ai.*, m.name as mosque_name
  into v_inv
  from public.admin_invitations ai
  left join public.mosques m on m.id = ai.mosque_id
  where ai.token = trim(p_token);

  if v_inv is null then
    return jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Invitation not found. Please check your link.');
  end if;

  if v_inv.status = 'accepted' then
    return jsonb_build_object(
      'success', false,
      'code', 'ALREADY_ACCEPTED',
      'message', 'This invitation has already been accepted.',
      'email', v_inv.email,
      'full_name', v_inv.full_name,
      'role', v_inv.role
    );
  end if;

  if v_inv.status = 'revoked' then
    return jsonb_build_object(
      'success', false,
      'code', 'REVOKED',
      'message', 'This invitation has been revoked by the Super Administrator.'
    );
  end if;

  if v_inv.expires_at < now() then
    return jsonb_build_object(
      'success', false,
      'code', 'EXPIRED',
      'message', 'This invitation has expired. Please ask the Super Administrator to resend an invite.'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'invitation', jsonb_build_object(
      'id', v_inv.id,
      'email', v_inv.email,
      'full_name', v_inv.full_name,
      'role', v_inv.role,
      'mosque_id', v_inv.mosque_id,
      'mosque_name', v_inv.mosque_name,
      'expires_at', v_inv.expires_at,
      'invited_by', v_inv.invited_by
    )
  );
end;
$$;

grant execute on function public.get_invitation_details(text) to authenticated, anon, service_role;

-- 5. ACCEPT_ADMIN_INVITATION PROCEDURE
drop function if exists public.accept_admin_invitation(text);

create or replace function public.accept_admin_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_inv record;
  v_user_id uuid;
begin
  if p_token is null or trim(p_token) = '' then
    return jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Invitation token is missing.');
  end if;

  select * into v_inv
  from public.admin_invitations
  where token = trim(p_token);

  if v_inv is null then
    return jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Invitation not found.');
  end if;

  if v_inv.status = 'accepted' then
    return jsonb_build_object(
      'success', true,
      'already_accepted', true,
      'email', v_inv.email,
      'role', v_inv.role,
      'message', 'This invitation was already accepted.'
    );
  end if;

  if v_inv.status = 'revoked' then
    return jsonb_build_object('success', false, 'code', 'REVOKED', 'message', 'This invitation has been revoked.');
  end if;

  if v_inv.expires_at < now() then
    return jsonb_build_object('success', false, 'code', 'EXPIRED', 'message', 'This invitation has expired.');
  end if;

  -- 1. Mark invitation accepted
  update public.admin_invitations
  set
    status = 'accepted',
    accepted_at = now()
  where id = v_inv.id;

  -- 2. Lookup auth.users ID
  select id into v_user_id from auth.users where email = v_inv.email;

  if v_user_id is not null then
    -- Confirm email & activate
    update auth.users
    set
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
    where id = v_user_id;

    -- Activate user_roles
    update public.user_roles
    set
      is_active = true,
      updated_at = now()
    where user_id = v_user_id and role = v_inv.role;
  end if;

  -- 3. Log audit event
  insert into public.audit_logs (
    actor_name,
    action,
    target_table,
    target_id,
    changes,
    created_at
  ) values (
    v_inv.full_name || ' (' || v_inv.email || ')',
    'ADMIN_INVITATION_ACCEPTED',
    'admin_invitations',
    v_inv.id::text,
    jsonb_build_object(
      'email', v_inv.email,
      'full_name', v_inv.full_name,
      'role', v_inv.role,
      'mosque_id', v_inv.mosque_id
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'email', v_inv.email,
    'full_name', v_inv.full_name,
    'role', v_inv.role,
    'message', 'Invitation accepted successfully! Your administrator account is now active.'
  );
end;
$$;

grant execute on function public.accept_admin_invitation(text) to authenticated, anon, service_role;

-- 6. VERIFY_ADMIN_CREDENTIALS PROCEDURE (For authentication)
drop function if exists public.verify_admin_credentials(text, text);

create or replace function public.verify_admin_credentials(
  p_email text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_clean_email text := lower(trim(p_email));
  v_user record;
  v_pw_hash text;
  v_is_valid boolean := false;
  v_pending_inv record;
begin
  if v_clean_email is null or v_clean_email = '' or p_password is null or p_password = '' then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_CREDENTIALS',
      'message', 'Email address and password are required.'
    );
  end if;

  -- 1. Check if there is a pending unaccepted invitation for this email
  select * into v_pending_inv
  from public.admin_invitations
  where lower(trim(email)) = v_clean_email
    and status = 'pending'
  order by created_at desc
  limit 1;

  -- 2. Master Super Admin bypass (Adil KT)
  if v_clean_email = 'adhilktillakandi@gmail.com' and p_password = 'adilSalaNear66' then
    return jsonb_build_object(
      'success', true,
      'user', jsonb_build_object(
        'id', 'eca26e22-0a4c-43ab-b9ab-ce99318de7a0',
        'email', 'adhilktillakandi@gmail.com',
        'full_name', 'Adil KT',
        'role', 'super_admin',
        'is_active', true
      )
    );
  end if;

  -- 3. Lookup user from database
  select
    ur.id as user_role_id,
    ur.user_id,
    coalesce(u.email, p.email)::text as email,
    coalesce(p.full_name, split_part(u.email, '@', 1), 'Administrator')::text as full_name,
    ur.role::text as role,
    ur.is_active,
    u.encrypted_password,
    ai.password_hash as invite_password_hash,
    ma.mosque_id as assigned_mosque_id,
    m.name::text as assigned_mosque_name
  into v_user
  from public.user_roles ur
  left join auth.users u on u.id = ur.user_id
  left join public.profiles p on p.id = ur.user_id
  left join public.mosque_admins ma on ma.user_id = ur.user_id
  left join public.mosques m on m.id = ma.mosque_id
  left join lateral (
    select password_hash, status
    from public.admin_invitations ai_inner
    where lower(trim(ai_inner.email)) = v_clean_email
    order by ai_inner.created_at desc
    limit 1
  ) ai on true
  where lower(trim(coalesce(u.email, p.email))) = v_clean_email
    and ur.role in ('super_admin', 'mosque_admin')
  order by ur.created_at desc
  limit 1;

  if v_user is null then
    if v_pending_inv is not null then
      return jsonb_build_object(
        'success', false,
        'code', 'PENDING_INVITATION',
        'message', 'Your invitation is pending acceptance. Please check your email to activate your account before logging in.'
      );
    end if;
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_CREDENTIALS',
      'message', 'Invalid administrator email address or password.'
    );
  end if;

  -- 4. Check if pending invitation
  if v_pending_inv is not null and not coalesce(v_user.is_active, false) then
    return jsonb_build_object(
      'success', false,
      'code', 'PENDING_INVITATION',
      'message', 'Your invitation is pending acceptance. Please check your email to activate your account before logging in.'
    );
  end if;

  -- 5. Check if suspended
  if not coalesce(v_user.is_active, false) then
    return jsonb_build_object(
      'success', false,
      'code', 'ACCOUNT_SUSPENDED',
      'message', 'Your administrator account has been deactivated. Please contact the Super Administrator.'
    );
  end if;

  -- 6. Verify password
  v_pw_hash := coalesce(v_user.encrypted_password, v_user.invite_password_hash);
  if v_pw_hash is not null and v_pw_hash = extensions.crypt(p_password, v_pw_hash) then
    v_is_valid := true;
  end if;

  if not v_is_valid then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_CREDENTIALS',
      'message', 'Invalid administrator email address or password.'
    );
  end if;

  -- 7. Update last sign in
  update auth.users
  set last_sign_in_at = now()
  where id = v_user.user_id;

  return jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.user_id,
      'user_role_id', v_user.user_role_id,
      'email', v_user.email,
      'full_name', v_user.full_name,
      'role', v_user.role,
      'assigned_mosques', case when v_user.assigned_mosque_name is not null then jsonb_build_array(v_user.assigned_mosque_name) else '[]'::jsonb end,
      'assigned_mosque_id', v_user.assigned_mosque_id,
      'assigned_mosque_name', v_user.assigned_mosque_name,
      'is_active', v_user.is_active
    )
  );
end;
$$;

grant execute on function public.verify_admin_credentials(text, text) to authenticated, anon, service_role;


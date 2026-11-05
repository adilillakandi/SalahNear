-- ==============================================================================
-- SALAHNEAR: LIVE MOSQUE DYNAMIC QR DISPLAY & VERIFICATION SCHEMA
-- Powers the TV entrance display kiosk (/qr) and mobile scan verification
-- PostgreSQL 15+ / Supabase Compatible (requires pgcrypto)
-- ==============================================================================

-- 1. ENSURE EXTENSIONS ARE PRESENT
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- ==============================================================================
-- 2. MOSQUE QR CONFIGURATION EXTENSIONS
-- Adds QR kiosk settings, rotation timers, and per-venue secret salts
-- ==============================================================================
alter table public.mosques add column if not exists qr_checkin_enabled boolean not null default true;
alter table public.mosques add column if not exists qr_secret_salt text default 'salahnear_default_salt';
alter table public.mosques add column if not exists qr_rotation_seconds integer not null default 60;
alter table public.mosques add column if not exists kiosk_display_name text;

-- ==============================================================================
-- 3. MOSQUE DYNAMIC QR SESSIONS & SCAN LOGS (ANTI-REPLAY LEDGER)
-- Prevents replaying old scanned tokens and tracks live kiosk attendance
-- ==============================================================================
create table if not exists public.mosque_qr_scans (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  prayer_type text not null check (prayer_type in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah')),
  prayer_date date not null default current_date,
  token_timestamp bigint not null,
  token_signature text not null,
  scanned_at timestamptz not null default now(),
  status text not null default 'verified' check (status in ('verified', 'flagged', 'rejected', 'expired')),
  rejection_reason text,
  device_ip text,
  unique(mosque_id, user_id, prayer_type, prayer_date)
);

create index if not exists mosque_qr_scans_mosque_date_idx
  on public.mosque_qr_scans(mosque_id, prayer_date, prayer_type);

create index if not exists mosque_qr_scans_user_idx
  on public.mosque_qr_scans(user_id, prayer_date);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.mosque_qr_scans enable row level security;

drop policy if exists "Congregants insert own QR scans" on public.mosque_qr_scans;
drop policy if exists "Admins view all QR scans" on public.mosque_qr_scans;
drop policy if exists "Mosque Admins view their venue QR scans" on public.mosque_qr_scans;

create policy "Congregants insert own QR scans"
  on public.mosque_qr_scans for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Admins view all QR scans"
  on public.mosque_qr_scans for select to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin', 'district_admin')
    )
  );

create policy "Mosque Admins view their venue QR scans"
  on public.mosque_qr_scans for select to authenticated
  using (
    exists (
      select 1 from public.mosque_admins ma
      where ma.user_id = auth.uid()
        and ma.mosque_id = public.mosque_qr_scans.mosque_id
    )
  );

grant select, insert on public.mosque_qr_scans to authenticated, anon;

-- ==============================================================================
-- 5. CRYPTOGRAPHIC STORED PROCEDURE: GENERATE DYNAMIC QR PAYLOAD
-- Generates a 60-second HMAC-SHA256 signature for a mosque prayer session
-- ==============================================================================
create or replace function public.generate_mosque_qr_payload(
  p_mosque_id uuid,
  p_session text,
  p_timestamp bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ts bigint := coalesce(p_timestamp, (extract(epoch from now()) * 1000)::bigint);
  v_secret text := 'salahnear_secure_mosque_hmac_secret_2026_kerala';
  v_raw_data text;
  v_sig text;
  v_payload text;
  v_mosque_name text;
begin
  select coalesce(kiosk_display_name, name) into v_mosque_name
  from public.mosques where id = p_mosque_id;

  if v_mosque_name is null then
    raise exception 'Mosque with ID % not found', p_mosque_id;
  end if;

  -- Form signature string: mosqueId:session:timestamp
  v_raw_data := p_mosque_id::text || ':' || p_session || ':' || v_ts::text;
  v_sig := substring(encode(extensions.hmac(v_raw_data::bytea, v_secret::bytea, 'sha256'), 'hex') from 1 for 16);
  v_payload := 'salahnear://mosque/' || p_mosque_id::text || '?session=' || p_session || '&ts=' || v_ts::text || '&sig=' || v_sig;

  return jsonb_build_object(
    'success', true,
    'mosque_id', p_mosque_id,
    'mosque_name', v_mosque_name,
    'session', p_session,
    'timestamp', v_ts,
    'expires_in_seconds', 60,
    'expires_at', v_ts + 60000,
    'signature', v_sig,
    'payload', v_payload
  );
end;
$$;

grant execute on function public.generate_mosque_qr_payload(uuid, text, bigint) to authenticated, anon;

-- ==============================================================================
-- 6. CRYPTOGRAPHIC STORED PROCEDURE: VALIDATE DYNAMIC QR SCAN
-- Validates token age, verifies HMAC signature, checks anti-replay, and awards points
-- ==============================================================================
create or replace function public.verify_and_record_qr_scan(
  p_user_id uuid,
  p_mosque_id uuid,
  p_session text,
  p_timestamp bigint,
  p_signature text,
  p_device_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_now_ts bigint := (extract(epoch from now()) * 1000)::bigint;
  v_secret text := 'salahnear_secure_mosque_hmac_secret_2026_kerala';
  v_raw_data text;
  v_expected_sig text;
  v_qr_enabled boolean;
  v_attendance_id uuid;
begin
  -- 1. Check if venue has QR check-in enabled
  select qr_checkin_enabled into v_qr_enabled
  from public.mosques where id = p_mosque_id;

  if v_qr_enabled is distinct from true then
    return jsonb_build_object('valid', false, 'error', 'QR check-in is disabled for this mosque.');
  end if;

  -- 2. Check token freshness (reject older than 90 seconds or in future by > 10 seconds)
  if (v_now_ts - p_timestamp) > 90000 or (p_timestamp - v_now_ts) > 10000 then
    return jsonb_build_object('valid', false, 'error', 'QR code has expired. Please scan the current live screen.');
  end if;

  -- 3. Verify cryptographic HMAC signature
  v_raw_data := p_mosque_id::text || ':' || p_session || ':' || p_timestamp::text;
  v_expected_sig := substring(encode(extensions.hmac(v_raw_data::bytea, v_secret::bytea, 'sha256'), 'hex') from 1 for 16);

  if p_signature != v_expected_sig then
    return jsonb_build_object('valid', false, 'error', 'Cryptographic signature mismatch (tampered or invalid QR code).');
  end if;

  -- 4. Check for existing scan (Anti-replay for same prayer on same day)
  if exists (
    select 1 from public.mosque_qr_scans
    where mosque_id = p_mosque_id
      and user_id = p_user_id
      and prayer_type = p_session
      and prayer_date = current_date
  ) then
    return jsonb_build_object('valid', false, 'error', 'You have already recorded attendance for this prayer session today.');
  end if;

  -- 5. Record verified scan in mosque_qr_scans
  insert into public.mosque_qr_scans (
    mosque_id,
    user_id,
    prayer_type,
    prayer_date,
    token_timestamp,
    token_signature,
    device_ip,
    status
  ) values (
    p_mosque_id,
    p_user_id,
    p_session,
    current_date,
    p_timestamp,
    p_signature,
    p_device_ip,
    'verified'
  );

  -- 6. Insert attendance record
  insert into public.attendance (
    user_id,
    mosque_id,
    prayer_type,
    prayer_date,
    status
  ) values (
    p_user_id,
    p_mosque_id,
    p_session,
    current_date,
    'verified'
  )
  returning id into v_attendance_id;

  -- 7. Award points (+5) in user_points ledger
  insert into public.user_points (
    user_id,
    points,
    reason,
    notes,
    activity_type
  ) values (
    p_user_id,
    5,
    'congregational_' || p_session,
    'Dynamic QR check-in at ' || (select name from public.mosques where id = p_mosque_id),
    'qr_checkin'
  );

  return jsonb_build_object(
    'valid', true,
    'points_awarded', 5,
    'mosque_id', p_mosque_id,
    'prayer_type', p_session,
    'attendance_id', v_attendance_id,
    'scanned_at', now()
  );
end;
$$;

grant execute on function public.verify_and_record_qr_scan(uuid, uuid, text, bigint, text, text) to authenticated, anon;

-- ==============================================================================
-- 7. LIVE KIOSK ATTENDANCE TELEMETRY VIEW
-- Shows real-time congregant check-ins on the mosque TV screen for the active session
-- ==============================================================================
create or replace view public.mosque_live_qr_attendance_view
with (security_invoker = on)
as
select
  s.mosque_id,
  m.name as mosque_name,
  s.prayer_type,
  s.prayer_date,
  count(s.id) as verified_congregants_count,
  max(s.scanned_at) as last_scan_at
from public.mosque_qr_scans s
join public.mosques m on m.id = s.mosque_id
where s.prayer_date = current_date
  and s.status = 'verified'
group by s.mosque_id, m.name, s.prayer_type, s.prayer_date;

grant select on public.mosque_live_qr_attendance_view to authenticated, anon;

-- ==============================================================================
-- 8. DIRECT SQL QUERY EXAMPLES
-- ==============================================================================

/*
-- [1] GENERATE DYNAMIC QR PAYLOAD FOR A MOSQUE:
SELECT public.generate_mosque_qr_payload(
  (SELECT id FROM public.mosques WHERE name ILIKE '%Mishkal%' LIMIT 1),
  'fajr'
);

-- [2] VERIFY A SCANNED QR TOKEN FROM MOBILE APP:
SELECT public.verify_and_record_qr_scan(
  '<USER_UUID>'::uuid,
  '<MOSQUE_UUID>'::uuid,
  'fajr',
  1762319200000,
  '<SIGNATURE_HEX>'
);

-- [3] GET TODAY'S LIVE ATTENDANCE FOR A MOSQUE'S CURRENT SESSION:
SELECT * FROM public.mosque_live_qr_attendance_view
WHERE mosque_id = '<MOSQUE_UUID>'
  AND prayer_type = 'fajr';
*/


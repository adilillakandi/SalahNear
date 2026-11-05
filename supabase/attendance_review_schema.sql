-- ==============================================================================
-- SALAHNEAR: ATTENDANCE REVIEW & ANTI-FRAUD QUEUE SCHEMA
-- Complete Schema, Stored Procedures, Views, RLS Policies, Anti-Fraud Heuristics,
-- Points Ledger Integration, and Direct Action Queries for Supabase / PostgreSQL 15+
-- ==============================================================================

-- Enable required cryptographic and geometric extensions
create extension if not exists "pgcrypto";

-- Ensure profiles.id has gen_random_uuid() default to prevent not-null insertion errors
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    alter table public.profiles alter column id set default gen_random_uuid();
  end if;
end;
$$;

-- ==============================================================================
-- 1. ATTENDANCE TABLE ENHANCEMENTS
-- ==============================================================================
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  prayer_type text not null check (
    prayer_type in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah')
  ),
  prayer_date date not null default current_date,
  status text not null default 'pending' check (
    status in ('pending', 'verified', 'flagged', 'rejected', 'reversed')
  ),
  points_awarded integer not null default 0,
  
  -- Anti-Fraud Telemetry & Geofence Verification
  device_accuracy_m double precision default 10.0,
  calculated_distance_m double precision default 0.0,
  is_mock_location boolean not null default false,
  
  -- Camera Verification Evidence & Hashes
  image_storage_path text,
  image_sha256 text,
  risk_score double precision default 0.0,
  risk_reasons text[] default '{}',

  -- Administrative Review Metadata
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,

  -- Submission Timestamps & Anti-Replay
  idempotency_key text,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, prayer_type, prayer_date)
);

-- Ensure all enhanced columns exist if attendance was created in an earlier migration
alter table public.attendance add column if not exists device_accuracy_m double precision default 10.0;
alter table public.attendance add column if not exists calculated_distance_m double precision default 0.0;
alter table public.attendance add column if not exists is_mock_location boolean not null default false;
alter table public.attendance add column if not exists image_storage_path text;
alter table public.attendance add column if not exists image_sha256 text;
alter table public.attendance add column if not exists risk_score double precision default 0.0;
alter table public.attendance add column if not exists risk_reasons text[] default '{}';
alter table public.attendance add column if not exists reviewed_by uuid references public.profiles(id);
alter table public.attendance add column if not exists reviewed_at timestamptz;
alter table public.attendance add column if not exists review_notes text;
alter table public.attendance add column if not exists created_at timestamptz not null default now();
alter table public.attendance add column if not exists updated_at timestamptz not null default now();

-- Update check constraint on status if needed
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'attendance_status_check') then
    alter table public.attendance drop constraint attendance_status_check;
  end if;
  alter table public.attendance add constraint attendance_status_check
    check (status in ('pending', 'verified', 'flagged', 'rejected', 'reversed'));
end;
$$;

-- Update check constraint on prayer_type to include jummah
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'attendance_prayer_type_check') then
    alter table public.attendance drop constraint attendance_prayer_type_check;
  end if;
  alter table public.attendance add constraint attendance_prayer_type_check
    check (prayer_type in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah'));
end;
$$;

-- Performance Indexes
create index if not exists attendance_queue_status_idx on public.attendance(status, submitted_at desc);
create index if not exists attendance_user_date_idx on public.attendance(user_id, prayer_date);
create index if not exists attendance_mosque_prayer_idx on public.attendance(mosque_id, prayer_date, prayer_type);
create index if not exists attendance_mock_location_idx on public.attendance(is_mock_location);
create index if not exists attendance_submitted_at_idx on public.attendance(submitted_at desc);

-- ==============================================================================
-- 2. ATTENDANCE EVIDENCE TABLE (RAW TELEMETRY & CAMERA HASHES)
-- ==============================================================================
create table if not exists public.attendance_evidence (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance(id) on delete cascade,
  image_storage_path text,
  device_latitude double precision not null,
  device_longitude double precision not null,
  device_accuracy_m double precision,
  device_captured_at timestamptz,
  location_fix_at timestamptz,
  server_received_at timestamptz not null default now(),
  qr_payload text,
  image_sha256 text,
  perceptual_hash text,
  integrity_signals jsonb not null default '{}'::jsonb
);

create index if not exists attendance_evidence_attendance_idx on public.attendance_evidence(attendance_id);
create index if not exists attendance_evidence_sha256_idx on public.attendance_evidence(image_sha256);

-- ==============================================================================
-- 3. ATTENDANCE VERIFICATIONS TABLE (IMMUTABLE DECISION AUDIT LOG)
-- ==============================================================================
create table if not exists public.attendance_verifications (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null check (
    decision in ('verified', 'approved', 'rejected', 'flagged', 'pending')
  ),
  distance_m double precision,
  risk_score double precision default 0.0,
  review_notes text,
  reviewed_at timestamptz not null default now()
);

create index if not exists attendance_verifications_att_idx on public.attendance_verifications(attendance_id, reviewed_at desc);
create index if not exists attendance_verifications_reviewer_idx on public.attendance_verifications(reviewer_id);

-- ==============================================================================
-- 4. ENSURE POINTS LEDGER (USER_POINTS) ALIGNMENT
-- ==============================================================================
create table if not exists public.user_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attendance_id uuid references public.attendance(id) on delete set null,
  points integer not null,
  activity_type text not null default 'prayer_attendance'
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
  reason text not null default 'Congregational prayer attendance verification',
  notes text,
  adjusted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- 5. ENSURE USER STREAKS TABLE ALIGNMENT
-- ==============================================================================
create table if not exists public.user_streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_attendance_date date,
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- 6. ENSURE AUDIT LOGS TABLE ALIGNMENT
-- ==============================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default 'Administrator',
  action text not null,
  target_table text not null default 'attendance',
  target_id text,
  changes jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_target_idx on public.audit_logs(target_table, target_id);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

-- ==============================================================================
-- 7. STORAGE BUCKET CONFIGURATION (ATTENDANCE-EVIDENCE)
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('attendance-evidence', 'attendance-evidence', false)
on conflict (id) do nothing;

-- Storage policies:
-- Users can upload camera evidence images
drop policy if exists "Authenticated users can upload attendance evidence" on storage.objects;
create policy "Authenticated users can upload attendance evidence"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'attendance-evidence');

-- Admins and owners can read evidence photos
drop policy if exists "Users and Admins view attendance evidence" on storage.objects;
create policy "Users and Admins view attendance evidence"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'attendance-evidence' and (
      (storage.foldername(name))[1] = auth.uid()::text or
      exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.is_active = true
          and ur.role in ('super_admin', 'state_admin', 'district_admin', 'mosque_admin')
      )
    )
  );

-- ==============================================================================
-- 8. REAL-TIME VIEW: ATTENDANCE REVIEW QUEUE (WITH SECURITY_INVOKER = ON)
-- Compliant with Supabase Security Advisor (0010_security_definer_view)
-- ==============================================================================
drop view if exists public.attendance_review_queue_view cascade;

create view public.attendance_review_queue_view
with (security_invoker = on)
as
select
  a.id as attendance_id,
  a.user_id,
  p.full_name as user_name,
  p.username as user_username,
  p.avatar_url,
  p.account_status as user_account_status,
  
  a.mosque_id,
  m.name as mosque_name,
  m.name_ml as mosque_name_ml,
  m.district as mosque_district,
  m.city_or_locality as mosque_locality,
  m.attendance_radius_m as mosque_allowed_radius,

  a.prayer_type,
  a.prayer_date,
  a.submitted_at,
  a.created_at,
  a.status,
  a.points_awarded,

  -- GPS Telemetry
  coalesce(a.calculated_distance_m, e.device_accuracy_m, 0.0) as calculated_distance_m,
  coalesce(a.device_accuracy_m, e.device_accuracy_m, 10.0) as device_accuracy_m,
  coalesce(a.is_mock_location, false) as is_mock_location,

  -- Evidence Image & Hashes
  coalesce(a.image_storage_path, e.image_storage_path) as image_storage_path,
  coalesce(a.image_sha256, e.image_sha256) as image_sha256,
  e.perceptual_hash,
  e.integrity_signals,

  -- Anti-Fraud Signals Summary
  case
    when a.is_mock_location = true then 'Mock GPS Detected'
    when coalesce(a.calculated_distance_m, 0.0) > coalesce(m.attendance_radius_m, 80) then 'Out of Geofence'
    when coalesce(a.device_accuracy_m, 10.0) > 50.0 then 'Inaccurate Device GPS'
    else 'Authentic GPS'
  end as signals_summary,

  case
    when a.is_mock_location = true or coalesce(a.calculated_distance_m, 0.0) > 100.0 then true
    else false
  end as is_high_risk,

  -- Review Details
  a.reviewed_by,
  rev.full_name as reviewer_name,
  a.reviewed_at,
  a.review_notes

from public.attendance a
join public.profiles p on p.id = a.user_id
join public.mosques m on m.id = a.mosque_id
left join public.attendance_evidence e on e.attendance_id = a.id
left join public.profiles rev on rev.id = a.reviewed_by;

-- ==============================================================================
-- 9. STORED PROCEDURE: PROCESS ATTENDANCE REVIEW (COVERS EVERY ACTION)
-- Handles:
--   - Approve (+5 Points, updates user_points ledger and user_streaks)
--   - Reject Proof (reverses points if previously awarded, updates streaks)
--   - Flag as Suspicious (sets status to flagged, logs fraud note, updates streaks)
-- ==============================================================================
create or replace function public.process_attendance_review(
  p_attendance_id uuid,
  p_decision text,              -- 'verified', 'rejected', or 'flagged'
  p_notes text default null,
  p_points integer default 5
)
returns jsonb as $$
declare
  v_rec public.attendance%rowtype;
  v_user_name text;
  v_mosque_name text;
  v_reviewer_id uuid := auth.uid();
  v_reviewer_name text;
  v_points_to_award integer := 0;
  v_current_points integer := 0;
  v_points_diff integer := 0;
  v_streak_record public.user_streaks%rowtype;
begin
  -- 1. Validate decision value
  if p_decision not in ('verified', 'approved', 'rejected', 'flagged') then
    raise exception 'Invalid decision: %. Allowed: verified, rejected, flagged.', p_decision;
  end if;

  -- Normalize 'approved' to 'verified'
  if p_decision = 'approved' then
    p_decision := 'verified';
  end if;

  -- 2. Fetch existing attendance record
  select * into v_rec
  from public.attendance
  where id = p_attendance_id;

  if not found then
    raise exception 'Attendance record % not found.', p_attendance_id;
  end if;

  -- 3. Fetch user and mosque details for audit logs
  select full_name into v_user_name from public.profiles where id = v_rec.user_id;
  select name into v_mosque_name from public.mosques where id = v_rec.mosque_id;

  -- Fetch reviewer name if authenticated
  if v_reviewer_id is not null then
    select full_name into v_reviewer_name from public.profiles where id = v_reviewer_id;
  end if;
  v_reviewer_name := coalesce(v_reviewer_name, 'Attendance Reviewer');

  v_current_points := coalesce(v_rec.points_awarded, 0);

  -- 4. Calculate points change based on decision
  if p_decision = 'verified' then
    v_points_to_award := coalesce(p_points, 5);
  else
    v_points_to_award := 0;
  end if;

  v_points_diff := v_points_to_award - v_current_points;

  -- 5. Update attendance table
  update public.attendance
  set
    status = p_decision,
    points_awarded = v_points_to_award,
    verified_at = case when p_decision = 'verified' then now() else null end,
    reviewed_by = v_reviewer_id,
    reviewed_at = now(),
    review_notes = coalesce(p_notes, v_rec.review_notes),
    updated_at = now()
  where id = p_attendance_id;

  -- 6. Insert audit record in attendance_verifications
  insert into public.attendance_verifications (
    attendance_id,
    reviewer_id,
    decision,
    distance_m,
    risk_score,
    review_notes,
    reviewed_at
  ) values (
    p_attendance_id,
    v_reviewer_id,
    p_decision,
    v_rec.calculated_distance_m,
    v_rec.risk_score,
    coalesce(p_notes, 'Administrative decision: ' || p_decision),
    now()
  );

  -- 7. Points Ledger (user_points) Adjustments
  if v_points_diff > 0 then
    -- Award points
    insert into public.user_points (
      user_id,
      attendance_id,
      points,
      activity_type,
      reason,
      notes,
      adjusted_by,
      created_at
    ) values (
      v_rec.user_id,
      p_attendance_id,
      v_points_diff,
      'prayer_attendance',
      format('Verified congregational %s prayer at %s (+%s pts)', initcap(v_rec.prayer_type), v_mosque_name, v_points_diff),
      p_notes,
      v_reviewer_id,
      now()
    );
  elsif v_points_diff < 0 then
    -- Reverse / deduct points previously awarded
    insert into public.user_points (
      user_id,
      attendance_id,
      points,
      activity_type,
      reason,
      notes,
      adjusted_by,
      created_at
    ) values (
      v_rec.user_id,
      p_attendance_id,
      v_points_diff,
      'admin_reversal',
      format('Attendance revoked for %s prayer at %s (%s pts)', initcap(v_rec.prayer_type), v_mosque_name, v_points_diff),
      p_notes,
      v_reviewer_id,
      now()
    );
  end if;

  -- 8. Streaks Maintenance (on verified attendance)
  if p_decision = 'verified' and v_points_diff > 0 then
    select * into v_streak_record from public.user_streaks where user_id = v_rec.user_id;

    if not found then
      insert into public.user_streaks (user_id, current_streak, longest_streak, last_attendance_date, updated_at)
      values (v_rec.user_id, 1, 1, v_rec.prayer_date, now());
    else
      -- Check if consecutive day
      if v_streak_record.last_attendance_date = v_rec.prayer_date - interval '1 day' then
        update public.user_streaks
        set
          current_streak = current_streak + 1,
          longest_streak = greatest(longest_streak, current_streak + 1),
          last_attendance_date = v_rec.prayer_date,
          updated_at = now()
        where user_id = v_rec.user_id;
      elsif v_streak_record.last_attendance_date < v_rec.prayer_date - interval '1 day' then
        -- Streak reset
        update public.user_streaks
        set
          current_streak = 1,
          last_attendance_date = v_rec.prayer_date,
          updated_at = now()
        where user_id = v_rec.user_id;
      end if;
    end if;
  end if;

  -- 9. Anti-Fraud Escalation: Auto-flag user if multiple flagged attendances exist
  if p_decision = 'flagged' then
    if (
      select count(*)
      from public.attendance
      where user_id = v_rec.user_id
        and status = 'flagged'
        and submitted_at >= now() - interval '7 days'
    ) >= 3 then
      update public.profiles
      set
        account_status = 'flagged',
        suspension_reason = 'Multiple flagged attendance spoof signals detected by reviewer',
        suspended_at = now()
      where id = v_rec.user_id;
    end if;
  end if;

  -- 10. Write Audit Log
  insert into public.audit_logs (
    actor_user_id,
    actor_name,
    action,
    target_table,
    target_id,
    changes,
    created_at
  ) values (
    v_reviewer_id,
    v_reviewer_name,
    'ATTENDANCE_' || upper(p_decision),
    'attendance',
    p_attendance_id::text,
    jsonb_build_object(
      'decision', p_decision,
      'points_awarded', v_points_to_award,
      'points_difference', v_points_diff,
      'user_id', v_rec.user_id,
      'user_name', v_user_name,
      'mosque_name', v_mosque_name,
      'prayer_type', v_rec.prayer_type,
      'prayer_date', v_rec.prayer_date,
      'notes', p_notes
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'attendance_id', p_attendance_id,
    'decision', p_decision,
    'points_awarded', v_points_to_award,
    'points_difference', v_points_diff,
    'reviewed_by', v_reviewer_id,
    'reviewed_at', now()
  );
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 10. STORED PROCEDURE: GET QUEUE SUMMARY METRICS (FOR HEADER BADGES)
-- Returns counts for:
--   - Flagged Submissions (e.g. "1 Flagged Submissions")
--   - Awaiting Review (e.g. "2 Awaiting Review")
--   - Verified Today & Total Pending
-- ==============================================================================
create or replace function public.get_attendance_queue_metrics()
returns jsonb as $$
declare
  v_flagged_count integer := 0;
  v_pending_count integer := 0;
  v_verified_count integer := 0;
  v_rejected_count integer := 0;
  v_today_total integer := 0;
begin
  select count(*) into v_flagged_count
  from public.attendance
  where status = 'flagged' or is_mock_location = true;

  select count(*) into v_pending_count
  from public.attendance
  where status = 'pending';

  select count(*) into v_verified_count
  from public.attendance
  where status = 'verified' and prayer_date = current_date;

  select count(*) into v_rejected_count
  from public.attendance
  where status = 'rejected' and prayer_date = current_date;

  select count(*) into v_today_total
  from public.attendance
  where prayer_date = current_date;

  return jsonb_build_object(
    'flagged_count', v_flagged_count,
    'pending_count', v_pending_count,
    'verified_today', v_verified_count,
    'rejected_today', v_rejected_count,
    'total_today', v_today_total
  );
end;
$$ language plpgsql stable;

-- ==============================================================================
-- 11. MOBILE SUBMISSION PROCEDURE: SUBMIT ATTENDANCE WITH TELEMETRY & GEOFENCE
-- ==============================================================================
create or replace function public.submit_mobile_attendance(
  p_mosque_id uuid,
  p_prayer_type text,
  p_device_lat double precision,
  p_device_lng double precision,
  p_device_accuracy double precision,
  p_is_mock boolean default false,
  p_image_storage_path text default null,
  p_image_sha256 text default null,
  p_integrity_signals jsonb default '{}'::jsonb
)
returns jsonb as $$
declare
  v_user_id uuid := auth.uid();
  v_mosque public.mosques%rowtype;
  v_dist double precision;
  v_status text := 'pending';
  v_points integer := 0;
  v_att_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required to submit attendance';
  end if;

  -- 1. Fetch mosque coordinates and allowed verification radius
  select * into v_mosque from public.mosques where id = p_mosque_id;
  if not found then
    raise exception 'Mosque % not found', p_mosque_id;
  end if;

  -- 2. Calculate Haversine geodesic distance in meters
  v_dist := 6371000 * 2 * asin(
    sqrt(
      power(sin(radians(p_device_lat - v_mosque.entrance_latitude) / 2), 2) +
      cos(radians(v_mosque.entrance_latitude)) *
      cos(radians(p_device_lat)) *
      power(sin(radians(p_device_lng - v_mosque.entrance_longitude) / 2), 2)
    )
  );

  -- 3. Anti-Fraud Telemetry Evaluation
  if p_is_mock = true then
    -- Mock GPS detected -> Auto-Flag
    v_status := 'flagged';
    v_points := 0;
  elsif v_dist <= coalesce(v_mosque.attendance_radius_m, 80) and p_device_accuracy <= 25.0 then
    -- Within strict venue geofence with accurate GPS -> Can be verified
    v_status := 'verified';
    v_points := 5;
  else
    -- Borderline distance or needs photo inspection -> Put in pending queue
    v_status := 'pending';
    v_points := 0;
  end if;

  -- 4. Insert or Update Attendance
  insert into public.attendance (
    user_id,
    mosque_id,
    prayer_type,
    prayer_date,
    status,
    points_awarded,
    device_accuracy_m,
    calculated_distance_m,
    is_mock_location,
    image_storage_path,
    image_sha256,
    submitted_at,
    verified_at
  ) values (
    v_user_id,
    p_mosque_id,
    p_prayer_type,
    current_date,
    v_status,
    v_points,
    p_device_accuracy,
    round(v_dist::numeric, 1),
    p_is_mock,
    p_image_storage_path,
    p_image_sha256,
    now(),
    case when v_status = 'verified' then now() else null end
  )
  on conflict (user_id, prayer_type, prayer_date)
  do update set
    status = excluded.status,
    points_awarded = excluded.points_awarded,
    device_accuracy_m = excluded.device_accuracy_m,
    calculated_distance_m = excluded.calculated_distance_m,
    is_mock_location = excluded.is_mock_location,
    image_storage_path = coalesce(excluded.image_storage_path, attendance.image_storage_path),
    image_sha256 = coalesce(excluded.image_sha256, attendance.image_sha256),
    submitted_at = now()
  returning id into v_att_id;

  -- 5. Insert Evidence Telemetry
  insert into public.attendance_evidence (
    attendance_id,
    image_storage_path,
    device_latitude,
    device_longitude,
    device_accuracy_m,
    device_captured_at,
    image_sha256,
    integrity_signals
  ) values (
    v_att_id,
    p_image_storage_path,
    p_device_lat,
    p_device_lng,
    p_device_accuracy,
    now(),
    p_image_sha256,
    p_integrity_signals
  );

  -- 6. If auto-verified, record points in ledger
  if v_status = 'verified' and v_points > 0 then
    insert into public.user_points (
      user_id,
      attendance_id,
      points,
      activity_type,
      reason
    ) values (
      v_user_id,
      v_att_id,
      v_points,
      'prayer_attendance',
      format('Congregational %s prayer at %s', initcap(p_prayer_type), v_mosque.name)
    );
  end if;

  return jsonb_build_object(
    'attendance_id', v_att_id,
    'status', v_status,
    'points_awarded', v_points,
    'calculated_distance_m', round(v_dist::numeric, 1),
    'is_mock_location', p_is_mock
  );
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.attendance enable row level security;
alter table public.attendance_evidence enable row level security;
alter table public.attendance_verifications enable row level security;

-- Drop prior policies
drop policy if exists "Congregants view own attendance" on public.attendance;
drop policy if exists "Congregants insert own attendance" on public.attendance;
drop policy if exists "Admins manage all attendance" on public.attendance;
drop policy if exists "Admins manage attendance verifications" on public.attendance_verifications;
drop policy if exists "Admins manage attendance evidence" on public.attendance_evidence;

-- Policy 1: Congregants view their own attendance
create policy "Congregants view own attendance"
  on public.attendance for select to authenticated
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin', 'district_admin', 'mosque_admin')
    )
  );

-- Policy 2: Congregants can submit own attendance
create policy "Congregants insert own attendance"
  on public.attendance for insert to authenticated
  with check (auth.uid() = user_id);

-- Policy 3: Admins manage all attendance rows
create policy "Admins manage all attendance"
  on public.attendance for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin', 'district_admin', 'mosque_admin')
    )
  );

-- Policy 4: Attendance Evidence is readable by admins and owner
create policy "Admins manage attendance evidence"
  on public.attendance_evidence for all to authenticated
  using (
    exists (
      select 1 from public.attendance a
      where a.id = attendance_evidence.attendance_id
        and (
          a.user_id = auth.uid() or
          exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and ur.role in ('super_admin', 'state_admin', 'district_admin', 'mosque_admin')
          )
        )
    )
  );

-- Policy 5: Attendance Verifications readable by admins and owner
create policy "Admins manage attendance verifications"
  on public.attendance_verifications for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and ur.role in ('super_admin', 'state_admin', 'district_admin', 'mosque_admin')
    )
  );

-- Grants
grant select on public.attendance to anon, authenticated;
grant insert, update on public.attendance to authenticated;
grant select on public.attendance_review_queue_view to authenticated;
grant execute on function public.process_attendance_review to authenticated;
grant execute on function public.get_attendance_queue_metrics to authenticated;
grant execute on function public.submit_mobile_attendance to authenticated;

-- ==============================================================================
-- 13. SEED REALISTIC SUBMISSION RECORDS MATCHING ADMIN QUEUE (SAFE SEEDING)
-- Attaches sample review records to existing registered profiles and mosques
-- Wrapped in an exception block so missing demo profiles will never abort migration
-- ==============================================================================
do $$
declare
  v_u1 uuid;
  v_u2 uuid;
  v_u3 uuid;
  v_u4 uuid;
  v_m1 uuid;
  v_m2 uuid;
  v_m5 uuid;
  v_m6 uuid;
begin
  -- 1. Safely find profiles (lookup by username or link to existing system profiles)
  select id into v_u1 from public.profiles where username = 'fahad_calicut';
  if v_u1 is null then
    select id into v_u1 from public.profiles order by created_at asc limit 1;
  end if;

  select id into v_u2 from public.profiles where username = 'salman_mlp';
  if v_u2 is null then
    select id into v_u2 from public.profiles order by created_at asc offset 1 limit 1;
  end if;

  select id into v_u3 from public.profiles where username = 'aisha_ekm';
  if v_u3 is null then
    select id into v_u3 from public.profiles order by created_at asc offset 2 limit 1;
  end if;

  select id into v_u4 from public.profiles where username = 'zameer_knr';
  if v_u4 is null then
    select id into v_u4 from public.profiles order by created_at asc offset 3 limit 1;
  end if;

  -- 2. Lookup or link to existing registered mosques
  select id into v_m1 from public.mosques where name ilike '%Mishkal%' limit 1;
  if v_m1 is null then
    select id into v_m1 from public.mosques order by name asc limit 1;
  end if;

  select id into v_m5 from public.mosques where name ilike '%Valiya Juma%' limit 1;
  if v_m5 is null then
    select id into v_m5 from public.mosques order by name asc offset 1 limit 1;
  end if;

  select id into v_m6 from public.mosques where name ilike '%Edappally%' limit 1;
  if v_m6 is null then
    select id into v_m6 from public.mosques order by name asc offset 2 limit 1;
  end if;

  select id into v_m2 from public.mosques where name ilike '%Kallai%' limit 1;
  if v_m2 is null then
    select id into v_m2 from public.mosques order by name asc offset 3 limit 1;
  end if;

  -- Fallbacks if fewer mosques exist
  v_m5 := coalesce(v_m5, v_m1);
  v_m6 := coalesce(v_m6, v_m1);
  v_m2 := coalesce(v_m2, v_m1);

  -- 3. Only insert sample queue items if at least one valid profile and mosque exist
  if v_u1 is not null and v_m1 is not null then
    -- Row 1: Pending Review (Fajr, 42m, Device acc: ±8.4m, Authentic GPS)
    insert into public.attendance (
      user_id, mosque_id, prayer_type, prayer_date, status, points_awarded,
      device_accuracy_m, calculated_distance_m, is_mock_location, image_storage_path,
      image_sha256, submitted_at
    ) values (
      v_u1, v_m1, 'fajr', current_date, 'pending', 0,
      8.4, 42.0, false, 'evidence/fahad_fajr_evidence.jpg',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      now() - interval '25 minutes'
    )
    on conflict (user_id, prayer_type, prayer_date)
    do update set
      status = excluded.status,
      calculated_distance_m = excluded.calculated_distance_m,
      is_mock_location = excluded.is_mock_location;
  end if;

  if v_u2 is not null and v_m5 is not null then
    -- Row 2: Flagged (Fajr, 145m, Device acc: ±65m, Mock GPS Detected)
    insert into public.attendance (
      user_id, mosque_id, prayer_type, prayer_date, status, points_awarded,
      device_accuracy_m, calculated_distance_m, is_mock_location, image_storage_path,
      image_sha256, submitted_at
    ) values (
      v_u2, v_m5, 'fajr', current_date, 'flagged', 0,
      65.0, 145.0, true, 'evidence/salman_fajr_evidence.jpg',
      'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      now() - interval '18 minutes'
    )
    on conflict (user_id, prayer_type, prayer_date)
    do update set
      status = excluded.status,
      is_mock_location = excluded.is_mock_location,
      calculated_distance_m = excluded.calculated_distance_m;
  end if;

  if v_u3 is not null and v_m6 is not null then
    -- Row 3: Verified / +5 pts Awarded (Dhuhr, 28m, Device acc: ±12.1m, Authentic GPS)
    insert into public.attendance (
      user_id, mosque_id, prayer_type, prayer_date, status, points_awarded,
      device_accuracy_m, calculated_distance_m, is_mock_location, image_storage_path,
      image_sha256, submitted_at, verified_at
    ) values (
      v_u3, v_m6, 'dhuhr', current_date - interval '1 day', 'verified', 5,
      12.1, 28.0, false, 'evidence/aisha_dhuhr_evidence.jpg',
      '9876543210abcdef0123456789abcdef9876543210abcdef0123456789abcdef',
      now() - interval '1 day',
      now() - interval '23 hours'
    )
    on conflict (user_id, prayer_type, prayer_date)
    do update set
      status = excluded.status,
      points_awarded = excluded.points_awarded;
  end if;

  if v_u4 is not null and v_m2 is not null then
    -- Row 4: Pending Review (Isha, 68m, Device acc: ±22m, Authentic GPS)
    insert into public.attendance (
      user_id, mosque_id, prayer_type, prayer_date, status, points_awarded,
      device_accuracy_m, calculated_distance_m, is_mock_location, image_storage_path,
      image_sha256, submitted_at
    ) values (
      v_u4, v_m2, 'isha', current_date - interval '1 day', 'pending', 0,
      22.0, 68.0, false, 'evidence/zameer_isha_evidence.jpg',
      'f1e2d3c4b5a697887766554433221100ffeeddccbbaa99887766554433221100',
      now() - interval '1 day'
    )
    on conflict (user_id, prayer_type, prayer_date)
    do update set
      status = excluded.status,
      calculated_distance_m = excluded.calculated_distance_m;
  end if;

exception when others then
  -- Ignore seed notices so the core schema and procedures always complete successfully
  raise notice 'Attendance sample seed skipped: %', sqlerrm;
end;
$$;

-- ==============================================================================
-- 14. DIRECT SQL QUERIES FOR EVERY ACTION (READY TO EXECUTE IN SQL EDITOR)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- ACTION 1: APPROVE SUBMISSION (+5 POINTS)
-- ------------------------------------------------------------------------------
-- Calls the atomic procedure which updates attendance status, writes verification log,
-- awards +5 points into user_points ledger, updates streak, and logs to audit_logs:
--
-- SELECT public.process_attendance_review(
--   p_attendance_id => '00000000-0000-0000-0000-000000000000',
--   p_decision      => 'verified',
--   p_notes         => 'Approved congregant attendance verified via imam confirmation',
--   p_points        => 5
-- );
--
-- Or via direct SQL statements:
-- BEGIN;
--   UPDATE public.attendance
--   SET status = 'verified', points_awarded = 5, verified_at = now(), updated_at = now()
--   WHERE id = '<ATTENDANCE_ID>';
--
--   INSERT INTO public.attendance_verifications (attendance_id, reviewer_id, decision, review_notes)
--   VALUES ('<ATTENDANCE_ID>', auth.uid(), 'verified', 'Approved via admin dashboard');
--
--   INSERT INTO public.user_points (user_id, attendance_id, points, activity_type, reason)
--   VALUES ('<USER_ID>', '<ATTENDANCE_ID>', 5, 'prayer_attendance', 'Congregational prayer verified (+5 pts)');
-- COMMIT;

-- ------------------------------------------------------------------------------
-- ACTION 2: REJECT PROOF
-- ------------------------------------------------------------------------------
-- SELECT public.process_attendance_review(
--   p_attendance_id => '00000000-0000-0000-0000-000000000000',
--   p_decision      => 'rejected',
--   p_notes         => 'Photo does not show mosque interior / invalid submission',
--   p_points        => 0
-- );
--
-- Or via direct SQL:
-- BEGIN;
--   UPDATE public.attendance
--   SET status = 'rejected', points_awarded = 0, verified_at = null, updated_at = now()
--   WHERE id = '<ATTENDANCE_ID>';
--
--   INSERT INTO public.attendance_verifications (attendance_id, reviewer_id, decision, review_notes)
--   VALUES ('<ATTENDANCE_ID>', auth.uid(), 'rejected', 'Proof rejected by admin');
-- COMMIT;

-- ------------------------------------------------------------------------------
-- ACTION 3: FLAG AS SUSPICIOUS (ANTI-FRAUD QUEUE)
-- ------------------------------------------------------------------------------
-- SELECT public.process_attendance_review(
--   p_attendance_id => '00000000-0000-0000-0000-000000000000',
--   p_decision      => 'flagged',
--   p_notes         => 'Mock location provider detected; distance exceeds 100m geofence',
--   p_points        => 0
-- );
--
-- Or via direct SQL:
-- BEGIN;
--   UPDATE public.attendance
--   SET status = 'flagged', points_awarded = 0, updated_at = now()
--   WHERE id = '<ATTENDANCE_ID>';
--
--   INSERT INTO public.attendance_verifications (attendance_id, reviewer_id, decision, review_notes)
--   VALUES ('<ATTENDANCE_ID>', auth.uid(), 'flagged', 'Flagged as suspicious mock GPS');
-- COMMIT;

-- ------------------------------------------------------------------------------
-- ACTION 4: FETCH ATTENDANCE REVIEW QUEUE (WITH SEARCH & STATUS FILTERS)
-- ------------------------------------------------------------------------------
-- SELECT *
-- FROM public.attendance_review_queue_view
-- WHERE (
--   user_name ILIKE '%fahad%' OR
--   user_username ILIKE '%fahad%' OR
--   mosque_name ILIKE '%fahad%'
-- )
-- AND (status = 'pending' OR 'pending' = 'all')
-- ORDER BY submitted_at DESC
-- LIMIT 50;

-- ------------------------------------------------------------------------------
-- ACTION 5: GET LIVE HEADER COUNTERS (FLAGGED & AWAITING REVIEW)
-- ------------------------------------------------------------------------------
-- SELECT public.get_attendance_queue_metrics();


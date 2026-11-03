-- ==============================================================================
-- SalahNear: Consolidated Supabase Database Migration & Schema
-- Run this complete script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vopcihpgfqborlwwimyx/sql
-- ==============================================================================

begin;

-- 1. EXTENSIONS
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists postgis with schema extensions;

-- 2. PROFILES & ROLES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text unique,
  avatar_url text,
  district text,
  state text not null default 'Kerala',
  home_mosque_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (
    role in ('super_admin', 'state_admin', 'district_admin', 'mosque_admin', 'reviewer', 'user')
  ),
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.phone, 'Community Member'),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. MOSQUES DIRECTORY
create table if not exists public.mosques (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  alternate_name text,
  address text,
  city_or_locality text,
  district text not null,
  state text not null default 'Kerala',
  pincode text,
  location extensions.geography(Point, 4326) not null,
  contact_number text,
  source text,
  source_reference text,
  verification_status text not null default 'verified' check (
    verification_status in ('pending', 'under_review', 'verified', 'rejected', 'inactive')
  ),
  attendance_radius_m integer not null default 100,
  timezone text not null default 'Asia/Kolkata',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mosques_location_gix on public.mosques using gist(location);
create index if not exists mosques_district_idx on public.mosques(district);
create index if not exists mosques_active_status_idx on public.mosques(is_active, verification_status);

-- Add foreign key constraint to profiles now that mosques exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_home_mosque_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_home_mosque_fkey
      foreign key (home_mosque_id) references public.mosques(id) on delete set null;
  end if;
end;
$$;

-- 4. MOSQUE ADMINS
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

-- 5. PRAYER SCHEDULES
create table if not exists public.prayer_schedules (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  prayer_date date not null,
  fajr_start time not null,
  dhuhr_start time not null,
  asr_start time not null,
  maghrib_start time not null,
  isha_start time not null,
  fajr_iqamah time,
  dhuhr_iqamah time,
  asr_iqamah time,
  maghrib_iqamah time,
  isha_iqamah time,
  source_type text not null default 'admin_entry',
  approved_by uuid references public.profiles(id),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  unique(mosque_id, prayer_date)
);

create index if not exists prayer_schedules_lookup_idx on public.prayer_schedules(mosque_id, prayer_date);

-- 6. FRIENDSHIPS
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'rejected', 'blocked')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> receiver_id),
  unique(requester_id, receiver_id)
);

create index if not exists friendships_requester_idx on public.friendships(requester_id, status);
create index if not exists friendships_receiver_idx on public.friendships(receiver_id, status);

-- 7. ATTENDANCE
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  prayer_type text not null check (
    prayer_type in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')
  ),
  prayer_date date not null,
  status text not null default 'pending' check (
    status in ('pending', 'verified', 'flagged', 'rejected')
  ),
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  points_awarded integer not null default 0,
  idempotency_key text not null,
  unique(user_id, prayer_type, prayer_date),
  unique(user_id, idempotency_key)
);

create index if not exists attendance_user_date_idx on public.attendance(user_id, prayer_date);
create index if not exists attendance_mosque_prayer_idx on public.attendance(mosque_id, prayer_date, prayer_type);

-- 8. ATTENDANCE EVIDENCE
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

-- 9. VERIFICATIONS
create table if not exists public.attendance_verifications (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance(id) on delete cascade,
  reviewer_id uuid references public.profiles(id),
  decision text not null check (
    decision in ('approved', 'rejected', 'flagged')
  ),
  distance_m double precision,
  risk_score double precision default 0.0,
  review_notes text,
  reviewed_at timestamptz not null default now()
);

create index if not exists attendance_verifications_attendance_idx on public.attendance_verifications(attendance_id);

-- 10. POINTS LEDGER
create table if not exists public.user_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attendance_id uuid references public.attendance(id) on delete set null,
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_points_user_created_idx on public.user_points(user_id, created_at desc);

-- 11. SCORE AGGREGATES & LEADERBOARDS
create table if not exists public.user_streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_attendance_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_user_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score_date date not null,
  verified_count integer not null default 0,
  points_earned integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, score_date)
);

create index if not exists daily_user_scores_date_idx on public.daily_user_scores(score_date);

create or replace view public.leaderboard_view as
select
  p.id as user_id,
  p.full_name as display_name,
  p.avatar_url,
  p.district,
  m.name as mosque_name,
  coalesce(s.current_streak, 0) as current_streak,
  coalesce(sum(pt.points), 0)::integer as total_points
from public.profiles p
left join public.mosques m on m.id = p.home_mosque_id
left join public.user_streaks s on s.user_id = p.id
left join public.user_points pt on pt.user_id = p.id
group by p.id, p.full_name, p.avatar_url, p.district, m.name, s.current_streak;

-- 12. FRIEND ENCOUNTERS
create table if not exists public.friend_encounters (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references public.profiles(id) on delete cascade,
  user_high_id uuid not null references public.profiles(id) on delete cascade,
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  prayer_type text not null,
  prayer_date date not null,
  attendance_low_id uuid not null references public.attendance(id) on delete cascade,
  attendance_high_id uuid not null references public.attendance(id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'declined', 'expired')
  ),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  check (user_low_id < user_high_id),
  unique(attendance_low_id, attendance_high_id)
);

create table if not exists public.friend_encounter_responses (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.friend_encounters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  did_meet boolean not null,
  responded_at timestamptz not null default now(),
  unique(encounter_id, user_id)
);

create index if not exists friend_encounters_user_low_idx on public.friend_encounters(user_low_id);
create index if not exists friend_encounters_user_high_idx on public.friend_encounters(user_high_id);

-- 13. NOTIFICATIONS
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  updated_at timestamptz not null default now(),
  unique(user_id, token)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  fajr boolean not null default true,
  dhuhr boolean not null default true,
  asr boolean not null default true,
  maghrib boolean not null default true,
  isha boolean not null default true,
  iqamah_reminder_minutes integer not null default 10,
  enable_friend_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 14. AUDIT LOGS
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_table text not null,
  target_id text,
  changes jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_target_idx on public.audit_logs(target_table, target_id);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

-- 15. ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.mosques enable row level security;
alter table public.mosque_admins enable row level security;
alter table public.prayer_schedules enable row level security;
alter table public.friendships enable row level security;
alter table public.attendance enable row level security;
alter table public.attendance_evidence enable row level security;
alter table public.attendance_verifications enable row level security;
alter table public.user_points enable row level security;
alter table public.user_streaks enable row level security;
alter table public.daily_user_scores enable row level security;
alter table public.friend_encounters enable row level security;
alter table public.friend_encounter_responses enable row level security;
alter table public.device_tokens enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_logs enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Public profiles are readable by authenticated users" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Active mosques are viewable by everyone" on public.mosques;
drop policy if exists "Prayer schedules are readable by everyone" on public.prayer_schedules;
drop policy if exists "Users can view their own friendships" on public.friendships;
drop policy if exists "Users can send friend requests" on public.friendships;
drop policy if exists "Users can update their received friend requests" on public.friendships;
drop policy if exists "Users can view their own attendance" on public.attendance;
drop policy if exists "Users can submit pending attendance" on public.attendance;
drop policy if exists "Users can insert their own attendance evidence" on public.attendance_evidence;
drop policy if exists "Users can view their own evidence" on public.attendance_evidence;
drop policy if exists "Users can view their own points ledger" on public.user_points;
drop policy if exists "User streaks are readable by authenticated users" on public.user_streaks;
drop policy if exists "Users can view encounters they are involved in" on public.friend_encounters;
drop policy if exists "Users can respond to their encounters" on public.friend_encounter_responses;
drop policy if exists "Users manage their own device tokens" on public.device_tokens;
drop policy if exists "Users manage their own notification preferences" on public.notification_preferences;

-- Apply policies
create policy "Public profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "Active mosques are viewable by everyone"
  on public.mosques for select to anon, authenticated
  using (is_active = true);

create policy "Prayer schedules are readable by everyone"
  on public.prayer_schedules for select to anon, authenticated
  using (true);

create policy "Users can view their own friendships"
  on public.friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

create policy "Users can send friend requests"
  on public.friendships for insert to authenticated
  with check (auth.uid() = requester_id);

create policy "Users can update their received friend requests"
  on public.friendships for update to authenticated
  using (auth.uid() = receiver_id or auth.uid() = requester_id);

create policy "Users can view their own attendance"
  on public.attendance for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can submit pending attendance"
  on public.attendance for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending' and points_awarded = 0);

create policy "Users can insert their own attendance evidence"
  on public.attendance_evidence for insert to authenticated
  with check (exists (select 1 from public.attendance a where a.id = attendance_id and a.user_id = auth.uid()));

create policy "Users can view their own evidence"
  on public.attendance_evidence for select to authenticated
  using (exists (select 1 from public.attendance a where a.id = attendance_id and a.user_id = auth.uid()));

create policy "Users can view their own points ledger"
  on public.user_points for select to authenticated
  using (auth.uid() = user_id);

create policy "User streaks are readable by authenticated users"
  on public.user_streaks for select to authenticated using (true);

create policy "Users can view encounters they are involved in"
  on public.friend_encounters for select to authenticated
  using (auth.uid() = user_low_id or auth.uid() = user_high_id);

create policy "Users can respond to their encounters"
  on public.friend_encounter_responses for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users manage their own device tokens"
  on public.device_tokens for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own notification preferences"
  on public.notification_preferences for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 16. POSTGIS STORED FUNCTIONS

-- Nearby Mosques RPC
create or replace function public.nearby_mosques(
  user_lat double precision,
  user_lng double precision,
  radius_m integer default 5000
)
returns table (
  id uuid,
  name text,
  alternate_name text,
  address text,
  city_or_locality text,
  district text,
  state text,
  pincode text,
  latitude double precision,
  longitude double precision,
  attendance_radius_m integer,
  verification_status text,
  is_active boolean,
  distance_m double precision
)
language sql
stable
security definer
as $$
  select
    m.id,
    m.name,
    m.alternate_name,
    m.address,
    m.city_or_locality,
    m.district,
    m.state,
    m.pincode,
    extensions.st_y(m.location::extensions.geometry) as latitude,
    extensions.st_x(m.location::extensions.geometry) as longitude,
    m.attendance_radius_m,
    m.verification_status,
    m.is_active,
    extensions.st_distance(
      m.location,
      extensions.st_setsrid(
        extensions.st_makepoint(user_lng, user_lat),
        4326
      )::extensions.geography
    ) as distance_m
  from public.mosques m
  where m.is_active = true
    and m.verification_status = 'verified'
    and extensions.st_dwithin(
      m.location,
      extensions.st_setsrid(
        extensions.st_makepoint(user_lng, user_lat),
        4326
      )::extensions.geography,
      radius_m
    )
  order by distance_m;
$$;

-- Process and Verify Attendance
create or replace function public.process_attendance_verification(
  p_attendance_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_attendance public.attendance%rowtype;
  v_evidence public.attendance_evidence%rowtype;
  v_mosque public.mosques%rowtype;
  v_distance_m double precision;
  v_points integer := 20;
  v_streak public.user_streaks%rowtype;
  v_friend record;
begin
  select * into v_attendance
  from public.attendance
  where id = p_attendance_id and status = 'pending';

  if not found then
    return jsonb_build_object('success', false, 'message', 'Attendance record not found or already processed');
  end if;

  select * into v_evidence
  from public.attendance_evidence
  where attendance_id = p_attendance_id;

  select * into v_mosque
  from public.mosques
  where id = v_attendance.mosque_id;

  v_distance_m := extensions.st_distance(
    v_mosque.location,
    extensions.st_setsrid(
      extensions.st_makepoint(v_evidence.device_longitude, v_evidence.device_latitude),
      4326
    )::extensions.geography
  );

  if v_distance_m <= (v_mosque.attendance_radius_m + coalesce(v_evidence.device_accuracy_m, 20.0)) then
    if v_attendance.prayer_type = 'fajr' then
      v_points := 25;
    else
      v_points := 20;
    end if;

    update public.attendance
    set status = 'verified',
        verified_at = now(),
        points_awarded = v_points
    where id = p_attendance_id;

    insert into public.user_points (user_id, attendance_id, points, reason)
    values (v_attendance.user_id, p_attendance_id, v_points, 'Mosque prayer: ' || v_attendance.prayer_type);

    insert into public.user_streaks (user_id, current_streak, longest_streak, last_attendance_date, updated_at)
    values (v_attendance.user_id, 1, 1, v_attendance.prayer_date, now())
    on conflict (user_id) do update set
      current_streak = case
        when user_streaks.last_attendance_date = v_attendance.prayer_date then user_streaks.current_streak
        when user_streaks.last_attendance_date = (v_attendance.prayer_date - interval '1 day')::date then user_streaks.current_streak + 1
        else 1
      end,
      longest_streak = greatest(
        user_streaks.longest_streak,
        case
          when user_streaks.last_attendance_date = (v_attendance.prayer_date - interval '1 day')::date then user_streaks.current_streak + 1
          else 1
        end
      ),
      last_attendance_date = v_attendance.prayer_date,
      updated_at = now();

    for v_friend in
      select a.id as friend_attendance_id, a.user_id as friend_user_id
      from public.attendance a
      join public.friendships f
        on (f.requester_id = v_attendance.user_id and f.receiver_id = a.user_id)
        or (f.receiver_id = v_attendance.user_id and f.requester_id = a.user_id)
      where f.status = 'accepted'
        and a.mosque_id = v_attendance.mosque_id
        and a.prayer_date = v_attendance.prayer_date
        and a.prayer_type = v_attendance.prayer_type
        and a.status = 'verified'
        and a.user_id <> v_attendance.user_id
    loop
      insert into public.friend_encounters (
        user_low_id, user_high_id, mosque_id, prayer_type, prayer_date, attendance_low_id, attendance_high_id
      )
      values (
        least(v_attendance.user_id, v_friend.friend_user_id),
        greatest(v_attendance.user_id, v_friend.friend_user_id),
        v_attendance.mosque_id,
        v_attendance.prayer_type,
        v_attendance.prayer_date,
        case when v_attendance.user_id < v_friend.friend_user_id then p_attendance_id else v_friend.friend_attendance_id end,
        case when v_attendance.user_id > v_friend.friend_user_id then p_attendance_id else v_friend.friend_attendance_id end
      )
      on conflict do nothing;
    end loop;

    return jsonb_build_object(
      'success', true,
      'status', 'verified',
      'points', v_points,
      'distance_m', v_distance_m
    );
  else
    update public.attendance set status = 'flagged' where id = p_attendance_id;

    insert into public.attendance_verifications (
      attendance_id, decision, distance_m, risk_score, review_notes
    )
    values (
      p_attendance_id, 'flagged', v_distance_m, 0.75,
      'Submitted location was ' || round(v_distance_m::numeric, 1) || 'm from mosque center.'
    );

    return jsonb_build_object(
      'success', false,
      'status', 'flagged',
      'message', 'Location is outside mosque geofence',
      'distance_m', v_distance_m
    );
  end if;
end;
$$;

-- 17. INITIAL SEED MOSQUES FOR KERALA
insert into public.mosques (
  id, name, alternate_name, address, city_or_locality, district, state, location, attendance_radius_m, verification_status, is_active
) values
  (
    'a1111111-1111-1111-1111-111111111111',
    'Mishkal Mosque (കുറ്റിച്ചിറ മിശ്കാൽ പള്ളി)',
    'Mishkal Palli',
    'Kuttichira',
    'Kozhikode',
    'Kozhikode',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(75.7766, 11.2425), 4326)::extensions.geography,
    120,
    'verified',
    true
  ),
  (
    'a2222222-2222-2222-2222-222222222222',
    'Cheraman Juma Mosque (ചേരമാൻ ജുമാ മസ്ജിദ്)',
    'Oldest Mosque in India (629 CE)',
    'Methala, Kodungallur',
    'Kodungallur',
    'Thrissur',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(76.2001, 10.2163), 4326)::extensions.geography,
    150,
    'verified',
    true
  ),
  (
    'a3333333-3333-3333-3333-333333333333',
    'Palayam Juma Masjid (പാളയം ജുമാ മസ്ജിദ്)',
    'Masjid-i Jahan-Numa',
    'Palayam',
    'Thiruvananthapuram',
    'Thiruvananthapuram',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(76.9515, 8.5033), 4326)::extensions.geography,
    120,
    'verified',
    true
  ),
  (
    'a4444444-4444-4444-4444-444444444444',
    'Kozhikode Town Juma Masjid (ടൗൺ ജുമാ മസ്ജിദ്)',
    'Calicut Big Bazaar Mosque',
    'Palayam',
    'Kozhikode',
    'Kozhikode',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(75.7820, 11.2510), 4326)::extensions.geography,
    100,
    'verified',
    true
  ),
  (
    'a5555555-5555-5555-5555-555555555555',
    'Chembittapally (ചെമ്പിട്ടപള്ളി)',
    'Kochi Copper-Roof Mosque',
    'Kochangadi, Mattancherry',
    'Kochi',
    'Ernakulam',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(76.2570, 9.9525), 4326)::extensions.geography,
    100,
    'verified',
    true
  ),
  (
    'a6666666-6666-6666-6666-666666666666',
    'Malappuram Valiya Juma Masjid (വലിയ ജുമാ മസ്ജിദ്)',
    'Malappuram Town Mosque',
    'Valiyangadi',
    'Malappuram',
    'Malappuram',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(76.0711, 11.0722), 4326)::extensions.geography,
    110,
    'verified',
    true
  ),
  (
    'a7777777-7777-7777-7777-777777777777',
    'Malik Deenar Juma Masjid (മാലിക് ദീനാർ പള്ളി)',
    'Historical Malik Deenar Shrine & Mosque',
    'Thalangara',
    'Kasaragod',
    'Kasaragod',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(74.9866, 12.4925), 4326)::extensions.geography,
    140,
    'verified',
    true
  )
on conflict (id) do nothing;

insert into public.prayer_schedules (
  mosque_id, prayer_date, fajr_start, dhuhr_start, asr_start, maghrib_start, isha_start,
  fajr_iqamah, dhuhr_iqamah, asr_iqamah, maghrib_iqamah, isha_iqamah, source_type
) values (
  'a1111111-1111-1111-1111-111111111111',
  current_date,
  '05:05:00', '12:15:00', '15:35:00', '18:05:00', '19:20:00',
  '05:30:00', '12:45:00', '16:00:00', '18:15:00', '19:45:00',
  'verified_timetable'
)
on conflict (mosque_id, prayer_date) do nothing;

commit;

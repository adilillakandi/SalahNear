-- ==============================================================================
-- 012_friend_encounters.sql
-- Mosque encounter detection for connected friends
-- ==============================================================================

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

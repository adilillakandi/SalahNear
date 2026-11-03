-- ==============================================================================
-- 013_notifications.sql
-- Device tokens and notification preferences
-- ==============================================================================

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

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  payload jsonb,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

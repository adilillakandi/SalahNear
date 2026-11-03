-- ==============================================================================
-- 006_friendships.sql
-- Opt-in Friend Connections & Statuses
-- ==============================================================================

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

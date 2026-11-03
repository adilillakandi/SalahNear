-- ==============================================================================
-- 004_mosque_admins.sql
-- Mosque-specific administrator assignments
-- ==============================================================================

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

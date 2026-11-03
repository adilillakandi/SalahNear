-- ==============================================================================
-- 014_audit_logs.sql
-- Immutable administrative audit logs for attendance and score changes
-- ==============================================================================

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

create index if not exists audit_logs_target_idx
  on public.audit_logs(target_table, target_id);

create index if not exists audit_logs_created_idx
  on public.audit_logs(created_at desc);

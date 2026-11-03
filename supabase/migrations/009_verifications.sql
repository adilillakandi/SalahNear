-- ==============================================================================
-- 009_verifications.sql
-- Attendance verification reviews, risk evaluations, and reviewer actions
-- ==============================================================================

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

create index if not exists attendance_verifications_attendance_idx
  on public.attendance_verifications(attendance_id);

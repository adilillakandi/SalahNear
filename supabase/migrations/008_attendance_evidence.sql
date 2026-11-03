-- ==============================================================================
-- 008_attendance_evidence.sql
-- Private photo and metadata evidence submitted with attendance
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

create index if not exists attendance_evidence_attendance_idx
  on public.attendance_evidence(attendance_id);

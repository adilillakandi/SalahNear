-- ==============================================================================
-- SALAHNEAR: MOSQUE EVENTS SCHEMA & OPERATION SCRIPTS
-- Table, Constraints, Indexes, RLS Policies, Audit Triggers, and Stored Procedures
-- Compatible with PostgreSQL 15+ / Supabase
-- ==============================================================================

-- 1. TABLE DEFINITION
create table if not exists public.mosque_events (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  title text not null,
  description text,
  event_date timestamptz not null,
  venue text,
  image_url text,
  status text not null default 'published' check (status in ('draft', 'published', 'completed', 'cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. PERFORMANCE INDEXES
create index if not exists mosque_events_mosque_idx on public.mosque_events(mosque_id, event_date);
create index if not exists mosque_events_status_idx on public.mosque_events(status);
create index if not exists mosque_events_date_idx on public.mosque_events(event_date desc);

-- 3. AUTO-UPDATE UPDATED_AT TRIGGER
create or replace function public.set_mosque_events_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_mosque_events_updated_at on public.mosque_events;
create trigger trg_mosque_events_updated_at
  before update on public.mosque_events
  for each row execute function public.set_mosque_events_updated_at();

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.mosque_events enable row level security;

-- Drop existing policies if they exist to avoid duplicate conflicts
drop policy if exists "Public can view mosque events" on public.mosque_events;
drop policy if exists "Admins manage mosque events" on public.mosque_events;
drop policy if exists "Public view published or completed events" on public.mosque_events;
drop policy if exists "Admins full access on mosque events" on public.mosque_events;

-- Policy 1: Public read access for published and completed events
create policy "Public view published or completed events"
  on public.mosque_events for select to anon, authenticated
  using (status in ('published', 'completed'));

-- Policy 2: Full CRUD access for Super Admins and assigned Mosque Admins
create policy "Admins full access on mosque events"
  on public.mosque_events for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and (
          ur.role in ('super_admin', 'state_admin', 'district_admin') or
          exists (
            select 1 from public.mosque_admins ma
            where ma.user_id = auth.uid() and ma.mosque_id = mosque_events.mosque_id
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and (
          ur.role in ('super_admin', 'state_admin', 'district_admin') or
          exists (
            select 1 from public.mosque_admins ma
            where ma.user_id = auth.uid() and ma.mosque_id = mosque_events.mosque_id
          )
        )
    )
  );

-- Grant appropriate permissions
grant select, insert, update, delete on public.mosque_events to authenticated;
grant select on public.mosque_events to anon;

-- ==============================================================================
-- 5. AUDIT LOGGING TRIGGER (AUTOMATIC AUDIT FOR CREATE / STATUS UPDATE / DELETE)
-- ==============================================================================
create or replace function public.log_mosque_event_audit()
returns trigger as $$
declare
  current_actor text := coalesce(auth.jwt() ->> 'email', 'Admin User');
  log_action text;
begin
  if (TG_OP = 'INSERT') then
    log_action := 'MOSQUE_EVENT_CREATED';
    insert into public.audit_logs (actor_name, action, target_table, target_id, changes)
    values (
      current_actor,
      log_action,
      'mosque_events',
      new.id::text,
      jsonb_build_object('title', new.title, 'status', new.status, 'mosque_id', new.mosque_id, 'event_date', new.event_date)
    );
    return new;
  elsif (TG_OP = 'UPDATE') then
    if old.status <> new.status then
      if new.status = 'completed' then
        log_action := 'MOSQUE_EVENT_COMPLETED';
      elsif new.status = 'cancelled' then
        log_action := 'MOSQUE_EVENT_CANCELLED';
      elsif new.status = 'published' and old.status = 'completed' then
        log_action := 'MOSQUE_EVENT_REOPENED';
      elsif new.status = 'published' and old.status = 'cancelled' then
        log_action := 'MOSQUE_EVENT_REACTIVATED';
      else
        log_action := 'MOSQUE_EVENT_STATUS_UPDATED';
      end if;
    else
      log_action := 'MOSQUE_EVENT_UPDATED';
    end if;

    insert into public.audit_logs (actor_name, action, target_table, target_id, changes)
    values (
      current_actor,
      log_action,
      'mosque_events',
      new.id::text,
      jsonb_build_object(
        'title', new.title,
        'old_status', old.status,
        'new_status', new.status,
        'updated_at', new.updated_at
      )
    );
    return new;
  elsif (TG_OP = 'DELETE') then
    log_action := 'MOSQUE_EVENT_DELETED';
    insert into public.audit_logs (actor_name, action, target_table, target_id, changes)
    values (
      current_actor,
      log_action,
      'mosque_events',
      old.id::text,
      jsonb_build_object('title', old.title, 'mosque_id', old.mosque_id, 'final_status', old.status)
    );
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_mosque_event_audit on public.mosque_events;
create trigger trg_mosque_event_audit
  after insert or update or delete on public.mosque_events
  for each row execute function public.log_mosque_event_audit();

-- ==============================================================================
-- 6. STORED PROCEDURES / RPC FUNCTIONS FOR ALL ACTIONS
-- ==============================================================================

-- A. Create Mosque Event
create or replace function public.create_mosque_event(
  p_mosque_id uuid,
  p_title text,
  p_description text,
  p_event_date timestamptz,
  p_venue text default null,
  p_image_url text default null
)
returns public.mosque_events as $$
declare
  v_new_event public.mosque_events;
begin
  insert into public.mosque_events (
    mosque_id,
    title,
    description,
    event_date,
    venue,
    image_url,
    status,
    created_by
  ) values (
    p_mosque_id,
    p_title,
    p_description,
    p_event_date,
    p_venue,
    p_image_url,
    'published',
    auth.uid()
  )
  returning * into v_new_event;

  return v_new_event;
end;
$$ language plpgsql security definer;

-- B. Mark Completed
create or replace function public.mark_mosque_event_completed(p_event_id uuid)
returns public.mosque_events as $$
declare
  v_updated public.mosque_events;
begin
  update public.mosque_events
  set status = 'completed', updated_at = now()
  where id = p_event_id
  returning * into v_updated;

  if not found then
    raise exception 'Mosque event with ID % not found', p_event_id;
  end if;

  return v_updated;
end;
$$ language plpgsql security definer;

-- C. Cancel Event
create or replace function public.cancel_mosque_event(p_event_id uuid)
returns public.mosque_events as $$
declare
  v_updated public.mosque_events;
begin
  update public.mosque_events
  set status = 'cancelled', updated_at = now()
  where id = p_event_id
  returning * into v_updated;

  if not found then
    raise exception 'Mosque event with ID % not found', p_event_id;
  end if;

  return v_updated;
end;
$$ language plpgsql security definer;

-- D. Reopen Event (from Completed back to Published)
create or replace function public.reopen_mosque_event(p_event_id uuid)
returns public.mosque_events as $$
declare
  v_updated public.mosque_events;
begin
  update public.mosque_events
  set status = 'published', updated_at = now()
  where id = p_event_id
  returning * into v_updated;

  if not found then
    raise exception 'Mosque event with ID % not found', p_event_id;
  end if;

  return v_updated;
end;
$$ language plpgsql security definer;

-- E. Reactivate Event (from Cancelled back to Published)
create or replace function public.reactivate_mosque_event(p_event_id uuid)
returns public.mosque_events as $$
begin
  return public.reopen_mosque_event(p_event_id);
end;
$$ language plpgsql security definer;

-- F. Delete Event
create or replace function public.delete_mosque_event(p_event_id uuid)
returns boolean as $$
begin
  delete from public.mosque_events
  where id = p_event_id;

  if not found then
    raise exception 'Mosque event with ID % not found', p_event_id;
  end if;

  return true;
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 7. DIRECT SQL QUERY EXAMPLES (CAN BE RUN DIRECTLY IN SUPABASE SQL EDITOR)
-- ==============================================================================

/*
-- [1] CREATE A NEW EVENT:
INSERT INTO public.mosque_events (
  mosque_id,
  title,
  description,
  event_date,
  venue,
  status
) VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'Special Ramadan Tafseer Circle',
  'Weekly post-Asr reflection and Quranic study circle.',
  '2026-11-20 16:30:00+05:30',
  'Main Prayer Hall',
  'published'
);

-- [2] MARK EVENT AS COMPLETED:
UPDATE public.mosque_events
SET status = 'completed', updated_at = now()
WHERE id = '<EVENT_UUID>';

-- [3] CANCEL AN EVENT:
UPDATE public.mosque_events
SET status = 'cancelled', updated_at = now()
WHERE id = '<EVENT_UUID>';

-- [4] RE-OPEN A COMPLETED EVENT:
UPDATE public.mosque_events
SET status = 'published', updated_at = now()
WHERE id = '<EVENT_UUID>';

-- [5] REACTIVATE A CANCELLED EVENT:
UPDATE public.mosque_events
SET status = 'published', updated_at = now()
WHERE id = '<EVENT_UUID>';

-- [6] DELETE AN EVENT PERMANENTLY:
DELETE FROM public.mosque_events
WHERE id = '<EVENT_UUID>';
*/

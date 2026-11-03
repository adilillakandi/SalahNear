-- ==============================================================================
-- 015_rls_policies.sql
-- Row Level Security (RLS) policies enforcing backend-authoritative rules
-- ==============================================================================

-- 1. Enable RLS on all sensitive tables
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

-- 2. Profiles Policies
create policy "Public profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3. Mosques Policies (Publicly readable for discovery)
create policy "Active mosques are viewable by everyone"
  on public.mosques for select
  to anon, authenticated
  using (is_active = true);

-- 4. Prayer Schedules Policies
create policy "Prayer schedules are readable by everyone"
  on public.prayer_schedules for select
  to anon, authenticated
  using (true);

-- 5. Friendships Policies
create policy "Users can view their own friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

create policy "Users can send friend requests"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "Users can update their received friend requests"
  on public.friendships for update
  to authenticated
  using (auth.uid() = receiver_id or auth.uid() = requester_id);

-- 6. Attendance Policies (Client can submit, but cannot mark verified)
create policy "Users can view their own attendance"
  on public.attendance for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can submit pending attendance"
  on public.attendance for insert
  to authenticated
  with check (
    auth.uid() = user_id and
    status = 'pending' and
    points_awarded = 0
  );

-- 7. Attendance Evidence Policies (Strictly private photos)
create policy "Users can insert their own attendance evidence"
  on public.attendance_evidence for insert
  to authenticated
  with check (
    exists (
      select 1 from public.attendance a
      where a.id = attendance_id
        and a.user_id = auth.uid()
    )
  );

create policy "Users can view their own evidence"
  on public.attendance_evidence for select
  to authenticated
  using (
    exists (
      select 1 from public.attendance a
      where a.id = attendance_id
        and a.user_id = auth.uid()
    )
  );

-- 8. Points Ledger Policies (Append-only by backend/functions)
create policy "Users can view their own points ledger"
  on public.user_points for select
  to authenticated
  using (auth.uid() = user_id);

-- 9. Streaks Policies
create policy "User streaks are readable by authenticated users"
  on public.user_streaks for select
  to authenticated
  using (true);

-- 10. Friend Encounters Policies
create policy "Users can view encounters they are involved in"
  on public.friend_encounters for select
  to authenticated
  using (auth.uid() = user_low_id or auth.uid() = user_high_id);

create policy "Users can respond to their encounters"
  on public.friend_encounter_responses for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 11. Device Tokens & Preferences
create policy "Users manage their own device tokens"
  on public.device_tokens for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own notification preferences"
  on public.notification_preferences for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

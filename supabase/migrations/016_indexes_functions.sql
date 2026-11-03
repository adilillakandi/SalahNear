-- ==============================================================================
-- 016_indexes_functions.sql
-- PostGIS RPC functions, verified attendance workflow, and encounter matching
-- ==============================================================================

-- 1. Nearby Mosques PostGIS Function (as specified in Section 7 of Guide)
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

-- 2. Trusted Verification & Points Awarding Procedure
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
  v_points integer := 20; -- default 20, fajr 25
  v_streak public.user_streaks%rowtype;
  v_friend record;
begin
  -- 1. Load attendance record
  select * into v_attendance
  from public.attendance
  where id = p_attendance_id and status = 'pending';

  if not found then
    return jsonb_build_object('success', false, 'message', 'Attendance record not found or already processed');
  end if;

  -- 2. Load evidence and mosque
  select * into v_evidence
  from public.attendance_evidence
  where attendance_id = p_attendance_id;

  select * into v_mosque
  from public.mosques
  where id = v_attendance.mosque_id;

  -- 3. Calculate distance between device coordinates and mosque
  v_distance_m := extensions.st_distance(
    v_mosque.location,
    extensions.st_setsrid(
      extensions.st_makepoint(v_evidence.device_longitude, v_evidence.device_latitude),
      4326
    )::extensions.geography
  );

  -- 4. Check Geofence verification (within radius)
  if v_distance_m <= (v_mosque.attendance_radius_m + coalesce(v_evidence.device_accuracy_m, 20.0)) then
    -- Set points based on prayer
    if v_attendance.prayer_type = 'fajr' then
      v_points := 25;
    else
      v_points := 20;
    end if;

    -- Update attendance record to verified
    update public.attendance
    set status = 'verified',
        verified_at = now(),
        points_awarded = v_points
    where id = p_attendance_id;

    -- Insert into points ledger
    insert into public.user_points (user_id, attendance_id, points, reason)
    values (v_attendance.user_id, p_attendance_id, v_points, 'Mosque prayer: ' || v_attendance.prayer_type);

    -- Update user streak
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

    -- 5. Detect friend encounters at the same mosque & prayer session
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
        user_low_id,
        user_high_id,
        mosque_id,
        prayer_type,
        prayer_date,
        attendance_low_id,
        attendance_high_id
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
    -- Geofence exceeded: mark as flagged for manual review
    update public.attendance
    set status = 'flagged'
    where id = p_attendance_id;

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

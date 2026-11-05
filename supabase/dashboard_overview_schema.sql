-- ==============================================================================
-- SALAHNEAR: DASHBOARD OVERVIEW & ANALYTICS COMPLETE SCHEMA
-- Powers the centralized Dashboard Overview (/), KPI telemetry,
-- 14-district coverage aggregation, and role-adaptive analytics.
-- PostgreSQL 15+ / Supabase Compatible
-- ==============================================================================

-- 1. DISTRICT COVERAGE SUMMARY VIEW
create or replace view public.district_coverage_view
with (security_invoker = on)
as
select
  coalesce(m.district, 'Unknown') as district_name,
  count(m.id) as total_mosques,
  count(m.id) filter (where m.verification_status = 'verified') as verified_mosques,
  count(m.id) filter (where m.verification_status in ('pending', 'under_review', 'needs_correction')) as staging_mosques,
  coalesce(
    (
      select count(a.id)
      from public.attendance a
      join public.mosques m2 on m2.id = a.mosque_id
      where m2.district = m.district
        and a.prayer_date = current_date
    ), 0
  ) as today_prayers_count
from public.mosques m
where m.district is not null
group by m.district
order by total_mosques desc;

grant select on public.district_coverage_view to authenticated, anon;

-- ==============================================================================
-- 2. ATOMIC STORED PROCEDURE: GET DASHBOARD OVERVIEW METRICS
-- Returns consolidated platform telemetry, role-scoped KPIs, and recent audit logs
-- in a single blazing-fast database round-trip.
-- ==============================================================================
create or replace function public.get_dashboard_overview_metrics(
  p_district text default null,
  p_mosque_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_total_mosques integer := 0;
  v_verified_mosques integer := 0;
  v_staging_mosques integer := 0;
  v_today_checkins integer := 0;
  v_today_verified_checkins integer := 0;
  v_flagged_queue_count integer := 0;
  v_total_users integer := 0;
  v_active_streaks integer := 0;
  v_open_disputes integer := 0;
  v_recent_audit jsonb := '[]'::jsonb;
  v_district_summary jsonb := '[]'::jsonb;
  v_today_iqamah jsonb := null;
begin
  -- 1. MOSQUES KPI
  if p_mosque_id is not null then
    select
      count(*),
      count(*) filter (where verification_status = 'verified'),
      count(*) filter (where verification_status != 'verified')
    into v_total_mosques, v_verified_mosques, v_staging_mosques
    from public.mosques where id = p_mosque_id;
  elsif p_district is not null and p_district != 'all' and p_district != 'All Districts' then
    select
      count(*),
      count(*) filter (where verification_status = 'verified'),
      count(*) filter (where verification_status != 'verified')
    into v_total_mosques, v_verified_mosques, v_staging_mosques
    from public.mosques where district = p_district;
  else
    select
      count(*),
      count(*) filter (where verification_status = 'verified'),
      count(*) filter (where verification_status != 'verified')
    into v_total_mosques, v_verified_mosques, v_staging_mosques
    from public.mosques;
  end if;

  -- 2. ATTENDANCE & REVIEW QUEUE KPI
  if p_mosque_id is not null then
    select
      count(*),
      count(*) filter (where status = 'verified'),
      count(*) filter (where status in ('pending', 'flagged'))
    into v_today_checkins, v_today_verified_checkins, v_flagged_queue_count
    from public.attendance
    where mosque_id = p_mosque_id and prayer_date = current_date;
  else
    select
      count(*),
      count(*) filter (where status = 'verified'),
      count(*) filter (where status in ('pending', 'flagged'))
    into v_today_checkins, v_today_verified_checkins, v_flagged_queue_count
    from public.attendance
    where prayer_date = current_date;
  end if;

  -- 3. USER CONGREGANTS & STREAKS
  select count(*) into v_total_users from public.profiles;

  select count(distinct user_id) into v_active_streaks
  from public.attendance
  where prayer_date >= current_date - interval '7 days'
    and status = 'verified';

  -- 4. OPEN SUPPORT DISPUTES
  select count(*) into v_open_disputes
  from public.support_cases
  where status in ('open', 'in_progress', 'waiting_for_user');

  -- 5. RECENT AUDIT LOGS (LATEST 5)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', al.id,
        'action', al.action,
        'actor_name', al.actor_name,
        'entity_type', coalesce(al.entity_type, al.target_table),
        'entity_id', coalesce(al.entity_id, al.target_id),
        'reason', al.reason,
        'created_at', al.created_at
      )
    ), '[]'::jsonb
  ) into v_recent_audit
  from (
    select * from public.audit_logs
    order by created_at desc
    limit 5
  ) al;

  -- 6. DISTRICT COVERAGE SUMMARY
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', district_name,
        'mosques', total_mosques,
        'verified', verified_mosques,
        'staging', staging_mosques,
        'prayersToday', today_prayers_count
      )
    ), '[]'::jsonb
  ) into v_district_summary
  from public.district_coverage_view;

  -- 7. MOSQUE ADMIN SPECIFIC IQAMAH TIMETABLE
  if p_mosque_id is not null then
    select jsonb_build_object(
      'fajr', fajr_iqamah,
      'dhuhr', dhuhr_iqamah,
      'asr', asr_iqamah,
      'maghrib', maghrib_iqamah,
      'isha', isha_iqamah,
      'jummah', jummah_iqamah
    ) into v_today_iqamah
    from public.prayer_schedules
    where mosque_id = p_mosque_id
      and effective_from <= current_date
      and (effective_until is null or effective_until >= current_date)
    order by effective_from desc
    limit 1;
  end if;

  return jsonb_build_object(
    'total_mosques', v_total_mosques,
    'verified_mosques', v_verified_mosques,
    'staging_mosques', v_staging_mosques,
    'today_checkins', v_today_checkins,
    'today_verified_checkins', v_today_verified_checkins,
    'flagged_queue_count', v_flagged_queue_count,
    'total_users', v_total_users,
    'active_streaks', v_active_streaks,
    'open_disputes', v_open_disputes,
    'recent_audit_logs', v_recent_audit,
    'district_summary', v_district_summary,
    'today_iqamah', v_today_iqamah
  );
end;
$$;

grant execute on function public.get_dashboard_overview_metrics(text, uuid) to authenticated, anon;


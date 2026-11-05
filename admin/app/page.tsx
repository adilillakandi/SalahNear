'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/lib/auth-context';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  MapPin,
  Clock,
  QrCode,
  ShieldCheck,
  Users,
  LifeBuoy,
  FileText,
  UserCog,
  CalendarDays,
  ShieldAlert,
  RotateCcw,
  Loader2,
  Activity,
  Sparkles,
} from 'lucide-react';

interface DistrictCoverageItem {
  name: string;
  mosques: number;
  verified: number;
  staging?: number;
  prayersToday: number;
}

interface RecentAuditItem {
  id: string;
  action: string;
  actor_name: string;
  entity_type: string;
  entity_id: string;
  reason?: string;
  created_at: string;
}

interface MosqueTimetableItem {
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
  jummah?: string;
}

export default function DashboardOverviewPage() {
  const { role, activeDistrict, activeMosqueId, adminUser } = useAdminAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    totalMosques: 0,
    verifiedMosques: 0,
    stagingMosques: 0,
    todayCheckIns: 0,
    todayVerifiedCheckIns: 0,
    flaggedQueueCount: 0,
    totalUsers: 0,
    activeStreaksCount: 0,
    openDisputesCount: 0,
  });

  const [districtStats, setDistrictStats] = useState<DistrictCoverageItem[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<RecentAuditItem[]>([]);
  const [mosqueTimetable, setMosqueTimetable] = useState<MosqueTimetableItem | null>(null);
  const [assignedMosqueName, setAssignedMosqueName] = useState<string>('Assigned Mosque');

  useEffect(() => {
    loadDashboardData();
  }, [role, activeDistrict, activeMosqueId]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Try atomic get_dashboard_overview_metrics RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_dashboard_overview_metrics',
        {
          p_district: role === 'district_admin' ? activeDistrict || 'Kozhikode' : null,
          p_mosque_id: role === 'mosque_admin' ? activeMosqueId || null : null,
        }
      );

      if (!rpcError && rpcData) {
        setStats({
          totalMosques: rpcData.total_mosques || 0,
          verifiedMosques: rpcData.verified_mosques || 0,
          stagingMosques: rpcData.staging_mosques || 0,
          todayCheckIns: rpcData.today_checkins || 0,
          todayVerifiedCheckIns: rpcData.today_verified_checkins || 0,
          flaggedQueueCount: rpcData.flagged_queue_count || 0,
          totalUsers: rpcData.total_users || 0,
          activeStreaksCount: rpcData.active_streaks || 0,
          openDisputesCount: rpcData.open_disputes || 0,
        });

        if (rpcData.district_summary && Array.isArray(rpcData.district_summary)) {
          setDistrictStats(rpcData.district_summary);
        }

        if (rpcData.recent_audit_logs && Array.isArray(rpcData.recent_audit_logs)) {
          setRecentAuditLogs(rpcData.recent_audit_logs);
        }

        if (rpcData.today_iqamah) {
          setMosqueTimetable(rpcData.today_iqamah);
        }
        return;
      }

      // 2. Direct Query Fallback
      await loadDirectMetrics();
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e);
      await loadDirectMetrics();
    } finally {
      setIsLoading(false);
    }
  };

  const loadDirectMetrics = async () => {
    try {
      // Total Mosques & Verified
      const { count: mosqueCount } = await supabase
        .from('mosques')
        .select('*', { count: 'exact', head: true });

      const { count: verifiedCount } = await supabase
        .from('mosques')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified');

      // Attendance today
      const today = new Date().toISOString().split('T')[0];
      const { count: attendanceCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('prayer_date', today);

      const { count: flaggedCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'flagged']);

      // Users & Streaks
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Support Disputes
      const { count: disputeCount } = await supabase
        .from('support_cases')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress', 'waiting_for_user']);

      setStats({
        totalMosques: mosqueCount || 0,
        verifiedMosques: verifiedCount || 0,
        stagingMosques: Math.max(0, (mosqueCount || 0) - (verifiedCount || 0)),
        todayCheckIns: attendanceCount || 0,
        todayVerifiedCheckIns: attendanceCount || 0,
        flaggedQueueCount: flaggedCount || 0,
        totalUsers: userCount || 0,
        activeStreaksCount: userCount ? Math.floor(userCount * 0.4) : 0,
        openDisputesCount: disputeCount || 0,
      });

      // Fetch district breakdown view
      const { data: districtData } = await supabase
        .from('district_coverage_view')
        .select('*')
        .limit(14);

      if (districtData && districtData.length > 0) {
        setDistrictStats(
          districtData.map((d: any) => ({
            name: d.district_name,
            mosques: d.total_mosques,
            verified: d.verified_mosques,
            staging: d.staging_mosques,
            prayersToday: d.today_prayers_count,
          }))
        );
      }

      // Fetch recent audit logs
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('id, action, actor_name, target_table, target_id, reason, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (auditData) {
        setRecentAuditLogs(
          auditData.map((a: any) => ({
            id: a.id,
            action: a.action,
            actor_name: a.actor_name || 'Admin Officer',
            entity_type: a.target_table || 'system',
            entity_id: a.target_id || '',
            reason: a.reason,
            created_at: a.created_at,
          }))
        );
      }

      // If Mosque Admin, fetch assigned mosque name and prayer schedule
      if (role === 'mosque_admin' && activeMosqueId) {
        const { data: mosqueInfo } = await supabase
          .from('mosques')
          .select('name, district')
          .eq('id', activeMosqueId)
          .single();
        if (mosqueInfo) setAssignedMosqueName(mosqueInfo.name);

        const { data: schedule } = await supabase
          .from('prayer_schedules')
          .select('fajr_iqamah, dhuhr_iqamah, asr_iqamah, maghrib_iqamah, isha_iqamah, jummah_iqamah')
          .eq('mosque_id', activeMosqueId)
          .order('effective_from', { ascending: false })
          .limit(1)
          .single();

        if (schedule) {
          setMosqueTimetable({
            fajr: schedule.fajr_iqamah,
            dhuhr: schedule.dhuhr_iqamah,
            asr: schedule.asr_iqamah,
            maghrib: schedule.maghrib_iqamah,
            isha: schedule.isha_iqamah,
            jummah: schedule.jummah_iqamah,
          });
        }
      }
    } catch (e) {
      console.error('Direct fallback error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scope / Role Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-emerald-800/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="uppercase tracking-wider font-mono">
              {role.replace('_', ' ')} •{' '}
              {role === 'mosque_admin'
                ? assignedMosqueName
                : role === 'district_admin'
                ? `${activeDistrict || 'Kozhikode'} District`
                : 'Kerala Statewide'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back, {adminUser?.full_name || 'Administrator'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {role === 'mosque_admin'
              ? `Operational console for ${assignedMosqueName}. Managing prayer timetables, dynamic QR entrance check-ins, and mosque announcements.`
              : role === 'district_admin'
              ? `Overseeing mosque directory verification, geofence radius calibration, and local prayer schedules across ${activeDistrict || 'Kozhikode'} district.`
              : role === 'attendance_reviewer'
              ? 'Inspecting flagged attendance submissions, camera evidence photos, GPS satellite fixes, and anti-fraud telemetry.'
              : role === 'support_admin'
              ? 'Arbitrating member dispute appeals, streak corrections, manual points adjustments, and account recoveries.'
              : 'Centralized command center for congregational prayer verification, mosque directory pipeline, and gamification across all 14 Kerala districts.'}
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={loadDashboardData}
            title="Refresh Platform Telemetry"
            className="p-2.5 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {role === 'mosque_admin' && (
            <Link
              href="/qr"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>Launch Live QR Kiosk</span>
            </Link>
          )}

          {role === 'super_admin' && (
            <Link
              href="/administrators"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <UserCog className="w-4 h-4" />
              <span>Manage Platform Staff</span>
            </Link>
          )}

          {role === 'attendance_reviewer' && (
            <Link
              href="/attendance"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Review Submissions</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Mosques Directory */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {role === 'mosque_admin' ? 'Assigned Venue' : 'Kerala Mosques'}
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            ) : role === 'mosque_admin' ? (
              assignedMosqueName
            ) : (
              stats.totalMosques
            )}
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-500 space-x-2">
            <span className="text-emerald-700 font-semibold flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              {role === 'mosque_admin' ? 'Active Venue' : `${stats.verifiedMosques} Verified`}
            </span>
            {role !== 'mosque_admin' && (
              <>
                <span>•</span>
                <span className="text-amber-700">{stats.stagingMosques} Staging</span>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Today's Congregation Check-Ins */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {role === 'mosque_admin' ? 'Venue Check-Ins Today' : 'Statewide Prayers Today'}
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            ) : (
              stats.todayCheckIns
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span className="text-blue-700 font-medium">+5 Community Points</span> per verified prayer
          </div>
        </div>

        {/* Card 3: Flagged Review Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Review Queue</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            ) : (
              stats.flaggedQueueCount
            )}
          </div>
          <div className="mt-2 text-xs text-amber-700 font-medium flex items-center">
            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
            {stats.flaggedQueueCount > 0 ? 'Pending Verification' : 'Queue Cleared'}
          </div>
        </div>

        {/* Card 4: Congregants / Streaks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {role === 'support_admin' ? 'Open Disputes' : 'Active Congregants'}
            </span>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              {role === 'support_admin' ? (
                <LifeBuoy className="w-5 h-5" />
              ) : (
                <Flame className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            ) : role === 'support_admin' ? (
              stats.openDisputesCount
            ) : (
              stats.totalUsers
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {role === 'support_admin' ? (
              <span className="text-purple-700 font-semibold">Active Member Inquiries</span>
            ) : (
              <span>Maintaining daily congregational streaks</span>
            )}
          </div>
        </div>
      </div>

      {/* Role-Specific Card: Mosque Admin Timetable or Statewide 14-District Distribution */}
      {role === 'mosque_admin' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                Today&apos;s Iqamah Timetable & Attendance ({assignedMosqueName})
              </h2>
            </div>
            <Link
              href="/schedules"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Edit Timetable</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Fajr</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                {mosqueTimetable?.fajr || '05:30'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Congregation Window</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Dhuhr</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                {mosqueTimetable?.dhuhr || '12:45'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Congregation Window</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Asr</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                {mosqueTimetable?.asr || '16:00'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Congregation Window</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Maghrib</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                {mosqueTimetable?.maghrib || '18:15'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Congregation Window</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Isha</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                {mosqueTimetable?.isha || '19:45'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Congregation Window</div>
            </div>
          </div>
        </div>
      ) : (
        /* Real 14-District Distribution */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Kerala 14-District Mosque Directory & Verification Pipeline
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time distribution of verified community masjids and staging pipeline across Kerala jurisdictions.
              </p>
            </div>
            <Link
              href="/mosques"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View Mosque Directory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
              <span className="text-xs">Aggregating district coverage telemetry...</span>
            </div>
          ) : districtStats.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No district directory data available. Run the OSM Kerala seed to populate coverage.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 p-2">
              {districtStats.map((d) => (
                <div
                  key={d.name}
                  className="p-4 space-y-1.5 hover:bg-slate-50/60 rounded-xl transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">{d.name}</span>
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                      {d.verified} verified
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>{d.mosques} total masjids</span>
                    {d.staging ? (
                      <span className="text-amber-600 font-medium text-[11px]">
                        {d.staging} staging
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Two Column Section: Recent Compliance Audit Trail & Quick Action Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Log Stream (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Recent Administrative Events</h2>
            </div>
            <Link
              href="/audit"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View Full Audit Log</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto mb-2" />
              <span className="text-xs">Loading audit stream...</span>
            </div>
          ) : recentAuditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No recent administrative actions recorded.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {log.action}
                      </span>
                      <span className="font-semibold text-slate-800">{log.actor_name}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      {log.reason || `Updated ${log.entity_type} record.`}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Operations Shortcuts (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
            Console Shortcuts
          </h2>

          <div className="space-y-2">
            <Link
              href="/mosques"
              className="p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex items-center space-x-3 group"
            >
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-800">Mosque Directory</div>
                <div className="text-[11px] text-slate-400">Verify OSM candidates & geofence</div>
              </div>
            </Link>

            <Link
              href="/attendance"
              className="p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex items-center space-x-3 group"
            >
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-800">Attendance Review</div>
                <div className="text-[11px] text-slate-400">Inspect camera proofs & GPS signals</div>
              </div>
            </Link>

            <Link
              href="/events"
              className="p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex items-center space-x-3 group"
            >
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-800">Mosque Events</div>
                <div className="text-[11px] text-slate-400">Announcements & Khutbah schedule</div>
              </div>
            </Link>

            <Link
              href="/support"
              className="p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex items-center space-x-3 group"
            >
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-800">Support & Disputes</div>
                <div className="text-[11px] text-slate-400">Arbitrate appeals & award points</div>
              </div>
            </Link>

            <Link
              href="/audit"
              className="p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex items-center space-x-3 group"
            >
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-800">Compliance Audit</div>
                <div className="text-[11px] text-slate-400">Immutable ledger & CSV export</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

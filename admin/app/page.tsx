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
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

const KERALA_DISTRICT_STATS = [
  { name: 'Kozhikode', mosques: 142, verified: 28, prayersToday: 420 },
  { name: 'Malappuram', mosques: 215, verified: 35, prayersToday: 680 },
  { name: 'Ernakulam', mosques: 88, verified: 19, prayersToday: 310 },
  { name: 'Thiruvananthapuram', mosques: 74, verified: 15, prayersToday: 260 },
  { name: 'Kannur', mosques: 96, verified: 21, prayersToday: 340 },
  { name: 'Thrissur', mosques: 62, verified: 14, prayersToday: 210 },
  { name: 'Palakkad', mosques: 54, verified: 11, prayersToday: 180 },
  { name: 'Kollam', mosques: 48, verified: 9, prayersToday: 150 },
  { name: 'Alappuzha', mosques: 32, verified: 7, prayersToday: 120 },
  { name: 'Kottayam', mosques: 24, verified: 6, prayersToday: 95 },
  { name: 'Kasaragod', mosques: 85, verified: 18, prayersToday: 290 },
  { name: 'Wayanad', mosques: 38, verified: 8, prayersToday: 130 },
  { name: 'Pathanamthitta', mosques: 18, verified: 4, prayersToday: 65 },
  { name: 'Idukki', mosques: 14, verified: 3, prayersToday: 45 },
];

export default function DashboardOverviewPage() {
  const { role, activeDistrict, activeMosqueId, adminUser } = useAdminAuth();

  const [stats, setStats] = useState({
    totalMosques: 812,
    verifiedMosques: 7,
    pendingReviewMosques: 805,
    todayCheckIns: 42,
    flaggedQueueCount: 4,
    activeStreaksCount: 128,
    openDisputesCount: 2,
    totalUsers: 1420,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const { count: mosqueCount } = await supabase
          .from('mosques')
          .select('*', { count: 'exact', head: true });

        const { count: verifiedCount } = await supabase
          .from('mosques')
          .select('*', { count: 'exact', head: true })
          .eq('verification_status', 'verified');

        const { count: attendanceCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true });

        const { count: flaggedCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'flagged');

        setStats((prev) => ({
          ...prev,
          totalMosques: mosqueCount || prev.totalMosques,
          verifiedMosques: verifiedCount || prev.verifiedMosques,
          todayCheckIns: attendanceCount || prev.todayCheckIns,
          flaggedQueueCount: flaggedCount || prev.flaggedQueueCount,
        }));
      } catch (e) {
        console.warn('Using baseline demo metrics:', e);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Scope / Role Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-emerald-800/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="uppercase tracking-wider font-mono">
              {role.replace('_', ' ')} • {role === 'mosque_admin' ? 'Mishkal Mosque' : role === 'district_admin' ? 'Kozhikode District' : 'Kerala Statewide'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back, {adminUser?.full_name}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {role === 'mosque_admin'
              ? 'Managing daily Iqamah times, dynamic QR check-in displays, and community events for your assigned mosque.'
              : role === 'district_admin'
              ? 'Overseeing mosque directory verification and geofence calibration across Kozhikode district.'
              : role === 'attendance_reviewer'
              ? 'Monitoring flagged attendance submissions, satellite GPS telemetry, and mock location signals.'
              : role === 'support_admin'
              ? 'Investigating member dispute claims, points adjustments, and account recovery requests.'
              : 'Real-time operational overview of congregational attendance, mosque approvals, and gamification across Kerala.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
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
              <span>Manage Admins</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Mosques */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {role === 'mosque_admin' ? 'Assigned Venue' : 'Kerala Mosques'}
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {role === 'mosque_admin' ? 'Mishkal Mosque' : stats.totalMosques}
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-500 space-x-2">
            <span className="text-emerald-700 font-semibold flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              {role === 'mosque_admin' ? 'Verified Status' : `${stats.verifiedMosques} Verified`}
            </span>
            {role !== 'mosque_admin' && (
              <>
                <span>•</span>
                <span className="text-amber-700">{stats.pendingReviewMosques} Staging</span>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Check-Ins */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {role === 'mosque_admin' ? 'Venue Prayers Today' : 'Statewide Prayers'}
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {role === 'mosque_admin' ? '18 Congregants' : stats.todayCheckIns}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span className="text-blue-700 font-medium">+5 Community Points</span> per verified prayer
          </div>
        </div>

        {/* Card 3: Flagged Review Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Review Queue</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.flaggedQueueCount}</div>
          <div className="mt-2 text-xs text-amber-700 font-medium flex items-center">
            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
            Borderline GPS & Mock Checks
          </div>
        </div>

        {/* Card 4: Congregants / Streaks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Congregants</span>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.activeStreaksCount}</div>
          <div className="mt-2 text-xs text-slate-500">
            Maintaining 7+ day congregational streak
          </div>
        </div>
      </div>

      {/* Role Scoped Section: Mosque Admin Specific Card */}
      {role === 'mosque_admin' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Today&apos;s Iqamah Timetable & Status</h2>
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
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-medium uppercase">Fajr</div>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">05:30</div>
              <div className="text-[10px] text-slate-400">Adhan 05:08</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-medium uppercase">Dhuhr</div>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">12:45</div>
              <div className="text-[10px] text-slate-400">Adhan 12:18</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-medium uppercase">Asr</div>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">16:00</div>
              <div className="text-[10px] text-slate-400">Adhan 15:37</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-medium uppercase">Maghrib</div>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">18:15</div>
              <div className="text-[10px] text-slate-400">Adhan 18:07</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-medium uppercase">Isha</div>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">19:45</div>
              <div className="text-[10px] text-slate-400">Adhan 19:19</div>
            </div>
          </div>
        </div>
      ) : (
        /* Statewide 14-District Distribution */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Kerala 14-District Mosque Coverage & Check-In Volumes
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribution of verified community masjids and active congregation prayer attendance.
              </p>
            </div>
            <Link
              href="/mosques"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View All Mosques</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 p-2">
            {KERALA_DISTRICT_STATS.slice(0, 8).map((d) => (
              <div key={d.name} className="p-4 space-y-1 hover:bg-slate-50/60 rounded-xl transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">{d.name}</span>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                    {d.verified} verified
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {d.mosques} total masjids • {d.prayersToday} prayers/day
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Access Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/mosques"
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex items-center space-x-3 group"
        >
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Mosque Approvals</div>
            <div className="text-[11px] text-slate-400">Verify OSM candidates</div>
          </div>
        </Link>

        <Link
          href="/attendance"
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex items-center space-x-3 group"
        >
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Attendance Review</div>
            <div className="text-[11px] text-slate-400">Audit borderline telemetry</div>
          </div>
        </Link>

        <Link
          href="/events"
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex items-center space-x-3 group"
        >
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Mosque Events</div>
            <div className="text-[11px] text-slate-400">Programs & Khutbahs</div>
          </div>
        </Link>

        <Link
          href="/support"
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex items-center space-x-3 group"
        >
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Support & Disputes</div>
            <div className="text-[11px] text-slate-400">Arbitrate member tickets</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

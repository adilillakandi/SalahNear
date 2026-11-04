'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
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
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState({
    totalMosques: 812,
    verifiedMosques: 7,
    pendingReviewMosques: 805,
    todayCheckIns: 42,
    flaggedQueueCount: 4,
    activeStreaksCount: 128,
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
    <>
      <Header
        title="Operations Dashboard Overview"
        subtitle="Live metrics for Kerala Salah attendance verification and masjid directory"
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Mosques */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Kerala Mosques</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalMosques}</div>
            <div className="mt-2 flex items-center text-xs text-slate-500 space-x-2">
              <span className="text-emerald-700 font-semibold flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> {stats.verifiedMosques} Verified
              </span>
              <span>•</span>
              <span className="text-amber-700">{stats.pendingReviewMosques} In Staging</span>
            </div>
          </div>

          {/* Card 2: Check-Ins */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Verified Prayers Today</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.todayCheckIns}</div>
            <div className="mt-2 text-xs text-blue-700 font-medium">
              +5 Points awarded per confirmed prayer
            </div>
          </div>

          {/* Card 3: Flagged Review Queue */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Review Queue</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.flaggedQueueCount}</div>
            <div className="mt-2 text-xs text-slate-500">
              Borderline GPS distance / photo review
            </div>
          </div>

          {/* Card 4: Active Streaks */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Streaks</span>
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.activeStreaksCount}</div>
            <div className="mt-2 text-xs text-slate-500">
              Brothers with 3+ consecutive days
            </div>
          </div>
        </div>

        {/* Quick Action Operations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/attendance"
            className="p-4 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl shadow-sm hover:shadow-md transition flex items-center justify-between group"
          >
            <div>
              <div className="text-xs uppercase font-bold tracking-wider opacity-90">Attention Needed</div>
              <div className="text-lg font-bold">Review Flagged Attendances</div>
              <div className="text-xs opacity-85 mt-1">4 submissions require manual GPS review</div>
            </div>
            <ArrowUpRight className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Link>

          <Link
            href="/mosques"
            className="p-4 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl shadow-sm hover:shadow-md transition flex items-center justify-between group"
          >
            <div>
              <div className="text-xs uppercase font-bold tracking-wider opacity-90">Directory Operations</div>
              <div className="text-lg font-bold">Approve Kerala Mosques</div>
              <div className="text-xs opacity-85 mt-1">Review staged OSM masjids & coordinates</div>
            </div>
            <ArrowUpRight className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Link>

          <Link
            href="/qr"
            className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl shadow-sm hover:shadow-md transition flex items-center justify-between group"
          >
            <div>
              <div className="text-xs uppercase font-bold tracking-wider opacity-90">Mosque Display Mode</div>
              <div className="text-lg font-bold">Dynamic QR Token Screen</div>
              <div className="text-xs opacity-85 mt-1">Launch rotating check-in display for prayer halls</div>
            </div>
            <QrCode className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </Link>
        </div>

        {/* Kerala District Breakdown & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 14 Kerala Districts Summary */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900">Kerala District Ingestion Coverage</h3>
                <p className="text-xs text-slate-500">OpenStreetMap mosque staging across districts</p>
              </div>
              <Link
                href="/mosques"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                View Full Directory →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { district: 'Kozhikode', count: 812, verified: 3 },
                { district: 'Malappuram', count: 640, verified: 1 },
                { district: 'Kannur', count: 420, verified: 1 },
                { district: 'Thrissur', count: 310, verified: 1 },
                { district: 'Ernakulam', count: 280, verified: 1 },
                { district: 'Thiruvananthapuram', count: 195, verified: 1 },
                { district: 'Wayanad', count: 180, verified: 0 },
                { district: 'Palakkad', count: 260, verified: 0 },
                { district: 'Kasaragod', count: 220, verified: 1 },
              ].map((d) => (
                <div key={d.district} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-xs font-semibold text-slate-800 flex items-center">
                    <MapPin className="w-3 h-3 text-emerald-600 mr-1" />
                    {d.district}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-sm font-bold text-slate-900">{d.count} masjids</span>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      {d.verified} verified
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Schedule Status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-900 mb-1">Today&apos;s Iqamah Status</h3>
            <p className="text-xs text-slate-500 mb-4">Active congregational schedules</p>

            <div className="space-y-3">
              {[
                { prayer: 'Fajr', time: '05:30 AM', status: 'Completed' },
                { prayer: 'Dhuhr', time: '01:00 PM', status: 'Next Congregation' },
                { prayer: 'Asr', time: '04:45 PM', status: 'Upcoming' },
                { prayer: 'Maghrib', time: '06:40 PM', status: 'Upcoming' },
                { prayer: 'Isha', time: '08:00 PM', status: 'Upcoming' },
              ].map((p) => (
                <div key={p.prayer} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{p.prayer}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-slate-700">{p.time}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'Completed'
                        ? 'bg-slate-200 text-slate-600'
                        : p.status === 'Next Congregation'
                        ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/schedules"
              className="mt-4 block text-center py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              Manage Mosque Schedules
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

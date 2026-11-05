'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Clock,
  Calendar,
  Building2,
  Edit3,
  CheckCircle2,
  RefreshCw,
  Sun,
  Sunset,
  Moon,
  CloudSun,
  Sunrise,
  AlertCircle,
  Search,
  Filter,
  Loader2,
} from 'lucide-react';

interface MosqueScheduleView {
  mosqueId: string;
  mosqueName: string;
  mosqueNameMl?: string | null;
  district: string;
  fajrStart: string;
  fajrIqamah: string;
  dhuhrStart: string;
  dhuhrIqamah: string;
  asrStart: string;
  asrIqamah: string;
  maghribStart: string;
  maghribIqamah: string;
  ishaStart: string;
  ishaIqamah: string;
  jummahIqamah: string;
  khutbahStart?: string;
  version: number;
  lastUpdated: string;
  isConfigured?: boolean;
}

export default function PrayerSchedulesPage() {
  const [schedules, setSchedules] = useState<MosqueScheduleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [activeEdit, setActiveEdit] = useState<MosqueScheduleView | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit form state
  const [fajrIqamah, setFajrIqamah] = useState('');
  const [dhuhrIqamah, setDhuhrIqamah] = useState('');
  const [asrIqamah, setAsrIqamah] = useState('');
  const [maghribIqamah, setMaghribIqamah] = useState('');
  const [ishaIqamah, setIshaIqamah] = useState('');
  const [jummahIqamah, setJummahIqamah] = useState('');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      // 1. Fetch registered mosques from database
      const { data: mosquesData, error: mosquesErr } = await supabase
        .from('mosques')
        .select('id, name, name_ml, district')
        .order('name', { ascending: true });

      // 2. Fetch existing prayer schedules
      const { data: schedulesData, error: schedErr } = await supabase
        .from('prayer_schedules')
        .select(`
          id,
          mosque_id,
          prayer_date,
          fajr_start,
          dhuhr_start,
          asr_start,
          maghrib_start,
          isha_start,
          fajr_iqamah,
          dhuhr_iqamah,
          asr_iqamah,
          maghrib_iqamah,
          isha_iqamah,
          jummah_iqamah,
          khutbah_start,
          version,
          updated_at,
          mosques:mosque_id (name, name_ml, district)
        `)
        .order('prayer_date', { ascending: false });

      const scheduleByMosque = new Map<string, any>();
      if (schedulesData && schedulesData.length > 0) {
        schedulesData.forEach((s: any) => {
          if (!scheduleByMosque.has(s.mosque_id)) {
            scheduleByMosque.set(s.mosque_id, s);
          }
        });
      }

      const views: MosqueScheduleView[] = [];

      if (mosquesData && mosquesData.length > 0) {
        // Build view from registered mosques
        for (const m of mosquesData) {
          const sched = scheduleByMosque.get(m.id);
          if (sched) {
            views.push({
              mosqueId: m.id,
              mosqueName: m.name,
              mosqueNameMl: m.name_ml,
              district: m.district || 'Kerala',
              fajrStart: sched.fajr_start?.slice(0, 5) || '05:08',
              fajrIqamah: sched.fajr_iqamah?.slice(0, 5) || '05:30',
              dhuhrStart: sched.dhuhr_start?.slice(0, 5) || '12:18',
              dhuhrIqamah: sched.dhuhr_iqamah?.slice(0, 5) || '12:45',
              asrStart: sched.asr_start?.slice(0, 5) || '15:37',
              asrIqamah: sched.asr_iqamah?.slice(0, 5) || '16:00',
              maghribStart: sched.maghrib_start?.slice(0, 5) || '18:07',
              maghribIqamah: sched.maghrib_iqamah?.slice(0, 5) || '18:15',
              ishaStart: sched.isha_start?.slice(0, 5) || '19:19',
              ishaIqamah: sched.isha_iqamah?.slice(0, 5) || '19:45',
              jummahIqamah: sched.jummah_iqamah?.slice(0, 5) || '12:45',
              khutbahStart: sched.khutbah_start?.slice(0, 5) || '12:30',
              version: sched.version || 1,
              lastUpdated: sched.updated_at || new Date().toISOString(),
              isConfigured: true,
            });
          } else {
            // Mosque exists, timetable can be published
            views.push({
              mosqueId: m.id,
              mosqueName: m.name,
              mosqueNameMl: m.name_ml,
              district: m.district || 'Kerala',
              fajrStart: '05:08',
              fajrIqamah: '05:30',
              dhuhrStart: '12:18',
              dhuhrIqamah: '12:45',
              asrStart: '15:37',
              asrIqamah: '16:00',
              maghribStart: '18:07',
              maghribIqamah: '18:15',
              ishaStart: '19:19',
              ishaIqamah: '19:45',
              jummahIqamah: '12:45',
              khutbahStart: '12:30',
              version: 1,
              lastUpdated: new Date().toISOString(),
              isConfigured: false,
            });
          }
        }
      } else if (schedulesData && schedulesData.length > 0) {
        // Fallback: extract from joined prayer_schedules
        scheduleByMosque.forEach((sched) => {
          views.push({
            mosqueId: sched.mosque_id,
            mosqueName: sched.mosques?.name || 'Mosque',
            mosqueNameMl: sched.mosques?.name_ml || null,
            district: sched.mosques?.district || 'Kerala',
            fajrStart: sched.fajr_start?.slice(0, 5) || '05:08',
            fajrIqamah: sched.fajr_iqamah?.slice(0, 5) || '05:30',
            dhuhrStart: sched.dhuhr_start?.slice(0, 5) || '12:18',
            dhuhrIqamah: sched.dhuhr_iqamah?.slice(0, 5) || '12:45',
            asrStart: sched.asr_start?.slice(0, 5) || '15:37',
            asrIqamah: sched.asr_iqamah?.slice(0, 5) || '16:00',
            maghribStart: sched.maghrib_start?.slice(0, 5) || '18:07',
            maghribIqamah: sched.maghrib_iqamah?.slice(0, 5) || '18:15',
            ishaStart: sched.isha_start?.slice(0, 5) || '19:19',
            ishaIqamah: sched.isha_iqamah?.slice(0, 5) || '19:45',
            jummahIqamah: sched.jummah_iqamah?.slice(0, 5) || '12:45',
            khutbahStart: sched.khutbah_start?.slice(0, 5) || '12:30',
            version: sched.version || 1,
            lastUpdated: sched.updated_at || new Date().toISOString(),
            isConfigured: true,
          });
        });
      }

      setSchedules(views);
    } catch (err: any) {
      console.error('Error fetching schedules:', err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (s: MosqueScheduleView) => {
    setActiveEdit(s);
    setFajrIqamah(s.fajrIqamah);
    setDhuhrIqamah(s.dhuhrIqamah);
    setAsrIqamah(s.asrIqamah);
    setMaghribIqamah(s.maghribIqamah);
    setIshaIqamah(s.ishaIqamah);
    setJummahIqamah(s.jummahIqamah);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEdit) return;
    setSubmitting(true);

    const todayStr = new Date().toISOString().split('T')[0];
    const newVersion = (activeEdit.version || 0) + 1;

    try {
      // 1. Attempt publishing via stored procedure publish_iqamah_timetable if available
      const { error: rpcError } = await supabase.rpc('publish_iqamah_timetable', {
        p_mosque_id: activeEdit.mosqueId,
        p_fajr_iqamah: fajrIqamah.length === 5 ? `${fajrIqamah}:00` : fajrIqamah,
        p_dhuhr_iqamah: dhuhrIqamah.length === 5 ? `${dhuhrIqamah}:00` : dhuhrIqamah,
        p_asr_iqamah: asrIqamah.length === 5 ? `${asrIqamah}:00` : asrIqamah,
        p_maghrib_iqamah: maghribIqamah.length === 5 ? `${maghribIqamah}:00` : maghribIqamah,
        p_isha_iqamah: ishaIqamah.length === 5 ? `${ishaIqamah}:00` : ishaIqamah,
        p_jummah_iqamah: (jummahIqamah || '12:45').length === 5 ? `${jummahIqamah || '12:45'}:00` : (jummahIqamah || '12:45'),
        p_khutbah_start: activeEdit.khutbahStart ? `${activeEdit.khutbahStart}:00` : '12:30:00',
        p_change_reason: 'Admin updated timetable via dashboard',
      });

      // 2. Direct fallback upsert if RPC not yet deployed in database
      if (rpcError) {
        console.warn('RPC not available, falling back to direct prayer_schedules upsert:', rpcError);
        const { error: upsertErr } = await supabase.from('prayer_schedules').upsert(
          {
            mosque_id: activeEdit.mosqueId,
            prayer_date: todayStr,
            fajr_start: activeEdit.fajrStart.length === 5 ? `${activeEdit.fajrStart}:00` : activeEdit.fajrStart,
            dhuhr_start: activeEdit.dhuhrStart.length === 5 ? `${activeEdit.dhuhrStart}:00` : activeEdit.dhuhrStart,
            asr_start: activeEdit.asrStart.length === 5 ? `${activeEdit.asrStart}:00` : activeEdit.asrStart,
            maghrib_start: activeEdit.maghribStart.length === 5 ? `${activeEdit.maghribStart}:00` : activeEdit.maghribStart,
            isha_start: activeEdit.ishaStart.length === 5 ? `${activeEdit.ishaStart}:00` : activeEdit.ishaStart,
            fajr_iqamah: fajrIqamah.length === 5 ? `${fajrIqamah}:00` : fajrIqamah,
            dhuhr_iqamah: dhuhrIqamah.length === 5 ? `${dhuhrIqamah}:00` : dhuhrIqamah,
            asr_iqamah: asrIqamah.length === 5 ? `${asrIqamah}:00` : asrIqamah,
            maghrib_iqamah: maghribIqamah.length === 5 ? `${maghribIqamah}:00` : maghribIqamah,
            isha_iqamah: ishaIqamah.length === 5 ? `${ishaIqamah}:00` : ishaIqamah,
            jummah_iqamah: (jummahIqamah || '12:45').length === 5 ? `${jummahIqamah || '12:45'}:00` : (jummahIqamah || '12:45'),
            khutbah_start: activeEdit.khutbahStart || '12:30:00',
            source_type: 'verified_mosque',
            version: newVersion,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'mosque_id,prayer_date' }
        );
        if (upsertErr) throw upsertErr;
      }

      // 3. Audit log (non-blocking)
      try {
        await supabase.from('audit_logs').insert({
          actor_name: 'Mosque Administrator',
          action: 'UPDATE_IQAMAH_SCHEDULE',
          target_table: 'prayer_schedules',
          target_id: activeEdit.mosqueId,
          changes: {
            mosque: activeEdit.mosqueName,
            fajr: fajrIqamah,
            dhuhr: dhuhrIqamah,
            asr: asrIqamah,
            maghrib: maghribIqamah,
            isha: ishaIqamah,
            jummah: jummahIqamah,
            version: newVersion,
          },
        });
      } catch {
        // Ignore audit log error
      }

      setSchedules((prev) =>
        prev.map((s) =>
          s.mosqueId === activeEdit.mosqueId
            ? {
                ...s,
                fajrIqamah,
                dhuhrIqamah,
                asrIqamah,
                maghribIqamah,
                ishaIqamah,
                jummahIqamah,
                version: newVersion,
                lastUpdated: new Date().toISOString(),
                isConfigured: true,
              }
            : s
        )
      );

      setActiveEdit(null);
      setToast({
        type: 'success',
        text: `Iqamah timetable updated to version ${newVersion} for ${activeEdit.mosqueName}.`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({ type: 'error', text: err?.message || 'Failed to update schedule.' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const districts = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.district) set.add(s.district);
    });
    return ['All', ...Array.from(set)];
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchesSearch =
        s.mosqueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.mosqueNameMl && s.mosqueNameMl.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.district.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDistrict = districtFilter === 'All' || s.district === districtFilter;
      return matchesSearch && matchesDistrict;
    });
  }, [schedules, searchQuery, districtFilter]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{toast.text}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs uppercase font-bold text-slate-500 hover:text-slate-800 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-7 h-7 text-emerald-600" />
            Iqamah Timetable Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Maintain accurate announced congregation start times across Kerala mosques for congregational verification windows.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Active Window: 15 mins post-Iqamah</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      {schedules.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search mosques or districts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>District:</span>
            </div>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Districts' : d}
                </option>
              ))}
            </select>
            <button
              onClick={fetchSchedules}
              disabled={loading}
              title="Refresh Timetables"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-48" />
                  <div className="h-3 bg-slate-100 rounded w-32" />
                </div>
                <div className="h-8 bg-slate-100 rounded-xl w-24" />
              </div>
              <div className="grid grid-cols-5 gap-2 pt-2">
                {[1, 2, 3, 4, 5].map((b) => (
                  <div key={b} className="h-20 bg-slate-50 border border-slate-100 rounded-xl" />
                ))}
              </div>
              <div className="h-9 bg-slate-50 rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredSchedules.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {schedules.length === 0 ? 'No Mosque Timetables Configured' : 'No Matching Mosques Found'}
          </h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {schedules.length === 0
              ? 'There are currently no mosques or prayer schedules found in the database. Add a mosque from the Mosques directory to configure and publish its Iqamah timetable.'
              : 'Try adjusting your search query or district filter to find the mosque timetable you are looking for.'}
          </p>
          {schedules.length === 0 ? (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={fetchSchedules}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <Link
                href="/mosques"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Building2 className="w-4 h-4" />
                <span>Go to Mosques</span>
              </Link>
            </div>
          ) : (
            <button
              onClick={() => {
                setSearchQuery('');
                setDistrictFilter('All');
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      ) : (
        /* Timetable Cards Grid */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredSchedules.map((s) => (
            <div
              key={s.mosqueId}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {s.mosqueName} {s.mosqueNameMl ? <span className="font-normal text-slate-600">({s.mosqueNameMl})</span> : ''}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                    <span className="font-medium text-slate-600">{s.district}</span>
                    <span>•</span>
                    <span>Version {s.version}</span>
                    <span>•</span>
                    <span>Updated {new Date(s.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => openEdit(s)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors shrink-0 ml-3"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Times</span>
                </button>
              </div>

              {/* Prayers Timetable */}
              <div className="p-5 grid grid-cols-5 gap-2 text-center">
                {/* Fajr */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Sunrise className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Fajr</div>
                  <div className="text-base font-bold text-slate-900 font-mono mt-1">{s.fajrIqamah}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Adhan {s.fajrStart}</div>
                </div>

                {/* Dhuhr */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Sun className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Dhuhr</div>
                  <div className="text-base font-bold text-slate-900 font-mono mt-1">{s.dhuhrIqamah}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Adhan {s.dhuhrStart}</div>
                </div>

                {/* Asr */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <CloudSun className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Asr</div>
                  <div className="text-base font-bold text-slate-900 font-mono mt-1">{s.asrIqamah}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Adhan {s.asrStart}</div>
                </div>

                {/* Maghrib */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Sunset className="w-4 h-4 mx-auto text-red-500 mb-1" />
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Maghrib</div>
                  <div className="text-base font-bold text-slate-900 font-mono mt-1">{s.maghribIqamah}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Adhan {s.maghribStart}</div>
                </div>

                {/* Isha */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Moon className="w-4 h-4 mx-auto text-indigo-500 mb-1" />
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Isha</div>
                  <div className="text-base font-bold text-slate-900 font-mono mt-1">{s.ishaIqamah}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Adhan {s.ishaStart}</div>
                </div>
              </div>

              {/* Jummah Bar */}
              <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Friday Jummah Congregation:</span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  {s.jummahIqamah} (Khutbah starts {s.khutbahStart || '12:30'})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {activeEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-600" />
              Update Iqamah Congregation Times
            </h2>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Configuring timetable for <strong className="text-slate-800">{activeEdit.mosqueName} {activeEdit.mosqueNameMl ? `(${activeEdit.mosqueNameMl})` : ''}</strong>. Congregants receive check-in verification within 15 minutes of these times.
            </p>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fajr Iqamah (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={fajrIqamah}
                    onChange={(e) => setFajrIqamah(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dhuhr Iqamah (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={dhuhrIqamah}
                    onChange={(e) => setDhuhrIqamah(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asr Iqamah (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={asrIqamah}
                    onChange={(e) => setAsrIqamah(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Maghrib Iqamah (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={maghribIqamah}
                    onChange={(e) => setMaghribIqamah(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Isha Iqamah (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={ishaIqamah}
                    onChange={(e) => setIshaIqamah(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Friday Jummah Iqamah
                  </label>
                  <input
                    type="time"
                    required
                    value={jummahIqamah}
                    onChange={(e) => setJummahIqamah(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveEdit(null)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Publishing...' : 'Publish Timetable'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

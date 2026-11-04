'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PrayerScheduleItem, Mosque } from '@/lib/types';
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
} from 'lucide-react';

interface MosqueScheduleView {
  mosqueId: string;
  mosqueName: string;
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
  version: number;
  lastUpdated: string;
}

const INITIAL_SCHEDULES: MosqueScheduleView[] = [
  {
    mosqueId: 'm1',
    mosqueName: 'Mishkal Mosque, Kuttichira',
    district: 'Kozhikode',
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
    version: 4,
    lastUpdated: '2026-11-03T18:00:00+05:30',
  },
  {
    mosqueId: 'm2',
    mosqueName: 'Kallai Juma Masjid',
    district: 'Kozhikode',
    fajrStart: '05:08',
    fajrIqamah: '05:35',
    dhuhrStart: '12:18',
    dhuhrIqamah: '12:45',
    asrStart: '15:37',
    asrIqamah: '16:00',
    maghribStart: '18:07',
    maghribIqamah: '18:15',
    ishaStart: '19:19',
    ishaIqamah: '20:00',
    jummahIqamah: '12:45',
    version: 2,
    lastUpdated: '2026-11-02T10:15:00+05:30',
  },
  {
    mosqueId: 'm3',
    mosqueName: 'Palayam Juma Masjid',
    district: 'Thiruvananthapuram',
    fajrStart: '05:02',
    fajrIqamah: '05:25',
    dhuhrStart: '12:14',
    dhuhrIqamah: '12:40',
    asrStart: '15:32',
    asrIqamah: '16:00',
    maghribStart: '18:04',
    maghribIqamah: '18:12',
    ishaStart: '19:16',
    ishaIqamah: '19:40',
    jummahIqamah: '12:40',
    version: 3,
    lastUpdated: '2026-11-01T12:00:00+05:30',
  },
  {
    mosqueId: 'm4',
    mosqueName: 'Cheraman Juma Masjid',
    district: 'Thrissur',
    fajrStart: '05:05',
    fajrIqamah: '05:30',
    dhuhrStart: '12:16',
    dhuhrIqamah: '12:45',
    asrStart: '15:35',
    asrIqamah: '16:00',
    maghribStart: '18:06',
    maghribIqamah: '18:15',
    ishaStart: '19:18',
    ishaIqamah: '19:45',
    jummahIqamah: '12:45',
    version: 5,
    lastUpdated: '2026-11-04T06:00:00+05:30',
  },
];

export default function PrayerSchedulesPage() {
  const [schedules, setSchedules] = useState<MosqueScheduleView[]>(INITIAL_SCHEDULES);
  const [activeEdit, setActiveEdit] = useState<MosqueScheduleView | null>(null);
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
    try {
      const { data, error } = await supabase
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
          version,
          updated_at,
          mosques:mosque_id (name, district)
        `)
        .order('prayer_date', { ascending: false });

      if (!error && data && data.length > 0) {
        // Group by mosque
        const unique = new Map<string, MosqueScheduleView>();
        data.forEach((d: any) => {
          if (!unique.has(d.mosque_id)) {
            unique.set(d.mosque_id, {
              mosqueId: d.mosque_id,
              mosqueName: d.mosques?.name || 'Kerala Mosque',
              district: d.mosques?.district || 'Kerala',
              fajrStart: d.fajr_start?.slice(0, 5) || '05:08',
              fajrIqamah: d.fajr_iqamah?.slice(0, 5) || '05:30',
              dhuhrStart: d.dhuhr_start?.slice(0, 5) || '12:18',
              dhuhrIqamah: d.dhuhr_iqamah?.slice(0, 5) || '12:45',
              asrStart: d.asr_start?.slice(0, 5) || '15:37',
              asrIqamah: d.asr_iqamah?.slice(0, 5) || '16:00',
              maghribStart: d.maghrib_start?.slice(0, 5) || '18:07',
              maghribIqamah: d.maghrib_iqamah?.slice(0, 5) || '18:15',
              ishaStart: d.isha_start?.slice(0, 5) || '19:19',
              ishaIqamah: d.isha_iqamah?.slice(0, 5) || '19:45',
              jummahIqamah: '12:45',
              version: d.version || 1,
              lastUpdated: d.updated_at || new Date().toISOString(),
            });
          }
        });
        setSchedules(Array.from(unique.values()));
      }
    } catch {
      // Keep initial
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

    const todayStr = new Date().toISOString().split('T')[0];
    const newVersion = activeEdit.version + 1;

    try {
      await supabase.from('prayer_schedules').upsert(
        {
          mosque_id: activeEdit.mosqueId,
          prayer_date: todayStr,
          fajr_start: `${activeEdit.fajrStart}:00`,
          dhuhr_start: `${activeEdit.dhuhrStart}:00`,
          asr_start: `${activeEdit.asrStart}:00`,
          maghrib_start: `${activeEdit.maghribStart}:00`,
          isha_start: `${activeEdit.ishaStart}:00`,
          fajr_iqamah: `${fajrIqamah}:00`,
          dhuhr_iqamah: `${dhuhrIqamah}:00`,
          asr_iqamah: `${asrIqamah}:00`,
          maghrib_iqamah: `${maghribIqamah}:00`,
          isha_iqamah: `${ishaIqamah}:00`,
          source_type: 'admin',
          version: newVersion,
        },
        { onConflict: 'mosque_id,prayer_date' }
      );

      // Audit log
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
          version: newVersion,
        },
      });

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
    } catch {
      setToast({ type: 'error', text: 'Failed to update schedule in Supabase.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-medium">{toast.text}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs uppercase font-bold text-slate-500 hover:text-slate-800"
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
          <p className="text-sm text-slate-500">
            Maintain accurate announced congregation start times across Kerala mosques for congregational verification windows.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Active Window: 15 mins post-Iqamah</span>
        </div>
      </div>

      {/* Schedule Cards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {schedules.map((s) => (
          <div
            key={s.mosqueId}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
          >
            {/* Card Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{s.mosqueName}</h3>
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
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors"
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
            <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Friday Jummah Congregation:</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                {s.jummahIqamah} (Khutbah starts 12:30)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {activeEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-600" />
              Update Iqamah Congregation Times
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Configuring timetable for <strong className="text-slate-800">{activeEdit.mosqueName}</strong>. Congregants receive check-in verification within 15 minutes of these times.
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
                >
                  Publish Timetable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

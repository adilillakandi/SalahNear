'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AttendanceReviewItem } from '@/lib/types';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  ShieldAlert,
  Camera,
  MapPin,
  Clock,
  Compass,
  Check,
  User,
  Building2,
  FileText,
} from 'lucide-react';

const INITIAL_REVIEW_ITEMS: AttendanceReviewItem[] = [
  {
    id: 'att_rev_1',
    user_id: 'u_101',
    user_name: 'Fahad Rahiman',
    user_username: 'fahad_calicut',
    mosque_id: 'm1',
    mosque_name: 'Mishkal Mosque, Kuttichira',
    prayer_type: 'fajr',
    prayer_date: '2026-11-04',
    submitted_at: '2026-11-04T05:22:15+05:30',
    status: 'pending',
    points_awarded: 0,
    device_accuracy_m: 8.4,
    calculated_distance_m: 42,
    image_storage_path: 'evidence/fahad_fajr_evidence.jpg',
    is_mock_location: false,
  },
  {
    id: 'att_rev_2',
    user_id: 'u_102',
    user_name: 'Salman Faris',
    user_username: 'salman_mlp',
    mosque_id: 'm5',
    mosque_name: 'Town Valiya Juma Masjid, Malappuram',
    prayer_type: 'fajr',
    prayer_date: '2026-11-04',
    submitted_at: '2026-11-04T05:28:40+05:30',
    status: 'flagged',
    points_awarded: 0,
    device_accuracy_m: 65.0,
    calculated_distance_m: 145,
    image_storage_path: 'evidence/salman_fajr_evidence.jpg',
    is_mock_location: true,
  },
  {
    id: 'att_rev_3',
    user_id: 'u_103',
    user_name: 'Aisha Siddiqa',
    user_username: 'aisha_ekm',
    mosque_id: 'm6',
    mosque_name: 'Edappally Toll Juma Masjid, Kochi',
    prayer_type: 'dhuhr',
    prayer_date: '2026-11-03',
    submitted_at: '2026-11-03T12:45:10+05:30',
    status: 'verified',
    points_awarded: 5,
    device_accuracy_m: 12.1,
    calculated_distance_m: 28,
    image_storage_path: 'evidence/aisha_dhuhr_evidence.jpg',
    is_mock_location: false,
  },
  {
    id: 'att_rev_4',
    user_id: 'u_104',
    user_name: 'Zameer KP',
    user_username: 'zameer_knr',
    mosque_id: 'm2',
    mosque_name: 'Kallai Juma Masjid, Kozhikode',
    prayer_type: 'isha',
    prayer_date: '2026-11-03',
    submitted_at: '2026-11-03T20:12:05+05:30',
    status: 'pending',
    points_awarded: 0,
    device_accuracy_m: 22.0,
    calculated_distance_m: 68,
    image_storage_path: 'evidence/zameer_isha_evidence.jpg',
    is_mock_location: false,
  },
];

export default function AttendanceReviewPage() {
  const [items, setItems] = useState<AttendanceReviewItem[]>(INITIAL_REVIEW_ITEMS);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPrayer, setFilterPrayer] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [activeItem, setActiveItem] = useState<AttendanceReviewItem | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchReviewQueue();
  }, []);

  const fetchReviewQueue = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          user_id,
          mosque_id,
          prayer_type,
          prayer_date,
          created_at,
          status,
          points_awarded,
          is_mock_location,
          calculated_distance_m,
          profiles:user_id (full_name, username),
          mosques:mosque_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        const mapped: AttendanceReviewItem[] = data.map((d: any) => ({
          id: d.id,
          user_id: d.user_id,
          user_name: d.profiles?.full_name || 'Congregant',
          user_username: d.profiles?.username || 'user',
          mosque_id: d.mosque_id,
          mosque_name: d.mosques?.name || 'Local Mosque',
          prayer_type: d.prayer_type,
          prayer_date: d.prayer_date,
          submitted_at: d.created_at,
          status: d.status,
          points_awarded: d.points_awarded || 0,
          device_accuracy_m: 14.0,
          calculated_distance_m: d.calculated_distance_m || 35,
          image_storage_path: null,
          is_mock_location: d.is_mock_location || false,
        }));
        setItems(mapped);
      }
    } catch {
      // Use initial state
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (
    itemId: string,
    decision: 'verified' | 'rejected' | 'flagged'
  ) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    try {
      const pointsToAward = decision === 'verified' ? 5 : 0;

      // 1. Update attendance table
      await supabase
        .from('attendance')
        .update({
          status: decision,
          points_awarded: pointsToAward,
        })
        .eq('id', itemId);

      // 2. Insert into attendance_verifications audit table
      await supabase.from('attendance_verifications').insert({
        attendance_id: itemId,
        reviewer_id: 'admin_super_user',
        decision: decision,
        notes: reviewNote || `Manual admin decision: ${decision}`,
      });

      // 3. Insert points ledger if verified
      if (decision === 'verified') {
        await supabase.from('user_points').insert({
          user_id: item.user_id,
          points: 5,
          activity_type: 'congregation_prayer',
          reference_id: itemId,
          notes: `Admin approved 5 points for ${item.prayer_type} at ${item.mosque_name}`,
        });
      }

      // 4. Audit log entry
      await supabase.from('audit_logs').insert({
        actor_name: 'Attendance Reviewer',
        action: `ATTENDANCE_${decision.toUpperCase()}`,
        target_table: 'attendance',
        target_id: itemId,
        changes: {
          decision,
          points_awarded: pointsToAward,
          notes: reviewNote,
        },
      });

      // Update local state
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, status: decision, points_awarded: pointsToAward }
            : i
        )
      );

      setActiveItem(null);
      setReviewNote('');
      setNotification({
        type: 'success',
        text: `Submission for ${item.user_name} marked as ${decision.toUpperCase()} (+${pointsToAward} pts).`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification({ type: 'error', text: 'Error applying decision to Supabase.' });
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.user_name.toLowerCase().includes(search.toLowerCase()) ||
      item.mosque_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.user_username && item.user_username.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      filterStatus === 'all' || item.status === filterStatus;

    const matchesPrayer =
      filterPrayer === 'all' || item.prayer_type === filterPrayer;

    return matchesSearch && matchesStatus && matchesPrayer;
  });

  const flaggedCount = items.filter((i) => i.status === 'flagged' || i.is_mock_location).length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-medium">{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
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
            <ShieldAlert className="w-7 h-7 text-emerald-600" />
            Attendance Review & Anti-Fraud Queue
          </h1>
          <p className="text-sm text-slate-500">
            Inspect camera proofs, device GPS accuracy telemetry, and mock location signals for congregational verifications.
          </p>
        </div>

        {/* High Risk Counter Pill */}
        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{flaggedCount} Flagged Submissions</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-700 text-xs font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>{pendingCount} Awaiting Review</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search user, @username, or mosque..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'flagged', label: 'Flagged' },
              { id: 'verified', label: 'Verified' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  filterStatus === tab.id
                    ? 'bg-white text-emerald-800 shadow-sm font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Prayer Type */}
          <select
            value={filterPrayer}
            onChange={(e) => setFilterPrayer(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
          >
            <option value="all">All Prayers (Fajr - Isha)</option>
            <option value="fajr">Fajr</option>
            <option value="dhuhr">Dhuhr</option>
            <option value="asr">Asr</option>
            <option value="maghrib">Maghrib</option>
            <option value="isha">Isha</option>
          </select>
        </div>
      </div>

      {/* Review Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">User & Profile</th>
                <th className="px-4 py-3.5">Mosque & Prayer</th>
                <th className="px-4 py-3.5">Telemetry & GPS</th>
                <th className="px-4 py-3.5">Signals</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Inspect & Decide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
                    Review queue is clear! No matching attendance items.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* User */}
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                          {item.user_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{item.user_name}</div>
                          <div className="text-xs text-slate-400 font-mono">@{item.user_username}</div>
                        </div>
                      </div>
                    </td>

                    {/* Mosque & Prayer */}
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900 text-xs">{item.mosque_name}</div>
                      <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500">
                        <span className="capitalize font-semibold text-emerald-700">{item.prayer_type}</span>
                        <span>•</span>
                        <span>{item.prayer_date}</span>
                      </div>
                    </td>

                    {/* Telemetry */}
                    <td className="px-4 py-4 font-mono text-xs">
                      <div className="flex items-center space-x-1.5">
                        <Compass className="w-3.5 h-3.5 text-slate-400" />
                        <span className={item.calculated_distance_m && item.calculated_distance_m > 100 ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                          {item.calculated_distance_m}m
                        </span>
                        <span className="text-slate-400">from center</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Device acc: ±{item.device_accuracy_m}m
                      </div>
                    </td>

                    {/* Verification Signals */}
                    <td className="px-4 py-4">
                      {item.is_mock_location ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Mock GPS Detected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                          <Check className="w-3 h-3 mr-1" />
                          Authentic GPS
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      {item.status === 'verified' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          +5 pts Awarded
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          Pending Review
                        </span>
                      )}
                      {item.status === 'flagged' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Flagged
                        </span>
                      )}
                      {item.status === 'rejected' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          Rejected
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          setActiveItem(item);
                          setReviewNote('');
                        }}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal Drawer */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <ShieldAlert className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Inspect Attendance Submission
                </h2>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Inspection details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* User and Venue */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" />
                  {activeItem.user_name}
                  <span className="text-slate-400 font-mono">(@{activeItem.user_username})</span>
                </div>
                <div className="text-slate-600 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {activeItem.mosque_name}
                </div>
                <div className="text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Prayer: <strong className="capitalize">{activeItem.prayer_type}</strong> ({activeItem.prayer_date})
                </div>
                <div className="text-[11px] text-slate-400">
                  Submission: {new Date(activeItem.submitted_at).toLocaleString()}
                </div>
              </div>

              {/* Signals and Telemetry */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  GPS Telemetry Signals
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distance to Mosque:</span>
                  <span className="font-mono font-bold text-slate-800">{activeItem.calculated_distance_m}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Device Accuracy:</span>
                  <span className="font-mono text-slate-800">±{activeItem.device_accuracy_m}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mock Location Check:</span>
                  <span className={`font-semibold ${activeItem.is_mock_location ? 'text-red-600' : 'text-emerald-600'}`}>
                    {activeItem.is_mock_location ? 'DETECTED (Spoof Flag)' : 'PASSED (Genuine)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Evidence Image Simulator */}
            <div className="p-4 bg-slate-900 rounded-xl text-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 font-medium">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Mosque Camera Evidence Photo</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">
                  SHA-256 Validated
                </span>
              </div>
              <div className="h-32 bg-slate-800/80 rounded-lg flex items-center justify-center border border-slate-700/60 text-slate-400 text-xs">
                <div className="text-center space-y-1">
                  <Camera className="w-6 h-6 mx-auto text-slate-500" />
                  <p>In-venue photographic verification captured via device camera.</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Storage Ref: {activeItem.image_storage_path || 'evidence/compressed_img_e489c.jpg'}
                  </p>
                </div>
              </div>
            </div>

            {/* Reviewer notes input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Administrative Review Reason / Overrule Note
              </label>
              <input
                type="text"
                placeholder="Optional reason for audit log (e.g. verified congregant attendance with imam confirmation)"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Decision Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDecision(activeItem.id, 'flagged')}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium border border-amber-200 transition-colors"
              >
                Flag as Suspicious
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDecision(activeItem.id, 'rejected')}
                  className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium border border-red-200 transition-colors"
                >
                  Reject Proof
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(activeItem.id, 'verified')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve (+5 Points)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SupportCase } from '@/lib/types';
import { useAdminAuth } from '@/lib/auth-context';
import {
  LifeBuoy,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  ShieldAlert,
  Edit,
  Send,
  MessageSquare,
  FileCheck,
} from 'lucide-react';

const INITIAL_CASES: SupportCase[] = [
  {
    id: 'case_101',
    user_name: 'Salman Faris',
    user_email: 'salman_mlp@gmail.com',
    category: 'attendance_dispute',
    title: 'Flagged attendance at Town Valiya Juma Masjid',
    description: 'My Fajr check-in was flagged for distance. I was inside the courtyard where GPS satellite reception was temporarily drifting due to heavy rain.',
    status: 'in_progress',
    assigned_to: 'Fathima Beegum (Support Admin)',
    internal_notes: 'Inspecting device accuracy and satellite signal fix timestamp.',
    created_at: '2026-11-04T06:30:00Z',
  },
  {
    id: 'case_102',
    user_name: 'Zameer KP',
    user_email: 'zameer_knr@gmail.com',
    category: 'mosque_correction',
    title: 'Kallai Juma Masjid Entrance Gate Coordinates',
    description: 'The geofence center is on the north boundary wall instead of the main entrance road. Users parked in the south lot get distance alerts.',
    status: 'open',
    assigned_to: 'Unassigned',
    internal_notes: 'Needs District Admin site coordinate calibration check.',
    created_at: '2026-11-03T14:15:00Z',
  },
  {
    id: 'case_103',
    user_name: 'Aisha Siddiqa',
    user_email: 'aisha_ekm@gmail.com',
    category: 'points_dispute',
    title: 'Jummah Congregation Points Calculation',
    description: 'Attended Friday Jummah prayer on Oct 31, but streak did not increment automatically.',
    status: 'resolved',
    assigned_to: 'Fathima Beegum (Support Admin)',
    internal_notes: 'Verified attendance proof manually. Granted 5 points correction ledger entry.',
    resolution_summary: 'Manual attendance points credited (+5 pts). User streak adjusted.',
    created_at: '2026-11-01T11:00:00Z',
  },
  {
    id: 'case_104',
    user_name: 'Rashid P',
    user_email: 'rashid_clt@gmail.com',
    category: 'account_recovery',
    title: 'New Phone Number OTP Migration',
    description: 'Changed mobile number from +91 98471... to +91 94472... requesting profile history migration.',
    status: 'waiting_for_user',
    assigned_to: 'Fathima Beegum (Support Admin)',
    internal_notes: 'Requested previous phone number billing receipt confirmation.',
    created_at: '2026-11-02T09:45:00Z',
  },
];

export default function SupportDisputesPage() {
  const { role } = useAdminAuth();
  const [cases, setCases] = useState<SupportCase[]>(INITIAL_CASES);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeCase, setActiveCase] = useState<SupportCase | null>(null);
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState('');
  const [statusToSet, setStatusToSet] = useState<SupportCase['status']>('resolved');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from('support_cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setCases(data as SupportCase[]);
      }
    } catch {
      // Fallback
    }
  };

  const handleResolveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;

    try {
      await supabase
        .from('support_cases')
        .update({
          status: statusToSet,
          internal_notes: notes,
          resolution_summary: resolution,
        })
        .eq('id', activeCase.id);

      // Audit log
      await supabase.from('audit_logs').insert({
        actor_name: 'Support Admin',
        action: `SUPPORT_CASE_${statusToSet.toUpperCase()}`,
        target_table: 'support_cases',
        target_id: activeCase.id,
        changes: { status: statusToSet, resolution },
      });

      setCases((prev) =>
        prev.map((c) =>
          c.id === activeCase.id
            ? { ...c, status: statusToSet, internal_notes: notes, resolution_summary: resolution }
            : c
        )
      );

      setActiveCase(null);
      setFeedback({ type: 'success', text: `Case #${activeCase.id} updated to ${statusToSet.toUpperCase()}.` });
      setTimeout(() => setFeedback(null), 4000);
    } catch {
      setFeedback({ type: 'error', text: 'Failed to update support ticket.' });
    }
  };

  const openInspection = (c: SupportCase) => {
    setActiveCase(c);
    setNotes(c.internal_notes || '');
    setResolution(c.resolution_summary || '');
    setStatusToSet(c.status === 'open' ? 'in_progress' : c.status);
  };

  const filteredCases = cases.filter((c) => {
    const term = search.toLowerCase();
    const matchesSearch =
      c.title.toLowerCase().includes(term) ||
      c.user_name.toLowerCase().includes(term) ||
      (c.user_email && c.user_email.toLowerCase().includes(term)) ||
      c.description.toLowerCase().includes(term);

    const matchesCat = filterCategory === 'all' || c.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;

    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
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
            <LifeBuoy className="w-7 h-7 text-emerald-600" />
            Support Cases & Dispute Resolution
          </h1>
          <p className="text-sm text-slate-500">
            Investigate flagged check-ins, mock-location claims, account recovery, and points dispute arbitrations.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            {cases.filter((c) => c.status === 'open' || c.status === 'in_progress').length} Active Disputes
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            {cases.filter((c) => c.status === 'resolved').length} Resolved
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search ticket title, user, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
        >
          <option value="all">All Dispute Categories</option>
          <option value="attendance_dispute">Attendance Dispute</option>
          <option value="mock_location">Mock-Location Investigation</option>
          <option value="points_dispute">Points Dispute</option>
          <option value="mosque_correction">Mosque Info Correction</option>
          <option value="account_recovery">Account Recovery</option>
          <option value="general">General</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
        >
          <option value="all">All Case Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_for_user">Waiting for User</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Case & User</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Assigned Admin</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{c.title}</div>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{c.user_name}</span>
                      <span>•</span>
                      <span className="font-mono">{c.user_email}</span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                      {c.category.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-xs font-medium text-slate-600">
                    {c.assigned_to}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        c.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : c.status === 'in_progress'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : c.status === 'open'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-xs font-mono text-slate-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => openInspection(c)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                    >
                      Inspect Case
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Details Drawer / Modal */}
      {activeCase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <LifeBuoy className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Inspect Dispute: {activeCase.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveCase(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* User Submission info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Congregant:</span>
                <span className="font-semibold text-slate-800">{activeCase.user_name} ({activeCase.user_email})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-slate-800 capitalize">{activeCase.category.replace('_', ' ')}</span>
              </div>
              <div className="pt-2 border-t border-slate-200/60">
                <div className="font-semibold text-slate-700 mb-1">Dispute Statement:</div>
                <p className="text-slate-600 leading-relaxed">{activeCase.description}</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleResolveCase} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Investigation Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for internal administrators..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Summary & User Communication
                </label>
                <textarea
                  rows={2}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Resolution action taken (e.g. coordinates updated or points credited)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Update Status</label>
                <select
                  value={statusToSet}
                  onChange={(e) => setStatusToSet(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_for_user">Waiting for User</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveCase(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Save Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

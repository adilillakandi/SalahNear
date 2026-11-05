'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SupportCase } from '@/lib/types';
import { useAdminAuth } from '@/lib/auth-context';
import {
  LifeBuoy,
  Search,
  CheckCircle2,
  AlertCircle,
  User,
  ShieldAlert,
  RotateCcw,
  Loader2,
  Trash2,
  Award,
  AlertTriangle,
} from 'lucide-react';

export default function SupportDisputesPage() {
  const { role } = useAdminAuth();
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Active Case Inspection Drawer / Modal
  const [activeCase, setActiveCase] = useState<SupportCase | null>(null);
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState('');
  const [statusToSet, setStatusToSet] = useState<SupportCase['status']>('resolved');
  const [pointsToAward, setPointsToAward] = useState<number>(0);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    caseItem: SupportCase | null;
  }>({
    isOpen: false,
    caseItem: null,
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      // 1. Try consolidated support_cases_view first
      const { data: viewData, error: viewError } = await supabase
        .from('support_cases_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (!viewError && viewData) {
        setCases(viewData as SupportCase[]);
        return;
      }

      // 2. Direct table fallback
      const { data, error } = await supabase
        .from('support_cases')
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: SupportCase[] = data.map((d: any) => ({
          id: d.id,
          user_id: d.user_id,
          user_name: d.user_name || d.profiles?.full_name || 'Community Member',
          user_email: d.user_email || d.profiles?.email || 'user@salahnear.org',
          category: d.category,
          title: d.title,
          description: d.description,
          status: d.status,
          assigned_to: d.assigned_to || 'Unassigned',
          internal_notes: d.internal_notes,
          resolution_summary: d.resolution_summary,
          created_at: d.created_at,
          updated_at: d.updated_at,
        }));
        setCases(mapped);
      }
    } catch (err: any) {
      console.error('Failed to load support disputes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;

    setIsSaving(true);
    try {
      // 1. Try atomic resolve_support_case RPC
      const { error: rpcError } = await supabase.rpc('resolve_support_case', {
        p_case_id: activeCase.id,
        p_status: statusToSet,
        p_internal_notes: notes,
        p_resolution_summary: resolution,
        p_points_to_award: pointsToAward,
      });

      if (rpcError) {
        // Fallback: direct table update
        const { error: updateError } = await supabase
          .from('support_cases')
          .update({
            status: statusToSet,
            internal_notes: notes,
            resolution_summary: resolution,
            resolved_at: ['resolved', 'closed'].includes(statusToSet) ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeCase.id);

        if (updateError) throw updateError;

        // If points awarded and user_id present
        if (pointsToAward > 0 && activeCase.user_id) {
          await supabase.from('user_points').insert({
            user_id: activeCase.user_id,
            points: pointsToAward,
            reason: 'support_arbitration_credit',
            notes: resolution || 'Dispute resolved in favor of congregant',
            activity_type: 'admin_adjustment',
          });
        }

        // Audit log
        await supabase.from('audit_logs').insert({
          actor_name: 'Support Admin',
          action: `SUPPORT_CASE_${statusToSet.toUpperCase()}`,
          target_table: 'support_cases',
          target_id: activeCase.id,
          changes: { status: statusToSet, resolution, pointsAwarded: pointsToAward },
        });
      }

      setCases((prev) =>
        prev.map((c) =>
          c.id === activeCase.id
            ? { ...c, status: statusToSet, internal_notes: notes, resolution_summary: resolution }
            : c
        )
      );

      setActiveCase(null);
      setPointsToAward(0);
      setFeedback({
        type: 'success',
        text: `Dispute ticket #${activeCase.id.slice(0, 8)} updated to ${statusToSet.toUpperCase()}${
          pointsToAward > 0 ? ` (+${pointsToAward} pts credited)` : ''
        }.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to update support ticket.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openInspection = (c: SupportCase) => {
    setActiveCase(c);
    setNotes(c.internal_notes || '');
    setResolution(c.resolution_summary || '');
    setStatusToSet(c.status === 'open' ? 'in_progress' : c.status);
    setPointsToAward(0);
  };

  const initiateDelete = (c: SupportCase) => {
    setDeleteModal({
      isOpen: true,
      caseItem: c,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.caseItem) return;
    const caseItem = deleteModal.caseItem;
    setDeleteModal({ isOpen: false, caseItem: null });

    try {
      // 1. Try atomic delete_support_case RPC
      const { error: rpcError } = await supabase.rpc('delete_support_case', {
        p_case_id: caseItem.id,
        p_reason: 'Removed by Support Admin',
      });

      if (rpcError) {
        // Fallback: direct table delete
        const { error: deleteError } = await supabase
          .from('support_cases')
          .delete()
          .eq('id', caseItem.id);

        if (deleteError) throw deleteError;

        await supabase.from('audit_logs').insert({
          actor_name: 'Support Admin',
          action: 'SUPPORT_CASE_DELETED',
          target_table: 'support_cases',
          target_id: caseItem.id,
          changes: { title: caseItem.title, user: caseItem.user_name },
        });
      }

      setCases((prev) => prev.filter((c) => c.id !== caseItem.id));
      setFeedback({
        type: 'success',
        text: `Ticket "${caseItem.title}" has been deleted.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to delete support ticket.',
      });
    }
  };

  const filteredCases = cases.filter((c) => {
    const term = search.toLowerCase();
    const matchesSearch =
      c.title.toLowerCase().includes(term) ||
      (c.user_name && c.user_name.toLowerCase().includes(term)) ||
      (c.user_email && c.user_email.toLowerCase().includes(term)) ||
      (c.description && c.description.toLowerCase().includes(term));

    const matchesCat = filterCategory === 'all' || c.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;

    return matchesSearch && matchesCat && matchesStatus;
  });

  const activeCount = cases.filter(
    (c) => c.status === 'open' || c.status === 'in_progress' || c.status === 'waiting_for_user'
  ).length;
  const resolvedCount = cases.filter(
    (c) => c.status === 'resolved' || c.status === 'closed'
  ).length;

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
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

        <div className="flex items-center space-x-3 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            {activeCount} Active Disputes
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            {resolvedCount} Resolved
          </span>
          <button
            onClick={fetchCases}
            title="Refresh Disputes"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
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
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-700"
        >
          <option value="all">All Dispute Categories</option>
          <option value="attendance_dispute">Attendance Dispute</option>
          <option value="mock_location">Mock-Location Investigation</option>
          <option value="points_dispute">Points Dispute</option>
          <option value="mosque_correction">Mosque Info Correction</option>
          <option value="account_recovery">Account Recovery</option>
          <option value="friend_dispute">Brotherhood Encounter</option>
          <option value="general">General</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-700"
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
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    <span className="text-sm font-medium">Loading dispute tickets...</span>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No support disputes found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search || filterCategory !== 'all' || filterStatus !== 'all'
                        ? 'Try clearing search filters.'
                        : 'All congregant inquiries and appeals are currently resolved.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Case & User */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{c.title}</div>
                      <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                        <User className="w-3.5 h-3.5" />
                        <span>{c.user_name}</span>
                        <span>•</span>
                        <span className="font-mono">{c.user_email}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                        {c.category.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Assigned Admin */}
                    <td className="px-4 py-4 text-xs font-medium text-slate-600">
                      {c.assigned_to || 'Unassigned'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          c.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.status === 'in_progress'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : c.status === 'open'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : c.status === 'waiting_for_user'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4 text-xs font-mono text-slate-400">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openInspection(c)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                        >
                          Inspect Case
                        </button>
                        <button
                          onClick={() => initiateDelete(c)}
                          title="Delete Dispute"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
                <span className="font-semibold text-slate-800">
                  {activeCase.user_name} ({activeCase.user_email})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {activeCase.category.replace('_', ' ')}
                </span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Update Status</label>
                  <select
                    value={statusToSet}
                    onChange={(e) => setStatusToSet(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-700"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_for_user">Waiting for User</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {['attendance_dispute', 'points_dispute', 'mock_location'].includes(activeCase.category) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      Points Compensation
                    </label>
                    <select
                      value={pointsToAward}
                      onChange={(e) => setPointsToAward(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-700"
                    >
                      <option value={0}>No Points Adjustment (0 pts)</option>
                      <option value={5}>Credit Congregational Attendance (+5 pts)</option>
                      <option value={10}>Goodwill Adjustment (+10 pts)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveCase(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Resolution'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.caseItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3.5 mb-4">
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  Delete Support Dispute
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Are you sure you want to delete dispute ticket{' '}
                  <strong className="text-slate-800 font-semibold">{deleteModal.caseItem.title}</strong>{' '}
                  submitted by {deleteModal.caseItem.user_name}? This will permanently remove the record from the support queue.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, caseItem: null })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors"
              >
                Yes, Delete Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

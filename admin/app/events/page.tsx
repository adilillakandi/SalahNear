'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MosqueEvent } from '@/lib/types';
import { useAdminAuth } from '@/lib/auth-context';
import {
  CalendarDays,
  Plus,
  Search,
  Building2,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

type ConfirmActionType = 'complete' | 'cancel' | 'reopen' | 'reactivate' | 'delete';

interface ConfirmModalState {
  isOpen: boolean;
  action: ConfirmActionType;
  event: MosqueEvent | null;
}

export default function MosqueEventsPage() {
  const { role } = useAdminAuth();
  const [events, setEvents] = useState<MosqueEvent[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'completed' | 'cancelled'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Confirmation Dialog State
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    action: 'complete',
    event: null,
  });

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mosqueName, setMosqueName] = useState('');
  const [mosqueId, setMosqueId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('Main Prayer Hall');
  const [availableMosques, setAvailableMosques] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Load local storage cache if available, purging any old mock data
    try {
      const saved = localStorage.getItem('salahnear_mosque_events');
      if (saved) {
        const parsed: MosqueEvent[] = JSON.parse(saved);
        const realEvents = parsed.filter(
          (e) => e.id !== 'evt_1' && e.id !== 'evt_2' && e.id !== 'evt_3'
        );
        if (realEvents.length !== parsed.length) {
          localStorage.setItem('salahnear_mosque_events', JSON.stringify(realEvents));
        }
        setEvents(realEvents);
      }
    } catch {
      // Ignore
    }
    fetchEvents();
    fetchMosques();
  }, []);

  const fetchMosques = async () => {
    try {
      const { data, error } = await supabase
        .from('mosques')
        .select('id, name')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        setAvailableMosques(data);
        setMosqueId(data[0].id);
        setMosqueName(data[0].name);
      }
    } catch {
      // Fallback
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('mosque_events')
        .select(`
          id,
          mosque_id,
          title,
          description,
          event_date,
          venue,
          status,
          created_at,
          mosques:mosque_id (name)
        `)
        .order('event_date', { ascending: true });

      if (!error && data) {
        const mapped: MosqueEvent[] = data.map((d: any) => ({
          id: d.id,
          mosque_id: d.mosque_id,
          mosque_name: d.mosques?.name || 'Local Mosque',
          title: d.title,
          description: d.description,
          event_date: d.event_date,
          venue: d.venue,
          status: d.status,
          created_at: d.created_at,
        }));
        setEvents(mapped);
        try {
          localStorage.setItem('salahnear_mosque_events', JSON.stringify(mapped));
        } catch {
          // Ignore
        }
      }
    } catch {
      // Fallback
    }
  };

  // Open confirmation modal for any action
  const openConfirmModal = (action: ConfirmActionType, event: MosqueEvent) => {
    setConfirmModal({
      isOpen: true,
      action,
      event,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      action: 'complete',
      event: null,
    });
  };

  // Handler for confirmed dialog action
  const handleConfirmAction = async () => {
    const { action, event } = confirmModal;
    if (!event) return;

    closeConfirmModal();

    if (action === 'delete') {
      await executeDeleteEvent(event);
    } else if (action === 'complete') {
      await executeUpdateStatus(event.id, 'completed', 'Marked as COMPLETED');
    } else if (action === 'cancel') {
      await executeUpdateStatus(event.id, 'cancelled', 'Event CANCELLED');
    } else if (action === 'reopen' || action === 'reactivate') {
      await executeUpdateStatus(
        event.id,
        'published',
        action === 'reopen' ? 'Event RE-OPENED to Published' : 'Event REACTIVATED to Published'
      );
    }
  };

  // Status transition execution
  const executeUpdateStatus = async (id: string, newStatus: MosqueEvent['status'], feedbackMsg: string) => {
    // 1. Update UI state & local cache
    setEvents((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e));
      try {
        localStorage.setItem('salahnear_mosque_events', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });

    // 2. Persist to Supabase
    try {
      await supabase
        .from('mosque_events')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      // Audit log
      await supabase.from('audit_logs').insert({
        actor_name: role.toUpperCase(),
        action: `MOSQUE_EVENT_${newStatus.toUpperCase()}`,
        target_table: 'mosque_events',
        target_id: id,
        changes: { status: newStatus },
      });
    } catch {
      // Offline fallback
    }

    setFeedback({
      type: 'success',
      text: feedbackMsg,
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Delete event execution
  const executeDeleteEvent = async (event: MosqueEvent) => {
    // 1. Update UI state & local cache
    setEvents((prev) => {
      const updated = prev.filter((e) => e.id !== event.id);
      try {
        localStorage.setItem('salahnear_mosque_events', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });

    // 2. Persist to Supabase
    try {
      await supabase.from('mosque_events').delete().eq('id', event.id);

      await supabase.from('audit_logs').insert({
        actor_name: role.toUpperCase(),
        action: 'MOSQUE_EVENT_DELETED',
        target_table: 'mosque_events',
        target_id: event.id,
        changes: { title: event.title, mosque: event.mosque_name },
      });
    } catch {
      // Offline fallback
    }

    setFeedback({
      type: 'success',
      text: `Event "${event.title}" has been permanently deleted.`,
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setVenue('Main Prayer Hall');
    // Set default date to upcoming Saturday or tomorrow 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEventDate(localIso);
    setShowCreateModal(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedMosque = availableMosques.find((m) => m.id === mosqueId);
    const currentMosqueName = selectedMosque?.name || mosqueName || 'Local Mosque';

    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}`;
    const newEvent: MosqueEvent = {
      id: tempId,
      mosque_id: mosqueId || tempId,
      mosque_name: currentMosqueName,
      title,
      description,
      event_date: eventDate,
      venue,
      status: 'published',
      created_at: new Date().toISOString(),
    };

    setEvents((prev) => {
      const updated = [newEvent, ...prev];
      try {
        localStorage.setItem('salahnear_mosque_events', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });

    try {
      const insertPayload: Record<string, any> = {
        title,
        description,
        event_date: new Date(eventDate).toISOString(),
        venue,
        status: 'published',
      };
      if (mosqueId) {
        insertPayload.mosque_id = mosqueId;
      }

      const { data, error } = await supabase
        .from('mosque_events')
        .insert(insertPayload)
        .select()
        .single();

      if (!error && data) {
        newEvent.id = data.id;
      }

      await supabase.from('audit_logs').insert({
        actor_name: role.toUpperCase(),
        action: 'MOSQUE_EVENT_CREATED',
        target_table: 'mosque_events',
        target_id: newEvent.id,
        changes: { title, mosqueName: currentMosqueName, eventDate },
      });
    } catch {
      // Fallback
    }

    setShowCreateModal(false);
    setTitle('');
    setDescription('');
    setFeedback({ type: 'success', text: `Event "${title}" published.` });
    setTimeout(() => setFeedback(null), 4000);
  };

  const filteredEvents = events.filter((e) => {
    const term = search.toLowerCase();
    const matchesSearch =
      e.title.toLowerCase().includes(term) ||
      (e.description && e.description.toLowerCase().includes(term)) ||
      (e.mosque_name && e.mosque_name.toLowerCase().includes(term));

    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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
            <CalendarDays className="w-7 h-7 text-emerald-600" />
            Mosque Events & Congregational Programs
          </h1>
          <p className="text-sm text-slate-500">
            Publish weekly classes, community Fajr gatherings, and special Ramadan or Friday events.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-colors gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Mosque Event
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search event title, venue, or mosque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
          {(
            [
              { id: 'all', label: `All (${events.length})` },
              { id: 'published', label: 'Published' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === tab.id
                  ? 'bg-white text-emerald-800 shadow-sm font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <CalendarDays className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              {search || statusFilter !== 'all' ? 'No Matching Events' : 'No Mosque Events Yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
              {search || statusFilter !== 'all'
                ? 'No events match your search query or filter. Try clearing filters.'
                : 'There are currently no events. Schedule and publish your first congregational event, Friday Khutbah, or community gathering.'}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition-colors gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Mosque Event
            </button>
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-sm transition-all hover:shadow-md ${
                evt.status === 'completed'
                  ? 'border-blue-200 bg-blue-50/10'
                  : evt.status === 'cancelled'
                  ? 'border-red-200 bg-red-50/10 opacity-80'
                  : 'border-slate-200 hover:border-emerald-500/40'
              }`}
            >
              <div>
                {/* Header badges & Actions */}
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 truncate max-w-[200px]">
                    <Building2 className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{evt.mosque_name}</span>
                  </span>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    {/* Status Badge */}
                    {evt.status === 'published' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                        <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
                        Published
                      </span>
                    )}
                    {evt.status === 'completed' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600" />
                        Completed
                      </span>
                    )}
                    {evt.status === 'cancelled' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase tracking-wide">
                        <XCircle className="w-3 h-3 mr-1 text-red-600" />
                        Cancelled
                      </span>
                    )}
                  </div>
                </div>

                <h3
                  className={`font-bold text-slate-900 text-base mb-2 leading-snug ${
                    evt.status === 'cancelled' ? 'line-through text-slate-500' : ''
                  }`}
                >
                  {evt.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">{evt.description}</p>
              </div>

              {/* Footer and Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                <div className="flex items-center space-x-1.5 font-medium text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{new Date(evt.event_date).toLocaleString()}</span>
                </div>
                {evt.venue && (
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{evt.venue}</span>
                  </div>
                )}

                {/* Status action buttons */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  {evt.status === 'published' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openConfirmModal('complete', evt)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Completed</span>
                      </button>
                      <button
                        onClick={() => openConfirmModal('cancel', evt)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition-colors shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Event</span>
                      </button>
                    </div>
                  )}

                  {evt.status === 'completed' && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        Event Completed
                      </span>
                      <button
                        onClick={() => openConfirmModal('reopen', evt)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-600 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3 mr-0.5" />
                        <span>Re-open</span>
                      </button>
                    </div>
                  )}

                  {evt.status === 'cancelled' && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        Event Cancelled
                      </span>
                      <button
                        onClick={() => openConfirmModal('reactivate', evt)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-600 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3 mr-0.5" />
                        <span>Reactivate</span>
                      </button>
                    </div>
                  )}

                  {/* Single Bottom Trash Button for all statuses */}
                  <button
                    type="button"
                    onClick={() => openConfirmModal('delete', evt)}
                    title="Delete event"
                    aria-label="Delete Event"
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmModal.isOpen && confirmModal.event && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start space-x-3 mb-4">
              {confirmModal.action === 'delete' && (
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
              )}
              {confirmModal.action === 'cancel' && (
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              {confirmModal.action === 'complete' && (
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}
              {(confirmModal.action === 'reopen' || confirmModal.action === 'reactivate') && (
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {confirmModal.action === 'delete' && 'Permanently Delete Event?'}
                  {confirmModal.action === 'cancel' && 'Cancel Mosque Event?'}
                  {confirmModal.action === 'complete' && 'Mark Event as Completed?'}
                  {confirmModal.action === 'reopen' && 'Re-open Completed Event?'}
                  {confirmModal.action === 'reactivate' && 'Reactivate Cancelled Event?'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {confirmModal.action === 'delete' && (
                    <>
                      Are you sure you want to permanently delete{' '}
                      <span className="font-semibold text-slate-900">"{confirmModal.event.title}"</span>?
                      This will remove it from the system and attendees. This action cannot be undone.
                    </>
                  )}
                  {confirmModal.action === 'cancel' && (
                    <>
                      Are you sure you want to cancel{' '}
                      <span className="font-semibold text-slate-900">"{confirmModal.event.title}"</span>?
                      The event will be marked as Cancelled on community schedules.
                    </>
                  )}
                  {confirmModal.action === 'complete' && (
                    <>
                      Are you sure you want to mark{' '}
                      <span className="font-semibold text-slate-900">"{confirmModal.event.title}"</span> as completed?
                      Attendees will see that this congregation has concluded.
                    </>
                  )}
                  {confirmModal.action === 'reopen' && (
                    <>
                      Are you sure you want to re-open{' '}
                      <span className="font-semibold text-slate-900">"{confirmModal.event.title}"</span>?
                      It will be restored back to Published status.
                    </>
                  )}
                  {confirmModal.action === 'reactivate' && (
                    <>
                      Are you sure you want to reactivate{' '}
                      <span className="font-semibold text-slate-900">"{confirmModal.event.title}"</span>?
                      It will be restored back to Published status.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closeConfirmModal}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                No, Keep It
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-colors ${
                  confirmModal.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmModal.action === 'cancel'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmModal.action === 'delete' && 'Yes, Delete Event'}
                {confirmModal.action === 'cancel' && 'Yes, Cancel Event'}
                {confirmModal.action === 'complete' && 'Yes, Mark Completed'}
                {confirmModal.action === 'reopen' && 'Yes, Re-open Event'}
                {confirmModal.action === 'reactivate' && 'Yes, Reactivate Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              Schedule Mosque Community Event
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Add details for the upcoming congregational program or lecture.
            </p>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Friday Jummah Special Khutbah"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Program overview and speaker details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mosque</label>
                {availableMosques.length > 0 ? (
                  <select
                    value={mosqueId}
                    onChange={(e) => {
                      const sel = availableMosques.find((m) => m.id === e.target.value);
                      setMosqueId(e.target.value);
                      if (sel) setMosqueName(sel.name);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    {availableMosques.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mishkal Mosque"
                    value={mosqueName}
                    onChange={(e) => setMosqueName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hall / Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Prayer Hall"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
                >
                  Publish Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

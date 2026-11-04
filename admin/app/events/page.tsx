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
} from 'lucide-react';

const INITIAL_EVENTS: MosqueEvent[] = [
  {
    id: 'evt_1',
    mosque_id: 'm1',
    mosque_name: 'Mishkal Mosque, Kuttichira',
    title: 'Friday Jummah Special Khutbah Series',
    description: 'Weekly reflection on Islamic Ethics in Community Living delivered by Imam Rashid Moulavi.',
    event_date: '2026-11-07T12:30:00+05:30',
    venue: 'Main Prayer Hall & Courtyard',
    status: 'published',
    created_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'evt_2',
    mosque_id: 'm1',
    mosque_name: 'Mishkal Mosque, Kuttichira',
    title: 'Community Fajr Awakening & Breakfast',
    description: 'Congregational Fajr prayer followed by collective remembrance, youth mentoring circle, and traditional breakfast.',
    event_date: '2026-11-08T05:20:00+05:30',
    venue: 'Mishkal Madrasa Hall',
    status: 'published',
    created_at: '2026-11-02T12:00:00Z',
  },
  {
    id: 'evt_3',
    mosque_id: 'm4',
    mosque_name: 'Cheraman Juma Masjid, Kodungallur',
    title: 'Historic Heritage Exhibition & Lecture',
    description: 'Exhibition exploring the 1400-year history of Islam in Kerala and the founding of the Cheraman Mosque.',
    event_date: '2026-11-15T16:00:00+05:30',
    venue: 'Cheraman Islamic Heritage Museum',
    status: 'published',
    created_at: '2026-11-03T14:00:00Z',
  },
];

export default function MosqueEventsPage() {
  const { role } = useAdminAuth();
  const [events, setEvents] = useState<MosqueEvent[]>(INITIAL_EVENTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'completed' | 'cancelled'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mosqueName, setMosqueName] = useState('Mishkal Mosque, Kuttichira');
  const [eventDate, setEventDate] = useState('2026-11-10T18:00');
  const [venue, setVenue] = useState('Main Prayer Hall');

  useEffect(() => {
    // Load local storage cache if available
    try {
      const saved = localStorage.getItem('salahnear_mosque_events');
      if (saved) {
        setEvents(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
    fetchEvents();
  }, []);

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

      if (!error && data && data.length > 0) {
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
      }
    } catch {
      // Fallback
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: MosqueEvent['status']) => {
    // 1. Immediately update UI state & cache
    setEvents((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e));
      try {
        localStorage.setItem('salahnear_mosque_events', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });

    // 2. Persist to Supabase if database table exists
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
      // State is already updated locally
    }

    setFeedback({
      type: 'success',
      text:
        newStatus === 'completed'
          ? 'Event marked as COMPLETED.'
          : newStatus === 'cancelled'
          ? 'Event has been CANCELLED.'
          : 'Event restored to PUBLISHED.',
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: MosqueEvent = {
      id: `evt_${Date.now()}`,
      mosque_id: 'm1',
      mosque_name: mosqueName,
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
      await supabase.from('mosque_events').insert({
        mosque_id: 'a1111111-1111-1111-1111-111111111111',
        title,
        description,
        event_date: new Date(eventDate).toISOString(),
        venue,
        status: 'published',
      });
      await supabase.from('audit_logs').insert({
        actor_name: 'Mosque Administrator',
        action: 'MOSQUE_EVENT_CREATED',
        target_table: 'mosque_events',
        target_id: newEvent.id,
        changes: { title, mosqueName, eventDate },
      });
    } catch {
      // Fallback
    }

    setShowCreateModal(false);
    setTitle('');
    setDescription('');
    setFeedback({ type: 'success', text: `Event "${title}" published for ${mosqueName}.` });
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
          onClick={() => setShowCreateModal(true)}
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
            <CalendarDays className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            No mosque events match your filter.
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-sm transition-all ${
                evt.status === 'completed'
                  ? 'border-emerald-300/80 bg-emerald-50/10'
                  : evt.status === 'cancelled'
                  ? 'border-red-200 bg-red-50/10 opacity-75'
                  : 'border-slate-200 hover:border-emerald-500/40'
              }`}
            >
              <div>
                {/* Header badges */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Building2 className="w-3 h-3 mr-1" />
                    {evt.mosque_name}
                  </span>

                  {/* Status Badge */}
                  {evt.status === 'published' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                      <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
                      Published
                    </span>
                  )}
                  {evt.status === 'completed' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600" />
                      Completed
                    </span>
                  )}
                  {evt.status === 'cancelled' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase tracking-wide">
                      <XCircle className="w-3 h-3 mr-1 text-red-600" />
                      Cancelled
                    </span>
                  )}
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
                <div className="pt-2 flex items-center justify-end space-x-2">
                  {evt.status === 'published' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(evt.id, 'completed')}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Completed</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(evt.id, 'cancelled')}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Event</span>
                      </button>
                    </>
                  )}

                  {evt.status === 'completed' && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Event Completed
                      </span>
                      <button
                        onClick={() => handleUpdateStatus(evt.id, 'published')}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-600 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3 mr-0.5" />
                        <span>Re-open</span>
                      </button>
                    </div>
                  )}

                  {evt.status === 'cancelled' && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        Event Cancelled
                      </span>
                      <button
                        onClick={() => handleUpdateStatus(evt.id, 'published')}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-600 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3 mr-0.5" />
                        <span>Reactivate</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mosque Venue</label>
                <input
                  type="text"
                  required
                  value={mosqueName}
                  onChange={(e) => setMosqueName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
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

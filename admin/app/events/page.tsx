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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mosqueName, setMosqueName] = useState('Mishkal Mosque, Kuttichira');
  const [eventDate, setEventDate] = useState('2026-11-10T18:00');
  const [venue, setVenue] = useState('Main Prayer Hall');

  useEffect(() => {
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

    setEvents((prev) => [newEvent, ...prev]);
    setShowCreateModal(false);
    setTitle('');
    setDescription('');
    setFeedback({ type: 'success', text: `Event "${title}" published for ${mosqueName}.` });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUpdateStatus = (id: string, status: MosqueEvent['status']) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e))
    );
    setFeedback({ type: 'success', text: `Event status updated to ${status}.` });
    setTimeout(() => setFeedback(null), 3000);
  };

  const filteredEvents = events.filter((e) => {
    const term = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(term) ||
      (e.description && e.description.toLowerCase().includes(term)) ||
      (e.mosque_name && e.mosque_name.toLowerCase().includes(term))
    );
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

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search event title, venue, or mosque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Building2 className="w-3 h-3 mr-1" />
                  {evt.mosque_name}
                </span>

                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                    evt.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800'
                      : evt.status === 'completed'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {evt.status}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base mb-2 leading-snug">{evt.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">{evt.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
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

              <div className="pt-2 flex items-center justify-end space-x-2">
                {evt.status === 'published' && (
                  <button
                    onClick={() => handleUpdateStatus(evt.id, 'completed')}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-600"
                  >
                    Mark Completed
                  </button>
                )}
                {evt.status !== 'cancelled' && (
                  <button
                    onClick={() => handleUpdateStatus(evt.id, 'cancelled')}
                    className="px-2.5 py-1 rounded-lg text-red-600 hover:bg-red-50 text-[11px] font-medium"
                  >
                    Cancel Event
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
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


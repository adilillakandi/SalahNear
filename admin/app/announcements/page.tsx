'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Announcement } from '@/lib/types';
import { useAdminAuth } from '@/lib/auth-context';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Globe,
  MapPin,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  Archive,
  Bell,
  Eye,
  Trash2,
} from 'lucide-react';

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann_1',
    title: 'Ramadan 1448 Hijri Timetable Coordination',
    body: 'All mosque administrators across Kerala are requested to publish their updated Maghrib and Fajr congregation schedules by Sha’ban 25.',
    language: 'both',
    scope_type: 'platform',
    scope_target: null,
    status: 'published',
    published_at: '2026-11-01T08:00:00Z',
    expires_at: '2026-12-01T00:00:00Z',
    send_push: true,
    author_name: 'Dr. Abdul Rahman Koya (Super Admin)',
    created_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 'ann_2',
    title: 'Kozhikode District Mosque Renovation Alert',
    body: 'Mishkal Mosque courtyard expansion works are scheduled for this Friday. Special Jummah congregation arrangements are in place.',
    language: 'ml',
    scope_type: 'district',
    scope_target: 'Kozhikode',
    status: 'published',
    published_at: '2026-11-03T10:00:00Z',
    expires_at: '2026-11-10T00:00:00Z',
    send_push: false,
    author_name: 'Zuhair Ahmed (District Admin)',
    created_at: '2026-11-03T10:00:00Z',
  },
  {
    id: 'ann_3',
    title: 'Mishkal Mosque Weekly Quran Study Circle',
    body: 'Join us every Saturday evening after Maghrib prayer for Tafseer sessions by Imam Rashid Moulavi.',
    language: 'both',
    scope_type: 'mosque',
    scope_target: 'Mishkal Mosque, Kuttichira',
    status: 'published',
    published_at: '2026-11-02T15:30:00Z',
    expires_at: '2026-12-31T00:00:00Z',
    send_push: true,
    author_name: 'Imam Rashid Moulavi (Mosque Admin)',
    created_at: '2026-11-02T15:30:00Z',
  },
];

export default function AnnouncementsPage() {
  const { role, activeDistrict } = useAdminAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [search, setSearch] = useState('');
  const [filterScope, setFilterScope] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [language, setLanguage] = useState<'en' | 'ml' | 'both'>('both');
  const [scopeType, setScopeType] = useState<'platform' | 'state' | 'district' | 'mosque'>('district');
  const [scopeTarget, setScopeTarget] = useState('Kozhikode');
  const [sendPush, setSendPush] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setAnnouncements(data as Announcement[]);
      }
    } catch {
      // Fallback
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAnn: Announcement = {
      id: `ann_${Date.now()}`,
      title,
      body,
      language,
      scope_type: scopeType,
      scope_target: scopeType === 'platform' ? null : scopeTarget,
      status: 'published',
      published_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      send_push: sendPush,
      author_name: role === 'super_admin' ? 'Super Admin' : 'Mosque Admin',
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('announcements').insert(newAnn);
      await supabase.from('audit_logs').insert({
        actor_name: role.toUpperCase(),
        action: 'ANNOUNCEMENT_PUBLISHED',
        target_table: 'announcements',
        target_id: newAnn.id,
        changes: { title, scopeType, sendPush },
      });
    } catch {
      // Fallback
    }

    setAnnouncements((prev) => [newAnn, ...prev]);
    setShowCreateModal(false);
    setTitle('');
    setBody('');
    setFeedback({
      type: 'success',
      text: `Announcement "${title}" published successfully${sendPush ? ' and queued for push delivery' : ''}.`,
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleArchive = async (id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'archived' } : a))
    );
    setFeedback({ type: 'success', text: 'Announcement archived.' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const filteredAnnouncements = announcements.filter((a) => {
    const term = search.toLowerCase();
    const matchesSearch =
      a.title.toLowerCase().includes(term) ||
      a.body.toLowerCase().includes(term) ||
      (a.scope_target && a.scope_target.toLowerCase().includes(term));

    const matchesScope = filterScope === 'all' || a.scope_type === filterScope;

    return matchesSearch && matchesScope;
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
            <Megaphone className="w-7 h-7 text-emerald-600" />
            Scoped Announcements & Broadcasts
          </h1>
          <p className="text-sm text-slate-500">
            Publish targeted notifications across Kerala, specific districts, or local mosque congregations.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-colors gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search announcement title, contents, or target scope..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <select
          value={filterScope}
          onChange={(e) => setFilterScope(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
        >
          <option value="all">All Audience Scopes</option>
          <option value="platform">Platform-wide</option>
          <option value="state">State-wide (Kerala)</option>
          <option value="district">District-level</option>
          <option value="mosque">Mosque-level</option>
        </select>
      </div>

      {/* Announcements Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAnnouncements.map((ann) => (
          <div
            key={ann.id}
            className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col justify-between transition-all ${
              ann.status === 'archived' ? 'opacity-60 border-slate-200' : 'border-slate-200 hover:border-emerald-500/40'
            }`}
          >
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                  {ann.scope_type === 'platform' && <Globe className="w-3 h-3 mr-1" />}
                  {ann.scope_type === 'district' && <MapPin className="w-3 h-3 mr-1" />}
                  {ann.scope_type === 'mosque' && <Building2 className="w-3 h-3 mr-1" />}
                  {ann.scope_target ? `${ann.scope_type}: ${ann.scope_target}` : 'All Kerala'}
                </span>

                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  {ann.send_push && (
                    <span title="Push notification enabled" className="p-1 rounded bg-amber-50 text-amber-600">
                      <Bell className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span className="font-mono uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                    {ann.language}
                  </span>
                </div>
              </div>

              {/* Title & Body */}
              <h3 className="font-bold text-slate-900 text-base mb-2 leading-snug">{ann.title}</h3>
              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">{ann.body}</p>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <div className="truncate mr-2">
                <div>{ann.author_name}</div>
                <div className="text-[10px]">{new Date(ann.created_at).toLocaleDateString()}</div>
              </div>

              {ann.status !== 'archived' && (
                <button
                  onClick={() => handleArchive(ann.id)}
                  title="Archive Announcement"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-emerald-600" />
              Publish Scoped Announcement
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Configure announcement targeting, languages, and push alert triggers.
            </p>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramadan Congregation Timetable Synchronization"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Content / Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write message in English or Malayalam..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Audience Scope</label>
                  <select
                    value={scopeType}
                    onChange={(e) => setScopeType(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    <option value="platform">Platform-wide</option>
                    <option value="state">Statewide (Kerala)</option>
                    <option value="district">District-level</option>
                    <option value="mosque">Mosque-level</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    <option value="both">Both (English & Malayalam)</option>
                    <option value="ml">Malayalam Only</option>
                    <option value="en">English Only</option>
                  </select>
                </div>
              </div>

              {scopeType !== 'platform' && scopeType !== 'state' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {scopeType === 'district' ? 'Target District' : 'Target Mosque Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={scopeTarget}
                    onChange={(e) => setScopeTarget(e.target.value)}
                    placeholder="e.g. Kozhikode or Mishkal Mosque"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="pushCheck"
                  checked={sendPush}
                  onChange={(e) => setSendPush(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <label htmlFor="pushCheck" className="text-xs font-medium text-slate-700">
                  Dispatch FCM Push Notification to congregants in target scope
                </label>
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
                  Broadcast Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AuditLogItem } from '@/lib/types';
import {
  FileText,
  Search,
  Filter,
  Download,
  Shield,
  Clock,
  User,
  Database,
  Code2,
  Calendar,
} from 'lucide-react';

const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'log_1',
    actor_user_id: 'adm_super_01',
    actor_name: 'Dr. Abdul Rahman Koya',
    action: 'MOSQUE_VERIFIED',
    entity_type: 'mosques',
    entity_id: 'm1',
    target_table: 'mosques',
    target_id: 'm1',
    before_state: { status: 'pending', attendance_radius_m: 60 },
    after_state: { status: 'verified', attendance_radius_m: 80 },
    changes: { name: 'Mishkal Mosque', status: 'verified', attendance_radius_m: 80 },
    reason: 'Verified through on-site committee visit and Mahal records confirmation',
    ip_address: '103.112.214.10',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    created_at: '2026-11-04T07:15:20+05:30',
  },
  {
    id: 'log_2',
    actor_user_id: 'adm_reviewer_01',
    actor_name: 'Musthafa Kamal (Attendance Reviewer)',
    action: 'ATTENDANCE_VERIFIED',
    entity_type: 'attendance',
    entity_id: 'att_rev_3',
    target_table: 'attendance',
    target_id: 'att_rev_3',
    before_state: { status: 'pending', points: 0 },
    after_state: { status: 'verified', points: 5 },
    changes: { user: 'Aisha Siddiqa', decision: 'verified', points_awarded: 5 },
    reason: 'Camera proof inside prayer hall with verified SHA-256 and genuine GPS fix',
    ip_address: '117.204.18.42',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    created_at: '2026-11-04T06:50:12+05:30',
  },
  {
    id: 'log_3',
    actor_user_id: 'adm_mosque_01',
    actor_name: 'Imam Rashid Moulavi (Mosque Admin)',
    action: 'UPDATE_IQAMAH_SCHEDULE',
    entity_type: 'prayer_schedules',
    entity_id: 'm1',
    target_table: 'prayer_schedules',
    target_id: 'm1',
    before_state: { fajr_iqamah: '05:25', version: 3 },
    after_state: { fajr_iqamah: '05:30', version: 4 },
    changes: { fajr_iqamah: '05:30', version: 4 },
    reason: 'Seasonal winter twilight timing adjustment approved by Mahal committee',
    ip_address: '103.88.24.5',
    created_at: '2026-11-03T18:00:00+05:30',
  },
  {
    id: 'log_4',
    actor_user_id: 'adm_super_01',
    actor_name: 'Dr. Abdul Rahman Koya',
    action: 'POINTS_ADJUSTMENT',
    entity_type: 'user_points',
    entity_id: 'u_101',
    target_table: 'user_points',
    target_id: 'u_101',
    before_state: { total_points: 310 },
    after_state: { total_points: 320 },
    changes: { delta: 10, reason: 'Verified manual Jummah attendance confirmation' },
    reason: 'App dispute resolution for network drop during Jummah check-in',
    ip_address: '103.112.214.10',
    created_at: '2026-11-02T14:22:00+05:30',
  },
  {
    id: 'log_5',
    actor_user_id: 'adm_reviewer_01',
    actor_name: 'Musthafa Kamal (Attendance Reviewer)',
    action: 'ATTENDANCE_FLAGGED',
    entity_type: 'attendance',
    entity_id: 'att_rev_2',
    target_table: 'attendance',
    target_id: 'att_rev_2',
    before_state: { status: 'pending' },
    after_state: { status: 'flagged' },
    changes: { user: 'Salman Faris', reason: 'Mock location spoofing detected' },
    reason: 'Android MockProvider signal active and distance exceeded configured radius',
    ip_address: '117.204.18.42',
    created_at: '2026-11-02T05:35:10+05:30',
  },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [search, setSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [activeLog, setActiveLog] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        const mapped: AuditLogItem[] = data.map((d: any) => ({
          id: d.id,
          actor_user_id: d.actor_id,
          actor_name: d.actor_name || 'Admin Officer',
          action: d.action,
          entity_type: d.entity_type || d.target_table || 'system',
          entity_id: d.entity_id || d.target_id || '',
          target_table: d.target_table || d.entity_type,
          target_id: d.target_id || d.entity_id,
          before_state: d.before_state,
          after_state: d.after_state,
          changes: d.changes,
          reason: d.reason || 'Administrative update',
          ip_address: d.ip_address,
          user_agent: d.user_agent,
          created_at: d.created_at,
        }));
        setLogs(mapped);
      }
    } catch {
      // Fallback
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Log ID',
      'Actor Name',
      'Action',
      'Entity Type',
      'Entity ID',
      'Reason',
      'Timestamp',
      'IP Address',
    ];
    const rows = logs.map((l) => [
      l.id,
      `"${l.actor_name}"`,
      `"${l.action}"`,
      `"${l.entity_type}"`,
      `"${l.entity_id || ''}"`,
      `"${l.reason || ''}"`,
      `"${l.created_at}"`,
      `"${l.ip_address || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `salahnear_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((log) => {
    const term = search.toLowerCase();
    const matchesSearch =
      log.actor_name.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(term)) ||
      (log.reason && log.reason.toLowerCase().includes(term));

    const matchesEntity =
      selectedEntity === 'all' || log.entity_type === selectedEntity;

    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-emerald-600" />
            Immutable Audit Trail & Compliance Log
          </h1>
          <p className="text-sm text-slate-500">
            Cryptographically audited record of sensitive overrides, points reversals, schedule publications, and role grants.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search action, administrator, reason, entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
        >
          <option value="all">All Entity Types</option>
          <option value="mosques">Mosques</option>
          <option value="attendance">Attendance</option>
          <option value="prayer_schedules">Prayer Schedules</option>
          <option value="user_points">User Points</option>
          <option value="user_roles">User Roles</option>
          <option value="announcements">Announcements</option>
          <option value="support_cases">Support Cases</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Administrator</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5">Entity</th>
                <th className="px-4 py-3.5">Reason / Justification</th>
                <th className="px-5 py-3.5 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-1.5 font-medium text-slate-900 text-xs">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{log.actor_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs font-mono text-slate-600">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      {log.entity_type}
                    </span>
                    <span className="text-slate-400 block text-[11px]">{log.entity_id || '—'}</span>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600 max-w-xs truncate">
                    {log.reason || '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setActiveLog(log)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Code2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Inspection Modal */}
      {activeLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Code2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Audit Record: {activeLog.action}
                </h3>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5 text-slate-600 border border-slate-100">
              <div>
                <strong>Actor:</strong> {activeLog.actor_name}
              </div>
              <div>
                <strong>Entity:</strong> <span className="font-mono">{activeLog.entity_type} ({activeLog.entity_id})</span>
              </div>
              <div>
                <strong>Reason:</strong> {activeLog.reason || 'None provided'}
              </div>
              {activeLog.ip_address && (
                <div>
                  <strong>Observed IP:</strong> <span className="font-mono">{activeLog.ip_address}</span>
                </div>
              )}
            </div>

            {/* Before vs After comparison */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">Audit State Transition:</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">Before State</div>
                  <pre className="bg-slate-900 text-slate-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                    {JSON.stringify(activeLog.before_state || {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-emerald-600 mb-1">After State</div>
                  <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                    {JSON.stringify(activeLog.after_state || activeLog.changes || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

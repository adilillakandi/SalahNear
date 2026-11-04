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
} from 'lucide-react';

const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'log_1',
    actor_name: 'Super Admin',
    action: 'MOSQUE_VERIFIED',
    target_table: 'mosques',
    target_id: 'm1',
    changes: { name: 'Mishkal Mosque', status: 'verified', attendance_radius_m: 80 },
    created_at: '2026-11-04T07:15:20+05:30',
  },
  {
    id: 'log_2',
    actor_name: 'Attendance Reviewer',
    action: 'ATTENDANCE_VERIFIED',
    target_table: 'attendance',
    target_id: 'att_rev_3',
    changes: { user: 'Aisha Siddiqa', decision: 'verified', points_awarded: 5 },
    created_at: '2026-11-04T06:50:12+05:30',
  },
  {
    id: 'log_3',
    actor_name: 'Mosque Administrator',
    action: 'UPDATE_IQAMAH_SCHEDULE',
    target_table: 'prayer_schedules',
    target_id: 'm1',
    changes: { fajr_iqamah: '05:30', version: 4 },
    created_at: '2026-11-03T18:00:00+05:30',
  },
  {
    id: 'log_4',
    actor_name: 'Super Admin',
    action: 'POINTS_ADJUSTMENT',
    target_table: 'user_points',
    target_id: 'u_101',
    changes: { delta: 10, reason: 'Verified manual Jummah attendance confirmation' },
    created_at: '2026-11-02T14:22:00+05:30',
  },
  {
    id: 'log_5',
    actor_name: 'Attendance Reviewer',
    action: 'ATTENDANCE_FLAGGED',
    target_table: 'attendance',
    target_id: 'att_rev_2',
    changes: { user: 'Salman Faris', reason: 'Mock location spoofing detected' },
    created_at: '2026-11-02T05:35:10+05:30',
  },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [search, setSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState('all');
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
        setLogs(data as AuditLogItem[]);
      }
    } catch {
      // Use fallback
    }
  };

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Actor', 'Action', 'Target Table', 'Target ID', 'Timestamp', 'Changes'];
    const rows = logs.map((l) => [
      l.id,
      `"${l.actor_name}"`,
      `"${l.action}"`,
      `"${l.target_table}"`,
      `"${l.target_id || ''}"`,
      `"${l.created_at}"`,
      `"${JSON.stringify(l.changes || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `salahnear_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.target_id && log.target_id.toLowerCase().includes(search.toLowerCase()));

    const matchesTable =
      selectedTable === 'all' || log.target_table === selectedTable;

    return matchesSearch && matchesTable;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-emerald-600" />
            System Audit & Compliance Logs
          </h1>
          <p className="text-sm text-slate-500">
            Immutable audit trail of administrative overrides, points transactions, schedule publications, and role grants.
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
            placeholder="Search action, actor, target ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
        >
          <option value="all">All Target Tables</option>
          <option value="mosques">Mosques</option>
          <option value="attendance">Attendance</option>
          <option value="prayer_schedules">Prayer Schedules</option>
          <option value="user_points">User Points</option>
          <option value="user_roles">User Roles</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Actor</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5">Target Table</th>
                <th className="px-4 py-3.5">Target ID</th>
                <th className="px-5 py-3.5 text-right">Payload Details</th>
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
                    <span className="inline-flex items-center gap-1">
                      <Database className="w-3 h-3 text-slate-400" />
                      {log.target_table}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs font-mono text-slate-400">
                    {log.target_id || '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setActiveLog(log)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Code2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Inspect JSON</span>
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Code2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Audit Log Payload Detail</h3>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600">
              <div>
                <strong>Action:</strong> <span className="font-mono">{activeLog.action}</span>
              </div>
              <div>
                <strong>Actor:</strong> {activeLog.actor_name}
              </div>
              <div>
                <strong>Entity:</strong> <span className="font-mono">{activeLog.target_table} ({activeLog.target_id})</span>
              </div>
              <div>
                <strong>Timestamp:</strong> {new Date(activeLog.created_at).toISOString()}
              </div>
            </div>

            <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-64 shadow-inner">
              <pre>{JSON.stringify(activeLog.changes || {}, null, 2)}</pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

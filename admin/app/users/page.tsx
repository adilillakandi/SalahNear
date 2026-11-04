'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Search,
  Filter,
  Award,
  Flame,
  Shield,
  Edit,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  MinusCircle,
  UserCheck,
  HeartHandshake,
  RotateCcw,
} from 'lucide-react';

interface UserRecord {
  id: string;
  full_name: string;
  username: string;
  district: string;
  total_points: number;
  streak_count: number;
  role: 'congregant' | 'mosque_admin' | 'attendance_reviewer' | 'super_admin';
  created_at: string;
}

interface EncounterRecord {
  id: string;
  user_a_name: string;
  user_b_name: string;
  mosque_name: string;
  prayer_type: string;
  prayer_date: string;
  status: 'mutual_confirmed' | 'pending' | 'rejected';
}

const INITIAL_USERS: UserRecord[] = [
  {
    id: 'u_1',
    full_name: 'Fahad Rahiman',
    username: 'fahad_calicut',
    district: 'Kozhikode',
    total_points: 320,
    streak_count: 14,
    role: 'congregant',
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 'u_2',
    full_name: 'Salman Faris',
    username: 'salman_mlp',
    district: 'Malappuram',
    total_points: 295,
    streak_count: 12,
    role: 'congregant',
    created_at: '2026-10-05T12:00:00Z',
  },
  {
    id: 'u_3',
    full_name: 'Aisha Siddiqa',
    username: 'aisha_ekm',
    district: 'Ernakulam',
    total_points: 260,
    streak_count: 9,
    role: 'congregant',
    created_at: '2026-10-10T14:00:00Z',
  },
  {
    id: 'u_4',
    full_name: 'Zameer KP',
    username: 'zameer_knr',
    district: 'Kannur',
    total_points: 240,
    streak_count: 8,
    role: 'mosque_admin',
    created_at: '2026-10-12T08:00:00Z',
  },
  {
    id: 'u_5',
    full_name: 'Bilal Ahmad',
    username: 'bilal_tvm',
    district: 'Thiruvananthapuram',
    total_points: 210,
    streak_count: 7,
    role: 'congregant',
    created_at: '2026-10-15T09:30:00Z',
  },
  {
    id: 'u_6',
    full_name: 'Imam Rashid Moulavi',
    username: 'mishkal_imam',
    district: 'Kozhikode',
    total_points: 580,
    streak_count: 45,
    role: 'mosque_admin',
    created_at: '2026-09-01T08:00:00Z',
  },
];

const INITIAL_ENCOUNTERS: EncounterRecord[] = [
  {
    id: 'enc_1',
    user_a_name: 'Fahad Rahiman',
    user_b_name: 'Salman Faris',
    mosque_name: 'Mishkal Mosque, Kuttichira',
    prayer_type: 'fajr',
    prayer_date: '2026-11-04',
    status: 'mutual_confirmed',
  },
  {
    id: 'enc_2',
    user_a_name: 'Aisha Siddiqa',
    user_b_name: 'Zameer KP',
    mosque_name: 'Edappally Toll Juma Masjid',
    prayer_type: 'dhuhr',
    prayer_date: '2026-11-03',
    status: 'pending',
  },
];

export default function UsersModerationPage() {
  const [users, setUsers] = useState<UserRecord[]>(INITIAL_USERS);
  const [encounters, setEncounters] = useState<EncounterRecord[]>(INITIAL_ENCOUNTERS);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'encounters'>('users');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [pointsChange, setPointsChange] = useState('5');
  const [isDeduction, setIsDeduction] = useState(false);
  const [reason, setReason] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState<UserRecord['role']>('congregant');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          district,
          created_at,
          user_streaks:id (current_streak)
        `)
        .limit(50);

      if (!error && data && data.length > 0) {
        const mapped: UserRecord[] = data.map((d: any) => ({
          id: d.id,
          full_name: d.full_name || 'Congregant',
          username: d.username || 'user',
          district: d.district || 'Kerala',
          total_points: 50,
          streak_count: d.user_streaks?.current_streak || 1,
          role: 'congregant',
          created_at: d.created_at,
        }));
        setUsers(mapped);
      }
    } catch {
      // Fallback
    }
  };

  const handlePointsAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !reason) return;

    const delta = parseInt(pointsChange, 10) * (isDeduction ? -1 : 1);
    const newTotal = Math.max(0, selectedUser.total_points + delta);

    try {
      // Insert to user_points
      await supabase.from('user_points').insert({
        user_id: selectedUser.id,
        points: delta,
        activity_type: delta < 0 ? 'admin_penalty' : 'admin_adjustment',
        notes: reason,
      });

      // Audit log
      await supabase.from('audit_logs').insert({
        actor_name: 'Super Admin',
        action: 'POINTS_ADJUSTMENT',
        target_table: 'user_points',
        target_id: selectedUser.id,
        changes: {
          previous: selectedUser.total_points,
          new: newTotal,
          delta,
          reason,
        },
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, total_points: newTotal } : u))
      );

      setSelectedUser(null);
      setReason('');
      setToast({
        type: 'success',
        text: `Adjusted points for ${selectedUser.full_name} (${delta > 0 ? '+' : ''}${delta} pts).`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch {
      setToast({ type: 'error', text: 'Failed to record points adjustment.' });
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      // Insert / upsert to user_roles
      await supabase.from('user_roles').upsert({
        user_id: selectedUser.id,
        role: newRole,
      });

      await supabase.from('audit_logs').insert({
        actor_name: 'Super Admin',
        action: 'USER_ROLE_UPDATED',
        target_table: 'user_roles',
        target_id: selectedUser.id,
        changes: { user: selectedUser.full_name, new_role: newRole },
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, role: newRole } : u))
      );

      setShowRoleModal(false);
      setSelectedUser(null);
      setToast({
        type: 'success',
        text: `Assigned role ${newRole.toUpperCase()} to ${selectedUser.full_name}.`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch {
      setToast({ type: 'error', text: 'Failed to update user role.' });
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.district.toLowerCase().includes(term)
    );
  });

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
            <Users className="w-7 h-7 text-emerald-600" />
            User Management & Leaderboard Moderation
          </h1>
          <p className="text-sm text-slate-500">
            Audit user streaks, community reward points, administrative penalties, and friend encounter verifications.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'users'
                ? 'bg-white text-emerald-800 shadow-sm font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Congregants ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('encounters')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'encounters'
                ? 'bg-white text-emerald-800 shadow-sm font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Friend Encounters ({encounters.length})
          </button>
        </div>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search congregant name, @username, or district..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Congregant</th>
                    <th className="px-4 py-3.5">District</th>
                    <th className="px-4 py-3.5">Points</th>
                    <th className="px-4 py-3.5">Prayer Streak</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-5 py-3.5 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{user.full_name}</div>
                            <div className="text-xs text-slate-400 font-mono">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">{user.district}</td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/60 font-mono font-bold text-xs">
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          <span>{user.total_points} pts</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center space-x-1 text-xs font-mono font-semibold text-orange-600">
                          <Flame className="w-3.5 h-3.5 fill-orange-500" />
                          <span>{user.streak_count} days</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 uppercase">
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeduction(false);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                          >
                            Adjust Points
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role);
                              setShowRoleModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors"
                          >
                            Role
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Friend Encounters Tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-emerald-600" />
              Shared Mosque Prayer Encounters
            </h3>
            <p className="text-xs text-slate-500">
              When mutual friends confirm encountering each other at a verified congregation prayer, each receives +10 fellowship bonus points.
            </p>
          </div>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Friend A</th>
                <th className="px-4 py-3.5">Friend B</th>
                <th className="px-4 py-3.5">Mosque Venue</th>
                <th className="px-4 py-3.5">Prayer & Date</th>
                <th className="px-4 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {encounters.map((enc) => (
                <tr key={enc.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4 font-medium text-slate-900">{enc.user_a_name}</td>
                  <td className="px-4 py-4 font-medium text-slate-900">{enc.user_b_name}</td>
                  <td className="px-4 py-4 text-xs text-slate-600">{enc.mosque_name}</td>
                  <td className="px-4 py-4 text-xs">
                    <span className="capitalize font-semibold text-emerald-700">{enc.prayer_type}</span>
                    <span className="text-slate-400"> ({enc.prayer_date})</span>
                  </td>
                  <td className="px-4 py-4">
                    {enc.status === 'mutual_confirmed' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Mutual Confirmed (+10 pts)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Pending Friend B
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Points Adjustment Modal */}
      {selectedUser && !showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-600" />
              Adjust Community Points
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Modifying points ledger for <strong className="text-slate-800">{selectedUser.full_name}</strong>. Current balance: <strong>{selectedUser.total_points} pts</strong>.
            </p>

            <form onSubmit={handlePointsAdjustment} className="space-y-4">
              {/* Add vs Deduct Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setIsDeduction(false)}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    !isDeduction ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Grant Bonus
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeduction(true)}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    isDeduction ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <MinusCircle className="w-4 h-4" />
                  Deduct / Penalize
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount of Points
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={pointsChange}
                  onChange={(e) => setPointsChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Audit Log Reason
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verified manual attendance correction / Spoof penalty"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm transition-colors ${
                    isDeduction ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isDeduction ? 'Confirm Deduction' : 'Award Points'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {selectedUser && showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Assign User Role & Authorization Scope
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Configuring system role for <strong className="text-slate-800">{selectedUser.full_name}</strong>.
            </p>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  System Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="congregant">Congregant (Standard User)</option>
                  <option value="mosque_admin">Mosque Administrator (Timetables & QR)</option>
                  <option value="attendance_reviewer">Attendance Reviewer (Proof Audit)</option>
                  <option value="super_admin">Super Administrator (Statewide)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1 border border-slate-100">
                <div className="font-semibold text-slate-800">RBAC Enforcement Note:</div>
                <p>Role permissions are validated server-side in Supabase RLS policies and database constraints.</p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


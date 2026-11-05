'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AdminRole } from '@/lib/types';
import {
  Users,
  Search,
  Award,
  Flame,
  CheckCircle2,
  PlusCircle,
  MinusCircle,
  HeartHandshake,
  RotateCcw,
  UserPlus,
  Key,
  Mail,
  Lock,
  Copy,
  Building2,
  Shield,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface UserRecord {
  id: string;
  full_name: string;
  username: string;
  district: string;
  total_points: number;
  streak_count: number;
  role: 'congregant';
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

const KERALA_DISTRICTS = [
  'Kozhikode',
  'Malappuram',
  'Ernakulam',
  'Thiruvananthapuram',
  'Kannur',
  'Thrissur',
  'Palakkad',
  'Kollam',
  'Alappuzha',
  'Kottayam',
  'Kasaragod',
  'Wayanad',
  'Pathanamthitta',
  'Idukki',
];

export default function UsersModerationPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'encounters'>('users');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [pointsChange, setPointsChange] = useState('10');
  const [isDeduction, setIsDeduction] = useState(false);
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Direct Admin Account Creation State
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminRole, setAdminRole] = useState<AdminRole>('mosque_admin');
  const [adminDistrict, setAdminDistrict] = useState('Kozhikode');
  const [adminMosqueId, setAdminMosqueId] = useState('');
  const [adminMosqueName, setAdminMosqueName] = useState('');
  const [availableMosques, setAvailableMosques] = useState<{ id: string; name: string }[]>([]);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    pass: string;
    role: string;
    name: string;
  } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchEncounters();
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
        setAdminMosqueId(data[0].id);
        setAdminMosqueName(data[0].name);
      }
    } catch {
      // Ignore
    }
  };

  const fetchUsers = async () => {
    try {
      // 1. Fetch user_roles to get all admin IDs so we can exclude them from standard congregants
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .neq('role', 'user');

      const adminUserIds = new Set((adminRoles || []).map((r: any) => r.user_id));

      // 2. Fetch from real-time leaderboard view
      const { data: lbData, error: lbError } = await supabase
        .from('leaderboard_view')
        .select('*')
        .order('total_points', { ascending: false });

      if (!lbError && lbData && lbData.length > 0) {
        // Keep ONLY standard registered congregants
        const standardCongregants: UserRecord[] = lbData
          .filter((d: any) => !adminUserIds.has(d.user_id))
          .map((d: any) => ({
            id: d.user_id,
            full_name: d.full_name || d.display_name || 'Standard Congregant',
            username: d.username || 'user',
            district: d.district || 'Kerala',
            total_points: Number(d.total_points) || 0,
            streak_count: Number(d.current_streak) || 0,
            role: 'congregant',
            created_at: new Date().toISOString(),
          }));

        setUsers(standardCongregants);
        return;
      }

      // 3. Fallback: Query profiles directly excluding admins
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          district,
          created_at,
          user_streaks:id (current_streak)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!profError && profData && profData.length > 0) {
        const standardOnly: UserRecord[] = profData
          .filter((p: any) => !adminUserIds.has(p.id))
          .map((d: any) => ({
            id: d.id,
            full_name: d.full_name || 'Standard Congregant',
            username: d.username || 'user',
            district: d.district || 'Kerala',
            total_points: 0,
            streak_count: d.user_streaks?.current_streak || 0,
            role: 'congregant',
            created_at: d.created_at,
          }));

        setUsers(standardOnly);
      }
    } catch {
      // Fallback
    }
  };

  const fetchEncounters = async () => {
    try {
      const { data, error } = await supabase
        .from('friend_encounters')
        .select(`
          id,
          status,
          created_at,
          user_low:user_low_id (full_name),
          user_high:user_high_id (full_name),
          attendance:attendance_low_id (
            mosque_id,
            prayer_type,
            prayer_date,
            mosques:mosque_id (name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        const mapped: EncounterRecord[] = data.map((e: any) => ({
          id: e.id,
          user_a_name: e.user_low?.full_name || 'Friend A',
          user_b_name: e.user_high?.full_name || 'Friend B',
          mosque_name: e.attendance?.mosques?.name || 'Local Mosque',
          prayer_type: e.attendance?.prayer_type || 'fajr',
          prayer_date: e.attendance?.prayer_date || '',
          status: e.status || 'pending',
        }));
        setEncounters(mapped);
      }
    } catch {
      // Fallback
    }
  };

  // Points Adjustment Handler (Award / Deduction)
  const handlePointsAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !reason) return;

    const delta = parseInt(pointsChange, 10) * (isDeduction ? -1 : 1);
    const newTotal = Math.max(0, selectedUser.total_points + delta);

    try {
      // Insert to append-only user_points ledger
      await supabase.from('user_points').insert({
        user_id: selectedUser.id,
        points: delta,
        activity_type: delta < 0 ? 'admin_penalty' : 'admin_adjustment',
        reason: reason,
        notes: reason,
      });

      // Audit log
      await supabase.from('audit_logs').insert({
        actor_name: 'Super Admin',
        action: delta < 0 ? 'POINTS_DEDUCTED' : 'POINTS_AWARDED',
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
        text: `Successfully ${delta > 0 ? 'awarded' : 'deducted'} ${Math.abs(delta)} points for ${selectedUser.full_name}.`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch {
      setToast({ type: 'error', text: 'Failed to record points adjustment.' });
    }
  };

  // Helper to generate a random secure password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAdminPassword(res);
  };

  // Direct Admin Account Creation Handler
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword || !adminFullName) return;

    setIsSubmittingAdmin(true);

    try {
      // 1. Create user in Supabase auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            full_name: adminFullName,
          },
        },
      });

      const newUserId =
        authData.user?.id ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `adm_${Date.now()}`);

      // 2. Ensure profile exists in public.profiles
      await supabase.from('profiles').upsert({
        id: newUserId,
        full_name: adminFullName,
        state: 'Kerala',
        home_mosque_id: adminRole === 'mosque_admin' && adminMosqueId ? adminMosqueId : undefined,
      });

      // 3. Assign admin role in public.user_roles
      await supabase.from('user_roles').upsert({
        user_id: newUserId,
        role: adminRole,
        state: 'Kerala',
        is_active: true,
      });

      // 4. If mosque_admin, assign in public.mosque_admins
      if (adminRole === 'mosque_admin' && adminMosqueId) {
        await supabase.from('mosque_admins').upsert({
          user_id: newUserId,
          mosque_id: adminMosqueId,
        });
      }

      // 5. Record Audit Log
      await supabase.from('audit_logs').insert({
        actor_name: 'Super Admin',
        action: 'ADMIN_ACCOUNT_CREATED',
        target_table: 'user_roles',
        target_id: newUserId,
        changes: {
          full_name: adminFullName,
          email: adminEmail,
          role: adminRole,
          mosque_name: adminRole === 'mosque_admin' ? adminMosqueName : null,
        },
      });

      setCreatedCredentials({
        name: adminFullName,
        email: adminEmail,
        pass: adminPassword,
        role: adminRole,
      });

      setShowCreateAdminModal(false);
      setAdminFullName('');
      setAdminEmail('');
      setAdminPassword('');
      setToast({
        type: 'success',
        text: `Administrator account created for ${adminFullName}.`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err?.message || 'Failed to create administrator account.',
      });
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `SalahNear Administrator Login Credentials:\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.pass}\nRole: ${createdCredentials.role.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 3000);
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
            Monitor registered mobile congregants, award bonus points, apply penalties, and inspect mutual friend encounters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Button to directly create an Admin account with Email and Password */}
          <button
            onClick={() => {
              setShowCreateAdminModal(true);
              if (!adminPassword) generateRandomPassword();
            }}
            className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition-colors gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Create Admin Account
          </button>

          <Link
            href="/administrators"
            className="inline-flex items-center px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            View Admins
          </Link>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search congregant name, @username, or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600 self-stretch sm:self-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'users'
                ? 'bg-white text-emerald-800 shadow-sm font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Standard Congregants ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('encounters')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
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
          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Users className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">
                  {search ? 'No Matching Congregants' : 'No Registered Mobile Users Yet'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {search
                    ? 'No user matches your search term. Try checking spelling or district.'
                    : 'Standard congregants who register and log in to the SalahNear mobile app will automatically appear here on the leaderboard.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Standard Congregant</th>
                      <th className="px-4 py-3.5">District</th>
                      <th className="px-4 py-3.5">Total Points</th>
                      <th className="px-4 py-3.5">Prayer Streak</th>
                      <th className="px-4 py-3.5">Account Role</th>
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
                            Congregant
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeduction(false);
                            }}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 text-xs font-medium text-slate-700 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                            <span>Adjust Points</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
          {encounters.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <HeartHandshake className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">No mutual friend encounter submissions recorded yet.</p>
            </div>
          ) : (
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
          )}
        </div>
      )}

      {/* Points Adjustment Modal (Award / Deduct) */}
      {selectedUser && (
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
                  Grant Bonus Points (+)
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeduction(true)}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    isDeduction ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <MinusCircle className="w-4 h-4" />
                  Deduct / Penalize (-)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount of Points
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
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
                  placeholder="e.g. Approved attendance dispute claim #104 / GPS spoof penalty"
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

      {/* Direct Administrator Creation Modal (Email & Password) */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Create Administrator Account
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Directly assign an administrator role and generate their login email and password.
            </p>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Imam Rashid Moulavi"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Login Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. imam@mishkalmosque.org"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Login Password
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Key className="w-3 h-3" />
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Enter or generate secure password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Administrative Role
                </label>
                <select
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value as AdminRole)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="mosque_admin">Mosque Administrator (Daily Timetable & QR Kiosk)</option>
                  <option value="super_admin">Super Administrator (Full Statewide Control)</option>
                </select>
              </div>

              {/* Scope Selection: Mosque */}
              {adminRole === 'mosque_admin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Mosque
                  </label>
                  {availableMosques.length > 0 ? (
                    <select
                      value={adminMosqueId}
                      onChange={(e) => {
                        const sel = availableMosques.find((m) => m.id === e.target.value);
                        setAdminMosqueId(e.target.value);
                        if (sel) setAdminMosqueName(sel.name);
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
                      placeholder="e.g. Mishkal Mosque"
                      value={adminMosqueName}
                      onChange={(e) => setAdminMosqueName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdmin}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmittingAdmin ? 'Creating...' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Credentials Summary Dialog */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 text-center mb-1">
              Admin Account Created!
            </h2>
            <p className="text-xs text-slate-500 text-center mb-5">
              Copy and share these credentials with the administrator so they can log in to the admin portal.
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Full Name:</span>
                <span className="font-bold text-slate-900">{createdCredentials.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Role:</span>
                <span className="font-bold text-emerald-700 uppercase">{createdCredentials.role}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Email:</span>
                <span className="font-bold text-slate-900">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Password:</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {createdCredentials.pass}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100 mt-5">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                {hasCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Credentials
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

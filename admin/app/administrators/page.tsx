'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminUser, AdminRole } from '@/lib/types';
import { useAdminAuth } from '@/lib/auth-context';
import {
  UserCog,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Mail,
  Lock,
  Key,
  Copy,
  Check,
  Loader2,
  UserCheck,
  UserX,
  Trash2,
} from 'lucide-react';

const KERALA_DISTRICTS = [
  'All Districts',
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Kottayam',
  'Kozhikode',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Thrissur',
  'Wayanad',
];

interface MosqueItem {
  id: string;
  name: string;
  district: string;
}

export default function AdministratorsPage() {
  const { role: currentAdminRole } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Available Mosques for Mosque Admin Assignment
  const [mosques, setMosques] = useState<MosqueItem[]>([]);
  const [selectedMosqueId, setSelectedMosqueId] = useState<string>('');

  // Confirmation Modal State (Suspend / Reactivate / Delete)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'suspend' | 'activate' | 'delete';
    admin: AdminUser | null;
  }>({
    isOpen: false,
    action: 'suspend',
    admin: null,
  });

  // Provision Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('mosque_admin');
  const [inviteDistrict, setInviteDistrict] = useState('Kozhikode');

  // Created Credentials Modal Display
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    pass: string;
    role: string;
    scope: string;
  } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    fetchAdmins();
    fetchMosques();
  }, []);

  // Fetch all staff administrators from Supabase
  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      // 1. Try atomic get_admin_directory procedure first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_directory');

      if (!rpcError && rpcData && Array.isArray(rpcData)) {
        const mapped: AdminUser[] = rpcData.map((d: any) => ({
          id: d.id,
          email: d.email || 'admin@salahnear.org',
          full_name: d.full_name || 'Admin Officer',
          role: d.role as AdminRole,
          state: d.state || 'Kerala',
          district: d.district || undefined,
          assigned_mosques: d.assigned_mosque_name ? [d.assigned_mosque_name] : undefined,
          is_active: d.is_active ?? true,
          created_at: d.created_at,
          last_sign_in_at: d.last_sign_in_at || undefined,
        }));
        setAdmins(mapped);
        return;
      }

      // 2. Direct query fallback
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          district,
          state,
          is_active,
          created_at,
          profiles:user_id (
            full_name,
            email
          ),
          mosque_admins:user_id (
            mosques:mosque_id (name)
          )
        `)
        .neq('role', 'user')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: AdminUser[] = data.map((d: any) => {
          const profile = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
          const mosqueAdmin = Array.isArray(d.mosque_admins) ? d.mosque_admins[0] : d.mosque_admins;
          const mosqueName = mosqueAdmin?.mosques?.name;

          return {
            id: d.id,
            email: profile?.email || `${d.role}_${d.user_id?.slice(0, 6)}@salahnear.org`,
            full_name: profile?.full_name || 'Admin Officer',
            role: d.role as AdminRole,
            state: d.state || 'Kerala',
            district: d.district || undefined,
            assigned_mosques: mosqueName ? [mosqueName] : undefined,
            is_active: d.is_active ?? true,
            created_at: d.created_at,
          };
        });
        setAdmins(mapped);
      }
    } catch (err: any) {
      console.error('Failed to load administrators:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch verified mosques for dropdown selection
  const fetchMosques = async () => {
    try {
      const { data } = await supabase
        .from('mosques')
        .select('id, name, district')
        .order('name');
      if (data && data.length > 0) {
        setMosques(data);
        setSelectedMosqueId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load mosques:', err);
    }
  };

  // Generate strong random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 11; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInvitePassword(res);
  };

  // Prompt confirmation dialog before toggling status
  const initiateToggleStatus = (admin: AdminUser) => {
    setConfirmModal({
      isOpen: true,
      action: admin.is_active ? 'suspend' : 'activate',
      admin,
    });
  };

  // Prompt confirmation dialog before deleting administrator
  const initiateDelete = (admin: AdminUser) => {
    setConfirmModal({
      isOpen: true,
      action: 'delete',
      admin,
    });
  };

  // Execute confirmed action (suspend / activate / delete)
  const handleConfirmAction = async () => {
    if (!confirmModal.admin) return;
    const admin = confirmModal.admin;
    const action = confirmModal.action;
    setConfirmModal({ isOpen: false, action: 'suspend', admin: null });

    // Handle Delete
    if (action === 'delete') {
      try {
        // 1. Try atomic delete_admin_account procedure
        const { error: rpcError } = await supabase.rpc('delete_admin_account', {
          p_user_role_id: admin.id,
          p_delete_auth_user: false,
          p_reason: 'Deleted by Super Admin',
        });

        if (rpcError) {
          // Fallback: try revoke_admin_role procedure
          const { error: revokeError } = await supabase.rpc('revoke_admin_role', {
            p_user_role_id: admin.id,
            p_reason: 'Deleted by Super Admin',
          });

          if (revokeError) {
            // Direct delete fallback
            const { error: deleteError } = await supabase
              .from('user_roles')
              .delete()
              .eq('id', admin.id);

            if (deleteError) throw deleteError;

            await supabase.from('audit_logs').insert({
              actor_name: 'Super Admin',
              action: 'ADMIN_DELETED',
              target_table: 'user_roles',
              target_id: admin.id,
              changes: { email: admin.email, full_name: admin.full_name, role: admin.role },
            });
          }
        }

        setAdmins((prev) => prev.filter((a) => a.id !== admin.id));

        setFeedback({
          type: 'success',
          text: `Administrator ${admin.full_name} (${admin.email}) has been permanently deleted.`,
        });
        setTimeout(() => setFeedback(null), 4000);
      } catch (err: any) {
        setFeedback({
          type: 'error',
          text: err?.message || 'Failed to delete administrator.',
        });
      }
      return;
    }

    // Handle Suspend / Activate
    const newStatus = action === 'activate';
    try {
      // 1. Try atomic toggle_admin_status procedure
      const { error: rpcError } = await supabase.rpc('toggle_admin_status', {
        p_user_role_id: admin.id,
        p_is_active: newStatus,
        p_reason: newStatus ? 'Administrative reactivation' : 'Administrative suspension',
      });

      if (rpcError) {
        // Fallback: direct update
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ is_active: newStatus, updated_at: new Date().toISOString() })
          .eq('id', admin.id);

        if (updateError) throw updateError;

        await supabase.from('audit_logs').insert({
          actor_name: 'Super Admin',
          action: newStatus ? 'ADMIN_ACTIVATED' : 'ADMIN_SUSPENDED',
          target_table: 'user_roles',
          target_id: admin.id,
          changes: { previous: admin.is_active, current: newStatus, email: admin.email },
        });
      }

      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, is_active: newStatus } : a))
      );

      setFeedback({
        type: 'success',
        text: `Administrator ${admin.full_name} is now ${newStatus ? 'Active' : 'Suspended'}.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to update administrator status.',
      });
    }
  };

  // Provision New Administrator Form Submission
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail || !invitePassword) return;

    setIsSubmitting(true);
    try {
      // Call atomic provision_administrator procedure
      const { data: rpcData, error: rpcError } = await supabase.rpc('provision_administrator', {
        p_email: inviteEmail.trim(),
        p_password: invitePassword,
        p_full_name: inviteName.trim(),
        p_role: inviteRole,
        p_district: null,
        p_mosque_id: inviteRole === 'mosque_admin' ? selectedMosqueId : null,
      });

      if (rpcError) {
        // Fallback to create_admin_account
        const { error: fallbackError } = await supabase.rpc('create_admin_account', {
          p_email: inviteEmail.trim(),
          p_password: invitePassword,
          p_full_name: inviteName.trim(),
          p_role: inviteRole,
          p_district: null,
          p_mosque_id: inviteRole === 'mosque_admin' ? selectedMosqueId : null,
        });

        if (fallbackError) {
          throw new Error(fallbackError.message || rpcError.message);
        }
      }

      // Compute display scope
      const displayScope =
        inviteRole === 'mosque_admin'
          ? mosques.find((m) => m.id === selectedMosqueId)?.name || 'Assigned Mosque Venue'
          : 'Statewide (All Kerala)';

      // Present credentials modal for Super Admin handoff
      setCreatedCredentials({
        name: inviteName,
        email: inviteEmail,
        pass: invitePassword,
        role: inviteRole,
        scope: displayScope,
      });

      setShowInviteModal(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('');

      setFeedback({
        type: 'success',
        text: `Administrator account provisioned for ${inviteName}. Credentials ready to share.`,
      });
      setTimeout(() => setFeedback(null), 5000);

      await fetchAdmins();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to provision administrator account. Please check parameters.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `SalahNear Staff Administrator Credentials:\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.pass}\nRole: ${createdCredentials.role.toUpperCase()}\nScope: ${createdCredentials.scope}\nLogin URL: ${typeof window !== 'undefined' ? window.location.origin : ''}/login`;
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 3000);
  };

  const filteredAdmins = admins.filter((a) => {
    const term = search.toLowerCase();
    const matchesSearch =
      a.full_name.toLowerCase().includes(term) ||
      a.email.toLowerCase().includes(term) ||
      (a.district && a.district.toLowerCase().includes(term));

    const matchesRole = filterRole === 'all' || a.role === filterRole;

    return matchesSearch && matchesRole;
  });

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
            <UserCog className="w-7 h-7 text-emerald-600" />
            Administrator & Role Management
          </h1>
          <p className="text-sm text-slate-500">
            Provision, scope, and monitor administrative accounts across Kerala with strict least-privilege RBAC.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdmins}
            title="Refresh Administrators"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            onClick={() => {
              generatePassword();
              setShowInviteModal(true);
            }}
            className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-colors gap-2"
          >
            <Plus className="w-4 h-4" />
            Provision Administrator
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search administrator name, email, or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-700"
        >
          <option value="all">All Administrative Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="mosque_admin">Mosque Admin</option>
        </select>
      </div>

      {/* Administrators Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Administrator</th>
                <th className="px-4 py-3.5">Assigned Role</th>
                <th className="px-4 py-3.5">Authorized Scope</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Last Activity</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    <span className="text-sm font-medium">Loading administrative roster...</span>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No administrators found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search || filterRole !== 'all'
                        ? 'Try adjusting your search criteria or role filter.'
                        : 'Click "Provision Administrator" to assign the first platform officer.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Administrator Column */}
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {admin.full_name ? admin.full_name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{admin.full_name}</div>
                          <div className="text-xs text-slate-400 font-mono">{admin.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Assigned Role */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize">
                        <Shield className="w-3 h-3 mr-1 text-emerald-600" />
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Authorized Scope */}
                    <td className="px-4 py-4">
                      <div className="text-xs text-slate-700 font-medium">
                        {admin.role === 'super_admin' ? 'Statewide (All Kerala)' : (admin.assigned_mosques?.[0] || 'Assigned Mosque Venue')}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      {admin.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3 mr-1 text-red-600" />
                          Suspended
                        </span>
                      )}
                    </td>

                    {/* Last Activity */}
                    <td className="px-4 py-4 text-xs font-mono text-slate-500">
                      {admin.last_sign_in_at
                        ? new Date(admin.last_sign_in_at).toLocaleDateString()
                        : 'Never'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => initiateToggleStatus(admin)}
                          title={admin.is_active ? 'Suspend Administrator' : 'Reactivate Administrator'}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            admin.is_active
                              ? 'border-red-200 text-red-700 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {admin.is_active ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => initiateDelete(admin)}
                          title="Delete Administrator"
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

      {/* Confirmation Dialog Modal for Suspend / Reactivate / Delete */}
      {confirmModal.isOpen && confirmModal.admin && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3.5 mb-4">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  confirmModal.action === 'activate'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-red-50 text-red-600 border border-red-100'
                }`}
              >
                {confirmModal.action === 'delete' ? (
                  <Trash2 className="w-6 h-6" />
                ) : confirmModal.action === 'suspend' ? (
                  <UserX className="w-6 h-6" />
                ) : (
                  <UserCheck className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {confirmModal.action === 'delete' && 'Delete Administrator'}
                  {confirmModal.action === 'suspend' && 'Suspend Administrator Access'}
                  {confirmModal.action === 'activate' && 'Reactivate Administrator Access'}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {confirmModal.action === 'delete' && (
                    <>
                      Are you sure you want to permanently delete administrator{' '}
                      <strong className="text-slate-800 font-semibold">{confirmModal.admin.full_name}</strong>{' '}
                      ({confirmModal.admin.email})? This will permanently revoke their administrative role and staff permissions. This action cannot be undone.
                    </>
                  )}
                  {confirmModal.action === 'suspend' && (
                    <>
                      Are you sure you want to suspend access for{' '}
                      <strong className="text-slate-800 font-semibold">{confirmModal.admin.full_name}</strong>{' '}
                      ({confirmModal.admin.email})? They will immediately lose access to the administrative console and verification queue.
                    </>
                  )}
                  {confirmModal.action === 'activate' && (
                    <>
                      Are you sure you want to restore administrative access for{' '}
                      <strong className="text-slate-800 font-semibold">{confirmModal.admin.full_name}</strong>?
                      Their scoped permissions will be reinstated immediately.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, action: 'suspend', admin: null })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-colors ${
                  confirmModal.action === 'activate'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmModal.action === 'delete' && 'Yes, Delete Administrator'}
                {confirmModal.action === 'suspend' && 'Yes, Suspend Account'}
                {confirmModal.action === 'activate' && 'Yes, Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision Administrator Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-emerald-600" />
              Provision New Administrator
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Authorize a subordinate administrator account with scoped permissions according to Section 3 & 4 of the guide.
            </p>

            <form onSubmit={handleProvisionSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zuhair Ahmed"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. zuhair@salahnear.org"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Temporary Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Initial Password</label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    <Key className="w-3 h-3" />
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter or generate temporary password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  The officer will use this password to sign in to the administrative panel.
                </p>
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="mosque_admin">Mosque Admin (Timetable & QR Display)</option>
                  <option value="super_admin">Super Admin (Statewide Oversight)</option>
                </select>
              </div>

              {/* Dynamic Mosque Selector */}
              {inviteRole === 'mosque_admin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Mosque Venue</label>
                  {mosques.length > 0 ? (
                    <select
                      value={selectedMosqueId}
                      onChange={(e) => setSelectedMosqueId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                    >
                      {mosques.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.district})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-600 italic">No registered mosques found in database.</p>
                  )}
                </div>
              )}

              {/* Security Guarantee Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                Security Guarantee: Role and scope boundaries are enforced server-side via database security policies and check constraints.
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Provisioning...
                    </>
                  ) : (
                    'Provision Administrator'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Credentials Modal (for Top-Down Delivery) */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Administrator Provisioned</h3>
                <p className="text-xs text-slate-500">
                  Account is ready. Share these credentials with the designated officer.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 font-mono text-xs">
              <div>
                <span className="text-slate-400 block font-sans text-[11px] uppercase tracking-wider font-semibold">
                  Administrator
                </span>
                <span className="text-slate-800 font-semibold">{createdCredentials.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-[11px] uppercase tracking-wider font-semibold">
                  Assigned Role & Scope
                </span>
                <span className="text-emerald-700 font-semibold uppercase">
                  {createdCredentials.role.replace('_', ' ')}
                </span>
                <span className="text-slate-500 font-sans block text-xs mt-0.5">
                  Scope: {createdCredentials.scope}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-[11px] uppercase tracking-wider font-semibold">
                  Email
                </span>
                <span className="text-slate-900 select-all">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-[11px] uppercase tracking-wider font-semibold">
                  Temporary Password
                </span>
                <span className="text-emerald-800 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 select-all">
                  {createdCredentials.pass}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all gap-1.5"
              >
                {hasCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    Copy Credentials
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

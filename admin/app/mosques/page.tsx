'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Mosque } from '@/lib/types';
import { useAdminAuth } from '@/lib/auth-context';
import {
  Building2,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  MapPin,
  ShieldCheck,
  Edit2,
  UserPlus,
  Compass,
  AlertTriangle,
  RotateCw,
  FileCheck,
  Copy,
  Layers,
  ArrowUpRight,
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

export default function MosquesPage() {
  const { role, activeDistrict, activeMosqueId } = useAdminAuth();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [activeMosque, setActiveMosque] = useState<Mosque | null>(null);

  // Confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'verify' | 'reject' | 'deactivate';
    mosque: Mosque | null;
  }>({
    isOpen: false,
    action: 'verify',
    mosque: null,
  });

  // Edit / Form state
  const [formName, setFormName] = useState('');
  const [formNameMl, setFormNameMl] = useState('');
  const [formLocality, setFormLocality] = useState('');
  const [formDistrict, setFormDistrict] = useState('Kozhikode');
  const [formLat, setFormLat] = useState('11.2425');
  const [formLng, setFormLng] = useState('75.7765');
  const [formEntranceLat, setFormEntranceLat] = useState('11.2425');
  const [formEntranceLng, setFormEntranceLng] = useState('75.7765');
  const [formRadius, setFormRadius] = useState('80');
  const [formNotes, setFormNotes] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchMosques();
  }, []);

  const fetchMosques = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mosques')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        setMosques(data as Mosque[]);
      } else {
        setMosques([]);
      }
    } catch (err) {
      console.error('Error fetching mosques:', err);
      setMosques([]);
    } finally {
      setLoading(false);
    }
  };

  const openConfirmModal = (action: 'verify' | 'reject' | 'deactivate', mosque: Mosque) => {
    setConfirmModal({
      isOpen: true,
      action,
      mosque,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      action: 'verify',
      mosque: null,
    });
  };

  const handleConfirmAction = async () => {
    const { action, mosque } = confirmModal;
    if (!mosque) return;

    closeConfirmModal();

    if (action === 'verify') {
      await handleUpdateStatus(mosque.id, 'verified');
    } else if (action === 'reject') {
      await handleUpdateStatus(mosque.id, 'rejected');
    } else if (action === 'deactivate') {
      await handleUpdateStatus(mosque.id, 'inactive');
    }
  };

  const handleUpdateStatus = async (mosqueId: string, status: Mosque['verification_status']) => {
    try {
      // 1. Attempt stored procedure update_mosque_pipeline_status
      const { error: rpcErr } = await supabase.rpc('update_mosque_pipeline_status', {
        p_mosque_id: mosqueId,
        p_status: status,
      });

      // 2. Direct fallback if stored procedure is not yet deployed
      if (rpcErr) {
        const { error } = await supabase
          .from('mosques')
          .update({ verification_status: status, updated_at: new Date().toISOString() })
          .eq('id', mosqueId);
        if (error) throw error;
      }

      // Audit log
      try {
        await supabase.from('audit_logs').insert({
          actor_name: role.toUpperCase(),
          action: `MOSQUE_${status.toUpperCase()}`,
          target_table: 'mosques',
          target_id: mosqueId,
          changes: { status },
        });
      } catch {
        // Ignore audit failure
      }

      setMosques((prev) =>
        prev.map((m) => (m.id === mosqueId ? { ...m, verification_status: status } : m))
      );
      setFeedbackMsg({ type: 'success', text: `Mosque status successfully set to ${status}.` });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to update mosque status.' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleSaveMosque = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);
    const radius = parseInt(formRadius, 10);
    const eLat = parseFloat(formEntranceLat);
    const eLng = parseFloat(formEntranceLng);

    if (showEditModal && activeMosque) {
      try {
        // 1. Try atomic stored procedure save_mosque_configuration
        const { error: rpcErr } = await supabase.rpc('save_mosque_configuration', {
          p_mosque_id: activeMosque.id,
          p_name: formName,
          p_name_ml: formNameMl || null,
          p_city_or_locality: formLocality,
          p_district: formDistrict,
          p_latitude: lat,
          p_longitude: lng,
          p_entrance_latitude: eLat,
          p_entrance_longitude: eLng,
          p_attendance_radius_m: radius,
          p_verification_notes: formNotes,
        });

        // 2. Direct update fallback
        if (rpcErr) {
          const { error: updateErr } = await supabase
            .from('mosques')
            .update({
              name: formName,
              name_ml: formNameMl || null,
              city_or_locality: formLocality,
              district: formDistrict,
              latitude: lat,
              longitude: lng,
              entrance_latitude: eLat,
              entrance_longitude: eLng,
              attendance_radius_m: radius,
              verification_notes: formNotes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeMosque.id);

          if (updateErr) throw updateErr;
        }

        setMosques((prev) =>
          prev.map((m) =>
            m.id === activeMosque.id
              ? {
                  ...m,
                  name: formName,
                  name_ml: formNameMl,
                  city_or_locality: formLocality,
                  district: formDistrict,
                  latitude: lat,
                  longitude: lng,
                  entrance_latitude: eLat,
                  entrance_longitude: eLng,
                  attendance_radius_m: radius,
                  verification_notes: formNotes,
                }
              : m
          )
        );
        setShowEditModal(false);
        setFeedbackMsg({ type: 'success', text: 'Mosque coordinates, entrance, and geofence updated.' });
        setTimeout(() => setFeedbackMsg(null), 4000);
      } catch (err: any) {
        setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to update mosque.' });
        setTimeout(() => setFeedbackMsg(null), 4000);
      } finally {
        setSubmitting(false);
      }
    } else if (showAddModal) {
      try {
        // 1. Try atomic stored procedure save_mosque_configuration
        const { data: rpcData, error: rpcErr } = await supabase.rpc('save_mosque_configuration', {
          p_name: formName,
          p_name_ml: formNameMl || null,
          p_city_or_locality: formLocality,
          p_district: formDistrict,
          p_latitude: lat,
          p_longitude: lng,
          p_entrance_latitude: eLat,
          p_entrance_longitude: eLng,
          p_attendance_radius_m: radius,
          p_verification_notes: formNotes || 'Manually registered and verified by Administrator.',
          p_verification_status: 'verified',
        });

        if (!rpcErr && rpcData?.mosque_id) {
          await fetchMosques();
        } else {
          // 2. Direct insert fallback using valid Supabase UUID generation
          const { data: inserted, error: insertErr } = await supabase
            .from('mosques')
            .insert({
              name: formName,
              name_ml: formNameMl || null,
              city_or_locality: formLocality,
              district: formDistrict,
              state: 'Kerala',
              verification_status: 'verified',
              attendance_radius_m: radius,
              entrance_latitude: eLat,
              entrance_longitude: eLng,
              qr_checkin_enabled: true,
              verification_notes: formNotes || 'Manually registered and verified by Administrator.',
              is_active: true,
              latitude: lat,
              longitude: lng,
            })
            .select()
            .single();

          if (insertErr) throw insertErr;
          if (inserted) {
            setMosques((prev) => [inserted as Mosque, ...prev]);
          }
        }

        setShowAddModal(false);
        setFeedbackMsg({ type: 'success', text: `"${formName}" registered and calibrated.` });
        setTimeout(() => setFeedbackMsg(null), 4000);
      } catch (err: any) {
        setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to register mosque.' });
        setTimeout(() => setFeedbackMsg(null), 4000);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMosque || !adminEmail) return;
    setSubmitting(true);

    try {
      // 1. Attempt stored procedure assign_mosque_admin_by_email
      const { data: rpcData, error: rpcErr } = await supabase.rpc('assign_mosque_admin_by_email', {
        p_mosque_id: activeMosque.id,
        p_email: adminEmail,
      });

      if (rpcErr) {
        // Fallback: check profile by username/id
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('id, full_name')
          .or(`username.eq.${adminEmail},id.eq.${adminEmail}`)
          .maybeSingle();

        if (profErr || !prof) {
          throw new Error(
            rpcErr.message ||
              `No user account found matching "${adminEmail}". Please provision an account on the Users page first.`
          );
        }

        await supabase.from('mosque_admins').insert({
          mosque_id: activeMosque.id,
          user_id: prof.id,
        });
      }

      setShowAdminModal(false);
      setAdminEmail('');
      setFeedbackMsg({ type: 'success', text: `Assigned admin ${adminEmail} to ${activeMosque.name}.` });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Could not assign admin.' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (mosque: Mosque) => {
    setActiveMosque(mosque);
    setFormName(mosque.name);
    setFormNameMl(mosque.name_ml || '');
    setFormLocality(mosque.city_or_locality || '');
    setFormDistrict(mosque.district);
    setFormLat((mosque.latitude || 11.2425).toString());
    setFormLng((mosque.longitude || 75.7765).toString());
    setFormEntranceLat((mosque.entrance_latitude || mosque.latitude || 11.2425).toString());
    setFormEntranceLng((mosque.entrance_longitude || mosque.longitude || 75.7765).toString());
    setFormRadius(mosque.attendance_radius_m.toString());
    setFormNotes(mosque.verification_notes || '');
    setShowEditModal(true);
  };

  const openAdminModal = (mosque: Mosque) => {
    setActiveMosque(mosque);
    setAdminEmail('');
    setShowAdminModal(true);
  };

  const openCreateModal = () => {
    setFormName('');
    setFormNameMl('');
    setFormLocality('');
    setFormDistrict('Kozhikode');
    setFormLat('11.2425');
    setFormLng('75.7765');
    setFormEntranceLat('11.2425');
    setFormEntranceLng('75.7765');
    setFormRadius('80');
    setFormNotes('');
    setShowAddModal(true);
  };

  // Filtered List
  const filteredMosques = mosques.filter((m) => {
    // If logged in as Mosque Admin, show only assigned mosque
    if (role === 'mosque_admin' && activeMosqueId && m.id !== activeMosqueId) {
      return false;
    }

    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.city_or_locality && m.city_or_locality.toLowerCase().includes(search.toLowerCase())) ||
      (m.name_ml && m.name_ml.toLowerCase().includes(search.toLowerCase()));

    const matchesDistrict =
      selectedDistrict === 'All Districts' || m.district === selectedDistrict;

    const matchesStatus =
      selectedStatus === 'all' || m.verification_status === selectedStatus;

    return matchesSearch && matchesDistrict && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Alert toast */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs uppercase font-bold text-slate-500 hover:text-slate-800 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-600" />
            Mosque Directory & OSM Staging Pipeline
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Verify OpenStreetMap candidates, calibrate entrance coordinates, set geofence radius, and assign Mosque Admins.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchMosques}
            disabled={loading}
            title="Refresh Directory"
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          {role !== 'mosque_admin' && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-colors gap-2"
            >
              <Plus className="w-4 h-4" />
              Register New Mosque
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search mosque name, locality, Malayalam..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* District Selector */}
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            >
              {KERALA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600 overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'verified', label: 'Verified' },
              { id: 'pending', label: 'OSM Staging' },
              { id: 'under_review', label: 'Under Review' },
              { id: 'needs_correction', label: 'Correction' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all whitespace-nowrap ${
                  selectedStatus === tab.id
                    ? 'bg-white text-emerald-800 shadow-sm font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mosque Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Mosque & Locality</th>
                <th className="px-4 py-3.5">District</th>
                <th className="px-4 py-3.5">Geofence & Entrance</th>
                <th className="px-4 py-3.5">Coordinates</th>
                <th className="px-4 py-3.5">Pipeline Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <RotateCw className="w-5 h-5 text-emerald-600 animate-spin" />
                      <span className="text-sm font-medium text-slate-500">Loading mosques directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredMosques.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <div className="font-semibold text-slate-700">No mosques found</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {mosques.length === 0
                        ? 'No mosques have been registered in the database yet. Click "Register New Mosque" to add one.'
                        : 'No mosques match your search or filter criteria.'}
                    </div>
                    {mosques.length > 0 && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setSelectedDistrict('All Districts');
                          setSelectedStatus('all');
                        }}
                        className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                      >
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredMosques.map((mosque) => (
                  <tr key={mosque.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{mosque.name}</div>
                      {mosque.name_ml && (
                        <div className="text-xs text-slate-500">{mosque.name_ml}</div>
                      )}
                      <div className="text-xs text-slate-400 mt-0.5">{mosque.city_or_locality}</div>
                      {mosque.verification_notes && (
                        <div className="text-[11px] text-slate-500 italic mt-1 line-clamp-1">
                          Note: {mosque.verification_notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {mosque.district}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-1.5 font-mono text-xs">
                        <Compass className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold text-slate-900">{mosque.attendance_radius_m}m</span>
                        <span className="text-slate-400">radius</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Entrance fix: calibrated
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs font-mono text-slate-500">
                        {mosque.latitude?.toFixed(4)}, {mosque.longitude?.toFixed(4)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {mosque.verification_status === 'verified' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Verified
                        </span>
                      )}
                      {mosque.verification_status === 'pending' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                          OSM Staging
                        </span>
                      )}
                      {mosque.verification_status === 'under_review' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          Under Review
                        </span>
                      )}
                      {mosque.verification_status === 'needs_correction' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                          Correction Req
                        </span>
                      )}
                      {mosque.verification_status === 'rejected' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {mosque.verification_status !== 'verified' && (
                          <button
                            title="Verify Mosque (District Admin Review)"
                            onClick={() => openConfirmModal('verify', mosque)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          title="Calibrate Coordinates & Entrance"
                          onClick={() => openEditModal(mosque)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {role !== 'mosque_admin' && (
                          <button
                            title="Assign Mosque Admin"
                            onClick={() => openAdminModal(mosque)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                        {mosque.verification_status !== 'rejected' && role !== 'mosque_admin' && (
                          <button
                            title="Reject Mosque Candidate"
                            onClick={() => openConfirmModal('reject', mosque)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              {showEditModal ? 'Calibrate Mosque Coordinates & Entrance' : 'Register New Kerala Mosque'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Calibrate exact center latitude/longitude, entrance gate coordinates, and anti-fraud radius (m).
            </p>

            <form onSubmit={handleSaveMosque} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Mosque Name (English)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mishkal Mosque"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Malayalam Name (മലയാളം പേര്)
                </label>
                <input
                  type="text"
                  placeholder="e.g. മിശ്കാൽ പള്ളി"
                  value={formNameMl}
                  onChange={(e) => setFormNameMl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Locality / Town
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kuttichira"
                    value={formLocality}
                    onChange={(e) => setFormLocality(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                  <select
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    {KERALA_DISTRICTS.filter((d) => d !== 'All Districts').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Center Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Center Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Entrance Gate Lat</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formEntranceLat}
                    onChange={(e) => setFormEntranceLat(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Entrance Gate Lng</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formEntranceLng}
                    onChange={(e) => setFormEntranceLng(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attendance Radius (meters)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="30"
                    max="200"
                    step="5"
                    value={formRadius}
                    onChange={(e) => setFormRadius(e.target.value)}
                    className="flex-1 accent-emerald-600"
                  />
                  <span className="font-mono text-sm font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {formRadius}m
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Verification Notes</label>
                <textarea
                  rows={2}
                  placeholder="Verification authority details or local Mahal committee source..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Mosque Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Mosque Admin Modal */}
      {showAdminModal && activeMosque && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Assign Mosque Administrator
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Authorize an imam, committee member, or volunteer to update daily Iqamah timetables for{' '}
              <strong className="text-slate-800">{activeMosque.name}</strong>.
            </p>

            <form onSubmit={handleAssignAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin User Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. imam@mishkalmosque.org"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                Mosque admins can publish daily Iqamah times and generate live display tokens, but cannot approve fraudulent attendance overrides.
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmModal.isOpen && confirmModal.mosque && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3.5 mb-4">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  confirmModal.action === 'verify'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-red-50 text-red-600 border border-red-100'
                }`}
              >
                {confirmModal.action === 'verify' ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {confirmModal.action === 'verify' && 'Verify Mosque & Publish to Mobile'}
                  {confirmModal.action === 'reject' && 'Reject Mosque Candidate'}
                  {confirmModal.action === 'deactivate' && 'Deactivate Mosque Venue'}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {confirmModal.action === 'verify' && (
                    <>
                      Are you sure you want to verify{' '}
                      <strong className="text-slate-800 font-semibold">{confirmModal.mosque.name}</strong>?
                      This will officially promote the mosque to active status, publish it on congregant mobile apps, and enable congregational check-in verification.
                    </>
                  )}
                  {confirmModal.action === 'reject' && (
                    <>
                      Are you sure you want to reject{' '}
                      <strong className="text-slate-800 font-semibold">{confirmModal.mosque.name}</strong>?
                      This candidate will be hidden from the directory and excluded from mobile prayer search.
                    </>
                  )}
                  {confirmModal.action === 'deactivate' && (
                    <>
                      Are you sure you want to deactivate{' '}
                      <strong className="text-slate-800 font-semibold">{confirmModal.mosque.name}</strong>?
                      Congregants will temporarily be unable to check in at this venue.
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
                  confirmModal.action === 'verify'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmModal.action === 'verify' && 'Yes, Verify Mosque'}
                {confirmModal.action === 'reject' && 'Yes, Reject Mosque'}
                {confirmModal.action === 'deactivate' && 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

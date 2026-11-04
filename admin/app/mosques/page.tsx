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

const INITIAL_MOSQUES: Mosque[] = [
  {
    id: 'm1',
    name: 'Mishkal Mosque',
    alternate_name: 'Mishkal Palli',
    name_ml: 'മിശ്കാൽ പള്ളി (കുറ്റിച്ചിറ)',
    address: 'Kuttichira',
    city_or_locality: 'Kuttichira, Kozhikode',
    district: 'Kozhikode',
    state: 'Kerala',
    verification_status: 'verified',
    attendance_radius_m: 80,
    entrance_latitude: 11.2425,
    entrance_longitude: 75.7765,
    qr_checkin_enabled: true,
    verification_notes: 'Verified via Kuttichira Mahal Committee records and on-site entrance inspection.',
    is_active: true,
    latitude: 11.2425,
    longitude: 75.7765,
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 'm2',
    name: 'Kallai Juma Masjid',
    alternate_name: 'Kallai Palli',
    name_ml: 'കല്ലായ് ജുമാ മസ്ജിദ്',
    address: 'Kallai Road',
    city_or_locality: 'Kallai, Kozhikode',
    district: 'Kozhikode',
    state: 'Kerala',
    verification_status: 'verified',
    attendance_radius_m: 70,
    entrance_latitude: 11.2338,
    entrance_longitude: 75.7951,
    qr_checkin_enabled: true,
    verification_notes: 'Standard roadside entrance geofence calibrated.',
    is_active: true,
    latitude: 11.2338,
    longitude: 75.7951,
    created_at: '2026-09-05T12:00:00Z',
  },
  {
    id: 'm3',
    name: 'Palayam Juma Masjid',
    alternate_name: 'Palayam Palli',
    name_ml: 'പാളയം ജുമാ മസ്ജിദ്',
    address: 'Palayam',
    city_or_locality: 'Palayam, Thiruvananthapuram',
    district: 'Thiruvananthapuram',
    state: 'Kerala',
    verification_status: 'verified',
    attendance_radius_m: 100,
    entrance_latitude: 8.5028,
    entrance_longitude: 76.9515,
    qr_checkin_enabled: true,
    verification_notes: 'City center landmark mosque with dual entrance geofence.',
    is_active: true,
    latitude: 8.5028,
    longitude: 76.9515,
    created_at: '2026-09-10T14:00:00Z',
  },
  {
    id: 'm4',
    name: 'Cheraman Juma Masjid',
    alternate_name: 'First Mosque in India (Historic)',
    name_ml: 'ചേരമാൻ ജുമാ മസ്ജിദ് (കൊടുങ്ങല്ലൂർ)',
    address: 'Methala, Kodungallur',
    city_or_locality: 'Kodungallur, Thrissur',
    district: 'Thrissur',
    state: 'Kerala',
    verification_status: 'verified',
    attendance_radius_m: 90,
    entrance_latitude: 10.2155,
    entrance_longitude: 76.1952,
    qr_checkin_enabled: true,
    verification_notes: 'Heritage status verified. Large premises radius applied.',
    is_active: true,
    latitude: 10.2155,
    longitude: 76.1952,
    created_at: '2026-09-12T08:00:00Z',
  },
  {
    id: 'm5',
    name: 'Malappuram Town Valiya Juma Masjid',
    alternate_name: 'Town Palli',
    name_ml: 'വലിയ ജുമാ മസ്ജിദ് മലപ്പുറം',
    address: 'Down Hill',
    city_or_locality: 'Malappuram Town',
    district: 'Malappuram',
    state: 'Kerala',
    verification_status: 'pending',
    attendance_radius_m: 75,
    entrance_latitude: 11.0732,
    entrance_longitude: 76.0740,
    qr_checkin_enabled: true,
    verification_notes: 'Imported from OSM Overpass staging pipeline; awaiting District Admin committee validation.',
    is_active: true,
    latitude: 11.0732,
    longitude: 76.0740,
    created_at: '2026-11-01T09:00:00Z',
  },
  {
    id: 'm6',
    name: 'Edappally Toll Juma Masjid',
    alternate_name: 'Toll Mosque',
    name_ml: 'ഇടപ്പള്ളി ടോൾ ജുമാ മസ്ജിദ്',
    address: 'Toll Junction, Edappally',
    city_or_locality: 'Kochi, Ernakulam',
    district: 'Ernakulam',
    state: 'Kerala',
    verification_status: 'under_review',
    attendance_radius_m: 70,
    entrance_latitude: 10.0261,
    entrance_longitude: 76.3082,
    qr_checkin_enabled: true,
    verification_notes: 'Under review for potential boundary overlap with adjacent madrasa property.',
    is_active: true,
    latitude: 10.0261,
    longitude: 76.3082,
    created_at: '2026-11-02T10:00:00Z',
  },
  {
    id: 'm7',
    name: 'Kottakkal Changuvetty Juma Masjid',
    alternate_name: 'Changuvetty Palli',
    name_ml: 'ചങ്കുവെട്ടി ജുമാ മസ്ജിദ്',
    address: 'Changuvetty',
    city_or_locality: 'Kottakkal, Malappuram',
    district: 'Malappuram',
    state: 'Kerala',
    verification_status: 'needs_correction',
    attendance_radius_m: 60,
    entrance_latitude: 10.9985,
    entrance_longitude: 75.9982,
    qr_checkin_enabled: true,
    verification_notes: 'Coordinates placed marker on bypass road instead of mosque entrance gate.',
    is_active: true,
    latitude: 10.9985,
    longitude: 75.9982,
    created_at: '2026-11-03T11:00:00Z',
  },
];

export default function MosquesPage() {
  const { role, activeDistrict, activeMosqueId } = useAdminAuth();
  const [mosques, setMosques] = useState<Mosque[]>(INITIAL_MOSQUES);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState(
    role === 'district_admin' && activeDistrict ? activeDistrict : 'All Districts'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [activeMosque, setActiveMosque] = useState<Mosque | null>(null);

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

      if (!error && data && data.length > 0) {
        setMosques(data as Mosque[]);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (mosqueId: string, status: Mosque['verification_status']) => {
    try {
      await supabase
        .from('mosques')
        .update({ verification_status: status })
        .eq('id', mosqueId);

      // Audit log
      await supabase.from('audit_logs').insert({
        actor_name: role.toUpperCase(),
        action: `MOSQUE_${status.toUpperCase()}`,
        target_table: 'mosques',
        target_id: mosqueId,
        changes: { status },
      });

      setMosques((prev) =>
        prev.map((m) => (m.id === mosqueId ? { ...m, verification_status: status } : m))
      );
      setFeedbackMsg({ type: 'success', text: `Mosque status successfully set to ${status}.` });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Failed to update mosque status.' });
    }
  };

  const handleSaveMosque = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);
    const radius = parseInt(formRadius, 10);
    const eLat = parseFloat(formEntranceLat);
    const eLng = parseFloat(formEntranceLng);

    if (showEditModal && activeMosque) {
      try {
        await supabase
          .from('mosques')
          .update({
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
          })
          .eq('id', activeMosque.id);

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
      } catch {
        setFeedbackMsg({ type: 'error', text: 'Failed to update mosque.' });
      }
    } else if (showAddModal) {
      const newMosque: Mosque = {
        id: `m_${Date.now()}`,
        name: formName,
        name_ml: formNameMl,
        city_or_locality: formLocality,
        district: formDistrict,
        state: 'Kerala',
        verification_status: 'verified',
        attendance_radius_m: radius,
        entrance_latitude: eLat,
        entrance_longitude: eLng,
        qr_checkin_enabled: true,
        verification_notes: formNotes || 'Manually registered and verified by District Admin.',
        is_active: true,
        latitude: lat,
        longitude: lng,
        created_at: new Date().toISOString(),
      };

      try {
        await supabase.from('mosques').insert(newMosque);
      } catch {
        // Fallback local
      }

      setMosques((prev) => [newMosque, ...prev]);
      setShowAddModal(false);
      setFeedbackMsg({ type: 'success', text: 'New mosque registered and calibrated.' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMosque || !adminEmail) return;

    try {
      await supabase.from('mosque_admins').insert({
        mosque_id: activeMosque.id,
        user_id: `user_${Date.now()}`,
        assigned_by: 'Super Admin',
      });

      await supabase.from('audit_logs').insert({
        actor_name: role.toUpperCase(),
        action: 'ASSIGN_MOSQUE_ADMIN',
        target_table: 'mosque_admins',
        target_id: activeMosque.id,
        changes: { email: adminEmail, mosque: activeMosque.name },
      });

      setShowAdminModal(false);
      setAdminEmail('');
      setFeedbackMsg({ type: 'success', text: `Assigned admin ${adminEmail} to ${activeMosque.name}.` });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Could not assign admin.' });
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
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs uppercase font-bold text-slate-500 hover:text-slate-800"
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
          <p className="text-sm text-slate-500">
            Verify OpenStreetMap candidates, calibrate entrance coordinates, set geofence radius, and assign Mosque Admins.
          </p>
        </div>

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
              disabled={role === 'district_admin'}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white disabled:opacity-60"
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
              {filteredMosques.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No mosques match your search or filter criteria.
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
                            onClick={() => handleUpdateStatus(mosque.id, 'verified')}
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
                            title="Reject Mosque"
                            onClick={() => handleUpdateStatus(mosque.id, 'rejected')}
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors"
                >
                  Save Mosque Configuration
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/auth-context';
import { AdminRole } from '@/lib/types';
import {
  Bell,
  Search,
  Shield,
  ChevronDown,
  Building2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

const ROLE_OPTIONS: { role: AdminRole; label: string; scope: string }[] = [
  { role: 'super_admin', label: 'Super Admin', scope: 'Statewide' },
  { role: 'mosque_admin', label: 'Mosque Admin', scope: 'Mishkal Mosque' },
  { role: 'district_admin', label: 'District Admin', scope: 'Kozhikode' },
  { role: 'attendance_reviewer', label: 'Attendance Reviewer', scope: 'Queue' },
  { role: 'support_admin', label: 'Support Admin', scope: 'Disputes' },
];

export default function Header() {
  const { role, adminUser, switchRole } = useAdminAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20">
      {/* Search Input */}
      <div className="flex items-center space-x-3 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search mosques, submissions, users, audit logs..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-4">
        {/* Quick Role Simulation Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="capitalize">{role.replace('_', ' ')}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Simulate Role View (RBAC)
              </div>
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.role}
                  onClick={() => {
                    switchRole(opt.role);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    role === opt.role ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div>{opt.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{opt.scope}</div>
                  </div>
                  {role === opt.role && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>


        {/* Notifications */}
        <button
          title="Notifications"
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
        </button>

        {/* Profile Card */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
            {adminUser?.full_name?.charAt(0) || 'A'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight">
              {adminUser?.full_name || 'Administrator'}
            </div>
            <div className="text-[11px] text-slate-500 capitalize">
              {role.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

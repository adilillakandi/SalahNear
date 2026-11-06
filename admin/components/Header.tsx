'use client';

import React from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/auth-context';
import {
  Bell,
  Search,
  LogOut,
} from 'lucide-react';

export default function Header() {
  const { role, adminUser, signOut } = useAdminAuth();

  const cleanName = (adminUser?.full_name || 'Adil KT')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 shrink-0 sticky top-0">
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
        {/* Notifications */}
        <button
          title="Notifications"
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
        </button>

        {/* Profile Card & Logout */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
            {cleanName.charAt(0) || 'A'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight">
              {cleanName}
            </div>
            <div className="text-[11px] text-slate-500 capitalize">
              {role.replace('_', ' ')}
            </div>
          </div>

          {/* Logout Icon Button */}
          <button
            type="button"
            onClick={async () => {
              await signOut();
            }}
            title="Sign Out"
            className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors ml-1 cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

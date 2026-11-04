'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  CheckCircle2,
  Clock,
  QrCode,
  Users,
  FileText,
  Shield,
  ExternalLink,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard Overview', href: '/', icon: LayoutDashboard },
  { name: 'Mosque Directory', href: '/mosques', icon: Building2 },
  { name: 'Attendance Review Queue', href: '/attendance', icon: CheckCircle2, badge: '4' },
  { name: 'Iqamah Timetables', href: '/schedules', icon: Clock },
  { name: 'Mosque QR Display', href: '/qr', icon: QrCode },
  { name: 'Users & Moderation', href: '/users', icon: Users },
  { name: 'Audit Logs', href: '/audit', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/50">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight text-white flex items-center gap-1.5">
            SalahNear <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">ADMIN</span>
          </h1>
          <p className="text-xs text-slate-400">Kerala Mosque Operations</p>
        </div>
      </div>

      {/* Role Pill */}
      <div className="mx-4 my-3 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="font-medium text-slate-200">Super Administrator</div>
            <div className="text-[10px] text-slate-400">Kerala Statewide</div>
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between">
          <span>Region Timezone</span>
          <span className="text-slate-200 font-mono">Asia/Kolkata</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Data Authority</span>
          <span className="text-slate-200">Shafi&apos;i Standard</span>
        </div>
        <a
          href="https://supabase.com/dashboard/project/vopcihpgfqborlwwimyx"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
        >
          <span>Open Supabase Console</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </aside>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth-context';
import { AdminRole } from '@/lib/types';
import {
  LayoutDashboard,
  Building2,
  CheckCircle2,
  Clock,
  QrCode,
  Users,
  FileText,
  Shield,
  Megaphone,
  CalendarDays,
  LifeBuoy,
  UserCog,
  LogOut,
  ExternalLink,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  allowedRoles: AdminRole[];
}

const ALL_NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard Overview',
    href: '/',
    icon: LayoutDashboard,
    allowedRoles: ['super_admin', 'state_admin', 'district_admin', 'mosque_admin', 'attendance_reviewer', 'support_admin'],
  },
  {
    name: 'Admin Management',
    href: '/administrators',
    icon: UserCog,
    allowedRoles: ['super_admin'],
  },
  {
    name: 'Mosque Directory',
    href: '/mosques',
    icon: Building2,
    allowedRoles: ['super_admin', 'state_admin', 'district_admin', 'mosque_admin'],
  },
  {
    name: 'Attendance Review',
    href: '/attendance',
    icon: CheckCircle2,
    badge: '4',
    allowedRoles: ['super_admin', 'state_admin', 'attendance_reviewer'],
  },
  {
    name: 'Iqamah Timetables',
    href: '/schedules',
    icon: Clock,
    allowedRoles: ['super_admin', 'state_admin', 'district_admin', 'mosque_admin'],
  },
  {
    name: 'Mosque QR Display',
    href: '/qr',
    icon: QrCode,
    allowedRoles: ['super_admin', 'mosque_admin'],
  },
  {
    name: 'Users & Moderation',
    href: '/users',
    icon: Users,
    allowedRoles: ['super_admin', 'state_admin', 'support_admin'],
  },
  {
    name: 'Scoped Announcements',
    href: '/announcements',
    icon: Megaphone,
    allowedRoles: ['super_admin', 'state_admin', 'district_admin', 'mosque_admin'],
  },
  {
    name: 'Mosque Events',
    href: '/events',
    icon: CalendarDays,
    allowedRoles: ['super_admin', 'mosque_admin'],
  },
  {
    name: 'Support & Disputes',
    href: '/support',
    icon: LifeBuoy,
    badge: '2',
    allowedRoles: ['super_admin', 'support_admin'],
  },
  {
    name: 'System Audit Logs',
    href: '/audit',
    icon: FileText,
    allowedRoles: ['super_admin', 'state_admin', 'district_admin', 'attendance_reviewer', 'support_admin'],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { role, adminUser, signOut } = useAdminAuth();

  // Filter items permitted for the current admin role
  const permittedItems = ALL_NAV_ITEMS.filter((item) => item.allowedRoles.includes(role));

  const roleLabel =
    role === 'super_admin'
      ? 'Super Administrator'
      : role === 'mosque_admin'
      ? 'Mosque Administrator'
      : role === 'district_admin'
      ? 'District Administrator'
      : role === 'attendance_reviewer'
      ? 'Attendance Reviewer'
      : role === 'support_admin'
      ? 'Support & Dispute Admin'
      : 'State Administrator';

  const scopeLabel =
    role === 'super_admin'
      ? 'Kerala Statewide'
      : role === 'mosque_admin'
      ? 'Mishkal Mosque, Kuttichira'
      : role === 'district_admin'
      ? 'Kozhikode District'
      : role === 'attendance_reviewer'
      ? 'Evidence Review Queue'
      : role === 'support_admin'
      ? 'Dispute Resolution'
      : 'Kerala State';

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
      <div className="mx-4 my-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="truncate">
            <div className="font-semibold text-slate-200 truncate">{roleLabel}</div>
            <div className="text-[10px] text-slate-400 truncate">{scopeLabel}</div>
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {permittedItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.name}</span>
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

      {/* Footer Info & Sign out */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span>Timezone</span>
            <span className="text-slate-200 font-mono">Asia/Kolkata</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Jurisdiction</span>
            <span className="text-slate-200 font-semibold text-[11px]">Kerala / Shafi&apos;i</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
          <div className="truncate mr-2">
            <div className="font-semibold text-slate-300 truncate text-[11px]">{adminUser?.full_name}</div>
            <div className="text-[10px] text-slate-500 truncate">{adminUser?.email}</div>
          </div>
          <button
            onClick={() => signOut()}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

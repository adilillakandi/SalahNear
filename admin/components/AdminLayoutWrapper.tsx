'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname?.startsWith('/accept-invite');

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isAuthPage) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, isAuthPage, router]);

  if (isAuthPage) {
    return <main className="min-h-screen w-full bg-slate-950">{children}</main>;
  }

  return (
    <div className="h-screen flex w-full text-slate-800 bg-slate-50 overflow-hidden relative">
      {!isAuthenticated && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Redirecting to login portal...</span>
        </div>
      )}

      {/* Fixed Left Sidebar - does not scroll with page */}
      <Sidebar />

      {/* Main App Area with independent scrollable content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl w-full mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

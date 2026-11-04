'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { AdminRole, AdminUser } from './types';

interface AuthContextType {
  adminUser: AdminUser | null;
  role: AdminRole;
  activeDistrict: string;
  activeMosqueId: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, role?: AdminRole) => Promise<boolean>;
  signOut: () => Promise<void>;
  switchRole: (newRole: AdminRole, district?: string, mosqueId?: string) => void;
}

const DEFAULT_SUPER_ADMIN: AdminUser = {
  id: 'adm_super_01',
  email: 'superadmin@salahnear.org',
  full_name: 'Dr. Abdul Rahman Koya',
  role: 'super_admin',
  state: 'Kerala',
  is_active: true,
  created_at: '2026-09-01T00:00:00Z',
  last_sign_in_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType>({
  adminUser: DEFAULT_SUPER_ADMIN,
  role: 'super_admin',
  activeDistrict: 'All Districts',
  activeMosqueId: 'm1',
  isAuthenticated: true,
  isLoading: false,
  signIn: async () => true,
  signOut: async () => {},
  switchRole: () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(DEFAULT_SUPER_ADMIN);
  const [role, setRole] = useState<AdminRole>('super_admin');
  const [activeDistrict, setActiveDistrict] = useState('All Districts');
  const [activeMosqueId, setActiveMosqueId] = useState('m1');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check saved state from localStorage if available
    try {
      const savedRole = localStorage.getItem('salahnear_admin_role') as AdminRole;
      const savedUser = localStorage.getItem('salahnear_admin_user');
      if (savedRole) {
        setRole(savedRole);
      }
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.full_name) {
          parsed.full_name = parsed.full_name.replace(/\s*\([^)]*\)/g, '');
        }
        setAdminUser(parsed);
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const switchRole = (newRole: AdminRole, district = 'All Districts', mosqueId = 'm1') => {
    setRole(newRole);
    setActiveDistrict(district);
    setActiveMosqueId(mosqueId);

    const updatedUser: AdminUser = {
      id: `adm_${newRole}`,
      email: `${newRole}@salahnear.org`,
      full_name:
        newRole === 'super_admin'
          ? 'Dr. Abdul Rahman Koya'
          : newRole === 'mosque_admin'
          ? 'Imam Rashid Moulavi'
          : newRole === 'district_admin'
          ? 'Zuhair Ahmed'
          : newRole === 'attendance_reviewer'
          ? 'Musthafa Kamal'
          : newRole === 'support_admin'
          ? 'Fathima Beegum'
          : 'State Overseer',
      role: newRole,
      state: 'Kerala',
      district: newRole === 'district_admin' ? 'Kozhikode' : undefined,
      assigned_mosques: newRole === 'mosque_admin' ? [mosqueId] : undefined,
      is_active: true,
      created_at: '2026-09-01T00:00:00Z',
    };

    setAdminUser(updatedUser);
    setIsAuthenticated(true);

    try {
      localStorage.setItem('salahnear_admin_role', newRole);
      localStorage.setItem('salahnear_admin_user', JSON.stringify(updatedUser));
    } catch {
      // Ignore
    }
  };

  const signIn = async (email: string, selectedRole: AdminRole = 'super_admin'): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Real Supabase session check or mock credential authorization
      switchRole(selectedRole);
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setAdminUser(null);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('salahnear_admin_role');
      localStorage.removeItem('salahnear_admin_user');
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        adminUser,
        role,
        activeDistrict,
        activeMosqueId,
        isAuthenticated,
        isLoading,
        signIn,
        signOut,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AuthContext);
}


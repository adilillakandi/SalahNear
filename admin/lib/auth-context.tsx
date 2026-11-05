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
  signIn: (email: string, password?: string, role?: AdminRole) => Promise<boolean>;
  signOut: () => Promise<void>;
  switchRole: (newRole: AdminRole, district?: string, mosqueId?: string) => void;
}

const DEFAULT_SUPER_ADMIN: AdminUser = {
  id: 'eca26e22-0a4c-43ab-b9ab-ce99318de7a0',
  email: 'adhilktillakandi@gmail.com',
  full_name: 'Adil KT',
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
      id: newRole === 'super_admin' ? 'eca26e22-0a4c-43ab-b9ab-ce99318de7a0' : `adm_${newRole}`,
      email: newRole === 'super_admin' ? 'adhilktillakandi@gmail.com' : 'mosqueadmin@salahnear.org',
      full_name: newRole === 'super_admin' ? 'Adil KT' : 'Mosque Administrator',
      role: newRole,
      state: 'Kerala',
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

  const signIn = async (
    email: string,
    password?: string,
    selectedRole: AdminRole = 'super_admin'
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();

      // Check for removed placeholder accounts
      if (cleanEmail === 'superadmin@salahnear.org' || cleanEmail === 'imam@mishkalmosque.org') {
        throw new Error('This account has been decommissioned. Please log in with the official Super Admin account.');
      }

      // Check Super Admin credentials
      if (cleanEmail === 'adhilktillakandi@gmail.com') {
        if (password && password !== 'adilSalaNear66') {
          throw new Error('Incorrect password. Please verify your credentials.');
        }

        const superAdminUser: AdminUser = {
          id: 'eca26e22-0a4c-43ab-b9ab-ce99318de7a0',
          email: 'adhilktillakandi@gmail.com',
          full_name: 'Adil KT',
          role: 'super_admin',
          state: 'Kerala',
          is_active: true,
          created_at: '2026-09-01T00:00:00Z',
          last_sign_in_at: new Date().toISOString(),
        };

        setRole('super_admin');
        setAdminUser(superAdminUser);
        setIsAuthenticated(true);

        try {
          localStorage.setItem('salahnear_admin_role', 'super_admin');
          localStorage.setItem('salahnear_admin_user', JSON.stringify(superAdminUser));
        } catch {
          // Ignore
        }
        return true;
      }

      // Check dynamic registered admin directory
      const { data: directory } = await supabase.rpc('get_admin_directory');
      const found = directory?.find(
        (a: any) => a.email.toLowerCase() === cleanEmail && a.is_active
      );

      if (found) {
        const authedUser: AdminUser = {
          id: found.user_id || found.id,
          email: found.email,
          full_name: found.full_name,
          role: found.role as AdminRole,
          state: 'Kerala',
          assigned_mosques: found.assigned_mosque_id ? [found.assigned_mosque_id] : undefined,
          is_active: true,
          created_at: found.created_at,
          last_sign_in_at: new Date().toISOString(),
        };

        setRole(found.role as AdminRole);
        setAdminUser(authedUser);
        setIsAuthenticated(true);

        try {
          localStorage.setItem('salahnear_admin_role', found.role);
          localStorage.setItem('salahnear_admin_user', JSON.stringify(authedUser));
        } catch {
          // Ignore
        }
        return true;
      }

      // Fallback
      switchRole(selectedRole);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      throw err;
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


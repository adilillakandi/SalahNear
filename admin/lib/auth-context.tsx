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

export const SUPER_ADMIN_EMAIL = 'adhilktillakandi@gmail.com';
export const SUPER_ADMIN_PASSWORD = 'adilSalaNear66';

const DEFAULT_SUPER_ADMIN: AdminUser = {
  id: 'eca26e22-0a4c-43ab-b9ab-ce99318de7a0',
  email: SUPER_ADMIN_EMAIL,
  full_name: 'Adil KT',
  role: 'super_admin',
  state: 'Kerala',
  is_active: true,
  created_at: '2026-09-01T00:00:00Z',
  last_sign_in_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType>({
  adminUser: null,
  role: 'super_admin',
  activeDistrict: 'All Districts',
  activeMosqueId: 'm1',
  isAuthenticated: false,
  isLoading: true,
  signIn: async () => false,
  signOut: async () => {},
  switchRole: () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [role, setRole] = useState<AdminRole>('super_admin');
  const [activeDistrict, setActiveDistrict] = useState('All Districts');
  const [activeMosqueId, setActiveMosqueId] = useState('m1');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check saved state from localStorage if available
    try {
      const isLoggedOut = localStorage.getItem('salahnear_admin_logged_out') === 'true';
      const savedUser = localStorage.getItem('salahnear_admin_user');
      const savedRole = localStorage.getItem('salahnear_admin_role') as AdminRole;

      if (!isLoggedOut && savedUser) {
        const parsed = JSON.parse(savedUser);
        // Only accept the authorized super admin
        if (parsed.email && parsed.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL) {
          if (parsed.full_name) {
            parsed.full_name = parsed.full_name.replace(/\s*\([^)]*\)/g, '').trim();
          }
          setAdminUser(parsed);
          setRole(savedRole || parsed.role || 'super_admin');
          setIsAuthenticated(true);
        } else {
          // Invalidate unauthorized saved users
          setAdminUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('salahnear_admin_user');
          localStorage.removeItem('salahnear_admin_role');
        }
      } else {
        setAdminUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setAdminUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchRole = (newRole: AdminRole, district = 'All Districts', mosqueId = 'm1') => {
    setRole(newRole);
    setActiveDistrict(district);
    setActiveMosqueId(mosqueId);

    const updatedUser: AdminUser = {
      id: 'eca26e22-0a4c-43ab-b9ab-ce99318de7a0',
      email: SUPER_ADMIN_EMAIL,
      full_name: 'Adil KT',
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
      localStorage.removeItem('salahnear_admin_logged_out');
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
      const cleanEmail = (email || '').toLowerCase().trim();
      const cleanPass = password || '';

      // STRICT VALIDATION: Only adhilktillakandi@gmail.com with adilSalaNear66 is allowed
      if (cleanEmail !== SUPER_ADMIN_EMAIL || cleanPass !== SUPER_ADMIN_PASSWORD) {
        throw new Error('Access denied. Invalid administrator email address or password.');
      }

      const superAdminUser: AdminUser = {
        id: 'eca26e22-0a4c-43ab-b9ab-ce99318de7a0',
        email: SUPER_ADMIN_EMAIL,
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
        localStorage.removeItem('salahnear_admin_logged_out');
      } catch {
        // Ignore
      }

      return true;
    } catch (err) {
      setIsAuthenticated(false);
      setAdminUser(null);
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
      localStorage.setItem('salahnear_admin_logged_out', 'true');
      sessionStorage.clear();
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
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


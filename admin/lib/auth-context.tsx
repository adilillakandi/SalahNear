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
        const parsed: AdminUser = JSON.parse(savedUser);
        if (parsed.email && parsed.role && parsed.is_active) {
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

    const currentUserEmail = adminUser?.email || SUPER_ADMIN_EMAIL;
    const currentUserName = adminUser?.full_name || 'Adil KT';

    const updatedUser: AdminUser = {
      id: adminUser?.id || 'eca26e22-0a4c-43ab-b9ab-ce99318de7a0',
      email: currentUserEmail,
      full_name: currentUserName,
      role: newRole,
      state: 'Kerala',
      assigned_mosques: newRole === 'mosque_admin' ? [mosqueId] : undefined,
      is_active: true,
      created_at: adminUser?.created_at || '2026-09-01T00:00:00Z',
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

      if (!cleanEmail || !cleanPass) {
        throw new Error('Email address and password are required.');
      }

      // 1. Primary Super Admin (Adil KT)
      if (cleanEmail === SUPER_ADMIN_EMAIL && cleanPass === SUPER_ADMIN_PASSWORD) {
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
      }

      // 2. Check Database Verification RPC
      let authenticatedUser: AdminUser | null = null;
      try {
        const { data: verifyData, error: verifyError } = await supabase.rpc(
          'verify_admin_credentials',
          {
            p_email: cleanEmail,
            p_password: cleanPass,
          }
        );

        if (!verifyError && verifyData) {
          if (!verifyData.success) {
            if (verifyData.code === 'PENDING_INVITATION') {
              throw new Error(
                verifyData.message ||
                  'Your invitation is pending acceptance. Please check your invitation email to activate your account before logging in.'
              );
            }
            if (verifyData.code === 'ACCOUNT_SUSPENDED') {
              throw new Error(
                verifyData.message ||
                  'Your administrator account has been deactivated. Please contact the Super Administrator.'
              );
            }
            throw new Error(
              verifyData.message || 'Invalid administrator email address or password.'
            );
          }

          if (verifyData.success && verifyData.user) {
            const u = verifyData.user;
            authenticatedUser = {
              id: u.id || u.user_id,
              email: u.email,
              full_name: u.full_name,
              role: u.role as AdminRole,
              assigned_mosques:
                u.assigned_mosques ||
                (u.assigned_mosque_name ? [u.assigned_mosque_name] : undefined),
              is_active: u.is_active ?? true,
              created_at: new Date().toISOString(),
              last_sign_in_at: new Date().toISOString(),
            };
          }
        }
      } catch (rpcErr: any) {
        if (rpcErr.message && rpcErr.message.includes('pending acceptance')) {
          throw rpcErr;
        }
        if (rpcErr.message && rpcErr.message.includes('deactivated')) {
          throw rpcErr;
        }
      }

      // 3. Fallback check if RPC is not yet created in Supabase
      if (!authenticatedUser) {
        // Check for pending invitation
        const { data: pendingInv } = await supabase
          .from('admin_invitations')
          .select('status, email')
          .eq('email', cleanEmail)
          .eq('status', 'pending')
          .maybeSingle();

        if (pendingInv) {
          throw new Error(
            'Your invitation is pending acceptance. Please check your invitation email to activate your account before logging in.'
          );
        }

        // Check directory
        const { data: directory } = await supabase.rpc('get_admin_directory');
        const found = directory?.find(
          (d: any) => d.email.toLowerCase() === cleanEmail
        );

        if (found) {
          if (found.invitation_status === 'pending' || !found.is_active) {
            throw new Error(
              'Your invitation is pending acceptance. Please check your invitation email to activate your account before logging in.'
            );
          }
          authenticatedUser = {
            id: found.user_id || found.id,
            email: found.email,
            full_name: found.full_name,
            role: found.role as AdminRole,
            assigned_mosques: found.assigned_mosque_name
              ? [found.assigned_mosque_name]
              : undefined,
            is_active: found.is_active,
            created_at: found.created_at,
          };
        }
      }

      if (!authenticatedUser) {
        throw new Error('Invalid administrator email address or password.');
      }

      setRole(authenticatedUser.role);
      setAdminUser(authenticatedUser);
      setIsAuthenticated(true);

      try {
        localStorage.setItem('salahnear_admin_role', authenticatedUser.role);
        localStorage.setItem(
          'salahnear_admin_user',
          JSON.stringify(authenticatedUser)
        );
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


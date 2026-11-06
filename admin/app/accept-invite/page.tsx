'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Mail,
  User,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';

interface InvitationInfo {
  id?: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'mosque_admin';
  mosque_name?: string;
  expires_at?: string;
  invited_by?: string;
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invitation token is missing from the URL. Please verify your invitation link.');
      setLoading(false);
      return;
    }

    verifyToken(token);
  }, [token]);

  const verifyToken = async (tok: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/invite/accept?token=${encodeURIComponent(tok)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === 'ALREADY_ACCEPTED') {
          setAlreadyAccepted(true);
          setInvitation({
            email: data.email || 'Admin User',
            full_name: data.full_name || 'Administrator',
            role: data.role || 'super_admin',
          });
        } else {
          setErrorMsg(data.message || 'Unable to verify invitation link.');
        }
        return;
      }

      setInvitation(data.invitation);
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error verifying invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to accept invitation.');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not complete invitation acceptance.');
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel =
    invitation?.role === 'super_admin' ? 'Super Administrator' : 'Mosque Administrator';
  const scopeLabel =
    invitation?.role === 'super_admin'
      ? 'Kerala Statewide (All 14 Districts)'
      : invitation?.mosque_name || 'Assigned Mosque Venue';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Islamic Glows */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-900/50">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              SalahNear <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">PORTAL</span>
            </h1>
            <p className="text-xs text-slate-400">Official Administrative Invitation</p>
          </div>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-800">
          {/* 1. Loading State */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <div>
                <h3 className="text-base font-semibold text-white">Verifying Invitation Token</h3>
                <p className="text-xs text-slate-400 mt-1">Validating security credentials and signature...</p>
              </div>
            </div>
          )}

          {/* 2. Error State */}
          {!loading && errorMsg && (
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">Invitation Unavailable</h2>
                <p className="text-xs text-red-300 mt-2 p-3 bg-red-950/40 rounded-xl border border-red-900/50">
                  {errorMsg}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Return to Sign In Portal
                </Link>
              </div>
            </div>
          )}

          {/* 3. Already Accepted State */}
          {!loading && !errorMsg && alreadyAccepted && (
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Invitation Already Accepted</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Your administrator account for <strong className="text-emerald-400">{invitation?.email}</strong> is already active.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="text-slate-200 font-semibold">{invitation?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Role:</span>
                  <span className="text-emerald-400 font-semibold">{roleLabel}</span>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/40"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* 4. Success State (Just Accepted) */}
          {!loading && !errorMsg && isSuccess && (
            <div className="space-y-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-900/50">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Account Activated
                </span>
                <h2 className="text-xl font-bold text-white">Welcome to SalahNear!</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Your administrative privileges have been successfully activated. You can now sign in using your email address and password.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Authorized Email:</span>
                  <span className="text-slate-200 font-mono font-medium">{invitation?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Administrative Role:</span>
                  <span className="text-emerald-400 font-semibold">{roleLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Access Scope:</span>
                  <span className="text-slate-300">{scopeLabel}</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/40"
                >
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* 5. Ready to Accept State */}
          {!loading && !errorMsg && !alreadyAccepted && !isSuccess && invitation && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                  <Shield className="w-3.5 h-3.5" />
                  Administrative Onboarding
                </div>
                <h2 className="text-lg font-bold text-white">
                  Assalamu Alaikum, {invitation.full_name}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  You have been invited by the Super Administrator to join the SalahNear Operations team.
                </p>
              </div>

              {/* Invitation Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Officer Name
                  </span>
                  <span className="text-slate-200 font-semibold">{invitation.full_name}</span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Login Email
                  </span>
                  <span className="text-slate-200 font-mono">{invitation.email}</span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Assigned Role
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {roleLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Operational Scope
                  </span>
                  <span className="text-slate-300 text-right truncate max-w-[200px]" title={scopeLabel}>
                    {scopeLabel}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Authentication Note:</strong> Your credentials have been configured. Upon clicking accept, your account will immediately be activated with verified permissions.
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={submitting}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/40 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Activating Administrator Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Accept Invitation & Activate Account</span>
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Already have access? Sign In
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          SalahNear Platform Security • Cryptographic Token Verification Enforced
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
          Loading Invitation Portal...
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}

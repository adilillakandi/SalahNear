'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/lib/auth-context';
import {
  QrCode,
  Building2,
  Clock,
  RefreshCw,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

const SAMPLE_MOSQUES = [
  { id: 'm1', name: 'Mishkal Mosque, Kuttichira, Kozhikode' },
  { id: 'm2', name: 'Kallai Juma Masjid, Kozhikode' },
  { id: 'm3', name: 'Palayam Juma Masjid, Thiruvananthapuram' },
  { id: 'm4', name: 'Cheraman Juma Masjid, Kodungallur' },
  { id: 'm5', name: 'Malappuram Town Valiya Juma Masjid' },
  { id: 'm6', name: 'Edappally Toll Juma Masjid, Kochi' },
];

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah'] as const;

export default function MosqueQrDisplayPage() {
  const { role, activeMosqueId } = useAdminAuth();
  const [mosques, setMosques] = useState(SAMPLE_MOSQUES);
  const [selectedMosqueId, setSelectedMosqueId] = useState(activeMosqueId || 'm1');
  const [selectedPrayer, setSelectedPrayer] = useState<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jummah'>('fajr');
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [tokenPayload, setTokenPayload] = useState('');
  const [signature, setSignature] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-detect prayer based on Kerala local time
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 4 && hour < 7) setSelectedPrayer('fajr');
    else if (hour >= 12 && hour < 15) {
      if (now.getDay() === 5) setSelectedPrayer('jummah');
      else setSelectedPrayer('dhuhr');
    } else if (hour >= 15 && hour < 18) setSelectedPrayer('asr');
    else if (hour >= 18 && hour < 19) setSelectedPrayer('maghrib');
    else setSelectedPrayer('isha');
  }, []);

  // Fetch real mosques if available
  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('mosques').select('id, name, city_or_locality');
        if (data && data.length > 0) {
          setMosques(
            data.map((m: any) => ({
              id: m.id,
              name: `${m.name} (${m.city_or_locality || 'Kerala'})`,
            }))
          );
        }
      } catch {
        // Fallback
      }
    }
    load();
  }, []);

  // Fetch server-signed token from /api/qr
  const fetchServerToken = async () => {
    try {
      const res = await fetch(`/api/qr?mosqueId=${selectedMosqueId}&session=${selectedPrayer}`);
      const data = await res.json();
      if (data.success && data.payload) {
        setTokenPayload(data.payload);
        setSignature(data.signature);
        setSecondsLeft(60);
        setErrorMsg(null);

        if (canvasRef.current) {
          QRCode.toCanvas(
            canvasRef.current,
            data.payload,
            {
              width: 320,
              margin: 2,
              color: {
                dark: '#064e3b',
                light: '#ffffff',
              },
            },
            (error) => {
              if (error) console.error(error);
            }
          );
        }
      }
    } catch (err: any) {
      setErrorMsg('Failed to obtain cryptographic QR token from server.');
    }
  };

  // Regeneration countdown timer
  useEffect(() => {
    fetchServerToken();
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchServerToken();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedMosqueId, selectedPrayer]);

  // Redraw when payload or canvas attaches
  useEffect(() => {
    if (canvasRef.current && tokenPayload) {
      QRCode.toCanvas(
        canvasRef.current,
        tokenPayload,
        {
          width: 320,
          margin: 2,
          color: {
            dark: '#064e3b',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error(error);
        }
      );
    }
  }, [tokenPayload]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const selectedMosque = mosques.find((m) => m.id === selectedMosqueId) || mosques[0];

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-8 overflow-y-auto' : ''}`}>
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <QrCode className="w-7 h-7 text-emerald-600" />
            Live Mosque Dynamic QR Display
          </h1>
          <p className="text-sm text-slate-500">
            TV display kiosk for entrance check-ins. Cryptographic HMAC tokens rotate every 60 seconds to eliminate static photo sharing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchServerToken()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <span>Regenerate Server Token</span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullscreen ? 'Exit Kiosk Display' : 'Launch Fullscreen Kiosk'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Mosque and Prayer Selection (Disabled or restricted for Mosque Admins) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            Mosque Venue
          </label>
          <select
            value={selectedMosqueId}
            disabled={role === 'mosque_admin'}
            onChange={(e) => setSelectedMosqueId(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white disabled:opacity-60"
          >
            {mosques.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            Active Prayer Congregation Session
          </label>
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600">
            {PRAYERS.map((prayer) => (
              <button
                key={prayer}
                onClick={() => setSelectedPrayer(prayer)}
                className={`flex-1 py-1.5 rounded-lg capitalize transition-all ${
                  selectedPrayer === prayer
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                {prayer}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Kiosk Center Card */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-8 border border-emerald-900/40 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full border border-emerald-500/10 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full border border-emerald-500/10 pointer-events-none" />

        {/* Live Status Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Server Signed • Validated Session</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
          {selectedMosque?.name}
        </h2>
        <p className="text-emerald-300 text-sm font-medium mb-6 flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          Active Congregation:{' '}
          <span className="uppercase font-bold tracking-wider text-amber-300">
            {selectedPrayer} Session
          </span>
        </p>

        {/* High-Contrast QR Code Card */}
        <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-emerald-500/30 flex flex-col items-center">
          <canvas ref={canvasRef} className="rounded-xl shadow-inner max-w-full" />

          {/* Countdown timer under QR */}
          <div className="mt-4 w-full">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1.5">
              <span>Token Auto-Refresh In:</span>
              <span className="font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-bold">
                {secondsLeft}s
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(secondsLeft / 60) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Congregant Instructions */}
        <div className="mt-8 max-w-md w-full bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 text-xs text-slate-300 space-y-2 text-left">
          <div className="flex items-center space-x-2 font-bold text-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Congregant Instructions:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Open the <strong>SalahNear</strong> mobile application.</li>
            <li>Tap <strong>Verify Attendance</strong> &rarr; Select <strong>Mosque QR Code</strong>.</li>
            <li>Scan this screen to earn <strong>5 community points</strong> and advance your streak!</li>
          </ol>
        </div>

        <div className="mt-4 text-[10px] text-slate-500 font-mono">
          HMAC-SHA256 Signature: {signature || 'e4b9...'}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Link2, Link2Off, Wifi, WifiOff, Activity } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Navigation from '@/components/Navigation';
import { WhoopData } from '@/types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

const recoveryColors: Record<string, string> = {
  green: '#16a34a',
  yellow: '#ca8a04',
  red: '#dc2626',
};

interface HealthSource {
  id: string;
  name: string;
  icon: string;
  description: string;
  authUrl: string;
  dataUrl: string;
  disconnectUrl: string;
  color: string;
  connected: boolean;
}

function WhoopPageInner() {
  const searchParams = useSearchParams();
  const justConnected = searchParams.get('connected');
  const authError = searchParams.get('error');

  const [whoopData, setWhoopData] = useState<WhoopData | null>(null);
  const [dataSource, setDataSource] = useState<string>('none');
  const [loading, setLoading] = useState(true);
  // HIDDEN: Requires native app — re-enable when building React Native version
  // { id: 'apple', name: 'Apple Health', icon: 'A', description: 'Steps, heart rate, workouts, sleep', authUrl: '', dataUrl: '', disconnectUrl: '', color: '#ef4444', connected: false },
  // { id: 'google', name: 'Google Health Connect', icon: 'G', description: 'Activity, nutrition, vitals', authUrl: '', dataUrl: '', disconnectUrl: '', color: '#3b82f6', connected: false },
  const [sources, setSources] = useState<HealthSource[]>([
    { id: 'whoop', name: 'WHOOP', icon: 'W', description: 'Recovery, strain, sleep tracking', authUrl: '/api/whoop/auth', dataUrl: '/api/whoop/data', disconnectUrl: '/api/whoop/disconnect', color: '#16a34a', connected: false },
    { id: 'oura', name: 'Oura Ring', icon: 'O', description: 'Readiness, sleep stages, HRV', authUrl: '/api/oura/auth', dataUrl: '/api/oura/data', disconnectUrl: '/api/oura/disconnect', color: '#a855f7', connected: false },
  ]);

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Try WHOOP first
      const whoopRes = await fetch('/api/whoop/data');
      const whoopJson = await whoopRes.json();
      if (whoopJson.source === 'live') {
        setWhoopData(whoopJson.data);
        setDataSource('WHOOP');
        setSources(prev => prev.map(s => s.id === 'whoop' ? { ...s, connected: true } : s));
        setLoading(false);
        return;
      }

      // Try Oura (live only — no sandbox/mock data)
      const ouraRes = await fetch('/api/oura/data');
      const ouraJson = await ouraRes.json();
      if (ouraJson.source === 'live' && ouraJson.data) {
        setWhoopData(ouraJson.data);
        setDataSource('Oura Ring');
        setSources(prev => prev.map(s => s.id === 'oura' ? { ...s, connected: true } : s));
        setLoading(false);
        return;
      }

      // No data available
      setWhoopData(null);
      setDataSource('none');
    } catch {
      setWhoopData(null);
      setDataSource('none');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (source: HealthSource) => {
    if (!source.disconnectUrl) return;
    try {
      await fetch(source.disconnectUrl, { method: 'POST' });
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, connected: false } : s));
      fetchAllData();
    } catch { /* ignore */ }
  };

  const hasData = whoopData !== null && dataSource !== 'none';

  return (
    <div className="min-h-screen pb-24 bg-[#0f1219]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#2a2d35] bg-[#1a1d24] px-4 py-3">
        <Link href="/" className="text-[#9ca3af] hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-sm text-white">Recovery Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          {hasData ? (
            <span className="flex items-center gap-1 text-xs text-[#4ade80]">
              <Wifi size={12} /> {dataSource}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-[#9ca3af]">
              <WifiOff size={12} /> Not connected
            </span>
          )}
        </div>
      </div>

      {/* Connection Status Banner */}
      {justConnected && (
        <div className="mx-4 mt-4 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/30 p-3 text-sm text-[#4ade80]">
          {justConnected === 'oura' ? 'Oura Ring' : 'WHOOP'} connected successfully! Showing your real data.
        </div>
      )}
      {authError && (
        <div className="mx-4 mt-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 p-3 text-sm text-[#ef4444]">
          Connection failed: {authError.replace(/_/g, ' ')}. Please try again.
        </div>
      )}

      {/* Health Sources */}
      <div className="px-4 pt-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[#9ca3af] mb-3">Health Sources</h2>
        <div className="grid grid-cols-2 gap-2">
          {sources.map((source) => (
            <div key={source.id} className="rounded-xl bg-[#1a1d24] border border-[#2a2d35] p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: source.color }}>
                  {source.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{source.name}</p>
                </div>
              </div>
              <p className="text-[10px] text-[#9ca3af] mb-2 line-clamp-1">{source.description}</p>
              {source.connected ? (
                <button
                  onClick={() => handleDisconnect(source)}
                  className="flex items-center justify-center gap-1 w-full rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 py-1.5 text-[10px] font-medium text-[#ef4444] hover:bg-[#ef4444]/15 transition-colors"
                >
                  <Link2Off size={10} /> Disconnect
                </button>
              ) : (
                <a
                  href={source.authUrl}
                  className="flex items-center justify-center gap-1 w-full rounded-lg border border-[#2a2d35] bg-[#22252d] py-1.5 text-[10px] font-medium text-white hover:bg-[#22252d] transition-colors"
                >
                  <Link2 size={10} /> Connect
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[#a5b4fc]" />
        </div>
      ) : !hasData ? (
        /* Empty state — no device connected */
        <div className="px-4 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#22252d] flex items-center justify-center mx-auto mb-4">
            <Activity size={32} className="text-[#6b7280]" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Connect a device to see your recovery data</h2>
          <p className="text-sm text-[#9ca3af] max-w-xs mx-auto">
            Link your WHOOP or Oura Ring above. Your coach will use recovery data to personalize your training.
          </p>
        </div>
      ) : (
        <div className="px-4 py-6">
          {/* Today's Stats */}
          <div className="rounded-2xl border border-[#2a2d35] bg-[#1a1d24] p-5 mb-6">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#9ca3af] mb-3">Today&apos;s Recovery</h2>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl font-extrabold" style={{ color: recoveryColors[whoopData!.today.color] }}>
                {whoopData!.today.recovery_score}%
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase" style={{ color: recoveryColors[whoopData!.today.color], backgroundColor: `${recoveryColors[whoopData!.today.color]}15` }}>
                {whoopData!.today.color === 'green' ? 'Recovered' : whoopData!.today.color === 'yellow' ? 'Moderate' : 'Rest'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Resting HR', value: `${whoopData!.today.resting_hr} bpm` },
                { label: 'HRV', value: `${whoopData!.today.hrv} ms` },
                { label: 'SpO2', value: `${whoopData!.today.spo2}%` },
                { label: 'Skin Temp', value: `${whoopData!.today.skin_temp}°C` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-[#0f1219] p-3">
                  <p className="text-xs text-[#9ca3af]">{stat.label}</p>
                  <p className="text-sm font-bold mt-0.5 text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recovery Chart */}
          <div className="rounded-2xl border border-[#2a2d35] bg-[#1a1d24] p-5 mb-6">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#9ca3af] mb-4">7-Day Recovery</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={whoopData!.recovery.map(d => ({ ...d, fill: recoveryColors[d.color] }))}>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sleep Chart */}
          <div className="rounded-2xl border border-[#2a2d35] bg-[#1a1d24] p-5 mb-6">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#9ca3af] mb-4">Sleep Duration (hrs)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={whoopData!.sleep}>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} />
                <Bar dataKey="deep" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Deep" />
                <Bar dataKey="rem" stackId="a" fill="#8b5cf6" name="REM" />
                <Bar dataKey="light" stackId="a" fill="#d1d5db" radius={[4, 4, 0, 0]} name="Light" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-center">
              {[
                { label: 'Deep', color: '#3b82f6' },
                { label: 'REM', color: '#8b5cf6' },
                { label: 'Light', color: '#d1d5db' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Strain Chart */}
          <div className="rounded-2xl border border-[#2a2d35] bg-[#1a1d24] p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#9ca3af] mb-4">Daily Strain</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={whoopData!.strain}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d35" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 21]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} />
                <Line type="monotone" dataKey="strain" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function WhoopPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-[#9ca3af]">Loading...</div>}>
      <WhoopPageInner />
    </Suspense>
  );
}

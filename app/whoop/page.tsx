'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import MaterialIcon from '@/components/MaterialIcon';
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
      const whoopRes = await fetch('/api/whoop/data');
      const whoopJson = await whoopRes.json();
      if (whoopJson.source === 'live') {
        setWhoopData(whoopJson.data);
        setDataSource('WHOOP');
        setSources(prev => prev.map(s => s.id === 'whoop' ? { ...s, connected: true } : s));
        setLoading(false);
        return;
      }

      const ouraRes = await fetch('/api/oura/data');
      const ouraJson = await ouraRes.json();
      if (ouraJson.source === 'live' && ouraJson.data) {
        setWhoopData(ouraJson.data);
        setDataSource('Oura Ring');
        setSources(prev => prev.map(s => s.id === 'oura' ? { ...s, connected: true } : s));
        setLoading(false);
        return;
      }

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
    <div className="min-h-screen pb-24 bg-surface">
      {/* Header — glass morphism */}
      <div className="fixed top-0 w-full z-50 h-16 bg-slate-50/80 backdrop-blur-md flex items-center gap-3 px-4">
        <Link href="/" className="text-secondary hover:text-on-surface">
          <MaterialIcon icon="arrow_back" size={20} />
        </Link>
        <h1 className="font-bold text-sm font-headline text-on-surface">Recovery Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          {hasData ? (
            <span className="flex items-center gap-1 text-xs text-emerald-500">
              <MaterialIcon icon="wifi" size={14} /> {dataSource}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-secondary">
              <MaterialIcon icon="wifi_off" size={14} /> Not connected
            </span>
          )}
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-16" />

      {/* Connection Status Banner */}
      {justConnected && (
        <div className="mx-4 mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
          {justConnected === 'oura' ? 'Oura Ring' : 'WHOOP'} connected successfully! Showing your real data.
        </div>
      )}
      {authError && (
        <div className="mx-4 mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Connection failed: {authError.replace(/_/g, ' ')}. Please try again.
        </div>
      )}

      {/* Health Sources */}
      <div className="px-4 pt-4">
        <h2 className="text-[10px] font-label font-bold uppercase tracking-widest text-secondary mb-3">Health Sources</h2>
        <div className="grid grid-cols-2 gap-2">
          {sources.map((source) => (
            <div key={source.id} className="rounded-xl bg-surface-container-lowest border border-outline-variant/5 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: source.color }}>
                  {source.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-on-surface truncate">{source.name}</p>
                </div>
              </div>
              <p className="text-[10px] text-secondary mb-2 line-clamp-1">{source.description}</p>
              {source.connected ? (
                <button
                  onClick={() => handleDisconnect(source)}
                  className="flex items-center justify-center gap-1 w-full rounded-xl border border-red-200 bg-red-50 py-1.5 text-[10px] font-medium text-red-600 hover:bg-red-100 transition-colors"
                >
                  <MaterialIcon icon="link_off" size={12} /> Disconnect
                </button>
              ) : (
                <a
                  href={source.authUrl}
                  className="flex items-center justify-center gap-1 w-full rounded-xl border border-outline-variant bg-surface-container-low py-1.5 text-[10px] font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  <MaterialIcon icon="link" size={12} /> Connect
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <MaterialIcon icon="progress_activity" size={32} className="animate-spin text-primary" />
        </div>
      ) : !hasData ? (
        <div className="px-4 py-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-surface-container-low flex items-center justify-center mx-auto mb-4">
            <MaterialIcon icon="monitor_heart" size={32} className="text-secondary" />
          </div>
          <h2 className="text-lg font-bold font-headline text-on-surface mb-2">Connect a device to see your recovery data</h2>
          <p className="text-sm text-secondary max-w-xs mx-auto">
            Link your WHOOP or Oura Ring above. Your coach will use recovery data to personalize your training.
          </p>
        </div>
      ) : (
        <div className="px-4 py-6">
          {/* Today's Stats — Bento grid */}
          <div className="rounded-xl border border-outline-variant/5 bg-surface-container-lowest p-5 mb-4 shadow-sm">
            <h2 className="text-[10px] font-label font-bold uppercase tracking-widest text-secondary mb-3">Today&apos;s Recovery</h2>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl font-extrabold font-headline" style={{ color: recoveryColors[whoopData!.today.color] }}>
                {whoopData!.today.recovery_score}%
              </span>
              <span className="rounded-xl px-3 py-1 text-xs font-semibold uppercase" style={{ color: recoveryColors[whoopData!.today.color], backgroundColor: `${recoveryColors[whoopData!.today.color]}15` }}>
                {whoopData!.today.color === 'green' ? 'Recovered' : whoopData!.today.color === 'yellow' ? 'Moderate' : 'Rest'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Resting HR', value: `${whoopData!.today.resting_hr} bpm`, icon: 'favorite' },
                { label: 'HRV', value: `${whoopData!.today.hrv} ms`, icon: 'monitoring' },
                { label: 'SpO2', value: `${whoopData!.today.spo2}%`, icon: 'spo2' },
                { label: 'Skin Temp', value: `${whoopData!.today.skin_temp}°C`, icon: 'thermostat' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-surface p-3">
                  <p className="text-[10px] font-label font-bold uppercase tracking-widest text-secondary">{stat.label}</p>
                  <p className="text-sm font-bold mt-0.5 text-on-surface">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recovery Chart */}
          <div className="rounded-xl border border-outline-variant/5 bg-surface-container-lowest p-5 mb-4 shadow-sm">
            <h2 className="text-[10px] font-label font-bold uppercase tracking-widest text-secondary mb-4">7-Day Recovery</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={whoopData!.recovery.map(d => ({ ...d, fill: recoveryColors[d.color] }))}>
                <XAxis dataKey="date" tick={{ fill: '#44474a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#44474a', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #c4c7cb', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#5d5e61' }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="#00113a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sleep Chart */}
          <div className="rounded-xl border border-outline-variant/5 bg-surface-container-lowest p-5 mb-4 shadow-sm">
            <h2 className="text-[10px] font-label font-bold uppercase tracking-widest text-secondary mb-4">Sleep Duration (hrs)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={whoopData!.sleep}>
                <XAxis dataKey="date" tick={{ fill: '#44474a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: '#44474a', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #c4c7cb', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#5d5e61' }} />
                <Bar dataKey="deep" stackId="a" fill="#00113a" radius={[0, 0, 0, 0]} name="Deep" />
                <Bar dataKey="rem" stackId="a" fill="#002366" name="REM" />
                <Bar dataKey="light" stackId="a" fill="#c4c7cb" radius={[4, 4, 0, 0]} name="Light" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-center">
              {[
                { label: 'Deep', color: '#00113a' },
                { label: 'REM', color: '#002366' },
                { label: 'Light', color: '#c4c7cb' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-secondary">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Strain Chart */}
          <div className="rounded-xl border border-outline-variant/5 bg-surface-container-lowest p-5 shadow-sm">
            <h2 className="text-[10px] font-label font-bold uppercase tracking-widest text-secondary mb-4">Daily Strain</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={whoopData!.strain}>
                <CartesianGrid strokeDasharray="3 3" stroke="#c4c7cb" />
                <XAxis dataKey="date" tick={{ fill: '#44474a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 21]} tick={{ fill: '#44474a', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #c4c7cb', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#5d5e61' }} />
                <Line type="monotone" dataKey="strain" stroke="#00113a" strokeWidth={2} dot={{ fill: '#00113a', r: 4 }} />
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
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-secondary">Loading...</div>}>
      <WhoopPageInner />
    </Suspense>
  );
}

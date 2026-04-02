'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Link2, Link2Off, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Navigation from '@/components/Navigation';
import { MOCK_WHOOP_DATA } from '@/lib/whoop-data';
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

  const [whoopData, setWhoopData] = useState<WhoopData>(MOCK_WHOOP_DATA);
  const [dataSource, setDataSource] = useState<string>('mock');
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

      // Try Oura (live or sandbox)
      const ouraRes = await fetch('/api/oura/data');
      const ouraJson = await ouraRes.json();
      if ((ouraJson.source === 'live' || ouraJson.source === 'sandbox') && ouraJson.data) {
        setWhoopData(ouraJson.data);
        setDataSource(ouraJson.source === 'sandbox' ? 'Oura (Sandbox)' : 'Oura Ring');
        setSources(prev => prev.map(s => s.id === 'oura' ? { ...s, connected: ouraJson.source === 'live' } : s));
        setLoading(false);
        return;
      }

      // Fall back to mock
      setWhoopData(MOCK_WHOOP_DATA);
      setDataSource('mock');
    } catch {
      setWhoopData(MOCK_WHOOP_DATA);
      setDataSource('mock');
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

  const { today, recovery, sleep, strain } = whoopData;

  const recoveryChartData = recovery.map((d) => ({
    ...d,
    fill: recoveryColors[d.color],
  }));

  return (
    <div className="min-h-screen pb-24 bg-[#f8f9fa]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <Link href="/" className="text-[#6b7280] hover:text-[#111827]">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-sm text-[#111827]">Recovery Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          {dataSource !== 'mock' ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Wifi size={12} /> {dataSource}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-[#6b7280]">
              <WifiOff size={12} /> Demo
            </span>
          )}
        </div>
      </div>

      {/* Connection Status Banner */}
      {justConnected && (
        <div className="mx-4 mt-4 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {justConnected === 'oura' ? 'Oura Ring' : 'WHOOP'} connected successfully! Showing your real data.
        </div>
      )}
      {authError && (
        <div className="mx-4 mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
          Connection failed: {authError.replace(/_/g, ' ')}. Please try again.
        </div>
      )}

      {/* Health Sources */}
      <div className="px-4 pt-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-3">Connected Sources</h2>
        <div className="grid grid-cols-2 gap-2">
          {sources.map((source) => (
            <div key={source.id} className="rounded-xl bg-white border border-[#e5e7eb] p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: source.color }}>
                  {source.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#111827] truncate">{source.name}</p>
                </div>
              </div>
              <p className="text-[10px] text-[#6b7280] mb-2 line-clamp-1">{source.description}</p>
              {source.connected ? (
                <button
                  onClick={() => handleDisconnect(source)}
                  className="flex items-center justify-center gap-1 w-full rounded-lg border border-red-200 bg-red-50 py-1.5 text-[10px] font-medium text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Link2Off size={10} /> Disconnect
                </button>
              ) : (
                <a
                  href={source.authUrl}
                  className="flex items-center justify-center gap-1 w-full rounded-lg border border-[#e5e7eb] bg-gray-50 py-1.5 text-[10px] font-medium text-[#111827] hover:bg-gray-100 transition-colors"
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
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="px-4 py-6">
          {/* Today's Stats */}
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 mb-6 shadow-sm">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-3">Today&apos;s Recovery</h2>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl font-extrabold" style={{ color: recoveryColors[today.color] }}>
                {today.recovery_score}%
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase" style={{ color: recoveryColors[today.color], backgroundColor: `${recoveryColors[today.color]}15` }}>
                {today.color === 'green' ? 'Recovered' : today.color === 'yellow' ? 'Moderate' : 'Rest'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Resting HR', value: `${today.resting_hr} bpm` },
                { label: 'HRV', value: `${today.hrv} ms` },
                { label: 'SpO2', value: `${today.spo2}%` },
                { label: 'Skin Temp', value: `${today.skin_temp}°C` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-[#f8f9fa] p-3">
                  <p className="text-xs text-[#6b7280]">{stat.label}</p>
                  <p className="text-sm font-bold mt-0.5 text-[#111827]">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recovery Insight */}
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 mb-6 shadow-sm">
            <h2 className="text-xs font-medium uppercase tracking-wider text-blue-600 mb-3">Coach&apos;s Take</h2>
            <p className="text-sm text-[#6b7280] leading-relaxed">
              {today.color === 'green'
                ? `Recovery at ${today.recovery_score}% — you're primed. HRV of ${today.hrv}ms shows strong parasympathetic tone. Go after it today. Full volume, chase progressive overload.`
                : today.color === 'yellow'
                ? `Recovery at ${today.recovery_score}% — moderate zone. HRV of ${today.hrv}ms suggests your nervous system is still processing. Train today but drop volume ~30%.`
                : `Recovery at ${today.recovery_score}% — your body is asking for rest. HRV of ${today.hrv}ms is suppressed. Today: mobility work, light cardio, stretching.`}
            </p>
          </div>

          {/* Recovery Chart */}
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 mb-6 shadow-sm">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-4">7-Day Recovery</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={recoveryChartData}>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#6b7280' }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="#2563eb">
                  {recoveryChartData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sleep Chart */}
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 mb-6 shadow-sm">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-4">Sleep Duration (hrs)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sleep}>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#6b7280' }} />
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
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Strain Chart */}
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-4">Daily Strain</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={strain}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 21]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#6b7280' }} />
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
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-[#6b7280]">Loading...</div>}>
      <WhoopPageInner />
    </Suspense>
  );
}

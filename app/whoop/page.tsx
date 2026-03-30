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

function WhoopPageInner() {
  const searchParams = useSearchParams();
  const justConnected = searchParams.get('connected') === 'true';
  const authError = searchParams.get('error');

  const [whoopData, setWhoopData] = useState<WhoopData>(MOCK_WHOOP_DATA);
  const [dataSource, setDataSource] = useState<'mock' | 'live'>('mock');
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whoop/data');
      const json = await res.json();
      setWhoopData(json.data);
      setDataSource(json.source);
    } catch {
      setWhoopData(MOCK_WHOOP_DATA);
      setDataSource('mock');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch('/api/whoop/disconnect', { method: 'POST' });
      setDataSource('mock');
      setWhoopData(MOCK_WHOOP_DATA);
    } finally {
      setDisconnecting(false);
    }
  };

  const { today, recovery, sleep, strain } = whoopData;

  const recoveryChartData = recovery.map((d) => ({
    ...d,
    fill: recoveryColors[d.color],
  }));

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#262626] px-4 py-3">
        <Link href="/" className="text-[#a3a3a3] hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-sm">Recovery Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          {dataSource === 'live' ? (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <Wifi size={12} /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-[#a3a3a3]">
              <WifiOff size={12} /> Demo
            </span>
          )}
        </div>
      </div>

      {/* Connection Status Banner */}
      {justConnected && (
        <div className="mx-4 mt-4 rounded-xl bg-green-600/10 border border-green-600/30 p-3 text-sm text-green-500">
          WHOOP connected successfully! Showing your real data.
        </div>
      )}
      {authError && (
        <div className="mx-4 mt-4 rounded-xl bg-red-600/10 border border-red-600/30 p-3 text-sm text-red-500">
          Connection failed. Please try again.
        </div>
      )}

      {/* WHOOP Connect/Disconnect */}
      <div className="px-4 pt-4">
        {dataSource === 'mock' ? (
          <a
            href="/api/whoop/auth"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#171717] border border-[#262626] hover:border-green-600/50 p-3 text-sm font-semibold transition-colors"
          >
            <Link2 size={16} className="text-green-500" />
            Connect WHOOP
          </a>
        ) : (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#171717] border border-[#262626] hover:border-red-600/50 p-3 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {disconnecting ? <Loader2 size={16} className="animate-spin" /> : <Link2Off size={16} className="text-red-500" />}
            Disconnect WHOOP
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-red-500" />
        </div>
      ) : (
        <div className="px-4 py-6">
          {/* Today's Stats */}
          <div className="rounded-2xl border border-[#262626] bg-[#171717] p-5 mb-6">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#a3a3a3] mb-3">Today&apos;s Recovery</h2>
            <div className="flex items-center gap-4 mb-4">
              <span
                className="text-5xl font-extrabold"
                style={{ color: recoveryColors[today.color] }}
              >
                {today.recovery_score}%
              </span>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold uppercase"
                style={{
                  color: recoveryColors[today.color],
                  backgroundColor: `${recoveryColors[today.color]}20`,
                }}
              >
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
                <div key={stat.label} className="rounded-lg bg-[#0a0a0a] p-3">
                  <p className="text-xs text-[#a3a3a3]">{stat.label}</p>
                  <p className="text-sm font-bold mt-0.5">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recovery Insight */}
          <div className="rounded-2xl border border-[#262626] bg-[#171717] p-5 mb-6">
            <h2 className="text-xs font-medium uppercase tracking-wider text-red-500 mb-3">Coach&apos;s Take</h2>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              {today.color === 'green'
                ? `Recovery at ${today.recovery_score}% — you're primed. HRV of ${today.hrv}ms shows strong parasympathetic tone. Go after it today. Full volume, chase progressive overload.`
                : today.color === 'yellow'
                ? `Recovery at ${today.recovery_score}% — moderate zone. HRV of ${today.hrv}ms suggests your nervous system is still processing. Train today but drop volume ~30%. Focus on technique and moderate loads.`
                : `Recovery at ${today.recovery_score}% — your body is asking for rest. HRV of ${today.hrv}ms is suppressed. Today: mobility work, light cardio, stretching. No heavy loading. Sleep is your priority tonight.`}
            </p>
          </div>

          {/* Recovery Chart */}
          <div className="rounded-2xl border border-[#262626] bg-[#171717] p-5 mb-6">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#a3a3a3] mb-4">7-Day Recovery</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={recoveryChartData}>
                <XAxis dataKey="date" tick={{ fill: '#a3a3a3', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#a3a3a3', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a3a3a3' }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="#dc2626">
                  {recoveryChartData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sleep Chart */}
          <div className="rounded-2xl border border-[#262626] bg-[#171717] p-5 mb-6">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#a3a3a3] mb-4">Sleep Duration (hrs)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sleep}>
                <XAxis dataKey="date" tick={{ fill: '#a3a3a3', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: '#a3a3a3', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a3a3a3' }}
                />
                <Bar dataKey="deep" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Deep" />
                <Bar dataKey="rem" stackId="a" fill="#8b5cf6" name="REM" />
                <Bar dataKey="light" stackId="a" fill="#6b7280" radius={[4, 4, 0, 0]} name="Light" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-center">
              {[
                { label: 'Deep', color: '#3b82f6' },
                { label: 'REM', color: '#8b5cf6' },
                { label: 'Light', color: '#6b7280' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-[#a3a3a3]">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Strain Chart */}
          <div className="rounded-2xl border border-[#262626] bg-[#171717] p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#a3a3a3] mb-4">Daily Strain</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={strain}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" tick={{ fill: '#a3a3a3', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 21]} tick={{ fill: '#a3a3a3', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a3a3a3' }}
                />
                <Line type="monotone" dataKey="strain" stroke="#dc2626" strokeWidth={2} dot={{ fill: '#dc2626', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Data Source Note */}
          {dataSource === 'mock' && (
            <p className="text-center text-xs text-[#a3a3a3] mt-6">
              Showing demo data. Connect your WHOOP to see real metrics.
            </p>
          )}
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function WhoopPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 size={32} className="animate-spin text-red-500" /></div>}>
      <WhoopPageInner />
    </Suspense>
  );
}

'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { MOCK_WHOOP_DATA } from '@/lib/whoop-data';
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

export default function WhoopPage() {
  const { today, recovery, sleep, strain } = MOCK_WHOOP_DATA;

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
        <span className="ml-auto text-xs text-[#a3a3a3]">WHOOP Data</span>
      </div>

      {/* Today's Stats */}
      <div className="px-4 py-6">
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
      </div>

      <Navigation />
    </div>
  );
}

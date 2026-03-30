'use client';

import Link from 'next/link';
import { Clock, ChevronRight, Zap, Activity, MessageSquare } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { DAYS } from '@/lib/workout-data';
import { MOCK_WHOOP_DATA } from '@/lib/whoop-data';

const recoveryColor = {
  green: 'text-green-500 bg-green-500/10 border-green-500/30',
  yellow: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
  red: 'text-red-500 bg-red-500/10 border-red-500/30',
};

export default function HomePage() {
  const today = MOCK_WHOOP_DATA.today;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">
          ELITE <span className="text-red-500">COACH</span>
        </h1>
        <p className="mt-1 text-sm text-[#a3a3a3]">Your AI performance coach</p>
      </div>

      {/* Recovery Banner */}
      <div className="px-4 mb-6">
        <Link href="/whoop">
          <div className={`rounded-2xl border p-4 ${recoveryColor[today.color]} flex items-center justify-between`}>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">Today&apos;s Recovery</p>
              <p className="text-3xl font-bold mt-1">{today.recovery_score}%</p>
              <div className="flex gap-4 mt-2 text-xs opacity-80">
                <span>HR {today.resting_hr} bpm</span>
                <span>HRV {today.hrv} ms</span>
              </div>
            </div>
            <Activity size={40} className="opacity-40" />
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6 flex gap-3">
        <Link href="/chat" className="flex-1">
          <div className="rounded-xl bg-red-600 p-4 flex items-center gap-3 hover:bg-red-700 transition-colors">
            <MessageSquare size={20} />
            <span className="font-semibold text-sm">Ask Coach</span>
          </div>
        </Link>
        <Link href="/program" className="flex-1">
          <div className="rounded-xl bg-[#171717] border border-[#262626] p-4 flex items-center gap-3 hover:border-red-600/50 transition-colors">
            <Zap size={20} className="text-red-500" />
            <span className="font-semibold text-sm">My Program</span>
          </div>
        </Link>
      </div>

      {/* Workout Days */}
      <div className="px-4">
        <h2 className="text-lg font-bold mb-3">This Week</h2>
        <div className="space-y-3">
          {DAYS.map((day) => (
            <Link key={day.id} href={`/chat?topic=day${day.id}`}>
              <div className="flex items-center gap-4 rounded-xl bg-[#171717] border border-[#262626] p-4 hover:border-red-600/30 transition-colors">
                <span className="text-2xl">{day.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{day.name}</p>
                  <p className="text-xs text-[#a3a3a3] truncate">{day.subtitle}</p>
                </div>
                <div className="flex items-center gap-2 text-[#a3a3a3]">
                  <Clock size={14} />
                  <span className="text-xs">{day.time}</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Navigation />
    </div>
  );
}

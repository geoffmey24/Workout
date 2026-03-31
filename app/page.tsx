'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ChevronRight, Zap, Activity, MessageSquare, Flame, Trophy, Calendar } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { DAYS } from '@/lib/workout-data';
import { MOCK_WHOOP_DATA } from '@/lib/whoop-data';
import { getWorkoutStats, getWeeklyStats } from '@/lib/workout-stats';

const recoveryColor = {
  green: 'text-green-600 bg-green-50 border-green-200',
  yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  red: 'text-red-600 bg-red-50 border-red-200',
};

export default function HomePage() {
  const today = MOCK_WHOOP_DATA.today;
  const [stats, setStats] = useState<{ streak: number; totalWorkouts: number; longestStreak: number } | null>(null);
  const [weekly, setWeekly] = useState({ workoutsThisWeek: 0, daysActive: 0 });

  useEffect(() => {
    setStats(getWorkoutStats());
    setWeekly(getWeeklyStats());
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
          ELITE <span className="text-blue-600">COACH</span>
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">Your AI performance coach</p>
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
            <Activity size={40} className="opacity-30" />
          </div>
        </Link>
      </div>

      {/* Weekly Stats */}
      {stats && (
        <div className="px-4 mb-6 flex gap-3">
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <Flame size={16} className="mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold text-[#111827]">{stats.streak}</p>
            <p className="text-[10px] text-[#6b7280] uppercase">Day Streak</p>
          </div>
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <Calendar size={16} className="mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold text-[#111827]">{weekly.daysActive}<span className="text-xs text-[#6b7280]">/{DAYS.length}</span></p>
            <p className="text-[10px] text-[#6b7280] uppercase">This Week</p>
          </div>
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <Trophy size={16} className="mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold text-[#111827]">{stats.totalWorkouts}</p>
            <p className="text-[10px] text-[#6b7280] uppercase">Total</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 mb-6 flex gap-3">
        <Link href="/chat" className="flex-1">
          <div className="rounded-xl bg-blue-600 p-4 flex items-center gap-3 text-white hover:bg-blue-700 transition-colors shadow-sm">
            <MessageSquare size={20} />
            <span className="font-semibold text-sm">Ask Coach</span>
          </div>
        </Link>
        <Link href="/program" className="flex-1">
          <div className="rounded-xl bg-white border border-[#e5e7eb] p-4 flex items-center gap-3 hover:border-blue-300 transition-colors shadow-sm">
            <Zap size={20} className="text-blue-600" />
            <span className="font-semibold text-sm text-[#111827]">My Program</span>
          </div>
        </Link>
      </div>

      {/* Coach's Daily Insight */}
      <div className="px-4 mb-6">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600 mb-2">Coach&apos;s Insight</p>
          <p className="text-sm text-[#6b7280] leading-relaxed">
            {today.color === 'green'
              ? "Recovery is green — your nervous system is primed for intensity. Don't waste a good day. Attack your compound lifts and push progressive overload."
              : today.color === 'yellow'
              ? "Moderate recovery today. Train smart: keep the intensity but drop total volume by ~30%. Focus on quality reps over quantity."
              : "Your body is asking for recovery. Light movement only — mobility work, stretching, easy walk. The gains happen when you rest as hard as you train."}
          </p>
          <Link href="/chat" className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-500 font-medium">
            Ask coach for more details &rarr;
          </Link>
        </div>
      </div>

      {/* Workout Days */}
      <div className="px-4">
        <h2 className="text-lg font-bold mb-3 text-[#111827]">This Week</h2>
        <div className="space-y-3">
          {DAYS.map((day) => (
            <Link key={day.id} href={`/chat?topic=day${day.id}`}>
              <div className="flex items-center gap-4 rounded-xl bg-white border border-[#e5e7eb] p-4 hover:border-blue-300 transition-colors shadow-sm">
                <span className="text-2xl">{day.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#111827]">{day.name}</p>
                  <p className="text-xs text-[#6b7280] truncate">{day.subtitle}</p>
                </div>
                <div className="flex items-center gap-2 text-[#9ca3af]">
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

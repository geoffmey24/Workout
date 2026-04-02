'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Zap, Flame, Trophy, Calendar, Play, Pause, RotateCcw, Timer, Dumbbell } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { getWorkoutStats, getWeeklyStats } from '@/lib/workout-stats';
import { getActiveProgram } from '@/lib/active-program';
import { SavedProgram } from '@/lib/program-history';

export default function HomePage() {
  const [stats, setStats] = useState<{ streak: number; totalWorkouts: number; longestStreak: number } | null>(null);
  const [weekly, setWeekly] = useState({ workoutsThisWeek: 0, daysActive: 0 });
  const [activeProgram, setActiveProgram] = useState<SavedProgram | null>(null);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'rest'>('stopwatch');
  const [restPreset, setRestPreset] = useState(90);

  useEffect(() => {
    setStats(getWorkoutStats());
    setWeekly(getWeeklyStats());
    setActiveProgram(getActiveProgram());
  }, []);

  // Timer tick
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (timerMode === 'rest' && prev <= 1) {
          setTimerRunning(false);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return timerMode === 'rest' ? prev - 1 : prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerMode]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const startRest = (preset: number) => {
    setTimerMode('rest');
    setRestPreset(preset);
    setTimerSeconds(preset);
    setTimerRunning(true);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(timerMode === 'rest' ? restPreset : 0);
  };

  const isTimerFinished = timerMode === 'rest' && timerSeconds === 0 && !timerRunning;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
          ELITE <span className="text-blue-600">COACH</span>
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">Your AI performance coach</p>
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
            <p className="text-lg font-bold text-[#111827]">{weekly.daysActive}</p>
            <p className="text-[10px] text-[#6b7280] uppercase">This Week</p>
          </div>
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <Trophy size={16} className="mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold text-[#111827]">{stats.totalWorkouts}</p>
            <p className="text-[10px] text-[#6b7280] uppercase">Total</p>
          </div>
        </div>
      )}

      {/* Workout Timer — prominent on home page */}
      <div className="px-4 mb-6">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer size={16} className="text-blue-600" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                {timerMode === 'rest' ? 'Rest Timer' : 'Workout Timer'}
              </h2>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => { setTimerMode('stopwatch'); setTimerSeconds(0); setTimerRunning(false); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${timerMode === 'stopwatch' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-[#6b7280]'}`}
              >
                Stopwatch
              </button>
              <button
                onClick={() => { setTimerMode('rest'); setTimerSeconds(restPreset); setTimerRunning(false); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${timerMode === 'rest' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-[#6b7280]'}`}
              >
                Rest
              </button>
            </div>
          </div>

          <div className={`text-center text-5xl font-mono font-extrabold mb-4 ${isTimerFinished ? 'text-green-600 animate-pulse' : 'text-[#111827]'}`}>
            {formatTime(timerSeconds)}
          </div>

          {isTimerFinished && (
            <p className="text-center text-sm text-green-600 mb-3 font-semibold">Time to work!</p>
          )}

          <div className="flex gap-2 justify-center mb-3">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              {timerRunning ? <Pause size={18} /> : <Play size={18} />}
              {timerRunning ? 'Pause' : 'Start Workout'}
            </button>
            <button
              onClick={resetTimer}
              className="rounded-xl bg-gray-100 p-3 hover:bg-gray-200 transition-colors text-[#6b7280]"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {timerMode === 'rest' && (
            <div className="flex gap-2 justify-center">
              {[30, 60, 90, 120, 180].map((s) => (
                <button
                  key={s}
                  onClick={() => startRest(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    restPreset === s && !timerRunning ? 'bg-blue-600 text-white' : 'bg-gray-100 text-[#6b7280] hover:bg-gray-200'
                  }`}
                >
                  {s < 60 ? `${s}s` : `${s / 60}m`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6 flex gap-3">
        <Link href="/chat" className="flex-1">
          <div className="rounded-xl bg-blue-600 p-4 flex items-center gap-3 text-white hover:bg-blue-700 transition-colors shadow-sm">
            <MessageSquare size={20} />
            <span className="font-semibold text-sm">Talk to Coach</span>
          </div>
        </Link>
        <Link href="/program" className="flex-1">
          <div className="rounded-xl bg-white border border-[#e5e7eb] p-4 flex items-center gap-3 hover:border-blue-300 transition-colors shadow-sm">
            <Zap size={20} className="text-blue-600" />
            <span className="font-semibold text-sm text-[#111827]">My Program</span>
          </div>
        </Link>
      </div>

      {/* Active Program or Create Prompt */}
      <div className="px-4 mb-6">
        {activeProgram ? (
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium uppercase tracking-wider text-blue-600">Active Program</h2>
              <Link href="/progress" className="text-xs text-blue-600 font-medium">Track Progress &rarr;</Link>
            </div>
            <p className="font-bold text-sm text-[#111827] mb-1">{activeProgram.title}</p>
            <p className="text-xs text-[#6b7280] line-clamp-3 leading-relaxed">
              {activeProgram.content.slice(0, 200)}...
            </p>
            <Link href="/progress" className="inline-block mt-3 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              Start Workout
            </Link>
          </div>
        ) : (
          <Link href="/program">
            <div className="rounded-2xl border-2 border-dashed border-[#d1d5db] bg-white p-8 text-center hover:border-blue-300 transition-colors">
              <Dumbbell size={40} className="mx-auto text-gray-300 mb-3" />
              <h2 className="text-lg font-bold text-[#111827] mb-1">Create Your First Program</h2>
              <p className="text-sm text-[#6b7280]">
                Generate a personalized training plan or add your existing workout to get started.
              </p>
            </div>
          </Link>
        )}
      </div>

      <Navigation />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Zap, Flame, Trophy, Calendar, Play, Pause, RotateCcw, Timer, Dumbbell, Heart, SkipForward, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ProgramMarkdown from '@/components/ProgramMarkdown';
import { useAuth } from '@/components/AuthProvider';
import { dbGetWorkoutStats, dbGetWeeklyStats, dbGetActiveProgram, dbDeleteProgram, DbWorkoutStats } from '@/lib/db';
import { SavedProgram } from '@/lib/program-history';

interface ProgramDay {
  header: string;
  content: string;
  isRecovery: boolean;
}

function parseProgramDays(content: string): ProgramDay[] {
  const lines = content.split('\n');
  const days: ProgramDay[] = [];
  let currentHeader = '';
  let currentLines: string[] = [];

  const dayPattern = /^\*\*.*(?:day\s*\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;

  for (const line of lines) {
    if (dayPattern.test(line.trim())) {
      if (currentHeader) {
        const text = currentLines.join('\n').trim();
        const headerLower = currentHeader.toLowerCase();
        days.push({
          header: currentHeader.replace(/\*\*/g, '').trim(),
          content: `${currentHeader}\n${text}`,
          isRecovery: headerLower.includes('recovery') || headerLower.includes('rest day') || headerLower.includes('active rest'),
        });
      }
      currentHeader = line.trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  // Last day
  if (currentHeader) {
    const text = currentLines.join('\n').trim();
    const headerLower = currentHeader.toLowerCase();
    days.push({
      header: currentHeader.replace(/\*\*/g, '').trim(),
      content: `${currentHeader}\n${text}`,
      isRecovery: headerLower.includes('recovery') || headerLower.includes('rest day') || headerLower.includes('active rest'),
    });
  }
  return days;
}

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DbWorkoutStats | null>(null);
  const [weekly, setWeekly] = useState({ workoutsThisWeek: 0, daysActive: 0 });
  const [activeProgram, setActiveProgram] = useState<SavedProgram | null>(null);

  // Day selection
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [skippedDays, setSkippedDays] = useState<{ day: string; date: string }[]>([]);
  const [showDayContent, setShowDayContent] = useState(false);
  const [confirmDeleteProgram, setConfirmDeleteProgram] = useState(false);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'rest'>('stopwatch');
  const [restPreset, setRestPreset] = useState(90);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const s = await dbGetWorkoutStats(user.id);
      setStats(s);
      setWeekly(dbGetWeeklyStats(s));
      setActiveProgram(await dbGetActiveProgram(user.id));
    })();
  }, [user]);

  // Load skipped days from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('elite-coach-skipped-days');
      if (saved) setSkippedDays(JSON.parse(saved));
    } catch { /* ignore */ }
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

  // Parse program days
  const programDays = activeProgram ? parseProgramDays(activeProgram.content) : [];
  const selectedDay = programDays[selectedDayIdx] || null;

  // Default to first non-recovery day
  useEffect(() => {
    if (programDays.length > 0 && selectedDayIdx === 0) {
      const firstTraining = programDays.findIndex(d => !d.isRecovery);
      if (firstTraining > 0) setSelectedDayIdx(firstTraining);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProgram]);

  const handleSkipDay = () => {
    if (!selectedDay) return;
    const today = new Date().toISOString().slice(0, 10);
    const newSkipped = [...skippedDays, { day: selectedDay.header, date: today }].slice(-20);
    setSkippedDays(newSkipped);
    localStorage.setItem('elite-coach-skipped-days', JSON.stringify(newSkipped));
    // Don't advance — keep showing the same day so they do it next time
  };

  const handleDeleteActiveProgram = async () => {
    if (!activeProgram) return;
    await dbDeleteProgram(activeProgram.id);
    setActiveProgram(null);
    setConfirmDeleteProgram(false);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Delete confirmation dialog */}
      {confirmDeleteProgram && activeProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-lg text-[#111827] mb-2">Delete Program?</h3>
            <p className="text-sm text-[#6b7280] mb-1">
              Are you sure you want to delete <strong>{activeProgram.title}</strong>?
            </p>
            <p className="text-xs text-[#9ca3af] mb-6">This can&apos;t be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteProgram(false)} className="flex-1 rounded-xl border border-[#e5e7eb] py-2.5 text-sm font-medium text-[#6b7280] hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDeleteActiveProgram} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
          ELITE <span className="text-blue-600">COACH</span>
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">Your AI performance coach</p>
      </div>

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

      {/* Workout Timer */}
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
              <button onClick={() => { setTimerMode('stopwatch'); setTimerSeconds(0); setTimerRunning(false); }} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${timerMode === 'stopwatch' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-[#6b7280]'}`}>Stopwatch</button>
              <button onClick={() => { setTimerMode('rest'); setTimerSeconds(restPreset); setTimerRunning(false); }} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${timerMode === 'rest' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-[#6b7280]'}`}>Rest</button>
            </div>
          </div>
          <div className={`text-center text-5xl font-mono font-extrabold mb-4 ${isTimerFinished ? 'text-green-600 animate-pulse' : 'text-[#111827]'}`}>{formatTime(timerSeconds)}</div>
          {isTimerFinished && <p className="text-center text-sm text-green-600 mb-3 font-semibold">Time to work!</p>}
          <div className="flex gap-2 justify-center mb-3">
            <button onClick={() => setTimerRunning(!timerRunning)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              {timerRunning ? <Pause size={18} /> : <Play size={18} />} {timerRunning ? 'Pause' : 'Start Workout'}
            </button>
            <button onClick={resetTimer} className="rounded-xl bg-gray-100 p-3 hover:bg-gray-200 transition-colors text-[#6b7280]"><RotateCcw size={18} /></button>
          </div>
          {timerMode === 'rest' && (
            <div className="flex gap-2 justify-center">
              {[30, 60, 90, 120, 180].map((s) => (
                <button key={s} onClick={() => startRest(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${restPreset === s && !timerRunning ? 'bg-blue-600 text-white' : 'bg-gray-100 text-[#6b7280] hover:bg-gray-200'}`}>
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

      {/* Active Program with Day Selection */}
      <div className="px-4 mb-6">
        {activeProgram && programDays.length > 0 ? (
          <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-sm overflow-hidden">
            {/* Day selector */}
            <div className="p-4 border-b border-[#e5e7eb]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-medium uppercase tracking-wider text-blue-600">
                  {selectedDay?.isRecovery ? "Today's Recovery" : "Today's Workout"}
                </h2>
                <div className="flex items-center gap-3">
                  <Link href="/progress" className="text-xs text-blue-600 font-medium">Track Progress &rarr;</Link>
                  <button onClick={() => setConfirmDeleteProgram(true)} className="text-[#9ca3af] hover:text-red-500 transition-colors" title="Delete program"><Trash2 size={14} /></button>
                </div>
              </div>

              {/* Selected day display */}
              <button
                onClick={() => setDayPickerOpen(!dayPickerOpen)}
                className="w-full flex items-center justify-between rounded-xl bg-[#f8f9fa] border border-[#e5e7eb] px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  {selectedDay?.isRecovery ? (
                    <Heart size={16} className="text-green-600" />
                  ) : (
                    <Dumbbell size={16} className="text-blue-600" />
                  )}
                  <span className="font-semibold text-sm text-[#111827]">{selectedDay?.header}</span>
                </div>
                {dayPickerOpen ? <ChevronUp size={16} className="text-[#6b7280]" /> : <ChevronDown size={16} className="text-[#6b7280]" />}
              </button>

              {/* Day picker dropdown */}
              {dayPickerOpen && (
                <div className="mt-2 space-y-1">
                  {programDays.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedDayIdx(idx); setDayPickerOpen(false); setShowDayContent(false); }}
                      className={`w-full text-left rounded-lg px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                        idx === selectedDayIdx
                          ? 'bg-blue-600 text-white'
                          : day.isRecovery
                          ? 'bg-green-50 text-[#111827] hover:bg-green-100'
                          : 'bg-white text-[#111827] hover:bg-gray-50'
                      }`}
                    >
                      {day.isRecovery ? <Heart size={14} /> : <Dumbbell size={14} />}
                      <span className="font-medium">{day.header}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDayContent(!showDayContent)}
                  className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
                    selectedDay?.isRecovery ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {showDayContent ? 'Hide Details' : selectedDay?.isRecovery ? 'View Recovery' : 'View Workout'}
                </button>
                <button
                  onClick={handleSkipDay}
                  className="rounded-xl border border-[#e5e7eb] px-4 py-2.5 text-sm font-medium text-[#6b7280] hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                  title="Skip this day"
                >
                  <SkipForward size={16} /> Skip
                </button>
              </div>

              {/* Full day content */}
              {showDayContent && selectedDay && (
                <div className="mt-4 pt-4 border-t border-[#e5e7eb]">
                  <ProgramMarkdown content={selectedDay.content} />
                </div>
              )}
            </div>
          </div>
        ) : activeProgram ? (
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <h2 className="text-xs font-medium uppercase tracking-wider text-blue-600 mb-3">Active Program</h2>
            <p className="font-bold text-sm text-[#111827] mb-1">{activeProgram.title}</p>
            <p className="text-xs text-[#6b7280] line-clamp-3 leading-relaxed">{activeProgram.content.slice(0, 200)}...</p>
            <Link href="/progress" className="inline-block mt-3 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">Start Workout</Link>
          </div>
        ) : (
          <Link href="/program">
            <div className="rounded-2xl border-2 border-dashed border-[#d1d5db] bg-white p-8 text-center hover:border-blue-300 transition-colors">
              <Dumbbell size={40} className="mx-auto text-gray-300 mb-3" />
              <h2 className="text-lg font-bold text-[#111827] mb-1">Create Your First Program</h2>
              <p className="text-sm text-[#6b7280]">Generate a personalized training plan or add your existing workout to get started.</p>
            </div>
          </Link>
        )}
      </div>

      {/* Skipped Days Log */}
      {skippedDays.length > 0 && (
        <div className="px-4 mb-6">
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
            <h3 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-2">Skipped Workouts</h3>
            <div className="space-y-1">
              {skippedDays.slice(-5).reverse().map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-[#6b7280]">{s.day}</span>
                  <span className="text-[#9ca3af]">{new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}

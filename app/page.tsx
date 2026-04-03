'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Zap, Flame, Trophy, Calendar, Play, Pause, RotateCcw, Timer, Dumbbell, Heart, SkipForward, Trash2, TrendingUp, Scale, Plus } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ProgramMarkdown from '@/components/ProgramMarkdown';
import { useAuth } from '@/components/AuthProvider';
import { dbGetWorkoutStats, dbGetWeeklyStats, dbGetActiveProgram, dbDeleteProgram, DbWorkoutStats, dbGetUserProfile, dbSaveUserProfile, UserProfile, dbGetDarkMode, dbGetBodyStats, dbSaveBodyStat, BodyStatEntry } from '@/lib/db';
import { SavedProgram } from '@/lib/program-history';

interface ProgramDay {
  header: string;
  content: string;
  isRecovery: boolean;
}

function cleanDayLabel(raw: string): string {
  // Remove markdown: **, ##, etc.
  let label = raw.replace(/\*\*/g, '').replace(/^#{1,3}\s*/, '').trim();
  // Remove "Day X —" or "Day X:" prefix to get the training label
  const dayMatch = label.match(/^(?:day\s*\d+\s*[:\u2014\u2013\-]\s*)(.*)/i);
  if (dayMatch && dayMatch[1]) return dayMatch[1].trim();
  // Remove weekday prefix: "Monday — Upper Body" -> "Upper Body"
  const weekdayMatch = label.match(/^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*[:\u2014\u2013\-]\s*(.*)/i);
  if (weekdayMatch && weekdayMatch[1]) return weekdayMatch[1].trim();
  return label;
}

function parseProgramDays(content: string): ProgramDay[] {
  const lines = content.split('\n');
  const days: ProgramDay[] = [];
  let currentHeader = '';
  let currentLines: string[] = [];

  const dayPattern = /^(?:\*\*|#{1,3}\s+\*{0,2}).*(?:day\s*\d|day\s+\w|monday|tuesday|wednesday|thursday|friday|saturday|sunday|week\s*\d|recovery|rest\s+day|active\s+rest)/i;
  // Skip metadata lines like "Schedule: 4 training days..."
  const metadataPattern = /^(?:\*\*|#{1,3}\s+\*{0,2})?\s*(?:schedule|overview|notes|progression|deload|weekly|program\s+summary)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip metadata headers
    if (metadataPattern.test(trimmed)) continue;
    if (dayPattern.test(trimmed)) {
      if (currentHeader) {
        const text = currentLines.join('\n').trim();
        const headerLower = currentHeader.toLowerCase();
        const label = cleanDayLabel(currentHeader);
        const isRecovery = headerLower.includes('recovery') || headerLower.includes('rest day') || headerLower.includes('active rest');
        days.push({
          header: label,
          content: `${currentHeader}\n${text}`,
          isRecovery,
        });
      }
      currentHeader = trimmed;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  // Last day
  if (currentHeader) {
    const text = currentLines.join('\n').trim();
    const headerLower = currentHeader.toLowerCase();
    const label = cleanDayLabel(currentHeader);
    const isRecovery = headerLower.includes('recovery') || headerLower.includes('rest day') || headerLower.includes('active rest');
    days.push({
      header: label,
      content: `${currentHeader}\n${text}`,
      isRecovery,
    });
  }

  // Number the days: "Day 1: Upper Body", "Day 2: Lower Body"
  return days.map((day, idx) => ({
    ...day,
    header: `Day ${idx + 1}: ${day.header}`,
  }));
}

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DbWorkoutStats | null>(null);
  const [weekly, setWeekly] = useState({ workoutsThisWeek: 0, daysActive: 0 });
  const [activeProgram, setActiveProgram] = useState<SavedProgram | null>(null);

  // Onboarding
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [onboardingName, setOnboardingName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Day selection
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [skippedDays, setSkippedDays] = useState<{ day: string; date: string }[]>([]);
  const [showDayContent, setShowDayContent] = useState(false);
  const [confirmDeleteProgram, setConfirmDeleteProgram] = useState(false);

  // Body stats quick input
  const [bodyStatsEntries, setBodyStatsEntries] = useState<BodyStatEntry[]>([]);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [quickWeight, setQuickWeight] = useState('');
  const [quickBf, setQuickBf] = useState('');

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
      // Check onboarding
      const p = dbGetUserProfile();
      setProfile(p);
      if (!p || !p.onboardingComplete) setShowOnboarding(true);
      setBodyStatsEntries(dbGetBodyStats());
      // Apply dark mode
      const dark = dbGetDarkMode();
      document.documentElement.classList.toggle('dark', dark);
    })();
  }, [user]);

  const handleOnboardingComplete = () => {
    const name = onboardingName.trim() || 'Athlete';
    const p: UserProfile = { name, onboardingComplete: true };
    dbSaveUserProfile(p);
    setProfile(p);
    setShowOnboarding(false);
  };

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
  if (activeProgram && programDays.length === 0) {
    console.log('[HomePage] parseProgramDays returned 0 days. Program content preview:', activeProgram.content.slice(0, 500));
  }
  const selectedDay = programDays[selectedDayIdx] || programDays[0] || null;

  // Restore selected day from localStorage, or default to first non-recovery day
  useEffect(() => {
    if (programDays.length === 0) return;
    try {
      const savedIdx = localStorage.getItem('elite-coach-selected-day-idx');
      if (savedIdx !== null) {
        const idx = parseInt(savedIdx, 10);
        if (idx >= 0 && idx < programDays.length) {
          setSelectedDayIdx(idx);
          return;
        }
      }
    } catch { /* ignore */ }
    const firstTraining = programDays.findIndex(d => !d.isRecovery);
    if (firstTraining > 0) setSelectedDayIdx(firstTraining);
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
    console.log('[HomePage] deleting active program:', activeProgram.id, activeProgram.title);
    await dbDeleteProgram(activeProgram.id);
    console.log('[HomePage] delete complete, clearing UI');
    setActiveProgram(null);
    setShowDayContent(false);
    setSelectedDayIdx(0);
    setConfirmDeleteProgram(false);
    try { localStorage.removeItem('elite-coach-selected-day-idx'); } catch {}
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Onboarding */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <Dumbbell size={40} className="mx-auto text-blue-600 mb-3" />
            <h2 className="text-xl font-bold text-[#111827] mb-1">Welcome to ELITE COACH</h2>
            <p className="text-sm text-[#6b7280] mb-6">Let&apos;s set up your profile</p>
            <div className="mb-4">
              <label className="text-xs text-[#6b7280] text-left block mb-1">What&apos;s your name?</label>
              <input
                value={onboardingName}
                onChange={e => setOnboardingName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOnboardingComplete()}
                placeholder="Your name"
                className="w-full rounded-xl border border-[#e5e7eb] px-4 py-3 text-sm text-center"
                autoFocus
              />
            </div>
            <button onClick={handleOnboardingComplete} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      )}

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
        {profile?.name && (
          <p className="mt-1 text-sm text-[#6b7280]">Welcome back, {profile.name}</p>
        )}
      </div>

      {stats && stats.totalWorkouts > 0 && (
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

      {/* Weekly Summary */}
      {stats && stats.totalWorkouts > 0 && activeProgram && (
        <div className="px-4 mb-4">
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-blue-600" />
              <span className="text-xs font-medium text-blue-800 uppercase tracking-wider">This Week</span>
            </div>
            <p className="text-sm text-blue-900">
              <strong>{weekly.daysActive}</strong> workout{weekly.daysActive !== 1 ? 's' : ''} completed
              {parseInt(activeProgram.answers?.days || '0') > 0 && (
                <span> of <strong>{activeProgram.answers.days}</strong> planned</span>
              )}
              {stats.streak > 1 && (
                <span className="block mt-1 text-xs text-blue-700">{stats.streak}-day streak going strong!</span>
              )}
            </p>
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
            {/* Program title */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wider text-blue-600">
                {activeProgram.title}
              </h2>
              <Link href="/progress" className="text-xs text-blue-600 font-medium">Track Progress &rarr;</Link>
            </div>

            {/* Horizontal scrollable day picker */}
            <div className="px-4 pb-3 overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-1">
                {programDays.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDayIdx(idx);
                      setShowDayContent(true);
                      try { localStorage.setItem('elite-coach-selected-day-idx', String(idx)); } catch {}
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                      idx === selectedDayIdx
                        ? day.isRecovery ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                        : day.isRecovery
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-[#6b7280] border border-[#e5e7eb]'
                    }`}
                  >
                    {day.isRecovery ? <Heart size={12} /> : <Dumbbell size={12} />}
                    {day.header}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected day content */}
            <div className="px-4 pb-4 border-t border-[#e5e7eb]">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  {selectedDay?.isRecovery ? <Heart size={16} className="text-green-600" /> : <Dumbbell size={16} className="text-blue-600" />}
                  <span className="font-semibold text-sm text-[#111827]">{selectedDay?.header}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDayContent(!showDayContent)}
                    className="text-xs text-blue-600 font-medium"
                  >
                    {showDayContent ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={handleSkipDay}
                    className="text-xs text-[#6b7280] font-medium flex items-center gap-1"
                    title="Skip this day"
                  >
                    <SkipForward size={12} /> Skip
                  </button>
                </div>
              </div>

              {showDayContent && selectedDay && (
                <div className="pt-2 border-t border-[#e5e7eb]">
                  <ProgramMarkdown content={selectedDay.content} />
                </div>
              )}

              {/* Delete program button */}
              <button
                onClick={() => setConfirmDeleteProgram(true)}
                className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Delete Program
              </button>
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

      {/* Body Stats Quick Section */}
      <div className="px-4 mb-6">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-blue-600" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">Body Stats</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowWeightInput(!showWeightInput)} className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                <Plus size={14} />
              </button>
              <Link href="/body-stats" className="text-xs text-blue-600 font-medium">View All</Link>
            </div>
          </div>

          {/* Quick weight input */}
          {showWeightInput && (
            <div className="mb-3 flex gap-2">
              <input type="number" step="0.1" value={quickWeight} onChange={e => setQuickWeight(e.target.value)} placeholder="Weight (lbs)" className="flex-1 rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
              <input type="number" step="0.1" value={quickBf} onChange={e => setQuickBf(e.target.value)} placeholder="BF %" className="w-20 rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
              <button
                onClick={() => {
                  if (!quickWeight && !quickBf) return;
                  dbSaveBodyStat({
                    date: new Date().toISOString().slice(0, 10),
                    weight: quickWeight ? parseFloat(quickWeight) : undefined,
                    bodyFat: quickBf ? parseFloat(quickBf) : undefined,
                  });
                  setBodyStatsEntries(dbGetBodyStats());
                  setQuickWeight(''); setQuickBf(''); setShowWeightInput(false);
                }}
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          )}

          {/* Latest stats display */}
          {bodyStatsEntries.length > 0 ? (
            <div className="flex gap-4 text-sm">
              {(() => {
                const latest = bodyStatsEntries[bodyStatsEntries.length - 1];
                const prev = bodyStatsEntries.length > 1 ? bodyStatsEntries[bodyStatsEntries.length - 2] : null;
                const weightChange = latest.weight && prev?.weight ? latest.weight - prev.weight : null;
                return (
                  <>
                    {latest.weight && (
                      <div>
                        <span className="text-[#6b7280] text-xs">Weight</span>
                        <p className="font-bold text-[#111827]">
                          {latest.weight} lbs
                          {weightChange !== null && (
                            <span className={`ml-1 text-xs font-medium ${weightChange > 0 ? 'text-orange-600' : weightChange < 0 ? 'text-green-600' : 'text-[#6b7280]'}`}>
                              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    {latest.bodyFat && (
                      <div>
                        <span className="text-[#6b7280] text-xs">Body Fat</span>
                        <p className="font-bold text-[#111827]">{latest.bodyFat}%</p>
                      </div>
                    )}
                    <div className="ml-auto text-right">
                      <span className="text-[#9ca3af] text-[10px]">{new Date(latest.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <p className="text-xs text-[#9ca3af]">Tap + to log your weight and body fat</p>
          )}
        </div>
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Zap, Flame, Trophy, Calendar, Play, Pause, RotateCcw, Timer, Dumbbell, Heart, SkipForward, Trash2, TrendingUp, Scale, Plus, Check } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ProgramMarkdown from '@/components/ProgramMarkdown';
import { useAuth } from '@/components/AuthProvider';
import { dbGetUserProfile, dbSaveUserProfile, UserProfile, dbGetDarkMode, dbGetBodyStats, dbSaveBodyStat, BodyStatEntry } from '@/lib/db';

// Direct localStorage keys — same as program page
const EC_PROGRAMS_KEY = 'ec_saved_programs';
const EC_ACTIVE_KEY = 'ec_active_program_id';
const EC_WORKOUT_LOGS_KEY = 'ec_workout_logs';
const EC_COMPLETIONS_KEY = 'ec_workout_completions';

interface SavedProgram {
  id: string;
  title: string;
  answers: Record<string, string>;
  content: string;
  createdAt: number;
}

interface WorkoutLogEntry {
  exerciseName: string;
  weight: number;
  reps: number;
  sets: number;
  date: string;
  estimated1RM: number;
}

interface WorkoutCompletion {
  date: string;
  dayName: string;
  timestamp: number;
}

function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

function lsGetActiveProgram(): SavedProgram | null {
  try {
    const activeId = localStorage.getItem(EC_ACTIVE_KEY);
    if (!activeId) return null;
    const raw = localStorage.getItem(EC_PROGRAMS_KEY);
    if (!raw) return null;
    const programs = JSON.parse(raw) as SavedProgram[];
    return programs.find(p => p.id === activeId) || null;
  } catch { return null; }
}

function lsGetWorkoutLogs(): WorkoutLogEntry[] {
  try {
    const raw = localStorage.getItem(EC_WORKOUT_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function lsSaveWorkoutLog(entry: WorkoutLogEntry): void {
  try {
    const logs = lsGetWorkoutLogs();
    logs.push(entry);
    localStorage.setItem(EC_WORKOUT_LOGS_KEY, JSON.stringify(logs.slice(-500)));
  } catch { /* ignore */ }
}

function lsGetLastLog(exerciseName: string): WorkoutLogEntry | null {
  const logs = lsGetWorkoutLogs();
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].exerciseName.toLowerCase() === exerciseName.toLowerCase()) return logs[i];
  }
  return null;
}

function lsGetCompletions(): WorkoutCompletion[] {
  try {
    const raw = localStorage.getItem(EC_COMPLETIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function lsSaveCompletion(c: WorkoutCompletion): void {
  try {
    const completions = lsGetCompletions();
    completions.push(c);
    localStorage.setItem(EC_COMPLETIONS_KEY, JSON.stringify(completions.slice(-200)));
  } catch { /* ignore */ }
}

function getWeekCompletions(): WorkoutCompletion[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const mondayStr = monday.toISOString().slice(0, 10);
  return lsGetCompletions().filter(c => c.date >= mondayStr);
}

function getStreak(): number {
  const completions = lsGetCompletions();
  if (completions.length === 0) return 0;
  const dates = Array.from(new Set(completions.map(c => c.date))).sort().reverse();
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().slice(0, 10);
    if (dates.includes(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getWeekVolume(): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const mondayStr = monday.toISOString().slice(0, 10);
  const logs = lsGetWorkoutLogs().filter(l => l.date >= mondayStr);
  return logs.reduce((sum, l) => sum + (l.weight * l.reps * l.sets), 0);
}

function parseExercisesFromContent(content: string): { name: string; line: string }[] {
  const lines = content.split('\n');
  const exercises: { name: string; line: string }[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Pipe-separated: "Bench Press | 4 | 8 | 7-8 | 3 min"
    if (trimmed.includes('|') && !trimmed.startsWith('#')) {
      const parts = trimmed.split('|').map(p => p.trim());
      const name = parts[0].replace(/\*\*/g, '').trim();
      // Skip header rows
      if (['exercise', 'activity', 'movement', 'sets'].includes(name.toLowerCase())) continue;
      if (name.length > 2) exercises.push({ name, line: trimmed });
      continue;
    }
    // Numbered list: "1. Bench Press — 4 x 8 — RPE 7"
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+?)\s*[\u2014\u2013\-]\s+(.+)$/);
    if (numberedMatch) {
      const name = numberedMatch[1].replace(/\*\*/g, '').trim();
      if (name.length > 2) exercises.push({ name, line: trimmed });
      continue;
    }
    // Fallback: has sets notation
    if (/\d+\s*[xX\u00d7]\s*\d+/.test(trimmed) || /\d+\s*sets?/i.test(trimmed)) {
      const cleaned = trimmed.replace(/^[-*|]\s*/, '').replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim();
      const name = cleaned.split(/[|]|[\d]+\s*[xX\u00d7]/)[0].trim();
      if (name.length > 2) exercises.push({ name, line: cleaned });
    }
  }
  return exercises;
}

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
  const [activeProgram, setActiveProgram] = useState<SavedProgram | null>(null);
  const [streak, setStreak] = useState(0);
  const [weekCompletions, setWeekCompletions] = useState<WorkoutCompletion[]>([]);
  const [weekVolume, setWeekVolume] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);

  // Onboarding
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [onboardingName, setOnboardingName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Day selection
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [skippedDays, setSkippedDays] = useState<{ day: string; date: string }[]>([]);
  const [showDayContent, setShowDayContent] = useState(false);
  const [confirmDeleteProgram, setConfirmDeleteProgram] = useState(false);

  // Weight logging for today's exercises
  const [exerciseInputs, setExerciseInputs] = useState<Record<string, { weight: string; reps: string; sets: string }>>({});
  const [loggedExercises, setLoggedExercises] = useState<Set<string>>(new Set());

  // Workout completion
  const [workoutDone, setWorkoutDone] = useState(false);

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

  const refreshStats = () => {
    setStreak(getStreak());
    setWeekCompletions(getWeekCompletions());
    setWeekVolume(getWeekVolume());
    setTotalWorkouts(lsGetCompletions().length);
  };

  useEffect(() => {
    if (!user) return;
    setActiveProgram(lsGetActiveProgram());
    refreshStats();
    // Check onboarding
    const p = dbGetUserProfile();
    setProfile(p);
    if (!p || !p.onboardingComplete) setShowOnboarding(true);
    setBodyStatsEntries(dbGetBodyStats());
    // Apply dark mode
    const dark = dbGetDarkMode();
    document.documentElement.classList.toggle('dark', dark);
    // Check if today's workout is done
    const today = new Date().toISOString().slice(0, 10);
    const todayDone = lsGetCompletions().some(c => c.date === today);
    if (todayDone) setWorkoutDone(true);
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

  const handleDeleteActiveProgram = () => {
    if (!activeProgram) return;
    try {
      const raw = localStorage.getItem(EC_PROGRAMS_KEY);
      if (raw) {
        const programs = JSON.parse(raw) as SavedProgram[];
        localStorage.setItem(EC_PROGRAMS_KEY, JSON.stringify(programs.filter(p => p.id !== activeProgram.id)));
      }
      localStorage.removeItem(EC_ACTIVE_KEY);
      localStorage.removeItem('elite-coach-selected-day-idx');
    } catch { /* ignore */ }
    setActiveProgram(null);
    setShowDayContent(false);
    setSelectedDayIdx(0);
    setConfirmDeleteProgram(false);
  };

  const handleLogSet = (exerciseName: string) => {
    const key = exerciseName.toLowerCase();
    const input = exerciseInputs[key];
    if (!input?.weight || !input?.reps) return;
    const weight = parseFloat(input.weight);
    const reps = parseInt(input.reps);
    const sets = parseInt(input.sets) || 1;
    const est1RM = calculate1RM(weight, reps);
    lsSaveWorkoutLog({
      exerciseName,
      weight,
      reps,
      sets,
      date: new Date().toISOString().slice(0, 10),
      estimated1RM: est1RM,
    });
    setLoggedExercises(prev => { const s = new Set(Array.from(prev)); s.add(key); return s; });
    setExerciseInputs(prev => ({ ...prev, [key]: { weight: '', reps: '', sets: '' } }));
  };

  const handleCompleteWorkout = () => {
    const today = new Date().toISOString().slice(0, 10);
    lsSaveCompletion({ date: today, dayName: selectedDay?.header || 'Workout', timestamp: Date.now() });
    setWorkoutDone(true);
    refreshStats();
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

      {totalWorkouts > 0 && (
        <div className="px-4 mb-6 flex gap-3">
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <Flame size={16} className="mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold text-[#111827]">{streak}</p>
            <p className="text-[10px] text-[#6b7280] uppercase">Day Streak</p>
          </div>
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <Calendar size={16} className="mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold text-[#111827]">{weekCompletions.length}</p>
            <p className="text-[10px] text-[#6b7280] uppercase">This Week</p>
          </div>
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <Trophy size={16} className="mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold text-[#111827]">{totalWorkouts}</p>
            <p className="text-[10px] text-[#6b7280] uppercase">Total</p>
          </div>
        </div>
      )}

      {/* Weekly Check-In Summary */}
      {activeProgram && (
        <div className="px-4 mb-4">
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-blue-600" />
              <span className="text-xs font-medium text-blue-800 uppercase tracking-wider">Weekly Check-In</span>
            </div>
            <p className="text-sm text-blue-900">
              <strong>{weekCompletions.length}</strong> workout{weekCompletions.length !== 1 ? 's' : ''} completed
              {parseInt(activeProgram.answers?.days || '0') > 0 && (
                <span> of <strong>{activeProgram.answers.days}</strong> planned</span>
              )}
            </p>
            {weekVolume > 0 && (
              <p className="text-xs text-blue-700 mt-1">Total volume: {weekVolume.toLocaleString()} lbs this week</p>
            )}
            {bodyStatsEntries.length > 1 && (() => {
              const latest = bodyStatsEntries[bodyStatsEntries.length - 1];
              const prev = bodyStatsEntries[bodyStatsEntries.length - 2];
              if (latest.weight && prev.weight) {
                const change = latest.weight - prev.weight;
                return <p className="text-xs text-blue-700 mt-0.5">Body weight: {change > 0 ? '+' : ''}{change.toFixed(1)} lbs</p>;
              }
              return null;
            })()}
            {streak > 1 && (
              <p className="text-xs text-blue-700 mt-0.5">{streak}-day streak going strong!</p>
            )}
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

                  {/* Weight Logging for Exercises */}
                  {!selectedDay.isRecovery && (() => {
                    const exercises = parseExercisesFromContent(selectedDay.content);
                    if (exercises.length === 0) return null;
                    return (
                      <div className="mt-4 border-t border-[#e5e7eb] pt-3">
                        <h3 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-3">Log Your Sets</h3>
                        <div className="space-y-2">
                          {exercises.map((ex, idx) => {
                            const key = ex.name.toLowerCase();
                            const input = exerciseInputs[key] || { weight: '', reps: '', sets: '' };
                            const lastLog = lsGetLastLog(ex.name);
                            const isLogged = loggedExercises.has(key);
                            const currentWeight = parseFloat(input.weight);
                            const currentReps = parseInt(input.reps);
                            const current1RM = currentWeight > 0 && currentReps > 0 ? calculate1RM(currentWeight, currentReps) : 0;
                            const last1RM = lastLog ? calculate1RM(lastLog.weight, lastLog.reps) : 0;
                            const isNewPR = current1RM > 0 && current1RM > last1RM && last1RM > 0;

                            return (
                              <div key={idx} className={`rounded-lg border p-3 ${isLogged ? 'border-green-200 bg-green-50' : 'border-[#e5e7eb] bg-white'}`}>
                                <p className="font-medium text-sm text-[#111827] mb-1">{ex.name}</p>
                                {lastLog && (
                                  <p className="text-[10px] text-blue-600 mb-1">Last: {lastLog.weight}lbs x {lastLog.reps}r | Est. 1RM: {last1RM}lbs</p>
                                )}
                                {isLogged ? (
                                  <p className="text-xs text-green-600 font-medium flex items-center gap-1"><Check size={12} /> Logged!</p>
                                ) : (
                                  <>
                                    <div className="flex gap-1.5 mb-1">
                                      <input type="number" inputMode="decimal" placeholder="lbs" value={input.weight}
                                        onChange={e => setExerciseInputs(prev => ({ ...prev, [key]: { ...input, weight: e.target.value } }))}
                                        className="flex-1 rounded-lg border border-[#e5e7eb] px-2 py-2 text-sm text-center" />
                                      <input type="number" inputMode="numeric" placeholder="reps" value={input.reps}
                                        onChange={e => setExerciseInputs(prev => ({ ...prev, [key]: { ...input, reps: e.target.value } }))}
                                        className="w-16 rounded-lg border border-[#e5e7eb] px-2 py-2 text-sm text-center" />
                                      <input type="number" inputMode="numeric" placeholder="sets" value={input.sets}
                                        onChange={e => setExerciseInputs(prev => ({ ...prev, [key]: { ...input, sets: e.target.value } }))}
                                        className="w-16 rounded-lg border border-[#e5e7eb] px-2 py-2 text-sm text-center" />
                                      <button onClick={() => handleLogSet(ex.name)}
                                        disabled={!input.weight || !input.reps}
                                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                                        Log
                                      </button>
                                    </div>
                                    {current1RM > 0 && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-purple-600 font-medium">Est. 1RM: {current1RM} lbs</span>
                                        {isNewPR && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold animate-pulse">NEW PR!</span>}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Complete Workout Button */}
                        {!workoutDone ? (
                          <button onClick={handleCompleteWorkout}
                            className="w-full mt-3 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                            <Check size={18} /> Complete Workout
                          </button>
                        ) : (
                          <div className="mt-3 rounded-xl bg-green-50 border border-green-200 p-3 text-center">
                            <Trophy size={24} className="mx-auto text-yellow-500 mb-1" />
                            <p className="font-bold text-sm text-[#111827]">Workout Complete!</p>
                            <p className="text-xs text-[#6b7280]">Streak: {streak} day{streak !== 1 ? 's' : ''}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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

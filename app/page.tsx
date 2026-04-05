'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Zap, Flame, Trophy, Calendar, Play, Pause, RotateCcw, Timer, Dumbbell, Heart, SkipForward, Trash2, TrendingUp, Scale, Plus, Check, Settings as SettingsIcon } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ProgramMarkdown from '@/components/ProgramMarkdown';
import { useAuth } from '@/components/AuthProvider';
import {
  migrateOldData,
  StoredProgram, BodyStat, UserProfile, WorkoutLog,
  getActiveProgram, clearActiveProgram, deleteProgram,
  getWorkoutLogs, addWorkoutLog, getLastLog,
  getCompletions, recordWorkoutCompletion,
  getStreak, getWeekCompletionCount, getWeekVolume, isTodayCompleted,
  getBodyStats, saveBodyStat,
  getProfile, saveProfile,
  getDarkMode,
  getSkippedDays, addSkippedDay,
  getSelectedDayIdx, setSelectedDayIdx as storageSetSelectedDayIdx,
  calculate1RM,
  getEvent, getWeeksUntilEvent, clearEvent, TrainingEvent,
  getLatestRecovery, RecoveryData,
} from '@/lib/simple-storage';

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
  const [activeProgram, setActiveProgram] = useState<StoredProgram | null>(null);
  const [streak, setStreak] = useState(0);
  const [weekCompletionCount, setWeekCompletionCount] = useState(0);
  const [weekVolume, setWeekVolume] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);

  // Onboarding
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [onboardingName, setOnboardingName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Day selection
  const [selectedDayIdx, setSelectedDayIdxState] = useState(0);
  const [skippedDays, setSkippedDays] = useState<{ day: string; date: string }[]>([]);
  const [showDayContent, setShowDayContent] = useState(false);
  const [confirmDeleteProgram, setConfirmDeleteProgram] = useState(false);

  // Weight logging for today's exercises
  const [exerciseInputs, setExerciseInputs] = useState<Record<string, { weight: string; reps: string; sets: string }>>({});
  const [loggedExercises, setLoggedExercises] = useState<Set<string>>(new Set());

  // Workout completion
  const [workoutDone, setWorkoutDone] = useState(false);

  // Event countdown & recovery
  const [trainingEvent, setTrainingEvent] = useState<TrainingEvent | null>(null);
  const [weeksUntilEvent, setWeeksUntilEvent] = useState<number | null>(null);
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);

  // Body stats quick input
  const [bodyStatsEntries, setBodyStatsEntries] = useState<BodyStat[]>([]);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [quickWeight, setQuickWeight] = useState('');
  const [quickBf, setQuickBf] = useState('');

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'rest'>('stopwatch');
  const [restPreset, setRestPreset] = useState(90);
  const [timerExpanded, setTimerExpanded] = useState(false);

  const refreshStats = () => {
    setStreak(getStreak());
    setWeekCompletionCount(getWeekCompletionCount());
    setWeekVolume(getWeekVolume());
    setTotalWorkouts(getCompletions().length);
  };

  useEffect(() => {
    if (!user) return;
    migrateOldData();
    setActiveProgram(getActiveProgram());
    refreshStats();
    // Check onboarding
    const p = getProfile();
    setProfile(p);
    if (!p || !p.onboardingComplete) setShowOnboarding(true);
    setBodyStatsEntries(getBodyStats());
    // Apply dark mode
    const dark = getDarkMode();
    document.documentElement.classList.toggle('dark', dark);
    // Check if today's workout is done
    if (isTodayCompleted()) setWorkoutDone(true);
    // Event countdown
    const evt = getEvent();
    setTrainingEvent(evt);
    setWeeksUntilEvent(getWeeksUntilEvent());
    // Recovery data
    setRecoveryData(getLatestRecovery());
  }, [user]);

  const handleOnboardingComplete = () => {
    const name = onboardingName.trim() || 'Athlete';
    const existingProfile = getProfile();
    const p: UserProfile = {
      ...existingProfile,
      name,
      onboardingComplete: true,
      is_pro: existingProfile?.is_pro ?? false,
    };
    saveProfile(p);
    setProfile(p);
    setShowOnboarding(false);
  };

  // Load skipped days from simple-storage
  useEffect(() => {
    setSkippedDays(getSkippedDays());
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

  // Restore selected day from simple-storage, or default to first non-recovery day
  useEffect(() => {
    if (programDays.length === 0) return;
    const savedIdx = getSelectedDayIdx();
    if (savedIdx !== null && savedIdx >= 0 && savedIdx < programDays.length) {
      setSelectedDayIdxState(savedIdx);
      return;
    }
    const firstTraining = programDays.findIndex(d => !d.isRecovery);
    if (firstTraining > 0) setSelectedDayIdxState(firstTraining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProgram]);

  const handleSkipDay = () => {
    if (!selectedDay) return;
    addSkippedDay(selectedDay.header);
    setSkippedDays(getSkippedDays());
    // Don't advance — keep showing the same day so they do it next time
  };

  const handleDeleteActiveProgram = () => {
    if (!activeProgram) return;
    deleteProgram(activeProgram.id);
    clearActiveProgram();
    clearEvent();
    setActiveProgram(null);
    setShowDayContent(false);
    setSelectedDayIdxState(0);
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
    addWorkoutLog({
      exercise: exerciseName,
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
    recordWorkoutCompletion(selectedDay?.header || 'Workout');
    setWorkoutDone(true);
    refreshStats();
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Onboarding */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-[#1a1d24] rounded-2xl p-6 max-w-sm w-full text-center">
            <Dumbbell size={40} className="mx-auto text-[#a5b4fc] mb-3" />
            <h2 className="text-xl font-bold text-white mb-1">Welcome to ELITE COACH</h2>
            <p className="text-sm text-[#9ca3af] mb-6">What should I call you?</p>
            <div className="mb-6">
              <input
                value={onboardingName}
                onChange={e => setOnboardingName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOnboardingComplete()}
                placeholder="Your name"
                className="w-full rounded-xl border border-[#2a2d35] px-4 py-3 text-sm text-center"
                autoFocus
              />
            </div>
            <button onClick={handleOnboardingComplete} className="w-full rounded-xl bg-[#4f46e5] py-3 text-sm font-bold text-white hover:bg-[#3730a3] transition-colors">
              Let&apos;s Go
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDeleteProgram && activeProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-[#1a1d24] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg text-white mb-2">Delete Program?</h3>
            <p className="text-sm text-[#9ca3af] mb-1">
              Are you sure you want to delete <strong>{activeProgram.title}</strong>?
            </p>
            <p className="text-xs text-[#6b7280] mb-6">This can&apos;t be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteProgram(false)} className="flex-1 rounded-xl border border-[#2a2d35] py-2.5 text-sm font-medium text-[#9ca3af] hover:bg-[#22252d] transition-colors">Cancel</button>
              <button onClick={handleDeleteActiveProgram} className="flex-1 rounded-xl bg-[#ef4444] py-2.5 text-sm font-bold text-white hover:bg-[#dc2626] transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
      <div className="px-4 pt-12 pb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#a5b4fc]">
            ELITE COACH
          </h1>
          {profile?.name && (
            <p className="mt-1 text-sm text-[#9ca3af]">Welcome back, {profile.name}</p>
          )}
        </div>
        <Link href="/settings" className="mt-1 p-2 rounded-lg text-[#9ca3af] hover:text-white hover:bg-[#22252d] transition-colors">
          <SettingsIcon size={20} />
        </Link>
      </div>

      {/* Event Countdown */}
      {trainingEvent && weeksUntilEvent !== null && weeksUntilEvent > 0 && (
        <div className="px-4 mb-4">
          <div className="rounded-2xl bg-gradient-to-r from-[#4f46e5] to-[#6366f1] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/70 uppercase tracking-wider">Training For</p>
                <p className="text-lg font-bold text-white">{trainingEvent.name}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-white">{weeksUntilEvent}</p>
                <p className="text-xs text-white/70">weeks to go</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-[#1a1d24]/20 overflow-hidden">
              <div className="h-full rounded-full bg-[#1a1d24]/80 transition-all" style={{ width: `${Math.max(5, 100 - (weeksUntilEvent / 20) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Recovery Warning */}
      {recoveryData && recoveryData.score < 50 && (
        <div className="px-4 mb-4">
          <div className={`rounded-2xl border p-4 ${
            recoveryData.score < 33
              ? 'bg-[#ef4444]/10 border-[#ef4444]/30'
              : 'bg-[#f59e0b]/10 border-[#f59e0b]/30'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Heart size={14} className={recoveryData.score < 33 ? 'text-[#ef4444]' : 'text-amber-500'} />
              <span className={`text-xs font-medium uppercase tracking-wider ${recoveryData.score < 33 ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
                {recoveryData.score < 33 ? 'Low Recovery' : 'Moderate Recovery'}
              </span>
              <span className={`ml-auto text-xs font-bold ${recoveryData.score < 33 ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>{recoveryData.score}%</span>
            </div>
            <p className={`text-sm ${recoveryData.score < 33 ? 'text-red-800' : 'text-amber-800'}`}>
              {recoveryData.score < 33
                ? 'Consider a light session today — yoga, walking, or mobility work.'
                : 'Reduce volume by ~30% and lower RPE targets today.'}
            </p>
            {recoveryData.sleepHours && recoveryData.sleepHours < 6 && (
              <p className={`text-xs mt-1 ${recoveryData.score < 33 ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
                Only {recoveryData.sleepHours}h sleep — shorter session recommended.
              </p>
            )}
          </div>
        </div>
      )}

      {totalWorkouts > 0 && (
        <div className="px-4 mb-6 flex gap-3">
          <div className="flex-1 rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-3 text-center">
            <Flame size={16} className="mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold text-white">{streak}</p>
            <p className="text-[10px] text-[#9ca3af] uppercase">Day Streak</p>
          </div>
          <div className="flex-1 rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-3 text-center">
            <Calendar size={16} className="mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold text-white">{weekCompletionCount}</p>
            <p className="text-[10px] text-[#9ca3af] uppercase">This Week</p>
          </div>
          <div className="flex-1 rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-3 text-center">
            <Trophy size={16} className="mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold text-white">{totalWorkouts}</p>
            <p className="text-[10px] text-[#9ca3af] uppercase">Total</p>
          </div>
        </div>
      )}

      {/* Active Program with Day Selection */}
      <div className="px-4 mb-6">
        {activeProgram && programDays.length > 0 ? (
          <div className="rounded-2xl border border-[#2a2d35] bg-[#1a1d24] overflow-hidden">
            {/* Program title */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wider text-[#a5b4fc]">
                {activeProgram.title}
              </h2>
              <Link href="/progress" className="text-xs text-[#a5b4fc] font-medium">Track Progress &rarr;</Link>
            </div>

            {/* Horizontal scrollable day picker */}
            <div className="px-4 pb-3 overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-1">
                {programDays.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDayIdxState(idx);
                      storageSetSelectedDayIdx(idx);
                      setShowDayContent(true);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                      idx === selectedDayIdx
                        ? day.isRecovery ? 'bg-[#4ade80] text-white' : 'bg-[#4f46e5] text-white'
                        : day.isRecovery
                        ? 'bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/30'
                        : 'bg-[#22252d] text-[#9ca3af] border border-[#2a2d35]'
                    }`}
                  >
                    {day.isRecovery ? <Heart size={12} /> : <Dumbbell size={12} />}
                    {day.header}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected day content */}
            <div className="px-4 pb-4 border-t border-[#2a2d35]">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  {selectedDay?.isRecovery ? <Heart size={16} className="text-[#4ade80]" /> : <Dumbbell size={16} className="text-[#a5b4fc]" />}
                  <span className="font-semibold text-sm text-white">{selectedDay?.header}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDayContent(!showDayContent)}
                    className="text-xs text-[#a5b4fc] font-medium"
                  >
                    {showDayContent ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={handleSkipDay}
                    className="text-xs text-[#9ca3af] font-medium flex items-center gap-1"
                    title="Skip this day"
                  >
                    <SkipForward size={12} /> Skip
                  </button>
                </div>
              </div>

              {showDayContent && selectedDay && (
                <div className="pt-2 border-t border-[#2a2d35]">
                  <ProgramMarkdown content={selectedDay.content} />

                  {/* Weight Logging for Exercises */}
                  {!selectedDay.isRecovery && (() => {
                    const exercises = parseExercisesFromContent(selectedDay.content);
                    if (exercises.length === 0) return null;
                    return (
                      <div className="mt-4 border-t border-[#2a2d35] pt-3">
                        <h3 className="text-xs font-medium uppercase tracking-wider text-[#9ca3af] mb-3">Log Your Sets</h3>
                        <div className="space-y-2">
                          {exercises.map((ex, idx) => {
                            const key = ex.name.toLowerCase();
                            const input = exerciseInputs[key] || { weight: '', reps: '', sets: '' };
                            const lastLog = getLastLog(ex.name);
                            const isLogged = loggedExercises.has(key);
                            const currentWeight = parseFloat(input.weight);
                            const currentReps = parseInt(input.reps);
                            const current1RM = currentWeight > 0 && currentReps > 0 ? calculate1RM(currentWeight, currentReps) : 0;
                            const last1RM = lastLog ? calculate1RM(lastLog.weight, lastLog.reps) : 0;
                            const isNewPR = current1RM > 0 && current1RM > last1RM && last1RM > 0;

                            return (
                              <div key={idx} className={`rounded-lg border p-3 ${isLogged ? 'border-[#4ade80]/30 bg-[#4ade80]/10' : 'border-[#2a2d35] bg-[#1a1d24]'}`}>
                                <p className="font-medium text-sm text-white mb-1">{ex.name}</p>
                                {lastLog && (
                                  <p className="text-[10px] text-[#a5b4fc] mb-1">Last: {lastLog.weight}lbs x {lastLog.reps}r | Est. 1RM: {last1RM}lbs</p>
                                )}
                                {isLogged ? (
                                  <p className="text-xs text-[#4ade80] font-medium flex items-center gap-1"><Check size={12} /> Logged!</p>
                                ) : (
                                  <>
                                    <div className="flex gap-1.5 mb-1">
                                      <input type="number" inputMode="decimal" placeholder="lbs" value={input.weight}
                                        onChange={e => setExerciseInputs(prev => ({ ...prev, [key]: { ...input, weight: e.target.value } }))}
                                        className="flex-1 rounded-lg border border-[#2a2d35] px-2 py-2 text-sm text-center" />
                                      <input type="number" inputMode="numeric" placeholder="reps" value={input.reps}
                                        onChange={e => setExerciseInputs(prev => ({ ...prev, [key]: { ...input, reps: e.target.value } }))}
                                        className="w-16 rounded-lg border border-[#2a2d35] px-2 py-2 text-sm text-center" />
                                      <input type="number" inputMode="numeric" placeholder="sets" value={input.sets}
                                        onChange={e => setExerciseInputs(prev => ({ ...prev, [key]: { ...input, sets: e.target.value } }))}
                                        className="w-16 rounded-lg border border-[#2a2d35] px-2 py-2 text-sm text-center" />
                                      <button onClick={() => handleLogSet(ex.name)}
                                        disabled={!input.weight || !input.reps}
                                        className="rounded-lg bg-[#4f46e5] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3730a3] disabled:opacity-40">
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
                            className="w-full mt-3 rounded-xl bg-[#4ade80] py-3 text-sm font-bold text-white hover:bg-[#16a34a] transition-colors flex items-center justify-center gap-2">
                            <Check size={18} /> Complete Workout
                          </button>
                        ) : (
                          <div className="mt-3 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/30 p-3 text-center">
                            <Trophy size={24} className="mx-auto text-yellow-500 mb-1" />
                            <p className="font-bold text-sm text-white">Workout Complete!</p>
                            <p className="text-xs text-[#9ca3af]">Streak: {streak} day{streak !== 1 ? 's' : ''}</p>
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
                className="mt-3 w-full rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 py-2.5 text-sm font-medium text-[#ef4444] hover:bg-[#ef4444]/15 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Delete Program
              </button>
            </div>
          </div>
        ) : activeProgram ? (
          <div className="rounded-2xl border border-[#2a2d35] bg-[#1a1d24] p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#a5b4fc] mb-3">Active Program</h2>
            <p className="font-bold text-sm text-white mb-1">{activeProgram.title}</p>
            <p className="text-xs text-[#9ca3af] line-clamp-3 leading-relaxed">{activeProgram.content.slice(0, 200)}...</p>
            <Link href="/progress" className="inline-block mt-3 rounded-xl bg-[#4f46e5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3730a3] transition-colors">Start Workout</Link>
          </div>
        ) : (
          <Link href="/program">
            <div className="rounded-2xl border-2 border-dashed border-[#2a2d35] bg-[#1a1d24] p-8 text-center hover:border-[#a5b4fc]/50 transition-colors">
              <Dumbbell size={40} className="mx-auto text-[#4b5563] mb-3" />
              <h2 className="text-lg font-bold text-white mb-1">Create Your First Program</h2>
              <p className="text-sm text-[#9ca3af]">Generate a personalized training plan or add your existing workout to get started.</p>
            </div>
          </Link>
        )}
      </div>

      {/* Weekly Check-In Summary */}
      {activeProgram && (
        <div className="px-4 mb-4">
          <div className="rounded-2xl border border-[#2a2d35] bg-[#1a1d24] p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-[#a5b4fc]" />
              <span className="text-xs font-medium text-[#a5b4fc] uppercase tracking-wider">Weekly Check-In</span>
            </div>
            <p className="text-sm text-white">
              <strong>{weekCompletionCount}</strong> workout{weekCompletionCount !== 1 ? 's' : ''} completed
              {parseInt(activeProgram.answers?.days || '0') > 0 && (
                <span> of <strong>{activeProgram.answers.days}</strong> planned</span>
              )}
            </p>
            {weekVolume > 0 && (
              <p className="text-xs text-[#4b5e78] mt-1">Total volume: {weekVolume.toLocaleString()} lbs this week</p>
            )}
            {bodyStatsEntries.length > 1 && (() => {
              const latest = bodyStatsEntries[bodyStatsEntries.length - 1];
              const prev = bodyStatsEntries[bodyStatsEntries.length - 2];
              if (latest.weight && prev.weight) {
                const change = latest.weight - prev.weight;
                return <p className="text-xs text-[#4b5e78] mt-0.5">Body weight: {change > 0 ? '+' : ''}{change.toFixed(1)} lbs</p>;
              }
              return null;
            })()}
            {streak > 1 && (
              <p className="text-xs text-[#4b5e78] mt-0.5">{streak}-day streak going strong!</p>
            )}
          </div>
        </div>
      )}

      {/* Body Stats Quick Section */}
      <div className="px-4 mb-6">
        <div className="rounded-2xl border border-[#2a2d35] bg-[#1a1d24] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-[#a5b4fc]" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-[#9ca3af]">Body Stats</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowWeightInput(!showWeightInput)} className="p-1 rounded-lg bg-[#4f46e5] text-white hover:bg-[#3730a3]">
                <Plus size={14} />
              </button>
              <Link href="/body-stats" className="text-xs text-[#a5b4fc] font-medium">View All</Link>
            </div>
          </div>

          {/* Quick weight input */}
          {showWeightInput && (
            <div className="mb-3 flex gap-2">
              <input type="number" step="0.1" value={quickWeight} onChange={e => setQuickWeight(e.target.value)} placeholder="Weight (lbs)" className="flex-1 rounded-lg border border-[#2a2d35] px-3 py-2 text-sm" />
              <input type="number" step="0.1" value={quickBf} onChange={e => setQuickBf(e.target.value)} placeholder="BF %" className="w-20 rounded-lg border border-[#2a2d35] px-3 py-2 text-sm" />
              <button
                onClick={() => {
                  if (!quickWeight && !quickBf) return;
                  saveBodyStat({
                    date: new Date().toISOString().slice(0, 10),
                    weight: quickWeight ? parseFloat(quickWeight) : undefined,
                    bodyFat: quickBf ? parseFloat(quickBf) : undefined,
                  });
                  setBodyStatsEntries(getBodyStats());
                  setQuickWeight(''); setQuickBf(''); setShowWeightInput(false);
                }}
                className="rounded-lg bg-[#4f46e5] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3730a3]"
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
                        <span className="text-[#9ca3af] text-xs">Weight</span>
                        <p className="font-bold text-white">
                          {latest.weight} lbs
                          {weightChange !== null && (
                            <span className={`ml-1 text-xs font-medium ${weightChange > 0 ? 'text-orange-600' : weightChange < 0 ? 'text-[#4ade80]' : 'text-[#9ca3af]'}`}>
                              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    {latest.bodyFat && (
                      <div>
                        <span className="text-[#9ca3af] text-xs">Body Fat</span>
                        <p className="font-bold text-white">{latest.bodyFat}%</p>
                      </div>
                    )}
                    <div className="ml-auto text-right">
                      <span className="text-[#6b7280] text-[10px]">{new Date(latest.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <p className="text-xs text-[#6b7280]">Tap + to log your weight and body fat</p>
          )}
        </div>
      </div>

      {/* Skipped Days Log */}
      {skippedDays.length > 0 && (
        <div className="px-4 mb-6">
          <div className="rounded-2xl border border-[#2a2d35] bg-[#1a1d24] p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-[#9ca3af] mb-2">Skipped Workouts</h3>
            <div className="space-y-1">
              {skippedDays.slice(-5).reverse().map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-[#9ca3af]">{s.day}</span>
                  <span className="text-[#6b7280]">{new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workout Timer — collapsible */}
      <div className="px-4 mb-6">
        <div className="rounded-2xl border border-[#2a2d35] bg-[#1a1d24] overflow-hidden">
          <button
            onClick={() => setTimerExpanded(!timerExpanded)}
            className="w-full flex items-center justify-between px-5 py-3"
          >
            <div className="flex items-center gap-2">
              <Timer size={16} className="text-[#a5b4fc]" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-[#9ca3af]">
                {timerMode === 'rest' ? 'Rest Timer' : 'Workout Timer'}
              </h2>
            </div>
            <span className="text-xs text-[#6b7280]">{timerExpanded ? 'Hide' : 'Show'}</span>
          </button>
          {timerExpanded && (
            <div className="px-5 pb-5">
              <div className="flex gap-1 mb-4">
                <button onClick={() => { setTimerMode('stopwatch'); setTimerSeconds(0); setTimerRunning(false); }} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${timerMode === 'stopwatch' ? 'bg-[#4f46e5] text-white' : 'bg-[#22252d] text-[#9ca3af]'}`}>Stopwatch</button>
                <button onClick={() => { setTimerMode('rest'); setTimerSeconds(restPreset); setTimerRunning(false); }} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${timerMode === 'rest' ? 'bg-[#4f46e5] text-white' : 'bg-[#22252d] text-[#9ca3af]'}`}>Rest</button>
              </div>
              <div className={`text-center text-5xl font-mono font-extrabold mb-4 ${isTimerFinished ? 'text-[#4ade80] animate-pulse' : 'text-white'}`}>{formatTime(timerSeconds)}</div>
              {isTimerFinished && <p className="text-center text-sm text-[#4ade80] mb-3 font-semibold">Time to work!</p>}
              <div className="flex gap-2 justify-center mb-3">
                <button onClick={() => setTimerRunning(!timerRunning)} className="flex items-center gap-2 rounded-xl bg-[#4f46e5] px-8 py-3 text-sm font-semibold text-white hover:bg-[#3730a3] transition-colors">
                  {timerRunning ? <Pause size={18} /> : <Play size={18} />} {timerRunning ? 'Pause' : 'Start'}
                </button>
                <button onClick={resetTimer} className="rounded-xl bg-[#22252d] p-3 hover:bg-gray-200 transition-colors text-[#9ca3af]"><RotateCcw size={18} /></button>
              </div>
              {timerMode === 'rest' && (
                <div className="flex gap-2 justify-center">
                  {[30, 60, 90, 120, 180].map((s) => (
                    <button key={s} onClick={() => startRest(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${restPreset === s && !timerRunning ? 'bg-[#4f46e5] text-white' : 'bg-[#22252d] text-[#9ca3af] hover:bg-gray-200'}`}>
                      {s < 60 ? `${s}s` : `${s / 60}m`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6 flex gap-3">
        <Link href="/chat" className="flex-1">
          <div className="rounded-2xl bg-[#4f46e5] p-4 flex items-center gap-3 text-white hover:bg-[#3730a3] transition-colors">
            <MessageSquare size={20} />
            <span className="font-semibold text-sm">Talk to Coach</span>
          </div>
        </Link>
        <Link href="/program" className="flex-1">
          <div className="rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4 flex items-center gap-3 hover:border-[#a5b4fc]/30 transition-colors">
            <Zap size={20} className="text-[#a5b4fc]" />
            <span className="font-semibold text-sm text-white">My Program</span>
          </div>
        </Link>
      </div>

      <Navigation />
    </div>
  );
}

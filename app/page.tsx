'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MaterialIcon from '@/components/MaterialIcon';
import Navigation from '@/components/Navigation';
import ProgramMarkdown from '@/components/ProgramMarkdown';
import { useAuth } from '@/components/AuthProvider';
import {
  migrateOldData,
  StoredProgram, UserProfile,
  getActiveProgram,
  getWorkoutLogs, addWorkoutLog, getLastLog,
  getCompletions, recordWorkoutCompletion,
  getStreak, getWeekCompletionCount,
  isTodayCompleted,
  getProfile, saveProfile,
  getSelectedDayIdx, setSelectedDayIdx as storageSetSelectedDayIdx,
  calculate1RM,
  getDiagnostic, getDiagnosticSkipped, setDiagnosticSkipped, updateDiagnosticReminderDate, getDiagnosticOrActual,
} from '@/lib/simple-storage';

function parseExercisesFromContent(content: string): { name: string; line: string }[] {
  const lines = content.split('\n');
  const exercises: { name: string; line: string }[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes('|') && !trimmed.startsWith('#')) {
      const parts = trimmed.split('|').map(p => p.trim());
      const name = parts[0].replace(/\*\*/g, '').trim();
      if (['exercise', 'activity', 'movement', 'sets'].includes(name.toLowerCase())) continue;
      if (name.length > 2) exercises.push({ name, line: trimmed });
      continue;
    }
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+?)\s*[\u2014\u2013\-]\s+(.+)$/);
    if (numberedMatch) {
      const name = numberedMatch[1].replace(/\*\*/g, '').trim();
      if (name.length > 2) exercises.push({ name, line: trimmed });
      continue;
    }
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
  let label = raw.replace(/\*\*/g, '').replace(/^#{1,3}\s*/, '').trim();
  const dayMatch = label.match(/^(?:day\s*\d+\s*[:\u2014\u2013\-]\s*)(.*)/i);
  if (dayMatch && dayMatch[1]) return dayMatch[1].trim();
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
  const metadataPattern = /^(?:\*\*|#{1,3}\s+\*{0,2})?\s*(?:schedule|overview|notes|progression|deload|weekly|program\s+summary)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (metadataPattern.test(trimmed)) continue;
    if (dayPattern.test(trimmed)) {
      if (currentHeader) {
        const text = currentLines.join('\n').trim();
        const headerLower = currentHeader.toLowerCase();
        const label = cleanDayLabel(currentHeader);
        const isRecovery = headerLower.includes('recovery') || headerLower.includes('rest day') || headerLower.includes('active rest');
        days.push({ header: label, content: `${currentHeader}\n${text}`, isRecovery });
      }
      currentHeader = trimmed;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeader) {
    const text = currentLines.join('\n').trim();
    const headerLower = currentHeader.toLowerCase();
    const label = cleanDayLabel(currentHeader);
    const isRecovery = headerLower.includes('recovery') || headerLower.includes('rest day') || headerLower.includes('active rest');
    days.push({ header: label, content: `${currentHeader}\n${text}`, isRecovery });
  }

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
  const [totalWorkouts, setTotalWorkouts] = useState(0);

  // Onboarding
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [onboardingName, setOnboardingName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Day selection
  const [selectedDayIdx, setSelectedDayIdxState] = useState(0);

  // Weight logging for today's exercises
  const [exerciseInputs, setExerciseInputs] = useState<Record<string, { weight: string; reps: string; sets: string }>>({});
  const [loggedExercises, setLoggedExercises] = useState<Set<string>>(new Set());

  // Workout completion
  const [workoutDone, setWorkoutDone] = useState(false);

  // Strength diagnostic
  const [needsDiagnostic, setNeedsDiagnostic] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  const refreshStats = () => {
    setStreak(getStreak());
    setWeekCompletionCount(getWeekCompletionCount());
    setTotalWorkouts(getCompletions().length);
  };

  useEffect(() => {
    if (!user) return;
    migrateOldData();
    setActiveProgram(getActiveProgram());
    refreshStats();
    const p = getProfile();
    setProfile(p);
    if (!p || !p.onboardingComplete) setShowOnboarding(true);
    if (isTodayCompleted()) setWorkoutDone(true);
    const prog = getActiveProgram();
    const diag = getDiagnostic();
    const skipData = getDiagnosticSkipped();
    if (prog && getWorkoutLogs().length === 0 && !diag && !skipData.skipped) {
      setNeedsDiagnostic(true);
    }
    if (prog && !diag && skipData.skipped) {
      const lastReminder = skipData.lastReminder;
      if (lastReminder) {
        const daysSince = Math.floor((Date.now() - new Date(lastReminder).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 7) setShowReminder(true);
      } else {
        setShowReminder(true);
      }
    }
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

  const programDays = activeProgram ? parseProgramDays(activeProgram.content) : [];
  const selectedDay = programDays[selectedDayIdx] || programDays[0] || null;

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

  const exercises = selectedDay && !selectedDay.isRecovery ? parseExercisesFromContent(selectedDay.content) : [];

  return (
    <div className="min-h-screen pb-24 bg-surface">
      {/* Onboarding */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-surface-container-lowest rounded-xl p-6 max-w-sm w-full text-center shadow-lg">
            <MaterialIcon icon="fitness_center" size={40} className="text-primary mx-auto mb-3" />
            <h2 className="text-xl font-bold font-headline text-on-surface mb-1">Welcome to ELITE COACH</h2>
            <p className="text-sm text-secondary mb-6">What should I call you?</p>
            <div className="mb-6">
              <input
                value={onboardingName}
                onChange={e => setOnboardingName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOnboardingComplete()}
                placeholder="Your name"
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-center text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
            </div>
            <button onClick={handleOnboardingComplete} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-container transition-colors">
              Let&apos;s Go
            </button>
          </div>
        </div>
      )}

      {/* Header — glass morphism */}
      <div className="fixed top-0 w-full z-50 h-16 bg-slate-50/80 backdrop-blur-md flex items-center justify-between px-4">
        <h1 className="text-lg font-extrabold font-headline tracking-tight text-primary">
          ELITE COACH
        </h1>
        <Link href="/settings" className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-white text-sm font-bold">
          {profile?.name ? profile.name.charAt(0).toUpperCase() : 'A'}
        </Link>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-16" />

      {/* Streak Card */}
      {totalWorkouts > 0 && (
        <div className="px-4 pt-4 mb-4">
          <div className="rounded-xl bg-gradient-to-r from-primary to-primary-container p-5 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-label font-bold uppercase tracking-widest text-white/60">Current Streak</p>
                <p className="text-3xl font-extrabold font-headline mt-1">{streak} <span className="text-base font-normal text-white/70">day{streak !== 1 ? 's' : ''}</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-label font-bold uppercase tracking-widest text-white/60">This Week</p>
                <p className="text-3xl font-extrabold font-headline mt-1">{weekCompletionCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Workout Card */}
      <div className="px-4 mb-4">
        {activeProgram && selectedDay ? (
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/5">
            <p className="text-[10px] font-label font-bold uppercase tracking-widest text-secondary mb-2">
              Today&apos;s Workout
            </p>
            <h2 className="text-xl font-bold font-headline text-on-surface mb-1">{selectedDay.header}</h2>
            <p className="text-sm text-secondary">
              {activeProgram.title}
            </p>
            {selectedDay.isRecovery && (
              <div className="mt-3 flex items-center gap-2 text-emerald-600">
                <MaterialIcon icon="self_improvement" size={18} />
                <span className="text-sm font-medium">Recovery Day</span>
              </div>
            )}
            {workoutDone && (
              <div className="mt-3 flex items-center gap-2 text-emerald-600">
                <MaterialIcon icon="check_circle" filled size={18} />
                <span className="text-sm font-medium">Completed</span>
              </div>
            )}
          </div>
        ) : (
          <Link href="/program">
            <div className="rounded-xl border-2 border-dashed border-primary/20 bg-surface-container-lowest p-8 text-center hover:border-primary/40 transition-colors">
              <MaterialIcon icon="fitness_center" size={36} className="text-primary/40 mx-auto mb-3" />
              <h2 className="text-lg font-bold font-headline text-on-surface mb-1">Create Your First Program</h2>
              <p className="text-sm text-secondary">Generate a personalized training plan to get started.</p>
            </div>
          </Link>
        )}
      </div>

      {/* Strength Diagnostic Card */}
      {needsDiagnostic && activeProgram && (
        <div className="px-4 mb-4">
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/5 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <MaterialIcon icon="target" size={18} className="text-primary" />
              <h3 className="font-bold text-sm text-on-surface">Let&apos;s find your starting weights</h3>
            </div>
            <p className="text-sm text-secondary mb-4">
              A quick strength test so your program has real numbers, not guesses. Takes about 15 minutes.
            </p>
            <Link href="/diagnostic"
              className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-container py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Start Assessment <MaterialIcon icon="chevron_right" size={18} />
            </Link>
            <button
              onClick={() => { setDiagnosticSkipped(); setNeedsDiagnostic(false); }}
              className="w-full mt-2 text-center text-xs text-secondary hover:text-on-surface-variant transition-colors py-1"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Periodic Reminder Card */}
      {showReminder && !needsDiagnostic && activeProgram && (
        <div className="px-4 mb-4">
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface">Want more precise weights?</p>
                <p className="text-xs text-secondary mt-0.5">Take the strength assessment for exact prescriptions.</p>
              </div>
              <Link href="/diagnostic"
                className="shrink-0 ml-3 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-container transition-colors"
              >
                Take Assessment
              </Link>
            </div>
            <button
              onClick={() => { updateDiagnosticReminderDate(); setShowReminder(false); }}
              className="w-full mt-2 text-center text-[10px] text-secondary hover:text-on-surface-variant transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Exercise List with Logging */}
      {activeProgram && selectedDay && !selectedDay.isRecovery && exercises.length > 0 && (
        <div className="px-4 mb-4">
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/5 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-outline-variant/10">
              <h3 className="text-[10px] font-label font-bold uppercase tracking-widest text-secondary">Exercises</h3>
            </div>
            <div className="divide-y divide-outline-variant/10">
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

                const parts = ex.line.split('|').map(p => p.trim());
                const setsReps = parts.length > 2 ? `${parts[1]} x ${parts[2]}` : '';

                return (
                  <div key={idx} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm text-on-surface">{ex.name}</p>
                      {setsReps && (
                        <span className="text-xs font-medium text-primary bg-blue-50 px-2 py-0.5 rounded-xl">{setsReps}</span>
                      )}
                    </div>
                    {(() => {
                      const diagData = getDiagnosticOrActual(ex.name);
                      const prescribed = diagData ? `${diagData.weight} lbs` : null;
                      return (
                        <>
                          {prescribed && (
                            <p className="text-[10px] text-primary font-medium mb-0.5">
                              {diagData!.source === 'diagnostic' ? 'Prescribed' : 'Last time'}: {prescribed} {lastLog ? `x ${lastLog.reps}r` : ''}
                            </p>
                          )}
                          {lastLog && diagData?.source !== 'log' && (
                            <p className="text-[10px] text-on-surface-variant mb-0.5">Last: {lastLog.weight}lbs x {lastLog.reps}r | 1RM: {last1RM}lbs</p>
                          )}
                          {lastLog && diagData?.source === 'log' && (
                            <p className="text-[10px] text-on-surface-variant mb-0.5">1RM: {last1RM}lbs</p>
                          )}
                        </>
                      );
                    })()}
                    {isLogged ? (
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-xl w-fit">
                        <MaterialIcon icon="check" size={14} /> Logged
                      </p>
                    ) : (
                      <>
                        <div className="flex gap-1.5">
                          <input type="number" inputMode="decimal" placeholder="lbs" value={input.weight}
                            onChange={e => setExerciseInputs(prev => ({ ...prev, [key]: { ...input, weight: e.target.value } }))}
                            className="flex-1 rounded-xl border border-outline-variant bg-surface px-2 py-2 text-sm text-center text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30" />
                          <input type="number" inputMode="numeric" placeholder="reps" value={input.reps}
                            onChange={e => setExerciseInputs(prev => ({ ...prev, [key]: { ...input, reps: e.target.value } }))}
                            className="w-16 rounded-xl border border-outline-variant bg-surface px-2 py-2 text-sm text-center text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30" />
                          <input type="number" inputMode="numeric" placeholder="sets" value={input.sets}
                            onChange={e => setExerciseInputs(prev => ({ ...prev, [key]: { ...input, sets: e.target.value } }))}
                            className="w-16 rounded-xl border border-outline-variant bg-surface px-2 py-2 text-sm text-center text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30" />
                          <button onClick={() => handleLogSet(ex.name)}
                            disabled={!input.weight || !input.reps}
                            className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-container disabled:opacity-40 transition-colors">
                            Log
                          </button>
                        </div>
                        {current1RM > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-primary font-medium">Est. 1RM: {current1RM} lbs</span>
                            {isNewPR && <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-xl font-bold animate-pulse">NEW PR!</span>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Complete Workout Button */}
            <div className="px-4 pb-4 pt-2">
              {!workoutDone ? (
                <button onClick={handleCompleteWorkout}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                  <MaterialIcon icon="check_circle" size={18} /> Complete Workout
                </button>
              ) : (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <p className="font-bold text-sm text-emerald-700 flex items-center justify-center gap-1">
                    <MaterialIcon icon="check_circle" filled size={16} /> Workout Complete!
                  </p>
                  <p className="text-xs text-secondary mt-0.5">Streak: {streak} day{streak !== 1 ? 's' : ''}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recovery day content */}
      {activeProgram && selectedDay && selectedDay.isRecovery && (
        <div className="px-4 mb-4">
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/5 p-4 shadow-sm">
            <ProgramMarkdown content={selectedDay.content} />
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}

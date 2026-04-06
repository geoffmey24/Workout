'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MaterialIcon from '@/components/MaterialIcon';
import Navigation from '@/components/Navigation';
import ProgramMarkdown from '@/components/ProgramMarkdown';
import { useAuth } from '@/components/AuthProvider';
import {
  getActiveProgram,
  addWorkoutLog,
  getLastLog,
  getPersonalRecords,
  recordWorkoutCompletion,
  getStreak,
  getCompletions,
  calculate1RM,
  migrateOldData,
  StoredProgram,
  WorkoutLog,
} from '@/lib/simple-storage';

function parseExercises(content: string): string[] {
  const lines = content.split('\n');
  const exercises: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes('|') && !trimmed.startsWith('#')) {
      const parts = trimmed.split('|').map(p => p.trim());
      const name = parts[0].replace(/\*\*/g, '').trim();
      if (['exercise', 'activity', 'movement', 'sets'].includes(name.toLowerCase())) continue;
      if (name.length > 2) {
        exercises.push(parts.join(' | '));
        continue;
      }
    }
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+?)(?:\s*[\u2014\u2013\-]\s+|\s*\|\s*)(.+)$/);
    if (numberedMatch) {
      const name = numberedMatch[1].replace(/\*\*/g, '').trim();
      const rest = numberedMatch[2].trim();
      if (name.length > 2) exercises.push(`${name} — ${rest}`);
      continue;
    }
    const isExercise =
      /\d+\s*[xX\u00d7]\s*\d+/.test(trimmed) ||
      /\d+\s*sets?/i.test(trimmed) ||
      /\d+\s*reps?/i.test(trimmed);
    if (isExercise) {
      const cleaned = trimmed.replace(/^[-*|]\s*/, '').replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim();
      if (cleaned.length > 3) exercises.push(cleaned);
    }
  }
  return exercises;
}

function extractExerciseName(exerciseLine: string): string {
  return exerciseLine.split(/[\u2014\u2013]|[|]|[\d]+\s*[xX\u00d7]/)[0].trim().replace(/^\d+\.\s*/, '');
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [activeProgram, setActiveProgram] = useState<StoredProgram | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [workoutDone, setWorkoutDone] = useState(false);
  const [viewMode, setViewMode] = useState<'checklist' | 'full' | 'prs'>('checklist');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [exerciseWeights, setExerciseWeights] = useState<Record<string, { weight: string; reps: string; sets: string }>>({});
  const [workoutNote, setWorkoutNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<Record<string, WorkoutLog>>({});

  useEffect(() => {
    if (!user) return;
    migrateOldData();
    setActiveProgram(getActiveProgram());
    setPersonalRecords(getPersonalRecords());
    setStreak(getStreak());
    setTotalWorkouts(getCompletions().length);
    setDataLoaded(true);
  }, [user]);

  const exercises = activeProgram ? parseExercises(activeProgram.content) : [];
  const totalExercises = exercises.length;
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  const toggleExercise = (key: string, idx: number) => {
    const newCompleted = { ...completed, [key]: !completed[key] };
    setCompleted(newCompleted);

    if (!completed[key]) {
      const exerciseName = extractExerciseName(exercises[idx]);
      const input = exerciseWeights[key];
      if (input?.weight) {
        const weight = parseFloat(input.weight);
        const reps = parseInt(input.reps) || 0;
        const sets = parseInt(input.sets) || 0;
        addWorkoutLog({
          exercise: exerciseName,
          weight,
          reps,
          sets,
          date: new Date().toISOString().slice(0, 10),
          estimated1RM: calculate1RM(weight, reps),
        });
        setPersonalRecords(getPersonalRecords());
      }
    }
  };

  const handleCompleteWorkout = () => {
    setWorkoutDone(true);
    recordWorkoutCompletion(activeProgram?.title || 'Workout');
    setStreak(getStreak());
    setTotalWorkouts(getCompletions().length);
    if (workoutNote.trim()) {
      setNoteSaved(true);
    }
  };

  const handleSaveNote = () => {
    if (!workoutNote.trim()) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  if (!dataLoaded) {
    return (
      <div className="min-h-screen pb-24 bg-surface">
        <div className="fixed top-0 w-full z-50 h-16 bg-slate-50/80 backdrop-blur-md flex items-center gap-3 px-4">
          <Link href="/" className="text-secondary hover:text-on-surface"><MaterialIcon icon="arrow_back" size={20} /></Link>
          <h1 className="font-bold text-sm font-headline text-on-surface">Workout Tracker</h1>
        </div>
        <div className="h-16" />
        <div className="flex items-center justify-center py-20">
          <div className="flex gap-1.5"><span className="typing-dot h-2 w-2 rounded-full bg-primary" /><span className="typing-dot h-2 w-2 rounded-full bg-primary" /><span className="typing-dot h-2 w-2 rounded-full bg-primary" /></div>
        </div>
        <Navigation />
      </div>
    );
  }

  if (!activeProgram) {
    return (
      <div className="min-h-screen pb-24 bg-surface">
        <div className="fixed top-0 w-full z-50 h-16 bg-slate-50/80 backdrop-blur-md flex items-center gap-3 px-4">
          <Link href="/" className="text-secondary hover:text-on-surface"><MaterialIcon icon="arrow_back" size={20} /></Link>
          <h1 className="font-bold text-sm font-headline text-on-surface">Workout Tracker</h1>
        </div>
        <div className="h-16" />
        <div className="px-4 py-16 text-center">
          <MaterialIcon icon="fitness_center" size={56} className="text-secondary mx-auto mb-4" />
          <h2 className="text-lg font-bold font-headline text-on-surface mb-2">No active program</h2>
          <p className="text-sm text-secondary max-w-xs mx-auto mb-6">Create or import a training program first.</p>
          <Link href="/program" className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-container transition-colors">Create a Program</Link>
        </div>
        <Navigation />
      </div>
    );
  }

  const prEntries = Object.entries(personalRecords);

  return (
    <div className="min-h-screen pb-24 bg-surface">
      {/* Header — glass morphism */}
      <div className="fixed top-0 w-full z-50 h-16 bg-slate-50/80 backdrop-blur-md flex items-center gap-3 px-4">
        <Link href="/" className="text-secondary hover:text-on-surface"><MaterialIcon icon="arrow_back" size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm font-headline text-on-surface truncate">{activeProgram.title}</h1>
        </div>
        <button onClick={() => { setCompleted({}); setWorkoutDone(false); setExerciseWeights({}); setWorkoutNote(''); setNoteSaved(false); }} className="text-secondary hover:text-on-surface" title="Reset">
          <MaterialIcon icon="refresh" size={16} />
        </button>
      </div>

      <div className="h-16" />

      {/* Stats Bar */}
      {totalWorkouts > 0 && (
        <div className="px-4 py-3 flex gap-3">
          <div className="flex-1 rounded-xl bg-surface-container-lowest border border-outline-variant/5 p-3 text-center shadow-sm">
            <MaterialIcon icon="local_fire_department" size={14} className="text-orange-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-on-surface">{streak}<span className="text-xs text-secondary ml-0.5">d</span></p>
          </div>
          <div className="flex-1 rounded-xl bg-surface-container-lowest border border-outline-variant/5 p-3 text-center shadow-sm">
            <MaterialIcon icon="emoji_events" size={14} className="text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-on-surface">{totalWorkouts}</p>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="px-4 mb-3 flex gap-2">
        <button onClick={() => setViewMode('checklist')} className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${viewMode === 'checklist' ? 'bg-primary text-white' : 'bg-surface-container-lowest border border-outline-variant/5 text-secondary'}`}>
          Checklist ({completedCount}/{totalExercises})
        </button>
        <button onClick={() => setViewMode('prs')} className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${viewMode === 'prs' ? 'bg-primary text-white' : 'bg-surface-container-lowest border border-outline-variant/5 text-secondary'}`}>
          PRs
        </button>
        <button onClick={() => setViewMode('full')} className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${viewMode === 'full' ? 'bg-primary text-white' : 'bg-surface-container-lowest border border-outline-variant/5 text-secondary'}`}>
          Full Program
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-4">
        <div className="h-2 rounded-full bg-outline-variant/20">
          <div className={`h-full rounded-full transition-all duration-300 ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {viewMode === 'checklist' ? (
        <div className="px-4 space-y-2">
          {exercises.length > 0 ? exercises.map((ex, i) => {
            const key = `ex-${i}`;
            const done = completed[key] || false;
            const exerciseName = extractExerciseName(ex);
            const lastEntry = getLastLog(exerciseName);
            const input = exerciseWeights[key] || { weight: '', reps: '', sets: '' };

            return (
              <div key={key} className={`rounded-xl border p-3 transition-all ${done ? 'border-emerald-200 bg-emerald-50' : 'border-outline-variant/5 bg-surface-container-lowest shadow-sm'}`}>
                <button onClick={() => toggleExercise(key, i)} className="w-full flex items-center gap-3 text-left">
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-outline-variant'}`}>
                    {done && <MaterialIcon icon="check" size={14} />}
                  </div>
                  <p className={`text-sm flex-1 ${done ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{ex}</p>
                </button>
                {lastEntry && !done && (
                  <div className="ml-9 mt-1 flex items-center gap-2">
                    <p className="text-[10px] text-primary">Last: {lastEntry.weight}lbs x {lastEntry.reps}r x {lastEntry.sets}s ({lastEntry.date})</p>
                    {lastEntry.weight > 0 && lastEntry.reps > 0 && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-xl font-medium">
                        Est. 1RM: {calculate1RM(lastEntry.weight, lastEntry.reps)} lbs
                      </span>
                    )}
                  </div>
                )}
                {!done && (
                  <div className="ml-9 mt-2">
                    <div className="flex gap-2">
                      <input type="number" placeholder="Weight" value={input.weight} onChange={e => setExerciseWeights(prev => ({ ...prev, [key]: { ...input, weight: e.target.value } }))} className="w-20 rounded-xl border border-outline-variant px-2 py-1 text-xs" />
                      <input type="number" placeholder="Reps" value={input.reps} onChange={e => setExerciseWeights(prev => ({ ...prev, [key]: { ...input, reps: e.target.value } }))} className="w-16 rounded-xl border border-outline-variant px-2 py-1 text-xs" />
                      <input type="number" placeholder="Sets" value={input.sets} onChange={e => setExerciseWeights(prev => ({ ...prev, [key]: { ...input, sets: e.target.value } }))} className="w-16 rounded-xl border border-outline-variant px-2 py-1 text-xs" />
                    </div>
                    {input.weight && input.reps && parseFloat(input.weight) > 0 && parseInt(input.reps) > 0 && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <MaterialIcon icon="bolt" size={10} className="text-purple-600" />
                        <span className="text-[10px] text-purple-600 font-medium">
                          Est. 1RM: {calculate1RM(parseFloat(input.weight), parseInt(input.reps))} lbs
                        </span>
                        {(() => {
                          const pr = personalRecords[exerciseName.toLowerCase()];
                          const current1RM = calculate1RM(parseFloat(input.weight), parseInt(input.reps));
                          const pr1RM = pr ? calculate1RM(pr.weight, pr.reps) : 0;
                          if (current1RM > pr1RM && pr1RM > 0) {
                            return <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-xl font-bold animate-pulse">NEW PR!</span>;
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="text-center py-8">
              <p className="text-sm text-secondary">No exercises detected. Switch to &quot;Full Program&quot; view.</p>
            </div>
          )}

          {/* Workout Note */}
          <div className="mt-4 rounded-xl bg-surface-container-lowest border border-outline-variant/5 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <MaterialIcon icon="sticky_note_2" size={14} className="text-secondary" />
              <span className="text-xs font-medium text-secondary">Workout Notes</span>
            </div>
            <textarea value={workoutNote} onChange={e => { setWorkoutNote(e.target.value); setNoteSaved(false); }} placeholder="How did this workout feel? Any notes..." rows={2} className="w-full rounded-xl border border-outline-variant px-3 py-2 text-xs resize-none" />
            {workoutNote.trim() && (
              <button onClick={handleSaveNote} className="mt-1 text-xs text-primary font-medium">
                {noteSaved ? 'Saved!' : 'Save Note'}
              </button>
            )}
          </div>

          {/* Complete Workout Button */}
          {exercises.length > 0 && !workoutDone && (
            <button onClick={handleCompleteWorkout} className="w-full mt-4 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
              <MaterialIcon icon="check_circle" size={18} /> Complete Workout
            </button>
          )}

          {workoutDone && (
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <MaterialIcon icon="emoji_events" size={32} className="text-yellow-500 mx-auto mb-2" />
              <h3 className="font-bold text-on-surface mb-1">Workout Complete!</h3>
              <p className="text-sm text-secondary">Great work! Your streak is now {streak} day{streak !== 1 ? 's' : ''}.</p>
            </div>
          )}
        </div>
      ) : viewMode === 'prs' ? (
        <div className="px-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <MaterialIcon icon="trending_up" size={16} className="text-yellow-500" />
            <h2 className="text-[10px] font-label font-bold uppercase tracking-widest text-secondary">Personal Records</h2>
          </div>
          {prEntries.length === 0 ? (
            <div className="text-center py-8">
              <MaterialIcon icon="emoji_events" size={40} className="text-secondary mx-auto mb-3" />
              <p className="text-sm text-secondary">No PRs yet. Log your weights during workouts!</p>
            </div>
          ) : prEntries.map(([name, entry]) => {
            const est1RM = calculate1RM(entry.weight, entry.reps);
            return (
              <div key={name} className="rounded-xl bg-surface-container-lowest border border-outline-variant/5 p-3 flex items-center justify-between shadow-sm">
                <div>
                  <p className="font-semibold text-sm text-on-surface capitalize">{name}</p>
                  <p className="text-xs text-secondary">{entry.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-on-surface">{entry.weight} lbs</p>
                  <p className="text-xs text-secondary">{entry.reps}r x {entry.sets}s</p>
                  {est1RM > 0 && (
                    <p className="text-[10px] text-purple-600 font-medium mt-0.5">Est. 1RM: {est1RM} lbs</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 chat-message text-sm">
          <ProgramMarkdown content={activeProgram.content} />
        </div>
      )}

      {/* Exercise Swap Suggestion */}
      <div className="px-4 mt-4">
        <Link href="/chat?topic=I%20need%20alternative%20exercises%20for%20my%20current%20workout.%20What%20can%20I%20swap%20in%3F" className="flex items-center gap-2 rounded-xl border border-outline-variant/5 bg-surface-container-lowest px-4 py-3 hover:border-primary/50 transition-colors shadow-sm">
          <MaterialIcon icon="chat_bubble" size={16} className="text-primary" />
          <span className="text-xs font-medium text-secondary">Need to swap an exercise? Ask Coach</span>
        </Link>
      </div>

      <Navigation />
    </div>
  );
}

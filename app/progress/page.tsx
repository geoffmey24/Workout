'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Check, RotateCcw, Flame, Trophy, Calendar, Dumbbell, MessageSquare, StickyNote, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import ProgramMarkdown from '@/components/ProgramMarkdown';
import { useAuth } from '@/components/AuthProvider';
import { dbGetWorkoutStats, dbGetWeeklyStats, dbRecordWorkout, dbGetActiveProgram, DbWorkoutStats, dbGetLastEntry, dbSaveExerciseLogEntry, dbGetPersonalRecords, dbSaveWorkoutNote, ExerciseLogEntry } from '@/lib/db';
import { SavedProgram } from '@/lib/program-history';

function parseExercises(content: string): string[] {
  const lines = content.split('\n');
  const exercises: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
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
  // Extract just the exercise name from "Bench Press | 4 | 8 | 7-8 | 3 min" or "Bench Press 4x8"
  return exerciseLine.split(/[|]|[\d]+\s*[xX\u00d7]/)[0].trim().replace(/^\d+\.\s*/, '');
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [activeProgram, setActiveProgram] = useState<SavedProgram | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<DbWorkoutStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState({ workoutsThisWeek: 0, daysActive: 0 });
  const [workoutDone, setWorkoutDone] = useState(false);
  const [viewMode, setViewMode] = useState<'checklist' | 'full' | 'prs'>('checklist');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [exerciseWeights, setExerciseWeights] = useState<Record<string, { weight: string; reps: string; sets: string }>>({});
  const [workoutNote, setWorkoutNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<Record<string, ExerciseLogEntry>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const s = await dbGetWorkoutStats(user.id);
      setStats(s);
      setWeeklyStats(dbGetWeeklyStats(s));
      setActiveProgram(await dbGetActiveProgram(user.id));
      setPersonalRecords(dbGetPersonalRecords());
      setDataLoaded(true);
    })();
  }, [user]);

  const exercises = activeProgram ? parseExercises(activeProgram.content) : [];
  const totalExercises = exercises.length;
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  const toggleExercise = (key: string, idx: number) => {
    const newCompleted = { ...completed, [key]: !completed[key] };
    setCompleted(newCompleted);

    // If completing, save the weight log
    if (!completed[key]) {
      const exerciseName = extractExerciseName(exercises[idx]);
      const input = exerciseWeights[key];
      if (input?.weight) {
        dbSaveExerciseLogEntry({
          exercise: exerciseName,
          date: new Date().toISOString().slice(0, 10),
          weight: parseFloat(input.weight),
          reps: parseInt(input.reps) || 0,
          sets: parseInt(input.sets) || 0,
        });
        setPersonalRecords(dbGetPersonalRecords());
      }
    }
  };

  const handleCompleteWorkout = () => {
    if (!user) return;
    setWorkoutDone(true);
    dbRecordWorkout(user.id, 1).then(updated => {
      setStats(updated);
      setWeeklyStats(dbGetWeeklyStats(updated));
    });
    // Save note if any
    if (workoutNote.trim()) {
      dbSaveWorkoutNote({
        date: new Date().toISOString().slice(0, 10),
        dayName: activeProgram?.title || 'Workout',
        note: workoutNote.trim(),
      });
      setNoteSaved(true);
    }
  };

  const handleSaveNote = () => {
    if (!workoutNote.trim()) return;
    dbSaveWorkoutNote({
      date: new Date().toISOString().slice(0, 10),
      dayName: activeProgram?.title || 'Workout',
      note: workoutNote.trim(),
    });
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  if (!dataLoaded) {
    return (
      <div className="min-h-screen pb-24">
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
          <Link href="/" className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></Link>
          <h1 className="font-bold text-sm text-[#111827]">Workout Tracker</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex gap-1.5"><span className="typing-dot h-2 w-2 rounded-full bg-blue-500" /><span className="typing-dot h-2 w-2 rounded-full bg-blue-500" /><span className="typing-dot h-2 w-2 rounded-full bg-blue-500" /></div>
        </div>
        <Navigation />
      </div>
    );
  }

  if (!activeProgram) {
    return (
      <div className="min-h-screen pb-24">
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
          <Link href="/" className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></Link>
          <h1 className="font-bold text-sm text-[#111827]">Workout Tracker</h1>
        </div>
        <div className="px-4 py-16 text-center">
          <Dumbbell size={56} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-bold text-[#111827] mb-2">No active program</h2>
          <p className="text-sm text-[#6b7280] max-w-xs mx-auto mb-6">Create or import a training program first.</p>
          <Link href="/program" className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">Create a Program</Link>
        </div>
        <Navigation />
      </div>
    );
  }

  const prEntries = Object.entries(personalRecords);

  return (
    <div className="min-h-screen pb-24">
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <Link href="/" className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm text-[#111827] truncate">{activeProgram.title}</h1>
        </div>
        <button onClick={() => { setCompleted({}); setWorkoutDone(false); setExerciseWeights({}); setWorkoutNote(''); setNoteSaved(false); }} className="text-[#6b7280] hover:text-[#111827]" title="Reset">
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Stats Bar */}
      {stats && stats.totalWorkouts > 0 && (
        <div className="px-4 py-3 flex gap-3">
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <Flame size={14} className="mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold text-[#111827]">{stats.streak}<span className="text-xs text-[#6b7280] ml-0.5">d</span></p>
          </div>
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <Calendar size={14} className="mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold text-[#111827]">{weeklyStats.daysActive}</p>
          </div>
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <Trophy size={14} className="mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold text-[#111827]">{stats.totalWorkouts}</p>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="px-4 mb-3 flex gap-2">
        <button onClick={() => setViewMode('checklist')} className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${viewMode === 'checklist' ? 'bg-blue-600 text-white' : 'bg-white border border-[#e5e7eb] text-[#6b7280]'}`}>
          Checklist ({completedCount}/{totalExercises})
        </button>
        <button onClick={() => setViewMode('prs')} className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${viewMode === 'prs' ? 'bg-blue-600 text-white' : 'bg-white border border-[#e5e7eb] text-[#6b7280]'}`}>
          PRs
        </button>
        <button onClick={() => setViewMode('full')} className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${viewMode === 'full' ? 'bg-blue-600 text-white' : 'bg-white border border-[#e5e7eb] text-[#6b7280]'}`}>
          Full Program
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-4">
        <div className="h-2 rounded-full bg-[#e5e7eb]">
          <div className={`h-full rounded-full transition-all duration-300 ${progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {viewMode === 'checklist' ? (
        <div className="px-4 space-y-2">
          {exercises.length > 0 ? exercises.map((ex, i) => {
            const key = `ex-${i}`;
            const done = completed[key] || false;
            const exerciseName = extractExerciseName(ex);
            const lastEntry = dbGetLastEntry(exerciseName);
            const input = exerciseWeights[key] || { weight: '', reps: '', sets: '' };

            return (
              <div key={key} className={`rounded-xl border p-3 transition-all ${done ? 'border-green-200 bg-green-50' : 'border-[#e5e7eb] bg-white shadow-sm'}`}>
                <button onClick={() => toggleExercise(key, i)} className="w-full flex items-center gap-3 text-left">
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'}`}>
                    {done && <Check size={14} strokeWidth={3} />}
                  </div>
                  <p className={`text-sm flex-1 ${done ? 'line-through text-[#9ca3af]' : 'text-[#111827]'}`}>{ex}</p>
                </button>
                {lastEntry && !done && (
                  <p className="text-[10px] text-blue-600 ml-9 mt-1">Last: {lastEntry.weight}lbs x {lastEntry.reps} reps x {lastEntry.sets} sets ({lastEntry.date})</p>
                )}
                {!done && (
                  <div className="flex gap-2 ml-9 mt-2">
                    <input type="number" placeholder="Weight" value={input.weight} onChange={e => setExerciseWeights(prev => ({ ...prev, [key]: { ...input, weight: e.target.value } }))} className="w-20 rounded-lg border border-[#e5e7eb] px-2 py-1 text-xs" />
                    <input type="number" placeholder="Reps" value={input.reps} onChange={e => setExerciseWeights(prev => ({ ...prev, [key]: { ...input, reps: e.target.value } }))} className="w-16 rounded-lg border border-[#e5e7eb] px-2 py-1 text-xs" />
                    <input type="number" placeholder="Sets" value={input.sets} onChange={e => setExerciseWeights(prev => ({ ...prev, [key]: { ...input, sets: e.target.value } }))} className="w-16 rounded-lg border border-[#e5e7eb] px-2 py-1 text-xs" />
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="text-center py-8">
              <p className="text-sm text-[#6b7280]">No exercises detected. Switch to "Full Program" view.</p>
            </div>
          )}

          {/* Workout Note */}
          <div className="mt-4 rounded-xl bg-white border border-[#e5e7eb] p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <StickyNote size={14} className="text-[#6b7280]" />
              <span className="text-xs font-medium text-[#6b7280]">Workout Notes</span>
            </div>
            <textarea value={workoutNote} onChange={e => { setWorkoutNote(e.target.value); setNoteSaved(false); }} placeholder="How did this workout feel? Any notes..." rows={2} className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-xs resize-none" />
            {workoutNote.trim() && (
              <button onClick={handleSaveNote} className="mt-1 text-xs text-blue-600 font-medium">
                {noteSaved ? 'Saved!' : 'Save Note'}
              </button>
            )}
          </div>

          {/* Complete Workout Button */}
          {exercises.length > 0 && !workoutDone && (
            <button onClick={handleCompleteWorkout} className="w-full mt-4 rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
              <Check size={18} /> Complete Workout
            </button>
          )}

          {workoutDone && (
            <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-4 text-center">
              <Trophy size={32} className="mx-auto text-yellow-500 mb-2" />
              <h3 className="font-bold text-[#111827] mb-1">Workout Complete!</h3>
              <p className="text-sm text-[#6b7280]">Great work! Your streak is now {stats?.streak || 1} day{(stats?.streak || 1) > 1 ? 's' : ''}.</p>
            </div>
          )}
        </div>
      ) : viewMode === 'prs' ? (
        <div className="px-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-yellow-500" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">Personal Records</h2>
          </div>
          {prEntries.length === 0 ? (
            <div className="text-center py-8">
              <Trophy size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-[#6b7280]">No PRs yet. Log your weights during workouts!</p>
            </div>
          ) : prEntries.map(([name, entry]) => (
            <div key={name} className="rounded-xl bg-white border border-[#e5e7eb] p-3 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-[#111827] capitalize">{name}</p>
                <p className="text-xs text-[#6b7280]">{entry.date}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-[#111827]">{entry.weight} lbs</p>
                <p className="text-xs text-[#6b7280]">{entry.reps}r x {entry.sets}s</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 chat-message text-sm">
          <ProgramMarkdown content={activeProgram.content} />
        </div>
      )}

      {/* Exercise Swap Suggestion */}
      <div className="px-4 mt-4">
        <Link href="/chat?topic=I%20need%20alternative%20exercises%20for%20my%20current%20workout.%20What%20can%20I%20swap%20in%3F" className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 shadow-sm hover:border-blue-300 transition-colors">
          <MessageSquare size={16} className="text-blue-600" />
          <span className="text-xs font-medium text-[#6b7280]">Need to swap an exercise? Ask Coach</span>
        </Link>
      </div>

      <Navigation />
    </div>
  );
}

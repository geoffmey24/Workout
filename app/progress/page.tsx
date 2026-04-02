'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Check, RotateCcw, Flame, Trophy, Calendar, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/AuthProvider';
import { dbGetWorkoutStats, dbGetWeeklyStats, dbRecordWorkout, dbGetActiveProgram, DbWorkoutStats } from '@/lib/db';
import { SavedProgram } from '@/lib/program-history';

// Parse a program's text content into checkable exercise lines
function parseExercises(content: string): string[] {
  const lines = content.split('\n');
  const exercises: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines that look like exercises (contain sets/reps patterns, or start with - / * / number)
    if (!trimmed) continue;
    const isExercise =
      /\d+\s*[xX×]\s*\d+/.test(trimmed) || // "4x8", "3 x 12"
      /\d+\s*sets?/i.test(trimmed) || // "4 sets"
      /\d+\s*reps?/i.test(trimmed); // "12 reps"
    if (isExercise) {
      // Clean up markdown symbols
      const cleaned = trimmed.replace(/^[-*|]\s*/, '').replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim();
      if (cleaned.length > 3) exercises.push(cleaned);
    }
  }
  return exercises;
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [activeProgram, setActiveProgram] = useState<SavedProgram | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<DbWorkoutStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState({ workoutsThisWeek: 0, daysActive: 0 });
  const [workoutDone, setWorkoutDone] = useState(false);
  const [viewMode, setViewMode] = useState<'checklist' | 'full'>('checklist');
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const s = await dbGetWorkoutStats(user.id);
      setStats(s);
      setWeeklyStats(dbGetWeeklyStats(s));
      setActiveProgram(await dbGetActiveProgram(user.id));
      setDataLoaded(true);
    })();
  }, [user]);

  const exercises = activeProgram ? parseExercises(activeProgram.content) : [];
  const totalExercises = exercises.length;
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  const toggleExercise = (key: string) => {
    setCompleted(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (completedCount === totalExercises && totalExercises > 0 && !workoutDone && user) {
      setWorkoutDone(true);
      dbRecordWorkout(user.id, 1).then(updated => {
        setStats(updated);
        setWeeklyStats(dbGetWeeklyStats(updated));
      });
    }
  }, [completedCount, totalExercises, workoutDone, user]);

  // Still loading data
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

  // No active program
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
          <p className="text-sm text-[#6b7280] max-w-xs mx-auto mb-6">
            Create or import a training program first, then come back here to track your progress.
          </p>
          <Link href="/program" className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            Create a Program
          </Link>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <Link href="/" className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm text-[#111827] truncate">{activeProgram.title}</h1>
        </div>
        <button
          onClick={() => { setCompleted({}); setWorkoutDone(false); }}
          className="text-[#6b7280] hover:text-[#111827]"
          title="Reset"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Streak & Stats Bar */}
      {stats && (
        <div className="px-4 py-3 flex gap-3">
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Flame size={14} className="text-orange-500" />
              <span className="text-xs text-[#6b7280]">Streak</span>
            </div>
            <p className="text-lg font-bold text-[#111827]">{stats.streak}<span className="text-xs text-[#6b7280] ml-0.5">d</span></p>
          </div>
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Calendar size={14} className="text-blue-500" />
              <span className="text-xs text-[#6b7280]">This Week</span>
            </div>
            <p className="text-lg font-bold text-[#111827]">{weeklyStats.daysActive}</p>
          </div>
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Trophy size={14} className="text-yellow-500" />
              <span className="text-xs text-[#6b7280]">Total</span>
            </div>
            <p className="text-lg font-bold text-[#111827]">{stats.totalWorkouts}</p>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="px-4 mb-3 flex gap-2">
        <button
          onClick={() => setViewMode('checklist')}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${viewMode === 'checklist' ? 'bg-blue-600 text-white' : 'bg-white border border-[#e5e7eb] text-[#6b7280]'}`}
        >
          Checklist ({completedCount}/{totalExercises})
        </button>
        <button
          onClick={() => setViewMode('full')}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${viewMode === 'full' ? 'bg-blue-600 text-white' : 'bg-white border border-[#e5e7eb] text-[#6b7280]'}`}
        >
          Full Program
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-4">
        <div className="h-2 rounded-full bg-[#e5e7eb]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && (
          <p className="text-xs text-green-600 font-semibold mt-1 text-center">Workout Complete!</p>
        )}
      </div>

      {viewMode === 'checklist' ? (
        /* Exercise Checklist */
        <div className="px-4 space-y-1.5">
          {exercises.length > 0 ? exercises.map((ex, i) => {
            const key = `ex-${i}`;
            const done = completed[key] || false;
            return (
              <button
                key={key}
                onClick={() => toggleExercise(key)}
                className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  done
                    ? 'border-green-200 bg-green-50'
                    : 'border-[#e5e7eb] bg-white hover:border-gray-300 shadow-sm'
                }`}
              >
                <div
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                    done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'
                  }`}
                >
                  {done && <Check size={14} strokeWidth={3} />}
                </div>
                <p className={`text-sm flex-1 ${done ? 'line-through text-[#9ca3af]' : 'text-[#111827]'}`}>
                  {ex}
                </p>
              </button>
            );
          }) : (
            <div className="text-center py-8">
              <p className="text-sm text-[#6b7280]">No exercises detected in your program. Switch to &quot;Full Program&quot; view to see your workout.</p>
            </div>
          )}
        </div>
      ) : (
        /* Full Program View */
        <div className="px-4 chat-message text-sm">
          <ReactMarkdown>{activeProgram.content}</ReactMarkdown>
        </div>
      )}

      <Navigation />
    </div>
  );
}

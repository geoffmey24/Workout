'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Check, RotateCcw, Flame, Trophy, Calendar } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import WorkoutTimer from '@/components/WorkoutTimer';
import { DAYS, WORKOUTS } from '@/lib/workout-data';
import { getWorkoutStats, recordWorkoutCompletion, getWeeklyStats, WorkoutStats } from '@/lib/workout-stats';

export default function ProgressPage() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState({ workoutsThisWeek: 0, daysActive: 0 });
  const [workoutDone, setWorkoutDone] = useState(false);

  useEffect(() => {
    setStats(getWorkoutStats());
    setWeeklyStats(getWeeklyStats());
  }, []);

  const workout = WORKOUTS[selectedDay];
  const day = DAYS.find((d) => d.id === selectedDay)!;

  const toggleExercise = (key: string) => {
    setCompleted((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalExercises = workout.sections.reduce((acc, s) => acc + s.exercises.length, 0);
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  useEffect(() => {
    if (completedCount === totalExercises && totalExercises > 0 && !workoutDone) {
      setWorkoutDone(true);
      const updated = recordWorkoutCompletion(selectedDay);
      setStats(updated);
      setWeeklyStats(getWeeklyStats());
    }
  }, [completedCount, totalExercises, selectedDay, workoutDone]);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <Link href="/" className="text-[#6b7280] hover:text-[#111827]">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-sm text-[#111827]">Workout Tracker</h1>
        <button
          onClick={() => { setCompleted({}); setWorkoutDone(false); }}
          className="ml-auto text-[#6b7280] hover:text-[#111827]"
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
            <p className="text-lg font-bold text-[#111827]">{weeklyStats.daysActive}<span className="text-xs text-[#6b7280] ml-0.5">/{DAYS.length}</span></p>
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

      {/* Day Selector */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {DAYS.map((d) => (
          <button
            key={d.id}
            onClick={() => { setSelectedDay(d.id); setCompleted({}); setWorkoutDone(false); }}
            className={`flex-shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              selectedDay === d.id
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-[#e5e7eb] text-[#6b7280] shadow-sm'
            }`}
          >
            {d.icon} {d.name}
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-4">
        <div className="flex justify-between text-xs text-[#6b7280] mb-1">
          <span>{day.subtitle}</span>
          <span>{completedCount}/{totalExercises}</span>
        </div>
        <div className="h-2 rounded-full bg-[#e5e7eb]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              progress === 100 ? 'bg-green-500' : 'bg-blue-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && (
          <p className="text-xs text-green-600 font-semibold mt-1 text-center">Workout Complete!</p>
        )}
      </div>

      {/* Timer */}
      <div className="px-4 mb-4">
        <WorkoutTimer />
      </div>

      {/* Exercises */}
      <div className="px-4 space-y-4">
        {workout.sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">
              {section.title}
            </h3>
            <div className="space-y-1.5">
              {section.exercises.map((ex) => {
                const key = `${selectedDay}-${section.title}-${ex.name}`;
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
                        done
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {done && <Check size={14} strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'line-through text-[#9ca3af]' : 'text-[#111827]'}`}>
                        {ex.name}
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        {ex.sets}x{ex.reps} · Rest: {ex.rest}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Navigation />
    </div>
  );
}

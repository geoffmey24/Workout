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

  // Mark workout complete when all exercises done
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
      <div className="flex items-center gap-3 border-b border-[#262626] px-4 py-3">
        <Link href="/" className="text-[#a3a3a3] hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-sm">Workout Tracker</h1>
        <button
          onClick={() => { setCompleted({}); setWorkoutDone(false); }}
          className="ml-auto text-[#a3a3a3] hover:text-white"
          title="Reset"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Streak & Stats Bar */}
      {stats && (
        <div className="px-4 py-3 flex gap-3">
          <div className="flex-1 rounded-xl bg-[#171717] border border-[#262626] p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Flame size={14} className="text-orange-500" />
              <span className="text-xs text-[#a3a3a3]">Streak</span>
            </div>
            <p className="text-lg font-bold">{stats.streak}<span className="text-xs text-[#a3a3a3] ml-0.5">d</span></p>
          </div>
          <div className="flex-1 rounded-xl bg-[#171717] border border-[#262626] p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Calendar size={14} className="text-blue-500" />
              <span className="text-xs text-[#a3a3a3]">This Week</span>
            </div>
            <p className="text-lg font-bold">{weeklyStats.daysActive}<span className="text-xs text-[#a3a3a3] ml-0.5">/{DAYS.length}</span></p>
          </div>
          <div className="flex-1 rounded-xl bg-[#171717] border border-[#262626] p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Trophy size={14} className="text-yellow-500" />
              <span className="text-xs text-[#a3a3a3]">Total</span>
            </div>
            <p className="text-lg font-bold">{stats.totalWorkouts}</p>
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
                ? 'bg-red-600 text-white'
                : 'bg-[#171717] border border-[#262626] text-[#a3a3a3]'
            }`}
          >
            {d.icon} {d.name}
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-4">
        <div className="flex justify-between text-xs text-[#a3a3a3] mb-1">
          <span>{day.subtitle}</span>
          <span>{completedCount}/{totalExercises}</span>
        </div>
        <div className="h-2 rounded-full bg-[#262626]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              progress === 100 ? 'bg-green-500' : 'bg-red-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && (
          <p className="text-xs text-green-500 font-semibold mt-1 text-center">Workout Complete!</p>
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-2">
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
                        ? 'border-green-600/30 bg-green-600/10'
                        : 'border-[#262626] bg-[#171717] hover:border-[#404040]'
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                        done
                          ? 'border-green-500 bg-green-500 text-black'
                          : 'border-[#404040]'
                      }`}
                    >
                      {done && <Check size={14} strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'line-through text-[#a3a3a3]' : ''}`}>
                        {ex.name}
                      </p>
                      <p className="text-xs text-[#a3a3a3]">
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

'use client';

import { useState } from 'react';
import { ArrowLeft, Check, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import WorkoutTimer from '@/components/WorkoutTimer';
import { DAYS, WORKOUTS } from '@/lib/workout-data';

export default function ProgressPage() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const workout = WORKOUTS[selectedDay];
  const day = DAYS.find((d) => d.id === selectedDay)!;

  const toggleExercise = (key: string) => {
    setCompleted((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalExercises = workout.sections.reduce((acc, s) => acc + s.exercises.length, 0);
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#262626] px-4 py-3">
        <Link href="/" className="text-[#a3a3a3] hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-sm">Workout Tracker</h1>
        <button
          onClick={() => setCompleted({})}
          className="ml-auto text-[#a3a3a3] hover:text-white"
          title="Reset"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 px-4 py-4 overflow-x-auto">
        {DAYS.map((d) => (
          <button
            key={d.id}
            onClick={() => { setSelectedDay(d.id); setCompleted({}); }}
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
            className="h-full rounded-full bg-red-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
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
                        {ex.sets}×{ex.reps} · Rest: {ex.rest}
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

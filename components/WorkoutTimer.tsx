'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';

interface WorkoutTimerProps {
  compact?: boolean;
}

export default function WorkoutTimer({ compact }: WorkoutTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'stopwatch' | 'rest'>('stopwatch');
  const [restPreset, setRestPreset] = useState(90);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (mode === 'rest' && prev <= 1) {
          setIsRunning(false);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return mode === 'rest' ? prev - 1 : prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, mode]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setSeconds(mode === 'rest' ? restPreset : 0);
  }, [mode, restPreset]);

  const startRest = (preset: number) => {
    setMode('rest');
    setRestPreset(preset);
    setSeconds(preset);
    setIsRunning(true);
  };

  const format = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const isFinished = mode === 'rest' && seconds === 0 && !isRunning;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Timer size={14} className="text-blue-600" />
        <span className={`text-sm font-mono font-bold ${isFinished ? 'text-green-600 animate-pulse' : 'text-[#111827]'}`}>
          {format(seconds)}
        </span>
        <button
          onClick={() => isRunning ? setIsRunning(false) : (mode === 'stopwatch' ? (setIsRunning(true)) : startRest(restPreset))}
          className="p-1 rounded bg-gray-100 hover:bg-gray-200"
        >
          {isRunning ? <Pause size={12} /> : <Play size={12} />}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">
          {mode === 'rest' ? 'Rest Timer' : 'Stopwatch'}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => { setMode('stopwatch'); setSeconds(0); setIsRunning(false); }}
            className={`px-2 py-1 rounded text-xs font-medium ${mode === 'stopwatch' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-[#6b7280]'}`}
          >
            Stopwatch
          </button>
          <button
            onClick={() => { setMode('rest'); setSeconds(restPreset); setIsRunning(false); }}
            className={`px-2 py-1 rounded text-xs font-medium ${mode === 'rest' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-[#6b7280]'}`}
          >
            Rest
          </button>
        </div>
      </div>

      <div className={`text-center text-5xl font-mono font-extrabold mb-4 ${isFinished ? 'text-green-600 animate-pulse' : 'text-[#111827]'}`}>
        {format(seconds)}
      </div>

      {isFinished && (
        <p className="text-center text-sm text-green-600 mb-3 font-semibold">Time to work!</p>
      )}

      <div className="flex gap-2 justify-center mb-4">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} />}
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={reset}
          className="rounded-xl bg-gray-100 p-2.5 hover:bg-gray-200 transition-colors text-[#6b7280]"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {mode === 'rest' && (
        <div className="flex gap-2 justify-center">
          {[30, 60, 90, 120, 180].map((s) => (
            <button
              key={s}
              onClick={() => startRest(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                restPreset === s && !isRunning ? 'bg-blue-600 text-white' : 'bg-gray-100 text-[#6b7280] hover:bg-gray-200'
              }`}
            >
              {s < 60 ? `${s}s` : `${s / 60}m`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

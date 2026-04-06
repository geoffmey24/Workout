'use client';

import { useState, useEffect, useCallback } from 'react';
import MaterialIcon from './MaterialIcon';

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
        <MaterialIcon icon="timer" size={14} className="text-primary" />
        <span className={`text-sm font-mono font-bold ${isFinished ? 'text-emerald-500 animate-pulse' : 'text-on-surface'}`}>
          {format(seconds)}
        </span>
        <button
          onClick={() => isRunning ? setIsRunning(false) : (mode === 'stopwatch' ? (setIsRunning(true)) : startRest(restPreset))}
          className="p-1 rounded-xl bg-surface-container-low hover:bg-surface-container-high"
        >
          <MaterialIcon icon={isRunning ? 'pause' : 'play_arrow'} size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline-variant/5 bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-label font-bold uppercase tracking-widest text-secondary">
          {mode === 'rest' ? 'Rest Timer' : 'Stopwatch'}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => { setMode('stopwatch'); setSeconds(0); setIsRunning(false); }}
            className={`px-2 py-1 rounded-xl text-xs font-medium ${mode === 'stopwatch' ? 'bg-primary text-white' : 'bg-surface-container-low text-secondary'}`}
          >
            Stopwatch
          </button>
          <button
            onClick={() => { setMode('rest'); setSeconds(restPreset); setIsRunning(false); }}
            className={`px-2 py-1 rounded-xl text-xs font-medium ${mode === 'rest' ? 'bg-primary text-white' : 'bg-surface-container-low text-secondary'}`}
          >
            Rest
          </button>
        </div>
      </div>

      <div className={`text-center text-5xl font-mono font-extrabold mb-4 ${isFinished ? 'text-emerald-500 animate-pulse' : 'text-on-surface'}`}>
        {format(seconds)}
      </div>

      {isFinished && (
        <p className="text-center text-sm text-emerald-500 mb-3 font-semibold">Time to work!</p>
      )}

      <div className="flex gap-2 justify-center mb-4">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-container transition-colors"
        >
          <MaterialIcon icon={isRunning ? 'pause' : 'play_arrow'} size={16} />
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={reset}
          className="rounded-xl bg-surface-container-low p-2.5 hover:bg-surface-container-high transition-colors text-secondary"
        >
          <MaterialIcon icon="refresh" size={16} />
        </button>
      </div>

      {mode === 'rest' && (
        <div className="flex gap-2 justify-center">
          {[30, 60, 90, 120, 180].map((s) => (
            <button
              key={s}
              onClick={() => startRest(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                restPreset === s && !isRunning ? 'bg-primary text-white' : 'bg-surface-container-low text-secondary hover:bg-surface-container-high'
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

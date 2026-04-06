'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/MaterialIcon';
import {
  getActiveProgram, getProfile, saveProfile,
  saveBodyStat,
  getDiagnostic, saveDiagnostic, clearDiagnosticSkipped,
  addWorkoutLog, calculate1RM, getStrengthLevel, getRpeFactor,
  StrengthDiagnostic, DiagnosticEntry,
} from '@/lib/simple-storage';

/* ── Coach Bubble (same as program page) ─────────────────── */

function CoachBubble({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
        <MaterialIcon icon="person" size={20} className="text-white" />
      </div>
      <div className="bg-surface-container-lowest rounded-xl rounded-tl-sm px-4 py-3 border border-outline-variant/5 text-sm text-secondary shadow-sm max-w-[85%]">
        {message}
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

function roundTo5(n: number): number { return Math.round(n / 5) * 5; }

function detectEquipment(content: string): 'barbell' | 'dumbbell' | 'bodyweight' {
  const lower = content.toLowerCase();
  if (lower.includes('barbell') || lower.includes('squat rack') || lower.includes('bench press') || lower.includes('deadlift') || lower.includes('overhead press')) return 'barbell';
  if (lower.includes('dumbbell') || lower.includes('db ') || lower.includes('goblet')) return 'dumbbell';
  return 'bodyweight';
}

const BARBELL_EXERCISES = ['Barbell Back Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row'];
const DUMBBELL_EXERCISES = ['Goblet Squat', 'Dumbbell Bench Press', 'Romanian Deadlift', 'DB Overhead Press', 'DB Row'];

const RPE_OPTIONS = [
  { rpe: 6, label: 'RPE 6', desc: 'Comfortable. Could have done 4+ more reps easily.', bgClass: 'bg-emerald-50 border-emerald-200', textClass: 'text-emerald-700' },
  { rpe: 7, label: 'RPE 7', desc: 'Moderate effort. Could have done 2-3 more reps.', bgClass: 'bg-lime-50 border-lime-200', textClass: 'text-lime-700' },
  { rpe: 8, label: 'RPE 8', desc: 'Challenging. Could have done 1-2 more reps.', bgClass: 'bg-yellow-50 border-yellow-200', textClass: 'text-yellow-700', badge: 'IDEAL TARGET' },
  { rpe: 9, label: 'RPE 9', desc: 'Very hard. Maybe 1 more rep with good form.', bgClass: 'bg-orange-50 border-orange-200', textClass: 'text-orange-700' },
  { rpe: 10, label: 'RPE 10', desc: 'Maximal. Could not have done another rep.', bgClass: 'bg-red-50 border-red-200', textClass: 'text-red-700' },
];

const LEVEL_ORDER = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];

function getOverallLevel(entries: DiagnosticEntry[]): string {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    const l = e.level || 'Intermediate';
    counts[l] = (counts[l] || 0) + 1;
  }
  let best = 'Intermediate';
  let bestCount = 0;
  for (const [level, count] of Object.entries(counts)) {
    if (count > bestCount) { best = level; bestCount = count; }
  }
  return best;
}

function getLevelIndex(level: string): number {
  return LEVEL_ORDER.indexOf(level);
}


/* ── Main Component ──────────────────────────────────────── */

type Phase = 'bodyweight' | 'exercises' | 'warmup1' | 'warmup2' | 'warmup3' | 'working' | 'rpe' | 'rpe_retry' | 'rest' | 'summary';

export default function DiagnosticPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('bodyweight');
  const [slideDir, setSlideDir] = useState<'forward' | 'backward'>('forward');
  const [slideKey, setSlideKey] = useState(0);

  // Body weight
  const [bodyWeight, setBodyWeight] = useState('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');

  // Exercise selection
  const [allExercises, setAllExercises] = useState<string[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [equipType, setEquipType] = useState<'barbell' | 'dumbbell' | 'bodyweight'>('barbell');

  // Current exercise ramping
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [set1Weight, setSet1Weight] = useState('');
  const [set2Weight, setSet2Weight] = useState('');
  const [set3Weight, setSet3Weight] = useState('');
  const [set4Weight, setSet4Weight] = useState('');
  const [workingReps, setWorkingReps] = useState('');
  const [selectedRpe, setSelectedRpe] = useState<number | null>(null);
  const [rpeAttempts, setRpeAttempts] = useState(0);
  const [rpeMessage, setRpeMessage] = useState('');

  // Rest timer
  const [restTime, setRestTime] = useState(150);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results
  const [results, setResults] = useState<DiagnosticEntry[]>([]);

  // Init
  useEffect(() => {
    const prog = getActiveProgram();
    if (prog) {
      const eq = detectEquipment(prog.content);
      setEquipType(eq);
      if (eq === 'barbell') {
        setAllExercises([...BARBELL_EXERCISES]);
        setSelectedExercises([...BARBELL_EXERCISES]);
      } else if (eq === 'dumbbell') {
        setAllExercises([...DUMBBELL_EXERCISES]);
        setSelectedExercises([...DUMBBELL_EXERCISES]);
      }
    }
  }, []);

  // Slide helper
  const goForward = useCallback((nextPhase: Phase) => {
    setSlideDir('forward');
    setSlideKey(k => k + 1);
    setPhase(nextPhase);
  }, []);

  const goBackward = useCallback((prevPhase: Phase) => {
    setSlideDir('backward');
    setSlideKey(k => k + 1);
    setPhase(prevPhase);
  }, []);

  // Rest timer logic
  useEffect(() => {
    if (phase === 'rest') {
      setRestTime(150);
      restRef.current = setInterval(() => {
        setRestTime(t => {
          if (t <= 1) {
            if (restRef.current) clearInterval(restRef.current);
            goForward('warmup1');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, [phase, goForward]);

  // Progress calculation
  const totalExercises = selectedExercises.length;
  const getProgress = (): number => {
    if (phase === 'bodyweight') return 0;
    if (phase === 'exercises') return 5;
    if (phase === 'summary') return 100;
    // Each exercise has 6 sub-phases (warmup1-3, working, rpe, rest)
    const exProgress = (currentExIdx / totalExercises) * 85;
    const phaseMap: Record<string, number> = { warmup1: 0, warmup2: 15, warmup3: 30, working: 45, rpe: 60, rpe_retry: 60, rest: 75 };
    const subProgress = ((phaseMap[phase] || 0) / 85) * (85 / totalExercises);
    return Math.min(5 + exProgress + subProgress, 99);
  };

  // Default starting weight
  const defaultStart = equipType === 'dumbbell' ? 15 : 45;

  // Handle completing Set 1 (warmup)
  const handleSet1Done = () => {
    const w = parseFloat(set1Weight) || defaultStart;
    setSet1Weight(String(w));
    const suggested = roundTo5(w * 1.3);
    setSet2Weight(String(suggested));
    goForward('warmup2');
  };

  // Handle completing Set 2 (build)
  const handleSet2Done = () => {
    const w = parseFloat(set2Weight) || defaultStart;
    setSet2Weight(String(w));
    const suggested = roundTo5(w * 1.15);
    setSet3Weight(String(suggested));
    goForward('warmup3');
  };

  // Handle completing Set 3 (build)
  const handleSet3Done = () => {
    const w = parseFloat(set3Weight) || defaultStart;
    setSet3Weight(String(w));
    const suggested = roundTo5(w * 1.1);
    setSet4Weight(String(suggested));
    setWorkingReps('');
    goForward('working');
  };

  // Handle completing Set 4 (working set)
  const handleWorkingDone = () => {
    if (!set4Weight || !workingReps) return;
    setSelectedRpe(null);
    setRpeMessage('');
    goForward('rpe');
  };

  // Handle RPE selection
  const handleRpeSelect = (rpe: number) => {
    setSelectedRpe(rpe);

    if (rpe === 6 && rpeAttempts < 3) {
      // Too light — retry
      setRpeMessage("That was too light. Let's add weight and try one more set.");
      setRpeAttempts(a => a + 1);
      const currentW = parseFloat(set4Weight) || 0;
      const bump = equipType === 'dumbbell' ? 5 : roundTo5(currentW * 0.1 + 5);
      setSet4Weight(String(roundTo5(currentW + bump)));
      setWorkingReps('');
      setTimeout(() => goForward('rpe_retry'), 300);
      return;
    }

    // All other RPEs: log the result
    const w = parseFloat(set4Weight) || 0;
    const r = parseInt(workingReps) || 1;
    const bw = parseFloat(bodyWeight) || 180;
    const rawEstimated1RM = Math.round(w * (1 + r / 30));
    const rpeFactor = getRpeFactor(rpe);
    const adjusted1RM = Math.round(rawEstimated1RM * rpeFactor);
    const bwRatio = parseFloat((adjusted1RM / bw).toFixed(2));
    const exerciseName = selectedExercises[currentExIdx];
    const level = getStrengthLevel(exerciseName, bwRatio);

    const entry: DiagnosticEntry = {
      exercise: exerciseName,
      workingWeight: w,
      reps: r,
      rpe,
      rawEstimated1RM,
      adjusted1RM,
      bwRatio,
      level,
      estimated1RM: adjusted1RM,
    };

    const newResults = [...results, entry];
    setResults(newResults);

    // Messages based on RPE
    const messages: Record<number, string> = {
      6: "That was too light but we've hit max retries. Logging it.",
      7: "Good data. Logging this as your working weight.",
      8: "Perfect. This is your sweet spot. Logging it.",
      9: "Solid effort. We'll program just below this.",
      10: "That was a true max — great data point but we'll train below this to keep you safe.",
    };
    setRpeMessage(messages[rpe] || '');

    // Move to next exercise or summary
    setTimeout(() => {
      if (currentExIdx + 1 < selectedExercises.length) {
        setCurrentExIdx(currentExIdx + 1);
        setSet1Weight(String(defaultStart));
        setSet2Weight('');
        setSet3Weight('');
        setSet4Weight('');
        setWorkingReps('');
        setSelectedRpe(null);
        setRpeAttempts(0);
        setRpeMessage('');
        goForward('rest');
      } else {
        goForward('summary');
      }
    }, 1200);
  };

  // Skip rest
  const skipRest = () => {
    if (restRef.current) clearInterval(restRef.current);
    setSet1Weight(String(defaultStart));
    goForward('warmup1');
  };

  // Save diagnostic
  const handleSave = () => {
    const bw = parseFloat(bodyWeight) || 0;
    const overallLevel = getOverallLevel(results);
    const diagnostic: StrengthDiagnostic = {
      bodyWeight: bw,
      bodyWeightUnit: unit,
      date: new Date().toISOString().slice(0, 10),
      entries: results,
      overallLevel,
    };
    saveDiagnostic(diagnostic);
    clearDiagnosticSkipped();

    // Save body weight to body stats
    saveBodyStat({ date: diagnostic.date, weight: bw });

    // Save each exercise as workout log baseline
    for (const e of results) {
      addWorkoutLog({
        exercise: e.exercise,
        weight: e.workingWeight,
        reps: e.reps,
        sets: 1,
        date: diagnostic.date,
        estimated1RM: e.adjusted1RM,
      });
    }

    // Update profile if exists
    const profile = getProfile();
    if (profile) {
      saveProfile({ ...profile });
    }

    router.push('/');
  };

  // Bodyweight only — redirect
  if (equipType === 'bodyweight') {
    return (
      <div className="min-h-screen bg-surface">
        <div className="fixed top-0 w-full z-50 h-16 bg-slate-50/80 backdrop-blur-md flex items-center gap-3 px-4">
          <button onClick={() => router.push('/')} className="text-secondary hover:text-on-surface"><MaterialIcon icon="arrow_back" size={20} /></button>
          <h1 className="font-bold text-sm font-headline text-on-surface">Strength Assessment</h1>
        </div>
        <div className="h-16" />
        <div className="px-4 py-6">
          <CoachBubble message="Bodyweight programs don't need weight prescriptions. You're all set!" />
          <button onClick={() => router.push('/')}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white hover:bg-primary-container transition-colors flex items-center justify-center gap-2">
            Back to Home <MaterialIcon icon="arrow_forward" size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <style>{`
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        .slide-forward { animation: slideInRight 300ms ease forwards; }
        .slide-backward { animation: slideInLeft 300ms ease forwards; }
      `}</style>

      {/* Header */}
      <div className="fixed top-0 w-full z-50 h-16 bg-slate-50/80 backdrop-blur-md flex items-center gap-3 px-4">
        <button onClick={() => {
          if (phase === 'bodyweight') router.push('/');
          else if (phase === 'exercises') goBackward('bodyweight');
          else if (phase === 'warmup1' && currentExIdx === 0) goBackward('exercises');
          // Don't allow back during exercise flow to prevent state issues
        }} className="text-secondary hover:text-on-surface">
          <MaterialIcon icon="arrow_back" size={20} />
        </button>
        <h1 className="font-bold text-sm text-on-surface flex-1">Strength Assessment</h1>
        {phase !== 'bodyweight' && phase !== 'summary' && (
          <span className="text-xs text-on-surface-variant">
            {phase === 'exercises' ? '1/2' : `${currentExIdx + 1}/${totalExercises}`}
          </span>
        )}
      </div>
      <div className="h-16" />

      {/* Progress bar */}
      <div className="h-1 bg-outline-variant">
        <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${getProgress()}%` }} />
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-24">
        <div key={slideKey} className={slideDir === 'forward' ? 'slide-forward' : 'slide-backward'}>

          {/* BODY WEIGHT STEP */}
          {phase === 'bodyweight' && (
            <>
              <CoachBubble message="First, what's your current body weight?" />
              <div className="space-y-6">
                <div className="text-center py-4">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={bodyWeight}
                    onChange={e => setBodyWeight(e.target.value)}
                    placeholder="180"
                    className="text-6xl font-bold text-primary text-center w-full bg-transparent border-none outline-none placeholder-[#1e3a5f]/20"
                    autoFocus
                  />
                  <p className="text-sm text-secondary mt-2">{unit}</p>
                </div>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setUnit('lbs')}
                    className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors ${unit === 'lbs' ? 'bg-primary text-white' : 'bg-surface-container-lowest border border-outline-variant text-secondary'}`}>
                    lbs
                  </button>
                  <button onClick={() => setUnit('kg')}
                    className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors ${unit === 'kg' ? 'bg-primary text-white' : 'bg-surface-container-lowest border border-outline-variant text-secondary'}`}>
                    kg
                  </button>
                </div>
                <button onClick={() => { if (bodyWeight && parseFloat(bodyWeight) > 0) goForward('exercises'); }}
                  disabled={!bodyWeight || parseFloat(bodyWeight) <= 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white hover:bg-primary-container transition-colors disabled:opacity-40">
                  Next <MaterialIcon icon="arrow_forward" size={16} />
                </button>
              </div>
            </>
          )}

          {/* EXERCISE SELECTION STEP */}
          {phase === 'exercises' && (
            <>
              <CoachBubble message="We'll test these movements to calibrate your program:" />
              <div className="space-y-3 mb-6">
                {allExercises.map(ex => {
                  const isSelected = selectedExercises.includes(ex);
                  return (
                    <div key={ex}
                      className={`flex items-center justify-between rounded-xl border p-4 min-h-[56px] transition-all ${isSelected ? 'border-primary bg-primary/10' : 'border-outline-variant bg-surface-container-lowest opacity-50'}`}>
                      <div className="flex items-center gap-3">
                        <MaterialIcon icon="fitness_center" size={20} className="text-primary" />
                        <span className="text-sm font-semibold text-on-surface">{ex}</span>
                      </div>
                      <button onClick={() => {
                        if (isSelected && selectedExercises.length > 2) {
                          setSelectedExercises(prev => prev.filter(e => e !== ex));
                        } else if (!isSelected) {
                          setSelectedExercises(prev => [...prev, ex]);
                        }
                      }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-primary/10 text-primary hover:bg-red-50 hover:text-red-500' : 'bg-outline-variant text-secondary'}`}>
                        {isSelected ? <MaterialIcon icon="close" size={14} /> : <MaterialIcon icon="check" size={14} />}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-secondary mb-4 text-center">Tap X to remove exercises you can&apos;t do. Minimum 2 required.</p>
              <button onClick={() => {
                setCurrentExIdx(0);
                setSet1Weight(String(defaultStart));
                goForward('warmup1');
              }}
                disabled={selectedExercises.length < 2}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white hover:bg-primary-container transition-colors disabled:opacity-40">
                Start Testing ({selectedExercises.length} exercises) <MaterialIcon icon="arrow_forward" size={16} />
              </button>
            </>
          )}

          {/* WARM-UP SET 1 */}
          {phase === 'warmup1' && (
            <>
              <CoachBubble message={`${selectedExercises[currentExIdx]} — Set 1 (Warm-up). Start with ${equipType === 'dumbbell' ? '10-15 lb dumbbells' : 'just the bar (45 lbs)'} or a very light weight. Do 10 easy reps to warm up the movement pattern.`} />
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-5">
                <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-1">Exercise {currentExIdx + 1} of {totalExercises}</p>
                <h2 className="text-xl font-bold text-primary mb-6">{selectedExercises[currentExIdx]}</h2>
                <div className="mb-6">
                  <label className="block text-xs font-medium text-secondary mb-2">Weight used ({unit})</label>
                  <input type="number" inputMode="decimal" value={set1Weight}
                    onChange={e => setSet1Weight(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-4 text-2xl font-bold text-center text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus />
                </div>
                <button onClick={handleSet1Done}
                  disabled={!set1Weight || parseFloat(set1Weight) <= 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white hover:bg-primary-container transition-colors disabled:opacity-40">
                  Done — Next Set <MaterialIcon icon="arrow_forward" size={16} />
                </button>
              </div>
            </>
          )}

          {/* BUILD SET 2 */}
          {phase === 'warmup2' && (
            <>
              <CoachBubble message={`${selectedExercises[currentExIdx]} — Set 2 (Build). Add about 20-30% more weight. Do 5 reps. Focus on form.`} />
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-5">
                <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-1">Exercise {currentExIdx + 1} of {totalExercises}</p>
                <h2 className="text-xl font-bold text-primary mb-2">{selectedExercises[currentExIdx]}</h2>
                <p className="text-xs text-on-surface-variant mb-6">Suggested: {set2Weight} {unit}</p>
                <div className="mb-6">
                  <label className="block text-xs font-medium text-secondary mb-2">Weight used ({unit})</label>
                  <input type="number" inputMode="decimal" value={set2Weight}
                    onChange={e => setSet2Weight(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-4 text-2xl font-bold text-center text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <button onClick={handleSet2Done}
                  disabled={!set2Weight || parseFloat(set2Weight) <= 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white hover:bg-primary-container transition-colors disabled:opacity-40">
                  Done — Next Set <MaterialIcon icon="arrow_forward" size={16} />
                </button>
              </div>
            </>
          )}

          {/* BUILD SET 3 */}
          {phase === 'warmup3' && (
            <>
              <CoachBubble message={`${selectedExercises[currentExIdx]} — Set 3 (Build). Add another 10-20%. Do 3 reps.`} />
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-5">
                <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-1">Exercise {currentExIdx + 1} of {totalExercises}</p>
                <h2 className="text-xl font-bold text-primary mb-2">{selectedExercises[currentExIdx]}</h2>
                <p className="text-xs text-on-surface-variant mb-6">Suggested: {set3Weight} {unit}</p>
                <div className="mb-6">
                  <label className="block text-xs font-medium text-secondary mb-2">Weight used ({unit})</label>
                  <input type="number" inputMode="decimal" value={set3Weight}
                    onChange={e => setSet3Weight(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-4 text-2xl font-bold text-center text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <button onClick={handleSet3Done}
                  disabled={!set3Weight || parseFloat(set3Weight) <= 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white hover:bg-primary-container transition-colors disabled:opacity-40">
                  Done — Next Set <MaterialIcon icon="arrow_forward" size={16} />
                </button>
              </div>
            </>
          )}

          {/* WORKING SET 4 */}
          {phase === 'working' && (
            <>
              <CoachBubble message={`${selectedExercises[currentExIdx]} — Working Set. Now the real test. Add a bit more weight and do AS MANY REPS as you can with GOOD FORM. Stop when your form starts to break down. Do NOT go to absolute failure — leave 1-2 reps in the tank.`} />
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-5">
                <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-1">Exercise {currentExIdx + 1} of {totalExercises}</p>
                <h2 className="text-xl font-bold text-primary mb-2">{selectedExercises[currentExIdx]}</h2>
                <p className="text-xs text-on-surface-variant mb-6">Suggested: {set4Weight} {unit}</p>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-2">Weight used ({unit})</label>
                    <input type="number" inputMode="decimal" value={set4Weight}
                      onChange={e => setSet4Weight(e.target.value)}
                      className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-4 text-2xl font-bold text-center text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-2">Reps completed</label>
                    <input type="number" inputMode="numeric" value={workingReps}
                      onChange={e => setWorkingReps(e.target.value)}
                      placeholder="8"
                      className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-4 text-2xl font-bold text-center text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder-[#1e3a5f]/20" />
                  </div>
                </div>
                {set4Weight && workingReps && parseFloat(set4Weight) > 0 && parseInt(workingReps) > 0 && (
                  <p className="text-xs text-primary font-medium mb-4 text-center">
                    Est. 1RM: {calculate1RM(parseFloat(set4Weight), parseInt(workingReps))} {unit}
                  </p>
                )}
                <button onClick={handleWorkingDone}
                  disabled={!set4Weight || !workingReps || parseFloat(set4Weight) <= 0 || parseInt(workingReps) <= 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white hover:bg-primary-container transition-colors disabled:opacity-40">
                  Rate Difficulty <MaterialIcon icon="arrow_forward" size={16} />
                </button>
              </div>
            </>
          )}

          {/* RPE SELECTION */}
          {(phase === 'rpe' || phase === 'rpe_retry') && (
            <>
              <CoachBubble message={phase === 'rpe_retry'
                ? "That was too light. Let's add weight and try one more set. How hard was this one?"
                : "How hard was that last set?"} />
              {phase === 'rpe_retry' && (
                <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-5 mb-4">
                  <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-1">{selectedExercises[currentExIdx]} — Retry</p>
                  <div className="space-y-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-2">Weight ({unit})</label>
                      <input type="number" inputMode="decimal" value={set4Weight}
                        onChange={e => setSet4Weight(e.target.value)}
                        className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-4 text-2xl font-bold text-center text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-2">Reps completed</label>
                      <input type="number" inputMode="numeric" value={workingReps}
                        onChange={e => setWorkingReps(e.target.value)}
                        placeholder="8"
                        className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-4 text-2xl font-bold text-center text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder-[#1e3a5f]/20" />
                    </div>
                  </div>
                </div>
              )}
              {rpeMessage && selectedRpe !== null && (
                <div className="rounded-xl bg-blue-50 border border-primary/20 px-4 py-3 mb-4">
                  <p className="text-sm text-primary font-medium">{rpeMessage}</p>
                </div>
              )}
              {(!selectedRpe || phase === 'rpe_retry') && (
                <div className="space-y-3">
                  {RPE_OPTIONS.map(opt => (
                    <button key={opt.rpe} onClick={() => handleRpeSelect(opt.rpe)}
                      disabled={phase === 'rpe_retry' && (!set4Weight || !workingReps || parseFloat(set4Weight) <= 0 || parseInt(workingReps) <= 0)}
                      className={`w-full flex items-start gap-3 rounded-xl border p-4 min-h-[64px] transition-all text-left ${opt.bgClass} hover:shadow-sm disabled:opacity-40`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${opt.textClass}`}>{opt.label}</p>
                          {opt.badge && (
                            <span className="text-[9px] font-bold bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">{opt.badge}</span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${opt.textClass} opacity-80`}>{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* REST TIMER */}
          {phase === 'rest' && (
            <>
              <CoachBubble message="Rest 2-3 minutes before the next exercise. Shake it out, stay warm, hydrate." />
              <div className="flex flex-col items-center py-8">
                <div className="relative w-48 h-48 mb-6">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" stroke="#c4c7cb" strokeWidth="6" fill="none" />
                    <circle cx="50" cy="50" r="45"
                      stroke="#00113a"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - restTime / 150)}`}
                      className="transition-all duration-1000 ease-linear" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-primary">
                      {Math.floor(restTime / 60)}:{String(restTime % 60).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-secondary mt-1">remaining</span>
                  </div>
                </div>
                <p className="text-sm text-on-surface-variant mb-4">
                  Next: <span className="font-semibold text-on-surface">{selectedExercises[currentExIdx]}</span>
                </p>
                <button onClick={skipRest}
                  className="rounded-xl border border-outline-variant bg-surface-container-lowest px-6 py-2.5 text-sm font-medium text-secondary hover:text-on-surface hover:border-primary/40 transition-colors">
                  Skip Rest
                </button>
              </div>
            </>
          )}

          {/* RESULTS SUMMARY */}
          {phase === 'summary' && (
            <>
              <CoachBubble message="Here's your strength profile. Your program will use these numbers to prescribe exact weights for every exercise." />
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-5 shadow-sm">
                <div className="text-center mb-5">
                  <MaterialIcon icon="monitor_weight" size={32} className="mx-auto text-primary mb-2" />
                  <h2 className="text-lg font-bold text-on-surface">Your Strength Profile</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Body weight: {bodyWeight} {unit}</p>
                </div>

                <div className="space-y-4 mb-6">
                  {results.map((r, i) => (
                    <div key={i} className="rounded-xl bg-surface border border-outline-variant p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-sm text-on-surface">{r.exercise}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.level === 'Elite' ? 'bg-purple-100 text-purple-700' :
                          r.level === 'Advanced' ? 'bg-blue-100 text-blue-700' :
                          r.level === 'Intermediate' ? 'bg-emerald-100 text-emerald-700' :
                          r.level === 'Novice' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{r.level}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mb-2">
                        {r.workingWeight} {unit} x {r.reps} reps @ RPE {r.rpe}
                      </p>
                      <p className="text-xs text-primary font-medium mb-3">
                        Est. 1RM: {r.adjusted1RM} {unit} ({r.bwRatio.toFixed(2)}x bodyweight)
                      </p>
                      {/* Level progress bar */}
                      <div className="flex gap-0.5">
                        {LEVEL_ORDER.map((level, li) => (
                          <div key={level} className={`flex-1 h-2 rounded-full ${
                            li <= getLevelIndex(r.level)
                              ? r.level === 'Elite' ? 'bg-purple-400' :
                                r.level === 'Advanced' ? 'bg-blue-400' :
                                r.level === 'Intermediate' ? 'bg-emerald-400' :
                                r.level === 'Novice' ? 'bg-yellow-400' :
                                'bg-gray-300'
                              : 'bg-outline-variant'
                          }`} />
                        ))}
                      </div>
                      <div className="flex justify-between mt-1">
                        {LEVEL_ORDER.map(level => (
                          <span key={level} className={`text-[8px] ${level === r.level ? 'text-on-surface font-bold' : 'text-secondary'}`}>
                            {level.slice(0, 3)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overall */}
                <div className="text-center mb-6 py-3 rounded-xl bg-primary/5">
                  <p className="text-xs text-secondary uppercase tracking-wider">Overall Level</p>
                  <p className="text-lg font-bold text-primary">{getOverallLevel(results)}</p>
                </div>

                <p className="text-xs text-on-surface-variant text-center mb-4">
                  Your program will use these numbers to prescribe exact weights for every exercise.
                </p>
                <button onClick={handleSave}
                  className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                  <MaterialIcon icon="check" size={18} /> Save and Start Training
                </button>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Completed exercises sidebar (non-summary phases) */}
      {results.length > 0 && phase !== 'summary' && phase !== 'rest' && (
        <div className="px-4 pb-24">
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4">
            <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-2">Completed</p>
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-on-surface font-medium">{r.exercise}</span>
                <span className="text-on-surface-variant">{r.workingWeight} {unit} (1RM: {r.adjusted1RM})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

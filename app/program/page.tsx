'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Dumbbell, Save, Trash2, Clock, BookOpen, ClipboardPaste, Star, Check } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import ProgramMarkdown from '@/components/ProgramMarkdown';
import { SavedProgram } from '@/lib/program-history';
import { useAuth } from '@/components/AuthProvider';
import { dbGetSavedPrograms, dbSaveProgram, dbDeleteProgram, dbSetActiveProgram } from '@/lib/db';

interface Question {
  id: string;
  question: string;
  type: 'select' | 'text' | 'multi-select';
  options?: string[];
  conditional?: (answers: Record<string, string>) => boolean;
}

const QUESTIONS: Question[] = [
  { id: 'goal', question: 'What is your primary training goal?', type: 'select', options: ['Build Muscle', 'Lose Fat', 'Athletic Performance', 'General Fitness', 'Sport-Specific', 'Rehabilitation', 'Strength (Powerlifting)', 'Endurance'] },
  { id: 'days', question: 'How many days per week can you train?', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7'] },
  { id: 'duration', question: 'How long is each session?', type: 'select', options: ['20 minutes', '30 minutes', '45 minutes', '60 minutes', '75 minutes', '90+ minutes'] },
  { id: 'experience', question: 'Training experience level?', type: 'select', options: ['Complete Beginner', 'Beginner (< 1 year)', 'Intermediate (1-3 years)', 'Advanced (3-5 years)', 'Elite (5+ years)'] },
  { id: 'equipment', question: 'What equipment do you have access to?', type: 'select', options: ['Full Commercial Gym', 'Home Gym (barbell + rack + bench)', 'Home Gym (basic — dumbbells, bands)', 'Dumbbells Only', 'Kettlebells Only', 'Bodyweight Only', 'Outdoor / Park Equipment'] },
  { id: 'split', question: 'Preferred training split?', type: 'select', options: ['Full Body', 'Upper/Lower', 'Push/Pull/Legs', 'Bro Split (one muscle/day)', 'No preference — you decide'] },
  { id: 'priority', question: 'Any muscle groups or movements to prioritize?', type: 'text' },
  { id: 'injuries', question: 'Any injuries or limitations?', type: 'text' },
  {
    id: 'sport',
    question: 'What sport or activity are you training for?',
    type: 'text',
    conditional: (answers) => answers.goal === 'Sport-Specific' || answers.goal === 'Athletic Performance',
  },
  {
    id: 'sport_focus',
    question: 'What aspects do you want to focus on for your sport?',
    type: 'multi-select',
    options: ['Endurance', 'Power', 'Speed', 'Agility', 'Strength', 'Flexibility', 'Explosiveness', 'Conditioning', 'Skill Work', 'Injury Prevention'],
    conditional: (answers) => (answers.goal === 'Sport-Specific' || answers.goal === 'Athletic Performance') && !!answers.sport && answers.sport.toLowerCase() !== 'none',
  },
  {
    id: 'sport_movement',
    question: 'What specific movements or skills do you want to improve?',
    type: 'multi-select',
    options: [], // dynamically populated based on sport
    conditional: (answers) => (answers.goal === 'Sport-Specific' || answers.goal === 'Athletic Performance') && !!answers.sport && answers.sport.toLowerCase() !== 'none',
  },
  { id: 'cardio', question: 'Include conditioning/cardio work?', type: 'select', options: ['Yes — high intensity (HIIT, sprints)', 'Yes — steady state (running, cycling)', 'Yes — both', 'Minimal / warm-up only', 'No cardio'] },
  { id: 'recovery', question: 'Would you like to include a recovery day routine?', type: 'select', options: ['Yes', 'No'] },
  {
    id: 'recovery_equipment',
    question: 'What recovery equipment do you have access to?',
    type: 'multi-select',
    options: ['Foam roller', 'Massage gun', 'Lacrosse/tennis ball', 'Resistance bands', 'Yoga mat', 'Ice bath / cold plunge', 'Epsom salt bath', 'Sauna', 'Red light therapy', 'Compression boots (Normatec etc.)', 'Stretching strap', 'None — just bodyweight'],
    conditional: (answers) => answers.recovery === 'Yes',
  },
  {
    id: 'recovery_goal',
    question: 'What are your recovery goals?',
    type: 'multi-select',
    options: ['Reduce muscle soreness', 'Improve flexibility/mobility', 'Injury prevention', 'Mental recovery / stress relief', 'General wellness'],
    conditional: (answers) => answers.recovery === 'Yes',
  },
];

function getSportMovementOptions(sport: string): string[] {
  const s = sport.toLowerCase();
  if (s.includes('golf')) return ['Swing distance', 'Swing consistency', 'Rotational power', 'Hip mobility', 'Putting stability', 'Core stability', 'Shoulder flexibility'];
  if (s.includes('tennis')) return ['Serve power', 'Lateral agility', 'Shoulder endurance', 'Wrist stability', 'Court coverage speed', 'Core rotation', 'Injury prevention'];
  if (s.includes('baseball') || s.includes('softball')) return ['Bat speed', 'Throwing velocity', 'Rotational power', 'Sprint speed', 'Shoulder durability', 'Hip rotation', 'Grip strength'];
  if (s.includes('basketball')) return ['Vertical jump', 'Lateral quickness', 'Shooting endurance', 'Ankle stability', 'Sprint speed', 'Core strength', 'Upper body power'];
  if (s.includes('soccer') || s.includes('football') && !s.includes('american')) return ['Sprint speed', 'Kicking power', 'Endurance', 'Agility', 'Heading power', 'Balance', 'Injury prevention'];
  if (s.includes('american football') || s.includes('football')) return ['Explosive power', 'Sprint speed', 'Tackling strength', 'Agility', 'Vertical jump', 'Core stability', 'Conditioning'];
  if (s.includes('swim')) return ['Stroke power', 'Shoulder mobility', 'Core rotation', 'Kick strength', 'Endurance', 'Flip turn speed', 'Breathing efficiency'];
  if (s.includes('run') || s.includes('marathon') || s.includes('track')) return ['Speed', 'Endurance', 'Stride efficiency', 'Hip flexibility', 'Injury prevention', 'Hill power', 'Recovery between runs'];
  if (s.includes('cycling') || s.includes('bike')) return ['Pedaling power', 'Endurance', 'Hill climbing', 'Core stability', 'Hip flexibility', 'Sprint power', 'Recovery'];
  if (s.includes('box') || s.includes('mma') || s.includes('martial')) return ['Punching power', 'Footwork speed', 'Cardio endurance', 'Core strength', 'Shoulder endurance', 'Hip mobility', 'Grip strength'];
  if (s.includes('volleyball')) return ['Vertical jump', 'Shoulder power', 'Lateral quickness', 'Core stability', 'Wrist strength', 'Endurance', 'Ankle stability'];
  if (s.includes('hockey')) return ['Skating power', 'Shot power', 'Core rotation', 'Agility', 'Endurance', 'Hip mobility', 'Upper body strength'];
  if (s.includes('climb') || s.includes('boulder')) return ['Grip strength', 'Pull-up power', 'Core tension', 'Finger strength', 'Shoulder stability', 'Flexibility', 'Endurance'];
  if (s.includes('crossfit')) return ['Olympic lifting', 'Gymnastics skills', 'Endurance', 'Grip strength', 'Mobility', 'Double-unders', 'Muscle-ups'];
  // Generic fallback
  return ['Power', 'Speed', 'Endurance', 'Flexibility', 'Injury prevention', 'Agility', 'Core strength'];
}

export default function ProgramPage() {
  const { user } = useAuth();
  const [view, setView] = useState<'menu' | 'intake' | 'result' | 'saved' | 'paste'>('menu');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [multiSelections, setMultiSelections] = useState<string[]>([]);
  const [program, setProgram] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [pasteInput, setPasteInput] = useState('');
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>([]);
  const [viewingProgram, setViewingProgram] = useState<SavedProgram | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refreshPrograms = async () => {
    if (user) setSavedPrograms(await dbGetSavedPrograms(user.id));
  };
  useEffect(() => { refreshPrograms(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Get applicable questions (skip conditional ones that don't apply)
  const applicableQuestions = QUESTIONS.filter(q => !q.conditional || q.conditional(answers));

  // Find current question index in the applicable list
  const getNextStep = (currentStep: number, currentAnswers: Record<string, string>): number => {
    let nextIdx = currentStep + 1;
    while (nextIdx < QUESTIONS.length) {
      const q = QUESTIONS[nextIdx];
      if (!q.conditional || q.conditional(currentAnswers)) return nextIdx;
      nextIdx++;
    }
    return QUESTIONS.length; // past end = complete
  };

  const getPrevStep = (currentStep: number): number => {
    let prevIdx = currentStep - 1;
    while (prevIdx >= 0) {
      const q = QUESTIONS[prevIdx];
      if (!q.conditional || q.conditional(answers)) return prevIdx;
      prevIdx--;
    }
    return 0;
  };

  const currentQ = step < QUESTIONS.length ? QUESTIONS[step] : null;
  const isComplete = !currentQ || (currentQ.conditional && !currentQ.conditional(answers) && step >= QUESTIONS.length - 1);
  const totalApplicable = applicableQuestions.length;
  const currentApplicableIdx = currentQ ? applicableQuestions.indexOf(currentQ) : totalApplicable;
  const progressPercent = Math.round((currentApplicableIdx / totalApplicable) * 100);

  const selectAnswer = (value: string) => {
    const newAnswers = { ...answers, [currentQ!.id]: value };
    setAnswers(newAnswers);
    setStep(getNextStep(step, newAnswers));
  };

  const toggleMultiSelect = (value: string) => {
    setMultiSelections(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const submitMultiSelect = () => {
    const val = multiSelections.length > 0 ? multiSelections.join(', ') : 'General';
    const newAnswers = { ...answers, [currentQ!.id]: val };
    setAnswers(newAnswers);
    setMultiSelections([]);
    setStep(getNextStep(step, newAnswers));
  };

  const submitText = () => {
    const val = textInput.trim() || 'None';
    const newAnswers = { ...answers, [currentQ!.id]: val };
    setAnswers(newAnswers);
    setTextInput('');
    setStep(getNextStep(step, newAnswers));
  };

  const generateProgram = async () => {
    setLoading(true);
    const recoveryEquipment = answers.recovery_equipment || 'Bodyweight only';
    const recoveryGoals = answers.recovery_goal || 'General wellness';
    const recoverySection = answers.recovery === 'Yes'
      ? `\n- Include recovery days: Yes
- Recovery equipment available: ${recoveryEquipment}
- Recovery goals: ${recoveryGoals}

CRITICAL RECOVERY DAY INSTRUCTIONS:
Include dedicated RECOVERY DAY(s) on the off-days in the weekly schedule. For each recovery day:
1. You MUST incorporate EVERY piece of recovery equipment the user listed: ${recoveryEquipment}
   - For each piece of equipment, include a specific activity with duration and instructions
   - Example: "Red light therapy — 15 min on sore muscle groups" or "Sauna — 15-20 min at moderate heat"
   - Example: "Compression boots — 20 min on legs" or "Ice bath — 3-5 min cold immersion"
2. Include specific timing for each activity (e.g., "Foam roll quads — 2 min each side")
3. Format with a bold day header like **Day X — Recovery Day**
4. Use [EXERCISE_TABLE] format with columns: Activity | Duration | Notes
5. Target these recovery goals: ${recoveryGoals}
6. Total routine should be 20-40 minutes
7. Do NOT suggest equipment the user does not have`
      : '';

    const prompt = `Generate a complete, detailed training program based on these parameters:
- Goal: ${answers.goal}
- Training days/week: ${answers.days}
- Session length: ${answers.duration}
- Experience: ${answers.experience}
- Equipment: ${answers.equipment}
- Preferred split: ${answers.split || 'No preference'}
- Priority areas: ${answers.priority || 'None'}
- Injuries/limitations: ${answers.injuries || 'None'}
- Sport focus: ${answers.sport || 'General'}${answers.sport_focus ? `\n- Sport aspects to focus on: ${answers.sport_focus}` : ''}${answers.sport_movement ? `\n- Specific movements/skills to improve: ${answers.sport_movement}` : ''}
- Cardio preference: ${answers.cardio || 'No preference'}${recoverySection}

Build a full weekly program. For each day, include: warm-up, main lifts (sets x reps, RPE, rest), accessories, conditioning if requested, and cool-down. Use tables for the exercises. Include progression rules and deload guidance.`;

    try {
      // Switch to result view immediately to show streaming content
      setProgram('');
      setView('result');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], stream: true }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const { text } = JSON.parse(jsonStr);
            if (text) {
              fullText += text;
              setProgram(fullText);
            }
          } catch { /* skip */ }
        }
      }

      if (!fullText) throw new Error('Empty response');
    } catch {
      setProgram('Unable to generate program. Please check your API key and try again.');
    } finally { setLoading(false); }
  };

  const handleSaveProgram = async () => {
    console.log('[handleSaveProgram] called, program length:', program?.length, 'user:', user?.id, 'status:', saveStatus);
    if (!program || !user || saveStatus === 'saving') {
      console.log('[handleSaveProgram] early return — missing program/user or already saving');
      return;
    }
    setSaveStatus('saving');
    try {
      // Check localStorage capacity first
      const contentSize = new Blob([program]).size;
      console.log('[handleSaveProgram] program content size:', (contentSize / 1024).toFixed(1), 'KB');
      if (contentSize > 4 * 1024 * 1024) {
        throw new Error('Program too large for storage');
      }

      const programId = crypto.randomUUID();
      const title = `${answers.goal || 'Custom'} - ${answers.days || '?'} days/wk`;
      const saved: SavedProgram = {
        id: programId,
        title,
        answers,
        content: program,
        createdAt: Date.now(),
      };
      console.log('[handleSaveProgram] saving program:', saved.id, saved.title);
      await dbSaveProgram(user.id, saved);
      console.log('[handleSaveProgram] dbSaveProgram completed');
      await dbSetActiveProgram(user.id, saved.id);
      console.log('[handleSaveProgram] dbSetActiveProgram completed');

      // Force re-read from storage to confirm save worked
      const freshPrograms = await dbGetSavedPrograms(user.id);
      setSavedPrograms(freshPrograms);
      const found = freshPrograms.find(p => p.id === programId);
      console.log('[handleSaveProgram] verified save:', found ? 'FOUND in list' : 'NOT found in list', 'total programs:', freshPrograms.length);

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('[handleSaveProgram] FAILED:', err);
      // Try to recover corrupted localStorage
      try {
        const raw = localStorage.getItem('elite-coach-saved-programs');
        if (raw) {
          JSON.parse(raw); // test if valid JSON
        }
      } catch {
        console.warn('[handleSaveProgram] localStorage corrupted, clearing');
        localStorage.removeItem('elite-coach-saved-programs');
      }
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleSetActive = async (p: SavedProgram) => {
    if (!user) return;
    await dbSetActiveProgram(user.id, p.id);
    await refreshPrograms();
  };

  const handleSavePastedWorkout = async () => {
    if (!pasteInput.trim() || !user) return;
    const saved: SavedProgram = {
      id: crypto.randomUUID(),
      title: 'My Custom Workout',
      answers: { source: 'manual input' },
      content: pasteInput.trim(),
      createdAt: Date.now(),
    };
    await dbSaveProgram(user.id, saved);
    await dbSetActiveProgram(user.id, saved.id);
    await refreshPrograms();
    setPasteInput('');
    setView('saved');
  };

  const handleDeleteProgram = async (id: string) => {
    console.log('[ProgramPage] deleting program:', id);
    await dbDeleteProgram(id);
    console.log('[ProgramPage] delete complete, refreshing list');
    setConfirmDelete(null);
    await refreshPrograms();
    if (viewingProgram?.id === id) { setViewingProgram(null); setView('menu'); }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  // Delete confirmation dialog
  const DeleteConfirmDialog = () => {
    if (!confirmDelete) return null;
    const prog = savedPrograms.find(p => p.id === confirmDelete);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <h3 className="font-bold text-lg text-[#111827] mb-2">Delete Program?</h3>
          <p className="text-sm text-[#6b7280] mb-1">
            Are you sure you want to delete <strong>{prog?.title || 'this program'}</strong>?
          </p>
          <p className="text-xs text-[#9ca3af] mb-6">This can&apos;t be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(null)}
              className="flex-1 rounded-xl border border-[#e5e7eb] py-2.5 text-sm font-medium text-[#6b7280] hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteProgram(confirmDelete)}
              className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Viewing a saved program
  if (viewingProgram) {
    return (
      <div className="min-h-screen pb-24 bg-[#f8f9fa]">
        <DeleteConfirmDialog />
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
          <button onClick={() => { setViewingProgram(null); setView('saved'); }} className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate text-[#111827]">{viewingProgram.title}</h1>
            <p className="text-xs text-[#6b7280]">{formatDate(viewingProgram.createdAt)}</p>
          </div>
          <button
            onClick={() => { handleSetActive(viewingProgram); }}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Star size={14} /> Set Active
          </button>
          <button onClick={() => setConfirmDelete(viewingProgram.id)} className="p-1.5 rounded-lg text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
        </div>
        <div className="px-4 py-6"><ProgramMarkdown content={viewingProgram.content} /></div>
        <Navigation />
      </div>
    );
  }

  // Result view after generation
  if (view === 'result' && program) {
    return (
      <div className="min-h-screen pb-24 bg-[#f8f9fa]">
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
          <button onClick={() => { setProgram(null); setView('menu'); setStep(0); setAnswers({}); }} className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></button>
          <h1 className="font-bold text-sm flex-1 text-[#111827]">Your Custom Program</h1>
          <button
            onClick={handleSaveProgram}
            disabled={saveStatus === 'saving' || saveStatus === 'saved'}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
              saveStatus === 'saved' ? 'bg-green-600' : saveStatus === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'
            } disabled:opacity-70`}
          >
            {saveStatus === 'saving' ? (<><Loader2 size={14} className="animate-spin" /> Saving...</>) :
             saveStatus === 'saved' ? (<><Check size={14} /> Saved!</>) :
             saveStatus === 'error' ? (<><Save size={14} /> Retry</>) :
             (<><Save size={14} /> Save</>)}
          </button>
        </div>
        {saveStatus === 'saved' && (
          <div className="mx-4 mb-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 flex items-center gap-2">
            <Check size={16} className="text-green-600" />
            <span className="text-sm text-green-700 font-medium">Program saved and set as your active workout!</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="mx-4 mb-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5">
            <span className="text-sm text-red-700">Failed to save. Please try again.</span>
          </div>
        )}
        <div className="px-4 py-6"><ProgramMarkdown content={program} /></div>
        <Navigation />
      </div>
    );
  }

  // Saved programs list
  if (view === 'saved') {
    return (
      <div className="min-h-screen pb-24 bg-[#f8f9fa]">
        <DeleteConfirmDialog />
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
          <button onClick={() => setView('menu')} className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></button>
          <h1 className="font-bold text-sm text-[#111827]">Saved Programs</h1>
        </div>
        <div className="px-4 py-4 space-y-3">
          {savedPrograms.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-[#6b7280]">No saved programs yet.</p>
              <p className="text-xs text-[#9ca3af] mt-1">Generate a program and save it to see it here.</p>
            </div>
          ) : savedPrograms.map((p) => (
            <div key={p.id} className={`flex items-center gap-3 rounded-xl border ${p.isActive ? 'border-blue-400 bg-blue-50/50' : 'border-[#e5e7eb] bg-white'} p-4 hover:border-blue-300 transition-colors shadow-sm`}>
              <button onClick={() => setViewingProgram(p)} className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate text-[#111827]">{p.title}</p>
                  {p.isActive && <span className="shrink-0 text-[10px] font-bold uppercase text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Active</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-[#6b7280]">
                  <Clock size={10} /><span>{formatDate(p.createdAt)}</span>
                </div>
              </button>
              {!p.isActive && <button onClick={() => handleSetActive(p)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Set as active workout"><Star size={16} /></button>}
              <button onClick={() => setConfirmDelete(p.id)} className="p-2 rounded-lg text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <Navigation />
      </div>
    );
  }

  // Paste existing workout
  if (view === 'paste') {
    return (
      <div className="min-h-screen pb-24 bg-[#f8f9fa]">
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
          <button onClick={() => { setView('menu'); setPasteInput(''); }} className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></button>
          <h1 className="font-bold text-sm text-[#111827]">Add Your Workout</h1>
        </div>
        <div className="px-4 py-6">
          <p className="text-sm text-[#6b7280] mb-4">
            Paste or type your existing workout plan below. Include exercises, sets, reps, and any notes. It will be saved as your active program.
          </p>
          <textarea
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            placeholder={"Example:\n\nMonday — Push Day\nBench Press 4x8\nOHP 3x10\nIncline DB Press 3x12\nLateral Raises 3x15\nTricep Pushdowns 3x12\n\nTuesday — Pull Day\n..."}
            rows={14}
            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm resize-none"
          />
          <button
            onClick={handleSavePastedWorkout}
            disabled={!pasteInput.trim()}
            className="w-full mt-4 rounded-xl bg-blue-600 py-4 font-bold text-sm text-white hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Save size={18} /> Save as Active Program
          </button>
        </div>
        <Navigation />
      </div>
    );
  }

  // Intake questionnaire
  if (view === 'intake') {
    const showComplete = step >= QUESTIONS.length || isComplete;
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
          <button onClick={() => { setView('menu'); setStep(0); setAnswers({}); setMultiSelections([]); }} className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></button>
          <h1 className="font-bold text-sm text-[#111827]">Generate My Program</h1>
        </div>
        <div className="px-4 py-8">
          <div className="mb-8">
            <div className="flex justify-between text-xs text-[#6b7280] mb-2">
              <span>Question {Math.min(currentApplicableIdx + 1, totalApplicable)} of {totalApplicable}</span>
              <span>{Math.min(progressPercent, 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#e5e7eb]">
              <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
            </div>
          </div>
          {!showComplete && currentQ ? (
            <div>
              <h2 className="text-xl font-bold mb-6 text-[#111827]">{currentQ.question}</h2>
              {(() => {
                const displayOptions = currentQ.id === 'sport_movement' ? getSportMovementOptions(answers.sport || '') : currentQ.options;
                return currentQ.type === 'select' ? (
                <div className="space-y-3">
                  {displayOptions?.map((opt) => (
                    <button key={opt} onClick={() => selectAnswer(opt)} className="w-full text-left rounded-xl border border-[#e5e7eb] bg-white p-4 text-sm text-[#111827] hover:border-blue-300 transition-colors shadow-sm">{opt}</button>
                  ))}
                </div>
              ) : currentQ.type === 'multi-select' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {displayOptions?.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => toggleMultiSelect(opt)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          multiSelections.includes(opt)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-[#e5e7eb] text-[#111827] hover:border-blue-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#6b7280]">Select all that apply</p>
                  <button onClick={submitMultiSelect} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">Next <ArrowRight size={16} /></button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitText()} placeholder="Type your answer (or press Enter to skip)" className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm" />
                  <button onClick={submitText} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">Next <ArrowRight size={16} /></button>
                </div>
              );
              })()}
              {step > 0 && <button onClick={() => setStep(getPrevStep(step))} className="mt-4 text-sm text-[#6b7280] hover:text-[#111827]">&larr; Back</button>}
            </div>
          ) : (
            <div className="text-center py-8">
              <Dumbbell size={48} className="mx-auto text-blue-600 mb-4" />
              <h2 className="text-xl font-bold mb-2 text-[#111827]">Ready to Generate</h2>
              <p className="text-sm text-[#6b7280] mb-6">Your personalized {answers.days}-day {answers.goal?.toLowerCase()} program</p>
              <div className="mb-6 rounded-xl bg-white border border-[#e5e7eb] p-4 text-left text-sm space-y-1 shadow-sm">
                {Object.entries(answers).filter(([, val]) => val && val !== 'None').map(([key, val]) => (<div key={key} className="flex justify-between"><span className="text-[#6b7280] capitalize">{key.replace('_', ' ')}</span><span className="text-[#111827] text-right max-w-[60%]">{val}</span></div>))}
              </div>
              <button onClick={generateProgram} disabled={loading} className="w-full rounded-xl bg-blue-600 py-4 font-bold text-sm text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? (<><Loader2 size={18} className="animate-spin" /> Generating...</>) : 'Generate My Program'}
              </button>
              <button onClick={() => setStep(0)} className="mt-3 text-sm text-[#6b7280] hover:text-[#111827]">Start over</button>
            </div>
          )}
        </div>
        <Navigation />
      </div>
    );
  }

  // Menu (default view)
  return (
    <div className="min-h-screen pb-24 bg-[#f8f9fa]">
      <DeleteConfirmDialog />
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <Link href="/" className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></Link>
        <h1 className="font-bold text-sm text-[#111827]">Programs</h1>
      </div>
      <div className="px-4 py-6 space-y-4">
        <div className="flex gap-3">
          <button onClick={() => { setView('intake'); setStep(0); setAnswers({}); setMultiSelections([]); }} className="flex-1 rounded-xl bg-blue-600 p-4 text-left text-white hover:bg-blue-700 transition-colors shadow-sm">
            <Dumbbell size={24} className="mb-2" />
            <h2 className="text-sm font-bold">Generate New</h2>
          </button>
          <button onClick={() => setView('paste')} className="flex-1 rounded-xl border border-[#e5e7eb] bg-white p-4 text-left hover:border-blue-300 transition-colors shadow-sm">
            <ClipboardPaste size={24} className="mb-2 text-[#6b7280]" />
            <h2 className="text-sm font-bold text-[#111827]">Paste Workout</h2>
          </button>
        </div>

        {/* Saved Programs */}
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-3">Saved Programs</h2>
          {savedPrograms.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-dashed border-[#d1d5db] bg-white">
              <BookOpen size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-[#6b7280]">No saved programs yet</p>
              <p className="text-xs text-[#9ca3af] mt-1">Generate or paste a program to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPrograms.map((p) => (
                <div key={p.id} className={`flex items-center gap-3 rounded-xl border ${p.isActive ? 'border-blue-400 bg-blue-50/50' : 'border-[#e5e7eb] bg-white'} p-4 hover:border-blue-300 transition-colors shadow-sm`}>
                  <button onClick={() => setViewingProgram(p)} className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate text-[#111827]">{p.title}</p>
                      {p.isActive && <span className="shrink-0 text-[10px] font-bold uppercase text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Active</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#6b7280]">
                      <Clock size={10} /><span>{formatDate(p.createdAt)}</span>
                    </div>
                  </button>
                  {!p.isActive && <button onClick={() => handleSetActive(p)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Set as active"><Star size={16} /></button>}
                  <button onClick={() => setConfirmDelete(p.id)} className="p-2 rounded-lg text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
}

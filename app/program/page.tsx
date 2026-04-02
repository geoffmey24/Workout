'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Dumbbell, Save, Trash2, Clock, BookOpen, ClipboardPaste, Star } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import Navigation from '@/components/Navigation';
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
    question: "What's your main recovery goal?",
    type: 'select',
    options: ['Reduce muscle soreness', 'Improve flexibility/mobility', 'Injury prevention', 'Mental recovery / stress relief', 'General wellness', 'All of the above'],
    conditional: (answers) => answers.recovery === 'Yes',
  },
];

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
    const recoverySection = answers.recovery === 'Yes'
      ? `\n- Include recovery days: Yes
- Recovery equipment available: ${answers.recovery_equipment || 'Bodyweight only'}
- Recovery goal: ${answers.recovery_goal || 'General wellness'}

IMPORTANT: Include dedicated RECOVERY DAY(s) on the off-days in the weekly schedule. For each recovery day, create a structured routine that:
1. ONLY uses the recovery equipment listed above (do not suggest equipment the user doesn't have)
2. Includes specific timing for each activity (e.g., "Foam roll quads — 2 min each side")
3. Is formatted the same way as workout days — with a bold day header and bullet point exercises
4. Targets the user's recovery goal: ${answers.recovery_goal || 'General wellness'}
5. Lasts 20-40 minutes total`
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
- Sport focus: ${answers.sport || 'General'}${answers.sport_focus ? `\n- Sport aspects to focus on: ${answers.sport_focus}` : ''}
- Cardio preference: ${answers.cardio || 'No preference'}${recoverySection}

Build a full weekly program. For each day, include: warm-up, main lifts (sets x reps, RPE, rest), accessories, conditioning if requested, and cool-down. Use tables for the exercises. Include progression rules and deload guidance.`;

    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProgram(data.response);
      setView('result');
    } catch {
      setProgram('Unable to generate program. Please check your API key and try again.');
      setView('result');
    } finally { setLoading(false); }
  };

  const handleSaveProgram = async () => {
    if (!program || !user) return;
    const saved: SavedProgram = {
      id: crypto.randomUUID(),
      title: `${answers.goal || 'Custom'} - ${answers.days || '?'} days/wk`,
      answers,
      content: program,
      createdAt: Date.now(),
    };
    await dbSaveProgram(user.id, saved);
    await refreshPrograms();
  };

  const handleSetActive = async (p: SavedProgram) => {
    if (!user) return;
    await dbSetActiveProgram(user.id, p.id);
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
    await dbDeleteProgram(id);
    await refreshPrograms();
    if (viewingProgram?.id === id) { setViewingProgram(null); setView('menu'); }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  // Viewing a saved program
  if (viewingProgram) {
    return (
      <div className="min-h-screen pb-24 bg-[#f8f9fa]">
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
        </div>
        <div className="px-4 py-6 chat-message text-sm"><ReactMarkdown>{viewingProgram.content}</ReactMarkdown></div>
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
          <button onClick={handleSaveProgram} className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"><Save size={14} /> Save</button>
        </div>
        <div className="px-4 py-6 chat-message text-sm"><ReactMarkdown>{program}</ReactMarkdown></div>
        <Navigation />
      </div>
    );
  }

  // Saved programs list
  if (view === 'saved') {
    return (
      <div className="min-h-screen pb-24 bg-[#f8f9fa]">
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
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4 hover:border-blue-300 transition-colors shadow-sm">
              <button onClick={() => setViewingProgram(p)} className="flex-1 text-left min-w-0">
                <p className="font-semibold text-sm truncate text-[#111827]">{p.title}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-[#6b7280]">
                  <Clock size={10} /><span>{formatDate(p.createdAt)}</span>
                </div>
              </button>
              <button onClick={() => handleSetActive(p)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Set as active workout"><Star size={16} /></button>
              <button onClick={() => handleDeleteProgram(p.id)} className="p-2 rounded-lg text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
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
              {currentQ.type === 'select' ? (
                <div className="space-y-3">
                  {currentQ.options?.map((opt) => (
                    <button key={opt} onClick={() => selectAnswer(opt)} className="w-full text-left rounded-xl border border-[#e5e7eb] bg-white p-4 text-sm text-[#111827] hover:border-blue-300 transition-colors shadow-sm">{opt}</button>
                  ))}
                </div>
              ) : currentQ.type === 'multi-select' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {currentQ.options?.map((opt) => (
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
              )}
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
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <Link href="/" className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></Link>
        <h1 className="font-bold text-sm text-[#111827]">Programs</h1>
      </div>
      <div className="px-4 py-8 space-y-4">
        <button onClick={() => { setView('intake'); setStep(0); setAnswers({}); setMultiSelections([]); }} className="w-full rounded-2xl bg-blue-600 p-6 text-left text-white hover:bg-blue-700 transition-colors shadow-sm">
          <Dumbbell size={32} className="mb-3" />
          <h2 className="text-lg font-bold">Generate New Program</h2>
          <p className="text-sm text-blue-100/70 mt-1">Answer a few questions and get a fully customized training plan from your AI coach.</p>
        </button>
        <button onClick={() => setView('paste')} className="w-full rounded-2xl border-2 border-dashed border-[#d1d5db] bg-white p-6 text-left hover:border-blue-300 transition-colors">
          <ClipboardPaste size={28} className="mb-3 text-[#6b7280]" />
          <h2 className="text-lg font-bold text-[#111827]">I Already Have a Workout</h2>
          <p className="text-sm text-[#6b7280] mt-1">Paste or type your existing routine and use it as your active program.</p>
        </button>
        <button onClick={() => setView('saved')} className="w-full rounded-2xl border border-[#e5e7eb] bg-white p-6 text-left hover:border-blue-300 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <BookOpen size={28} className="mb-3 text-blue-600" />
              <h2 className="text-lg font-bold text-[#111827]">Saved Programs</h2>
              <p className="text-sm text-[#6b7280] mt-1">{savedPrograms.length > 0 ? `${savedPrograms.length} program${savedPrograms.length !== 1 ? 's' : ''} saved` : 'No programs saved yet'}</p>
            </div>
            <ArrowRight size={20} className="text-[#9ca3af]" />
          </div>
        </button>
      </div>
      <Navigation />
    </div>
  );
}

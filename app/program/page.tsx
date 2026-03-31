'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Dumbbell, Save, Trash2, Clock, BookOpen } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import Navigation from '@/components/Navigation';
import { SavedProgram, getSavedPrograms, saveProgram, deleteProgram } from '@/lib/program-history';

interface Question {
  id: string;
  question: string;
  type: 'select' | 'text';
  options?: string[];
}

const QUESTIONS: Question[] = [
  { id: 'goal', question: 'What is your primary training goal?', type: 'select', options: ['Build Muscle', 'Lose Fat', 'Athletic Performance', 'General Fitness', 'Sport-Specific', 'Rehabilitation'] },
  { id: 'days', question: 'How many days per week can you train?', type: 'select', options: ['2', '3', '4', '5', '6'] },
  { id: 'duration', question: 'How long is each session?', type: 'select', options: ['30 minutes', '45 minutes', '60 minutes', '75 minutes', '90+ minutes'] },
  { id: 'experience', question: 'Training experience level?', type: 'select', options: ['Beginner (< 1 year)', 'Intermediate (1-3 years)', 'Advanced (3-5 years)', 'Elite (5+ years)'] },
  { id: 'equipment', question: 'What equipment do you have access to?', type: 'select', options: ['Full Gym', 'Home Gym (basic)', 'Dumbbells Only', 'Bodyweight Only', 'Barbell + Rack'] },
  { id: 'injuries', question: 'Any injuries or limitations?', type: 'text' },
  { id: 'sport', question: 'Sport or activity focus (optional)?', type: 'text' },
];

export default function ProgramPage() {
  const [view, setView] = useState<'menu' | 'intake' | 'result' | 'saved'>('menu');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [program, setProgram] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>([]);
  const [viewingProgram, setViewingProgram] = useState<SavedProgram | null>(null);

  useEffect(() => { setSavedPrograms(getSavedPrograms()); }, []);

  const currentQ = QUESTIONS[step];
  const isComplete = step >= QUESTIONS.length;

  const selectAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
    setStep(step < QUESTIONS.length - 1 ? step + 1 : QUESTIONS.length);
  };

  const submitText = () => {
    const val = textInput.trim() || 'None';
    setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
    setTextInput('');
    setStep(step < QUESTIONS.length - 1 ? step + 1 : QUESTIONS.length);
  };

  const generateProgram = async () => {
    setLoading(true);
    const prompt = `Generate a complete, detailed training program based on these parameters:\n- Goal: ${answers.goal}\n- Training days/week: ${answers.days}\n- Session length: ${answers.duration}\n- Experience: ${answers.experience}\n- Equipment: ${answers.equipment}\n- Injuries/limitations: ${answers.injuries || 'None'}\n- Sport focus: ${answers.sport || 'General'}\n\nBuild a full weekly program. For each day, include: warm-up, main lifts (sets x reps, RPE, rest), accessories, conditioning, and cool-down. Use tables for the exercises. Include progression rules.`;
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

  const handleSaveProgram = () => {
    if (!program) return;
    saveProgram({ id: crypto.randomUUID(), title: `${answers.goal} - ${answers.days} days/wk`, answers, content: program, createdAt: Date.now() });
    setSavedPrograms(getSavedPrograms());
  };

  const handleDeleteProgram = (id: string) => {
    deleteProgram(id);
    setSavedPrograms(getSavedPrograms());
    if (viewingProgram?.id === id) { setViewingProgram(null); setView('menu'); }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  if (viewingProgram) {
    return (
      <div className="min-h-screen pb-24 bg-[#f8f9fa]">
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
          <button onClick={() => { setViewingProgram(null); setView('saved'); }} className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate text-[#111827]">{viewingProgram.title}</h1>
            <p className="text-xs text-[#6b7280]">{formatDate(viewingProgram.createdAt)}</p>
          </div>
        </div>
        <div className="px-4 py-6 chat-message text-sm"><ReactMarkdown>{viewingProgram.content}</ReactMarkdown></div>
        <Navigation />
      </div>
    );
  }

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
                  <Clock size={10} /><span>{formatDate(p.createdAt)}</span><span>·</span><span>{p.answers.experience}</span>
                </div>
              </button>
              <button onClick={() => handleDeleteProgram(p.id)} className="p-2 rounded-lg text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <Navigation />
      </div>
    );
  }

  if (view === 'intake') {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
          <button onClick={() => { setView('menu'); setStep(0); setAnswers({}); }} className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></button>
          <h1 className="font-bold text-sm text-[#111827]">Generate My Program</h1>
        </div>
        <div className="px-4 py-8">
          <div className="mb-8">
            <div className="flex justify-between text-xs text-[#6b7280] mb-2">
              <span>Question {Math.min(step + 1, QUESTIONS.length)} of {QUESTIONS.length}</span>
              <span>{Math.round((Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#e5e7eb]">
              <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${(Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100}%` }} />
            </div>
          </div>
          {!isComplete ? (
            <div>
              <h2 className="text-xl font-bold mb-6 text-[#111827]">{currentQ.question}</h2>
              {currentQ.type === 'select' ? (
                <div className="space-y-3">
                  {currentQ.options?.map((opt) => (
                    <button key={opt} onClick={() => selectAnswer(opt)} className="w-full text-left rounded-xl border border-[#e5e7eb] bg-white p-4 text-sm text-[#111827] hover:border-blue-300 transition-colors shadow-sm">{opt}</button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <input value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitText()} placeholder="Type your answer (or press Enter to skip)" className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm" />
                  <button onClick={submitText} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">Next <ArrowRight size={16} /></button>
                </div>
              )}
              {step > 0 && <button onClick={() => setStep(step - 1)} className="mt-4 text-sm text-[#6b7280] hover:text-[#111827]">&larr; Back</button>}
            </div>
          ) : (
            <div className="text-center py-8">
              <Dumbbell size={48} className="mx-auto text-blue-600 mb-4" />
              <h2 className="text-xl font-bold mb-2 text-[#111827]">Ready to Generate</h2>
              <p className="text-sm text-[#6b7280] mb-6">Your personalized {answers.days}-day {answers.goal?.toLowerCase()} program</p>
              <div className="mb-6 rounded-xl bg-white border border-[#e5e7eb] p-4 text-left text-sm space-y-1 shadow-sm">
                {Object.entries(answers).map(([key, val]) => (<div key={key} className="flex justify-between"><span className="text-[#6b7280] capitalize">{key}</span><span className="text-[#111827]">{val}</span></div>))}
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

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <Link href="/" className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></Link>
        <h1 className="font-bold text-sm text-[#111827]">Programs</h1>
      </div>
      <div className="px-4 py-8 space-y-4">
        <button onClick={() => { setView('intake'); setStep(0); setAnswers({}); }} className="w-full rounded-2xl bg-blue-600 p-6 text-left text-white hover:bg-blue-700 transition-colors shadow-sm">
          <Dumbbell size={32} className="mb-3" />
          <h2 className="text-lg font-bold">Generate New Program</h2>
          <p className="text-sm text-blue-100/70 mt-1">Answer 7 questions and get a fully customized training plan from your AI coach.</p>
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

'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import Navigation from '@/components/Navigation';

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
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [program, setProgram] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState('');

  const currentQ = QUESTIONS[step];
  const isComplete = step >= QUESTIONS.length;

  const selectAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setStep(QUESTIONS.length);
    }
  };

  const submitText = () => {
    const val = textInput.trim() || 'None';
    setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
    setTextInput('');
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setStep(QUESTIONS.length);
    }
  };

  const generateProgram = async () => {
    setLoading(true);
    const prompt = `Generate a complete, detailed training program based on these parameters:
- Goal: ${answers.goal}
- Training days/week: ${answers.days}
- Session length: ${answers.duration}
- Experience: ${answers.experience}
- Equipment: ${answers.equipment}
- Injuries/limitations: ${answers.injuries || 'None'}
- Sport focus: ${answers.sport || 'General'}

Build a full weekly program. For each day, include: warm-up, main lifts (sets x reps, RPE, rest), accessories, conditioning, and cool-down. Use tables for the exercises. Include progression rules.`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProgram(data.response);
    } catch {
      setProgram('Unable to generate program. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (program) {
    return (
      <div className="min-h-screen pb-24">
        <div className="flex items-center gap-3 border-b border-[#262626] px-4 py-3">
          <button onClick={() => { setProgram(null); setStep(0); setAnswers({}); }} className="text-[#a3a3a3] hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-sm">Your Custom Program</h1>
        </div>
        <div className="px-4 py-6 chat-message text-sm">
          <ReactMarkdown>{program}</ReactMarkdown>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex items-center gap-3 border-b border-[#262626] px-4 py-3">
        <Link href="/" className="text-[#a3a3a3] hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-sm">Generate My Program</h1>
      </div>

      <div className="px-4 py-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-[#a3a3a3] mb-2">
            <span>Question {Math.min(step + 1, QUESTIONS.length)} of {QUESTIONS.length}</span>
            <span>{Math.round((Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#262626]">
            <div
              className="h-full rounded-full bg-red-600 transition-all duration-300"
              style={{ width: `${(Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        {!isComplete ? (
          <div>
            <h2 className="text-xl font-bold mb-6">{currentQ.question}</h2>
            {currentQ.type === 'select' ? (
              <div className="space-y-3">
                {currentQ.options?.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => selectAnswer(opt)}
                    className="w-full text-left rounded-xl border border-[#262626] bg-[#171717] p-4 text-sm hover:border-red-600/50 transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitText()}
                  placeholder="Type your answer (or press Enter to skip)"
                  className="w-full rounded-xl border border-[#262626] bg-[#171717] px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#a3a3a3] focus:border-red-600 focus:outline-none"
                />
                <button
                  onClick={submitText}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Next <ArrowRight size={16} />
                </button>
              </div>
            )}

            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="mt-4 text-sm text-[#a3a3a3] hover:text-white"
              >
                &larr; Back
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Dumbbell size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Ready to Generate</h2>
            <p className="text-sm text-[#a3a3a3] mb-6">
              Your personalized {answers.days}-day {answers.goal?.toLowerCase()} program
            </p>
            <div className="mb-6 rounded-xl bg-[#171717] border border-[#262626] p-4 text-left text-sm space-y-1">
              {Object.entries(answers).map(([key, val]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-[#a3a3a3] capitalize">{key}</span>
                  <span>{val}</span>
                </div>
              ))}
            </div>
            <button
              onClick={generateProgram}
              disabled={loading}
              className="w-full rounded-xl bg-red-600 py-4 font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Generating...
                </>
              ) : (
                'Generate My Program'
              )}
            </button>
            <button
              onClick={() => setStep(0)}
              className="mt-3 text-sm text-[#a3a3a3] hover:text-white"
            >
              Start over
            </button>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}

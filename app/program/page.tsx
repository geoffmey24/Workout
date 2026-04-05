'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ArrowRight, Loader2, Dumbbell, Save, Trash2, Clock,
  BookOpen, ClipboardPaste, Star, Check, Camera, Flame, Zap, Heart,
  Trophy, Shield, Award, Building2, User, TreePine, Mountain, Crown,
  Activity, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import ProgramMarkdown from '@/components/ProgramMarkdown';
import { useAuth } from '@/components/AuthProvider';
import {
  getPrograms,
  saveProgram,
  deleteProgram,
  getActiveProgram,
  setActiveProgram,
  migrateOldData,
  getProfile,
  saveEvent,
  clearEvent,
  StoredProgram,
} from '@/lib/simple-storage';
import { getSystemPrompt } from '@/lib/system-prompt';

/* ── Sport movement options (used in prompt) ─────────────── */

function getSportMovementOptions(sport: string): string[] {
  const s = sport.toLowerCase();
  if (s.includes('golf')) return ['Swing distance', 'Swing consistency', 'Rotational power', 'Hip mobility', 'Putting stability', 'Core stability', 'Shoulder flexibility'];
  if (s.includes('tennis')) return ['Serve power', 'Lateral agility', 'Shoulder endurance', 'Wrist stability', 'Court coverage speed', 'Core rotation', 'Injury prevention'];
  if (s.includes('baseball') || s.includes('softball')) return ['Bat speed', 'Throwing velocity', 'Rotational power', 'Sprint speed', 'Shoulder durability', 'Hip rotation', 'Grip strength'];
  if (s.includes('basketball')) return ['Vertical jump', 'Lateral quickness', 'Shooting endurance', 'Ankle stability', 'Sprint speed', 'Core strength', 'Upper body power'];
  if (s.includes('soccer') || (s.includes('football') && !s.includes('american'))) return ['Sprint speed', 'Kicking power', 'Endurance', 'Agility', 'Heading power', 'Balance', 'Injury prevention'];
  if (s.includes('american football') || s.includes('football')) return ['Explosive power', 'Sprint speed', 'Tackling strength', 'Agility', 'Vertical jump', 'Core stability', 'Conditioning'];
  if (s.includes('swim')) return ['Stroke power', 'Shoulder mobility', 'Core rotation', 'Kick strength', 'Endurance', 'Flip turn speed', 'Breathing efficiency'];
  if (s.includes('run') || s.includes('marathon') || s.includes('track')) return ['Speed', 'Endurance', 'Stride efficiency', 'Hip flexibility', 'Injury prevention', 'Hill power', 'Recovery between runs'];
  if (s.includes('cycling') || s.includes('bike')) return ['Pedaling power', 'Endurance', 'Hill climbing', 'Core stability', 'Hip flexibility', 'Sprint power', 'Recovery'];
  if (s.includes('box') || s.includes('mma') || s.includes('martial')) return ['Punching power', 'Footwork speed', 'Cardio endurance', 'Core strength', 'Shoulder endurance', 'Hip mobility', 'Grip strength'];
  if (s.includes('volleyball')) return ['Vertical jump', 'Shoulder power', 'Lateral quickness', 'Core stability', 'Wrist strength', 'Endurance', 'Ankle stability'];
  if (s.includes('hockey')) return ['Skating power', 'Shot power', 'Core rotation', 'Agility', 'Endurance', 'Hip mobility', 'Upper body strength'];
  if (s.includes('climb') || s.includes('boulder')) return ['Grip strength', 'Pull-up power', 'Core tension', 'Finger strength', 'Shoulder stability', 'Flexibility', 'Endurance'];
  if (s.includes('crossfit')) return ['Olympic lifting', 'Gymnastics skills', 'Endurance', 'Grip strength', 'Mobility', 'Double-unders', 'Muscle-ups'];
  return ['Power', 'Speed', 'Endurance', 'Flexibility', 'Injury prevention', 'Agility', 'Core strength'];
}

/* ── Step definitions ─────────────────────────────────────── */

interface StepDef {
  id: string;
  coach: string;
  conditional?: (a: Record<string, string>) => boolean;
}

const STEPS: StepDef[] = [
  { id: 'goal', coach: 'What are we training for?' },
  { id: 'sport', coach: 'What sport are you training for?', conditional: (a) => a.goal === 'Sport-Specific' || a.goal === 'Athletic Performance' },
  { id: 'event_training', coach: 'Are you training for a specific event or competition?' },
  { id: 'event_details', coach: 'Tell me about the event so I can periodize your training.', conditional: (a) => a.event_training === 'Yes' },
  { id: 'hero_training', coach: 'Want to train like a pro athlete? I can weave their methods into your program.' },
  { id: 'hero_athletes', coach: 'Which athlete(s) inspire you? I will incorporate their training principles.', conditional: (a) => a.hero_training === 'Yes' },
  { id: 'days', coach: 'How many days per week can you commit to training?' },
  { id: 'duration', coach: 'How long should each session be?' },
  { id: 'equipment', coach: 'What equipment do you have access to?' },
  { id: 'experience', coach: 'What is your current fitness level?' },
  { id: 'injuries', coach: 'Any injuries or limitations I should know about? Your safety comes first.' },
  { id: 'recovery', coach: 'Want me to include recovery day routines?' },
  { id: 'recovery_equipment', coach: 'What recovery tools do you have? I will use all of them.', conditional: (a) => a.recovery === 'Yes' },
  { id: 'summary', coach: 'Here is your training plan summary. Ready to build your program?' },
];

const GOALS = [
  { label: 'Build Muscle', value: 'Build Muscle', Icon: Dumbbell },
  { label: 'Lose Fat', value: 'Lose Fat', Icon: Flame },
  { label: 'Athletic Performance', value: 'Athletic Performance', Icon: Zap },
  { label: 'General Fitness', value: 'General Fitness', Icon: Heart },
  { label: 'Sport-Specific', value: 'Sport-Specific', Icon: Trophy },
  { label: 'Rehabilitation', value: 'Rehabilitation', Icon: Shield },
  { label: 'Strength', value: 'Strength (Powerlifting)', Icon: Award },
  { label: 'Endurance', value: 'Endurance', Icon: Activity },
];

const EQUIPMENT_OPTIONS = [
  { label: 'Full Commercial Gym', value: 'Full Commercial Gym', Icon: Building2 },
  { label: 'Barbell + Rack + Bench', value: 'Home Gym (barbell + rack + bench)', Icon: Dumbbell },
  { label: 'Dumbbells + Bands', value: 'Home Gym (basic \u2014 dumbbells, bands)', Icon: Activity },
  { label: 'Dumbbells Only', value: 'Dumbbells Only', Icon: Award },
  { label: 'Bodyweight Only', value: 'Bodyweight Only', Icon: User },
  { label: 'Outdoor / Park', value: 'Outdoor / Park Equipment', Icon: TreePine },
];

const FITNESS_LEVELS = [
  { label: 'Beginner', desc: 'New or less than 1 year training', value: 'Beginner (< 1 year)' , Icon: TrendingUp },
  { label: 'Intermediate', desc: '1-3 years consistent training', value: 'Intermediate (1-3 years)', Icon: Activity },
  { label: 'Advanced', desc: '3-5 years dedicated training', value: 'Advanced (3-5 years)', Icon: Mountain },
  { label: 'Elite', desc: '5+ years serious training', value: 'Elite (5+ years)', Icon: Crown },
];

const RECOVERY_TOOLS = [
  'Foam roller', 'Massage gun', 'Lacrosse/tennis ball', 'Resistance bands',
  'Yoga mat', 'Ice bath / cold plunge', 'Epsom salt bath', 'Sauna',
  'Red light therapy', 'Compression boots', 'Stretching strap',
];


/* ── Coach Bubble ─────────────────────────────────────────── */

function CoachBubble({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-[#e5e7eb] text-sm text-[#374151] max-w-[85%]">
        {message}
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */

export default function ProgramPage() {
  const { user } = useAuth();

  // ── Views & Navigation ──
  const [view, setView] = useState<'menu' | 'intake' | 'result' | 'saved' | 'paste'>('menu');

  // ── Intake step state ──
  const [currentStepId, setCurrentStepId] = useState('goal');
  const [slideDir, setSlideDir] = useState<'forward' | 'backward'>('forward');
  const [slideKey, setSlideKey] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [multiSelections, setMultiSelections] = useState<string[]>([]);
  const [textInput, setTextInput] = useState('');
  const [daysValue, setDaysValue] = useState(4);
  const [durationValue, setDurationValue] = useState(60);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');

  // ── Program state ──
  const [program, setProgram] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [savedPrograms, setSavedPrograms] = useState<(StoredProgram & { isActive?: boolean })[]>([]);
  const [viewingProgram, setViewingProgram] = useState<(StoredProgram & { isActive?: boolean }) | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [scanningGym, setScanningGym] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B'>('A');
  const scanFileRef = useRef<HTMLInputElement>(null);

  /* ── Computed step navigation ── */
  const applicableSteps = STEPS.filter(s => !s.conditional || s.conditional(answers));
  const currentStepIndex = applicableSteps.findIndex(s => s.id === currentStepId);
  const currentStepDef = currentStepIndex >= 0 ? applicableSteps[currentStepIndex] : applicableSteps[0];
  const progress = applicableSteps.length > 1 ? Math.round((currentStepIndex / (applicableSteps.length - 1)) * 100) : 0;

  const goNext = () => {
    const idx = applicableSteps.findIndex(s => s.id === currentStepId);
    if (idx >= 0 && idx < applicableSteps.length - 1) {
      setSlideDir('forward');
      setSlideKey(k => k + 1);
      setCurrentStepId(applicableSteps[idx + 1].id);
      setTextInput('');
    }
  };

  const goBack = () => {
    const idx = applicableSteps.findIndex(s => s.id === currentStepId);
    if (idx > 0) {
      setSlideDir('backward');
      setSlideKey(k => k + 1);
      setCurrentStepId(applicableSteps[idx - 1].id);
      setTextInput('');
    }
  };

  const selectAndAdvance = (key: string, value: string) => {
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);
    const newApplicable = STEPS.filter(s => !s.conditional || s.conditional(newAnswers));
    const idx = newApplicable.findIndex(s => s.id === currentStepId);
    if (idx >= 0 && idx < newApplicable.length - 1) {
      const nextId = newApplicable[idx + 1].id;
      setTimeout(() => {
        setSlideDir('forward');
        setSlideKey(k => k + 1);
        setCurrentStepId(nextId);
        setTextInput('');
      }, 150);
    }
  };

  const submitTextStep = (key: string) => {
    const val = textInput.trim() || 'None';
    const newAnswers = { ...answers, [key]: val };
    setAnswers(newAnswers);
    setTextInput('');
    const newApplicable = STEPS.filter(s => !s.conditional || s.conditional(newAnswers));
    const idx = newApplicable.findIndex(s => s.id === currentStepId);
    if (idx >= 0 && idx < newApplicable.length - 1) {
      setSlideDir('forward');
      setSlideKey(k => k + 1);
      setCurrentStepId(newApplicable[idx + 1].id);
    }
  };

  /* ── Core business logic (preserved) ── */

  const splitProgram = (text: string): { optionA: string; optionB: string } => {
    const patterns = [/\*\*OPTION B\*\*/i, /##\s*OPTION B/i, /OPTION B[:\s]/i];
    for (const pattern of patterns) {
      const match = text.search(pattern);
      if (match > 0) {
        return {
          optionA: text.slice(0, match).replace(/\*\*OPTION A\*\*|##\s*OPTION A|OPTION A[:\s]/i, '').trim(),
          optionB: text.slice(match).replace(/\*\*OPTION B\*\*|##\s*OPTION B|OPTION B[:\s]/i, '').trim(),
        };
      }
    }
    return { optionA: text, optionB: '' };
  };

  const refreshPrograms = () => {
    const programs = getPrograms();
    const active = getActiveProgram();
    const withActive = programs.map(p => ({ ...p, isActive: p.id === active?.id }));
    setSavedPrograms(withActive);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    migrateOldData();
    refreshPrograms();
    // Pre-fill from profile
    const profile = getProfile();
    if (profile) {
      const prefill: Record<string, string> = {};
      if (profile.primaryGoal) {
        const match = GOALS.find(g => g.value.toLowerCase().includes(profile.primaryGoal!.toLowerCase()));
        if (match) prefill.goal = match.value;
      }
      if (profile.fitnessLevel) {
        const match = FITNESS_LEVELS.find(l => l.value.toLowerCase().includes(profile.fitnessLevel!));
        if (match) prefill.experience = match.value;
      }
      if (profile.sport) prefill.sport = profile.sport;
      if (profile.injuries) prefill.injuries = profile.injuries;
      if (profile.equipmentAvailable) prefill.equipment = profile.equipmentAvailable;
      if (profile.preferredDuration) {
        const mins = parseInt(profile.preferredDuration);
        if (!isNaN(mins) && mins >= 20 && mins <= 120) setDurationValue(mins);
      }
      if (Object.keys(prefill).length > 0) setAnswers(prev => ({ ...prev, ...prefill }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  const generateProgram = async () => {
    setLoading(true);
    // Fill defaults for fields not in conversational flow
    const profile = getProfile();
    const fullAnswers: Record<string, string> = {
      ...answers,
      days: answers.days || String(daysValue),
      duration: answers.duration || `${durationValue} minutes`,
      split: answers.split || 'No preference \u2014 you decide',
      priority: answers.priority || 'None',
      cardio: answers.cardio || 'Yes \u2014 both',
      recovery_goal: answers.recovery_goal || 'General wellness',
    };
    const recoveryEquipment = fullAnswers.recovery_equipment || 'Bodyweight only';
    const recoveryGoals = fullAnswers.recovery_goal;
    const recoverySection = fullAnswers.recovery === 'Yes'
      ? `\n- Include recovery days: Yes
- Recovery equipment available: ${recoveryEquipment}
- Recovery goals: ${recoveryGoals}

CRITICAL RECOVERY DAY INSTRUCTIONS:
Include dedicated RECOVERY DAY(s) on the off-days in the weekly schedule. For each recovery day:
1. You MUST incorporate EVERY piece of recovery equipment the user listed: ${recoveryEquipment}
   - For each piece of equipment, include a specific activity with duration and instructions
   - Example: "Red light therapy \u2014 15 min on sore muscle groups" or "Sauna \u2014 15-20 min at moderate heat"
   - Example: "Compression boots \u2014 20 min on legs" or "Ice bath \u2014 3-5 min cold immersion"
2. Include specific timing for each activity (e.g., "Foam roll quads \u2014 2 min each side")
3. Format with a bold day header like **Day X \u2014 Recovery Day**
4. Format as pipe-separated lines: Activity | Duration | Notes
5. Target these recovery goals: ${recoveryGoals}
6. Total routine should be 20-40 minutes
7. Do NOT suggest equipment the user does not have`
      : '';

    const sportMovements = fullAnswers.sport ? getSportMovementOptions(fullAnswers.sport).join(', ') : '';

    const prompt = `Generate a complete, detailed training program based on these parameters:
- Goal: ${fullAnswers.goal}
- Training days/week: ${fullAnswers.days}
- Session length: ${fullAnswers.duration}
- Experience: ${fullAnswers.experience}
- Equipment: ${fullAnswers.equipment}
- Preferred split: ${fullAnswers.split}
- Priority areas: ${fullAnswers.priority}
- Injuries/limitations: ${fullAnswers.injuries || 'None'}
- Exercises to AVOID: ${(() => {
      const fromForm = fullAnswers.avoid_exercises || '';
      const fromProfile = profile?.dislikedExercises?.join(', ') || '';
      const combined = [fromForm, fromProfile].filter(Boolean).join(', ');
      return combined || 'None';
    })()}
- Sport focus: ${fullAnswers.sport || 'General'}${sportMovements ? `\n- Sport-specific movements to improve: ${sportMovements}` : ''}
- Cardio preference: ${fullAnswers.cardio}${recoverySection}
${fullAnswers.event_training === 'Yes' && fullAnswers.event_name && fullAnswers.event_date ? (() => {
  const eventD = new Date(fullAnswers.event_date);
  const now = new Date();
  const weeksUntil = Math.ceil((eventD.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `\n\nEVENT-BASED PERIODIZATION:
- Event: ${fullAnswers.event_name}
- Date: ${fullAnswers.event_date} (${weeksUntil} weeks from now)
- Structure the program as a periodized plan leading to this event:
  * Weeks 1-${Math.floor(weeksUntil * 0.4)}: Base/Building Phase (moderate volume, technique focus)
  * Weeks ${Math.floor(weeksUntil * 0.4) + 1}-${Math.floor(weeksUntil * 0.8)}: Intensity Phase (progressive overload, sport-specific)
  * Weeks ${Math.floor(weeksUntil * 0.8) + 1}-${weeksUntil - 1}: Peak Phase (high intensity, reduced volume)
  * Week ${weeksUntil}: Taper Week (50% volume, maintain intensity, full recovery)
  * Include a deload every 4th week (reduced volume by 40%)
- Label each phase clearly in the program`;
})() : ''}${fullAnswers.hero_training === 'Yes' && fullAnswers.hero_athletes ? `\n\nATHLETE INSPIRATION:
- Train like: ${fullAnswers.hero_athletes}
- Research and incorporate training principles known to be used by these athletes
- Reference their training philosophy in the program overview
- Adapt their methods to the user's experience level and equipment` : ''}

Generate TWO program options labeled **OPTION A** and **OPTION B**. Make them meaningfully different \u2014 different training splits, exercise selection, or intensity schemes. Both must match the user's goals and constraints.

For each option, include: warm-up, main lifts, accessories, conditioning if requested, and cool-down for each day. Format ALL exercises using pipe-separated lines with a header row like:
Exercise | Sets | Reps | RPE | Rest
Bench Press | 4 | 8 | 7-8 | 3 min
Do NOT use markdown table separators (|---|---|). Include progression rules and deload guidance for each option.`;

    try {
      setProgram('');
      setView('result');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], stream: true, systemPrompt: getSystemPrompt() }),
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
            if (text) { fullText += text; setProgram(fullText); }
          } catch { /* skip */ }
        }
      }
      if (!fullText) throw new Error('Empty response');
    } catch {
      setProgram('Unable to generate program. Please check your API key and try again.');
    } finally { setLoading(false); }
  };

  const handleSaveProgram = () => {
    if (!program || saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      const programId = crypto.randomUUID();
      const title = `${answers.goal || 'Custom'} - ${answers.days || daysValue} days/wk`;
      const { optionA, optionB } = splitProgram(program);
      const contentToSave = optionB ? (selectedOption === 'A' ? optionA : optionB) : program;
      const newProgram: StoredProgram = { id: programId, title, answers, content: contentToSave, createdAt: Date.now() };
      saveProgram(newProgram);
      setActiveProgram(newProgram);
      if (answers.event_training === 'Yes' && answers.event_name && answers.event_date) {
        saveEvent({ name: answers.event_name, date: answers.event_date });
      } else {
        clearEvent();
      }
      const verify = getPrograms();
      const found = verify.find(p => p.id === programId);
      if (!found) throw new Error('Verification failed');
      refreshPrograms();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleSetActive = (p: StoredProgram) => { setActiveProgram(p); refreshPrograms(); };

  const handleSavePastedWorkout = () => {
    if (!pasteInput.trim()) return;
    const saved: StoredProgram = { id: crypto.randomUUID(), title: 'My Custom Workout', answers: { source: 'manual input' }, content: pasteInput.trim(), createdAt: Date.now() };
    saveProgram(saved);
    setActiveProgram(saved);
    refreshPrograms();
    setPasteInput('');
    setView('saved');
  };

  const handleDeleteProgram = (id: string) => {
    deleteProgram(id);
    clearEvent();
    setConfirmDelete(null);
    refreshPrograms();
    if (viewingProgram?.id === id) { setViewingProgram(null); setView('menu'); }
  };

  const handleScanGym = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningGym(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
            { type: 'text', text: 'Look at this gym photo. List ONLY the equipment you can see. Return a JSON array of strings, nothing else. Example: ["Barbell", "Squat Rack", "Dumbbells"]. Just the JSON array.' }
          ] }],
          stream: false,
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const responseText = data.response || data.content || data.text || '';
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const equipment = JSON.parse(jsonMatch[0]) as string[];
        const detectedLower = equipment.map(eq => eq.toLowerCase());
        let bestMatch = 'Full Commercial Gym';
        if (detectedLower.some(eq => eq.includes('cable') || eq.includes('leg press') || eq.includes('smith') || eq.includes('lat pull'))) {
          bestMatch = 'Full Commercial Gym';
        } else if (detectedLower.some(eq => eq.includes('barbell') || eq.includes('rack') || eq.includes('bench press'))) {
          bestMatch = 'Home Gym (barbell + rack + bench)';
        } else if (detectedLower.some(eq => eq.includes('dumbbell') || eq.includes('band'))) {
          bestMatch = 'Home Gym (basic \u2014 dumbbells, bands)';
        } else if (detectedLower.some(eq => eq.includes('kettlebell'))) {
          bestMatch = 'Kettlebells Only';
        }
        alert(`Detected: ${equipment.join(', ')}\nBest match: ${bestMatch}`);
        selectAndAdvance('equipment', bestMatch);
      }
    } catch {
      alert('Could not detect equipment. Please select manually.');
    } finally {
      setScanningGym(false);
      if (scanFileRef.current) scanFileRef.current.value = '';
    }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });


  /* ── Delete Confirmation Dialog ── */
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
          <p className="text-xs text-[#9ca3af] mb-6">This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl border border-[#e5e7eb] py-2.5 text-sm font-medium text-[#6b7280] hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => handleDeleteProgram(confirmDelete)} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors">Delete</button>
          </div>
        </div>
      </div>
    );
  };

  /* ── Step renderer ── */
  const renderStep = () => {
    const stepId = currentStepDef?.id || 'goal';

    switch (stepId) {
      case 'goal':
        return (
          <div className="grid grid-cols-2 gap-3">
            {GOALS.map(({ label, value, Icon }) => (
              <button key={value} onClick={() => selectAndAdvance('goal', value)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 min-h-[100px] transition-all ${answers.goal === value ? 'border-[#1e3a5f] bg-blue-50 shadow-md' : 'border-[#e5e7eb] bg-white hover:border-[#1e3a5f]/40'}`}>
                <Icon size={28} className="text-[#1e3a5f]" />
                <span className="text-sm font-semibold text-[#111827] text-center">{label}</span>
              </button>
            ))}
          </div>
        );

      case 'sport':
        return (
          <div className="space-y-4">
            <input value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && textInput.trim() && submitTextStep('sport')}
              placeholder="e.g. Golf, Basketball, Swimming..."
              className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-sm" autoFocus />
            <button onClick={() => submitTextStep('sport')} disabled={!textInput.trim()}
              className="flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-6 py-3 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors disabled:opacity-40">
              Next <ArrowRight size={16} />
            </button>
          </div>
        );

      case 'event_training':
        return (
          <div className="grid grid-cols-2 gap-3">
            {['Yes', 'No'].map(opt => (
              <button key={opt} onClick={() => selectAndAdvance('event_training', opt)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-5 min-h-[80px] transition-all ${answers.event_training === opt ? 'border-[#1e3a5f] bg-blue-50 shadow-md' : 'border-[#e5e7eb] bg-white hover:border-[#1e3a5f]/40'}`}>
                {opt === 'Yes' ? <Clock size={24} className="text-[#1e3a5f]" /> : <ArrowRight size={24} className="text-[#1e3a5f]" />}
                <span className="text-sm font-semibold text-[#111827]">{opt === 'Yes' ? 'Yes, I have a target date' : 'No, general training'}</span>
              </button>
            ))}
          </div>
        );

      case 'event_details':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">Event Name</label>
              <input value={eventName} onChange={e => setEventName(e.target.value)}
                placeholder="e.g. Marathon, Competition, Wedding..."
                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-sm" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">Event Date</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-sm" />
            </div>
            <button onClick={() => {
              setAnswers(prev => ({ ...prev, event_name: eventName, event_date: eventDate }));
              goNext();
            }} disabled={!eventName.trim() || !eventDate}
              className="flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-6 py-3 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors disabled:opacity-40">
              Next <ArrowRight size={16} />
            </button>
          </div>
        );

      case 'hero_training':
        return (
          <div className="grid grid-cols-2 gap-3">
            {['Yes', 'No'].map(opt => (
              <button key={opt} onClick={() => selectAndAdvance('hero_training', opt)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-5 min-h-[80px] transition-all ${answers.hero_training === opt ? 'border-[#1e3a5f] bg-blue-50 shadow-md' : 'border-[#e5e7eb] bg-white hover:border-[#1e3a5f]/40'}`}>
                {opt === 'Yes' ? <Trophy size={24} className="text-[#1e3a5f]" /> : <ArrowRight size={24} className="text-[#1e3a5f]" />}
                <span className="text-sm font-semibold text-[#111827]">{opt === 'Yes' ? 'Yes, inspire me' : 'No thanks'}</span>
              </button>
            ))}
          </div>
        );

      case 'hero_athletes':
        return (
          <div className="space-y-4">
            <input value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && textInput.trim() && submitTextStep('hero_athletes')}
              placeholder="e.g. LeBron James, David Goggins, Cristiano Ronaldo..."
              className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-sm" autoFocus />
            <button onClick={() => submitTextStep('hero_athletes')} disabled={!textInput.trim()}
              className="flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-6 py-3 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors disabled:opacity-40">
              Next <ArrowRight size={16} />
            </button>
          </div>
        );

      case 'days':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-6xl font-bold text-[#1e3a5f]">{daysValue}</span>
              <p className="text-sm text-[#6b7280] mt-1">days per week</p>
            </div>
            <div className="px-2">
              <input type="range" min={1} max={7} step={1} value={daysValue}
                onChange={e => setDaysValue(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #1e3a5f ${((daysValue - 1) / 6) * 100}%, #e5e7eb ${((daysValue - 1) / 6) * 100}%)` }} />
              <div className="flex justify-between mt-2">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <span key={n} className={`text-xs ${n === daysValue ? 'text-[#1e3a5f] font-bold' : 'text-[#9ca3af]'}`}>{n}</span>
                ))}
              </div>
            </div>
            <button onClick={() => { setAnswers(prev => ({ ...prev, days: String(daysValue) })); goNext(); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] py-3.5 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors">
              Next <ArrowRight size={16} />
            </button>
          </div>
        );

      case 'duration':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-6xl font-bold text-[#1e3a5f]">{durationValue}</span>
              <p className="text-sm text-[#6b7280] mt-1">minutes per session</p>
            </div>
            <div className="px-2">
              <input type="range" min={20} max={120} step={5} value={durationValue}
                onChange={e => setDurationValue(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #1e3a5f ${((durationValue - 20) / 100) * 100}%, #e5e7eb ${((durationValue - 20) / 100) * 100}%)` }} />
              <div className="flex justify-between mt-2">
                {[20, 40, 60, 80, 100, 120].map(n => (
                  <span key={n} className={`text-xs ${n === durationValue ? 'text-[#1e3a5f] font-bold' : 'text-[#9ca3af]'}`}>{n}</span>
                ))}
              </div>
            </div>
            <button onClick={() => { setAnswers(prev => ({ ...prev, duration: `${durationValue} minutes` })); goNext(); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] py-3.5 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors">
              Next <ArrowRight size={16} />
            </button>
          </div>
        );

      case 'equipment':
        return (
          <div className="space-y-4">
            <div className="mb-3">
              <input ref={scanFileRef} type="file" accept="image/*" capture="environment" onChange={handleScanGym} className="hidden" />
              <button onClick={() => scanFileRef.current?.click()} disabled={scanningGym}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1e3a5f]/30 bg-blue-50/50 p-4 text-sm font-semibold text-[#1e3a5f] hover:border-[#1e3a5f]/50 hover:bg-blue-50 transition-colors disabled:opacity-50">
                {scanningGym ? (<><Loader2 size={18} className="animate-spin" /> Scanning...</>) : (<><Camera size={18} /> Scan Your Gym</>)}
              </button>
              <p className="text-xs text-[#9ca3af] text-center mt-1">Take a photo to auto-detect equipment</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {EQUIPMENT_OPTIONS.map(({ label, value, Icon }) => (
                <button key={value} onClick={() => selectAndAdvance('equipment', value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 min-h-[90px] transition-all ${answers.equipment === value ? 'border-[#1e3a5f] bg-blue-50 shadow-md' : 'border-[#e5e7eb] bg-white hover:border-[#1e3a5f]/40'}`}>
                  <Icon size={24} className="text-[#1e3a5f]" />
                  <span className="text-xs font-semibold text-[#111827] text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'experience':
        return (
          <div className="space-y-3">
            {FITNESS_LEVELS.map(({ label, desc, value, Icon }) => (
              <button key={value} onClick={() => selectAndAdvance('experience', value)}
                className={`w-full flex items-center gap-4 rounded-xl border p-4 min-h-[64px] transition-all text-left ${answers.experience === value ? 'border-[#1e3a5f] bg-blue-50 shadow-md' : 'border-[#e5e7eb] bg-white hover:border-[#1e3a5f]/40'}`}>
                <Icon size={24} className="text-[#1e3a5f] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{label}</p>
                  <p className="text-xs text-[#6b7280]">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        );

      case 'injuries':
        return (
          <div className="space-y-4">
            <input value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitTextStep('injuries')}
              placeholder="e.g. Bad left knee, shoulder impingement..."
              className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-sm" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => submitTextStep('injuries')}
                className="flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-6 py-3 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors">
                {textInput.trim() ? 'Next' : 'Skip'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        );

      case 'recovery':
        return (
          <div className="grid grid-cols-2 gap-3">
            {['Yes', 'No'].map(opt => (
              <button key={opt} onClick={() => selectAndAdvance('recovery', opt)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-5 min-h-[80px] transition-all ${answers.recovery === opt ? 'border-[#1e3a5f] bg-blue-50 shadow-md' : 'border-[#e5e7eb] bg-white hover:border-[#1e3a5f]/40'}`}>
                {opt === 'Yes' ? <Heart size={24} className="text-[#1e3a5f]" /> : <ArrowRight size={24} className="text-[#1e3a5f]" />}
                <span className="text-sm font-semibold text-[#111827]">{opt === 'Yes' ? 'Yes, add recovery days' : 'No, skip recovery'}</span>
              </button>
            ))}
          </div>
        );

      case 'recovery_equipment':
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {RECOVERY_TOOLS.map(tool => (
                <button key={tool} onClick={() => setMultiSelections(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool])}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${multiSelections.includes(tool) ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#e5e7eb] text-[#111827] hover:border-[#1e3a5f]/40'}`}>
                  {tool}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#6b7280]">Select all that apply</p>
            <button onClick={() => {
              const val = multiSelections.length > 0 ? multiSelections.join(', ') : 'Bodyweight only';
              setAnswers(prev => ({ ...prev, recovery_equipment: val }));
              setMultiSelections([]);
              goNext();
            }}
              className="flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-6 py-3 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors">
              Next <ArrowRight size={16} />
            </button>
          </div>
        );

      case 'summary': {
        const summaryItems = [
          { label: 'Goal', value: answers.goal },
          answers.sport ? { label: 'Sport', value: answers.sport } : null,
          answers.event_training === 'Yes' ? { label: 'Event', value: `${answers.event_name} (${answers.event_date})` } : null,
          answers.hero_training === 'Yes' ? { label: 'Train like', value: answers.hero_athletes } : null,
          { label: 'Days/week', value: answers.days || String(daysValue) },
          { label: 'Session', value: answers.duration || `${durationValue} minutes` },
          { label: 'Equipment', value: answers.equipment },
          { label: 'Level', value: answers.experience },
          answers.injuries && answers.injuries !== 'None' ? { label: 'Injuries', value: answers.injuries } : null,
          answers.recovery === 'Yes' ? { label: 'Recovery', value: answers.recovery_equipment || 'Yes' } : null,
        ].filter(Boolean) as { label: string; value: string }[];
        return (
          <div className="space-y-6">
            <div className="rounded-xl bg-white border border-[#e5e7eb] divide-y divide-[#e5e7eb] shadow-sm overflow-hidden">
              {summaryItems.map(item => (
                <div key={item.label} className="flex justify-between px-4 py-3">
                  <span className="text-sm text-[#6b7280]">{item.label}</span>
                  <span className="text-sm font-medium text-[#111827] text-right max-w-[60%]">{item.value}</span>
                </div>
              ))}
            </div>
            <button onClick={() => {
              if (!answers.days) setAnswers(prev => ({ ...prev, days: String(daysValue) }));
              if (!answers.duration) setAnswers(prev => ({ ...prev, duration: `${durationValue} minutes` }));
              generateProgram();
            }} disabled={loading}
              className="w-full rounded-xl bg-[#1e3a5f] py-4 font-bold text-sm text-white hover:bg-[#162d4a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (<><Loader2 size={18} className="animate-spin" /> Generating...</>) : 'Generate My Program'}
            </button>
            <button onClick={() => { setCurrentStepId('goal'); setSlideDir('backward'); setSlideKey(k => k + 1); }}
              className="w-full text-center text-sm text-[#6b7280] hover:text-[#111827] transition-colors">
              Start over
            </button>
          </div>
        );
      }

      default:
        return null;
    }
  };


  /* ═══════════════════════════════════════════════════════════
     RENDER — Views
     ═══════════════════════════════════════════════════════════ */

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
          <button onClick={() => handleSetActive(viewingProgram)}
            className="flex items-center gap-1.5 rounded-lg bg-[#1e3a5f] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#162d4a] transition-colors">
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
          <button onClick={() => { setProgram(null); setView('menu'); setCurrentStepId('goal'); setAnswers({}); }} className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></button>
          <h1 className="font-bold text-sm flex-1 text-[#111827]">Your Custom Program</h1>
          <button onClick={handleSaveProgram} disabled={saveStatus === 'saving' || saveStatus === 'saved'}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
              saveStatus === 'saved' ? 'bg-green-600' : saveStatus === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'
            } disabled:opacity-70`}>
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
        {splitProgram(program).optionB && (
          <div className="px-4 pt-4 flex gap-2">
            <button onClick={() => setSelectedOption('A')} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${selectedOption === 'A' ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#e5e7eb] text-[#6b7280]'}`}>Option A</button>
            <button onClick={() => setSelectedOption('B')} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${selectedOption === 'B' ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#e5e7eb] text-[#6b7280]'}`}>Option B</button>
          </div>
        )}
        <div className="px-4 py-6">
          <ProgramMarkdown content={splitProgram(program).optionB ? (selectedOption === 'A' ? splitProgram(program).optionA : splitProgram(program).optionB) : program} />
        </div>
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
                  {p.isActive && <span className="shrink-0 text-[10px] font-bold uppercase text-[#1e3a5f] bg-blue-100 px-2 py-0.5 rounded-full">Active</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-[#6b7280]">
                  <Clock size={10} /><span>{formatDate(p.createdAt)}</span>
                </div>
              </button>
              {!p.isActive && <button onClick={() => handleSetActive(p)} className="p-2 rounded-lg text-[#1e3a5f] hover:bg-blue-50 transition-colors" title="Set as active"><Star size={16} /></button>}
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
          <p className="text-sm text-[#6b7280] mb-4">Paste or type your existing workout plan below. It will be saved as your active program.</p>
          <textarea value={pasteInput} onChange={(e) => setPasteInput(e.target.value)}
            placeholder={"Example:\n\nMonday \u2014 Push Day\nBench Press 4x8\nOHP 3x10\nIncline DB Press 3x12\n\nTuesday \u2014 Pull Day\n..."}
            rows={14}
            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-sm resize-none" />
          <button onClick={handleSavePastedWorkout} disabled={!pasteInput.trim()}
            className="w-full mt-4 rounded-xl bg-[#1e3a5f] py-4 font-bold text-sm text-white hover:bg-[#162d4a] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            <Save size={18} /> Save as Active Program
          </button>
        </div>
        <Navigation />
      </div>
    );
  }

  // ── Conversational Intake Flow ──
  if (view === 'intake') {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <style>{`
          @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes slideInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
          .slide-forward { animation: slideInRight 300ms ease forwards; }
          .slide-backward { animation: slideInLeft 300ms ease forwards; }
          input[type=range] { -webkit-appearance: none; appearance: none; height: 8px; border-radius: 9999px; outline: none; }
          input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; border-radius: 50%; background: #1e3a5f; cursor: pointer; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
          input[type=range]::-moz-range-thumb { width: 28px; height: 28px; border-radius: 50%; background: #1e3a5f; cursor: pointer; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
        `}</style>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
          <button onClick={() => {
            if (currentStepIndex > 0) { goBack(); }
            else { setView('menu'); setCurrentStepId('goal'); setAnswers({}); setMultiSelections([]); }
          }} className="text-[#6b7280] hover:text-[#111827]">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-sm text-[#111827] flex-1">Build Your Program</h1>
          <span className="text-xs text-[#9ca3af]">{currentStepIndex + 1}/{applicableSteps.length}</span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-[#e5e7eb]">
          <div className="h-full bg-[#1e3a5f] transition-all duration-300 ease-out" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        {/* Step content */}
        <div className="px-4 py-6 pb-24">
          <div key={slideKey} className={slideDir === 'forward' ? 'slide-forward' : 'slide-backward'}>
            <CoachBubble message={currentStepDef?.coach || ''} />
            {renderStep()}
          </div>
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
          <button onClick={() => { setView('intake'); setCurrentStepId('goal'); setAnswers({}); setMultiSelections([]); setDaysValue(4); setDurationValue(60); setEventName(''); setEventDate(''); setTextInput(''); }}
            className="flex-1 rounded-xl bg-[#1e3a5f] p-4 text-left text-white hover:bg-[#162d4a] transition-colors shadow-sm">
            <Dumbbell size={24} className="mb-2" />
            <h2 className="text-sm font-bold">Generate New</h2>
          </button>
          <button onClick={() => setView('paste')} className="flex-1 rounded-xl border border-[#e5e7eb] bg-white p-4 text-left hover:border-blue-300 transition-colors shadow-sm">
            <ClipboardPaste size={24} className="mb-2 text-[#6b7280]" />
            <h2 className="text-sm font-bold text-[#111827]">Paste Workout</h2>
          </button>
        </div>
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
                      {p.isActive && <span className="shrink-0 text-[10px] font-bold uppercase text-[#1e3a5f] bg-blue-100 px-2 py-0.5 rounded-full">Active</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#6b7280]">
                      <Clock size={10} /><span>{formatDate(p.createdAt)}</span>
                    </div>
                  </button>
                  {!p.isActive && <button onClick={() => handleSetActive(p)} className="p-2 rounded-lg text-[#1e3a5f] hover:bg-blue-50 transition-colors" title="Set as active"><Star size={16} /></button>}
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

'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, LogOut, Moon, Sun, Scale, Download, ChevronRight, Crown, User, Save } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/AuthProvider';
import { getDarkMode, setDarkMode as storageSaveDarkMode, getActiveProgram, getProfile, saveProfile, StoredProgram, UserProfile } from '@/lib/simple-storage';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [activeProgram, setActiveProgramState] = useState<StoredProgram | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced' | ''>('');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [injuries, setInjuries] = useState('');
  const [dislikedExercisesStr, setDislikedExercisesStr] = useState('');
  const [sport, setSport] = useState('');
  const [preferredDuration, setPreferredDuration] = useState('');
  const [equipmentAvailable, setEquipmentAvailable] = useState('');
  const [coachNotes, setCoachNotes] = useState('');

  useEffect(() => {
    setDarkMode(getDarkMode());
    setActiveProgramState(getActiveProgram());

    const existing = getProfile();
    if (existing) {
      setProfile(existing);
      setName(existing.name || '');
      setFitnessLevel(existing.fitnessLevel || '');
      setPrimaryGoal(existing.primaryGoal || '');
      setInjuries(existing.injuries || '');
      setDislikedExercisesStr((existing.dislikedExercises || []).join(', '));
      setSport(existing.sport || '');
      setPreferredDuration(existing.preferredDuration || '');
      setEquipmentAvailable(existing.equipmentAvailable || '');
      setCoachNotes(existing.coachNotes || '');
    }
  }, [user]);

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    storageSaveDarkMode(newVal);
    document.documentElement.classList.toggle('dark', newVal);
  };

  const handleSaveProfile = () => {
    setSaving(true);
    const dislikedExercises = dislikedExercisesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: UserProfile = {
      name,
      onboardingComplete: profile?.onboardingComplete ?? true,
      is_pro: profile?.is_pro ?? false,
      fitnessLevel: fitnessLevel || undefined,
      primaryGoal: primaryGoal || undefined,
      injuries: injuries || undefined,
      dislikedExercises: dislikedExercises.length > 0 ? dislikedExercises : undefined,
      sport: sport || undefined,
      preferredDuration: preferredDuration || undefined,
      equipmentAvailable: equipmentAvailable || undefined,
      coachNotes: coachNotes || undefined,
    };

    saveProfile(updated);
    setProfile(updated);

    setTimeout(() => setSaving(false), 600);
  };

  const handleExportProgram = () => {
    if (!activeProgram) return;
    const content = `# ${activeProgram.title}\n\nGenerated: ${new Date(activeProgram.createdAt).toLocaleDateString()}\n\n${activeProgram.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProgram.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isPro = profile?.is_pro ?? false;

  const inputClasses = 'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent';
  const labelClasses = 'block text-xs font-medium text-[var(--text-secondary)] mb-1.5';

  return (
    <div className="min-h-screen pb-24 bg-[var(--bg-page)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-sm text-[var(--text-primary)]">Settings</h1>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Account Card */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-4">Account</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
              {user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.email}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' }) : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Upgrade to Pro */}
        {!isPro && (
          <Link href="/upgrade" className="block">
            <div className="rounded-2xl border border-amber-300 dark:border-amber-500 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center">
                  <Crown size={20} className="text-[var(--warning)] dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">Upgrade to Pro</p>
                  <p className="text-xs text-[var(--warning)] dark:text-amber-400/80">Unlock voice coaching, coach memory, and more</p>
                </div>
                <ChevronRight size={18} className="text-amber-500" />
              </div>
            </div>
          </Link>
        )}

        {/* My Preferences (Coach Memory) */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-[var(--accent-light)]" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">My Preferences</h2>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className={labelClasses}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={inputClasses}
              />
            </div>

            {/* Fitness Level */}
            <div>
              <label className={labelClasses}>Fitness Level</label>
              <select
                value={fitnessLevel}
                onChange={(e) => setFitnessLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced' | '')}
                className={inputClasses}
              >
                <option value="">Select level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Primary Goal */}
            <div>
              <label className={labelClasses}>Primary Goal</label>
              <input
                type="text"
                value={primaryGoal}
                onChange={(e) => setPrimaryGoal(e.target.value)}
                placeholder="e.g., Build muscle, Lose weight"
                className={inputClasses}
              />
            </div>

            {/* Injuries & Limitations */}
            <div>
              <label className={labelClasses}>Injuries & Limitations</label>
              <textarea
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                placeholder="Any injuries or physical limitations"
                rows={2}
                className={inputClasses + ' resize-none'}
              />
            </div>

            {/* Exercises to Avoid */}
            <div>
              <label className={labelClasses}>Exercises to Avoid</label>
              <input
                type="text"
                value={dislikedExercisesStr}
                onChange={(e) => setDislikedExercisesStr(e.target.value)}
                placeholder="e.g., Burpees, Box Jumps"
                className={inputClasses}
              />
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Comma-separated list</p>
            </div>

            {/* Sport */}
            <div>
              <label className={labelClasses}>Sport</label>
              <input
                type="text"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                placeholder="e.g., Basketball, Running"
                className={inputClasses}
              />
            </div>

            {/* Preferred Session Duration */}
            <div>
              <label className={labelClasses}>Preferred Session Duration</label>
              <select
                value={preferredDuration}
                onChange={(e) => setPreferredDuration(e.target.value)}
                className={inputClasses}
              >
                <option value="">Select duration</option>
                <option value="20 minutes">20 minutes</option>
                <option value="30 minutes">30 minutes</option>
                <option value="45 minutes">45 minutes</option>
                <option value="60 minutes">60 minutes</option>
                <option value="75 minutes">75 minutes</option>
                <option value="90+ minutes">90+ minutes</option>
              </select>
            </div>

            {/* Equipment Available */}
            <div>
              <label className={labelClasses}>Equipment Available</label>
              <input
                type="text"
                value={equipmentAvailable}
                onChange={(e) => setEquipmentAvailable(e.target.value)}
                placeholder="e.g., Dumbbells, Pull-up bar, Full gym"
                className={inputClasses}
              />
            </div>

            {/* Coach Notes */}
            <div>
              <label className={labelClasses}>Coach Notes</label>
              <textarea
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                placeholder="Anything else your coach should know"
                rows={3}
                className={inputClasses + ' resize-none'}
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveProfile}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white hover:bg-[#3730a3] active:scale-[0.98] transition-all"
            >
              <Save size={16} />
              {saving ? 'Saved!' : 'Save Preferences'}
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] divide-y divide-[var(--border)]">
          <Link href="/body-stats" className="flex items-center gap-3 px-5 py-4 hover:bg-[var(--bg-elevated)] transition-colors">
            <Scale size={18} className="text-[var(--accent-light)]" />
            <span className="text-sm font-medium text-[var(--text-primary)] flex-1">Body Stats & Measurements</span>
            <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
          </Link>
          {activeProgram && (
            <button onClick={handleExportProgram} className="flex items-center gap-3 px-5 py-4 w-full text-left hover:bg-[var(--bg-elevated)] transition-colors">
              <Download size={18} className="text-[var(--success)]" />
              <span className="text-sm font-medium text-[var(--text-primary)] flex-1">Export Active Program</span>
              <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
            </button>
          )}
        </div>

        {/* Preferences */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-4">Preferences</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={18} className="text-indigo-500" /> : <Sun size={18} className="text-yellow-500" />}
              <span className="text-sm font-medium text-[var(--text-primary)]">Dark Mode</span>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-[var(--accent)]' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--bg-card)] shadow transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--danger)]/30 bg-[var(--bg-card)] py-3 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <Navigation />
    </div>
  );
}

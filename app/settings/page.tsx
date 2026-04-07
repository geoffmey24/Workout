'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MaterialIcon from '@/components/MaterialIcon';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/AuthProvider';
import { getProfile, saveProfile, UserProfile, getDiagnostic, clearDiagnostic, clearDiagnosticSkipped, StrengthDiagnostic } from '@/lib/simple-storage';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [diagnostic, setDiagnosticState] = useState<StrengthDiagnostic | null>(null);

  useEffect(() => {
    const existing = getProfile();
    if (existing) {
      setProfile(existing);
      setName(existing.name || '');
    }
    setDiagnosticState(getDiagnostic());
  }, [user]);

  const handleSaveProfile = () => {
    setSaving(true);
    const existing = getProfile();
    const updated: UserProfile = {
      ...existing,
      name,
      onboardingComplete: existing?.onboardingComplete ?? true,
      is_pro: existing?.is_pro ?? false,
    };
    saveProfile(updated);
    setProfile(updated);
    setTimeout(() => setSaving(false), 600);
  };

  const isPro = profile?.is_pro ?? false;

  return (
    <div className="min-h-screen pb-24 bg-surface">
      {/* Header — glass morphism */}
      <div className="fixed top-0 w-full z-50 h-16 bg-slate-50/80 backdrop-blur-md flex items-center gap-3 px-4">
        <Link href="/" className="text-secondary hover:text-on-surface">
          <MaterialIcon icon="arrow_back" size={20} />
        </Link>
        <h1 className="font-bold text-sm font-headline text-on-surface">Settings</h1>
      </div>

      <div className="h-16" />

      <div className="px-4 py-6 space-y-4">
        {/* Upgrade to Pro */}
        {!isPro && (
          <Link href="/upgrade" className="block">
            <div className="rounded-xl border border-tertiary-container/40 bg-gradient-to-r from-amber-50 to-yellow-50 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <MaterialIcon icon="workspace_premium" size={20} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">Upgrade to Pro</p>
                  <p className="text-xs text-amber-600/80">Unlock voice coaching, coach memory, and more</p>
                </div>
                <MaterialIcon icon="chevron_right" size={18} className="text-amber-500" />
              </div>
            </div>
          </Link>
        )}

        {/* My Profile */}
        <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/5 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <MaterialIcon icon="person" size={16} className="text-primary" />
            <h2 className="text-[10px] font-label font-bold uppercase tracking-widest text-secondary">My Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-label font-medium text-secondary mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-container active:scale-[0.98] transition-all"
            >
              <MaterialIcon icon="save" size={16} />
              {saving ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>

        {/* Strength Assessment */}
        <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/5 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MaterialIcon icon="adjust" size={16} className="text-primary" />
            <h2 className="text-[10px] font-label font-bold uppercase tracking-widest text-secondary">Strength Assessment</h2>
          </div>
          {diagnostic ? (
            <div>
              <p className="text-sm text-secondary mb-1">Last tested: {new Date(diagnostic.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              {diagnostic.bodyWeight > 0 && (
                <p className="text-sm text-secondary mb-1">Body weight: {diagnostic.bodyWeight} {diagnostic.bodyWeightUnit || 'lbs'}</p>
              )}
              {diagnostic.overallLevel && (
                <p className="text-sm font-medium text-primary mb-3">Overall: {diagnostic.overallLevel}</p>
              )}
              <div className="mb-3 space-y-2">
                {diagnostic.entries.map((e, i) => {
                  const rm = e.adjusted1RM || e.estimated1RM;
                  return (
                    <div key={i} className="rounded-xl bg-surface border border-outline-variant/10 p-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-on-surface">{e.exercise}</span>
                        {e.level && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-xl ${
                            e.level === 'Elite' ? 'bg-purple-100 text-purple-700' :
                            e.level === 'Advanced' ? 'bg-blue-100 text-blue-700' :
                            e.level === 'Intermediate' ? 'bg-emerald-100 text-emerald-700' :
                            e.level === 'Novice' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{e.level}</span>
                        )}
                      </div>
                      <p className="text-xs text-secondary mt-1">
                        {e.workingWeight} lbs x {e.reps} reps {e.rpe ? `@ RPE ${e.rpe}` : ''} | 1RM: {rm} lbs
                        {e.bwRatio ? ` (${e.bwRatio.toFixed(2)}x BW)` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
              <Link href="/diagnostic"
                onClick={() => { clearDiagnostic(); clearDiagnosticSkipped(); setDiagnosticState(null); }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-surface py-2.5 text-sm font-medium text-primary hover:bg-blue-50 transition-colors"
              >
                <MaterialIcon icon="adjust" size={14} /> Re-test Strength
              </Link>
              <p className="text-[10px] text-secondary mt-1.5 text-center">Suggest re-testing every 6-8 weeks to track progress.</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-secondary mb-2">No assessment completed yet.</p>
              <Link href="/diagnostic" className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-container transition-colors">
                <MaterialIcon icon="adjust" size={14} /> Take Assessment
              </Link>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-surface-container-lowest py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <MaterialIcon icon="logout" size={16} /> Sign Out
        </button>
      </div>

      <Navigation />
    </div>
  );
}

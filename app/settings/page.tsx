'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, LogOut, ChevronRight, Crown, User, Save, Target } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/AuthProvider';
import { getProfile, saveProfile, UserProfile, getDiagnostic, clearDiagnostic, StrengthDiagnostic } from '@/lib/simple-storage';

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
    <div className="min-h-screen pb-24 bg-[#f8f9fa]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <Link href="/" className="text-[#9ca3af] hover:text-[#111827]">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-sm text-[#111827]">Settings</h1>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Upgrade to Pro */}
        {!isPro && (
          <Link href="/upgrade" className="block">
            <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Crown size={20} className="text-[#f59e0b]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">Upgrade to Pro</p>
                  <p className="text-xs text-[#f59e0b]/80">Unlock voice coaching, coach memory, and more</p>
                </div>
                <ChevronRight size={18} className="text-amber-500" />
              </div>
            </div>
          </Link>
        )}

        {/* My Profile */}
        <div className="rounded-2xl bg-white border border-[#e5e7eb] p-5">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-[#1e3a5f]" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#9ca3af]">My Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-[#e5e7eb] bg-[#f8f9fa] px-3 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] py-3 text-sm font-semibold text-white hover:bg-[#162d4a] active:scale-[0.98] transition-all"
            >
              <Save size={16} />
              {saving ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>

        {/* Strength Assessment */}
        <div className="rounded-2xl bg-white border border-[#e5e7eb] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-[#1e3a5f]" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#9ca3af]">Strength Assessment</h2>
          </div>
          {diagnostic ? (
            <div>
              <p className="text-sm text-[#6b7280] mb-1">Last tested: {new Date(diagnostic.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <div className="mb-3 space-y-1">
                {diagnostic.entries.map((e, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-[#111827]">{e.exercise}</span>
                    <span className="text-[#6b7280]">{e.workingWeight} lbs (1RM: {e.estimated1RM})</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { clearDiagnostic(); setDiagnosticState(null); }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#1e3a5f]/20 bg-[#f8f9fa] py-2.5 text-sm font-medium text-[#1e3a5f] hover:bg-[#eef2ff] transition-colors"
              >
                <Target size={14} /> Re-test Strength
              </button>
              <p className="text-[10px] text-[#9ca3af] mt-1.5 text-center">Clears current results. You&apos;ll be prompted to re-assess on the home page.</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#6b7280] mb-2">No assessment completed yet. Go to the home page to start one.</p>
              <Link href="/" className="text-sm text-[#1e3a5f] font-medium hover:underline">Go to Home</Link>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#ef4444]/30 bg-white py-3 text-sm font-medium text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <Navigation />
    </div>
  );
}

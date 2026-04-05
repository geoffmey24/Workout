'use client';

import Link from 'next/link';
import { ArrowLeft, Check, Crown, Lock, Star, Zap } from 'lucide-react';
import Navigation from '@/components/Navigation';

const FREE_FEATURES = [
  'AI workout generation',
  'Text-based coach chat',
  'Basic workout logging',
  '1RM tracking',
  'Whoop/Oura connection',
  'Body stats tracking',
  '1 saved program',
];

const PRO_FEATURES = [
  'Voice coaching (coach talks to you)',
  'Talk to your coach (speech-to-text)',
  'Coach memory (remembers your history and adapts)',
  'Unlimited saved programs',
  'Goal-based training with countdown',
  'Train Like Your Hero',
  'AI nutrition coaching',
  'Sleep-adjusted training intensity',
  'Weekly AI progress reports',
  'PDF export',
];

export default function UpgradePage() {
  return (
    <div className="min-h-screen pb-24 bg-[#f8f9fa]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#f8f9fa]/95 backdrop-blur-sm border-b border-white/10">
        <div className="mx-auto max-w-2xl flex items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={18} className="text-white" />
          </Link>
          <h1 className="text-lg font-bold text-white">Choose Your Plan</h1>
        </div>
      </div>

      {/* Hero section */}
      <div className="mx-auto max-w-2xl px-4 pt-8 pb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#d4a843]/15 px-4 py-1.5 mb-4">
          <Crown size={16} className="text-[#d4a843]" />
          <span className="text-sm font-semibold text-[#d4a843]">Upgrade Your Training</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          Unlock Your Full Potential
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto">
          Take your training to the next level with AI-powered voice coaching, nutrition guidance, and more.
        </p>
      </div>

      {/* Cards */}
      <div className="mx-auto max-w-2xl px-4 flex flex-col md:flex-row gap-5 md:items-start">
        {/* FREE TIER */}
        <div className="flex-1 rounded-2xl border border-white/10 bg-[#1e293b] p-6 flex flex-col">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-white tracking-wide">ELITE COACH</h3>
            <p className="text-slate-400 text-sm mt-1">Free</p>
          </div>

          <ul className="space-y-3 flex-1">
            {FREE_FEATURES.map((feat) => (
              <li key={feat} className="flex items-start gap-2.5">
                <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-sm text-slate-300">{feat}</span>
              </li>
            ))}
          </ul>

          <button
            disabled
            className="mt-6 w-full rounded-xl py-3 text-sm font-semibold bg-white/10 text-slate-400 cursor-default"
          >
            Current Plan
          </button>
        </div>

        {/* PRO TIER */}
        <div className="flex-1 relative rounded-2xl border-2 border-[#d4a843]/60 bg-gradient-to-b from-[#1e3a5f] to-[#1e293b] p-6 flex flex-col shadow-[0_0_40px_rgba(212,168,67,0.12)]">
          {/* Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d4a843] px-4 py-1 text-xs font-bold text-[#0f172a] uppercase tracking-wider shadow-lg">
              <Star size={12} fill="currentColor" />
              Recommended
            </span>
          </div>

          <div className="mb-5 mt-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-wide">ELITE COACH PRO</h3>
              <Zap size={18} className="text-[#d4a843]" fill="#d4a843" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">$9.99</span>
              <span className="text-slate-400 text-sm">/month</span>
            </div>
            <p className="text-xs text-[#d4a843] mt-1.5 font-medium">
              or $79.99/year — save 33%
            </p>
          </div>

          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Everything in Free, plus:
          </p>

          <ul className="space-y-3 flex-1">
            {PRO_FEATURES.map((feat) => (
              <li key={feat} className="flex items-start gap-2.5">
                <Check size={16} className="text-[#d4a843] mt-0.5 shrink-0" />
                <span className="text-sm text-slate-200">{feat}</span>
              </li>
            ))}
          </ul>

          <button
            disabled
            className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold bg-gradient-to-r from-[#d4a843] to-[#b8922e] text-[#0f172a] cursor-not-allowed opacity-80 flex items-center justify-center gap-2 shadow-lg"
          >
            <Lock size={14} />
            Coming Soon
          </button>
        </div>
      </div>

      {/* Footer note */}
      <div className="mx-auto max-w-2xl px-4 mt-8 text-center">
        <p className="text-xs text-slate-500">
          Pro features are in development. You&apos;ll be notified when they launch.
        </p>
      </div>

      <Navigation />
    </div>
  );
}

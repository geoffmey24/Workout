'use client';

import Link from 'next/link';
import MaterialIcon from '@/components/MaterialIcon';
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
  'Coach memory (remembers your history and adapts)',
  'Unlimited saved programs',
  'Goal-based training with countdown',
  'Train Like Your Hero',
  'AI nutrition coaching',
];

export default function UpgradePage() {
  return (
    <div className="min-h-screen pb-24 bg-surface">
      {/* Header — glass morphism */}
      <div className="fixed top-0 w-full z-50 h-16 bg-slate-50/80 backdrop-blur-md flex items-center gap-3 px-4">
        <Link
          href="/"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors"
        >
          <MaterialIcon icon="arrow_back" size={18} className="text-on-surface" />
        </Link>
        <h1 className="text-lg font-bold font-headline text-on-surface">Choose Your Plan</h1>
      </div>

      <div className="h-16" />

      {/* Hero section */}
      <div className="mx-auto max-w-2xl px-4 pt-8 pb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-xl bg-tertiary-container/15 px-4 py-1.5 mb-4">
          <MaterialIcon icon="workspace_premium" size={16} className="text-tertiary-container" />
          <span className="text-sm font-semibold text-tertiary-container">Upgrade Your Training</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold font-headline text-on-surface mb-2">
          Unlock Your Full Potential
        </h2>
        <p className="text-sm sm:text-base text-secondary max-w-md mx-auto">
          Take your training to the next level with AI-powered voice coaching, nutrition guidance, and more.
        </p>
      </div>

      {/* Cards */}
      <div className="mx-auto max-w-2xl px-4 flex flex-col md:flex-row gap-5 md:items-start">
        {/* FREE TIER */}
        <div className="flex-1 rounded-xl border border-outline-variant/5 bg-surface-container-lowest p-6 flex flex-col shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold font-headline text-on-surface tracking-wide">ELITE COACH</h3>
            <p className="text-secondary text-sm mt-1">Free</p>
          </div>

          <ul className="space-y-3 flex-1">
            {FREE_FEATURES.map((feat) => (
              <li key={feat} className="flex items-start gap-2.5">
                <MaterialIcon icon="check" size={16} className="text-emerald-500 mt-0.5" />
                <span className="text-sm text-secondary">{feat}</span>
              </li>
            ))}
          </ul>

          <button
            disabled
            className="mt-6 w-full rounded-xl py-3 text-sm font-semibold bg-surface-container-low text-secondary cursor-default"
          >
            Current Plan
          </button>
        </div>

        {/* PRO TIER */}
        <div className="flex-1 relative rounded-xl border-2 border-tertiary-container/60 bg-gradient-to-b from-primary to-primary-container p-6 flex flex-col shadow-lg">
          {/* Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-tertiary-container px-4 py-1 text-xs font-bold text-primary uppercase tracking-wider shadow-lg">
              <MaterialIcon icon="star" size={12} />
              Recommended
            </span>
          </div>

          <div className="mb-5 mt-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold font-headline text-white tracking-wide">ELITE COACH PRO</h3>
              <MaterialIcon icon="bolt" size={18} className="text-tertiary-container" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-headline text-white">$9.99</span>
              <span className="text-white/60 text-sm">/month</span>
            </div>
            <p className="text-xs text-tertiary-container mt-1.5 font-medium">
              or $79.99/year — save 33%
            </p>
          </div>

          <p className="text-xs font-semibold font-label text-white/70 uppercase tracking-wider mb-3">
            Everything in Free, plus:
          </p>

          <ul className="space-y-3 flex-1">
            {PRO_FEATURES.map((feat) => (
              <li key={feat} className="flex items-start gap-2.5">
                <MaterialIcon icon="check" size={16} className="text-tertiary-container mt-0.5" />
                <span className="text-sm text-white/90">{feat}</span>
              </li>
            ))}
          </ul>

          <button
            disabled
            className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold bg-tertiary-container text-primary cursor-not-allowed opacity-80 flex items-center justify-center gap-2 shadow-lg"
          >
            <MaterialIcon icon="lock" size={14} />
            Coming Soon
          </button>
        </div>
      </div>

      {/* Footer note */}
      <div className="mx-auto max-w-2xl px-4 mt-8 text-center">
        <p className="text-xs text-secondary">
          Pro features are in development. You&apos;ll be notified when they launch.
        </p>
      </div>

      <Navigation />
    </div>
  );
}

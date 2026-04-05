'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, Crown, X } from 'lucide-react';

export function ProBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--warning)] ${className}`}>
      <Crown size={8} /> PRO
    </span>
  );
}

export function ProLockButton({ label, className = '' }: { label: string; className?: string }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 text-[var(--text-tertiary)] ${className}`}
      >
        <Lock size={12} />
        <span className="text-xs">{label}</span>
        <ProBadge />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Crown size={16} className="text-[var(--warning)]" />
                </div>
                <h3 className="font-bold text-[var(--text-primary)]">Pro Feature</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Upgrade to <strong className="text-[var(--text-primary)]">Elite Coach Pro</strong> to unlock {label.toLowerCase()} and 12+ more premium features.
            </p>
            <Link
              href="/upgrade"
              onClick={() => setShowModal(false)}
              className="block w-full text-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-bold text-white hover:from-amber-600 hover:to-amber-700 transition-colors"
            >
              View Pro Plans
            </Link>
            <button
              onClick={() => setShowModal(false)}
              className="block w-full text-center mt-2 py-2 text-xs text-[var(--text-tertiary)]"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </>
  );
}

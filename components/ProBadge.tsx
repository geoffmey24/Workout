'use client';

import { useState } from 'react';
import Link from 'next/link';
import MaterialIcon from './MaterialIcon';

export function ProBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-xl bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 ${className}`}>
      <MaterialIcon icon="workspace_premium" size={8} /> PRO
    </span>
  );
}

export function ProLockButton({ label, className = '' }: { label: string; className?: string }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 text-on-surface-variant ${className}`}
      >
        <MaterialIcon icon="lock" size={12} />
        <span className="text-xs">{label}</span>
        <ProBadge />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface-container-lowest rounded-xl p-6 max-w-sm w-full shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                  <MaterialIcon icon="workspace_premium" size={16} className="text-amber-600" />
                </div>
                <h3 className="font-bold font-headline text-on-surface">Pro Feature</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-secondary">
                <MaterialIcon icon="close" size={18} />
              </button>
            </div>
            <p className="text-sm text-secondary mb-6">
              Upgrade to <strong className="text-on-surface">Elite Coach Pro</strong> to unlock {label.toLowerCase()} and 12+ more premium features.
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
              className="block w-full text-center mt-2 py-2 text-xs text-on-surface-variant"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </>
  );
}

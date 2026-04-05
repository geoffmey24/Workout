'use client';

export default function LoadingDots() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="typing-dot h-2 w-2 rounded-full bg-[var(--text-tertiary)]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-[var(--text-tertiary)]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-[var(--text-tertiary)]" />
        </div>
      </div>
    </div>
  );
}

'use client';

export default function LoadingDots() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-primary rounded-xl px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="typing-dot h-2 w-2 rounded-full bg-white/60" />
          <span className="typing-dot h-2 w-2 rounded-full bg-white/60" />
          <span className="typing-dot h-2 w-2 rounded-full bg-white/60" />
        </div>
      </div>
    </div>
  );
}

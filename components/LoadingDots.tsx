'use client';

export default function LoadingDots() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white border border-[#e5e7eb] rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="typing-dot h-2 w-2 rounded-full bg-[#9ca3af]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-[#9ca3af]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-[#9ca3af]" />
        </div>
      </div>
    </div>
  );
}

'use client';

export default function LoadingDots() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="typing-dot h-2 w-2 rounded-full bg-[#6b7280]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-[#6b7280]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-[#6b7280]" />
        </div>
      </div>
    </div>
  );
}

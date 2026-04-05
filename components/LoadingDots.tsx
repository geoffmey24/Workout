'use client';

export default function LoadingDots() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white border border-[#e5e7eb] rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="typing-dot h-2 w-2 rounded-full bg-[#6b7280]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-[#6b7280]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-[#6b7280]" />
        </div>
      </div>
    </div>
  );
}

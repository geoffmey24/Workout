'use client';

export default function LoadingDots() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white border border-[#e5e7eb] rounded-2xl px-4 py-3 flex gap-1.5 shadow-sm">
        <span className="loading-dot inline-block h-2 w-2 rounded-full bg-blue-500" />
        <span className="loading-dot inline-block h-2 w-2 rounded-full bg-blue-500" />
        <span className="loading-dot inline-block h-2 w-2 rounded-full bg-blue-500" />
      </div>
    </div>
  );
}

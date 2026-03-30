'use client';

export default function LoadingDots() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-[#171717] border border-[#262626] rounded-2xl px-4 py-3 flex gap-1.5">
        <span className="loading-dot inline-block h-2 w-2 rounded-full bg-red-500" />
        <span className="loading-dot inline-block h-2 w-2 rounded-full bg-red-500" />
        <span className="loading-dot inline-block h-2 w-2 rounded-full bg-red-500" />
      </div>
    </div>
  );
}

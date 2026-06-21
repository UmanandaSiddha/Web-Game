"use client";

export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-[#070410]">
      <div className="font-display text-4xl tracking-widest text-white">
        NEON <span className="text-arena-p1">CLASH</span>
      </div>
      <div className="flex items-center gap-3 text-white/70">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-arena-p1" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="h-1 w-64 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/3 animate-[slide-up_1.2s_ease-in-out_infinite] bg-gradient-to-r from-arena-p1 to-arena-p2" />
      </div>
    </div>
  );
}

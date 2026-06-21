"use client";

export function PauseOverlay({
  onResume,
  onRestart,
  onMenu,
}: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/65 backdrop-blur-sm">
      <div className="font-display text-5xl tracking-widest text-white">PAUSED</div>
      <div className="flex flex-col gap-3">
        <button
          onClick={onResume}
          className="rounded-lg bg-gradient-to-r from-cyan-500 to-sky-600 px-12 py-3 font-display text-lg tracking-wide text-white transition hover:scale-105"
        >
          RESUME
        </button>
        <button
          onClick={onRestart}
          className="rounded-lg border border-white/20 bg-white/5 px-12 py-3 font-display text-lg tracking-wide text-white transition hover:bg-white/10"
        >
          RESTART
        </button>
        <button
          onClick={onMenu}
          className="rounded-lg border border-white/20 bg-white/5 px-12 py-3 font-display text-lg tracking-wide text-white/80 transition hover:bg-white/10"
        >
          MAIN MENU
        </button>
      </div>
    </div>
  );
}

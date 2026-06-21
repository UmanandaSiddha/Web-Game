"use client";

import type { GameMode, HudSnapshot } from "@/game/types";

export function ResultOverlay({
  hud,
  mode,
  onRematch,
  onMenu,
}: {
  hud: HudSnapshot;
  mode: GameMode;
  onRematch: () => void;
  onMenu: () => void;
}) {
  const p1Win = hud.p1.rounds > hud.p2.rounds;
  const winnerName = p1Win ? hud.p1.name : hud.p2.name;
  const accent = p1Win ? "from-cyan-300 to-sky-500" : "from-rose-300 to-red-500";
  void mode;

  return (
    <div className="animate-slide-up absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-sm">
      <div className="font-display text-2xl tracking-[0.4em] text-white/60">VICTORY</div>
      <div className={`font-display text-7xl tracking-wide bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>
        {winnerName}
      </div>
      <div className="flex items-center gap-3 font-display text-2xl text-white">
        <span className="text-arena-p1">{hud.p1.rounds}</span>
        <span className="text-white/40">—</span>
        <span className="text-arena-p2">{hud.p2.rounds}</span>
      </div>
      <div className="mt-2 flex gap-3">
        <button
          onClick={onRematch}
          className="rounded-lg bg-gradient-to-r from-cyan-500 to-sky-600 px-10 py-3 font-display text-lg tracking-wide text-white transition hover:scale-105"
        >
          REMATCH
        </button>
        <button
          onClick={onMenu}
          className="rounded-lg border border-white/20 bg-white/5 px-10 py-3 font-display text-lg tracking-wide text-white/80 transition hover:bg-white/10"
        >
          MAIN MENU
        </button>
      </div>
    </div>
  );
}

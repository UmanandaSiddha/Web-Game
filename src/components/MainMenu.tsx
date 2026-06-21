"use client";

import type { GameMode } from "@/game/types";
import { MOVES, ACTION_KEYS } from "@/game/config";

function KeyRow({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-white/75">
      <span>{label}</span>
      <span className="kbd">{k}</span>
    </div>
  );
}

export function MainMenu({
  onPlay,
  source,
  haveLoaded,
  onOpenSetup,
}: {
  onPlay: (m: GameMode) => void;
  source: "mixamo" | "fallback";
  haveLoaded: boolean;
  onOpenSetup: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-[#0b0618] via-[#0a0714] to-[#05030c] px-6 py-10">
      <div className="pointer-events-none absolute left-0 top-1/3 h-72 w-72 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-72 w-72 rounded-full bg-rose-500/20 blur-[120px]" />

      <h1 className="font-display text-6xl tracking-[0.15em] text-white drop-shadow-[0_0_25px_rgba(56,189,248,0.4)] sm:text-7xl">
        NEON <span className="bg-gradient-to-r from-cyan-300 to-rose-400 bg-clip-text text-transparent">CLASH</span>
      </h1>
      <p className="mt-2 text-sm tracking-widest text-white/50">3D STREET FIGHTER · NEXT.JS + THREE.JS</p>

      <button
        onClick={() => onPlay("cpu")}
        className="group relative mt-9 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-16 py-4 font-display text-2xl tracking-wide text-white shadow-lg shadow-cyan-900/40 transition hover:scale-[1.04] hover:shadow-cyan-500/40"
      >
        FIGHT
      </button>
      <p className="mt-2 text-xs text-white/40">vs C.P.U. · local 2-player & online coming soon</p>

      {/* full P1 moveset */}
      <div className="mt-9 grid w-full max-w-3xl grid-cols-1 gap-x-10 gap-y-1.5 rounded-2xl border border-white/10 bg-black/30 px-8 py-6 backdrop-blur sm:grid-cols-3">
        <div className="sm:col-span-3 mb-1 font-display text-sm tracking-widest text-arena-p1">CONTROLS</div>
        {ACTION_KEYS.map((a) => (
          <KeyRow key={a.label} k={a.key} label={a.label} />
        ))}
        {MOVES.map((m) => (
          <KeyRow key={m.id} k={m.key} label={m.label} />
        ))}
      </div>

      <p className="mt-5 max-w-xl text-center text-xs text-white/40">
        Chain attacks within ~1.7s to build combos — finishers (<span className="text-arena-gold">Combo / Uppercut / Smash</span>) scale with your
        hit count. <span className="text-orange-300">Fireball</span> zones from range. Dodge & Backflip have i-frames. <span className="kbd">Esc</span> pauses.
      </p>

      <button
        onClick={onOpenSetup}
        className="mt-5 flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition hover:bg-white/10"
        style={{
          borderColor: source === "mixamo" && haveLoaded ? "rgba(74,222,128,0.4)" : "rgba(251,191,36,0.4)",
          color: source === "mixamo" && haveLoaded ? "#86efac" : "#fcd34d",
        }}
      >
        {source === "mixamo" && haveLoaded ? "✓ Mixamo characters loaded — want clothed skins? Click here" : "★ Add realistic characters (Mixamo guide)"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { MOVES, ACTION_KEYS } from "@/game/config";

/** On-screen P1 move legend, pinned bottom-centre. Collapsible. */
export function ControlsBar() {
  const [open, setOpen] = useState(true);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center pb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto mb-1 rounded-full border border-white/15 bg-black/50 px-3 py-0.5 text-[10px] font-semibold tracking-widest text-white/60 backdrop-blur hover:text-white"
      >
        {open ? "HIDE CONTROLS" : "SHOW CONTROLS"}
      </button>

      {open && (
        <div className="flex max-w-[96vw] flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur">
          {ACTION_KEYS.map((a) => (
            <Chip key={a.label} k={a.key} label={a.label} tone="muted" />
          ))}
          <span className="mx-1 h-5 w-px bg-white/15" />
          {MOVES.map((m) => (
            <Chip key={m.id} k={m.key} label={m.label} tone={m.kind === "projectile" ? "fire" : m.comboScaled ? "gold" : "cyan"} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ k, label, tone }: { k: string; label: string; tone: "muted" | "cyan" | "gold" | "fire" }) {
  const ring =
    tone === "gold"
      ? "border-amber-400/50 text-amber-200"
      : tone === "fire"
        ? "border-orange-400/60 text-orange-200"
        : tone === "cyan"
          ? "border-cyan-300/40 text-cyan-100"
          : "border-white/20 text-white/70";
  return (
    <div className={`flex items-center gap-1 rounded-md border ${ring} bg-white/5 px-1.5 py-0.5`}>
      <span className="kbd !min-w-[1.4rem] !px-1 !py-0 text-[10px]">{k}</span>
      <span className="text-[11px] font-semibold">{label}</span>
    </div>
  );
}

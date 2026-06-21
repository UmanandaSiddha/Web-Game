"use client";

import { useEffect, useRef, useState } from "react";
import type { GameMode, HudSnapshot, FighterSnapshot } from "@/game/types";
import { RULES } from "@/game/config";

function HealthBar({ f, side }: { f: FighterSnapshot; side: "left" | "right" }) {
  const pct = Math.max(0, (f.health / f.maxHealth) * 100);
  const color = side === "left" ? "from-cyan-300 to-sky-500" : "from-rose-300 to-red-500";
  const align = side === "left" ? "angled-bar" : "angled-bar-r";
  const flip = side === "right" ? "flex-row-reverse" : "";

  // trailing "chip" bar lags behind to show damage taken
  const [chip, setChip] = useState(pct);
  useEffect(() => {
    const t = setTimeout(() => setChip(pct), 60);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="flex-1">
      <div className={`flex items-center gap-2 ${flip}`}>
        <span className="font-display text-lg tracking-wide text-white drop-shadow">{f.name}</span>
        <div className={`flex gap-1 ${side === "right" ? "flex-row-reverse" : ""}`}>
          {Array.from({ length: RULES.roundsToWin }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                i < f.rounds ? "bg-arena-gold shadow-[0_0_8px] shadow-amber-400" : "bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>
      <div className={`relative mt-1 h-5 overflow-hidden border border-white/25 bg-black/50 ${align}`}>
        {/* chip (slow) */}
        <div
          className={`absolute inset-y-0 ${side === "right" ? "right-0" : "left-0"} bg-white/35 transition-[width] duration-700 ease-out`}
          style={{ width: `${chip}%` }}
        />
        {/* health (fast) */}
        <div
          className={`absolute inset-y-0 ${
            side === "right" ? "right-0" : "left-0"
          } bg-gradient-to-r ${color} transition-[width] duration-150 ease-out`}
          style={{ width: `${pct}%` }}
        />
        {/* sheen */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/30" />
      </div>
    </div>
  );
}

function Combo({ count, side }: { count: number; side: "left" | "right" }) {
  if (count < 2) return null;
  return (
    <div
      key={count}
      className={`animate-combo-pop absolute top-20 ${side === "left" ? "left-6" : "right-6 text-right"}`}
    >
      <div className="font-display text-5xl text-arena-gold drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">{count}</div>
      <div className="font-display text-sm tracking-[0.3em] text-white/80">HITS</div>
    </div>
  );
}

export function HUD({ hud, mode }: { hud: HudSnapshot; mode: GameMode }) {
  // light screen shake on the overlay for extra punch
  const ref = useRef<HTMLDivElement>(null);
  void mode;

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-20">
      {/* top bar */}
      <div className="flex items-start gap-4 px-5 pt-4">
        <HealthBar f={hud.p1} side="left" />

        <div className="flex flex-col items-center pt-0.5">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-lg border-2 ${
              hud.timer <= 10 ? "border-red-500 text-red-400" : "border-white/30 text-white"
            } bg-black/55 font-display text-3xl tabular-nums`}
          >
            {hud.timer}
          </div>
        </div>

        <HealthBar f={hud.p2} side="right" />
      </div>

      <Combo count={hud.p1.combo} side="left" />
      <Combo count={hud.p2.combo} side="right" />

      {/* center announce */}
      {hud.announce && (
        <div className="absolute inset-x-0 top-[34%] flex justify-center">
          <div
            key={hud.announce}
            className={`animate-combo-pop font-display tracking-wider drop-shadow-[0_3px_0_rgba(0,0,0,0.6)] ${
              hud.announce === "FIGHT!" || hud.announce === "K.O."
                ? "text-7xl text-arena-gold"
                : "text-6xl text-white"
            }`}
          >
            {hud.announce}
          </div>
        </div>
      )}
    </div>
  );
}

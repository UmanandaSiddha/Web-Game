"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { bus } from "@/game/EventBus";
import { sfx } from "@/game/Sound";
import { loadAssets, type LoadResult } from "@/game/loadAssets";
import type { AnimState, GameMode, HudSnapshot } from "@/game/types";
import { MainMenu } from "./MainMenu";
import { HUD } from "./HUD";
import { ControlsBar } from "./ControlsBar";
import { PauseOverlay } from "./PauseOverlay";
import { ResultOverlay } from "./ResultOverlay";
import { SetupGuide } from "./SetupGuide";
import { LoadingScreen } from "./LoadingScreen";

const GameCanvas = dynamic(() => import("@/game/GameCanvas").then((m) => m.GameCanvas), {
  ssr: false,
});

type Screen = "menu" | "loading" | "playing";

export function GameClient() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<GameMode>("cpu");
  const [assets, setAssets] = useState<LoadResult | null>(null);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [loadLabel, setLoadLabel] = useState("Preparing arena…");
  const [missing, setMissing] = useState<AnimState[]>([]);
  const [source, setSource] = useState<"mixamo" | "fallback">("fallback");
  const [showSetup, setShowSetup] = useState(false);
  const [wipeKey, setWipeKey] = useState(0);
  const assetsRef = useRef<LoadResult | null>(null);

  // pipe HUD snapshots from the 3D world to React
  useEffect(() => {
    const off = bus.on("hud", setHud);
    const offProg = bus.on("loadProgress", ({ label }) => setLoadLabel(`Loading ${label}…`));
    const offWipe = bus.on("roundWipe", () => setWipeKey((k) => k + 1));
    return () => {
      off();
      offProg();
      offWipe();
    };
  }, []);

  // Esc toggles pause while playing
  useEffect(() => {
    if (screen !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen]);

  const start = useCallback(async (m: GameMode) => {
    sfx.resume(); // unlock audio on this user gesture
    sfx.play("ui");
    setMode(m);
    setScreen("loading");
    setPaused(false);
    let a = assetsRef.current;
    if (!a) {
      a = await loadAssets();
      assetsRef.current = a;
    }
    setAssets(a);
    setSource(a.p1.source);
    setMissing(a.missing);
    setScreen("playing");
  }, []);

  const toMenu = useCallback(() => {
    sfx.play("ui");
    setPaused(false);
    setHud(null);
    setScreen("menu");
    bus.emit("toMenu", undefined);
  }, []);

  const rematch = useCallback(() => {
    sfx.resume();
    sfx.play("ui");
    setPaused(false);
    bus.emit("rematch", undefined);
  }, []);

  const matchOver = hud?.phase === "matchOver";

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-black">
      {screen === "playing" && assets && (
        <div className="absolute inset-0">
          <GameCanvas assets={assets} mode={mode} paused={paused} />
        </div>
      )}

      {screen === "playing" && hud && <HUD hud={hud} mode={mode} />}
      {screen === "playing" && !matchOver && !paused && <ControlsBar />}

      {/* black wipe that hides the between-rounds reset */}
      {screen === "playing" && wipeKey > 0 && (
        <div key={wipeKey} className="animate-roundwipe pointer-events-none absolute inset-0 z-40 bg-black" />
      )}

      {screen === "playing" && paused && !matchOver && (
        <PauseOverlay onResume={() => setPaused(false)} onRestart={rematch} onMenu={toMenu} />
      )}

      {screen === "playing" && matchOver && hud && (
        <ResultOverlay hud={hud} mode={mode} onRematch={rematch} onMenu={toMenu} />
      )}

      {screen === "menu" && (
        <MainMenu
          onPlay={start}
          source={source}
          haveLoaded={!!assetsRef.current}
          onOpenSetup={() => setShowSetup(true)}
        />
      )}

      {screen === "loading" && <LoadingScreen label={loadLabel} />}

      {/* fallback / missing-assets banner during play */}
      {screen === "playing" && source === "fallback" && (
        <button
          onClick={() => setShowSetup(true)}
          className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-1.5 text-xs font-semibold text-amber-200 backdrop-blur hover:bg-amber-500/25"
        >
          ⚠ Placeholder character — click for the 10-min Mixamo upgrade
        </button>
      )}

      {showSetup && <SetupGuide source={source} missing={missing} onClose={() => setShowSetup(false)} />}
    </main>
  );
}

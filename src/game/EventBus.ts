// A tiny typed event bus so the Three.js world and the React UI can talk
// without prop-drilling through the <Canvas> boundary.

import type { HudSnapshot, GameMode } from "./types";

type Events = {
  // world -> UI
  hud: HudSnapshot;
  hitSpark: { x: number; y: number; big: boolean };
  shake: number; // intensity
  loadProgress: { loaded: number; total: number; label: string };
  assetsMissing: string[]; // list of clip names that fell back
  // UI -> world
  startMatch: { mode: GameMode };
  pause: boolean;
  rematch: void;
  toMenu: void;
};

type Handler<T> = (payload: T) => void;

class Emitter {
  // storage is intentionally loose; the public methods enforce the typed contract
  private map = new Map<keyof Events, Set<(p: unknown) => void>>();

  on<K extends keyof Events>(type: K, fn: Handler<Events[K]>): () => void {
    let set = this.map.get(type);
    if (!set) this.map.set(type, (set = new Set()));
    set.add(fn as (p: unknown) => void);
    return () => this.off(type, fn);
  }

  off<K extends keyof Events>(type: K, fn: Handler<Events[K]>) {
    this.map.get(type)?.delete(fn as (p: unknown) => void);
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]) {
    this.map.get(type)?.forEach((fn) => fn(payload));
  }
}

export const bus = new Emitter();

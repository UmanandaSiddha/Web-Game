// ---- Shared game-wide types ----

export type FighterId = "p1" | "p2";

/** Logical animation states the engine drives. Each maps to a clip (or a fallback). */
export type AnimState =
  | "idle"
  | "walkForward"
  | "walkBack"
  | "jump"
  | "block"
  | "hit"
  | "stunned"
  | "ko"
  | "victory"
  | "getup"
  | "dodge"
  | "backflip"
  // attacks
  | "punch"
  | "heavy"
  | "kick"
  | "sweep"
  | "slash"
  | "smash"
  | "combo"
  | "upper"
  | "fireball";

/** Attack ids are the subset of AnimStates that deal damage. */
export type AttackId =
  | "punch"
  | "heavy"
  | "kick"
  | "sweep"
  | "slash"
  | "smash"
  | "combo"
  | "upper"
  | "fireball";

export type GamePhase = "menu" | "loading" | "intro" | "fight" | "roundOver" | "matchOver";

export type GameMode = "cpu" | "local";

export interface FighterSnapshot {
  id: FighterId;
  name: string;
  health: number;
  maxHealth: number;
  combo: number;
  rounds: number;
}

export interface HudSnapshot {
  p1: FighterSnapshot;
  p2: FighterSnapshot;
  timer: number;
  phase: GamePhase;
  announce: string | null;
}

/** A data-driven attack. `hitAt` is the fraction (0..1) of the clip where the blow lands. */
export interface MoveDef {
  id: AttackId;
  label: string;
  key: string; // human-readable key shown on screen
  inputs: string[]; // raw KeyboardEvent.key values (lowercased) that trigger it
  damage: number;
  reach: number;
  hitAt: number;
  recovery: number; // ms locked after the clip
  knockback: number;
  timeScale: number;
  kind: "melee" | "projectile";
  comboScaled?: boolean; // finishers get bonus damage from the live combo counter
}

import type { AnimState, MoveDef } from "./types";

// ----------------------------------------------------------------------------
//  WORLD / GAMEPLAY TUNING  (tuned snappy / "proactive")
// ----------------------------------------------------------------------------
export const WORLD = {
  groundY: 0,
  arenaHalfWidth: 6.0,
  startX: 1.9,
  gravity: -23, // smooth, readable jump arc
  jumpSpeed: 8.8,
  walkSpeed: 3.5, // controllable approach (less foot-slide)
  fighterHeight: 1.85,
  facingLerp: 16,
  hitStun: 220, // brief stun -> fast back-and-forth but readable
  blockDamageMul: 0.15,
  dodgeSpeed: 7.5,
  dodgeTime: 360, // ms of i-frames on dodge
  backflipSpeed: 8.5,
  backflipTime: 520,
};

export const RULES = {
  maxHealth: 100,
  roundTime: 60,
  roundsToWin: 2,
  comboWindow: 1700,
};

export const PROJECTILE = {
  speed: 9.5,
  radius: 0.22,
  life: 1.6, // seconds before it despawns
  damage: 12,
  knockback: 2.4,
  spawnHeight: 1.05,
};

// crossfade duration (seconds) between animation states — smooth but responsive
export const CROSSFADE = 0.14;

// ----------------------------------------------------------------------------
//  ANIMATION CLIP MANIFEST  (state -> file in /public/models)
//  rootMotion 'strip' locks horizontal drift (we drive movement in code).
// ----------------------------------------------------------------------------
export interface ClipDef {
  state: AnimState;
  file: string;
  loop: boolean;
  rootMotion: "strip" | "keepY" | "keep";
  timeScale: number;
  fallback: AnimState;
}

export const CLIPS: ClipDef[] = [
  // locomotion / reactions
  { state: "idle", file: "fighting_idle.fbx", loop: true, rootMotion: "strip", timeScale: 1, fallback: "idle" },
  { state: "walkForward", file: "walking.fbx", loop: true, rootMotion: "strip", timeScale: 1.25, fallback: "idle" },
  { state: "walkBack", file: "walkback.fbx", loop: true, rootMotion: "strip", timeScale: 1.25, fallback: "walkForward" },
  { state: "jump", file: "jumping_up.fbx", loop: false, rootMotion: "strip", timeScale: 1.1, fallback: "idle" },
  { state: "block", file: "center_block.fbx", loop: false, rootMotion: "strip", timeScale: 1.2, fallback: "idle" },
  { state: "hit", file: "head_hit.fbx", loop: false, rootMotion: "strip", timeScale: 1.3, fallback: "idle" },
  { state: "stunned", file: "Stunned.fbx", loop: false, rootMotion: "strip", timeScale: 1.2, fallback: "hit" },
  { state: "ko", file: "Dying.fbx", loop: false, rootMotion: "keep", timeScale: 1.05, fallback: "hit" },
  { state: "victory", file: "Victory.fbx", loop: false, rootMotion: "strip", timeScale: 1, fallback: "idle" },
  { state: "getup", file: "getting_up.fbx", loop: false, rootMotion: "strip", timeScale: 1.15, fallback: "idle" },
  { state: "dodge", file: "Dodging.fbx", loop: false, rootMotion: "strip", timeScale: 1.3, fallback: "idle" },
  { state: "backflip", file: "Backflip.fbx", loop: false, rootMotion: "strip", timeScale: 1.2, fallback: "jump" },
  // attacks
  { state: "punch", file: "punching.fbx", loop: false, rootMotion: "strip", timeScale: 1.5, fallback: "idle" },
  { state: "heavy", file: "body_jab_cross.fbx", loop: false, rootMotion: "strip", timeScale: 1.4, fallback: "punch" },
  { state: "kick", file: "mma_kick.fbx", loop: false, rootMotion: "strip", timeScale: 1.4, fallback: "punch" },
  { state: "sweep", file: "leg_sweep.fbx", loop: false, rootMotion: "strip", timeScale: 1.4, fallback: "kick" },
  { state: "slash", file: "thrust_slash.fbx", loop: false, rootMotion: "strip", timeScale: 1.4, fallback: "kick" },
  { state: "smash", file: "Smash.fbx", loop: false, rootMotion: "strip", timeScale: 1.35, fallback: "heavy" },
  { state: "combo", file: "combo_punch.fbx", loop: false, rootMotion: "strip", timeScale: 1.45, fallback: "heavy" },
  { state: "upper", file: "elbow_uppercut_combo.fbx", loop: false, rootMotion: "strip", timeScale: 1.4, fallback: "combo" },
  { state: "fireball", file: "Fireball.fbx", loop: false, rootMotion: "strip", timeScale: 1.35, fallback: "punch" },
];

// ----------------------------------------------------------------------------
//  MOVE TABLE  (attacks + their key bindings, shown on screen for P1)
// ----------------------------------------------------------------------------
export const MOVES: MoveDef[] = [
  { id: "punch", label: "Jab", key: "J", inputs: ["j"], damage: 6, reach: 1.25, hitAt: 0.3, recovery: 70, knockback: 1.1, timeScale: 1.5, kind: "melee" },
  { id: "heavy", label: "Cross", key: "U", inputs: ["u"], damage: 9, reach: 1.35, hitAt: 0.34, recovery: 120, knockback: 1.8, timeScale: 1.4, kind: "melee" },
  { id: "kick", label: "Kick", key: "K", inputs: ["k"], damage: 11, reach: 1.65, hitAt: 0.38, recovery: 150, knockback: 2.4, timeScale: 1.4, kind: "melee" },
  { id: "sweep", label: "Low Sweep", key: "I", inputs: ["i"], damage: 8, reach: 1.55, hitAt: 0.4, recovery: 170, knockback: 1.6, timeScale: 1.4, kind: "melee" },
  { id: "slash", label: "Slash", key: "H", inputs: ["h"], damage: 12, reach: 1.75, hitAt: 0.4, recovery: 180, knockback: 2.6, timeScale: 1.4, kind: "melee" },
  { id: "smash", label: "Smash", key: "P", inputs: ["p"], damage: 16, reach: 1.5, hitAt: 0.45, recovery: 260, knockback: 3.4, timeScale: 1.35, kind: "melee", comboScaled: true },
  { id: "combo", label: "Combo", key: "L", inputs: ["l"], damage: 14, reach: 1.55, hitAt: 0.42, recovery: 240, knockback: 3.0, timeScale: 1.45, kind: "melee", comboScaled: true },
  { id: "upper", label: "Uppercut", key: "O", inputs: ["o"], damage: 15, reach: 1.4, hitAt: 0.45, recovery: 260, knockback: 3.6, timeScale: 1.4, kind: "melee", comboScaled: true },
  { id: "fireball", label: "Fireball", key: "F", inputs: ["f"], damage: PROJECTILE.damage, reach: 0, hitAt: 0.45, recovery: 280, knockback: PROJECTILE.knockback, timeScale: 1.35, kind: "projectile" },
];

export const MOVE_BY_ID = Object.fromEntries(MOVES.map((m) => [m.id, m])) as Record<string, MoveDef>;

/** Non-attack action key hints shown on screen. */
export const ACTION_KEYS: { key: string; label: string }[] = [
  { key: "A / D", label: "Move" },
  { key: "W", label: "Jump" },
  { key: "S", label: "Block" },
  { key: "Shift", label: "Dodge" },
  { key: "Q", label: "Backflip" },
];

/** Character model base names (loader tries .glb then .fbx). fighter2 falls back to fighter1. */
export const MODELS = { p1: "fighter1", p2: "fighter2" };

/** Fallback rigged character if no FBX is present. */
export const FALLBACK_GLB =
  "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb";

export const MODELS_BASE = "/models";

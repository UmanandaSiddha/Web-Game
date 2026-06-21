// Single-player keyboard input (P2 is CPU; future netplay reuses these same keys).

import { MOVES } from "./config";

export interface InputFrame {
  moveDir: -1 | 0 | 1; // A/D
  jump: boolean; // edge
  block: boolean; // held
  dodge: boolean; // edge
  backflip: boolean; // edge
  attack: string | null; // a MoveDef.id pressed this frame (highest priority)
}

const held = new Set<string>();
// edge buffer keyed by action id
const edge = new Set<string>();

const HELD_KEYS: Record<string, string[]> = {
  left: ["a"],
  right: ["d"],
  block: ["s"],
};

// edge actions -> keys
const EDGE_KEYS: Record<string, string[]> = {
  jump: ["w"],
  dodge: ["shift"],
  backflip: ["q"],
  ...Object.fromEntries(MOVES.map((m) => [m.id, m.inputs])),
};

// priority order if several attack keys land on the same frame
const ATTACK_PRIORITY = ["fireball", "smash", "upper", "combo", "slash", "kick", "sweep", "heavy", "punch"];

const PREVENT = new Set([
  "a", "d", "w", "s", "q", "shift", "j", "u", "k", "i", "h", "p", "l", "o", "f",
  "arrowleft", "arrowright", "arrowup", "arrowdown", " ",
]);

let attached = false;
export function attachInput() {
  if (attached || typeof window === "undefined") return () => {};
  attached = true;

  const down = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (PREVENT.has(k)) e.preventDefault();
    if (held.has(k)) return; // ignore auto-repeat
    held.add(k);
    for (const [action, keys] of Object.entries(EDGE_KEYS)) {
      if (keys.includes(k)) edge.add(action);
    }
  };
  const up = (e: KeyboardEvent) => held.delete(e.key.toLowerCase());
  const blur = () => {
    held.clear();
    edge.clear();
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    attached = false;
  };
}

const anyHeld = (keys: string[]) => keys.some((k) => held.has(k));

export function readInput(): InputFrame {
  const left = anyHeld(HELD_KEYS.left);
  const right = anyHeld(HELD_KEYS.right);
  let attack: string | null = null;
  for (const id of ATTACK_PRIORITY) {
    if (edge.has(id)) {
      attack = id;
      break;
    }
  }
  const frame: InputFrame = {
    moveDir: ((right ? 1 : 0) - (left ? 1 : 0)) as -1 | 0 | 1,
    block: anyHeld(HELD_KEYS.block),
    jump: edge.has("jump"),
    dodge: edge.has("dodge"),
    backflip: edge.has("backflip"),
    attack,
  };
  edge.clear();
  return frame;
}

export function clearEdges() {
  edge.clear();
}

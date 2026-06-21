import * as THREE from "three";
import type { LoadedCharacter } from "./loadAssets";
import type { AnimState, MoveDef } from "./types";
import { CLIPS, CROSSFADE, MOVE_BY_ID, WORLD } from "./config";

const ONESHOT = new Set<AnimState>([
  "jump", "block", "hit", "stunned", "ko", "victory", "getup", "dodge", "backflip",
  "punch", "heavy", "kick", "sweep", "slash", "smash", "combo", "upper", "fireball",
]);
const HOLD_LAST = new Set<AnimState>(["ko", "victory"]); // don't auto-return to idle
const TIMESCALE: Record<string, number> = Object.fromEntries(CLIPS.map((c) => [c.state, c.timeScale]));

export interface FighterOpts {
  facing: 1 | -1;
  startX: number;
  tint?: THREE.ColorRepresentation;
}

export class Fighter {
  readonly root = new THREE.Group();
  private readonly inner: THREE.Group;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = {} as Record<AnimState, THREE.AnimationAction>;

  state: AnimState = "idle";
  facing: 1 | -1;
  private targetFacing: 1 | -1;

  x: number;
  private vx = 0;
  private vy = 0;
  private onGround = true;

  health: number;
  readonly maxHealth: number;
  dead = false;
  private locked = false;
  private hitstunUntil = 0;
  private invulnUntil = 0;
  private blocking = false;

  private atk: { def: MoveDef; dur: number; hitFired: boolean; canCancel: boolean } | null = null;
  private pendingHit: MoveDef | null = null;

  constructor(loaded: LoadedCharacter, opts: FighterOpts, maxHealth: number) {
    this.inner = loaded.make();
    if (opts.tint !== undefined) {
      const tint = new THREE.Color(opts.tint);
      this.inner.traverse((o) => {
        const m = o as THREE.Mesh;
        const mat = m.material as THREE.MeshStandardMaterial | undefined;
        if (mat && "color" in mat) mat.color.lerp(tint, 0.16); // subtle team hue only
      });
    }
    this.root.add(this.inner);

    this.mixer = new THREE.AnimationMixer(this.inner);
    for (const def of CLIPS) this.actions[def.state] = this.mixer.clipAction(loaded.clips[def.state]);

    this.facing = opts.facing;
    this.targetFacing = opts.facing;
    this.x = opts.startX;
    this.maxHealth = maxHealth;
    this.health = maxHealth;

    this.root.position.set(this.x, WORLD.groundY, 0);
    this.inner.rotation.y = opts.facing > 0 ? Math.PI / 2 : -Math.PI / 2;

    this.mixer.addEventListener("finished", this.onClipFinished);
    this.playNow("idle"); // force the idle clip so we never show the T-pose
  }

  // ---------------------------------------------------------------- animation
  /** Start a clip immediately, bypassing the same-state guard (used for idle/reset). */
  private playNow(next: AnimState) {
    const action = this.actions[next];
    if (!action) return;
    action.reset();
    action.enabled = true;
    action.setEffectiveTimeScale(TIMESCALE[next] ?? 1);
    action.setEffectiveWeight(1);
    action.setLoop(ONESHOT.has(next) ? THREE.LoopOnce : THREE.LoopRepeat, ONESHOT.has(next) ? 1 : Infinity);
    action.clampWhenFinished = ONESHOT.has(next);
    action.play();
    this.state = next;
  }

  private fadeTo(next: AnimState) {
    if (next === this.state && !ONESHOT.has(next)) return;
    const prev = this.actions[this.state];
    const action = this.actions[next];
    if (!action) return;
    action.reset();
    action.enabled = true;
    action.setEffectiveTimeScale(TIMESCALE[next] ?? 1);
    action.setEffectiveWeight(1);
    action.setLoop(ONESHOT.has(next) ? THREE.LoopOnce : THREE.LoopRepeat, ONESHOT.has(next) ? 1 : Infinity);
    action.clampWhenFinished = ONESHOT.has(next);
    action.fadeIn(CROSSFADE);
    if (prev && prev !== action) prev.fadeOut(CROSSFADE);
    action.play();
    this.state = next;
  }

  private onClipFinished = (e: { action?: THREE.AnimationAction }) => {
    if (this.dead || !e.action) return;
    if (HOLD_LAST.has(this.state)) return;
    // any finished one-shot returns us to neutral
    this.locked = false;
    this.atk = null;
    this.fadeTo("idle");
  };

  // ---------------------------------------------------------------- intents
  moveIntent(worldDir: -1 | 0 | 1) {
    if (this.locked || this.dead || this.blocking || !this.onGround) return;
    if (worldDir === 0) {
      this.vx = 0;
      this.fadeTo("idle");
      return;
    }
    this.vx = worldDir * WORLD.walkSpeed;
    this.fadeTo(worldDir * this.facing > 0 ? "walkForward" : "walkBack");
  }

  jump() {
    if (this.locked || this.dead || !this.onGround || this.blocking) return;
    this.vy = WORLD.jumpSpeed;
    this.onGround = false;
    this.fadeTo("jump");
  }

  dodge(now: number) {
    if (this.dead || !this.onGround || (this.locked && !this.atk?.canCancel)) return;
    this.locked = true;
    this.blocking = false;
    this.atk = null;
    this.invulnUntil = now + WORLD.dodgeTime;
    this.vx = -this.facing * WORLD.dodgeSpeed;
    this.fadeTo("dodge");
  }

  backflip(now: number) {
    if (this.dead || !this.onGround || (this.locked && !this.atk?.canCancel)) return;
    this.locked = true;
    this.blocking = false;
    this.atk = null;
    this.invulnUntil = now + WORLD.backflipTime;
    this.vx = -this.facing * WORLD.backflipSpeed;
    this.vy = WORLD.jumpSpeed * 0.7;
    this.onGround = false;
    this.fadeTo("backflip");
  }

  setBlock(on: boolean) {
    if (this.dead || this.locked) return;
    if (on && !this.blocking) this.fadeTo("block");
    if (!on && this.blocking) this.fadeTo("idle");
    this.blocking = on;
    if (on) this.vx = 0;
  }
  get isBlocking() {
    return this.blocking;
  }

  attack(moveId: string) {
    const def = MOVE_BY_ID[moveId];
    if (!def) return;
    const canStart = !this.dead && !this.blocking && this.onGround && (!this.locked || !!this.atk?.canCancel);
    if (!canStart) return;
    const action = this.actions[def.id as AnimState];
    const dur = action.getClip().duration / (TIMESCALE[def.id] ?? 1);
    this.atk = { def, dur, hitFired: false, canCancel: false };
    this.locked = true;
    this.vx = 0;
    this.fadeTo(def.id as AnimState);
  }

  /** Returns the move exactly once, on the frame the blow should connect. */
  consumeHit(): MoveDef | null {
    const h = this.pendingHit;
    this.pendingHit = null;
    return h;
  }

  receiveHit(rawDamage: number, fromDir: 1 | -1, knockback: number, now: number): number {
    if (this.dead || now < this.invulnUntil) return 0; // dodged / i-frames
    const dmg = this.blocking ? rawDamage * WORLD.blockDamageMul : rawDamage;
    this.health = Math.max(0, this.health - dmg);
    this.vx = fromDir * (this.blocking ? knockback * 0.35 : knockback);
    if (this.health <= 0) {
      this.die(fromDir);
    } else if (!this.blocking) {
      this.locked = true;
      this.hitstunUntil = now + WORLD.hitStun;
      this.atk = null;
      this.fadeTo(rawDamage >= 12 ? "stunned" : "hit");
    }
    return dmg;
  }

  die(fromDir: 1 | -1) {
    if (this.dead) return;
    this.dead = true;
    this.locked = true;
    this.vx = fromDir * 1.6;
    this.fadeTo("ko");
  }

  celebrate() {
    if (this.dead) return;
    this.locked = true;
    this.fadeTo("victory");
  }

  reset(startX: number, facing: 1 | -1) {
    this.health = this.maxHealth;
    this.dead = false;
    this.locked = false;
    this.blocking = false;
    this.atk = null;
    this.pendingHit = null;
    this.invulnUntil = 0;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.x = startX;
    this.facing = facing;
    this.targetFacing = facing;
    this.root.position.set(startX, WORLD.groundY, 0);
    this.inner.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.playNow("idle");
  }

  // ---------------------------------------------------------------- per-frame
  update(dt: number, now: number, foeX: number) {
    this.mixer.update(dt);

    const wantFace: 1 | -1 = foeX >= this.x ? 1 : -1;
    if (!this.locked && this.onGround) this.targetFacing = wantFace;
    this.facing = this.targetFacing;
    const targetYaw = this.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.inner.rotation.y = THREE.MathUtils.damp(this.inner.rotation.y, targetYaw, WORLD.facingLerp, dt);

    if (this.locked && this.hitstunUntil && now >= this.hitstunUntil && !this.dead && (this.state === "hit" || this.state === "stunned")) {
      this.locked = false;
      this.hitstunUntil = 0;
      if (this.onGround) this.fadeTo("idle");
    }

    if (!this.onGround) {
      this.vy += WORLD.gravity * dt;
      this.root.position.y += this.vy * dt;
      if (this.root.position.y <= WORLD.groundY) {
        this.root.position.y = WORLD.groundY;
        this.onGround = true;
        this.vy = 0;
        if (this.locked && this.state === "backflip") this.locked = false;
        if (!this.locked && !this.dead) this.fadeTo("idle");
      }
    }

    this.x += this.vx * dt;
    if (this.locked || this.dead || !this.onGround) this.vx *= 0.9;
    else if (this.state !== "walkForward" && this.state !== "walkBack") this.vx = 0;
    this.x = THREE.MathUtils.clamp(this.x, -WORLD.arenaHalfWidth, WORLD.arenaHalfWidth);
    this.root.position.x = this.x;

    if (this.atk) {
      const a = this.actions[this.state];
      const f = a.time / a.getClip().duration;
      if (!this.atk.hitFired && f >= this.atk.def.hitAt) {
        this.atk.hitFired = true;
        this.pendingHit = this.atk.def;
      }
      if (f >= 0.55) this.atk.canCancel = true;
    }
  }

  get position() {
    return this.root.position;
  }
  get isLocked() {
    return this.locked;
  }
  get isAttacking() {
    return this.atk !== null;
  }
  get isAirborne() {
    return !this.onGround;
  }
}

"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Fighter } from "./Fighter";
import { Projectiles } from "./Projectiles";
import type { LoadResult } from "./loadAssets";
import type { GameMode, GamePhase, HudSnapshot } from "./types";
import { PROJECTILE, RULES, WORLD } from "./config";
import { attachInput, readInput, clearEdges } from "./input";
import { bus } from "./EventBus";
import { sfx } from "./Sound";

const NAMES = { p1: "PLAYER 1", cpu: "C.P.U." };
const CAM_BASE = new THREE.Vector3(0, 1.5, 5.7);
const CAM_LOOK = new THREE.Vector3(0, 1.05, 0);

type Phase = "intro" | "fight" | "roundEnd" | "matchOver";

interface MatchState {
  phase: Phase;
  round: number;
  timer: number;
  p1Rounds: number;
  p2Rounds: number;
  announce: string | null;
  banner: number;
  phaseT: number;
  combo: { p1: number; p2: number };
  comboMs: { p1: number; p2: number };
  shake: number;
  matchWinner: "p1" | "p2" | null;
  wiped: boolean; // emitted the between-rounds black wipe yet?
}

interface AIState {
  next: number;
  move: -1 | 0 | 1;
  blockUntil: number;
}

export function GameWorld({ assets, mode, paused }: { assets: LoadResult; mode: GameMode; paused: boolean }) {
  void mode; // P2 is always CPU for now (netplay later reuses P1 controls)
  const { camera, scene } = useThree();

  const shots = useMemo(() => new Projectiles(6), []);
  const f1 = useMemo(() => new Fighter(assets.p1, { facing: 1, startX: -WORLD.startX, tint: "#28a8d8" }, RULES.maxHealth), [assets]);
  const f2 = useMemo(() => new Fighter(assets.p2, { facing: -1, startX: WORLD.startX, tint: "#e0556e" }, RULES.maxHealth), [assets]);

  const match = useRef<MatchState>(newMatch());
  const ai = useRef<AIState>({ next: 0, move: 0, blockUntil: 0 });

  function newMatch(): MatchState {
    return {
      phase: "intro", round: 1, timer: RULES.roundTime, p1Rounds: 0, p2Rounds: 0,
      announce: "ROUND 1", banner: 1.2, phaseT: 1.2,
      combo: { p1: 0, p2: 0 }, comboMs: { p1: 0, p2: 0 }, shake: 0, matchWinner: null, wiped: false,
    };
  }

  function startRound(m: MatchState) {
    // the fighter who lost the previous round rises with a get-up animation (mid-match only)
    const rise = m.round > 1;
    f1.reset(-WORLD.startX, 1, rise && f1.dead);
    f2.reset(WORLD.startX, -1, rise && f2.dead);
    shots.reset();
    m.phase = "intro";
    m.timer = RULES.roundTime;
    m.announce = `ROUND ${m.round}`;
    m.banner = 1.1;
    m.phaseT = 1.1;
    m.combo = { p1: 0, p2: 0 };
    m.comboMs = { p1: 0, p2: 0 };
    m.wiped = false;
  }

  useEffect(() => {
    scene.add(f1.root, f2.root, shots.group);
    const detach = attachInput();
    clearEdges();
    camera.position.copy(CAM_BASE);
    camera.lookAt(CAM_LOOK);

    const offRematch = bus.on("rematch", () => {
      match.current = newMatch();
      startRound(match.current);
    });

    match.current = newMatch();
    f1.reset(-WORLD.startX, 1);
    f2.reset(WORLD.startX, -1);

    return () => {
      detach();
      offRematch();
      scene.remove(f1.root, f2.root, shots.group);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f1, f2, shots]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const now = performance.now();
    const m = match.current;
    if (paused) return;

    if (m.phase === "intro") {
      m.phaseT -= dt;
      if (m.phaseT <= 0) {
        m.phase = "fight";
        m.announce = "FIGHT!";
        m.banner = 0.7;
        sfx.play("fight");
      }
    } else if (m.phase === "fight") {
      if (m.banner > 0) {
        m.banner -= dt;
        if (m.banner <= 0) m.announce = null;
      }
      m.timer = Math.max(0, m.timer - dt);

      handlePlayer(now);
      handleAI(now);

      for (const k of ["p1", "p2"] as const) {
        if (m.comboMs[k] > 0) {
          m.comboMs[k] -= dt * 1000;
          if (m.comboMs[k] <= 0) m.combo[k] = 0;
        }
      }

      if (f1.health <= 0 || f2.health <= 0) {
        const p1Win = f2.health <= 0 && f1.health > 0;
        endRound(m, p1Win ? "p1" : f1.health <= 0 ? "p2" : "p1", "K.O.");
      } else if (m.timer <= 0) {
        const w = f1.health === f2.health ? null : f1.health > f2.health ? "p1" : "p2";
        endRound(m, w, w ? "TIME UP" : "DRAW");
      }
    } else if (m.phase === "roundEnd") {
      m.phaseT -= dt;
      // fire a black wipe shortly before the reset so the loser standing back up is hidden
      if (!m.matchWinner && !m.wiped && m.phaseT <= 0.55) {
        m.wiped = true;
        bus.emit("roundWipe", undefined);
      }
      if (m.phaseT <= 0) {
        if (m.matchWinner) {
          m.phase = "matchOver";
          m.announce = `${m.matchWinner === "p1" ? NAMES.p1 : NAMES.cpu} WINS`;
          sfx.play("win");
        } else {
          m.round += 1;
          startRound(m);
        }
      }
    }

    f1.update(dt, now, f2.x);
    f2.update(dt, now, f1.x);

    resolveHit(f1, f2, "p1", m, now);
    resolveHit(f2, f1, "p2", m, now);

    // projectiles
    for (const h of shots.update(dt, [f1, f2])) {
      const who = h.owner === f1 ? "p1" : "p2";
      const wasBlocking = h.target.isBlocking;
      const dealt = h.target.receiveHit(PROJECTILE.damage, h.dir, PROJECTILE.knockback, now);
      if (dealt > 0 && !wasBlocking) {
        m.combo[who] += 1;
        m.comboMs[who] = RULES.comboWindow;
      }
      if (dealt > 0) {
        m.shake = Math.min(1.0, m.shake + 0.6);
        sfx.play(wasBlocking ? "block" : "hit");
      }
    }

    if (m.shake > 0) m.shake = Math.max(0, m.shake - dt * 3.2);
    camera.position.set(CAM_BASE.x + (Math.random() - 0.5) * m.shake * 0.45, CAM_BASE.y + (Math.random() - 0.5) * m.shake * 0.35, CAM_BASE.z);
    camera.lookAt(CAM_LOOK);

    emitHud(m);
  });

  // ----------------------------------------------------------------- player
  function handlePlayer(now: number) {
    const inp = readInput();
    if (f1.dead) return;
    if (inp.dodge) {
      if (f1.dodge(now)) sfx.play("whoosh");
      return;
    }
    if (inp.backflip) {
      if (f1.backflip(now)) sfx.play("jump");
      return;
    }
    if (inp.block) {
      f1.setBlock(true);
    } else {
      f1.setBlock(false);
      f1.moveIntent(inp.moveDir);
      if (inp.jump && f1.jump()) sfx.play("jump");
    }
    if (inp.attack && f1.attack(inp.attack)) {
      sfx.play(inp.attack === "fireball" ? "fireball" : "whoosh");
    }
  }

  // ----------------------------------------------------------------- CPU AI
  function handleAI(now: number) {
    const a = ai.current;
    const dist = f1.x - f2.x;
    const adist = Math.abs(dist);
    const toFoe = (Math.sign(dist) || 1) as -1 | 1;
    const atk = (id: string) => {
      if (f2.attack(id)) sfx.play(id === "fireball" ? "fireball" : "whoosh");
    };

    if (now > a.next) {
      a.next = now + 140 + Math.random() * 320; // quicker decisions = proactive
      if (f1.isAttacking && adist < 2.0 && Math.random() < 0.45) {
        if (Math.random() < 0.4 && f2.dodge(now)) sfx.play("whoosh");
        else a.blockUntil = now + 240 + Math.random() * 200;
        a.move = 0;
      } else if (adist > 1.7) {
        a.move = toFoe;
        a.blockUntil = 0;
        if (adist > 4 && Math.random() < 0.25) atk("fireball"); // zone from afar
      } else {
        a.move = 0;
        a.blockUntil = 0;
        const r = Math.random();
        if (r < 0.26) atk("punch");
        else if (r < 0.46) atk("kick");
        else if (r < 0.6) atk("heavy");
        else if (r < 0.72) atk("combo");
        else if (r < 0.8) atk("upper");
        else if (r < 0.86) atk("smash");
        else if (r < 0.92) f2.backflip(now);
        else a.move = -toFoe as -1 | 1;
      }
    }

    if (now < a.blockUntil) {
      f2.setBlock(true);
      return;
    }
    f2.setBlock(false);
    f2.moveIntent(a.move);
  }

  // ----------------------------------------------------------------- hits
  function resolveHit(attacker: Fighter, defender: Fighter, who: "p1" | "p2", m: MatchState, now: number) {
    const def = attacker.consumeHit();
    if (!def) return;

    if (def.kind === "projectile") {
      shots.spawn(attacker.position.x + attacker.facing * 0.5, PROJECTILE.spawnHeight, attacker.facing as 1 | -1, attacker);
      return;
    }

    const dx = defender.position.x - attacker.position.x;
    const facingFoe = Math.sign(dx) === attacker.facing;
    const horiz = Math.abs(dx);
    const vert = Math.abs(defender.position.y - attacker.position.y);
    if (!facingFoe || horiz > def.reach + 0.2 || vert > 1.5) return;

    let dmg = def.damage;
    if (def.comboScaled) dmg += m.combo[who] * 2;
    const wasBlocking = defender.isBlocking;
    const dealt = defender.receiveHit(dmg, attacker.facing as 1 | -1, def.knockback, now);
    if (dealt <= 0) return; // dodged / i-frames

    if (!wasBlocking) {
      m.combo[who] += 1;
      m.comboMs[who] = RULES.comboWindow;
    }
    m.shake = Math.min(1.1, m.shake + (def.comboScaled ? 0.8 : def.id === "kick" ? 0.5 : 0.32));
    sfx.play(wasBlocking ? "block" : def.id === "kick" || def.id === "sweep" ? "kick" : "hit");
  }

  function endRound(m: MatchState, winner: "p1" | "p2" | null, label: string) {
    m.phase = "roundEnd";
    m.phaseT = 2.6;
    m.announce = label;
    m.shake = Math.min(1.2, m.shake + 0.7);
    if (winner) sfx.play("ko");
    if (winner === "p1") {
      m.p1Rounds += 1;
      f2.die(1);
      f1.celebrate();
      if (m.p1Rounds >= RULES.roundsToWin) m.matchWinner = "p1";
    } else if (winner === "p2") {
      m.p2Rounds += 1;
      f1.die(-1);
      f2.celebrate();
      if (m.p2Rounds >= RULES.roundsToWin) m.matchWinner = "p2";
    }
  }

  function emitHud(m: MatchState) {
    const phaseMap: Record<Phase, GamePhase> = { intro: "intro", fight: "fight", roundEnd: "roundOver", matchOver: "matchOver" };
    const snap: HudSnapshot = {
      p1: { id: "p1", name: NAMES.p1, health: f1.health, maxHealth: f1.maxHealth, combo: m.combo.p1, rounds: m.p1Rounds },
      p2: { id: "p2", name: NAMES.cpu, health: f2.health, maxHealth: f2.maxHealth, combo: m.combo.p2, rounds: m.p2Rounds },
      timer: Math.ceil(m.timer),
      phase: phaseMap[m.phase],
      announce: m.announce,
    };
    bus.emit("hud", snap);
  }

  return null;
}

# Architecture

A module-by-module guide to how **NEON CLASH** works. Read the [README](../README.md) first for the high-level picture and diagrams.

## Design principles

1. **React owns the DOM, Three.js owns the 3D world.** UI (menus, HUD, overlays) is plain React. The fight (fighters, stage, physics) lives inside an `<canvas>` driven by react-three-fiber. Neither reaches into the other.
2. **The game loop runs outside React.** All per-frame logic happens in a single `useFrame` callback in `GameWorld`. React state is **not** updated per frame — instead the loop emits a snapshot through the EventBus, and only the HUD re-renders. This keeps 60fps gameplay decoupled from React's reconciliation.
3. **Data-driven.** Tuning, animation mapping, and the moveset are tables in `config.ts`. Adding a move or retuning the game rarely needs logic changes.
4. **Fail soft.** Missing assets fall back (placeholder character, animation fallback chain) so the app always boots.

---

## Module reference

### `src/components/` — UI layer

| File | Responsibility |
|---|---|
| `GameClient.tsx` | Top-level **screen state machine** (`menu` → `loading` → `playing`). Loads assets, owns `paused`, subscribes to `bus.on("hud")`, renders the right overlay, dynamically imports `GameCanvas` (`ssr:false`). |
| `MainMenu.tsx` | Title screen, **FIGHT** button, full move/control list, asset-status chip. |
| `HUD.tsx` | In-fight overlay: chip-trail health bars, round pips, timer, combo pop-ups, center announce banner. Pure function of a `HudSnapshot`. |
| `ControlsBar.tsx` | Collapsible on-screen P1 move legend (reads `MOVES` + `ACTION_KEYS`). |
| `LoadingScreen` / `PauseOverlay` / `ResultOverlay` / `SetupGuide` | Self-explanatory overlays. `SetupGuide` shows the Mixamo download table. |

### `src/game/` — engine

| File | Responsibility |
|---|---|
| `config.ts` | **All tuning + data tables**: `WORLD`, `RULES`, `PROJECTILE`, `CLIPS`, `MOVES` (+ `MOVE_BY_ID`), `ACTION_KEYS`, `MODELS`, `FALLBACK_GLB`. |
| `types.ts` | Shared types: `AnimState`, `AttackId`, `MoveDef`, `HudSnapshot`, `GamePhase`, etc. |
| `EventBus.ts` | Tiny typed pub/sub. The only channel between the 3D world and React. |
| `input.ts` | Window keyboard listener. Tracks **held** keys and **edge** (just-pressed) actions; `readInput()` returns one `InputFrame` per tick and clears edges. |
| `loadAssets.ts` | Loads character (glb→fbx) + animation clips, retargets them, builds `LoadResult`. Falls back to a CDN Xbot. |
| `Fighter.ts` | Per-fighter **controller**: model, `AnimationMixer`, animation state machine, physics, combat, health. |
| `GameWorld.tsx` | The **game loop** (`useFrame`): match phases, input, AI, fighter updates, hit resolution, combos, projectiles, camera shake, HUD emission. |
| `GameCanvas.tsx` | `<Canvas>` + renderer config (shadows, ACES tone mapping). |
| `StreetStage.tsx` | Lights, parallax city skyline, neon, embers, car streaks, street lamps, road. Animates via its own `useFrame`. |
| `ImpactFX.ts` | Pooled additive billboard **hit sparks**. |
| `Projectiles.ts` | Pooled **fireball** orbs (move + collide + damage). |

---

## EventBus contract

`EventBus.ts` defines every message and its direction. Subscribe with `bus.on(type, fn)` (returns an unsubscribe), publish with `bus.emit(type, payload)`.

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `hud` | world → UI | `HudSnapshot` | Per-frame HUD state (health, timer, combo, phase, announce). |
| `loadProgress` | loader → UI | `{ label }` | Loading screen text. |
| `rematch` | UI → world | – | Reset the match. |
| `toMenu` | UI → world | – | Return to menu. |
| `pause` / `shake` / `hitSpark` / `assetsMissing` | mixed | … | Reserved / auxiliary. |

> Pause is passed as a **prop** (`GameWorld({ paused })`), not an event, because it gates the loop directly.

---

## The game loop & match state machine

`GameWorld` holds a `MatchState` ref and advances it every frame. Phases:

```
intro ──(timer)──► fight ──(KO / time-up)──► roundEnd ──┬─(more rounds)─► intro
                                                        └─(2 rounds won)─► matchOver
```

- **intro** — "ROUND n" banner; fighters idle. After ~1.1s → `fight` with a "FIGHT!" flash.
- **fight** — input + AI + physics + hit resolution + combo decay + round-end checks run.
- **roundEnd** — winner celebrates / loser KO'd; ~2.6s pause, then next round or match over.
- **matchOver** — winner banner; React shows `ResultOverlay` (rematch / menu).

Each frame ends by emitting a `HudSnapshot` over the bus. Time is accumulated from `dt` (clamped to 1/30 to survive hitches); wall-clock timestamps use `performance.now()`.

---

## Fighter — animation state machine

A `Fighter` wraps the model in two nested groups:

- `root` — **world transform**: `x` (ground position) and `y` (jump height), driven in code.
- `inner` — the model; yaw-rotated to always face the foe.

### Animation

One `AnimationAction` is created per `AnimState`. Transitions use **crossfade** (`fadeIn`/`fadeOut` over `CROSSFADE`s). One-shot states (attacks, jump, hit, dodge, KO…) use `LoopOnce` + `clampWhenFinished`; locomotion loops. A `finished` listener returns one-shots to `idle` (except `ko`/`victory`, which hold).

> **The T-pose fix:** the constructor and `reset()` call `playNow("idle")`, which bypasses the same-state guard in `fadeTo`. Without this, the initial `fadeTo("idle")` would early-return (state already `"idle"`) and **no clip would play**, leaving the bind pose (T-pose) until the first state change.

### Locking & cancel windows

`locked` blocks new movement/attacks during attacks, hit-stun, dodge, etc. An attack records `{ def, dur, hitFired, canCancel }`. Past 55% of the clip, `canCancel` lets the next attack interrupt — enabling combo chaining without waiting for full recovery.

### Combat timing

During an attack, `update()` watches `action.time / duration`. When it crosses the move's `hitAt` fraction, it sets `pendingHit = def`. The game loop calls `consumeHit()` (returns the move once) on the frame the blow should connect, then does the geometry check.

### Defense

- `dodge()` / `backflip()` set `invulnUntil = now + window` (i-frames). `receiveHit` returns 0 while invulnerable.
- `setBlock()` reduces incoming damage to `WORLD.blockDamageMul` and cuts knockback.

---

## Hit detection & combos

In `GameWorld.resolveHit(attacker, defender, who)`:

1. `consumeHit()` — bail unless this is the connect frame.
2. **Projectile?** Spawn a fireball instead of a melee check.
3. **Melee** — require: defender is in front (`sign(dx) === attacker.facing`), within `reach`, and vertically close.
4. Apply damage (`comboScaled` moves add `combo × 2`), knockback in the attacker's facing direction.
5. On a clean (non-blocked) hit: increment that side's combo and refresh `comboMs = RULES.comboWindow`. Combo decays to 0 when the window lapses.
6. Spawn an impact spark + add camera shake.

---

## CPU AI

A lightweight reactive controller (`handleAI`) on a short decision timer (~140–460ms → "proactive"):

- **Far** (`> 1.7u`): approach; occasionally fireball from long range.
- **Player attacking & close**: block or dodge (~45%).
- **In range**: weighted choice of punch / kick / heavy / combo / uppercut / smash, occasional backflip or step-back.

Tune aggression via the probabilities and the decision interval in `handleAI`.

---

## Projectiles (Fireball)

`Projectiles` is a fixed pool of emissive orbs + point lights. `spawn(x, y, dir, owner)` activates one; `update(dt, fighters)` moves them, pulses the glow, and returns `ProjectileHit`s when one overlaps a non-owner fighter. The loop applies damage/knockback/combo/FX from those hits. Orbs despawn on hit, lifetime, or leaving the arena.

---

## Asset loading & retargeting (`loadAssets.ts`)

The hardest part — making arbitrary Mixamo exports "just work":

1. **Character** — `loadCharacter(base)` tries `${base}.glb` (GLTFLoader) then `${base}.fbx` (FBXLoader). glb is preferred because old FBX (v6100) is unsupported and is pre-converted with `fbx2gltf`.
2. **Bone-name normalization** — glTF keeps `mixamorig:Hips`; FBX clips use `mixamorigHips`. `stripColons()` (model) + `normalizeClip()` (clips) remove `:` on both sides so the FBX clips **retarget onto the glb skeleton**.
3. **Root-motion removal** — `lockRoot()` **deletes the hips position track**. Mixamo bakes it in centimetres; applied to a metre-scale glb it would fling the model off-screen. Bone *rotations* are unit-independent and kept. Movement/jumps are code-driven.
4. **Auto-fit** — `prepModel()` measures the model's bounding box, scales it to `WORLD.fighterHeight`, drops the feet to `y=0`, and centers it. Unit-agnostic, so any export sits correctly on the stage. It also softens materials (roughness/metalness) and warms untextured mannequin materials toward skin tone.
5. **Fallback chain** — every `AnimState` resolves to *some* clip by walking `ClipDef.fallback` (e.g. `kick → punch → idle`), so a missing optional file never breaks the engine.
6. **Retry loader** — `tryLoadFBX` retries a few times; in dev, Next compiles routes lazily and the first asset requests can transiently 404.
7. **Placeholder** — if no character loads at all, `loadFallback()` fetches three.js `Xbot.glb` so the stage is never empty.

---

## Rendering & stage

- **Camera** — perspective, side-on at `(0, 1.5, 5.7)` looking at `(0, 1.05, 0)`; the loop re-applies it each frame with a shake offset.
- **Lights** — warm directional key (shadow-casting), cool fill, two team-colored rim spotlights, hemisphere ambient.
- **StreetStage** — procedural canvas textures (sky gradient + stars, two city-window layers, asphalt). The city layers scroll their `texture.offset.x` for parallax; neon signs pulse; embers (a `Points` cloud) drift upward; car-light planes loop across; street lamps glow with point lights.

---

## Extending the game

- **Add an attack:** add a `ClipDef` (state→file) to `CLIPS`, add a `MoveDef` (damage/reach/key) to `MOVES`, drop the `.fbx` in `public/models/`. Input, on-screen legend, and hit logic pick it up automatically.
- **Add a character:** see [README → Adding characters](../README.md#-adding-your-own-characters). Must be `mixamorig`-rigged, FBX 7.x or glb.
- **New stage:** copy `StreetStage.tsx`, swap it in `GameCanvas.tsx`.
- **Difficulty:** edit `WORLD` speeds / `handleAI` probabilities / `MOVES` damage.
- **2-player / online:** P2 is currently CPU; wire a second `InputFrame` source (local keys or network) into `handlePlayer` for `f2`.

---

## Known limitations

- Character art quality is entirely the imported asset's (engine just renders it).
- No audio yet.
- AI is heuristic, not learned.
- Single stage and two fixed fighters (data-driven, but no select screen yet).

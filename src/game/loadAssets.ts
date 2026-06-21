import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CLIPS, MODELS, MODELS_BASE, FALLBACK_GLB, WORLD } from "./config";
import type { AnimState } from "./types";
import { bus } from "./EventBus";

export interface LoadedCharacter {
  /** A fresh, scaled, shadow-casting model root ready to add to the scene. */
  make: () => THREE.Group;
  /** Every gameplay state resolved to a real clip (via fallback chain). */
  clips: Record<AnimState, THREE.AnimationClip>;
  /** States whose own clip file was absent (resolved via fallback chain). */
  missing: AnimState[];
  source: "mixamo" | "fallback";
}

export interface LoadResult {
  p1: LoadedCharacter;
  p2: LoadedCharacter;
  missing: AnimState[];
}

const fbx = new FBXLoader();
const gltf = new GLTFLoader();

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Load an FBX, retrying on failure. In dev, Next compiles the route lazily, so the
 * first asset requests can transiently 404 while the server is busy — a retry rides
 * that out instead of silently downgrading to the fallback character.
 * Returns null only if the file is genuinely absent after `attempts` tries.
 */
async function tryLoadFBX(url: string, attempts = 4): Promise<THREE.Group | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fbx.loadAsync(url);
    } catch {
      if (i < attempts - 1) await wait(300 + i * 250);
    }
  }
  return null;
}

/** Try a glb (GLTFLoader) first, then an fbx (FBXLoader) for the same base name. */
async function loadCharacter(base: string): Promise<THREE.Object3D | null> {
  try {
    const g = await gltf.loadAsync(`${MODELS_BASE}/${base}.glb`);
    return g.scene;
  } catch {
    /* no glb — fall through to fbx */
  }
  return tryLoadFBX(`${MODELS_BASE}/${base}.fbx`);
}

/**
 * Strip ":" from every node name (glTF keeps "mixamorig:Hips", FBX clips use
 * "mixamorigHips"). Normalising both sides lets FBX animations bind to a glb skeleton.
 */
function stripColons(obj: THREE.Object3D) {
  obj.traverse((o) => {
    if (o.name.includes(":")) o.name = o.name.replace(/:/g, "");
  });
}

function normalizeClip(clip: THREE.AnimationClip) {
  for (const track of clip.tracks) track.name = track.name.replace(/:/g, "");
}

/** Rest-pose world position of the hips bone within an (un-added) hierarchy. */
function hipsRest(obj: THREE.Object3D): THREE.Vector3 | null {
  obj.updateWorldMatrix(true, true);
  let bone: THREE.Object3D | null = null;
  obj.traverse((o) => {
    if (!bone && /Hips$/i.test(o.name)) bone = o;
  });
  return bone ? (bone as THREE.Object3D).getWorldPosition(new THREE.Vector3()) : null;
}

/**
 * Reconcile a clip's root (hips) position with the target skeleton.
 *
 * The clip's hips track is in its own units (Mixamo cm); the glb skeleton is in
 * metres. Naively applying it flings the character off-screen. We instead rescale
 * the track by the ratio of the two skeletons' rest hip heights, so motion is
 * preserved at the correct scale.
 *
 *  - "strip" (locomotion/attacks): lock X/Z to centre, keep a scaled vertical bob → in place.
 *  - "keep"  (KO / get-up): keep all three scaled → the body actually falls to the floor.
 *
 * If the hip heights can't be measured we fall back to dropping the track (safe in-place).
 */
function reconcileRoot(
  clip: THREE.AnimationClip,
  mode: "strip" | "keepY" | "keep",
  charHips: THREE.Vector3 | null,
  clipHips: THREE.Vector3 | null
) {
  const track = clip.tracks.find((t) => /Hips\.position$/i.test(t.name)) as THREE.VectorKeyframeTrack | undefined;
  if (!track) return clip;

  if (!charHips || !clipHips || clipHips.y < 0.0001) {
    clip.tracks = clip.tracks.filter((t) => t !== track); // can't scale safely → in place
    return clip;
  }

  const ratio = charHips.y / clipHips.y;
  const v = track.values; // [x,y,z, ...]
  const fx = v[0], fz = v[2]; // clip first-frame horizontal
  for (let i = 0; i < v.length; i += 3) {
    if (mode === "keep") {
      v[i] = charHips.x + (v[i] - fx) * ratio;
      v[i + 1] = charHips.y + (v[i + 1] - clipHips.y) * ratio;
      v[i + 2] = charHips.z + (v[i + 2] - fz) * ratio;
    } else {
      v[i] = charHips.x; // lock horizontal -> in place
      v[i + 1] = charHips.y + (v[i + 1] - clipHips.y) * ratio; // scaled vertical bob
      v[i + 2] = charHips.z;
    }
  }
  return clip;
}

function prepModel(root: THREE.Object3D, targetHeight: number): THREE.Group {
  // Auto-fit: scale to a fixed height so Mixamo's (cm) vs glb (m) units don't matter.
  root.updateWorldMatrix(true, true);
  const box0 = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box0.getSize(size);
  const h = size.y > 0.0001 ? size.y : 1;
  root.scale.setScalar(targetHeight / h);

  // Re-measure, then drop feet to y=0 and centre on x/z.
  root.updateWorldMatrix(true, true);
  const box1 = new THREE.Box3().setFromObject(root);
  root.position.x -= (box1.min.x + box1.max.x) / 2;
  root.position.z -= (box1.min.z + box1.max.z) / 2;
  root.position.y -= box1.min.y;

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false; // skinned bounds can be wrong; avoid pop-out
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mm of mats) {
        const mat = mm as THREE.MeshStandardMaterial;
        if (!mat || !("roughness" in mat)) continue;
        mat.roughness = 0.72; // skin/cloth, not plastic
        mat.metalness = 0.0;
        mat.envMapIntensity = 0.6;
        // if this is a flat, untextured mannequin material, warm it toward skin
        if (!mat.map && mat.color) mat.color.lerp(new THREE.Color("#caa18a"), 0.25);
      }
    }
  });
  const g = new THREE.Group();
  g.add(root);
  return g;
}

/** Walk the fallback chain in CLIPS until we land on a state that actually loaded. */
function resolve(raw: Partial<Record<AnimState, THREE.AnimationClip>>): {
  clips: Record<AnimState, THREE.AnimationClip>;
  missing: AnimState[];
} {
  const byState = new Map(CLIPS.map((c) => [c.state, c]));
  const missing: AnimState[] = [];
  const out = {} as Record<AnimState, THREE.AnimationClip>;

  for (const def of CLIPS) {
    let cur: AnimState | undefined = def.state;
    const seen = new Set<AnimState>();
    let found: THREE.AnimationClip | undefined;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      if (raw[cur]) {
        found = raw[cur];
        break;
      }
      cur = byState.get(cur)?.fallback;
    }
    if (!found) found = Object.values(raw)[0]; // last resort: anything
    if (!raw[def.state]) missing.push(def.state);
    if (found) out[def.state] = found;
  }
  return { clips: out, missing };
}

/** ---- Mixamo path (character glb/fbx + fbx animation clips) ---- */
async function loadMixamo(
  modelBase: string,
  fallbackModelBase: string,
  onStep: (label: string) => void
): Promise<LoadedCharacter | null> {
  onStep(`character (${modelBase})`);
  const model = (await loadCharacter(modelBase)) ?? (await loadCharacter(fallbackModelBase));
  if (!model) return null;
  stripColons(model); // make glb "mixamorig:Hips" match fbx clip "mixamorigHips"
  const charHips = hipsRest(model); // rest hip height in the character's units

  const raw: Partial<Record<AnimState, THREE.AnimationClip>> = {};
  for (const def of CLIPS) {
    onStep(def.state);
    // optional clips legitimately 404 — only 1 retry so we don't stall on absent files
    const anim = await tryLoadFBX(`${MODELS_BASE}/${def.file}`, def.fallback === def.state ? 4 : 2);
    const clip = anim?.animations[0];
    if (!clip || !anim) continue;
    const clipHips = hipsRest(anim); // rest hip height in the clip's units (for rescaling)
    clip.name = def.state;
    normalizeClip(clip);
    raw[def.state] = reconcileRoot(clip, def.rootMotion, charHips, clipHips);
  }

  const { clips, missing } = resolve(raw);
  return {
    make: () => prepModel(cloneSkinned(model), WORLD.fighterHeight),
    clips,
    missing,
    source: "mixamo",
  };
}

/** ---- Fallback (Xbot.glb from three.js CDN) so the engine is never a blank stage ---- */
const FALLBACK_MAP: Partial<Record<AnimState, string>> = {
  idle: "idle",
  walkForward: "walk",
  jump: "run",
};

async function loadFallback(onStep: (label: string) => void): Promise<LoadedCharacter> {
  onStep("fallback character (Xbot)");
  const g = await gltf.loadAsync(FALLBACK_GLB);
  const model = g.scene;
  const byName = new Map(g.animations.map((a) => [a.name.toLowerCase(), a]));

  const raw: Partial<Record<AnimState, THREE.AnimationClip>> = {};
  for (const [state, clipName] of Object.entries(FALLBACK_MAP)) {
    const c = byName.get(clipName);
    if (c) {
      const clip = c.clone();
      clip.name = state;
      clip.tracks = clip.tracks.filter((t) => !/Hips\.position$/i.test(t.name)); // in place
      raw[state as AnimState] = clip;
    }
  }
  const { clips, missing } = resolve(raw);
  return {
    make: () => prepModel(cloneSkinned(model), WORLD.fighterHeight),
    clips,
    missing,
    source: "fallback",
  };
}

export async function loadAssets(): Promise<LoadResult> {
  const step = (label: string) => bus.emit("loadProgress", { loaded: 0, total: 0, label });

  // P1
  let p1 = await loadMixamo(MODELS.p1, MODELS.p1, step);
  // P2 — try its own model, else reuse P1's model file
  let p2 = await loadMixamo(MODELS.p2, MODELS.p1, step);

  if (!p1) {
    const fb = await loadFallback(step);
    p1 = fb;
    p2 = p2 ?? fb;
  }
  if (!p2) p2 = p1;

  return { p1, p2, missing: p1.missing };
}

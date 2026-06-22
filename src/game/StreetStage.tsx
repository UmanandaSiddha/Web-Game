"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { WORLD } from "./config";

// ---------------------------------------------------------------- textures
function makeSky() {
  const w = 64, h = 512;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#160a1f");
  g.addColorStop(0.45, "#2a0f24");
  g.addColorStop(0.75, "#4d1422");
  g.addColorStop(1, "#7a2420"); // warm chinatown haze near the rooftops
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(255,235,200,${0.15 + Math.random() * 0.5})`;
    ctx.fillRect(Math.random() * w, Math.random() * h * 0.45, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Chinatown skyline: tiered pagoda roofs, warm windows, vertical neon signboards
function makeChinatown(seed: number, tall: boolean) {
  const w = 1024, h = 512;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);

  const pagodaRoof = (x: number, bw: number, top: number, depth: number) => {
    ctx.fillStyle = "#7e1d1d";
    ctx.beginPath();
    ctx.moveTo(x - 10, top);
    ctx.quadraticCurveTo(x - 16, top - depth * 0.6, x - 4, top - depth); // up-curved left eave
    ctx.lineTo(x + bw + 4, top - depth);
    ctx.quadraticCurveTo(x + bw + 16, top - depth * 0.6, x + bw + 10, top); // right eave
    ctx.closePath();
    ctx.fill();
    // gold ridge
    ctx.strokeStyle = "rgba(240,200,90,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 4, top - depth);
    ctx.lineTo(x + bw + 4, top - depth);
    ctx.stroke();
  };

  let x = -20;
  while (x < w) {
    const bw = 70 + rnd() * 70;
    const bh = (tall ? 0.5 : 0.34) * h + rnd() * h * (tall ? 0.32 : 0.26);
    const top = h - bh;
    ctx.fillStyle = tall ? "#241019" : "#34161a";
    ctx.fillRect(x, top, bw, bh);

    // windows (warm + a few red)
    const cols = Math.floor(bw / 16), rows = Math.floor(bh / 18);
    for (let cx = 0; cx < cols; cx++)
      for (let cy = 0; cy < rows; cy++) {
        if (rnd() < 0.45) continue;
        ctx.fillStyle = rnd() < 0.25 ? "rgba(255,90,70,0.8)" : `rgba(255,200,120,${0.4 + rnd() * 0.5})`;
        ctx.fillRect(x + 6 + cx * 16, top + 8 + cy * 18, 7, 9);
      }

    // tiered pagoda roofs
    pagodaRoof(x, bw, top, 16);
    if (tall && rnd() < 0.6) pagodaRoof(x + bw * 0.18, bw * 0.64, top - 26, 13);

    // vertical neon signboard hanging on the facade
    if (rnd() < 0.6) {
      const sx = x + 8 + rnd() * (bw - 26), sy = top + 14, sw = 15, sh = 46 + rnd() * 40;
      ctx.fillStyle = rnd() < 0.5 ? "#d4242a" : "#1f7a8c";
      ctx.fillRect(sx, sy, sw, sh);
      ctx.fillStyle = "rgba(255,230,150,0.95)"; // faux characters (stacked strokes)
      const glyphs = Math.floor(sh / 16);
      for (let gi = 0; gi < glyphs; gi++) {
        const gy = sy + 4 + gi * 16;
        ctx.fillRect(sx + 4, gy, sw - 8, 2);
        ctx.fillRect(sx + 4, gy + 5, sw - 8, 2);
        ctx.fillRect(sx + 7, gy, 2, 11);
      }
    }
    x += bw + 4 + rnd() * 8;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(2.2, 1);
  return t;
}

// Asphalt street with lane markings (the fighting plane)
function makeStreet() {
  const w = 1024, h = 1024;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#3a3940";
  ctx.fillRect(0, 0, w, h);
  // grain
  for (let i = 0; i < 6000; i++) {
    const v = Math.random();
    ctx.fillStyle = `rgba(${v < 0.5 ? "0,0,0" : "255,255,255"},${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  // double-yellow centre line (runs left-right, just behind the fighters)
  ctx.fillStyle = "#e8b820";
  ctx.fillRect(0, h * 0.52, w, 7);
  ctx.fillRect(0, h * 0.52 + 13, w, 7);
  // dashed white lane lines
  ctx.fillStyle = "rgba(230,230,235,0.85)";
  for (const vy of [h * 0.3, h * 0.72]) for (let dx = 0; dx < w; dx += 70) ctx.fillRect(dx, vy, 38, 6);
  // kerb strip at the back edge
  ctx.fillStyle = "#5a5560";
  ctx.fillRect(0, h * 0.14, w, 10);
  ctx.fillStyle = "#26242b";
  ctx.fillRect(0, h * 0.14 + 10, w, 6);
  // a manhole
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(w * 0.7, h * 0.62, 34, 0, Math.PI * 2); ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- components
function Lanterns({ y, z, count, spread, sway }: { y: number; z: number; count: number; spread: number; sway: number }) {
  const refs = useRef<THREE.Group[]>([]);
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ x: -spread / 2 + (i / (count - 1)) * spread, phase: i * 0.7 })),
    [count, spread]
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((g, i) => { if (g) g.rotation.z = Math.sin(t * 0.8 + items[i].phase) * 0.12 * sway; });
  });
  return (
    <>
      {items.map((it, i) => (
        <group key={i} position={[it.x, y, z]} ref={(el) => { if (el) refs.current[i] = el; }}>
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.44, 4]} />
            <meshBasicMaterial color="#120c0c" />
          </mesh>
          <mesh position={[0, -0.5, 0]} scale={[1, 1.25, 1]}>
            <sphereGeometry args={[0.17, 16, 12]} />
            <meshStandardMaterial color="#e23b2e" emissive="#ff3622" emissiveIntensity={2.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.31, 0]}><cylinderGeometry args={[0.05, 0.05, 0.04, 8]} /><meshStandardMaterial color="#f0c84a" emissive="#caa000" emissiveIntensity={0.5} /></mesh>
          <mesh position={[0, -0.69, 0]}><cylinderGeometry args={[0.05, 0.05, 0.04, 8]} /><meshStandardMaterial color="#f0c84a" /></mesh>
          <mesh position={[0, -0.78, 0]}><cylinderGeometry args={[0.012, 0.012, 0.12, 4]} /><meshBasicMaterial color="#f0c84a" /></mesh>
          {i % 3 === 1 && <pointLight position={[0, -0.5, 0.1]} intensity={2.4} distance={3.4} color="#ff5a3a" />}
        </group>
      ))}
    </>
  );
}

function NeonSign({ position, color, size }: { position: [number, number, number]; color: string; size: [number, number] }) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s) => { if (ref.current) ref.current.opacity = 0.5 + Math.sin(s.clock.elapsedTime * (4 + position[0]) + position[1]) * 0.3; });
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial ref={ref} color={color} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function Embers() {
  const ref = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const n = 130;
    const positions = new Float32Array(n * 3);
    const speeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 7;
      positions[i * 3 + 2] = -2 - Math.random() * 6;
      speeds[i] = 0.25 + Math.random() * 0.6;
    }
    return { positions, speeds };
  }, []);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const arr = g.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < speeds.length; i++) {
      arr[i * 3 + 1] += speeds[i] * dt;
      if (arr[i * 3 + 1] > 7.5) arr[i * 3 + 1] = -0.2;
    }
    g.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffae55" size={0.05} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

export function StreetStage() {
  const sky = useMemo(makeSky, []);
  const cityFar = useMemo(() => makeChinatown(11, true), []);
  const cityMid = useMemo(() => makeChinatown(53, false), []);
  const street = useMemo(makeStreet, []);

  useFrame((_, dt) => {
    cityFar.offset.x += dt * 0.003;
    cityMid.offset.x += dt * 0.007;
  });

  return (
    <group>
      <color attach="background" args={["#1c0c22"]} />
      <fog attach="fog" args={["#3a1428", 20, 46]} />

      {/* warm chinatown lighting */}
      <hemisphereLight args={["#b07a7a", "#241620", 0.7]} />
      <directionalLight
        position={[3, 8, 5]}
        intensity={2.5}
        color="#ffe2c0"
        castShadow
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-6, 5, 2]} intensity={0.55} color="#ff8a6a" />
      <spotLight position={[-7, 6, -2]} intensity={80} angle={0.7} penumbra={0.9} color="#ff4d4d" distance={26} />
      <spotLight position={[7, 6, -2]} intensity={80} angle={0.7} penumbra={0.9} color="#ffc23a" distance={26} />
      <ambientLight intensity={0.18} color="#ffd0b0" />

      {/* sky */}
      <mesh position={[0, 7, -16]}>
        <planeGeometry args={[80, 30]} />
        <meshBasicMaterial map={sky} />
      </mesh>

      {/* Chinatown backdrop (parallax) */}
      <mesh position={[0, 5.5, -12]}>
        <planeGeometry args={[60, 14]} />
        <meshBasicMaterial map={cityFar} transparent />
      </mesh>
      <mesh position={[0, 4.0, -8.5]}>
        <planeGeometry args={[48, 11]} />
        <meshBasicMaterial map={cityMid} transparent />
      </mesh>

      {/* neon signs + hanging lanterns */}
      <NeonSign position={[-5.5, 3.4, -7.5]} color="#ff2d3a" size={[0.6, 1.8]} />
      <NeonSign position={[5.0, 3.0, -8]} color="#ffc23a" size={[0.5, 1.5]} />
      <NeonSign position={[2.4, 4.2, -7]} color="#34d0e0" size={[0.45, 1.3]} />
      <Lanterns y={4.0} z={-2.4} count={9} spread={16} sway={1} />
      <Lanterns y={4.6} z={-6} count={7} spread={20} sway={0.6} />

      <Embers />

      {/* the street (base) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WORLD.groundY, 0]} receiveShadow>
        <planeGeometry args={[80, 40]} />
        <meshStandardMaterial map={street} roughness={0.6} metalness={0.3} color="#9a98a2" />
      </mesh>

      {/* red chinatown lampposts */}
      {[-7, 7].map((x) => (
        <group key={x} position={[x, 0, -2.6]}>
          <mesh position={[0, 1.8, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 3.6, 8]} />
            <meshStandardMaterial color="#7a1f1f" roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[0, 3.55, 0]}>
            <boxGeometry args={[0.5, 0.08, 0.12]} />
            <meshStandardMaterial color="#8a2424" />
          </mesh>
          <mesh position={[0, 3.35, 0]} scale={[1, 1.2, 1]}>
            <sphereGeometry args={[0.13, 12, 10]} />
            <meshStandardMaterial color="#ff5a3a" emissive="#ff3622" emissiveIntensity={2.2} />
          </mesh>
          <pointLight position={[0, 3.3, 0.1]} intensity={5} distance={8} color="#ff7a4a" />
        </group>
      ))}
    </group>
  );
}

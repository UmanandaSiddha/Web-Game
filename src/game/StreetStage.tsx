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
  g.addColorStop(0, "#0a0a1f");
  g.addColorStop(0.45, "#1b1140");
  g.addColorStop(0.75, "#3b1a4d");
  g.addColorStop(1, "#5a2348");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.6})`;
    ctx.fillRect(Math.random() * w, Math.random() * h * 0.5, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeCity(seed: number, tall: boolean, windowTint: string) {
  const w = 1024, h = 512;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  let x = 0;
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  while (x < w) {
    const bw = 50 + rnd() * 90;
    const bh = (tall ? 0.45 : 0.28) * h + rnd() * h * (tall ? 0.4 : 0.3);
    const top = h - bh;
    ctx.fillStyle = tall ? "#0d0a1c" : "#15102a";
    ctx.fillRect(x, top, bw, bh);
    // windows
    const cols = Math.floor(bw / 14);
    const rows = Math.floor(bh / 16);
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        if (rnd() < 0.5) continue;
        ctx.fillStyle = rnd() < 0.2 ? windowTint : `rgba(255,210,140,${0.35 + rnd() * 0.5})`;
        ctx.fillRect(x + 5 + cx * 14, top + 6 + cy * 16, 6, 8);
      }
    }
    x += bw + 4 + rnd() * 10;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(2.4, 1);
  return t;
}

function makeRoad() {
  const w = 512, h = 512;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0e0d12";
  ctx.fillRect(0, 0, w, h);
  // subtle asphalt noise
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  // bright fight line
  ctx.strokeStyle = "rgba(120,90,160,0.5)";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.5); ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- components
function NeonSign({ position, color, size }: { position: [number, number, number]; color: string; size: [number, number] }) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s) => {
    if (ref.current) ref.current.opacity = 0.55 + Math.sin(s.clock.elapsedTime * (3 + position[0])) * 0.25;
  });
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
    const n = 140;
    const positions = new Float32Array(n * 3);
    const speeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 7;
      positions[i * 3 + 2] = -2 - Math.random() * 6;
      speeds[i] = 0.3 + Math.random() * 0.7;
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
      <pointsMaterial color="#ffb060" size={0.05} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function CarStreaks() {
  const refs = useRef<THREE.Mesh[]>([]);
  const data = useMemo(
    () => [
      { y: 0.35, z: -7.5, dir: 1, color: "#ff5a4a", speed: 6 },
      { y: 0.5, z: -8.5, dir: -1, color: "#ffd27a", speed: 4.5 },
      { y: 0.3, z: -7.0, dir: 1, color: "#7ad0ff", speed: 7.5 },
    ],
    []
  );
  useFrame((_, dt) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      const d = data[i];
      m.position.x += d.dir * d.speed * dt;
      if (d.dir > 0 && m.position.x > 11) m.position.x = -11;
      if (d.dir < 0 && m.position.x < -11) m.position.x = 11;
    });
  });
  return (
    <>
      {data.map((d, i) => (
        <mesh key={i} ref={(el) => { if (el) refs.current[i] = el; }} position={[(i - 1) * 5, d.y, d.z]}>
          <planeGeometry args={[1.4, 0.06]} />
          <meshBasicMaterial color={d.color} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

export function StreetStage() {
  const sky = useMemo(makeSky, []);
  const cityFar = useMemo(() => makeCity(11, true, "rgba(120,200,255,0.7)"), []);
  const cityMid = useMemo(() => makeCity(47, false, "rgba(255,120,180,0.7)"), []);
  const road = useMemo(makeRoad, []);
  const farRef = useRef<THREE.MeshBasicMaterial>(null);
  const midRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, dt) => {
    if (cityFar) cityFar.offset.x += dt * 0.004;
    if (cityMid) cityMid.offset.x += dt * 0.009;
    void farRef;
    void midRef;
  });

  return (
    <group>
      <color attach="background" args={["#0a0a1f"]} />
      <fog attach="fog" args={["#140a22", 12, 30]} />

      {/* lighting — warm street key + cool fill, soft team rims */}
      <hemisphereLight args={["#6b5b9a", "#1a1226", 0.55]} />
      <directionalLight
        position={[3, 8, 5]}
        intensity={2.2}
        color="#ffe8c4"
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
      <directionalLight position={[-6, 5, 2]} intensity={0.7} color="#6f8cff" />
      <spotLight position={[-7, 6, -2]} intensity={90} angle={0.7} penumbra={0.9} color="#22d3ee" distance={26} />
      <spotLight position={[7, 6, -2]} intensity={90} angle={0.7} penumbra={0.9} color="#f43f5e" distance={26} />
      <ambientLight intensity={0.16} />

      {/* sky */}
      <mesh position={[0, 7, -16]}>
        <planeGeometry args={[80, 30]} />
        <meshBasicMaterial map={sky} />
      </mesh>

      {/* parallax city layers */}
      <mesh position={[0, 5.5, -12]}>
        <planeGeometry args={[60, 14]} />
        <meshBasicMaterial ref={farRef} map={cityFar} transparent />
      </mesh>
      <mesh position={[0, 4.2, -8.5]}>
        <planeGeometry args={[48, 11]} />
        <meshBasicMaterial ref={midRef} map={cityMid} transparent />
      </mesh>

      <CarStreaks />
      {/* neon signs */}
      <NeonSign position={[-5.5, 3.2, -7.5]} color="#ff2d6b" size={[1.6, 0.5]} />
      <NeonSign position={[5.2, 4.0, -8]} color="#22d3ee" size={[1.2, 1.2]} />
      <NeonSign position={[2.5, 2.4, -7]} color="#facc15" size={[0.9, 0.3]} />

      <Embers />

      {/* street */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WORLD.groundY, 0]} receiveShadow>
        <planeGeometry args={[80, 40]} />
        <meshStandardMaterial map={road} roughness={0.5} metalness={0.45} color="#3a3550" />
      </mesh>

      {/* sidewalk curb line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WORLD.groundY + 0.01, -3]}>
        <planeGeometry args={[80, 0.12]} />
        <meshBasicMaterial color="#5a4a78" />
      </mesh>

      {/* street lamps */}
      {[-7, 7].map((x) => (
        <group key={x} position={[x, 0, -2.6]}>
          <mesh position={[0, 1.8, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 3.6, 8]} />
            <meshStandardMaterial color="#2a2535" roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[0, 3.5, 0]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshBasicMaterial color="#ffdf9e" />
          </mesh>
          <pointLight position={[0, 3.4, 0]} intensity={6} distance={9} color="#ffd9a0" />
        </group>
      ))}
    </group>
  );
}

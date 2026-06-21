"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { StreetStage } from "./StreetStage";
import { GameWorld } from "./GameWorld";
import type { LoadResult } from "./loadAssets";
import type { GameMode } from "./types";

export function GameCanvas({
  assets,
  mode,
  paused,
}: {
  assets: LoadResult;
  mode: GameMode;
  paused: boolean;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.75, 6.6], fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <StreetStage />
      <GameWorld assets={assets} mode={mode} paused={paused} />
    </Canvas>
  );
}

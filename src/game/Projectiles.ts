import * as THREE from "three";
import { PROJECTILE } from "./config";
import type { Fighter } from "./Fighter";

interface Shot {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  x: number;
  y: number;
  dir: 1 | -1;
  owner: Fighter;
  life: number;
  active: boolean;
}

export interface ProjectileHit {
  target: Fighter;
  owner: Fighter;
  dir: 1 | -1;
  pos: THREE.Vector3;
}

/** Fireball pool — glowing emissive orbs that travel horizontally and damage the foe. */
export class Projectiles {
  readonly group = new THREE.Group();
  private pool: Shot[] = [];

  constructor(count = 6) {
    const geo = new THREE.SphereGeometry(PROJECTILE.radius, 16, 16);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: "#ffd27a",
        emissive: "#ff7b1a",
        emissiveIntensity: 4,
        roughness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      const light = new THREE.PointLight("#ff8a2a", 0, 4);
      mesh.add(light);
      this.group.add(mesh);
      this.pool.push({ mesh, light, x: 0, y: 0, dir: 1, owner: null as unknown as Fighter, life: 0, active: false });
    }
  }

  spawn(x: number, y: number, dir: 1 | -1, owner: Fighter) {
    const s = this.pool.find((p) => !p.active);
    if (!s) return;
    s.active = true;
    s.x = x;
    s.y = y;
    s.dir = dir;
    s.owner = owner;
    s.life = PROJECTILE.life;
    s.mesh.visible = true;
    s.mesh.position.set(x, y, 0);
    s.light.intensity = 12;
  }

  update(dt: number, fighters: Fighter[]): ProjectileHit[] {
    const hits: ProjectileHit[] = [];
    for (const s of this.pool) {
      if (!s.active) continue;
      s.life -= dt;
      s.x += s.dir * PROJECTILE.speed * dt;
      s.mesh.position.x = s.x;
      s.mesh.rotation.z += dt * 12;
      const pulse = 3.5 + Math.sin(s.life * 30) * 1.2;
      (s.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;

      let consumed = false;
      for (const f of fighters) {
        if (f === s.owner || f.dead) continue;
        if (Math.abs(f.position.x - s.x) < 0.55 && Math.abs(f.position.y + PROJECTILE.spawnHeight - s.y) < 1.1) {
          hits.push({ target: f, owner: s.owner, dir: s.dir, pos: s.mesh.position.clone() });
          consumed = true;
          break;
        }
      }
      if (consumed || s.life <= 0 || Math.abs(s.x) > 7) {
        s.active = false;
        s.mesh.visible = false;
        s.light.intensity = 0;
      }
    }
    return hits;
  }

  reset() {
    for (const s of this.pool) {
      s.active = false;
      s.mesh.visible = false;
      s.light.intensity = 0;
    }
  }
}

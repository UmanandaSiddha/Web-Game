import * as THREE from "three";

/** A small pool of additive billboard sparks for hit impacts. */
export class ImpactFX {
  readonly group = new THREE.Group();
  private pool: { mesh: THREE.Mesh; life: number; max: number; spin: number }[] = [];
  private idx = 0;

  constructor(count = 8) {
    const tex = makeSparkTexture();
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 10;
      this.group.add(mesh);
      this.pool.push({ mesh, life: 0, max: 1, spin: 0 });
    }
  }

  burst(pos: THREE.Vector3, big: boolean, color: THREE.ColorRepresentation) {
    const p = this.pool[this.idx++ % this.pool.length];
    p.mesh.position.copy(pos);
    p.mesh.visible = true;
    p.life = 0;
    p.max = big ? 0.42 : 0.26;
    p.spin = (Math.random() - 0.5) * 6;
    const mat = p.mesh.material as THREE.MeshBasicMaterial;
    mat.color = new THREE.Color(color);
    mat.opacity = 1;
    const s = big ? 1.9 : 1.2;
    p.mesh.scale.setScalar(s * 0.5);
  }

  update(dt: number, camera: THREE.Camera) {
    for (const p of this.pool) {
      if (!p.mesh.visible) continue;
      p.life += dt;
      const t = p.life / p.max;
      if (t >= 1) {
        p.mesh.visible = false;
        continue;
      }
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - t;
      const grow = 1 + t * 2.2;
      const base = p.max > 0.3 ? 1.9 : 1.2;
      p.mesh.scale.setScalar(base * grow);
      p.mesh.rotation.z += p.spin * dt;
      p.mesh.quaternion.copy(camera.quaternion); // billboard
      p.mesh.rotateZ(p.mesh.rotation.z);
    }
  }
}

function makeSparkTexture(): THREE.Texture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  // soft radial core
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.9)");
  g.addColorStop(0.5, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // a few spikes for an impact-star look
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 4;
  ctx.translate(size / 2, size / 2);
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size / 2 - 6, 0);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Color4, Vector3 } from '@babylonjs/core';

interface SparkSlot { mesh: Mesh; velocity: Vector3; remaining: number; active: boolean; }
interface RingSlot { mesh: Mesh; material: StandardMaterial; remaining: number; duration: number; radius: number; active: boolean; }
interface WaveSlot { mesh: Mesh; material: StandardMaterial; direction: Vector3; remaining: number; active: boolean; }

export class ParticleVFX3D {
  private scene: Scene;
  private sparkPool: SparkSlot[] = [];
  private ringPool: RingSlot[] = [];
  private wavePool: WaveSlot[] = [];
  private readonly sparkMaterials = new Map<string, StandardMaterial>();

  constructor(scene: Scene) {
    this.scene = scene;
    this.prewarm();
  }

  private prewarm() {
    for (let i = 0; i < 72; i++) {
      const mesh = MeshBuilder.CreatePolyhedron(`vfxSpark_${i}`, { type: 1, size: 0.075 }, this.scene);
      mesh.isVisible = false;
      this.sparkPool.push({ mesh, velocity: Vector3.Zero(), remaining: 0, active: false });
    }
    for (let i = 0; i < 12; i++) {
      const mesh = MeshBuilder.CreateTorus(`vfxRing_${i}`, { diameter: 1, thickness: 0.075, tessellation: 20 }, this.scene);
      const material = new StandardMaterial(`vfxRingMat_${i}`, this.scene);
      material.alpha = 0;
      material.disableLighting = true;
      mesh.material = material;
      mesh.isVisible = false;
      this.ringPool.push({ mesh, material, remaining: 0, duration: 1, radius: 1, active: false });
    }
    for (let i = 0; i < 4; i++) {
      const mesh = MeshBuilder.CreateTorus(`vfxWave_${i}`, { diameter: 3.5, thickness: 0.22, tessellation: 24 }, this.scene);
      const material = new StandardMaterial(`vfxWaveMat_${i}`, this.scene);
      material.emissiveColor = new Color3(0.48, 0.74, 0.30);
      material.alpha = 0.85;
      material.disableLighting = true;
      mesh.material = material;
      mesh.isVisible = false;
      this.wavePool.push({ mesh, material, direction: Vector3.Zero(), remaining: 0, active: false });
    }
  }

  private sparkMaterial(color: Color4) {
    const key = `${color.r}:${color.g}:${color.b}`;
    let material = this.sparkMaterials.get(key);
    if (!material) {
      material = new StandardMaterial(`vfxSparkMat_${key}`, this.scene);
      material.emissiveColor = new Color3(color.r, color.g, color.b);
      material.disableLighting = true;
      this.sparkMaterials.set(key, material);
    }
    return material;
  }

  // 3D Hit Sparks
  public emitHitSparks(pos: Vector3, color: Color4 = new Color4(1.0, 0.68, 0.22, 1.0), count: number = 24) {
    const material = this.sparkMaterial(color);
    const available = this.sparkPool.filter(slot => !slot.active).slice(0, count);
    for (const slot of available) {
      slot.mesh.position.copyFrom(pos);
      slot.mesh.material = material;
      slot.mesh.isVisible = true;
      slot.active = true;
      slot.remaining = 250;

      const angle = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * Math.PI;
      const speed = 4.0 + Math.random() * 6.0;

      slot.velocity.copyFromFloats(
        Math.cos(pitch) * Math.cos(angle) * speed,
        Math.sin(pitch) * speed + 2.0,
        Math.cos(pitch) * Math.sin(angle) * speed
      );
    }
  }

  // 3D Expanding Shockwave Ring
  public emitShockwave(pos: Vector3, maxRadius: number = 4.5, color: Color3 = new Color3(0.42, 0.76, 0.35)) {
    const slot = this.ringPool.find(item => !item.active);
    if (!slot) return;
    slot.mesh.position.copyFrom(pos).addInPlaceFromFloats(0, 0.1, 0);
    slot.mesh.scaling.setAll(0.5);
    slot.material.emissiveColor = color;
    slot.material.alpha = 0.88;
    slot.radius = maxRadius;
    slot.duration = 340;
    slot.remaining = slot.duration;
    slot.active = true;
    slot.mesh.isVisible = true;
  }

  // 3D Transmutation Wave Mesh (Sweeping arc)
  public spawnTransmutationWave(pos: Vector3, forward: Vector3): Mesh {
    const slot = this.wavePool.find(item => !item.active) ?? this.wavePool[0];
    slot.direction.copyFrom(forward);
    slot.mesh.position.copyFrom(pos);
    slot.mesh.position.x += forward.x * 1.2;
    slot.mesh.position.y += 0.8;
    slot.mesh.position.z += forward.z * 1.2;
    slot.mesh.rotation.set(Math.PI / 2, Math.atan2(forward.x, forward.z), 0);
    slot.mesh.scaling.setAll(1);
    slot.material.alpha = 0.85;
    slot.remaining = 600;
    slot.active = true;
    slot.mesh.isVisible = true;
    return slot.mesh;
  }

  public stopTransmutationWave(mesh: Mesh) {
    const slot = this.wavePool.find(item => item.mesh === mesh);
    if (!slot) return;
    slot.active = false;
    slot.mesh.isVisible = false;
  }

  public update(delta: number) {
    const seconds = delta / 1000;
    for (const slot of this.sparkPool) {
      if (!slot.active) continue;
      slot.remaining -= delta;
      slot.mesh.position.x += slot.velocity.x * seconds;
      slot.mesh.position.y += slot.velocity.y * seconds;
      slot.mesh.position.z += slot.velocity.z * seconds;
      slot.velocity.y -= 9.81 * seconds;
      if (slot.remaining <= 0) { slot.active = false; slot.mesh.isVisible = false; }
    }
    for (const slot of this.ringPool) {
      if (!slot.active) continue;
      slot.remaining -= delta;
      const progress = 1 - Math.max(0, slot.remaining) / slot.duration;
      const scale = 0.5 + slot.radius * 2 * progress;
      slot.mesh.scaling.set(scale, 1, scale);
      slot.material.alpha = 0.88 * (1 - progress);
      if (slot.remaining <= 0) { slot.active = false; slot.mesh.isVisible = false; }
    }
    for (const slot of this.wavePool) {
      if (!slot.active) continue;
      slot.remaining -= delta;
      slot.mesh.position.x += slot.direction.x * seconds * 16;
      slot.mesh.position.y += slot.direction.y * seconds * 16;
      slot.mesh.position.z += slot.direction.z * seconds * 16;
      const scale = slot.mesh.scaling.x + seconds * 2.5;
      slot.mesh.scaling.setAll(scale);
      slot.material.alpha = Math.max(0, slot.remaining / 600) * 0.85;
      if (slot.remaining <= 0) { slot.active = false; slot.mesh.isVisible = false; }
    }
  }
}

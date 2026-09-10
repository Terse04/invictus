import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
  ParticleSystem,
  Texture
} from '@babylonjs/core';

export class ParticleVFX3D {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  // 3D Hit Sparks
  public emitHitSparks(pos: Vector3, color: Color4 = new Color4(1.0, 0.68, 0.22, 1.0), count: number = 24) {
    for (let i = 0; i < count; i++) {
      const spark = MeshBuilder.CreateSphere('spark', { diameter: 0.08 }, this.scene);
      spark.position = pos.clone();

      const mat = new StandardMaterial('sparkMat', this.scene);
      mat.emissiveColor = new Color3(color.r, color.g, color.b);
      spark.material = mat;

      const angle = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * Math.PI;
      const speed = 4.0 + Math.random() * 6.0;

      const vel = new Vector3(
        Math.cos(pitch) * Math.cos(angle) * speed,
        Math.sin(pitch) * speed + 2.0,
        Math.cos(pitch) * Math.sin(angle) * speed
      );

      let lifetime = 250; // ms
      const interval = window.setInterval(() => {
        lifetime -= 16;
        spark.position.addInPlace(vel.scale(0.016));
        vel.y -= 9.81 * 0.016; // gravity

        if (lifetime <= 0) {
          clearInterval(interval);
          spark.dispose();
        }
      }, 16);
    }
  }

  // 3D Expanding Shockwave Ring
  public emitShockwave(pos: Vector3, maxRadius: number = 4.5, color: Color3 = new Color3(0.42, 0.76, 0.35)) {
    const ring = MeshBuilder.CreateTorus('shockwaveRing', {
      diameter: 0.5,
      thickness: 0.12,
      tessellation: 32
    }, this.scene);
    ring.position = new Vector3(pos.x, pos.y + 0.1, pos.z);

    const mat = new StandardMaterial('shockwaveMat', this.scene);
    mat.emissiveColor = color;
    mat.alpha = 0.9;
    ring.material = mat;

    let elapsed = 0;
    const duration = 320;
    const interval = window.setInterval(() => {
      elapsed += 16;
      const progress = elapsed / duration;
      const currentDiameter = 0.5 + maxRadius * 2 * progress;

      ring.scaling = new Vector3(currentDiameter / 0.5, 1, currentDiameter / 0.5);
      mat.alpha = 0.9 * (1 - progress);

      if (progress >= 1.0) {
        clearInterval(interval);
        ring.dispose();
      }
    }, 16);
  }

  // 3D Transmutation Wave Mesh (Sweeping arc)
  public spawnTransmutationWave(pos: Vector3, forward: Vector3): Mesh {
    const wave = MeshBuilder.CreateTorus('waveMesh', {
      diameter: 3.5,
      thickness: 0.22,
      tessellation: 32
    }, this.scene);

    wave.position = pos.add(forward.scale(1.2));
    wave.position.y += 0.8;

    const angle = Math.atan2(forward.x, forward.z);
    wave.rotation = new Vector3(Math.PI / 2, angle, 0);

    const mat = new StandardMaterial('waveMat', this.scene);
    mat.emissiveColor = new Color3(0.48, 0.74, 0.30);
    mat.alpha = 0.85;
    wave.material = mat;

    const speed = 16.0;
    let lifetime = 600;
    const interval = window.setInterval(() => {
      lifetime -= 16;
      wave.position.addInPlace(forward.scale(speed * 0.016));
      wave.scaling.addInPlace(new Vector3(0.04, 0.04, 0.04));

      if (lifetime <= 0) {
        clearInterval(interval);
        wave.dispose();
      }
    }, 16);

    return wave;
  }
}

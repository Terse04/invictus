import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';
import { EnemyBase3D } from './EnemyBase3D';
import { Player3D } from '../player/Player3D';
import { Telegraph3D } from '../combat/Telegraph3D';
import { ParticleVFX3D } from '../vfx/ParticleVFX3D';
import { ENEMY_CONFIGS } from '../data/enemyData';

export class FluxWyrmling3D extends EnemyBase3D {
  private hoverTimer = 0;

  constructor(
    scene: Scene,
    spawnPos: Vector3,
    targetPlayer: Player3D,
    telegraph: Telegraph3D,
    particles: ParticleVFX3D
  ) {
    super(scene, spawnPos, ENEMY_CONFIGS.fluxWyrmling, targetPlayer, telegraph, particles);

    const droneNode = new TransformNode('droneMesh', scene);
    droneNode.parent = this.rootMesh;

    // Winged 3D Drone Body
    const core = MeshBuilder.CreateSphere('droneCore', { diameter: 0.7 }, scene);
    core.parent = droneNode;
    core.position.y = 1.6;

    const coreMat = new StandardMaterial('droneCoreMat', scene);
    coreMat.emissiveColor = new Color3(1.0, 0.0, 0.4); // Crimson plasma
    core.material = coreMat;

    // Geometric Wings
    const leftWing = MeshBuilder.CreateBox('lWing', { width: 1.4, height: 0.06, depth: 0.4 }, scene);
    leftWing.parent = droneNode;
    leftWing.position = new Vector3(-0.9, 1.6, 0);
    leftWing.rotation.z = -0.2;

    const rightWing = MeshBuilder.CreateBox('rWing', { width: 1.4, height: 0.06, depth: 0.4 }, scene);
    rightWing.parent = droneNode;
    rightWing.position = new Vector3(0.9, 1.6, 0);
    rightWing.rotation.z = 0.2;

    const wingMat = new StandardMaterial('wingMat', scene);
    wingMat.diffuseColor = new Color3(0.1, 0.12, 0.18);
    wingMat.emissiveColor = new Color3(0.0, 0.4, 0.5);
    leftWing.material = wingMat;
    rightWing.material = wingMat;
  }

  public override update(delta: number) {
    if (this.isDead) return;

    // Gentle hovering bobbing motion
    this.hoverTimer += delta * 0.003;
    this.rootMesh.position.y = 1.2 + Math.sin(this.hoverTimer) * 0.35;

    super.update(delta);
  }

  protected override chasePlayer(delta: number) {
    this.state = 'CHASE';
    const playerPos = this.targetPlayer.rootMesh.position;
    const enemyPos = this.rootMesh.position;

    const dist = Vector3.Distance(enemyPos, playerPos);
    const dir = new Vector3(playerPos.x - enemyPos.x, 0, playerPos.z - enemyPos.z).normalize();

    this.rootMesh.rotation.y = Math.atan2(dir.x, dir.z);

    if (dist < 5.0) {
      // Back away to maintain ranged distance
      this.rootMesh.moveWithCollisions(dir.scale((-this.config.speed * 0.02 * delta) / 1000));
    } else if (dist > 10.0) {
      // Approach
      this.rootMesh.moveWithCollisions(dir.scale((this.config.speed * 0.02 * delta) / 1000));
    }
  }

  protected override startAttackSequence() {
    this.state = 'TELEGRAPH';
    this.lastAttackTime = Date.now();

    const start = this.rootMesh.position.clone();
    const target = this.targetPlayer.rootMesh.position.clone();

    // Directional beam telegraph (650ms warning)
    this.telegraph.showLine(start, target, 0.8, 650, () => {
      if (this.isDead || this.state === 'STAGGER') return;

      this.state = 'ATTACK';
      this.soundManager.playSlash(0);

      // Spawn 3D plasma bolt
      const bolt = MeshBuilder.CreateSphere('plasmaBolt', { diameter: 0.35 }, this.scene);
      bolt.position = start.add(new Vector3(0, 1.2, 0));

      const bMat = new StandardMaterial('boltMat', this.scene);
      bMat.emissiveColor = new Color3(1.0, 0.0, 0.4);
      bolt.material = bMat;

      const dir = target.subtract(start).normalize();
      const speed = 18.0;

      let boltLife = 650;
      const interval = window.setInterval(() => {
        boltLife -= 16;
        bolt.position.addInPlace(dir.scale(speed * 0.016));

        // Hit check
        if (Vector3.Distance(bolt.position, this.targetPlayer.rootMesh.position) < 1.4) {
          this.targetPlayer.takeDamage(this.config.damage);
          clearInterval(interval);
          bolt.dispose();
        }

        if (boltLife <= 0) {
          clearInterval(interval);
          bolt.dispose();
        }
      }, 16);

      window.setTimeout(() => {
        if (!this.isDead && this.state !== 'STAGGER') {
          this.state = 'IDLE';
        }
      }, 400);
    });
  }
}

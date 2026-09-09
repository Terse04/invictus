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

export class JadeWarden3D extends EnemyBase3D {
  private halberdMesh: Mesh;

  constructor(
    scene: Scene,
    spawnPos: Vector3,
    targetPlayer: Player3D,
    telegraph: Telegraph3D,
    particles: ParticleVFX3D
  ) {
    super(scene, spawnPos, ENEMY_CONFIGS.jadeWarden, targetPlayer, telegraph, particles);

    const wardenNode = new TransformNode('wardenMesh', scene);
    wardenNode.parent = this.rootMesh;

    // Bulky Terracotta Mech Torso
    const torso = MeshBuilder.CreateBox('wardenTorso', {
      width: 1.2,
      height: 1.4,
      depth: 0.9
    }, scene);
    torso.parent = wardenNode;
    torso.position.y = 1.3;

    const terraMat = new StandardMaterial('terraMat', scene);
    terraMat.diffuseColor = new Color3(0.24, 0.18, 0.14); // Terracotta stone
    terraMat.specularColor = new Color3(0.3, 0.2, 0.1);
    torso.material = terraMat;

    // Glowing Jade Core in Chest
    const core = MeshBuilder.CreateSphere('jadeCore', { diameter: 0.45 }, scene);
    core.parent = wardenNode;
    core.position = new Vector3(0, 1.4, 0.48);

    const coreMat = new StandardMaterial('coreMat', scene);
    coreMat.emissiveColor = new Color3(0.0, 0.9, 0.5); // Ancient Jade glow
    core.material = coreMat;

    // Head
    const head = MeshBuilder.CreateBox('wardenHead', {
      width: 0.6,
      height: 0.6,
      depth: 0.55
    }, scene);
    head.parent = wardenNode;
    head.position.y = 2.2;
    head.material = terraMat;

    // Heavy Energy Halberd
    this.halberdMesh = MeshBuilder.CreateCylinder('wardenHalberd', {
      height: 2.8,
      diameter: 0.08
    }, scene);
    this.halberdMesh.parent = wardenNode;
    this.halberdMesh.position = new Vector3(0.8, 1.4, 0.3);
    this.halberdMesh.rotation.x = Math.PI / 4;

    const halberdMat = new StandardMaterial('halberdMat', scene);
    halberdMat.emissiveColor = new Color3(0.0, 0.8, 0.9);
    this.halberdMesh.material = halberdMat;
  }

  protected override startAttackSequence() {
    this.state = 'TELEGRAPH';
    this.lastAttackTime = Date.now();

    const smashRadius = 4.2;

    // Circular Ground Telegraph (750ms warning)
    this.telegraph.showCircle(this.rootMesh.position, smashRadius, 750, () => {
      if (this.isDead || this.state === 'STAGGER') return;

      this.state = 'ATTACK';
      this.soundManager.playHeavyRelease();
      this.particles.emitShockwave(this.rootMesh.position, smashRadius, new Color3(0.0, 0.9, 0.5));
      this.particles.emitHitSparks(this.rootMesh.position, undefined, 24);

      // Hit check against player
      const dist = Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position);
      if (dist <= smashRadius) {
        this.targetPlayer.takeDamage(this.config.damage);
      }

      window.setTimeout(() => {
        if (!this.isDead && this.state !== 'STAGGER') {
          this.state = 'IDLE';
        }
      }, 500);
    });
  }
}

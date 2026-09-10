import { Color3, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import { EnemyBase3D } from './EnemyBase3D';
import { Player3D } from '../player/Player3D';
import { Telegraph3D } from '../combat/Telegraph3D';
import { ParticleVFX3D } from '../vfx/ParticleVFX3D';
import { ENEMY_CONFIGS } from '../data/enemyData';

/** Temporary modular art proxy; deliberately built around a readable shield silhouette. */
export class BronzeHoplite3D extends EnemyBase3D {
  private shieldIntegrity = 3;
  constructor(scene: Scene, spawnPos: Vector3, target: Player3D, telegraph: Telegraph3D, particles: ParticleVFX3D) {
    super(scene, spawnPos, ENEMY_CONFIGS.bronzeHoplite, target, telegraph, particles);
    const rig = new TransformNode('bronzeHopliteRig', scene); rig.parent = this.rootMesh;
    const bronze = new StandardMaterial('hopliteBronze', scene); bronze.diffuseColor = new Color3(0.28, 0.16, 0.06); bronze.specularColor = new Color3(0.75, 0.48, 0.18);
    const oracle = new StandardMaterial('hopliteOracleCore', scene); oracle.emissiveColor = new Color3(0.38, 0.16, 0.68); oracle.disableLighting = true;
    const torso = MeshBuilder.CreateCylinder('hopliteCuirass', { height: 1.24, diameterTop: 0.86, diameterBottom: 0.72, tessellation: 16 }, scene); torso.parent = rig; torso.position.y = 1.3; torso.material = bronze;
    const helm = MeshBuilder.CreateSphere('hopliteHelmet', { diameter: 0.72, segments: 16 }, scene); helm.parent = rig; helm.position.y = 2.16; helm.material = bronze;
    const plume = MeshBuilder.CreateBox('hopliteOraclePlume', { width: 0.16, height: 0.7, depth: 0.42 }, scene); plume.parent = rig; plume.position = new Vector3(0, 2.56, -0.05); plume.material = oracle;
    const shield = MeshBuilder.CreateDisc('hopliteAegis', { radius: 0.72, tessellation: 16 }, scene); shield.parent = rig; shield.position = new Vector3(-0.72, 1.38, 0.38); shield.rotation.y = -0.22; shield.material = bronze;
    const core = MeshBuilder.CreateSphere('hopliteBrokenOracle', { diameter: 0.32, segments: 16 }, scene); core.parent = rig; core.position = new Vector3(0, 1.4, 0.47); core.material = oracle;
    const spear = MeshBuilder.CreateCylinder('hopliteSpear', { height: 2.6, diameter: 0.065, tessellation: 16 }, scene); spear.parent = rig; spear.position = new Vector3(0.62, 1.2, 0.3); spear.rotation.x = Math.PI / 3.5; spear.material = bronze;
    [-0.27, 0.27].forEach(x => { const leg = MeshBuilder.CreateCylinder(`hopliteLeg_${x}`, { height: 0.85, diameter: 0.2, tessellation: 16 }, scene); leg.parent = rig; leg.position = new Vector3(x, 0.44, 0); leg.material = bronze; });
  }

  protected override chasePlayer(delta: number) {
    this.state = 'CHASE';
    const target = this.targetPlayer.rootMesh.position;
    const direction = new Vector3(target.x - this.rootMesh.position.x, 0, target.z - this.rootMesh.position.z).normalize();
    this.rootMesh.rotation.y = Math.atan2(direction.x, direction.z);
    const distance = Vector3.Distance(this.rootMesh.position, target);
    if (distance > 3.5) this.rootMesh.moveWithCollisions(direction.scale(delta * 0.00115));
  }

  public override takeDamage(amount: number, isCrit = false): boolean {
    const attackerDirection = this.targetPlayer.rootMesh.position.subtract(this.rootMesh.position);
    attackerDirection.y = 0;
    const isBlockingFrontally = this.shieldIntegrity > 0 && attackerDirection.lengthSquared() > 0.001
      && Vector3.Dot(attackerDirection.normalize(), this.rootMesh.forward) > 0.35;
    if (isBlockingFrontally) {
      this.shieldIntegrity--;
      this.particles.emitHitSparks(this.rootMesh.position.add(new Vector3(0, 1.35, 0)), new Color3(0.72, 0.42, 0.13).toColor4(), 7);
      return super.takeDamage(amount * 0.48, false);
    }
    return super.takeDamage(amount, isCrit);
  }
  protected startAttackSequence() { this.state = 'TELEGRAPH'; this.lastAttackTime = Date.now(); this.telegraph.showCircle(this.rootMesh.position, 3.9, 760, () => { if (this.isDead || this.state === 'STAGGER') return; this.particles.emitShockwave(this.rootMesh.position, 3.9, new Color3(0.52, 0.22, 0.84)); if (Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position) < 3.9) this.targetPlayer.takeDamage(this.config.damage); this.state = 'IDLE'; }); }
}

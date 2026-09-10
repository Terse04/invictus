import { Color3, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import { EnemyBase3D } from './EnemyBase3D';
import { Player3D } from '../player/Player3D';
import { Telegraph3D } from '../combat/Telegraph3D';
import { ParticleVFX3D } from '../vfx/ParticleVFX3D';
import { ENEMY_CONFIGS } from '../data/enemyData';

/** Temporary modular art proxy; authored relic-drone GLB slots into this class later. */
export class CyberScarab3D extends EnemyBase3D {
  private hover = 0;
  constructor(scene: Scene, spawnPos: Vector3, target: Player3D, telegraph: Telegraph3D, particles: ParticleVFX3D) {
    super(scene, spawnPos, ENEMY_CONFIGS.cyberScarab, target, telegraph, particles);
    this.isHovering = true;
    const rig = new TransformNode('cyberScarabRig', scene); rig.parent = this.rootMesh;
    const bronze = new StandardMaterial('scarabBronze', scene); bronze.diffuseColor = new Color3(0.33, 0.19, 0.06); bronze.specularColor = new Color3(0.7, 0.46, 0.14);
    const lapis = new StandardMaterial('scarabLapis', scene); lapis.diffuseColor = new Color3(0.02, 0.12, 0.23); lapis.emissiveColor = new Color3(0.02, 0.21, 0.38);
    const core = new StandardMaterial('scarabCore', scene); core.emissiveColor = new Color3(0.95, 0.38, 0.08); core.disableLighting = true;
    const body = MeshBuilder.CreateSphere('scarabShell', { diameterX: 1.05, diameterY: 0.48, diameterZ: 1.28, segments: 16 }, scene); body.parent = rig; body.position.y = 1.28; body.material = bronze;
    const split = MeshBuilder.CreateBox('scarabWingSplit', { width: 0.055, height: 0.08, depth: 0.9 }, scene); split.parent = rig; split.position = new Vector3(0, 1.48, 0); split.material = lapis;
    const head = MeshBuilder.CreateSphere('scarabHead', { diameter: 0.44, segments: 16 }, scene); head.parent = rig; head.position = new Vector3(0, 1.3, 0.67); head.material = lapis;
    const reactor = MeshBuilder.CreateSphere('scarabSunCore', { diameter: 0.22, segments: 16 }, scene); reactor.parent = rig; reactor.position = new Vector3(0, 1.35, 0.92); reactor.material = core;
    [-1, 1].forEach(side => { for (let i = 0; i < 3; i++) { const leg = MeshBuilder.CreateCylinder(`scarabLeg_${side}_${i}`, { height: 0.62, diameter: 0.055, tessellation: 16 }, scene); leg.parent = rig; leg.position = new Vector3(side * 0.48, 1.15, -0.38 + i * 0.32); leg.rotation.z = side * Math.PI / 3; leg.material = bronze; } });
  }
  public override update(delta: number) { this.hover += delta * 0.004; const groundY = this.getGroundY() ?? 0; this.rootMesh.position.y = groundY + 1.2 + Math.sin(this.hover) * 0.18; super.update(delta); }
  protected override chasePlayer(delta: number) { const target = this.targetPlayer.rootMesh.position; const dir = new Vector3(target.x - this.rootMesh.position.x, 0, target.z - this.rootMesh.position.z).normalize(); this.rootMesh.rotation.y = Math.atan2(dir.x, dir.z); const distance = Vector3.Distance(this.rootMesh.position, target); this.rootMesh.moveWithCollisions(dir.scale((distance > 8 ? 1 : -0.8) * delta * 0.002)); this.state = 'CHASE'; }
  protected startAttackSequence() { this.state = 'TELEGRAPH'; this.lastAttackTime = Date.now(); const start = this.rootMesh.position.add(new Vector3(0, 1.2, 0)); const target = this.targetPlayer.rootMesh.position.clone(); this.telegraph.showLine(start, target, 0.52, 620, () => { if (this.isDead) return; this.particles.emitShockwave(target, 1.6, new Color3(0.96, 0.38, 0.08)); if (Vector3.Distance(target, this.targetPlayer.rootMesh.position) < 1.6) this.targetPlayer.takeDamage(this.config.damage); this.state = 'IDLE'; }); }
}

import { Color3, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import { EnemyBase3D } from './EnemyBase3D';
import { Player3D } from '../player/Player3D';
import { Telegraph3D } from '../combat/Telegraph3D';
import { ParticleVFX3D } from '../vfx/ParticleVFX3D';
import { ENEMY_CONFIGS } from '../data/enemyData';

/** Temporary modular art proxy; replace with an authored Terracotta Revenant GLB when supplied. */
export class TerracottaRevenant3D extends EnemyBase3D {
  constructor(scene: Scene, spawnPos: Vector3, target: Player3D, telegraph: Telegraph3D, particles: ParticleVFX3D) {
    super(scene, spawnPos, ENEMY_CONFIGS.terracottaRevenant, target, telegraph, particles);
    const rig = new TransformNode('terracottaRevenantRig', scene); rig.parent = this.rootMesh;
    const ceramic = new StandardMaterial('revenantCeramic', scene); ceramic.diffuseColor = Color3.FromHexString('#8c4626'); ceramic.specularColor = new Color3(0.14, 0.06, 0.03); ceramic.specularPower = 20;
    const iron = new StandardMaterial('revenantIron', scene); iron.diffuseColor = new Color3(0.08, 0.10, 0.10); iron.specularColor = new Color3(0.3, 0.35, 0.3);
    const jade = new StandardMaterial('revenantJadeCore', scene); jade.emissiveColor = Color3.FromHexString('#00ff88'); jade.disableLighting = true;
    const torso = MeshBuilder.CreateCylinder('revenantRibCage', { height: 1.15, diameterTop: 0.72, diameterBottom: 0.9, tessellation: 16 }, scene); torso.parent = rig; torso.position.y = 1.23; torso.material = ceramic;
    const core = MeshBuilder.CreateSphere('revenantReactor', { diameter: 0.34, segments: 16 }, scene); core.parent = rig; core.position = new Vector3(0, 1.3, 0.47); core.material = jade;
    [-0.31, 0.31].forEach((x) => {
      const shoulder = MeshBuilder.CreateSphere(`revenantShoulder_${x}`, { diameter: 0.36, segments: 16 }, scene); shoulder.parent = rig; shoulder.position = new Vector3(x, 1.66, 0); shoulder.material = iron;
      const arm = MeshBuilder.CreateCylinder(`revenantArm_${x}`, { height: 0.75, diameter: 0.17, tessellation: 16 }, scene); arm.parent = rig; arm.position = new Vector3(x * 1.15, 1.2, 0.04); arm.rotation.z = x * 0.1; arm.material = ceramic;
      const leg = MeshBuilder.CreateCylinder(`revenantLeg_${x}`, { height: 0.82, diameter: 0.21, tessellation: 16 }, scene); leg.parent = rig; leg.position = new Vector3(x * 0.62, 0.43, 0); leg.material = ceramic;
    });
    const mask = MeshBuilder.CreatePolyhedron('revenantCeremonialMask', { type: 1, size: 0.5 }, scene); mask.parent = rig; mask.position = new Vector3(0, 2.05, 0.08); mask.scaling.z = 0.65; mask.material = ceramic;
    const crest = MeshBuilder.CreateBox('revenantBrokenCrest', { width: 0.12, height: 0.56, depth: 0.12 }, scene); crest.parent = rig; crest.position.y = 2.38; crest.material = iron;
    for (let i = 0; i < 3; i++) { const cable = MeshBuilder.CreateTorus(`revenantCable_${i}`, { diameter: 0.52 + i * 0.08, thickness: 0.026, tessellation: 16 }, scene); cable.parent = rig; cable.position = new Vector3(0, 1.3, 0.48 + i * 0.012); cable.rotation.x = Math.PI / 2; cable.material = jade; }
  }

  protected startAttackSequence() {
    this.state = 'TELEGRAPH'; this.lastAttackTime = Date.now();
    this.telegraph.showCone(this.rootMesh.position, this.rootMesh.forward.clone(), 3.2, 560, () => {
      if (this.isDead || this.state === 'STAGGER') return;
      this.state = 'ATTACK'; this.particles.emitShockwave(this.rootMesh.position, 1.8, new Color3(0.18, 0.8, 0.42));
      if (Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position) < 2.5) this.targetPlayer.takeDamage(this.config.damage);
      window.setTimeout(() => { if (!this.isDead) this.state = 'IDLE'; }, 330);
    });
  }
}

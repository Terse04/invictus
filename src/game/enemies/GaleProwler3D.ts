import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  SceneLoader
} from '@babylonjs/core';
import { EnemyBase3D } from './EnemyBase3D';
import { Player3D } from '../player/Player3D';
import { Telegraph3D } from '../combat/Telegraph3D';
import { ParticleVFX3D } from '../vfx/ParticleVFX3D';
import { ENEMY_CONFIGS } from '../data/enemyData';

export class GaleProwler3D extends EnemyBase3D {
  private bodyMesh: Mesh;
  private proceduralParts: Mesh[] = [];

  constructor(
    scene: Scene,
    spawnPos: Vector3,
    targetPlayer: Player3D,
    telegraph: Telegraph3D,
    particles: ParticleVFX3D
  ) {
    super(scene, spawnPos, ENEMY_CONFIGS.galeProwler, targetPlayer, telegraph, particles);

    // 3D Quadruped Cyber-Panther Anatomy
    const beastNode = new TransformNode('prowlerMesh', scene);
    beastNode.parent = this.rootMesh;

    // Torso / Spine
    this.bodyMesh = MeshBuilder.CreateBox('beastBody', {
      width: 0.65,
      height: 0.55,
      depth: 1.4
    }, scene);
    this.bodyMesh.parent = beastNode;
    this.bodyMesh.position.y = 0.55;
    this.proceduralParts.push(this.bodyMesh);

    const darkMat = new StandardMaterial('beastMat', scene);
    darkMat.diffuseColor = new Color3(0.08, 0.08, 0.14);
    darkMat.emissiveColor = new Color3(0.0, 0.3, 0.35); // Cyan cybernetic spine
    this.bodyMesh.material = darkMat;

    // Predatory Head & Glowing Optics
    const head = MeshBuilder.CreateBox('beastHead', {
      width: 0.45,
      height: 0.35,
      depth: 0.5
    }, scene);
    head.parent = beastNode;
    head.position = new Vector3(0, 0.75, 0.85);
    this.proceduralParts.push(head);

    const eyeMat = new StandardMaterial('eyeMat', scene);
    eyeMat.emissiveColor = new Color3(0.0, 0.95, 1.0);
    head.material = eyeMat;

    // 4 Legs
    const legPositions = [
      new Vector3(-0.35, 0.3, 0.5),
      new Vector3(0.35, 0.3, 0.5),
      new Vector3(-0.35, 0.3, -0.5),
      new Vector3(0.35, 0.3, -0.5)
    ];

    legPositions.forEach((pos, idx) => {
      const leg = MeshBuilder.CreateCylinder(`leg_${idx}`, { height: 0.6, diameter: 0.16 }, scene);
      leg.parent = beastNode;
      leg.position = pos;
      leg.material = darkMat;
      this.proceduralParts.push(leg);
    });

    this.loadGlbModel();
  }

  private async loadGlbModel() {
    try {
      const result = await SceneLoader.ImportMeshAsync('', '/assets/characters/enemies/', 'beast.glb', this.scene);
      if (result && result.meshes.length > 0) {
        const root = result.meshes[0];
        root.parent = this.rootMesh;
        root.position = new Vector3(0, 0, 0);

        const hierarchyBounds = root.getHierarchyBoundingVectors();
        const height = hierarchyBounds.max.y - hierarchyBounds.min.y;
        if (height > 0.01) {
          const scaleFactor = 1.2 / height;
          root.scaling.scaleInPlace(scaleFactor);
        }

        this.proceduralParts.forEach(m => m.setEnabled(false));
      }
    } catch {
      // Fallback silently kept
    }
  }

  protected override startAttackSequence() {
    this.state = 'TELEGRAPH';
    this.lastAttackTime = Date.now();

    const forward = this.rootMesh.forward.clone();
    const attackRange = 3.8;

    // Directional Cone Warning
    this.telegraph.showCone(this.rootMesh.position, forward, attackRange, 550, () => {
      if (this.isDead || this.state === 'STAGGER') return;

      this.state = 'ATTACK';
      this.soundManager.playSlash(1);

      // Pounce forward
      this.rootMesh.moveWithCollisions(forward.scale(attackRange));
      this.particles.emitShockwave(this.rootMesh.position, 1.8);

      // Hit check against player
      const dist = Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position);
      if (dist <= 2.2) {
        this.targetPlayer.takeDamage(this.config.damage);
      }

      window.setTimeout(() => {
        if (!this.isDead && this.state !== 'STAGGER') {
          this.state = 'IDLE';
        }
      }, 350);
    });
  }
}

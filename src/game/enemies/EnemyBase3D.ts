import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  Ray
} from '@babylonjs/core';
import { Player3D } from '../player/Player3D';
import { Telegraph3D } from '../combat/Telegraph3D';
import { ParticleVFX3D } from '../vfx/ParticleVFX3D';
import { SoundManager } from '../audio/SoundManager';
import { EnemyConfig } from '../data/enemyData';

export abstract class EnemyBase3D {
  public scene: Scene;
  public rootMesh: Mesh;
  public targetPlayer: Player3D;
  public config: EnemyConfig;
  public telegraph: Telegraph3D;
  public particles: ParticleVFX3D;
  protected soundManager: SoundManager;

  // Stats
  public hp: number;
  public maxHp: number;
  public poise: number;
  public maxPoise: number;
  public isDead = false;

  // AI State
  public state: 'IDLE' | 'CHASE' | 'TELEGRAPH' | 'ATTACK' | 'STAGGER' = 'IDLE';
  protected lastAttackTime = 0;
  protected attackTimer = 0;

  // 3D Floating Health Bar Plane
  protected hpBarMesh: Mesh;
  protected hpFillMesh: Mesh;
  protected isHovering = false;

  constructor(
    scene: Scene,
    spawnPos: Vector3,
    config: EnemyConfig,
    targetPlayer: Player3D,
    telegraph: Telegraph3D,
    particles: ParticleVFX3D
  ) {
    this.scene = scene;
    this.targetPlayer = targetPlayer;
    this.config = config;
    this.telegraph = telegraph;
    this.particles = particles;
    this.soundManager = SoundManager.getInstance();

    this.maxHp = config.maxHp;
    this.hp = config.maxHp;
    this.maxPoise = config.poise;
    this.poise = config.poise;

    // Root Collider
    this.rootMesh = MeshBuilder.CreateBox('enemyCollider', { width: 0.82, height: 0.08, depth: 0.82 }, scene);
    this.rootMesh.position = spawnPos.clone();
    this.rootMesh.checkCollisions = true;
    this.rootMesh.visibility = 0; // invisible collision root
    this.rootMesh.ellipsoid = new Vector3(0.41, 0.04, 0.41);
    this.rootMesh.ellipsoidOffset = new Vector3(0, 0.04, 0);
    this.groundToWorld();

    // Floating 3D Health Bar
    this.hpBarMesh = MeshBuilder.CreatePlane('hpBarBg', { width: 1.4, height: 0.14 }, scene);
    this.hpBarMesh.position = new Vector3(0, 2.2, 0);
    this.hpBarMesh.parent = this.rootMesh;
    this.hpBarMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;

    const bgMat = new StandardMaterial('hpBgMat', scene);
    bgMat.diffuseColor = new Color3(0.05, 0.08, 0.14);
    bgMat.emissiveColor = new Color3(0.05, 0.08, 0.14);
    this.hpBarMesh.material = bgMat;

    this.hpFillMesh = MeshBuilder.CreatePlane('hpBarFill', { width: 1.34, height: 0.1 }, scene);
    this.hpFillMesh.position = new Vector3(0, 0, -0.01);
    this.hpFillMesh.parent = this.hpBarMesh;

    const fillMat = new StandardMaterial('hpFillMat', scene);
    fillMat.diffuseColor = new Color3(0.0, 0.95, 1.0);
    fillMat.emissiveColor = new Color3(0.0, 0.95, 1.0);
    this.hpFillMesh.material = fillMat;
  }

  public update(delta: number) {
    if (this.isDead) return;

    if (!this.isHovering) this.groundToWorld();
    this.updateHpBar();

    const dist = Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position);

    if (this.state === 'STAGGER' || this.state === 'TELEGRAPH' || this.state === 'ATTACK') {
      return;
    }

    if (dist <= this.config.aggroRange * 0.06) {
      if (dist <= this.config.attackRange * 0.06 && Date.now() - this.lastAttackTime >= this.config.attackCooldown) {
        this.startAttackSequence();
      } else {
        this.chasePlayer(delta);
      }
    } else {
      this.state = 'IDLE';
    }
  }

  protected chasePlayer(delta: number) {
    this.state = 'CHASE';
    const playerPos = this.targetPlayer.rootMesh.position;
    const enemyPos = this.rootMesh.position;

    const dir = new Vector3(playerPos.x - enemyPos.x, 0, playerPos.z - enemyPos.z).normalize();

    // Rotate toward player
    const angle = Math.atan2(dir.x, dir.z);
    this.rootMesh.rotation.y = angle;

    const moveStep = dir.scale((this.config.speed * 0.02 * delta) / 1000);
    moveStep.y = 0;
    this.rootMesh.moveWithCollisions(moveStep);
  }

  protected getGroundY() {
    const ray = new Ray(this.rootMesh.position.add(new Vector3(0, 3, 0)), Vector3.Down(), 8);
    const hit = this.scene.pickWithRay(ray, mesh => mesh.checkCollisions && mesh !== this.rootMesh);
    return hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : null;
  }

  protected groundToWorld() {
    const groundY = this.getGroundY();
    if (groundY !== null) this.rootMesh.position.y = groundY;
  }

  protected abstract startAttackSequence(): void;

  public takeDamage(amount: number, isCrit = false): boolean {
    if (this.isDead) return false;

    const finalDamage = amount * (isCrit ? 1.5 : 1.0);
    this.hp = Math.max(0, this.hp - finalDamage);

    this.particles.emitHitSparks(this.rootMesh.position.add(new Vector3(0, 1.0, 0)), undefined, 16);
    this.soundManager.playHit(isCrit);

    // Directional knockback impulse away from player
    const away = this.rootMesh.position.subtract(this.targetPlayer.rootMesh.position);
    away.y = 0;
    if (away.lengthSquared() > 0.001) {
      away.normalize();
      this.rootMesh.moveWithCollisions(away.scale(isCrit ? 1.4 : 0.7));
    }

    this.poise -= finalDamage * 0.5;
    if (this.poise <= 0) {
      this.stagger();
      this.poise = this.maxPoise;
    }

    if (this.hp <= 0) {
      this.die();
    }

    return true;
  }

  protected stagger() {
    this.state = 'STAGGER';
    window.setTimeout(() => {
      if (!this.isDead) this.state = 'IDLE';
    }, 700);
  }

  protected updateHpBar() {
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpFillMesh.scaling.x = ratio;
    this.hpFillMesh.position.x = -(1.34 * (1 - ratio)) / 2;
    this.hpBarMesh.visibility = this.hp < this.maxHp ? 1 : 0;
  }

  public die() {
    this.isDead = true;
    this.soundManager.playEnemyRoar();
    this.particles.emitShockwave(this.rootMesh.position, 3.0);

    let fade = 1.0;
    const interval = window.setInterval(() => {
      fade -= 0.05;
      if (fade <= 0) {
        clearInterval(interval);
        this.dispose();
      }
    }, 30);
  }

  public dispose() {
    this.hpFillMesh.dispose();
    this.hpBarMesh.dispose();
    this.rootMesh.dispose();
  }
}

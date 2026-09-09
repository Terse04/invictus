import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';
import { EnemyBase3D } from '../enemies/EnemyBase3D';
import { Player3D } from '../player/Player3D';
import { Telegraph3D } from '../combat/Telegraph3D';
import { ParticleVFX3D } from '../vfx/ParticleVFX3D';
import { GameBridge } from '../GameBridge';
import { ENEMY_CONFIGS } from '../data/enemyData';

export class VanguardBoss3D extends EnemyBase3D {
  private isBossActive = false;
  private attackPattern = 0;
  private halberdMesh: Mesh;

  constructor(
    scene: Scene,
    spawnPos: Vector3,
    targetPlayer: Player3D,
    telegraph: Telegraph3D,
    particles: ParticleVFX3D
  ) {
    super(scene, spawnPos, ENEMY_CONFIGS.vanguardBoss, targetPlayer, telegraph, particles);

    const bossNode = new TransformNode('vanguardNode', scene);
    bossNode.parent = this.rootMesh;

    // Imposing Cyber-General Terracotta Frame (Scale 1.8x)
    const torso = MeshBuilder.CreateBox('vanguardTorso', {
      width: 1.5,
      height: 1.9,
      depth: 1.1
    }, scene);
    torso.parent = bossNode;
    torso.position.y = 1.6;

    const armorMat = new StandardMaterial('vanguardArmorMat', scene);
    armorMat.diffuseColor = new Color3(0.12, 0.16, 0.24); // Obsidian cyber-armor
    armorMat.emissiveColor = new Color3(0.35, 0.25, 0.05); // Gold imperial circuit
    armorMat.specularColor = new Color3(1.0, 0.85, 0.3);
    torso.material = armorMat;

    // Glowing Lightning Core
    const core = MeshBuilder.CreateSphere('vanguardCore', { diameter: 0.6 }, scene);
    core.parent = bossNode;
    core.position = new Vector3(0, 1.8, 0.58);

    const coreMat = new StandardMaterial('vanguardCoreMat', scene);
    coreMat.emissiveColor = new Color3(0.0, 0.95, 1.0); // Cyan thunder energy
    core.material = coreMat;

    // Helm & Crest
    const head = MeshBuilder.CreateBox('vanguardHead', { width: 0.75, height: 0.75, depth: 0.7 }, scene);
    head.parent = bossNode;
    head.position.y = 2.8;
    head.material = armorMat;

    // Massive Thunder Halberd
    this.halberdMesh = MeshBuilder.CreateCylinder('vanguardHalberd', {
      height: 3.8,
      diameter: 0.12
    }, scene);
    this.halberdMesh.parent = bossNode;
    this.halberdMesh.position = new Vector3(1.1, 1.8, 0.4);
    this.halberdMesh.rotation.x = Math.PI / 4;

    const halberdMat = new StandardMaterial('vanguardHalberdMat', scene);
    halberdMat.emissiveColor = new Color3(1.0, 0.85, 0.2);
    this.halberdMesh.material = halberdMat;
  }

  public override update(delta: number) {
    if (this.isDead) return;

    const dist = Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position);

    if (!this.isBossActive && dist <= 18.0) {
      this.activateBoss();
    }

    if (this.isBossActive) {
      this.syncBossBar();
    }

    super.update(delta);
  }

  private activateBoss() {
    this.isBossActive = true;
    this.soundManager.setBgmMode('combat');
    this.soundManager.playBossRoar();
    this.particles.emitShockwave(this.rootMesh.position, 6.0);

    GameBridge.emit('toast_message', {
      title: '⚠️ BOSS ENCOUNTER: CENTURION LEI-GUAN',
      subtitle: 'Guardian of the Thunder Gate engages combat protocols',
      type: 'alert'
    });
  }

  private syncBossBar() {
    GameBridge.emit('boss_encounter', {
      active: true,
      name: 'CENTURION LEI-GUAN',
      subtitle: 'Guardian of the Thunder Gate',
      phase: 1,
      maxPhases: 1,
      hp: this.hp,
      maxHp: this.maxHp
    });
  }

  protected override startAttackSequence() {
    this.state = 'TELEGRAPH';
    this.lastAttackTime = Date.now();

    this.attackPattern = (this.attackPattern + 1) % 3;

    if (this.attackPattern === 0) {
      this.executeThunderCharge();
    } else if (this.attackPattern === 1) {
      this.executeWhirlwindSpin();
    } else {
      this.executeLightningCall();
    }
  }

  // 1. Thunder Charge: Linear Dash
  private executeThunderCharge() {
    const start = this.rootMesh.position.clone();
    const forward = this.rootMesh.forward.clone();
    const chargeDist = 12.0;
    const end = start.add(forward.scale(chargeDist));

    this.telegraph.showLine(start, end, 2.2, 700, () => {
      if (this.isDead || this.state === 'STAGGER') return;

      this.state = 'ATTACK';
      this.soundManager.playHeavyRelease();
      this.particles.emitShockwave(this.rootMesh.position, 3.5);

      this.rootMesh.moveWithCollisions(forward.scale(chargeDist));

      // Hit check
      const dist = Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position);
      if (dist <= 3.2) {
        this.targetPlayer.takeDamage(this.config.damage);
      }

      window.setTimeout(() => {
        if (!this.isDead && this.state !== 'STAGGER') this.state = 'IDLE';
      }, 450);
    });
  }

  // 2. Whirlwind Spin: 360-degree shockwave
  private executeWhirlwindSpin() {
    const radius = 5.5;
    this.telegraph.showCircle(this.rootMesh.position, radius, 800, () => {
      if (this.isDead || this.state === 'STAGGER') return;

      this.state = 'ATTACK';
      this.soundManager.playHeavyRelease();
      this.particles.emitShockwave(this.rootMesh.position, radius, new Color3(1.0, 0.85, 0.2));

      const dist = Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position);
      if (dist <= radius) {
        this.targetPlayer.takeDamage(this.config.damage + 10);
      }

      window.setTimeout(() => {
        if (!this.isDead && this.state !== 'STAGGER') this.state = 'IDLE';
      }, 500);
    });
  }

  // 3. Lightning Call: Targeted ground strike
  private executeLightningCall() {
    const targetPos = this.targetPlayer.rootMesh.position.clone();

    this.telegraph.showCircle(targetPos, 3.2, 900, () => {
      if (this.isDead) return;

      this.soundManager.playHit(true);
      this.particles.emitHitSparks(targetPos, undefined, 32);
      this.particles.emitShockwave(targetPos, 3.5);

      const dist = Vector3.Distance(targetPos, this.targetPlayer.rootMesh.position);
      if (dist <= 3.2) {
        this.targetPlayer.takeDamage(this.config.damage + 14);
      }

      this.state = 'IDLE';
    });
  }

  public override die() {
    GameBridge.emit('boss_encounter', {
      active: false,
      name: '',
      subtitle: '',
      phase: 1,
      maxPhases: 1,
      hp: 0,
      maxHp: this.maxHp
    });

    this.soundManager.playVictoryFanfare();
    this.targetPlayer.unlockUltimate();

    GameBridge.emit('toast_message', {
      title: '✦ ULTIMATE UNLOCKED: CELESTIAL RESONANCE',
      subtitle: 'Press Q (or Ultimate Button) when gauge is full to unleash the finisher!',
      type: 'unlock'
    });

    super.die();
  }
}

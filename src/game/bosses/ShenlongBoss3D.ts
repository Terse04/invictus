import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';
import { Player3D } from '../player/Player3D';
import { Telegraph3D } from '../combat/Telegraph3D';
import { ParticleVFX3D } from '../vfx/ParticleVFX3D';
import { SoundManager } from '../audio/SoundManager';
import { GameBridge } from '../GameBridge';
import { ENEMY_CONFIGS } from '../data/enemyData';

export class ShenlongBoss3D {
  public scene: Scene;
  public rootMesh: Mesh;
  public targetPlayer: Player3D;
  public telegraph: Telegraph3D;
  public particles: ParticleVFX3D;
  private soundManager: SoundManager;

  // Stats
  public hp = ENEMY_CONFIGS.shenlongBoss.maxHp;
  public maxHp = ENEMY_CONFIGS.shenlongBoss.maxHp;
  public isDead = false;
  public isBossActive = false;
  public phase = 1;

  // AI & Attack state
  private attackState: 'IDLE' | 'TELEGRAPH' | 'ATTACK' | 'BEAM' | 'STAGGER' = 'IDLE';
  private lastAttackTime = 0;
  private attackCooldown = 2600;
  private isOverdrive = false;

  // 3D Sinuous Multi-segment Serpentine Body
  private bodySegments: Mesh[] = [];
  private segmentCount = 10;
  private historyPoints: { pos: Vector3; rotY: number }[] = [];
  private flightTimer = 0;

  // Materials
  private headMat: StandardMaterial;
  private bodyMat: StandardMaterial;
  private hornMat: StandardMaterial;

  constructor(
    scene: Scene,
    spawnPos: Vector3,
    targetPlayer: Player3D,
    telegraph: Telegraph3D,
    particles: ParticleVFX3D
  ) {
    this.scene = scene;
    this.targetPlayer = targetPlayer;
    this.telegraph = telegraph;
    this.particles = particles;
    this.soundManager = SoundManager.getInstance();

    // 1. Root Collider / Head
    this.rootMesh = MeshBuilder.CreateBox('dragonHead', {
      width: 2.4,
      height: 1.8,
      depth: 3.4
    }, scene);
    this.rootMesh.position = spawnPos.clone();
    this.rootMesh.position.y = 3.5; // Hovering height
    this.rootMesh.checkCollisions = true;

    // Materials
    this.headMat = new StandardMaterial('dragonHeadMat', scene);
    this.headMat.diffuseColor = new Color3(0.06, 0.12, 0.22); // Deep celestial indigo
    this.headMat.emissiveColor = new Color3(0.0, 0.45, 0.65); // Cyan cybernetic channels
    this.rootMesh.material = this.headMat;

    this.hornMat = new StandardMaterial('dragonHornMat', scene);
    this.hornMat.diffuseColor = new Color3(0.9, 0.75, 0.2);
    this.hornMat.emissiveColor = new Color3(0.4, 0.3, 0.05); // Imperial gold horns

    this.bodyMat = new StandardMaterial('dragonBodyMat', scene);
    this.bodyMat.diffuseColor = new Color3(0.08, 0.14, 0.24);
    this.bodyMat.emissiveColor = new Color3(0.0, 0.35, 0.5);

    // Branching Celestial Horns
    const leftHorn = MeshBuilder.CreateCylinder('lHorn', { height: 2.2, diameterTop: 0.08, diameterBottom: 0.32 }, scene);
    leftHorn.parent = this.rootMesh;
    leftHorn.position = new Vector3(-0.9, 1.2, -0.6);
    leftHorn.rotation = new Vector3(-0.6, 0, -0.4);
    leftHorn.material = this.hornMat;

    const rightHorn = MeshBuilder.CreateCylinder('rHorn', { height: 2.2, diameterTop: 0.08, diameterBottom: 0.32 }, scene);
    rightHorn.parent = this.rootMesh;
    rightHorn.position = new Vector3(0.9, 1.2, -0.6);
    rightHorn.rotation = new Vector3(-0.6, 0, 0.4);
    rightHorn.material = this.hornMat;

    // Glowing Cyber-Optics
    const leftEye = MeshBuilder.CreateSphere('lEye', { diameter: 0.45 }, scene);
    leftEye.parent = this.rootMesh;
    leftEye.position = new Vector3(-0.85, 0.4, 1.1);
    const eyeMat = new StandardMaterial('eyeMat', scene);
    eyeMat.emissiveColor = new Color3(0.0, 0.95, 1.0);
    leftEye.material = eyeMat;

    const rightEye = MeshBuilder.CreateSphere('rEye', { diameter: 0.45 }, scene);
    rightEye.parent = this.rootMesh;
    rightEye.position = new Vector3(0.85, 0.4, 1.1);
    rightEye.material = eyeMat;

    // 2. Trailing Serpentine Body Segments
    for (let i = 0; i < this.segmentCount; i++) {
      const seg = MeshBuilder.CreateSphere(`dragonSeg_${i}`, {
        diameterX: 2.0 - i * 0.08,
        diameterY: 1.8 - i * 0.08,
        diameterZ: 2.2 - i * 0.08
      }, scene);
      seg.position = spawnPos.clone();
      seg.material = this.bodyMat;
      this.bodySegments.push(seg);
    }

    // Pre-fill history buffer
    for (let i = 0; i < this.segmentCount * 16; i++) {
      this.historyPoints.push({ pos: this.rootMesh.position.clone(), rotY: 0 });
    }
  }

  public update(delta: number) {
    if (this.isDead) return;

    this.updateBodySegments();

    const dist = Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position);

    if (!this.isBossActive && dist <= 32.0) {
      this.activateBoss();
    }

    if (this.isBossActive) {
      this.syncBossBar();
      this.checkPhaseTransition();
    }

    if (this.attackState === 'STAGGER' || this.attackState === 'BEAM' || this.attackState === 'TELEGRAPH') {
      return;
    }

    // 3D Sinuous Undulating Flight Motion
    if (this.isBossActive) {
      this.flightTimer += delta * 0.002;
      const playerPos = this.targetPlayer.rootMesh.position;
      const bossPos = this.rootMesh.position;

      const dir = new Vector3(playerPos.x - bossPos.x, 0, playerPos.z - bossPos.z).normalize();
      const targetAngle = Math.atan2(dir.x, dir.z);

      // Smooth steering toward player
      this.rootMesh.rotation.y = targetAngle;

      const speed = this.isOverdrive ? 7.2 : 5.0;
      const moveVec = dir.scale((speed * delta) / 1000);
      // Vertical undulating wave
      moveVec.y = Math.sin(this.flightTimer * 2) * 0.04;

      this.rootMesh.position.addInPlace(moveVec);

      if (Date.now() - this.lastAttackTime >= this.attackCooldown) {
        this.startAttackPattern();
      }
    }
  }

  private updateBodySegments() {
    this.historyPoints.unshift({
      pos: this.rootMesh.position.clone(),
      rotY: this.rootMesh.rotation.y
    });

    if (this.historyPoints.length > this.segmentCount * 18) {
      this.historyPoints.pop();
    }

    // Update trailing segments position and orientation
    for (let i = 0; i < this.bodySegments.length; i++) {
      const idx = Math.min((i + 1) * 9, this.historyPoints.length - 1);
      const point = this.historyPoints[idx];
      if (point) {
        this.bodySegments[i].position = point.pos;
        this.bodySegments[i].rotation.y = point.rotY;
      }
    }
  }

  private activateBoss() {
    this.isBossActive = true;
    this.soundManager.setBgmMode('boss');
    this.soundManager.playBossRoar();
    this.particles.emitShockwave(this.rootMesh.position, 10.0);

    GameBridge.emit('toast_message', {
      title: '⚠️ CRITICAL ANOMALY: SHENLONG-09',
      subtitle: 'Celestial Transmuted Dragon awakens in the Dragon Sanctum',
      type: 'alert'
    });
  }

  private checkPhaseTransition() {
    const hpRatio = this.hp / this.maxHp;

    if (this.phase === 1 && hpRatio <= 0.65) {
      this.transitionToPhase(2);
    } else if (this.phase === 2 && hpRatio <= 0.3) {
      this.transitionToPhase(3);
    }
  }

  private transitionToPhase(newPhase: number) {
    this.phase = newPhase;
    this.soundManager.playBossRoar();
    this.particles.emitShockwave(this.rootMesh.position, 12.0);

    if (newPhase === 2) {
      this.attackCooldown = 2200;
      GameBridge.emit('toast_message', {
        title: '⚡ PHASE II: AERIAL CONVERGENCE',
        subtitle: 'Plasma Barrage and Dragon Orbs activated',
        type: 'alert'
      });
    } else if (newPhase === 3) {
      this.isOverdrive = true;
      this.attackCooldown = 1700;

      // Transform colors to Transmuted Overdrive (Crimson / Imperial Gold)
      this.headMat.emissiveColor = new Color3(1.0, 0.15, 0.35);
      this.bodyMat.emissiveColor = new Color3(0.9, 0.6, 0.05);

      GameBridge.emit('toast_message', {
        title: '🔥 PHASE III: TRANSMUTED OVERDRIVE',
        subtitle: 'Heaven-Sundering Beam sequence initiated!',
        type: 'alert'
      });
    }
  }

  private syncBossBar() {
    GameBridge.emit('boss_encounter', {
      active: true,
      name: 'SHENLONG-09',
      subtitle: this.isOverdrive ? 'TRANSMUTED OVERDRIVE' : 'Celestial Transmuted Dragon',
      phase: this.phase,
      maxPhases: 3,
      hp: this.hp,
      maxHp: this.maxHp
    });
  }

  private startAttackPattern() {
    this.lastAttackTime = Date.now();
    this.attackState = 'TELEGRAPH';

    if (this.phase === 1) {
      if (Math.random() < 0.5) {
        this.executeClawSweep();
      } else {
        this.executeTailWhip();
      }
    } else if (this.phase === 2) {
      const r = Math.random();
      if (r < 0.35) {
        this.executeClawSweep();
      } else if (r < 0.7) {
        this.executeDragonOrbBarrage();
      } else {
        this.executeSwoopDive();
      }
    } else {
      // Phase 3 Overdrive
      if (Math.random() < 0.6) {
        this.executeHeavenSunderingBeam();
      } else {
        this.executeSwoopDive();
      }
    }
  }

  // 1. Claw Sweep
  private executeClawSweep() {
    const forward = this.rootMesh.forward.clone();
    const range = 6.5;

    this.telegraph.showCone(this.rootMesh.position, forward, range, 650, () => {
      if (this.isDead) return;

      this.soundManager.playSlash(2);
      this.particles.emitShockwave(this.rootMesh.position, 4.0);

      const dist = Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position);
      if (dist <= range) {
        this.targetPlayer.takeDamage(32);
      }

      window.setTimeout(() => {
        if (!this.isDead) this.attackState = 'IDLE';
      }, 350);
    });
  }

  // 2. Tail Whip (Shockwave from tail segment)
  private executeTailWhip() {
    const lastSeg = this.bodySegments[this.bodySegments.length - 1];
    const tailPos = lastSeg.position.clone();
    const whipRadius = 5.5;

    this.telegraph.showCircle(tailPos, whipRadius, 700, () => {
      if (this.isDead) return;

      this.soundManager.playHeavyRelease();
      this.particles.emitShockwave(tailPos, whipRadius, new Color3(1.0, 0.85, 0.2));

      const dist = Vector3.Distance(tailPos, this.targetPlayer.rootMesh.position);
      if (dist <= whipRadius) {
        this.targetPlayer.takeDamage(36);
      }

      window.setTimeout(() => {
        if (!this.isDead) this.attackState = 'IDLE';
      }, 350);
    });
  }

  // 3. Dragon Orb Barrage (Phase 2)
  private executeDragonOrbBarrage() {
    this.soundManager.playCharge();

    for (let i = 0; i < 4; i++) {
      window.setTimeout(() => {
        if (this.isDead) return;

        const targetPos = this.targetPlayer.rootMesh.position.add(
          new Vector3((Math.random() - 0.5) * 4.0, 0, (Math.random() - 0.5) * 4.0)
        );

        this.telegraph.showCircle(targetPos, 2.5, 600, () => {
          if (this.isDead) return;

          this.soundManager.playHit(true);
          this.particles.emitShockwave(targetPos, 2.8, new Color3(1.0, 0.0, 0.4));

          const dist = Vector3.Distance(targetPos, this.targetPlayer.rootMesh.position);
          if (dist <= 2.8) {
            this.targetPlayer.takeDamage(24);
          }
        });
      }, i * 220);
    }

    window.setTimeout(() => {
      if (!this.isDead) this.attackState = 'IDLE';
    }, 1200);
  }

  // 4. Swoop Dive across arena
  private executeSwoopDive() {
    const start = this.rootMesh.position.clone();
    const forward = this.rootMesh.forward.clone();
    const diveDist = 22.0;
    const end = start.add(forward.scale(diveDist));

    this.telegraph.showLine(start, end, 3.2, 800, () => {
      if (this.isDead) return;

      this.soundManager.playHeavyRelease();
      this.particles.emitShockwave(this.rootMesh.position, 6.0);

      this.rootMesh.position.addInPlace(forward.scale(diveDist));

      const dist = Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position);
      if (dist <= 4.5) {
        this.targetPlayer.takeDamage(42);
      }

      window.setTimeout(() => {
        if (!this.isDead) this.attackState = 'IDLE';
      }, 500);
    });
  }

  // 5. SIGNATURE ULTIMATE: HEAVEN-SUNDERING BEAM (Phase 3)
  private executeHeavenSunderingBeam() {
    this.attackState = 'BEAM';

    const start = this.rootMesh.position.clone();
    const forward = this.rootMesh.forward.clone();
    const beamLength = 32.0;
    const end = start.add(forward.scale(beamLength));

    this.soundManager.playBossBeamCharge();
    this.particles.emitShockwave(start, 5.0, new Color3(1.0, 0.0, 0.4));

    // Clear Line Telegraph (1200ms warning)
    this.telegraph.showLine(start, end, 3.8, 1200, () => {
      if (this.isDead) return;

      this.soundManager.playBossBeamFire();

      // Create 3D sustained energy beam cylinder
      const beam = MeshBuilder.CreateCylinder('dragonBeam', {
        height: beamLength,
        diameter: 3.2
      }, this.scene);

      const mid = start.add(end).scale(0.5);
      beam.position = mid;
      beam.lookAt(end);
      beam.rotation.x += Math.PI / 2;

      const beamMat = new StandardMaterial('dragonBeamMat', this.scene);
      beamMat.emissiveColor = new Color3(1.0, 0.0, 0.4);
      beamMat.alpha = 0.9;
      beam.material = beamMat;

      // Hit check along 3D line segment
      const pPos = this.targetPlayer.rootMesh.position;
      const v = end.subtract(start);
      const w = pPos.subtract(start);
      const c1 = Vector3.Dot(w, v);
      const c2 = Vector3.Dot(v, v);
      const b = Math.max(0, Math.min(1, c1 / c2));
      const pb = start.add(v.scale(b));
      const distToBeam = Vector3.Distance(pPos, pb);

      if (distToBeam <= 3.2) {
        this.targetPlayer.takeDamage(65);
      }

      window.setTimeout(() => {
        beam.dispose();
      }, 450);

      // Stagger Vulnerability Window! Player deals 2x damage!
      this.attackState = 'STAGGER';
      window.setTimeout(() => {
        if (!this.isDead) this.attackState = 'IDLE';
      }, 1800);
    });
  }

  public takeDamage(amount: number, isCrit = false): boolean {
    if (this.isDead) return false;

    const multiplier = this.attackState === 'STAGGER' ? 2.0 : (isCrit ? 1.5 : 1.0);
    const finalDamage = amount * multiplier;
    this.hp = Math.max(0, this.hp - finalDamage);

    this.particles.emitHitSparks(this.rootMesh.position, undefined, 20);
    this.soundManager.playHit(isCrit);
    this.targetPlayer.addUltimateCharge(5);

    if (this.hp <= 0) {
      this.die();
    }

    return true;
  }

  public die() {
    this.isDead = true;

    GameBridge.emit('boss_encounter', {
      active: false,
      name: '',
      subtitle: '',
      phase: 3,
      maxPhases: 3,
      hp: 0,
      maxHp: this.maxHp
    });

    this.soundManager.playBossRoar();
    this.soundManager.playVictoryFanfare();

    // Explode segments sequentially
    this.bodySegments.forEach((seg, i) => {
      window.setTimeout(() => {
        this.particles.emitShockwave(seg.position, 4.5, new Color3(1.0, 0.85, 0.2));
        seg.dispose();
      }, i * 140);
    });

    window.setTimeout(() => {
      this.particles.emitShockwave(this.rootMesh.position, 8.0);
      this.rootMesh.dispose();

      // Trigger Victory State in React
      GameBridge.emit('victory', {
        timeElapsed: 180,
        maxCombo: 35,
        damageDealt: Math.round(this.maxHp),
        rank: 'S'
      });
    }, 1200);
  }

  public dispose() {
    this.bodySegments.forEach(s => s.dispose());
    this.rootMesh.dispose();
  }
}

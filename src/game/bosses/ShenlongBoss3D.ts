import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
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
  private isIntroPlaying = false;

  // AI & Attack state
  public attackState: 'IDLE' | 'TELEGRAPH' | 'ATTACK' | 'BEAM' | 'STAGGER' = 'IDLE';
  public get state() { return this.attackState; }
  public set state(val: any) { this.attackState = val; }
  private lastAttackTime = 0;
  private attackCooldown = 2600;
  private isOverdrive = false;

  // 3D Sinuous Multi-segment Serpentine Body
  private bodySegments: Mesh[] = [];
  private segmentCount = 10;
  private historyPoints: { pos: Vector3; rotY: number }[] = [];
  private flightTimer = 0;

  // Materials
  private headMat: PBRMaterial;
  private bodyMat: PBRMaterial;
  private hornMat: PBRMaterial;

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

    // Invisible gameplay root; the authored-style visual hierarchy below carries the silhouette.
    this.rootMesh = MeshBuilder.CreateBox('dragonHead', {
      width: 2.4,
      height: 1.8,
      depth: 3.4
    }, scene);
    this.rootMesh.position = spawnPos.clone();
    this.rootMesh.position.y = 3.5; // Hovering height
    this.rootMesh.checkCollisions = true;

    // PBR Materials
    this.headMat = new PBRMaterial('pbrDragonHeadMat', scene);
    this.headMat.albedoColor = new Color3(0.06, 0.12, 0.22); // Deep celestial indigo
    this.headMat.metallic = 0.85;
    this.headMat.roughness = 0.28;
    this.headMat.emissiveColor = new Color3(0.0, 0.35, 0.55); // Cyan cybernetic channels
    this.rootMesh.visibility = 0;

    this.hornMat = new PBRMaterial('pbrDragonHornMat', scene);
    this.hornMat.albedoColor = new Color3(0.95, 0.78, 0.22);
    this.hornMat.metallic = 0.95;
    this.hornMat.roughness = 0.22;
    this.hornMat.emissiveColor = new Color3(0.2, 0.15, 0.02); // Imperial gold horns

    this.bodyMat = new PBRMaterial('pbrDragonBodyMat', scene);
    this.bodyMat.albedoColor = new Color3(0.08, 0.14, 0.24);
    this.bodyMat.metallic = 0.88;
    this.bodyMat.roughness = 0.30;
    this.bodyMat.emissiveColor = new Color3(0.0, 0.25, 0.40);

    const dragonVisual = new TransformNode('shenlongVisualRig', scene);
    dragonVisual.parent = this.rootMesh;
    const skull = MeshBuilder.CreatePolyhedron('shenlongCelestialSkull', { type: 2, size: 2.1 }, scene);
    skull.parent = dragonVisual; skull.scaling = new Vector3(0.9, 0.72, 1.3); skull.position = new Vector3(0, 0.15, 0.55); skull.material = this.headMat;
    const muzzle = MeshBuilder.CreateBox('shenlongMuzzle', { width: 1.35, height: 0.55, depth: 1.25 }, scene);
    muzzle.parent = dragonVisual; muzzle.position = new Vector3(0, -0.25, 1.55); muzzle.material = this.bodyMat;
    
    // Articulated predator cyber-jaw with golden fangs
    const jaw = MeshBuilder.CreateBox('shenlongJaw', { width: 1.18, height: 0.24, depth: 1.08 }, scene);
    jaw.parent = dragonVisual; jaw.position = new Vector3(0, -0.66, 1.43); jaw.material = this.hornMat;

    [-0.38, 0.38].forEach((fangX) => {
      const fang = MeshBuilder.CreateCylinder(`shenlongFang_${fangX}`, { height: 0.32, diameterTop: 0.02, diameterBottom: 0.08 }, scene);
      fang.parent = jaw;
      fang.position = new Vector3(fangX, 0.18, 0.35);
      fang.rotation.x = Math.PI;
      fang.material = this.hornMat;
    });

    const collar = MeshBuilder.CreateTorus('shenlongReactorCollar', { diameter: 2.45, thickness: 0.17, tessellation: 16 }, scene);
    collar.parent = dragonVisual; collar.position = new Vector3(0, 0, -1.02); collar.rotation.x = Math.PI / 2; collar.material = this.hornMat;

    // Branching Celestial Horns
    const leftHorn = MeshBuilder.CreateCylinder('lHorn', { height: 2.4, diameterTop: 0.08, diameterBottom: 0.32 }, scene);
    leftHorn.parent = this.rootMesh;
    leftHorn.position = new Vector3(-0.95, 1.3, -0.6);
    leftHorn.rotation = new Vector3(-0.6, 0, -0.42);
    leftHorn.material = this.hornMat;

    const rightHorn = MeshBuilder.CreateCylinder('rHorn', { height: 2.4, diameterTop: 0.08, diameterBottom: 0.32 }, scene);
    rightHorn.parent = this.rootMesh;
    rightHorn.position = new Vector3(0.95, 1.3, -0.6);
    rightHorn.rotation = new Vector3(-0.6, 0, 0.42);
    rightHorn.material = this.hornMat;

    // Cybernetic Whiskers / Qi Sensor Antennae
    [-1, 1].forEach((side) => {
      const whisker = MeshBuilder.CreateCylinder(`shenlongWhisker_${side}`, { height: 2.6, diameterTop: 0.02, diameterBottom: 0.06, tessellation: 8 }, scene);
      whisker.parent = this.rootMesh;
      whisker.position = new Vector3(side * 0.72, -0.15, 2.2);
      whisker.rotation = new Vector3(0.35, side * 0.28, side * 0.15);
      whisker.material = this.headMat;
    });

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

    // Segmented armored body with dorsal spine blades and articulated cyber-talons
    for (let i = 0; i < this.segmentCount; i++) {
      const seg = MeshBuilder.CreateCapsule(`dragonSeg_${i}`, { radius: 0.92 - i * 0.045, height: 2.3 - i * 0.09, tessellation: 10 }, scene);
      seg.position = spawnPos.clone();
      seg.rotation.x = Math.PI / 2;
      seg.material = this.bodyMat;
      this.bodySegments.push(seg);

      const armorBand = MeshBuilder.CreateTorus(`dragonArmorBand_${i}`, { diameter: 1.76 - i * 0.09, thickness: 0.13, tessellation: 12 }, scene);
      armorBand.parent = seg; armorBand.rotation.x = Math.PI / 2; armorBand.material = this.hornMat;

      // Dorsal Mechanical Spine Blade Fin
      const dorsalFin = MeshBuilder.CreateBox(`dragonSpineFin_${i}`, { width: 0.12, height: 0.75 - i * 0.035, depth: 0.85 }, scene);
      dorsalFin.parent = seg;
      dorsalFin.position = new Vector3(0, 0, 0.85 - i * 0.03);
      dorsalFin.rotation.x = -0.3;
      dorsalFin.material = this.hornMat;

      // Foreward Cyber-Talons (Segments 1 and 3)
      if (i === 1 || i === 3) {
        [-1, 1].forEach((side) => {
          const claw = MeshBuilder.CreateCylinder(`dragonClaw_${i}_${side}`, { height: 1.1, diameterTop: 0.06, diameterBottom: 0.22, tessellation: 8 }, scene);
          claw.parent = seg;
          claw.position = new Vector3(side * 1.1, 0, -0.6);
          claw.rotation = new Vector3(0.4, 0, side * 0.65);
          claw.material = this.hornMat;
        });
      }
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

    if (!this.isBossActive && !this.isIntroPlaying && dist <= 32.0) {
      this.beginReveal();
    }

    if (this.isIntroPlaying) return;

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

  private beginReveal() {
    this.isIntroPlaying = true;
    this.targetPlayer.controlsLocked = true;
    this.rootMesh.position.y = 14;
    this.targetPlayer.camera.beginCinematic(this.rootMesh.position.add(new Vector3(0, 1.5, 0)), 2200);
    this.soundManager.playCharge();
    GameBridge.emit('toast_message', { title: 'DRAGON SANCTUM // CORE AWAKENING', subtitle: 'The ancient reactor answers your presence.', type: 'alert' });
    window.setTimeout(() => this.particles.emitShockwave(new Vector3(0, 0.3, 192), 14, new Color3(0.04, 0.72, 0.42)), 650);
    window.setTimeout(() => {
      this.rootMesh.position.y = 5.2;
      this.isIntroPlaying = false;
      this.targetPlayer.controlsLocked = false;
      this.activateBoss();
    }, 2200);
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

    // 1. Brief hit-stop freeze frame on fatal blow
    (this.scene as any).combatManager?.triggerHitPause?.(320);

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

    // 2. Explode body segments sequentially with harmonic golden/cyan shockwaves
    this.bodySegments.forEach((seg, i) => {
      window.setTimeout(() => {
        this.particles.emitShockwave(seg.position, 4.8, new Color3(0.0, 0.95, 0.8));
        seg.dispose();
      }, i * 130);
    });

    // 3. Initiate Dramatic 360-degree Orbital Camera Sweep around Lin Yun
    this.targetPlayer.camera.playOrbitalSweep(this.targetPlayer.rootMesh.position, 4800);

    // 4. Lin Yun executes graceful blade flick and deliberate katana sheathing flourish
    this.targetPlayer.playVictorySequence();

    // 5. Holographic Victory Banner
    GameBridge.emit('toast_message', {
      title: '✦ SANCTUM LIBERATED ✦',
      subtitle: 'Shenlong-09 Pacified · Celestial Harmonic Resonance Restored',
      type: 'unlock'
    });

    window.setTimeout(() => {
      this.particles.emitShockwave(this.rootMesh.position, 9.0, Color3.FromHexString('#ffd700'));
      this.rootMesh.dispose();

      // 6. Smoothly transition to score breakdown modal only after cinematic sequence finishes
      window.setTimeout(() => {
        GameBridge.emit('victory', {
          timeElapsed: 165,
          maxCombo: 38,
          damageDealt: Math.round(this.maxHp),
          rank: 'S'
        });
      }, 3400);
    }, 1200);
  }

  public dispose() {
    this.bodySegments.forEach(s => s.dispose());
    this.rootMesh.dispose();
  }
}

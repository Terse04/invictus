import { Vector3 } from '@babylonjs/core';
import { GameEngine } from './Engine';
import { ThirdPersonCamera } from './camera/ThirdPersonCamera';
import { Player3D } from './player/Player3D';
import { Environment3D } from './world/Environment3D';
import { ArenaGate3D } from './world/ArenaGate3D';
import { Telegraph3D } from './combat/Telegraph3D';
import { ParticleVFX3D } from './vfx/ParticleVFX3D';
import { CombatManager3D } from './combat/CombatManager3D';
import { TerracottaRevenant3D } from './enemies/TerracottaRevenant3D';
import { BronzeHoplite3D } from './enemies/BronzeHoplite3D';
import { CyberScarab3D } from './enemies/CyberScarab3D';
import { VanguardBoss3D } from './bosses/VanguardBoss3D';
import { ShenlongBoss3D } from './bosses/ShenlongBoss3D';
import { ElderYan3D } from './npc/ElderYan3D';
import { SoundManager } from './audio/SoundManager';
import { GameBridge } from './GameBridge';

export class Game3D {
  public engine: GameEngine;
  public camera: ThirdPersonCamera;
  public player: Player3D;
  public environment: Environment3D;
  public telegraph: Telegraph3D;
  public particles: ParticleVFX3D;
  public combatManager: CombatManager3D;
  public elderYan: ElderYan3D;

  // Bosses & Arena Gates
  public thunderGateBarrier: ArenaGate3D;
  public sanctumBarrier: ArenaGate3D;

  private isDisposed = false;
  private isPaused = false;

  constructor(canvas: HTMLCanvasElement) {
    // 1. Initialize Babylon.js 3D Engine & Scene
    this.engine = new GameEngine(canvas);

    // 2. Systems
    this.telegraph = new Telegraph3D(this.engine.scene);
    this.particles = new ParticleVFX3D(this.engine.scene);

    // 3. 3D Environment (Celestial Ruins)
    this.environment = new Environment3D(this.engine.scene, this.engine.shadowGenerator, this.engine.quality);

    // 4. 3D Protagonist Lin Yun (Spawn in Zone 1: Awakening Terrace)
    const spawnPos = new Vector3(0, 0, -5);
    // Dummy target object for camera initialization
    const targetRef = { position: spawnPos.clone() };
    this.camera = new ThirdPersonCamera(this.engine.scene, canvas, targetRef);

    this.player = new Player3D(this.engine.scene, this.camera, spawnPos);
    targetRef.position = this.player.rootMesh.position;

    // Add player meshes to dynamic shadow generator
    this.player.visibleMeshes.forEach(mesh => {
      this.engine.shadowGenerator.addShadowCaster(mesh);
    });
    this.engine.shadowGenerator.addShadowCaster(this.player.weapon.bladeMesh);

    // 5. 3D Combat Manager
    this.combatManager = new CombatManager3D(this.engine.scene, this.player, this.particles);

    // Frame-accurate spatial katana attack callback
    this.player.onAttackHitCheck = (isHeavy: boolean, damage: number) => {
      const forward = this.player.rootMesh.forward.clone().normalize();
      this.combatManager.resolvePlayerMeleeAttack({
        origin: this.player.rootMesh.position.add(new Vector3(0, 0.9, 0)),
        bladeRoot: this.player.weapon.rootNode.getAbsolutePosition(),
        bladeTip: this.player.weapon.getWorldTipPosition(),
        direction: forward,
        range: isHeavy ? 3.8 : 2.8,
        damage,
        poiseDamage: isHeavy ? 45 : 20,
        isHeavy
      });
    };
    this.player.onWaveActivate = () => {
      this.combatManager.spawnTransmutationWave(this.player.rootMesh.position.add(new Vector3(0, 0.85, 0)), this.player.rootMesh.forward.clone().normalize());
    };
    this.player.onUltimateActivate = () => {
      this.combatManager.triggerCelestialResonance(this.player.rootMesh.position.clone());
    };

    // 6. 3D Elder Yan NPC in Zone 2
    this.elderYan = new ElderYan3D(this.engine.scene, new Vector3(0, 0, 35), this.player);

    // 7. Arena Gates
    this.thunderGateBarrier = new ArenaGate3D(this.engine.scene, new Vector3(0, 0, 102), 12, 5);
    this.sanctumBarrier = new ArenaGate3D(this.engine.scene, new Vector3(0, 0, 153), 16, 6);

    // 8. Spawn 3D Enemies across the zones
    this.spawnEnemies();

    // 9. Main 3D Simulation Frame Loop
    let lastTime = performance.now();
    this.engine.scene.onBeforeRenderObservable.add(() => {
      if (this.isDisposed) return;

      const now = performance.now();
      const delta = Math.min(now - lastTime, 100);
      lastTime = now;

      if (this.isPaused || this.combatManager.isHitPaused()) return;

      // Update Player & Camera
      this.player.update(delta);
      this.camera.update(delta);
      this.particles.update(delta);

      // Update NPC
      this.elderYan.update();

      // Update active enemies
      for (let i = this.combatManager.enemies.length - 1; i >= 0; i--) {
        const enemy = this.combatManager.enemies[i];
        if (enemy.isDead) {
          this.combatManager.enemies.splice(i, 1);
        } else {
          enemy.update(delta);
        }
      }

      // Update Mini-Boss
      if (this.combatManager.vanguardBoss && !this.combatManager.vanguardBoss.isDead) {
        this.combatManager.vanguardBoss.update(delta);
      }

      // Update Main Boss
      if (this.combatManager.shenlongBoss && !this.combatManager.shenlongBoss.isDead) {
        this.combatManager.shenlongBoss.update(delta);
      }
    });

    // 10. Start Ambient Procedural Soundtrack
    SoundManager.getInstance().startBGM('ambient');

    // Welcome banner
    GameBridge.emit('toast_message', {
      title: '✦ CHAPTER I: THE CELESTIAL RUINS',
      subtitle: 'Traverse the 3D ruins to uncover the mystery of the Transmutation',
      type: 'info'
    });
  }

  private spawnEnemies() {
    // Zone 1: the first enemy must establish the world’s transmuted identity.
    const revenant1 = new TerracottaRevenant3D(this.engine.scene, new Vector3(-4, 0, 4), this.player, this.telegraph, this.particles);
    const revenant2 = new TerracottaRevenant3D(this.engine.scene, new Vector3(4, 0, 6), this.player, this.telegraph, this.particles);
    this.combatManager.enemies.push(revenant1, revenant2);

    // Zone 3 (Sunken Colonnade): Mixed Encounter
    const revenant3 = new TerracottaRevenant3D(this.engine.scene, new Vector3(-6, 0, 70), this.player, this.telegraph, this.particles);
    const revenant4 = new TerracottaRevenant3D(this.engine.scene, new Vector3(6, 0, 74), this.player, this.telegraph, this.particles);
    const hoplite = new BronzeHoplite3D(this.engine.scene, new Vector3(0, 0, 80), this.player, this.telegraph, this.particles);
    const scarab = new CyberScarab3D(this.engine.scene, new Vector3(5, 0, 84), this.player, this.telegraph, this.particles);
    this.combatManager.enemies.push(revenant3, revenant4, hoplite, scarab);

    // Zone 4: Mini-Boss Centurion Lei-Guan
    this.combatManager.vanguardBoss = new VanguardBoss3D(
      this.engine.scene,
      new Vector3(0, 0, 122),
      this.player,
      this.telegraph,
      this.particles
    );

    // Zone 5: Main Boss Shenlong-09
    this.combatManager.shenlongBoss = new ShenlongBoss3D(
      this.engine.scene,
      new Vector3(0, 0, 182),
      this.player,
      this.telegraph,
      this.particles
    );
  }

  public restart() {
    this.player.hp = this.player.maxHp;
    this.player.rootMesh.position = new Vector3(0, 0, -5);
    this.player.isDead = false;
    this.player.animState = 'idle';

    GameBridge.emit('boss_encounter', {
      active: false,
      name: '',
      subtitle: '',
      phase: 1,
      maxPhases: 1,
      hp: 0,
      maxHp: 1
    });
  }

  public setPaused(value: boolean) {
    this.isPaused = value;
  }

  public dispose() {
    this.isDisposed = true;
    this.camera.dispose();
    this.engine.dispose();
  }
}

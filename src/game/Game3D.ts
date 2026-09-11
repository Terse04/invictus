import { Color3, Vector3 } from '@babylonjs/core';
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
  private foundryVictoryEmitted = false;
  private soundManager = SoundManager.getInstance();
  public readonly chapter: 1 | 2;

  constructor(canvas: HTMLCanvasElement, chapter: 1 | 2 = 1) {
    this.chapter = chapter;
    // 1. Initialize Babylon.js 3D Engine & Scene
    this.engine = new GameEngine(canvas);
    if (chapter === 2) {
      this.engine.dirLight.intensity = 1.5;
      this.engine.dirLight.diffuse = Color3.FromHexString('#ff8833');
      this.engine.hemiLight.groundColor = Color3.FromHexString('#1a0f0a');
      this.engine.hemiLight.diffuse = Color3.FromHexString('#3d1a10');
      this.engine.scene.fogColor = Color3.FromHexString('#1e0c08');
      this.engine.scene.fogDensity = 0.003;
    }

    // 2. Systems
    this.telegraph = new Telegraph3D(this.engine.scene);
    this.particles = new ParticleVFX3D(this.engine.scene);

    // 3. 3D Environment (Celestial Ruins)
    this.environment = new Environment3D(this.engine.scene, this.engine.shadowGenerator, this.engine.quality, chapter);

    // 4. 3D Protagonist Lin Yun (Spawn in Zone 1: Awakening Terrace)
    const spawnPos = new Vector3(0, 0, -5);
    // Dummy target object for camera initialization
    const targetRef = { position: spawnPos.clone() };
    this.camera = new ThirdPersonCamera(this.engine.scene, canvas, targetRef);
    this.engine.configureRendering(this.camera.camera);

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
        range: isHeavy ? 4.2 : 3.2,
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
      if (this.chapter === 2 && this.combatManager.vanguardBoss?.isDead && !this.foundryVictoryEmitted) {
        this.foundryVictoryEmitted = true;
        GameBridge.emit('victory', { timeElapsed: 180, maxCombo: 35, damageDealt: 3200, rank: 'S' });
      }

      // Update Main Boss
      if (this.combatManager.shenlongBoss && !this.combatManager.shenlongBoss.isDead) {
        this.combatManager.shenlongBoss.update(delta);
      }
    });

    // 10. Start Ambient Procedural Soundtrack
    this.soundManager.startBGM('ambient');

    // 11. Orchestrate Real-Time Cinematic Chapter Entry Sequence
    this.playChapterEntrySequence();
  }

  private playChapterEntrySequence() {
    this.player.controlsLocked = true;
    this.player.animState = 'summon_crouch';
    this.player.weapon.sheathWeapon(false);

    // Cosmic quantum drone descent
    this.soundManager.playCelestialDescent();

    // Ignite the vertical summoning beam on the awakening seal
    this.environment.triggerSummonBeam(2800);

    // Camera crane descent track
    const spawnTarget = new Vector3(0, 1.1, -5);
    this.camera.playCinematicSequence([
      { target: spawnTarget, alpha: -Math.PI / 2, beta: 0.38, radius: 24, duration: 2000 },
      { target: spawnTarget, alpha: -Math.PI / 2.2, beta: 1.05, radius: 8.0, duration: 1600 },
      { target: spawnTarget, alpha: -Math.PI / 2, beta: Math.PI / 2.35, radius: 4.8, duration: 1800 }
    ]);

    // Lin Yun animation sequence (crouch landing -> rising -> drawing blade -> combat idle)
    this.player.playSummonLanding(() => {
      GameBridge.emit('objective_update', {
        text: this.chapter === 2 ? '✦ Quench the Molten Foundry Crucible' : '✦ Traverse the Celestial Sanctuary'
      });
    });

    // At touchdown (~1.4s):
    window.setTimeout(() => {
      if (this.isDisposed) return;
      this.particles.emitShockwave(new Vector3(0, 0.22, -5), 4.8, Color3.FromHexString('#00f0ff'));
      this.soundManager.playLightningStrike();
      this.camera.shake(0.35, 260);
    }, 1400);
  }

  private spawnEnemies() {
    if (this.chapter === 2) { this.spawnFoundryEnemies(); return; }
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

  private spawnFoundryEnemies() {
    const spawn = (type: 'revenant' | 'scarab' | 'hoplite', pos: Vector3) => {
      const enemy = type === 'revenant' ? new TerracottaRevenant3D(this.engine.scene, pos, this.player, this.telegraph, this.particles)
        : type === 'scarab' ? new CyberScarab3D(this.engine.scene, pos, this.player, this.telegraph, this.particles)
          : new BronzeHoplite3D(this.engine.scene, pos, this.player, this.telegraph, this.particles);
      enemy.applyFoundryPalette();
      this.combatManager.enemies.push(enemy);
    };
    spawn('revenant', new Vector3(-4, 0, 18)); spawn('revenant', new Vector3(4, 0, 22));
    spawn('revenant', new Vector3(-6, 0, 82)); spawn('revenant', new Vector3(6, 0, 86));
    spawn('scarab', new Vector3(-3, 0, 94)); spawn('scarab', new Vector3(4, 0, 96)); spawn('hoplite', new Vector3(0, 0, 104));
    const vulcan = new VanguardBoss3D(this.engine.scene, new Vector3(0, 0, 184), this.player, this.telegraph, this.particles, 'vulcan');
    vulcan.applyFoundryPalette();
    this.combatManager.vanguardBoss = vulcan;
  }

  public restart() {
    this.player.hp = this.player.maxHp;
    this.player.rootMesh.position = new Vector3(0, 0, -5);
    this.player.isDead = false;
    this.player.animState = 'idle';
    this.player.ultimate = 100;

    // Clear and respawn enemies for the active chapter
    this.combatManager.enemies.forEach(e => e.dispose());
    this.combatManager.enemies = [];
    if (this.combatManager.vanguardBoss) {
      this.combatManager.vanguardBoss.dispose();
      this.combatManager.vanguardBoss = null;
    }
    if (this.combatManager.shenlongBoss) {
      this.combatManager.shenlongBoss.dispose();
      this.combatManager.shenlongBoss = null;
    }
    this.foundryVictoryEmitted = false;
    this.spawnEnemies();
    this.playChapterEntrySequence();

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

import {
  Scene,
  Vector3,
  Vector2,
  Color3
} from '@babylonjs/core';
import { Player3D } from '../player/Player3D';
import { EnemyBase3D } from '../enemies/EnemyBase3D';
import { VanguardBoss3D } from '../bosses/VanguardBoss3D';
import { ShenlongBoss3D } from '../bosses/ShenlongBoss3D';
import { ParticleVFX3D } from '../vfx/ParticleVFX3D';
import { GameBridge } from '../GameBridge';
import { SoundManager } from '../audio/SoundManager';

export interface AttackRequest {
  origin: Vector3;
  bladeRoot: Vector3;
  bladeTip: Vector3;
  direction: Vector3;
  range: number;
  damage: number;
  poiseDamage: number;
  isHeavy: boolean;
}

export class CombatManager3D {
  private scene: Scene;
  private player: Player3D;
  private particles: ParticleVFX3D;
  private soundManager: SoundManager;

  // Active enemies & bosses
  public enemies: EnemyBase3D[] = [];
  public vanguardBoss: VanguardBoss3D | null = null;
  public shenlongBoss: ShenlongBoss3D | null = null;

  // Combo system
  public comboCount = 0;
  private comboResetTimeout: number | null = null;
  private hitPauseUntil = 0;

  constructor(scene: Scene, player: Player3D, particles: ParticleVFX3D) {
    this.scene = scene;
    this.player = player;
    this.particles = particles;
    this.soundManager = SoundManager.getInstance();

    (scene as any).combatManager = this;
  }

  // 3D Spatial Melee Attack Resolution
  public resolvePlayerMeleeAttack(req: AttackRequest) {
    let hitAny = false;

    // 1. Check Standard Enemies
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      const toEnemy = enemy.rootMesh.position.subtract(req.origin);
      const horizontalDist = new Vector2(toEnemy.x, toEnemy.z).length();
      const heightDiff = Math.abs(enemy.rootMesh.position.y - req.origin.y);

      if (horizontalDist <= req.range && heightDiff < 2.5) {
        const horizontalDirection = new Vector3(toEnemy.x, 0, toEnemy.z);
        const forwardDot = horizontalDirection.lengthSquared() > 0.0001
          ? Vector3.Dot(horizontalDirection.normalize(), req.direction)
          : 1;
        if (forwardDot > 0.15 || horizontalDist < 1.6) {
          const isCrit = Math.random() < 0.28 || req.isHeavy;
          enemy.takeDamage(req.damage, isCrit);
          this.registerHit(req.damage * (isCrit ? 1.5 : 1.0));
          hitAny = true;
        }
      }
    }

    // 2. Check Mini-Boss (Vanguard)
    if (this.vanguardBoss && !this.vanguardBoss.isDead) {
      const toBoss = this.vanguardBoss.rootMesh.position.subtract(req.origin);
      const dist = toBoss.length();
      if (dist <= req.range + 0.8) {
        const isCrit = Math.random() < 0.28 || req.isHeavy;
        this.vanguardBoss.takeDamage(req.damage, isCrit);
        this.registerHit(req.damage * (isCrit ? 1.5 : 1.0));
        hitAny = true;
      }
    }

    // 3. Check Main Boss (Shenlong-09)
    if (this.shenlongBoss && !this.shenlongBoss.isDead) {
      const toDragon = this.shenlongBoss.rootMesh.position.subtract(req.origin);
      const dist = toDragon.length();
      if (dist <= req.range + 2.0) {
        const isCrit = Math.random() < 0.32 || req.isHeavy;
        this.shenlongBoss.takeDamage(req.damage, isCrit);
        this.registerHit(req.damage * (isCrit ? 1.5 : 1.0));
        hitAny = true;
      }
    }

    if (hitAny) {
      this.soundManager.setBgmMode('combat');
      this.triggerHitPause(req.isHeavy ? 65 : 40);
    }
  }

  // 3D Transmutation Wave Ability (Radial + Forward arc)
  public spawnTransmutationWave(origin: Vector3, forward: Vector3) {
    this.particles.emitShockwave(origin, 5.5);
    const waveMesh = this.particles.spawnTransmutationWave(origin, forward);

    // Wave collision check loop
    let waveLife = 550;
    const interval = window.setInterval(() => {
      waveLife -= 40;
      const wavePos = waveMesh.position;

      // Hit enemies
      for (const enemy of this.enemies) {
        if (!enemy.isDead && Vector3.Distance(wavePos, enemy.rootMesh.position) < 3.2) {
          enemy.takeDamage(55, true);
          this.registerHit(55);
        }
      }

      if (this.vanguardBoss && !this.vanguardBoss.isDead && Vector3.Distance(wavePos, this.vanguardBoss.rootMesh.position) < 3.8) {
        this.vanguardBoss.takeDamage(60, true);
        this.registerHit(60);
      }

      if (this.shenlongBoss && !this.shenlongBoss.isDead && Vector3.Distance(wavePos, this.shenlongBoss.rootMesh.position) < 4.5) {
        this.shenlongBoss.takeDamage(75, true);
        this.registerHit(75);
      }

      if (waveLife <= 0) {
        clearInterval(interval);
        this.particles.stopTransmutationWave(waveMesh);
      }
    }, 40);
  }

  // 3D Celestial Resonance Ultimate Finisher
  public triggerCelestialResonance(origin: Vector3) {
    // 8-directional radial slash burst
    for (let i = 0; i < 8; i++) {
      window.setTimeout(() => {
        const angle = (i / 8) * Math.PI * 2;
        const p = origin.add(new Vector3(Math.cos(angle) * 3.5, 0.5, Math.sin(angle) * 3.5));
        this.particles.emitHitSparks(p, undefined, 20);
      }, i * 65);
    }

    // Grand explosion blast
    window.setTimeout(() => {
      this.particles.emitShockwave(origin, 9.5, new Color3(1.0, 0.85, 0.2));
      this.particles.emitShockwave(origin, 12.0, new Color3(0.0, 0.95, 1.0));

      // Damage all nearby targets heavily
      for (const enemy of this.enemies) {
        if (!enemy.isDead && Vector3.Distance(origin, enemy.rootMesh.position) < 9.5) {
          enemy.takeDamage(160, true);
          this.registerHit(160);
        }
      }

      if (this.vanguardBoss && !this.vanguardBoss.isDead && Vector3.Distance(origin, this.vanguardBoss.rootMesh.position) < 10.0) {
        this.vanguardBoss.takeDamage(220, true);
        this.registerHit(220);
      }

      if (this.shenlongBoss && !this.shenlongBoss.isDead && Vector3.Distance(origin, this.shenlongBoss.rootMesh.position) < 12.0) {
        this.shenlongBoss.takeDamage(320, true);
        this.registerHit(320);
      }
    }, 550);
  }

  // Hit Pause (Frame Freeze)
  private triggerHitPause(ms: number) {
    this.hitPauseUntil = Math.max(this.hitPauseUntil, performance.now() + ms);
  }

  public isHitPaused() { return performance.now() < this.hitPauseUntil; }

  private registerHit(damage: number) {
    // Every confirmed player hit feeds the ultimate meter.
    this.player.addUltimateCharge(Math.max(6, Math.min(16, Math.round(damage / 7))));
    this.comboCount++;
    const rank = this.calculateRank(this.comboCount);

    GameBridge.emit('combo_update', {
      count: this.comboCount,
      rank,
      multiplier: 1.0 + this.comboCount * 0.05
    });

    if (this.comboResetTimeout) {
      clearTimeout(this.comboResetTimeout);
    }

    this.comboResetTimeout = window.setTimeout(() => {
      this.comboCount = 0;
      GameBridge.emit('combo_update', {
        count: 0,
        rank: 'D',
        multiplier: 1.0
      });
      this.soundManager.setBgmMode('ambient');
    }, 2500);
  }

  private calculateRank(count: number): 'D' | 'C' | 'B' | 'A' | 'S' | 'SSS' {
    if (count >= 30) return 'SSS';
    if (count >= 20) return 'S';
    if (count >= 14) return 'A';
    if (count >= 8) return 'B';
    if (count >= 4) return 'C';
    return 'D';
  }
}

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
import { Weapon3D } from './Weapon3D';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { GameBridge } from '../GameBridge';
import { SoundManager } from '../audio/SoundManager';
import { loadProgress, saveProgress } from '../../utils/storage';
import { ICharacterVisual, PlayerAnimState } from './ICharacterVisual';
import { ProceduralCharacterVisual } from './ProceduralCharacterVisual';
import { CharacterVisualLoader } from './CharacterVisualLoader';

export type { PlayerAnimState };

export class Player3D {
  public scene: Scene;
  public rootMesh: Mesh;
  public camera: ThirdPersonCamera;
  public weapon: Weapon3D;
  public visual!: ICharacterVisual;

  // Stats
  public hp = 120;
  public maxHp = 120;
  public stamina = 100;
  public maxStamina = 100;
  public ultimate = 100;
  public maxUltimate = 100;

  // Movement parameters
  public baseSpeed = 6.2;
  public currentVelocity = new Vector3(0, 0, 0);
  public currentHeading = 0; // Rotation angle in radians
  public isGrounded = true;
  private verticalVelocity = 0;
  private gravity = -26.0;
  private jumpPower = 9.2;

  // States
  public animState: PlayerAnimState = 'idle';
  public isInvulnerable = false;
  public isDodging = false;
  public isSprinting = false;
  public isAttacking = false;
  public isChargingHeavy = false;
  public isDead = false;
  /** Used only for short real-time boss reveals; normal control is restored automatically. */
  public controlsLocked = false;
  public comboIndex = 0;
  public onAttackHitCheck: ((isHeavy: boolean, damage: number) => void) | null = null;
  public onWaveActivate: (() => void) | null = null;
  public onUltimateActivate: (() => void) | null = null;
  private hasCheckedHitThisAttack = false;

  // Timers
  private stateTimer = 0;
  private comboResetTimer = 0;
  private sheathTimer = 0;
  private stridePhase = 0;
  private idleTime = 0;
  private shiftPressedAt = 0;
  private lastSafeGroundedPosition = new Vector3(0, 0, -5);
  private hasAppliedAttackStep = false;

  // Abilities
  public waveAbilityUnlocked = false;
  public ultimateUnlocked = false;
  public abilityCooldown = 0;
  public maxAbilityCooldown = 6000;

  // Articulated Skeleton Nodes
  public hipsNode!: TransformNode;
  public spineNode!: TransformNode;
  public chestNode!: TransformNode;
  public headNode!: TransformNode;
  public leftShoulderNode!: TransformNode;
  public leftElbowNode!: TransformNode;
  public leftHandNode!: TransformNode;
  public rightShoulderNode!: TransformNode;
  public rightElbowNode!: TransformNode;
  public rightHandNode!: TransformNode;
  public sheathMountNode!: TransformNode;
  public leftHipNode!: TransformNode;
  public leftKneeNode!: TransformNode;
  public leftFootNode!: TransformNode;
  public rightHipNode!: TransformNode;
  public rightKneeNode!: TransformNode;
  public rightFootNode!: TransformNode;

  public visibleMeshes: Mesh[] = [];
  public coatTails: Mesh[] = [];
  private soundManager: SoundManager;
  private inputKeys: { [key: string]: boolean } = {};

  constructor(scene: Scene, camera: ThirdPersonCamera, spawnPos: Vector3) {
    this.scene = scene;
    this.camera = camera;
    this.soundManager = SoundManager.getInstance();

    const progress = loadProgress();
    this.waveAbilityUnlocked = true;
    this.ultimateUnlocked = true;

    // 1. Root Collider Mesh (Invisible physical entity)
    this.rootMesh = MeshBuilder.CreateCapsule('playerCollider', {
      radius: 0.42,
      height: 1.85,
      tessellation: 16
    }, scene);
    this.rootMesh.position = spawnPos.clone();
    this.rootMesh.checkCollisions = true;
    this.rootMesh.ellipsoid = new Vector3(0.42, 0.92, 0.42);
    this.rootMesh.ellipsoidOffset = new Vector3(0, 0.92, 0);
    this.rootMesh.visibility = 0;
    this.lastSafeGroundedPosition.copyFrom(spawnPos);

    // 2. Instantiate Character Visual Pipeline (PBR Procedural Rig with GLB Hot-Swap)
    const procVisual = new ProceduralCharacterVisual(scene, this.rootMesh);
    this.visual = procVisual;
    this.hipsNode = procVisual.hipsNode;
    this.spineNode = procVisual.spineNode;
    this.chestNode = procVisual.chestNode;
    this.headNode = procVisual.headNode;
    this.leftShoulderNode = procVisual.leftShoulderNode;
    this.leftElbowNode = procVisual.leftElbowNode;
    this.leftHandNode = procVisual.leftHandNode;
    this.rightShoulderNode = procVisual.rightShoulderNode;
    this.rightElbowNode = procVisual.rightElbowNode;
    this.rightHandNode = procVisual.attachments.rightHandNode;
    this.sheathMountNode = procVisual.attachments.sheathMountNode;
    this.leftHipNode = procVisual.leftHipNode;
    this.leftKneeNode = procVisual.leftKneeNode;
    this.leftFootNode = procVisual.leftFootNode;
    this.rightHipNode = procVisual.rightHipNode;
    this.rightKneeNode = procVisual.rightKneeNode;
    this.rightFootNode = procVisual.rightFootNode;
    this.visibleMeshes = procVisual.visibleMeshes;
    this.coatTails = procVisual.coatTails;

    // 3. Attach Cyber-Katana to Hand and Sheath Mount
    this.weapon = new Weapon3D(scene, this.rightHandNode, this.sheathMountNode);
    this.visibleMeshes.push(
      this.weapon.bladeMesh,
      this.weapon.guardMesh,
      this.weapon.hiltMesh,
      this.weapon.sayaMesh
    );

    // Asynchronously probe for authored GLB without blocking gameplay
    CharacterVisualLoader.createPlayerVisual(scene, this.rootMesh).then(loadedVisual => {
      if (loadedVisual !== this.visual && loadedVisual.isGlbLoaded) {
        this.visual.dispose();
        this.visual = loadedVisual;
      }
    });

    // 4. Set Up User Controls
    this.initInputs();
  }

  private initInputs() {
    window.addEventListener('keydown', (e) => {
      this.inputKeys[e.key.toLowerCase()] = true;
      if (!this.isDesktopGameplayInput()) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        this.triggerJump();
      }
      if (e.key === 'Shift' && !e.repeat) this.shiftPressedAt = performance.now();
      if (e.key.toLowerCase() === 'e' && !e.repeat) this.triggerWaveAbility();
      if (e.key.toLowerCase() === 'q' && !e.repeat) this.triggerUltimate();
      if (e.key.toLowerCase() === 'f' && !e.repeat) GameBridge.emit('interact_request');
    });

    window.addEventListener('keyup', (e) => {
      this.inputKeys[e.key.toLowerCase()] = false;
      if (e.key === 'Shift' && this.isDesktopGameplayInput() && performance.now() - this.shiftPressedAt < 185) this.triggerDodge();
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.isDesktopGameplayInput()) return;
      if (e.button === 0) this.triggerLightAttack();
      if (e.button === 2) this.startChargingHeavy();
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2 && this.isDesktopGameplayInput() && this.isChargingHeavy) {
        this.releaseHeavyAttack();
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Virtual Touch Controls
    GameBridge.on('virtual_action', (action: string) => {
      if (action === 'attack') this.triggerLightAttack();
      if (action === 'heavy') this.triggerHeavyAttackInstant();
      if (action === 'dodge') this.triggerJumpOrDodge();
      if (action === 'wave') this.triggerWaveAbility();
      if (action === 'ultimate') this.triggerUltimate();
    });
  }

  private isDesktopGameplayInput() {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    return document.pointerLockElement === canvas;
  }

  public update(delta: number) {
    if (this.isDead) return;

    const dt = delta / 1000;
    this.idleTime += delta;

    // 1. Stamina & Cooldown Recovery
    if (this.stamina < this.maxStamina && this.animState !== 'run' && !this.isDodging) {
      this.stamina = Math.min(this.maxStamina, this.stamina + 22 * dt);
    }
    if (this.abilityCooldown > 0) {
      this.abilityCooldown = Math.max(0, this.abilityCooldown - delta);
    }

    // Sheath timer: return blade to scabbard if idle
    if (this.weapon.isDrawn && !this.isAttacking && !this.isChargingHeavy) {
      this.sheathTimer += delta;
      if (this.sheathTimer > 2000) {
        this.weapon.sheathWeapon();
      }
    }

    // Combo timeout
    if (this.comboIndex > 0) {
      this.comboResetTimer += delta;
      if (this.comboResetTimer > 1800) {
        this.comboIndex = 0;
      }
    }

    // 2. Physics: Ground Check & Vertical Gravity
    this.handleGravity(dt);

    // 3. Movement & Horizontal Input Handling
    this.handleMovement(dt);

    // 4. Update Skeletal Animation State Machine
    this.updateSkeletalAnimation(delta, dt);

    // 5. Publish Stats to React HUD
    GameBridge.emit('player_stats', {
      hp: this.hp,
      maxHp: this.maxHp,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      ultimate: this.ultimate,
      maxUltimate: this.maxUltimate,
      shield: 0
    });
    GameBridge.emit('ability_cooldown', { current: this.abilityCooldown, max: this.maxAbilityCooldown });
  }

  private handleGravity(dt: number) {
    const ray = new Ray(this.rootMesh.position.add(new Vector3(0, 1.2, 0)), Vector3.Down(), 4.0);
    const hit = this.scene.pickWithRay(ray, (m) => m.checkCollisions && m !== this.rootMesh);

    if (hit && hit.hit && hit.pickedPoint) {
      const targetY = hit.pickedPoint.y;
      if (targetY <= -1.5) {
        this.restoreSafeGroundedPosition();
        return;
      }
      if (this.rootMesh.position.y < targetY) {
        this.rootMesh.position.y = targetY;
        this.verticalVelocity = 0;
        this.isGrounded = true;
        this.lastSafeGroundedPosition.copyFrom(this.rootMesh.position);
      } else if (this.rootMesh.position.y <= targetY + 0.14 && this.verticalVelocity <= 0) {
        this.rootMesh.position.y = targetY;
        this.verticalVelocity = 0;
        this.lastSafeGroundedPosition.copyFrom(this.rootMesh.position);

        if (!this.isGrounded) {
          // Landing impact
          this.isGrounded = true;
          if (this.animState === 'airborne') {
            this.animState = 'land';
            this.stateTimer = 160;
            this.soundManager.playFootstep();
          }
        }
      } else {
        this.isGrounded = false;
      }
    } else {
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.verticalVelocity += this.gravity * dt;
      this.rootMesh.position.y += this.verticalVelocity * dt;
      if (this.animState !== 'attack1' && this.animState !== 'attack2' && this.animState !== 'attack3') {
        this.animState = 'airborne';
      }
    }

    if (this.rootMesh.position.y < -4.0) {
      this.restoreSafeGroundedPosition();
    }
  }

  private restoreSafeGroundedPosition() {
    this.rootMesh.position.copyFrom(this.lastSafeGroundedPosition);
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.animState = 'land';
    this.stateTimer = 120;
    this.camera.shake(0.18, 160);
  }

  private handleMovement(dt: number) {
    if (this.isDead) return;
    if (this.controlsLocked) { this.isSprinting = false; this.animState = 'idle'; return; }

    // Movement lock during heavy attack or jump start
    if (this.animState === 'jump_start' || this.isChargingHeavy) {
      return;
    }

    // Read WASD & Virtual Stick
    let inputX = 0;
    let inputZ = 0;

    if (this.inputKeys['w'] || this.inputKeys['arrowup']) inputZ += 1;
    if (this.inputKeys['s'] || this.inputKeys['arrowdown']) inputZ -= 1;
    if (this.inputKeys['a'] || this.inputKeys['arrowleft']) inputX -= 1;
    if (this.inputKeys['d'] || this.inputKeys['arrowright']) inputX += 1;

    const vInput = GameBridge.virtualInput;
    if (Math.abs(vInput.moveX) > 0.1 || Math.abs(vInput.moveY) > 0.1) {
      inputX = vInput.moveX;
      inputZ = -vInput.moveY;
    }

    const inputMag = Math.sqrt(inputX * inputX + inputZ * inputZ);
    this.isSprinting = this.inputKeys['shift'] === true && inputMag > 0.05 && !this.isAttacking && !this.isDodging && this.stamina > 0;
    this.camera.setSprinting(this.isSprinting);

    if (inputMag > 0.05 && (!this.isAttacking || !this.isGrounded)) {
      // Normalize and project relative to Camera Forward
      const normX = inputX / Math.max(1, inputMag);
      const normZ = inputZ / Math.max(1, inputMag);

      const camForward = this.camera.getForwardVector();
      const camRight = this.camera.getRightVector();

      const moveDir = camForward.scale(normZ).add(camRight.scale(normX)).normalize();

      // Smooth Slerp Heading Rotation (fluid turning without snaps)
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      let diff = targetAngle - this.currentHeading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.currentHeading += diff * Math.min(1.0, 14.0 * dt);
      this.rootMesh.rotation.y = this.currentHeading;

      // Speed calculation
      let currentSpeed = this.baseSpeed;
      if (this.isSprinting) {
        currentSpeed *= 1.48;
        this.stamina = Math.max(0, this.stamina - 16 * dt);
      }
      if (this.isDodging) currentSpeed *= 1.8;
      if (this.isAttacking) currentSpeed *= 0.3;

      const displacement = moveDir.scale(currentSpeed * dt);
      this.rootMesh.moveWithCollisions(displacement);

      if (this.isGrounded && !this.isAttacking && !this.isDodging && this.animState !== 'land') {
        this.animState = 'run';
      }
    } else {
      this.isSprinting = false;
      this.camera.setSprinting(false);
      if (this.isGrounded && !this.isAttacking && !this.isDodging && this.animState !== 'land') {
        this.animState = 'idle';
      }
    }
  }

  private updateSkeletalAnimation(delta: number, _dt: number) {
    if (this.isDead) return;

    if (this.stateTimer > 0) {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        if (this.animState === 'land' || this.animState === 'dodge' || this.animState.startsWith('attack') || this.animState === 'heavy_release') {
          this.isAttacking = false;
          this.isDodging = false;
          this.isInvulnerable = false;
          this.animState = 'idle';
          this.weapon.deactivateTrail();
        }
      }
    }

    // Resolve attack hit-checks and step movement
    if (this.animState === 'attack1') {
      const progress = 1 - this.stateTimer / 320;
      if (progress >= 0.35 && progress <= 0.65 && !this.hasCheckedHitThisAttack) {
        this.hasCheckedHitThisAttack = true;
        this.onAttackHitCheck?.(false, 28);
      }
      this.applyAttackStep(progress, 0.25);
    } else if (this.animState === 'attack2') {
      const progress = 1 - this.stateTimer / 340;
      if (progress >= 0.35 && progress <= 0.65 && !this.hasCheckedHitThisAttack) {
        this.hasCheckedHitThisAttack = true;
        this.onAttackHitCheck?.(false, 34);
      }
      this.applyAttackStep(progress, 0.25);
    } else if (this.animState === 'attack3' || this.animState === 'heavy_release') {
      const duration = this.animState === 'heavy_release' ? 460 : 440;
      const progress = 1 - this.stateTimer / duration;
      if (progress >= 0.35 && progress <= 0.65 && !this.hasCheckedHitThisAttack) {
        this.hasCheckedHitThisAttack = true;
        this.onAttackHitCheck?.(true, this.animState === 'heavy_release' ? 72 : 56);
      }
      this.applyAttackStep(progress, 0.32);
    }

    // Delegate visual articulation to the active ICharacterVisual (procedural or GLB)
    this.visual.update(delta, this.currentVelocity, this.isGrounded, this.animState, this.stateTimer);
  }

  public playSummonLanding(onComplete?: () => void) {
    this.controlsLocked = true;
    this.animState = 'summon_crouch';
    this.weapon.sheathWeapon(false);

    // 1. Hold crouch landing for 1.8s
    window.setTimeout(() => {
      if (this.isDead) return;
      this.animState = 'summon_rise';

      // 2. Rise and draw weapon with metallic sound
      window.setTimeout(() => {
        if (this.isDead) return;
        this.weapon.drawWeapon(true);

        // 3. Brief ready stance before returning to idle
        window.setTimeout(() => {
          if (this.isDead) return;
          this.animState = 'idle';
          this.controlsLocked = false;
          onComplete?.();
        }, 1200);
      }, 1400);
    }, 1800);
  }

  public playVictorySequence(onComplete?: () => void) {
    this.controlsLocked = true;
    this.animState = 'victory_flick';
    this.soundManager.playBladeFlick();

    // 1. Flick hold
    window.setTimeout(() => {
      if (this.isDead) return;
      this.animState = 'victory_sheath';

      // 2. Click sword into saya
      window.setTimeout(() => {
        if (this.isDead) return;
        this.weapon.sheathWeapon(true);
        this.animState = 'idle';

        window.setTimeout(() => {
          onComplete?.();
        }, 800);
      }, 1600);
    }, 1400);
  }

  private applyAttackStep(progress: number, distance: number) {
    if (this.hasAppliedAttackStep || progress < 0.35) return;
    this.hasAppliedAttackStep = true;
    this.rootMesh.moveWithCollisions(this.rootMesh.forward.scale(distance));
  }

  // --- Combat Action Triggers ---
  public triggerLightAttack() {
    if (this.isDead || this.isDodging || this.controlsLocked) return;

    this.sheathTimer = 0;
    this.hasCheckedHitThisAttack = false;
    this.hasAppliedAttackStep = false;
    this.weapon.drawWeapon();
    this.weapon.activateTrail();

    this.isAttacking = true;
    this.comboIndex = (this.comboIndex % 3) + 1;
    this.comboResetTimer = 0;

    if (this.comboIndex === 1) {
      this.animState = 'attack1';
      this.stateTimer = 320;
    } else if (this.comboIndex === 2) {
      this.animState = 'attack2';
      this.stateTimer = 340;
    } else {
      this.animState = 'attack3';
      this.stateTimer = 440;
    }

    this.soundManager.playSlash(this.comboIndex);
    this.camera.shake(0.12, 120);

    // Forward combat momentum step
    const forward = this.rootMesh.forward.clone().normalize();
    this.rootMesh.moveWithCollisions(forward.scale(0.85));
  }

  public startChargingHeavy() {
    if (this.isDead || this.isDodging || this.controlsLocked) return;
    this.isChargingHeavy = true;
    this.animState = 'heavy_charge';
    this.soundManager.playCharge();
  }

  public releaseHeavyAttack() {
    if (!this.isChargingHeavy) return;
    this.isChargingHeavy = false;
    this.triggerHeavyAttackInstant();
  }

  public triggerHeavyAttackInstant() {
    this.sheathTimer = 0;
    this.hasCheckedHitThisAttack = false;
    this.hasAppliedAttackStep = false;
    this.weapon.drawWeapon();
    this.weapon.activateTrail();

    this.isAttacking = true;
    this.animState = 'heavy_release';
    this.stateTimer = 460;
    this.soundManager.playHeavyRelease();
    this.camera.shake(0.35, 240);

    const forward = this.rootMesh.forward.clone().normalize();
    this.rootMesh.moveWithCollisions(forward.scale(1.8));
  }

  public triggerJump() {
    if (this.isDead || this.controlsLocked) return;
    if (this.isGrounded && this.animState !== 'jump_start' && this.animState !== 'airborne') {
      this.animState = 'jump_start';
      this.stateTimer = 110;
      window.setTimeout(() => {
        if (this.animState === 'jump_start') {
          this.isGrounded = false;
          this.verticalVelocity = this.jumpPower;
          this.animState = 'airborne';
        }
      }, 100);
    }
  }

  public triggerDodge() {
    if (this.isDead || this.isDodging || this.stamina < 25 || this.controlsLocked) return;
    this.stamina -= 25;
    this.isDodging = true;
    this.isInvulnerable = true;
    this.animState = 'dodge';
    this.stateTimer = 280;
    this.soundManager.playDodge();
    const forward = this.rootMesh.forward.clone().normalize();
    this.rootMesh.moveWithCollisions(forward.scale(2.25));
  }

  // Kept for touch controls, where the single evasive button maps to dodge.
  public triggerJumpOrDodge() { this.triggerDodge(); }

  public triggerWaveAbility() {
    if (this.isDead || this.abilityCooldown > 0) return;
    this.abilityCooldown = this.maxAbilityCooldown;
    this.triggerHeavyAttackInstant();
    this.onWaveActivate?.();
    this.soundManager.playAbilityWave();
    GameBridge.emit('toast_message', {
      title: '✦ TRANSMUTATION WAVE RELEASED',
      subtitle: 'Energy resonance cleared surrounding entities',
      type: 'info'
    });
  }

  public triggerUltimate() {
    if (this.isDead || this.ultimate < this.maxUltimate) return;
    this.ultimate = 0;
    this.triggerHeavyAttackInstant();
    this.onUltimateActivate?.();
    this.camera.shake(0.5, 450);
    this.soundManager.playUltimateFinisher();
    GameBridge.emit('player_stats', {
      hp: this.hp,
      maxHp: this.maxHp,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      ultimate: this.ultimate,
      maxUltimate: this.maxUltimate,
      shield: 0
    });
    GameBridge.emit('toast_message', {
      title: '✦ CELESTIAL RESONANCE UNLEASHED',
      subtitle: 'Maximum harmonic frequency activated',
      type: 'info'
    });
  }

  public takeDamage(amount: number) {
    if (this.isDead || this.isInvulnerable) return;

    this.hp = Math.max(0, this.hp - amount);
    this.soundManager.playHit(false);
    this.camera.shake(0.28, 220);

    if (this.hp <= 0) {
      this.isDead = true;
      this.animState = 'death';
      GameBridge.emit('player_death');
    }
  }

  public unlockWaveAbility() {
    this.waveAbilityUnlocked = true;
  }

  public unlockUltimate() {
    this.ultimateUnlocked = true;
    const progress = loadProgress();
    saveProgress({ ...progress, unlockedUltimate: true });
  }

  public addUltimateCharge(amount: number) {
    this.ultimate = Math.min(this.maxUltimate, this.ultimate + amount);
  }

  public restart() {
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.isDead = false;
    this.isAttacking = false;
    this.isDodging = false;
    this.animState = 'idle';
    this.weapon.sheathWeapon();
  }
}

import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  Quaternion,
  SceneLoader
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { Weapon3D } from './Weapon3D';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { GameBridge } from '../GameBridge';
import { SoundManager } from '../audio/SoundManager';
import { loadProgress, saveProgress } from '../../utils/storage';

export type PlayerAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sprint'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'heavy_charge'
  | 'dodge'
  | 'hurt'
  | 'death';

export class Player3D {
  public scene: Scene;
  public rootMesh: Mesh;
  public camera: ThirdPersonCamera;
  public weapon: Weapon3D;

  // Stats
  public hp = 120;
  public maxHp = 120;
  public stamina = 100;
  public maxStamina = 100;
  public ultimate = 0;
  public maxUltimate = 100;

  // Movement parameters
  public speed = 0;
  public baseSpeed = 5.2;
  public sprintSpeed = 8.5;
  public acceleration = 18.0;
  public deceleration = 24.0;
  public currentVelocity = new Vector3(0, 0, 0);

  // States
  public animState: PlayerAnimState = 'idle';
  public isInvulnerable = false;
  public isDodging = false;
  public isAttacking = false;
  public isChargingHeavy = false;
  public isDead = false;
  public comboIndex = 0;
  private comboResetTimer = 0;
  private attackTimer = 0;
  private chargeTimer = 0;

  // Unlocks
  public waveAbilityUnlocked = false;
  public ultimateUnlocked = false;
  public abilityCooldown = 0;
  public maxAbilityCooldown = 6000;

  // 3D Joint Hierarchy for Skeletal Animation
  public hipsNode: TransformNode;
  public spineNode: TransformNode;
  public chestNode: TransformNode;
  public headNode: TransformNode;
  public leftArmNode: TransformNode;
  public rightArmNode: TransformNode;
  public leftLegNode: TransformNode;
  public rightLegNode: TransformNode;
  public visibleMeshes: Mesh[] = [];

  // Materials
  private cyberArmorMat: StandardMaterial;
  private skinMat: StandardMaterial;
  private hairMat: StandardMaterial;

  // Audio
  private soundManager: SoundManager;

  // Input states
  private inputKeys: { [key: string]: boolean } = {};
  private animTimer = 0;

  constructor(scene: Scene, camera: ThirdPersonCamera, spawnPos: Vector3) {
    this.scene = scene;
    this.camera = camera;
    this.soundManager = SoundManager.getInstance();

    const progress = loadProgress();
    this.waveAbilityUnlocked = progress.unlockedWaveAbility;
    this.ultimateUnlocked = progress.unlockedUltimate;

    // 1. Root Collider Mesh (Invisible capsule for movement physics)
    this.rootMesh = MeshBuilder.CreateCapsule('playerCollider', {
      radius: 0.45,
      height: 1.85,
      tessellation: 16
    }, scene);
    this.rootMesh.position = spawnPos.clone();
    this.rootMesh.checkCollisions = true;
    this.rootMesh.ellipsoid = new Vector3(0.45, 0.92, 0.45);
    this.rootMesh.ellipsoidOffset = new Vector3(0, 0.92, 0);
    this.rootMesh.visibility = 0; // Hide collision capsule

    // 2. Materials
    this.cyberArmorMat = new StandardMaterial('cyberHanfuMat', scene);
    this.cyberArmorMat.diffuseColor = new Color3(0.06, 0.10, 0.16); // Deep obsidian
    this.cyberArmorMat.emissiveColor = new Color3(0.0, 0.35, 0.45); // Ancient jade-circuit glow
    this.cyberArmorMat.specularColor = new Color3(0.4, 0.8, 1.0);

    this.skinMat = new StandardMaterial('skinMat', scene);
    this.skinMat.diffuseColor = new Color3(0.92, 0.84, 0.78); // Porcelain anime skin

    this.hairMat = new StandardMaterial('hairMat', scene);
    this.hairMat.diffuseColor = new Color3(0.05, 0.08, 0.14); // Raven blue hair

    // 3. Build 3D Skinned Anatomy Hierarchy
    this.hipsNode = new TransformNode('hips', scene);
    this.hipsNode.parent = this.rootMesh;
    this.hipsNode.position.y = 0.92;

    // Torso / Hanfu robe
    const torsoMesh = MeshBuilder.CreateCylinder('torso', {
      height: 0.65,
      diameterTop: 0.38,
      diameterBottom: 0.32
    }, scene);
    torsoMesh.parent = this.hipsNode;
    torsoMesh.position.y = 0.25;
    torsoMesh.material = this.cyberArmorMat;

    this.spineNode = new TransformNode('spine', scene);
    this.spineNode.parent = this.hipsNode;
    this.spineNode.position.y = 0.55;

    this.chestNode = new TransformNode('chest', scene);
    this.chestNode.parent = this.spineNode;
    this.chestNode.position.y = 0.15;

    // Head & Hair
    this.headNode = new TransformNode('head', scene);
    this.headNode.parent = this.chestNode;
    this.headNode.position.y = 0.28;

    const headMesh = MeshBuilder.CreateSphere('headMesh', { diameter: 0.26 }, scene);
    headMesh.parent = this.headNode;
    headMesh.material = this.skinMat;

    // Anime styled hair buns & hairpin
    const hairMesh = MeshBuilder.CreateSphere('hairMesh', { diameter: 0.29 }, scene);
    hairMesh.parent = this.headNode;
    hairMesh.position.y = 0.04;
    hairMesh.position.z = -0.04;
    hairMesh.material = this.hairMat;

    const hairPin = MeshBuilder.CreateCylinder('hairPin', {
      height: 0.35,
      diameter: 0.018
    }, scene);
    hairPin.parent = this.headNode;
    hairPin.position.y = 0.06;
    hairPin.rotation.z = Math.PI / 2;
    const goldMat = new StandardMaterial('pinGold', scene);
    goldMat.emissiveColor = new Color3(0.8, 0.65, 0.15);
    hairPin.material = goldMat;

    // Arms
    this.leftArmNode = new TransformNode('leftArm', scene);
    this.leftArmNode.parent = this.chestNode;
    this.leftArmNode.position = new Vector3(-0.25, 0.05, 0);

    const leftArmMesh = MeshBuilder.CreateCylinder('leftArmMesh', { height: 0.55, diameter: 0.11 }, scene);
    leftArmMesh.parent = this.leftArmNode;
    leftArmMesh.position.y = -0.25;
    leftArmMesh.material = this.cyberArmorMat;

    this.rightArmNode = new TransformNode('rightArm', scene);
    this.rightArmNode.parent = this.chestNode;
    this.rightArmNode.position = new Vector3(0.25, 0.05, 0);

    const rightArmMesh = MeshBuilder.CreateCylinder('rightArmMesh', { height: 0.55, diameter: 0.11 }, scene);
    rightArmMesh.parent = this.rightArmNode;
    rightArmMesh.position.y = -0.25;
    rightArmMesh.material = this.cyberArmorMat;

    // Legs
    this.leftLegNode = new TransformNode('leftLeg', scene);
    this.leftLegNode.parent = this.hipsNode;
    this.leftLegNode.position = new Vector3(-0.14, -0.1, 0);

    const leftLegMesh = MeshBuilder.CreateCylinder('leftLegMesh', { height: 0.75, diameter: 0.14 }, scene);
    leftLegMesh.parent = this.leftLegNode;
    leftLegMesh.position.y = -0.35;
    leftLegMesh.material = this.cyberArmorMat;

    this.rightLegNode = new TransformNode('rightLeg', scene);
    this.rightLegNode.parent = this.hipsNode;
    this.rightLegNode.position = new Vector3(0.14, -0.1, 0);

    const rightLegMesh = MeshBuilder.CreateCylinder('rightLegMesh', { height: 0.75, diameter: 0.14 }, scene);
    rightLegMesh.parent = this.rightLegNode;
    rightLegMesh.position.y = -0.35;
    rightLegMesh.material = this.cyberArmorMat;

    this.visibleMeshes.push(
      torsoMesh,
      headMesh,
      hairMesh,
      hairPin,
      leftArmMesh,
      rightArmMesh,
      leftLegMesh,
      rightLegMesh
    );

    // 4. Attach 3D Signature Weapon to Right Arm Node
    this.weapon = new Weapon3D(scene, this.rightArmNode);

    // 5. Asynchronously load real 3D GLB Character Model
    this.loadGlbModel();

    // 6. Input Listeners
    this.initInputs();
  }

  public glbRoot: TransformNode | null = null;
  public glbMeshes: Mesh[] = [];

  private async loadGlbModel() {
    try {
      const result = await SceneLoader.ImportMeshAsync('', '/assets/characters/protagonist/', 'hero.glb', this.scene);
      if (result && result.meshes.length > 0) {
        const root = result.meshes[0];
        this.glbRoot = root;
        root.parent = this.rootMesh;
        root.position = new Vector3(0, 0, 0);

        // Normalize scaling to match 1.85m height
        const hierarchyBounds = root.getHierarchyBoundingVectors();
        const height = hierarchyBounds.max.y - hierarchyBounds.min.y;
        if (height > 0.01) {
          const scaleFactor = 1.85 / height;
          root.scaling.scaleInPlace(scaleFactor);
        }

        // Hide procedural fallback meshes once real 3D model is loaded
        this.visibleMeshes.forEach(m => {
          m.setEnabled(false);
        });

        // Store and configure loaded meshes
        result.meshes.forEach(mesh => {
          if (mesh instanceof Mesh) {
            this.glbMeshes.push(mesh);
            mesh.checkCollisions = false;
          }
        });

        // If animation groups exist, start idle animation
        if (result.animationGroups && result.animationGroups.length > 0) {
          const idleAnim = result.animationGroups.find(a => /idle/i.test(a.name)) || result.animationGroups[0];
          idleAnim.start(true);
        }
      }
    } catch (err) {
      console.warn('[Player3D] Falling back to procedural 3D anime character rig:', err);
    }
  }

  private initInputs() {
    window.addEventListener('keydown', (e) => {
      this.inputKeys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'j') this.triggerLightAttack();
      if (e.key.toLowerCase() === 'k') this.startChargingHeavy();
      if (e.code === 'Space') this.triggerDodge();
      if (e.key.toLowerCase() === 'e') this.triggerWaveAbility();
      if (e.key.toLowerCase() === 'q') this.triggerUltimate();
    });

    window.addEventListener('keyup', (e) => {
      this.inputKeys[e.key.toLowerCase()] = false;
      if (e.key.toLowerCase() === 'k' && this.isChargingHeavy) {
        this.releaseHeavyAttack();
      }
    });

    // Mouse combat triggers
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.triggerLightAttack();
      if (e.button === 2) this.startChargingHeavy();
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2 && this.isChargingHeavy) {
        this.releaseHeavyAttack();
      }
    });

    // Virtual mobile controls synchronization
    GameBridge.on('virtual_input_change', (input: typeof GameBridge.virtualInput) => {
      if (input.lightAttack) this.triggerLightAttack();
      if (input.heavyAttack && !this.isChargingHeavy) this.startChargingHeavy();
      if (!input.heavyAttack && this.isChargingHeavy) this.releaseHeavyAttack();
      if (input.dodge) this.triggerDodge();
      if (input.ability) this.triggerWaveAbility();
      if (input.ultimate) this.triggerUltimate();
    });
  }

  public update(delta: number) {
    if (this.isDead) return;

    this.animTimer += delta * 0.001;
    this.handleMovement(delta);
    this.handleCombatTimers(delta);
    this.updateSkeletalAnimation(delta);
    this.emitStats();
  }

  private handleMovement(delta: number) {
    if (this.isAttacking || this.isDodging) return;

    let moveX = 0;
    let moveZ = 0;

    // Desktop WASD
    if (this.inputKeys['w'] || this.inputKeys['arrowup']) moveZ += 1;
    if (this.inputKeys['s'] || this.inputKeys['arrowdown']) moveZ -= 1;
    if (this.inputKeys['a'] || this.inputKeys['arrowleft']) moveX -= 1;
    if (this.inputKeys['d'] || this.inputKeys['arrowright']) moveX += 1;

    // Mobile Virtual Joystick
    if (GameBridge.virtualInput.moveX !== 0 || GameBridge.virtualInput.moveY !== 0) {
      moveX = GameBridge.virtualInput.moveX;
      moveZ = -GameBridge.virtualInput.moveY;
    }

    const isMoving = moveX !== 0 || moveZ !== 0;
    const isSprinting = this.inputKeys['shift'] && isMoving && this.stamina > 10;

    if (isSprinting) {
      this.stamina = Math.max(0, this.stamina - delta * 0.02);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 0.035);
    }

    const targetSpeed = isMoving ? (isSprinting ? this.sprintSpeed : this.baseSpeed) : 0;
    const accelRate = isMoving ? this.acceleration : this.deceleration;
    this.speed = this.speed + (targetSpeed - this.speed) * Math.min(1, (accelRate * delta) / 1000);

    if (isMoving) {
      // Camera-relative direction calculation
      const camForward = this.camera.getForwardVector();
      const camRight = this.camera.getRightVector();

      const moveDir = camForward.scale(moveZ).add(camRight.scale(moveX)).normalize();

      // Smooth rotation toward move direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      const currentAngle = this.rootMesh.rotation.y;
      let diff = targetAngle - currentAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.rootMesh.rotation.y += diff * 0.22;

      // Apply movement velocity
      const moveStep = moveDir.scale((this.speed * delta) / 1000);
      moveStep.y = -9.81 * (delta / 1000) * 0.5; // Gravity
      this.rootMesh.moveWithCollisions(moveStep);

      this.animState = isSprinting ? 'sprint' : (this.speed > 3.0 ? 'run' : 'walk');

      if (Math.random() < 0.035) {
        this.soundManager.playFootstep();
      }
    } else {
      if (!this.isChargingHeavy) {
        this.animState = 'idle';
      }
      // Apply gravity when idle
      this.rootMesh.moveWithCollisions(new Vector3(0, -9.81 * (delta / 1000) * 0.5, 0));
    }
  }

  private handleCombatTimers(delta: number) {
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= delta;
      if (this.comboResetTimer <= 0) {
        this.comboIndex = 0;
      }
    }

    if (this.attackTimer > 0) {
      this.attackTimer -= delta;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.weapon.deactivateTrail();
        this.animState = 'idle';
      }
    }

    if (this.abilityCooldown > 0) {
      this.abilityCooldown = Math.max(0, this.abilityCooldown - delta);
      GameBridge.emit('ability_cooldown', {
        abilityId: 'wave',
        current: this.abilityCooldown,
        max: this.maxAbilityCooldown
      });
    }
  }

  // Skeletal Animation Update
  private updateSkeletalAnimation(delta: number) {
    const t = this.animTimer * 10;

    if (this.animState === 'idle') {
      // Gentle breathing & robe swaying
      this.hipsNode.position.y = 0.92 + Math.sin(t * 0.3) * 0.015;
      this.leftArmNode.rotation.x = Math.sin(t * 0.3) * 0.08;
      this.rightArmNode.rotation.x = -Math.sin(t * 0.3) * 0.08;
      this.leftLegNode.rotation.x = 0;
      this.rightLegNode.rotation.x = 0;
    } else if (this.animState === 'walk' || this.animState === 'run' || this.animState === 'sprint') {
      // Natural leg strides and arm swinging
      const strideFreq = this.animState === 'sprint' ? 1.8 : 1.2;
      const strideAmp = this.animState === 'sprint' ? 0.75 : (this.animState === 'run' ? 0.55 : 0.35);

      this.leftLegNode.rotation.x = Math.sin(t * strideFreq) * strideAmp;
      this.rightLegNode.rotation.x = -Math.sin(t * strideFreq) * strideAmp;

      this.leftArmNode.rotation.x = -Math.sin(t * strideFreq) * strideAmp * 0.8;
      this.rightArmNode.rotation.x = Math.sin(t * strideFreq) * strideAmp * 0.8;

      this.spineNode.rotation.y = Math.sin(t * strideFreq) * 0.1;
      this.chestNode.rotation.x = this.animState === 'sprint' ? 0.18 : 0.08; // Torso lean
    } else if (this.animState === 'attack1') {
      // Horizontal sweeping slash
      this.rightArmNode.rotation.x = -Math.PI / 2.2;
      this.rightArmNode.rotation.y = Math.sin(this.attackTimer * 0.03) * 1.6;
      this.spineNode.rotation.y = -0.4;
    } else if (this.animState === 'attack2') {
      // High diagonal cross slash
      this.rightArmNode.rotation.x = -Math.PI / 1.8;
      this.rightArmNode.rotation.z = Math.cos(this.attackTimer * 0.03) * 1.4;
      this.spineNode.rotation.y = 0.35;
    } else if (this.animState === 'attack3') {
      // Piercing forward thrust
      this.rightArmNode.rotation.x = -Math.PI / 2;
      this.rightArmNode.rotation.y = 0;
      this.chestNode.rotation.x = 0.25;
    } else if (this.animState === 'heavy_charge') {
      // Two-handed overhead stance with blade vibration
      this.rightArmNode.rotation.x = -Math.PI * 0.8;
      this.rightArmNode.rotation.z = -0.2;
      this.hipsNode.position.y = 0.82; // Slight knee crouch
    } else if (this.animState === 'dodge') {
      this.chestNode.rotation.x = 0.5;
    }
  }

  // --- LIGHT ATTACK COMBO ---
  public triggerLightAttack() {
    if (this.isAttacking || this.isDodging || this.isDead) return;

    this.isAttacking = true;
    this.comboIndex = (this.comboIndex % 3) + 1;
    this.animState = `attack${this.comboIndex}` as PlayerAnimState;
    this.attackTimer = 280;
    this.comboResetTimer = 1400;

    this.soundManager.playSlash(this.comboIndex - 1);
    this.weapon.activateTrail();

    // Short forward lunge
    const forward = this.getForwardVector();
    this.rootMesh.moveWithCollisions(forward.scale(0.8));

    // Dispatch 3D combat hit check event
    (this.scene as any).combatManager?.resolvePlayerMeleeAttack({
      origin: this.rootMesh.position,
      direction: forward,
      range: 2.8,
      damage: 18 + this.comboIndex * 8,
      poiseDamage: 20 + this.comboIndex * 6,
      isHeavy: false
    });
  }

  // --- CHARGED HEAVY ATTACK ---
  public startChargingHeavy() {
    if (this.isAttacking || this.isDodging || this.isDead) return;
    this.isChargingHeavy = true;
    this.animState = 'heavy_charge';
    this.chargeTimer = 0;
    this.soundManager.playCharge();
  }

  public releaseHeavyAttack() {
    if (!this.isChargingHeavy || this.isDead) return;
    this.isChargingHeavy = false;

    this.isAttacking = true;
    this.animState = 'attack3';
    this.attackTimer = 420;

    this.soundManager.playHeavyRelease();
    this.camera.shake(0.35, 260);
    this.weapon.activateTrail();

    const forward = this.getForwardVector();
    this.rootMesh.moveWithCollisions(forward.scale(1.4));

    (this.scene as any).combatManager?.resolvePlayerMeleeAttack({
      origin: this.rootMesh.position,
      direction: forward,
      range: 4.2,
      damage: 65,
      poiseDamage: 80,
      isHeavy: true
    });
  }

  // --- DODGE / DASH ---
  public triggerDodge() {
    if (this.isDodging || this.stamina < 22 || this.isDead) return;

    this.isDodging = true;
    this.isInvulnerable = true;
    this.stamina -= 22;
    this.animState = 'dodge';
    this.soundManager.playDodge();

    const forward = this.getForwardVector();
    const dashDistance = 5.2;
    this.rootMesh.moveWithCollisions(forward.scale(dashDistance));

    window.setTimeout(() => {
      this.isDodging = false;
      this.isInvulnerable = false;
      this.animState = 'idle';
    }, 280);
  }

  // --- TRANSMUTATION WAVE (E) ---
  public triggerWaveAbility() {
    if (!this.waveAbilityUnlocked || this.abilityCooldown > 0 || this.isDead) return;

    this.abilityCooldown = this.maxAbilityCooldown;
    this.soundManager.playAbilityWave();
    this.camera.shake(0.4, 250);

    const forward = this.getForwardVector();
    (this.scene as any).combatManager?.spawnTransmutationWave(this.rootMesh.position, forward);
  }

  // --- CELESTIAL RESONANCE ULTIMATE (Q) ---
  public triggerUltimate() {
    if (!this.ultimateUnlocked || this.ultimate < this.maxUltimate || this.isDead) return;

    this.ultimate = 0;
    this.isInvulnerable = true;
    this.soundManager.playUltimateFinisher();
    this.camera.shake(0.65, 800);

    (this.scene as any).combatManager?.triggerCelestialResonance(this.rootMesh.position);

    window.setTimeout(() => {
      this.isInvulnerable = false;
    }, 1200);
  }

  public addUltimateCharge(amount: number) {
    if (!this.ultimateUnlocked) return;
    this.ultimate = Math.min(this.maxUltimate, this.ultimate + amount);
  }

  public takeDamage(amount: number) {
    if (this.isInvulnerable || this.isDead) return;

    this.hp = Math.max(0, this.hp - amount);
    this.soundManager.playHit(false);
    this.camera.shake(0.3, 200);
    this.animState = 'hurt';

    window.setTimeout(() => {
      if (!this.isDead && this.animState === 'hurt') {
        this.animState = 'idle';
      }
    }, 200);

    if (this.hp <= 0) {
      this.die();
    }
  }

  public die() {
    this.isDead = true;
    this.animState = 'death';
    GameBridge.emit('player_death');
  }

  public unlockWaveAbility() {
    this.waveAbilityUnlocked = true;
    const p = loadProgress();
    p.unlockedWaveAbility = true;
    saveProgress(p);
  }

  public unlockUltimate() {
    this.ultimateUnlocked = true;
    const p = loadProgress();
    p.unlockedUltimate = true;
    saveProgress(p);
  }

  public getForwardVector(): Vector3 {
    const angle = this.rootMesh.rotation.y;
    return new Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();
  }

  private emitStats() {
    GameBridge.emit('player_stats', {
      hp: this.hp,
      maxHp: this.maxHp,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      ultimate: this.ultimate,
      maxUltimate: this.maxUltimate,
      shield: 0
    });
  }

  public dispose() {
    this.weapon.dispose();
    this.rootMesh.dispose();
  }
}

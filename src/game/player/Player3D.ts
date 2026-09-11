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

export type PlayerAnimState =
  | 'idle'
  | 'run'
  | 'jump_start'
  | 'airborne'
  | 'land'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'heavy_charge'
  | 'heavy_release'
  | 'dodge'
  | 'hurt'
  | 'death'
  | 'summon_crouch'
  | 'summon_rise'
  | 'victory_flick'
  | 'victory_sheath';

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

    // 2. Build Sculpted Cyber-Fantasy Warrior Anatomy
    this.buildCharacterHierarchy(scene);

    // 3. Attach Cyber-Katana to Hand and Sheath Mount
    this.weapon = new Weapon3D(scene, this.rightHandNode, this.sheathMountNode);
    this.visibleMeshes.push(
      this.weapon.bladeMesh,
      this.weapon.guardMesh,
      this.weapon.hiltMesh,
      this.weapon.sayaMesh
    );

    // 4. Set Up User Controls
    this.initInputs();
  }

  private buildCharacterHierarchy(scene: Scene) {
    // --- Premium Materials ---
    // Obsidian Carbon Armor
    const armorMat = new StandardMaterial('warriorArmorMat', scene);
    armorMat.diffuseColor = Color3.FromHexString('#0f172a');
    armorMat.specularColor = new Color3(0.4, 0.6, 0.8);
    armorMat.specularPower = 32;

    // Restrained jade embroidery and ancient circuit trim
    const circuitMat = new StandardMaterial('warriorCircuitMat', scene);
    circuitMat.diffuseColor = new Color3(0.01, 0.16, 0.20);
    circuitMat.emissiveColor = Color3.FromHexString('#00f0ff');
    circuitMat.specularColor = new Color3(0.55, 0.72, 0.54);

    // Imperial Gold Accents
    const goldMat = new StandardMaterial('warriorGoldMat', scene);
    goldMat.diffuseColor = new Color3(0.02, 0.22, 0.28);
    goldMat.emissiveColor = new Color3(0, 0.56, 0.62);

    // Porcelain Anime Skin
    const skinMat = new StandardMaterial('warriorSkinMat', scene);
    skinMat.diffuseColor = new Color3(0.94, 0.87, 0.82);

    // Raven Black Hair
    const hairMat = new StandardMaterial('warriorHairMat', scene);
    hairMat.diffuseColor = new Color3(0.04, 0.05, 0.08);

    // --- Joint Hierarchy ---
    // Hips / Pelvis
    this.hipsNode = new TransformNode('hips', scene);
    this.hipsNode.parent = this.rootMesh;
    this.hipsNode.position.y = 0.92;

    const pelvisMesh = MeshBuilder.CreateBox('pelvis', { width: 0.36, height: 0.22, depth: 0.26 }, scene);
    pelvisMesh.parent = this.hipsNode;
    pelvisMesh.material = armorMat;
    this.visibleMeshes.push(pelvisMesh);

    // Gold waist sash
    const sash = MeshBuilder.CreateBox('sash', { width: 0.38, height: 0.08, depth: 0.28 }, scene);
    sash.parent = this.hipsNode;
    sash.position.y = 0.08;
    sash.material = goldMat;
    this.visibleMeshes.push(sash);

    // Katana Sheath Mount (Left Hip - angled naturally)
    this.sheathMountNode = new TransformNode('sheathMount', scene);
    this.sheathMountNode.parent = this.hipsNode;
    this.sheathMountNode.position = new Vector3(-0.22, 0.02, 0.02);
    this.sheathMountNode.rotation = new Vector3(0.38, 0.15, 0.22);

    // Spine & Chest
    this.spineNode = new TransformNode('spine', scene);
    this.spineNode.parent = this.hipsNode;
    this.spineNode.position.y = 0.12;

    this.chestNode = new TransformNode('chest', scene);
    this.chestNode.parent = this.spineNode;
    this.chestNode.position.y = 0.22;

    // Sculpted Cuirass (Torso)
    const cuirass = MeshBuilder.CreateCylinder('cuirass', {
      height: 0.44,
      diameterTop: 0.46,
      diameterBottom: 0.32,
      tessellation: 16
    }, scene);
    cuirass.parent = this.chestNode;
    cuirass.position.y = 0.14;
    cuirass.material = armorMat;
    this.visibleMeshes.push(cuirass);

    // Glowing chest circuit core
    const chestCore = MeshBuilder.CreateBox('chestCore', { width: 0.08, height: 0.18, depth: 0.04 }, scene);
    chestCore.parent = this.chestNode;
    chestCore.position = new Vector3(0, 0.14, 0.18);
    chestCore.material = circuitMat;
    this.visibleMeshes.push(chestCore);

    // Head & Hair
    this.headNode = new TransformNode('head', scene);
    this.headNode.parent = this.chestNode;
    this.headNode.position.y = 0.42;

    const headMesh = MeshBuilder.CreateSphere('headMesh', { diameter: 0.24, segments: 16 }, scene);
    headMesh.parent = this.headNode;
    headMesh.material = skinMat;
    this.visibleMeshes.push(headMesh);

    // Cyan glowing ocular brow/visor
    const visor = MeshBuilder.CreateBox('ocularVisor', { width: 0.22, height: 0.04, depth: 0.12 }, scene);
    visor.parent = this.headNode;
    visor.position = new Vector3(0, 0.04, 0.09);
    visor.material = circuitMat;
    this.visibleMeshes.push(visor);

    // Anime styled dual buns, high ponytail & crossed golden hairpins
    const hairTop = MeshBuilder.CreateSphere('hairTop', { diameter: 0.27, segments: 16 }, scene);
    hairTop.parent = this.headNode;
    hairTop.position = new Vector3(0, 0.07, -0.04);
    hairTop.material = hairMat;
    this.visibleMeshes.push(hairTop);

    // Left and Right coiled buns
    const hairBunL = MeshBuilder.CreateSphere('hairBunL', { diameter: 0.13, segments: 12 }, scene);
    hairBunL.parent = this.headNode;
    hairBunL.position = new Vector3(-0.12, 0.14, -0.08);
    hairBunL.material = hairMat;
    this.visibleMeshes.push(hairBunL);

    const hairBunR = MeshBuilder.CreateSphere('hairBunR', { diameter: 0.13, segments: 12 }, scene);
    hairBunR.parent = this.headNode;
    hairBunR.position = new Vector3(0.12, 0.14, -0.08);
    hairBunR.material = hairMat;
    this.visibleMeshes.push(hairBunR);

    // Flowing trailing ponytail behind neck
    const ponytail = MeshBuilder.CreateCylinder('hairPonytail', { height: 0.38, diameterTop: 0.08, diameterBottom: 0.02, tessellation: 12 }, scene);
    ponytail.parent = this.headNode;
    ponytail.position = new Vector3(0, -0.08, -0.16);
    ponytail.rotation.x = -0.32;
    ponytail.material = hairMat;
    this.visibleMeshes.push(ponytail);

    // Crossed Imperial Gold Hairpins
    const hairPin1 = MeshBuilder.CreateCylinder('hairPin1', { height: 0.34, diameter: 0.016 }, scene);
    hairPin1.parent = this.headNode;
    hairPin1.position = new Vector3(0, 0.17, -0.08);
    hairPin1.rotation = new Vector3(0.1, 0, Math.PI / 3.2);
    hairPin1.material = goldMat;
    this.visibleMeshes.push(hairPin1);

    const hairPin2 = MeshBuilder.CreateCylinder('hairPin2', { height: 0.34, diameter: 0.016 }, scene);
    hairPin2.parent = this.headNode;
    hairPin2.position = new Vector3(0, 0.17, -0.08);
    hairPin2.rotation = new Vector3(-0.1, 0, -Math.PI / 3.2);
    hairPin2.material = goldMat;
    this.visibleMeshes.push(hairPin2);

    // Glowing Jade Hairpin Orbs
    [-1, 1].forEach(side => {
      const pinOrb = MeshBuilder.CreateSphere(`hairPinOrb_${side}`, { diameter: 0.04 }, scene);
      pinOrb.parent = this.headNode;
      pinOrb.position = new Vector3(side * 0.16, 0.24, -0.08);
      pinOrb.material = circuitMat;
      this.visibleMeshes.push(pinOrb);
    });

    // --- Arms (Left & Right) ---
    // Left Arm
    this.leftShoulderNode = new TransformNode('leftShoulder', scene);
    this.leftShoulderNode.parent = this.chestNode;
    this.leftShoulderNode.position = new Vector3(-0.28, 0.24, 0);

    const leftPauldron = MeshBuilder.CreateBox('leftPauldron', { width: 0.16, height: 0.12, depth: 0.16 }, scene);
    leftPauldron.parent = this.leftShoulderNode;
    leftPauldron.position.y = 0.04;
    leftPauldron.material = goldMat;
    this.visibleMeshes.push(leftPauldron);

    const leftUpperArm = MeshBuilder.CreateCylinder('leftUpperArm', { height: 0.28, diameter: 0.1 }, scene);
    leftUpperArm.parent = this.leftShoulderNode;
    leftUpperArm.position.y = -0.14;
    leftUpperArm.material = armorMat;
    this.visibleMeshes.push(leftUpperArm);

    this.leftElbowNode = new TransformNode('leftElbow', scene);
    this.leftElbowNode.parent = this.leftShoulderNode;
    this.leftElbowNode.position.y = -0.28;

    const leftForearm = MeshBuilder.CreateCylinder('leftForearm', { height: 0.26, diameter: 0.09 }, scene);
    leftForearm.parent = this.leftElbowNode;
    leftForearm.position.y = -0.13;
    leftForearm.material = circuitMat;
    this.visibleMeshes.push(leftForearm);

    this.leftHandNode = new TransformNode('leftHand', scene);
    this.leftHandNode.parent = this.leftElbowNode;
    this.leftHandNode.position.y = -0.26;

    const leftHandMesh = MeshBuilder.CreateBox('leftHandMesh', { width: 0.07, height: 0.09, depth: 0.05 }, scene);
    leftHandMesh.parent = this.leftHandNode;
    leftHandMesh.material = skinMat;
    this.visibleMeshes.push(leftHandMesh);

    // Right Arm (Weapon Arm)
    this.rightShoulderNode = new TransformNode('rightShoulder', scene);
    this.rightShoulderNode.parent = this.chestNode;
    this.rightShoulderNode.position = new Vector3(0.28, 0.24, 0);

    const rightPauldron = MeshBuilder.CreateBox('rightPauldron', { width: 0.16, height: 0.12, depth: 0.16 }, scene);
    rightPauldron.parent = this.rightShoulderNode;
    rightPauldron.position.y = 0.04;
    rightPauldron.material = goldMat;
    this.visibleMeshes.push(rightPauldron);

    const rightUpperArm = MeshBuilder.CreateCylinder('rightUpperArm', { height: 0.28, diameter: 0.1 }, scene);
    rightUpperArm.parent = this.rightShoulderNode;
    rightUpperArm.position.y = -0.14;
    rightUpperArm.material = armorMat;
    this.visibleMeshes.push(rightUpperArm);

    this.rightElbowNode = new TransformNode('rightElbow', scene);
    this.rightElbowNode.parent = this.rightShoulderNode;
    this.rightElbowNode.position.y = -0.28;

    const rightForearm = MeshBuilder.CreateCylinder('rightForearm', { height: 0.26, diameter: 0.09 }, scene);
    rightForearm.parent = this.rightElbowNode;
    rightForearm.position.y = -0.13;
    rightForearm.material = circuitMat;
    this.visibleMeshes.push(rightForearm);

    this.rightHandNode = new TransformNode('rightHand', scene);
    this.rightHandNode.parent = this.rightElbowNode;
    this.rightHandNode.position.y = -0.26;

    const rightHandMesh = MeshBuilder.CreateBox('rightHandMesh', { width: 0.07, height: 0.09, depth: 0.05 }, scene);
    rightHandMesh.parent = this.rightHandNode;
    rightHandMesh.material = skinMat;
    this.visibleMeshes.push(rightHandMesh);

    // --- Legs (Left & Right) ---
    // Left Leg
    this.leftHipNode = new TransformNode('leftHip', scene);
    this.leftHipNode.parent = this.hipsNode;
    this.leftHipNode.position = new Vector3(-0.14, -0.1, 0);

    const leftThigh = MeshBuilder.CreateCylinder('leftThigh', { height: 0.42, diameter: 0.14 }, scene);
    leftThigh.parent = this.leftHipNode;
    leftThigh.position.y = -0.21;
    leftThigh.material = armorMat;
    this.visibleMeshes.push(leftThigh);

    this.leftKneeNode = new TransformNode('leftKnee', scene);
    this.leftKneeNode.parent = this.leftHipNode;
    this.leftKneeNode.position.y = -0.42;

    const leftShin = MeshBuilder.CreateCylinder('leftShin', { height: 0.42, diameter: 0.12 }, scene);
    leftShin.parent = this.leftKneeNode;
    leftShin.position.y = -0.21;
    leftShin.material = circuitMat;
    this.visibleMeshes.push(leftShin);

    this.leftFootNode = new TransformNode('leftFoot', scene);
    this.leftFootNode.parent = this.leftKneeNode;
    this.leftFootNode.position = new Vector3(0, -0.42, 0.04);

    const leftBoot = MeshBuilder.CreateBox('leftBoot', { width: 0.12, height: 0.09, depth: 0.22 }, scene);
    leftBoot.parent = this.leftFootNode;
    leftBoot.material = goldMat;
    this.visibleMeshes.push(leftBoot);

    // Right Leg
    this.rightHipNode = new TransformNode('rightHip', scene);
    this.rightHipNode.parent = this.hipsNode;
    this.rightHipNode.position = new Vector3(0.14, -0.1, 0);

    const rightThigh = MeshBuilder.CreateCylinder('rightThigh', { height: 0.42, diameter: 0.14 }, scene);
    rightThigh.parent = this.rightHipNode;
    rightThigh.position.y = -0.21;
    rightThigh.material = armorMat;
    this.visibleMeshes.push(rightThigh);

    this.rightKneeNode = new TransformNode('rightKnee', scene);
    this.rightKneeNode.parent = this.rightHipNode;
    this.rightKneeNode.position.y = -0.42;

    const rightShin = MeshBuilder.CreateCylinder('rightShin', { height: 0.42, diameter: 0.12 }, scene);
    rightShin.parent = this.rightKneeNode;
    rightShin.position.y = -0.21;
    rightShin.material = circuitMat;
    this.visibleMeshes.push(rightShin);

    this.rightFootNode = new TransformNode('rightFoot', scene);
    this.rightFootNode.parent = this.rightKneeNode;
    this.rightFootNode.position = new Vector3(0, -0.42, 0.04);

    const rightBoot = MeshBuilder.CreateBox('rightBoot', { width: 0.12, height: 0.09, depth: 0.22 }, scene);
    rightBoot.parent = this.rightFootNode;
    rightBoot.material = goldMat;
    this.visibleMeshes.push(rightBoot);

    // --- Lin Yun Cyber-Mythic Aesthetics: Haori Coat Tails, Asymmetric Pauldron & Jade Talisman ---
    const coatMat = new StandardMaterial('linYunCoat', scene);
    coatMat.diffuseColor = new Color3(0.08, 0.12, 0.14);
    coatMat.specularColor = new Color3(0.3, 0.5, 0.45);
    coatMat.emissiveColor = new Color3(0.015, 0.04, 0.03);
    coatMat.backFaceCulling = false;

    const trimMat = new StandardMaterial('linYunJadeTrim', scene);
    trimMat.diffuseColor = new Color3(0.02, 0.22, 0.14);
    trimMat.emissiveColor = Color3.FromHexString('#00ff88');
    trimMat.specularColor = new Color3(0.6, 0.9, 0.7);

    // 4 Layered Flared Coat Tails (Front-Left, Front-Right, Back-Left, Back-Right)
    const coatConfigs = [
      { name: 'linYunCoatTail_FL', pos: new Vector3(-0.16, -0.36, 0.08), rot: new Vector3(-0.08, -0.22, -0.12) },
      { name: 'linYunCoatTail_FR', pos: new Vector3(0.16, -0.36, 0.08), rot: new Vector3(-0.08, 0.22, 0.12) },
      { name: 'linYunCoatTail_BL', pos: new Vector3(-0.15, -0.36, -0.12), rot: new Vector3(0.14, 0.22, -0.08) },
      { name: 'linYunCoatTail_BR', pos: new Vector3(0.15, -0.36, -0.12), rot: new Vector3(0.14, -0.22, 0.08) }
    ];

    coatConfigs.forEach(cfg => {
      const tail = MeshBuilder.CreatePlane(cfg.name, { width: 0.28, height: 0.76 }, scene);
      tail.parent = this.hipsNode;
      tail.position = cfg.pos;
      tail.rotation = cfg.rot;
      tail.material = coatMat;
      this.coatTails.push(tail);
      this.visibleMeshes.push(tail);
    });

    // Layered Imperial Magistrate Pauldron (Left Shoulder)
    const pauldronBase = MeshBuilder.CreateBox('linYunPauldronBase', { width: 0.26, height: 0.12, depth: 0.22 }, scene);
    pauldronBase.parent = this.leftShoulderNode;
    pauldronBase.position = new Vector3(-0.04, 0.07, 0);
    pauldronBase.material = goldMat;
    this.visibleMeshes.push(pauldronBase);

    const pauldronPlates = MeshBuilder.CreateBox('linYunPauldronPlate', { width: 0.22, height: 0.06, depth: 0.26 }, scene);
    pauldronPlates.parent = this.leftShoulderNode;
    pauldronPlates.position = new Vector3(-0.06, 0.12, 0);
    pauldronPlates.material = trimMat;
    this.visibleMeshes.push(pauldronPlates);

    // Spine Quantum Halo
    const spineHalo = MeshBuilder.CreateTorus('linYunSpineHalo', { diameter: 0.44, thickness: 0.026, tessellation: 16 }, scene);
    spineHalo.parent = this.chestNode;
    spineHalo.position = new Vector3(0, 0.12, -0.17);
    spineHalo.rotation.x = Math.PI / 2;
    spineHalo.material = trimMat;
    this.visibleMeshes.push(spineHalo);

    // Ceremonial Jade Talisman Pendant at Waist
    const talismanCord = MeshBuilder.CreateCylinder('talismanCord', { height: 0.22, diameter: 0.012 }, scene);
    talismanCord.parent = this.hipsNode;
    talismanCord.position = new Vector3(0.08, -0.04, 0.15);
    talismanCord.material = goldMat;
    this.visibleMeshes.push(talismanCord);

    const talismanJade = MeshBuilder.CreateDisc('talismanJade', { radius: 0.06, tessellation: 8 }, scene);
    talismanJade.parent = talismanCord;
    talismanJade.position.y = -0.12;
    talismanJade.material = trimMat;
    this.visibleMeshes.push(talismanJade);
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

  private updateSkeletalAnimation(delta: number, dt: number) {
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

    // --- State-Specific Joint Calculations ---
    switch (this.animState) {
      case 'idle': {
        // Natural chest breathing
        const breath = Math.sin(this.idleTime * 0.0022);
        this.spineNode.rotation.x = breath * 0.025;
        this.chestNode.position.y = 0.22 + breath * 0.012;
        this.headNode.rotation.x = -breath * 0.015;

        // Arms rest naturally; left hand near katana hilt
        this.leftShoulderNode.rotation = new Vector3(0.08, 0.1, 0.18);
        this.leftElbowNode.rotation.x = 0.35;
        this.rightShoulderNode.rotation = new Vector3(0.06, -0.05, -0.15);
        this.rightElbowNode.rotation.x = 0.15;

        // Legs planted solidly
        this.leftHipNode.rotation = new Vector3(0, 0, -0.05);
        this.leftKneeNode.rotation.x = 0.04;
        this.rightHipNode.rotation = new Vector3(0, 0, 0.05);
        this.rightKneeNode.rotation.x = 0.04;
        this.hipsNode.position.y = 0.92;
        break;
      }

      case 'run': {
        // Stride phase driven by velocity
        this.stridePhase += dt * 11.5;
        const stride = Math.sin(this.stridePhase);

        // Torso forward lean into momentum + vertical stride bounce
        this.spineNode.rotation.x = 0.18;
        this.hipsNode.position.y = 0.92 + Math.abs(Math.sin(this.stridePhase)) * 0.07;

        // Alternating leg movement with knee flex
        this.leftHipNode.rotation.x = stride * 0.72;
        this.leftKneeNode.rotation.x = Math.max(0, -stride * 0.85);
        this.rightHipNode.rotation.x = -stride * 0.72;
        this.rightKneeNode.rotation.x = Math.max(0, stride * 0.85);

        // Counter-swinging arms
        if (!this.weapon.isDrawn) {
          // Left hand stabilizes sheath while right arm swings
          this.leftShoulderNode.rotation = new Vector3(0.12, 0.15, 0.12);
          this.leftElbowNode.rotation.x = 0.45;
          this.rightShoulderNode.rotation.x = -stride * 0.55;
          this.rightElbowNode.rotation.x = 0.35;
        } else {
          // Two-hand ready run
          this.rightShoulderNode.rotation = new Vector3(0.4, 0.2, 0);
          this.rightElbowNode.rotation.x = 0.6;
        }

        // Footstep audio trigger on strike
        if (Math.abs(stride) > 0.94) {
          this.soundManager.playFootstep();
        }
        break;
      }

      case 'jump_start': {
        // Anticipation squat before launch
        this.hipsNode.position.y = 0.78;
        this.leftKneeNode.rotation.x = 0.65;
        this.rightKneeNode.rotation.x = 0.65;
        this.spineNode.rotation.x = 0.25;
        this.leftShoulderNode.rotation.x = -0.4;
        this.rightShoulderNode.rotation.x = -0.4;
        break;
      }

      case 'airborne': {
        // Airborne dynamic pose
        this.hipsNode.position.y = 0.94;
        this.leftHipNode.rotation.x = 0.35;
        this.leftKneeNode.rotation.x = 0.75;
        this.rightHipNode.rotation.x = -0.25;
        this.rightKneeNode.rotation.x = 0.45;
        this.leftShoulderNode.rotation = new Vector3(-0.35, 0, 0.4);
        this.rightShoulderNode.rotation = new Vector3(-0.35, 0, -0.4);
        break;
      }

      case 'land': {
        // Impact absorption
        this.hipsNode.position.y = 0.82;
        this.leftKneeNode.rotation.x = 0.45;
        this.rightKneeNode.rotation.x = 0.45;
        this.spineNode.rotation.x = 0.15;
        break;
      }

      case 'attack1': {
        // Horizontal Slash Arc
        const progress = 1 - this.stateTimer / 320;
        const swing = Math.sin(progress * Math.PI);
        this.spineNode.rotation.y = (progress - 0.5) * 1.8;
        this.rightShoulderNode.rotation = new Vector3(0.2, -1.2 + progress * 2.4, -0.2);
        this.rightElbowNode.rotation.x = 0.3 + swing * 0.4;
        if (progress >= 0.35 && progress <= 0.65 && !this.hasCheckedHitThisAttack) {
          this.hasCheckedHitThisAttack = true;
          this.onAttackHitCheck?.(false, 28);
        }
        this.applyAttackStep(progress, 0.25);
        break;
      }

      case 'attack2': {
        // Diagonal Rising Slash
        const progress = 1 - this.stateTimer / 340;
        const swing = Math.sin(progress * Math.PI);
        this.spineNode.rotation.x = -0.15 + swing * 0.25;
        this.spineNode.rotation.y = (0.5 - progress) * 1.6;
        this.rightShoulderNode.rotation = new Vector3(1.2 - progress * 2.2, 0.4, -0.4);
        this.rightElbowNode.rotation.x = 0.4 + swing * 0.5;
        if (progress >= 0.35 && progress <= 0.65 && !this.hasCheckedHitThisAttack) {
          this.hasCheckedHitThisAttack = true;
          this.onAttackHitCheck?.(false, 34);
        }
        this.applyAttackStep(progress, 0.25);
        break;
      }

      case 'attack3':
      case 'heavy_release': {
        // Overhead Helm-Breaker
        const duration = this.animState === 'heavy_release' ? 460 : 440;
        const progress = 1 - this.stateTimer / duration;
        if (progress < 0.35) {
          // Anticipation lift
          this.rightShoulderNode.rotation = new Vector3(-1.6, 0.1, 0);
          this.rightElbowNode.rotation.x = 0.8;
          this.spineNode.rotation.x = -0.2;
        } else {
          // Downward slam
          this.rightShoulderNode.rotation = new Vector3(1.4, 0, 0);
          this.rightElbowNode.rotation.x = 0.2;
          this.spineNode.rotation.x = 0.35;
          this.hipsNode.position.y = 0.82;
          if (progress <= 0.65 && !this.hasCheckedHitThisAttack) {
            this.hasCheckedHitThisAttack = true;
            this.onAttackHitCheck?.(true, this.animState === 'heavy_release' ? 72 : 56);
          }
          this.applyAttackStep(progress, 0.32);
        }
        break;
      }

      case 'heavy_charge': {
        // Low Battou/Iai Stance
        this.hipsNode.position.y = 0.82;
        this.leftHipNode.rotation.x = -0.45;
        this.rightHipNode.rotation.x = 0.45;
        this.leftKneeNode.rotation.x = 0.75;
        this.rightKneeNode.rotation.x = 0.65;
        this.spineNode.rotation.y = 0.55;
        // Right hand ready at hilt
        this.rightShoulderNode.rotation = new Vector3(0.65, -0.6, 0);
        this.rightElbowNode.rotation.x = 0.95;
        break;
      }

      case 'dodge': {
        // Acrobatic Evade Dash
        this.spineNode.rotation.x = 0.45;
        this.hipsNode.position.y = 0.76;
        this.leftKneeNode.rotation.x = 0.55;
        this.rightKneeNode.rotation.x = 0.55;
        break;
      }

      case 'summon_crouch': {
        // Controlled superhero/crouch landing stance
        this.hipsNode.position.y = 0.52;
        this.spineNode.rotation.x = 0.65;
        this.headNode.rotation.x = 0.2;
        this.leftHipNode.rotation = new Vector3(-0.35, 0, -0.4);
        this.leftKneeNode.rotation.x = 1.35;
        this.rightHipNode.rotation = new Vector3(0.55, 0, 0.3);
        this.rightKneeNode.rotation.x = 0.4;
        this.rightShoulderNode.rotation = new Vector3(0.9, -0.2, -0.3);
        this.rightElbowNode.rotation.x = 0.5;
        this.leftShoulderNode.rotation = new Vector3(-0.7, 0.2, 0.6);
        this.leftElbowNode.rotation.x = 0.2;
        break;
      }

      case 'summon_rise': {
        // Smoothly rises and prepares weapon grip
        this.hipsNode.position.y = 0.88;
        this.spineNode.rotation.x = 0.08;
        this.headNode.rotation.x = -0.05;
        this.leftKneeNode.rotation.x = 0.1;
        this.rightKneeNode.rotation.x = 0.1;
        this.leftShoulderNode.rotation = new Vector3(0.12, 0.2, 0.15);
        this.leftElbowNode.rotation.x = 0.4;
        this.rightShoulderNode.rotation = new Vector3(0.35, -0.4, -0.1);
        this.rightElbowNode.rotation.x = 0.85;
        break;
      }

      case 'victory_flick': {
        // Graceful horizontal blade flick / blood purge ("chiburi")
        this.hipsNode.position.y = 0.92;
        this.spineNode.rotation = new Vector3(-0.05, 0.35, 0);
        this.headNode.rotation = new Vector3(-0.1, -0.25, 0);
        this.rightShoulderNode.rotation = new Vector3(0.35, 1.25, -0.1);
        this.rightElbowNode.rotation.x = 0.15;
        this.leftShoulderNode.rotation = new Vector3(0.1, 0.15, 0.1);
        this.leftElbowNode.rotation.x = 0.5;
        break;
      }

      case 'victory_sheath': {
        // Slow vertical katana sheath into left hip saya
        this.hipsNode.position.y = 0.92;
        this.spineNode.rotation.x = 0.05;
        this.headNode.rotation.x = 0.15;
        this.leftShoulderNode.rotation = new Vector3(0.15, 0.2, 0.2);
        this.leftElbowNode.rotation.x = 0.6;
        this.rightShoulderNode.rotation = new Vector3(0.5, -0.45, 0);
        this.rightElbowNode.rotation.x = 0.95;
        break;
      }
    }

    // Dynamic Combat Coat Tails Oscillation (Stride, Wind & Airflow)
    if (this.coatTails.length > 0) {
      const runFlutter = this.animState === 'run' ? Math.sin(this.stridePhase * 2) * 0.22 : 0;
      const speedFlutter = this.isSprinting ? 0.35 : 0;
      const airFlutter = this.animState === 'airborne' ? 0.45 : 0;
      const idleBreath = Math.sin(this.idleTime * 0.0022) * 0.05;

      this.coatTails.forEach((tail, idx) => {
        const isBack = idx >= 2;
        const sideMult = (idx % 2 === 0) ? -1 : 1;
        tail.rotation.x = (isBack ? 0.14 : -0.08) + runFlutter + speedFlutter + airFlutter + idleBreath;
        tail.rotation.z = sideMult * (0.1 + (this.isSprinting ? 0.15 : 0));
      });
    }
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

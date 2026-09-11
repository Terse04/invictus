import {
  Scene,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';
import { ICharacterVisual, CharacterAttachmentPoints, PlayerAnimState } from './ICharacterVisual';

export class ProceduralCharacterVisual implements ICharacterVisual {
  public readonly rootNode: TransformNode;
  public readonly attachments: CharacterAttachmentPoints;
  public readonly isGlbLoaded = false;
  public readonly visibleMeshes: Mesh[] = [];

  // Articulated Skeleton Nodes
  public hipsNode: TransformNode;
  public spineNode: TransformNode;
  public chestNode: TransformNode;
  public headNode: TransformNode;
  public leftShoulderNode: TransformNode;
  public leftElbowNode: TransformNode;
  public leftHandNode: TransformNode;
  public rightShoulderNode: TransformNode;
  public rightElbowNode: TransformNode;
  public rightHandNode: TransformNode;
  public sheathMountNode: TransformNode;
  public leftHipNode: TransformNode;
  public leftKneeNode: TransformNode;
  public leftFootNode: TransformNode;
  public rightHipNode: TransformNode;
  public rightKneeNode: TransformNode;
  public rightFootNode: TransformNode;

  public coatTails: Mesh[] = [];
  private scene: Scene;
  private stridePhase = 0;
  private idleTime = 0;
  private hitReactionTimer = 0;
  private hitReactionOffset = new Vector3(0, 0, 0);

  constructor(scene: Scene, parentNode: TransformNode) {
    this.scene = scene;
    this.rootNode = new TransformNode('linYunVisualRoot', scene);
    this.rootNode.parent = parentNode;

    // Create Skeleton Joint Hierarchy
    this.hipsNode = new TransformNode('p_hips', scene);
    this.hipsNode.parent = this.rootNode;
    this.hipsNode.position.y = 0.96;

    this.spineNode = new TransformNode('p_spine', scene);
    this.spineNode.parent = this.hipsNode;
    this.spineNode.position.y = 0.16;

    this.chestNode = new TransformNode('p_chest', scene);
    this.chestNode.parent = this.spineNode;
    this.chestNode.position.y = 0.22;

    this.headNode = new TransformNode('p_head', scene);
    this.headNode.parent = this.chestNode;
    this.headNode.position.y = 0.38;

    this.leftShoulderNode = new TransformNode('p_leftShoulder', scene);
    this.leftShoulderNode.parent = this.chestNode;
    this.leftShoulderNode.position = new Vector3(-0.29, 0.14, 0);

    this.leftElbowNode = new TransformNode('p_leftElbow', scene);
    this.leftElbowNode.parent = this.leftShoulderNode;
    this.leftElbowNode.position.y = -0.27;

    this.leftHandNode = new TransformNode('p_leftHand', scene);
    this.leftHandNode.parent = this.leftElbowNode;
    this.leftHandNode.position.y = -0.26;

    this.rightShoulderNode = new TransformNode('p_rightShoulder', scene);
    this.rightShoulderNode.parent = this.chestNode;
    this.rightShoulderNode.position = new Vector3(0.29, 0.14, 0);

    this.rightElbowNode = new TransformNode('p_rightElbow', scene);
    this.rightElbowNode.parent = this.rightShoulderNode;
    this.rightElbowNode.position.y = -0.27;

    this.rightHandNode = new TransformNode('p_rightHand', scene);
    this.rightHandNode.parent = this.rightElbowNode;
    this.rightHandNode.position.y = -0.26;

    this.sheathMountNode = new TransformNode('p_sheathMount', scene);
    this.sheathMountNode.parent = this.hipsNode;
    this.sheathMountNode.position = new Vector3(-0.24, -0.06, 0.05);
    this.sheathMountNode.rotation = new Vector3(0.32, 0.22, 0.72);

    this.leftHipNode = new TransformNode('p_leftHip', scene);
    this.leftHipNode.parent = this.hipsNode;
    this.leftHipNode.position = new Vector3(-0.16, -0.08, 0);

    this.leftKneeNode = new TransformNode('p_leftKnee', scene);
    this.leftKneeNode.parent = this.leftHipNode;
    this.leftKneeNode.position.y = -0.42;

    this.leftFootNode = new TransformNode('p_leftFoot', scene);
    this.leftFootNode.parent = this.leftKneeNode;
    this.leftFootNode.position.y = -0.42;

    this.rightHipNode = new TransformNode('p_rightHip', scene);
    this.rightHipNode.parent = this.hipsNode;
    this.rightHipNode.position = new Vector3(0.16, -0.08, 0);

    this.rightKneeNode = new TransformNode('p_rightKnee', scene);
    this.rightKneeNode.parent = this.rightHipNode;
    this.rightKneeNode.position.y = -0.42;

    this.rightFootNode = new TransformNode('p_rightFoot', scene);
    this.rightFootNode.parent = this.rightKneeNode;
    this.rightFootNode.position.y = -0.42;

    this.attachments = {
      rootNode: this.rootNode,
      rightHandNode: this.rightHandNode,
      leftHandNode: this.leftHandNode,
      sheathMountNode: this.sheathMountNode,
      headNode: this.headNode,
      chestNode: this.chestNode,
      hipsNode: this.hipsNode
    };

    this.buildMeshes(scene);
  }

  private buildMeshes(scene: Scene) {
    // PBR Materials for Authored Cyber-Mythic Anime Aesthetic
    const coatMat = new PBRMaterial('pbrLinYunCoat', scene);
    coatMat.albedoColor = new Color3(0.04, 0.06, 0.12);
    coatMat.metallic = 0.1;
    coatMat.roughness = 0.65;

    const goldMat = new PBRMaterial('pbrLinYunGold', scene);
    goldMat.albedoColor = new Color3(0.95, 0.78, 0.22);
    goldMat.metallic = 0.95;
    goldMat.roughness = 0.22;

    const armorMat = new PBRMaterial('pbrLinYunArmor', scene);
    armorMat.albedoColor = new Color3(0.88, 0.90, 0.94);
    armorMat.metallic = 0.25;
    armorMat.roughness = 0.32;

    const jadeMat = new PBRMaterial('pbrLinYunJade', scene);
    jadeMat.albedoColor = new Color3(0.0, 0.95, 0.55);
    jadeMat.emissiveColor = new Color3(0.0, 0.9, 0.5);
    jadeMat.metallic = 0.05;
    jadeMat.roughness = 0.15;

    const skinMat = new PBRMaterial('pbrLinYunSkin', scene);
    skinMat.albedoColor = new Color3(0.96, 0.86, 0.80);
    skinMat.metallic = 0.0;
    skinMat.roughness = 0.7;

    const hairMat = new PBRMaterial('pbrLinYunHair', scene);
    hairMat.albedoColor = new Color3(0.06, 0.06, 0.08);
    hairMat.metallic = 0.1;
    hairMat.roughness = 0.45;

    // 1. Hips & Combat Sash
    const pelvis = MeshBuilder.CreateBox('lyPelvis', { width: 0.38, height: 0.22, depth: 0.26 }, scene);
    pelvis.parent = this.hipsNode;
    pelvis.material = coatMat;
    this.visibleMeshes.push(pelvis);

    const sash = MeshBuilder.CreateCylinder('lySash', { height: 0.12, diameter: 0.44, tessellation: 20 }, scene);
    sash.parent = this.hipsNode;
    sash.position.y = 0.08;
    sash.material = goldMat;
    this.visibleMeshes.push(sash);

    // Ceremonial Jade Talisman at Waist
    const talisman = MeshBuilder.CreateDisc('lyTalisman', { radius: 0.065, tessellation: 16 }, scene);
    talisman.parent = this.hipsNode;
    talisman.position = new Vector3(0.14, 0.04, 0.21);
    talisman.material = jadeMat;
    this.visibleMeshes.push(talisman);

    // 2. Torso & Chest Armor
    const torso = MeshBuilder.CreateCylinder('lyTorso', { height: 0.34, diameterTop: 0.44, diameterBottom: 0.36, tessellation: 16 }, scene);
    torso.parent = this.chestNode;
    torso.material = coatMat;
    this.visibleMeshes.push(torso);

    const breastplate = MeshBuilder.CreateBox('lyBreastplate', { width: 0.36, height: 0.24, depth: 0.12 }, scene);
    breastplate.parent = this.chestNode;
    breastplate.position = new Vector3(0, 0.04, 0.15);
    breastplate.material = armorMat;
    this.visibleMeshes.push(breastplate);

    // Spinal Quantum Halo
    const halo = MeshBuilder.CreateTorus('lyHalo', { diameter: 0.46, thickness: 0.032, tessellation: 24 }, scene);
    halo.parent = this.chestNode;
    halo.position = new Vector3(0, 0.08, -0.16);
    halo.rotation.x = Math.PI / 2.2;
    halo.material = jadeMat;
    this.visibleMeshes.push(halo);

    // Asymmetric Magistrate Pauldron (Left Shoulder)
    const pauldron = MeshBuilder.CreateBox('lyPauldron', { width: 0.26, height: 0.22, depth: 0.32 }, scene);
    pauldron.parent = this.leftShoulderNode;
    pauldron.position = new Vector3(-0.06, 0.06, 0);
    pauldron.rotation.z = -0.22;
    pauldron.material = armorMat;
    this.visibleMeshes.push(pauldron);

    const pauldronTrim = MeshBuilder.CreateBox('lyPauldronTrim', { width: 0.28, height: 0.05, depth: 0.34 }, scene);
    pauldronTrim.parent = pauldron;
    pauldronTrim.position.y = 0.1;
    pauldronTrim.material = goldMat;
    this.visibleMeshes.push(pauldronTrim);

    const pauldronCircuit = MeshBuilder.CreateTorus('lyPauldronCircuit', { diameter: 0.16, thickness: 0.02, tessellation: 16 }, scene);
    pauldronCircuit.parent = pauldron;
    pauldronCircuit.position.x = -0.11;
    pauldronCircuit.rotation.y = Math.PI / 2;
    pauldronCircuit.material = jadeMat;
    this.visibleMeshes.push(pauldronCircuit);

    // 3. Head & Anime Wuxia Hairstyle
    const head = MeshBuilder.CreateSphere('lyHead', { diameter: 0.28, segments: 16 }, scene);
    head.parent = this.headNode;
    head.material = skinMat;
    this.visibleMeshes.push(head);

    const hairCrown = MeshBuilder.CreateSphere('lyHairCrown', { diameterX: 0.31, diameterY: 0.3, diameterZ: 0.33, segments: 16 }, scene);
    hairCrown.parent = this.headNode;
    hairCrown.position = new Vector3(0, 0.05, -0.04);
    hairCrown.material = hairMat;
    this.visibleMeshes.push(hairCrown);

    // Dual Coiled Wuxia Buns
    [-0.11, 0.11].forEach((x) => {
      const bun = MeshBuilder.CreateSphere(`lyBun_${x}`, { diameter: 0.14, segments: 12 }, scene);
      bun.parent = this.headNode;
      bun.position = new Vector3(x, 0.17, -0.06);
      bun.material = hairMat;
      this.visibleMeshes.push(bun);

      const hairTie = MeshBuilder.CreateTorus(`lyHairTie_${x}`, { diameter: 0.13, thickness: 0.025, tessellation: 12 }, scene);
      hairTie.parent = this.headNode;
      hairTie.position = new Vector3(x, 0.14, -0.06);
      hairTie.rotation.x = Math.PI / 2;
      hairTie.material = goldMat;
      this.visibleMeshes.push(hairTie);
    });

    // High Trailing Ponytail
    const ponytail = MeshBuilder.CreateCylinder('lyPonytail', { height: 0.52, diameterTop: 0.1, diameterBottom: 0.03, tessellation: 12 }, scene);
    ponytail.parent = this.headNode;
    ponytail.position = new Vector3(0, 0.04, -0.22);
    ponytail.rotation.x = -Math.PI / 3.8;
    ponytail.material = hairMat;
    this.visibleMeshes.push(ponytail);

    // Crossed Imperial Golden Hairpins with Glowing Jade Tips
    [-1, 1].forEach((dir) => {
      const pin = MeshBuilder.CreateCylinder(`lyHairpin_${dir}`, { height: 0.38, diameter: 0.018, tessellation: 8 }, scene);
      pin.parent = this.headNode;
      pin.position = new Vector3(0, 0.19, -0.06);
      pin.rotation.z = dir * (Math.PI / 4.2);
      pin.rotation.x = 0.18;
      pin.material = goldMat;
      this.visibleMeshes.push(pin);

      const pinTip = MeshBuilder.CreateSphere(`lyPinTip_${dir}`, { diameter: 0.045 }, scene);
      pinTip.parent = pin;
      pinTip.position.y = 0.2;
      pinTip.material = jadeMat;
      this.visibleMeshes.push(pinTip);
    });

    // 4. Arms & Forearm Guards
    [-1, 1].forEach((side) => {
      const isLeft = side === -1;
      const shoulderNode = isLeft ? this.leftShoulderNode : this.rightShoulderNode;
      const elbowNode = isLeft ? this.leftElbowNode : this.rightElbowNode;
      const handNode = isLeft ? this.leftHandNode : this.rightHandNode;

      const upperArm = MeshBuilder.CreateCylinder(`lyUpperArm_${side}`, { height: 0.24, diameter: 0.11, tessellation: 12 }, scene);
      upperArm.parent = shoulderNode;
      upperArm.position.y = -0.12;
      upperArm.material = coatMat;
      this.visibleMeshes.push(upperArm);

      const forearm = MeshBuilder.CreateCylinder(`lyForearm_${side}`, { height: 0.24, diameter: 0.12, tessellation: 12 }, scene);
      forearm.parent = elbowNode;
      forearm.position.y = -0.12;
      forearm.material = coatMat;
      this.visibleMeshes.push(forearm);

      // Gauntlet / Vambrace
      const bracer = MeshBuilder.CreateCylinder(`lyBracer_${side}`, { height: 0.16, diameter: 0.135, tessellation: 12 }, scene);
      bracer.parent = elbowNode;
      bracer.position.y = -0.14;
      bracer.material = armorMat;
      this.visibleMeshes.push(bracer);

      const hand = MeshBuilder.CreateBox(`lyHandMesh_${side}`, { width: 0.08, height: 0.1, depth: 0.09 }, scene);
      hand.parent = handNode;
      hand.material = skinMat;
      this.visibleMeshes.push(hand);
    });

    // 5. Legs & Boots
    [-1, 1].forEach((side) => {
      const isLeft = side === -1;
      const hipNode = isLeft ? this.leftHipNode : this.rightHipNode;
      const kneeNode = isLeft ? this.leftKneeNode : this.rightKneeNode;
      const footNode = isLeft ? this.leftFootNode : this.rightFootNode;

      const thigh = MeshBuilder.CreateCylinder(`lyThigh_${side}`, { height: 0.38, diameter: 0.15, tessellation: 12 }, scene);
      thigh.parent = hipNode;
      thigh.position.y = -0.19;
      thigh.material = coatMat;
      this.visibleMeshes.push(thigh);

      const shin = MeshBuilder.CreateCylinder(`lyShin_${side}`, { height: 0.38, diameter: 0.14, tessellation: 12 }, scene);
      shin.parent = kneeNode;
      shin.position.y = -0.19;
      shin.material = coatMat;
      this.visibleMeshes.push(shin);

      // Cyber Greaves
      const greave = MeshBuilder.CreateBox(`lyGreave_${side}`, { width: 0.14, height: 0.26, depth: 0.09 }, scene);
      greave.parent = kneeNode;
      greave.position = new Vector3(0, -0.18, 0.07);
      greave.material = armorMat;
      this.visibleMeshes.push(greave);

      const foot = MeshBuilder.CreateBox(`lyFootMesh_${side}`, { width: 0.12, height: 0.09, depth: 0.22 }, scene);
      foot.parent = footNode;
      foot.position = new Vector3(0, -0.04, 0.06);
      foot.material = goldMat;
      this.visibleMeshes.push(foot);
    });

    // 6. Dynamic Combat Haori Coat Tails
    const tailOffsets = [
      { x: -0.14, z: -0.14, rotY: -0.3 },
      { x: 0.14, z: -0.14, rotY: 0.3 },
      { x: -0.19, z: 0.02, rotY: -1.2 },
      { x: 0.19, z: 0.02, rotY: 1.2 }
    ];

    tailOffsets.forEach((pos, idx) => {
      const tail = MeshBuilder.CreateBox(`lyCoatTail_${idx}`, { width: 0.18, height: 0.65, depth: 0.025 }, scene);
      tail.parent = this.hipsNode;
      tail.position = new Vector3(pos.x, -0.32, pos.z);
      tail.rotation.y = pos.rotY;
      tail.rotation.x = 0.12;
      tail.material = coatMat;
      this.coatTails.push(tail);
      this.visibleMeshes.push(tail);
    });
  }

  public update(delta: number, currentVelocity: Vector3, isGrounded: boolean, animState: PlayerAnimState, stateTimer: number): void {
    const dt = delta * 0.001;
    this.idleTime += dt;

    if (this.hitReactionTimer > 0) {
      this.hitReactionTimer -= dt;
      const factor = Math.max(0, this.hitReactionTimer / 0.18);
      this.hipsNode.position.addInPlace(this.hitReactionOffset.scale(factor * 0.05));
    }

    const horizSpeed = Math.sqrt(currentVelocity.x * currentVelocity.x + currentVelocity.z * currentVelocity.z);
    const isMoving = horizSpeed > 0.4 && isGrounded;

    if (isMoving) {
      this.stridePhase += dt * horizSpeed * 2.8;
    }

    // Update Coat Tail Physics
    const windOscillation = Math.sin(this.idleTime * 4.2) * 0.08;
    const strideOscillation = isMoving ? Math.sin(this.stridePhase) * 0.22 : 0;
    const speedDrag = Math.min(0.55, horizSpeed * 0.08);

    this.coatTails.forEach((tail, idx) => {
      const stagger = idx * 0.35;
      tail.rotation.x = 0.12 + speedDrag + windOscillation + Math.sin(this.stridePhase + stagger) * strideOscillation;
    });

    // Update Joints Based on Animation State
    switch (animState) {
      case 'idle':
        this.applyIdlePose();
        break;
      case 'run':
        this.applyRunPose(horizSpeed);
        break;
      case 'jump_start':
      case 'airborne':
        this.applyAirbornePose(currentVelocity.y);
        break;
      case 'attack1':
        this.applyAttack1Pose(stateTimer);
        break;
      case 'attack2':
        this.applyAttack2Pose(stateTimer);
        break;
      case 'attack3':
        this.applyAttack3Pose(stateTimer);
        break;
      case 'heavy_charge':
        this.applyHeavyChargePose();
        break;
      case 'heavy_release':
        this.applyHeavyReleasePose(stateTimer);
        break;
      case 'dodge':
        this.applyDodgePose(stateTimer);
        break;
      case 'summon_crouch':
        this.applySummonCrouchPose();
        break;
      case 'summon_rise':
        this.applySummonRisePose(stateTimer);
        break;
      case 'victory_flick':
        this.applyVictoryFlickPose(stateTimer);
        break;
      case 'victory_sheath':
        this.applyVictorySheathPose(stateTimer);
        break;
      default:
        this.applyIdlePose();
        break;
    }
  }

  private applyIdlePose() {
    const breath = Math.sin(this.idleTime * 2.2) * 0.03;
    this.chestNode.position.y = 0.22 + breath;
    this.headNode.rotation.x = -breath * 0.5;

    // Graceful ready stance
    this.leftShoulderNode.rotation = new Vector3(0.08, 0, breath * 0.3);
    this.leftElbowNode.rotation.x = -0.22;
    this.rightShoulderNode.rotation = new Vector3(-0.06, 0, -breath * 0.3);
    this.rightElbowNode.rotation.x = -0.22;

    this.leftHipNode.rotation = new Vector3(0, 0, -0.05);
    this.rightHipNode.rotation = new Vector3(0, 0, 0.05);
    this.leftKneeNode.rotation.x = 0.06;
    this.rightKneeNode.rotation.x = 0.06;
  }

  private applyRunPose(speed: number) {
    const legSwing = Math.sin(this.stridePhase) * 0.72;
    const armSwing = Math.sin(this.stridePhase) * 0.55;

    this.leftHipNode.rotation.x = legSwing;
    this.rightHipNode.rotation.x = -legSwing;
    this.leftKneeNode.rotation.x = Math.max(0, -legSwing * 0.9);
    this.rightKneeNode.rotation.x = Math.max(0, legSwing * 0.9);

    this.leftShoulderNode.rotation.x = -armSwing;
    this.rightShoulderNode.rotation.x = armSwing;
    this.leftElbowNode.rotation.x = -0.45;
    this.rightElbowNode.rotation.x = -0.45;

    this.chestNode.rotation.x = 0.18; // Forward sprint lean
  }

  private applyAirbornePose(verticalVelocity: number) {
    this.leftHipNode.rotation.x = -0.35;
    this.rightHipNode.rotation.x = -0.2;
    this.leftKneeNode.rotation.x = 0.65;
    this.rightKneeNode.rotation.x = 0.5;

    this.leftShoulderNode.rotation = new Vector3(-0.4, 0, 0.3);
    this.rightShoulderNode.rotation = new Vector3(-0.4, 0, -0.3);
    this.chestNode.rotation.x = verticalVelocity > 0 ? -0.1 : 0.15;
  }

  private applyAttack1Pose(timer: number) {
    const p = Math.min(1, timer / 260);
    this.rightShoulderNode.rotation = new Vector3(-0.8 + p * 1.6, 0.4 - p * 0.9, 0.3);
    this.rightElbowNode.rotation.x = -0.3;
    this.chestNode.rotation.y = 0.35 - p * 0.7;
  }

  private applyAttack2Pose(timer: number) {
    const p = Math.min(1, timer / 280);
    this.rightShoulderNode.rotation = new Vector3(0.5 - p * 1.4, -0.5 + p * 1.0, -0.2);
    this.rightElbowNode.rotation.x = -0.2;
    this.chestNode.rotation.y = -0.4 + p * 0.8;
  }

  private applyAttack3Pose(timer: number) {
    const p = Math.min(1, timer / 360);
    this.rightShoulderNode.rotation = new Vector3(-1.4 + p * 2.6, 0, 0.1);
    this.rightElbowNode.rotation.x = -0.4 + p * 0.3;
    this.chestNode.rotation.x = -0.2 + p * 0.5;
  }

  private applyHeavyChargePose() {
    this.hipsNode.position.y = 0.82;
    this.leftKneeNode.rotation.x = 0.45;
    this.rightKneeNode.rotation.x = 0.35;
    this.chestNode.rotation = new Vector3(0.2, -0.45, 0);
    this.rightHandNode.position = new Vector3(0, 0, 0);
  }

  private applyHeavyReleasePose(timer: number) {
    const p = Math.min(1, timer / 320);
    this.hipsNode.position.y = 0.82 + p * 0.14;
    this.rightShoulderNode.rotation = new Vector3(0, -0.8 + p * 1.6, 0.2);
    this.chestNode.rotation.y = -0.45 + p * 0.9;
  }

  private applyDodgePose(timer: number) {
    const p = Math.min(1, timer / 380);
    this.hipsNode.rotation.x = p * Math.PI * 2;
    this.hipsNode.position.y = 0.65;
  }

  private applySummonCrouchPose() {
    this.hipsNode.position.y = 0.54;
    this.chestNode.rotation.x = 0.42;
    this.leftKneeNode.rotation.x = 1.1;
    this.rightKneeNode.rotation.x = 0.85;
    this.rightHandNode.position.y = -0.15;
  }

  private applySummonRisePose(timer: number) {
    const p = Math.min(1, timer / 900);
    this.hipsNode.position.y = 0.54 + p * 0.42;
    this.chestNode.rotation.x = 0.42 * (1 - p);
    this.leftKneeNode.rotation.x = 1.1 * (1 - p);
    this.rightKneeNode.rotation.x = 0.85 * (1 - p);
  }

  private applyVictoryFlickPose(timer: number) {
    const p = Math.min(1, timer / 450);
    this.rightShoulderNode.rotation = new Vector3(-0.2, 0.6 + p * 0.4, 0.3);
    this.rightHandNode.rotation.z = p * 0.9;
  }

  private applyVictorySheathPose(timer: number) {
    const p = Math.min(1, timer / 600);
    this.rightHandNode.rotation.z = 0.9 * (1 - p);
    this.chestNode.rotation.y = -0.2 * (1 - p);
  }

  public setAnimationState(_state: PlayerAnimState): void {
    // Continuous state tracking
  }

  public playOneShot(_state: PlayerAnimState, _durationMs: number, onComplete?: () => void): void {
    if (onComplete) {
      window.setTimeout(onComplete, _durationMs);
    }
  }

  public applyHitReaction(impactDirection?: Vector3): void {
    this.hitReactionTimer = 0.18;
    if (impactDirection) {
      this.hitReactionOffset = impactDirection.normalize().scale(-0.12);
    } else {
      this.hitReactionOffset = new Vector3(0, 0, -0.12);
    }
  }

  public setVisible(visible: boolean): void {
    this.visibleMeshes.forEach(mesh => {
      mesh.visibility = visible ? 1 : 0;
    });
  }

  public dispose(): void {
    this.visibleMeshes.forEach(m => m.dispose());
    this.visibleMeshes.length = 0;
    this.coatTails.length = 0;
    this.rootNode.dispose();
  }
}

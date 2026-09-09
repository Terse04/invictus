import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  DynamicTexture
} from '@babylonjs/core';
import { Player3D } from '../player/Player3D';
import { GameBridge } from '../GameBridge';
import { SoundManager } from '../audio/SoundManager';
import { ELDER_YAN_DIALOGUE } from '../data/dialogueData';

export class ElderYan3D {
  public rootMesh: Mesh;
  public steleMesh: Mesh;
  private scene: Scene;
  private targetPlayer: Player3D;
  private promptPlane: Mesh;
  private hasSpoken = false;

  constructor(scene: Scene, position: Vector3, targetPlayer: Player3D) {
    this.scene = scene;
    this.targetPlayer = targetPlayer;

    const npcNode = new TransformNode('elderYanNode', scene);

    // 1. Elder Yan 3D Model (Ancient cybernetic sage in flowing robe)
    this.rootMesh = MeshBuilder.CreateCylinder('elderBody', {
      height: 1.8,
      diameterTop: 0.45,
      diameterBottom: 0.65
    }, scene);
    this.rootMesh.parent = npcNode;
    this.rootMesh.position = position.clone();
    this.rootMesh.position.y += 0.9;
    this.rootMesh.checkCollisions = true;

    const robeMat = new StandardMaterial('elderRobeMat', scene);
    robeMat.diffuseColor = new Color3(0.12, 0.16, 0.22);
    robeMat.emissiveColor = new Color3(0.0, 0.35, 0.4);
    this.rootMesh.material = robeMat;

    // Sage Head & Cyber-Beard
    const head = MeshBuilder.CreateSphere('elderHead', { diameter: 0.38 }, scene);
    head.parent = this.rootMesh;
    head.position.y = 1.05;
    const headMat = new StandardMaterial('elderHeadMat', scene);
    headMat.diffuseColor = new Color3(0.85, 0.78, 0.72);
    head.material = headMat;

    // 2. Floating Holographic Transmutation Stele
    this.steleMesh = MeshBuilder.CreateBox('steleMesh', {
      width: 0.8,
      height: 2.2,
      depth: 0.15
    }, scene);
    this.steleMesh.position = position.add(new Vector3(1.4, 1.4, 0));

    const steleMat = new StandardMaterial('steleMat', scene);
    steleMat.emissiveColor = new Color3(0.0, 0.9, 1.0); // Holographic cyan glow
    steleMat.alpha = 0.75;
    this.steleMesh.material = steleMat;

    // 3. Floating Interaction Prompt Plane
    this.promptPlane = MeshBuilder.CreatePlane('talkPrompt', { width: 2.8, height: 0.7 }, scene);
    this.promptPlane.position = position.add(new Vector3(0, 2.4, 0));
    this.promptPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    this.promptPlane.visibility = 0;

    const dynamicTex = new DynamicTexture('promptTex', { width: 512, height: 128 }, scene);
    dynamicTex.hasAlpha = true;
    dynamicTex.drawText('[F] COMMUNE WITH SAGE', 35, 75, 'bold 36px monospace', '#00f2fe', 'rgba(7, 11, 20, 0.85)', true);

    const promptMat = new StandardMaterial('promptMat', scene);
    promptMat.diffuseTexture = dynamicTex;
    promptMat.emissiveColor = new Color3(0.0, 0.95, 1.0);
    promptMat.opacityTexture = dynamicTex;
    promptMat.backFaceCulling = false;
    this.promptPlane.material = promptMat;

    // Input listeners
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'f') this.tryInteract();
    });

    GameBridge.on('virtual_input_change', (input: typeof GameBridge.virtualInput) => {
      if (input.interact) this.tryInteract();
    });
  }

  public update() {
    const dist = Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position);
    this.promptPlane.visibility = dist <= 4.0 ? 1 : 0;

    // Floating stele animation
    this.steleMesh.position.y = 1.6 + Math.sin(Date.now() * 0.002) * 0.12;
    this.steleMesh.rotation.y += 0.008;
  }

  public tryInteract() {
    const dist = Vector3.Distance(this.rootMesh.position, this.targetPlayer.rootMesh.position);
    if (dist <= 4.0) {
      SoundManager.getInstance().playUIClick();

      GameBridge.emit('dialogue_open', {
        ...ELDER_YAN_DIALOGUE,
        onComplete: () => {
          if (!this.hasSpoken) {
            this.hasSpoken = true;
            this.targetPlayer.unlockWaveAbility();
            GameBridge.emit('toast_message', {
              title: '✦ ABILITY UNLOCKED: TRANSMUTATION WAVE',
              subtitle: 'Press E (or Ability Button) to unleash sweeping quantum energy slashes',
              type: 'unlock'
            });
          }
        }
      });
    }
  }

  public dispose() {
    this.promptPlane.dispose();
    this.steleMesh.dispose();
    this.rootMesh.dispose();
  }
}

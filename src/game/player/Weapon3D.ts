import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
  Color3,
  Vector3,
  TrailMesh,
  TransformNode
} from '@babylonjs/core';
import { SoundManager } from '../audio/SoundManager';

export class Weapon3D {
  public rootNode: TransformNode;
  public bladeMesh: Mesh;
  public guardMesh: Mesh;
  public hiltMesh: Mesh;
  public pommelMesh: Mesh;
  public sayaMesh: Mesh; // Scabbard permanently at hip
  public tipNode: TransformNode;
  public trailMesh: TrailMesh | null = null;

  public isDrawn = false;
  private scene: Scene;
  private handNode: TransformNode;
  private sheathNode: TransformNode;
  private trailMaterial: StandardMaterial | null = null;
  private trailFadeTimer: number | null = null;

  constructor(scene: Scene, handNode: TransformNode, sheathNode: TransformNode) {
    this.scene = scene;
    this.handNode = handNode;
    this.sheathNode = sheathNode;

    // 1. Scabbard (Saya) - permanently attached to left hip sheath node
    this.sayaMesh = MeshBuilder.CreateBox('sayaMesh', {
      width: 0.05,
      height: 1.05,
      depth: 0.03
    }, scene);
    this.sayaMesh.parent = sheathNode;
    this.sayaMesh.position = new Vector3(0, -0.42, 0);

    const sayaMat = new PBRMaterial('pbrSayaMat', scene);
    sayaMat.albedoColor = new Color3(0.04, 0.05, 0.08); // Lacquered obsidian
    sayaMat.metallic = 0.2;
    sayaMat.roughness = 0.25;
    sayaMat.emissiveColor = new Color3(0.01, 0.08, 0.05); // Subtle jade lacquer
    this.sayaMesh.material = sayaMat;

    const goldMat = new PBRMaterial('pbrWeaponGold', scene);
    goldMat.albedoColor = new Color3(0.95, 0.78, 0.22);
    goldMat.metallic = 0.95;
    goldMat.roughness = 0.22;

    // Gold Sageo band on scabbard
    const bandMesh = MeshBuilder.CreateBox('sayaBand', {
      width: 0.06,
      height: 0.12,
      depth: 0.04
    }, scene);
    bandMesh.parent = this.sayaMesh;
    bandMesh.position.y = 0.35;
    bandMesh.material = goldMat;

    // 2. Weapon Root Node (holds the actual Katana: blade + guard + hilt)
    this.rootNode = new TransformNode('katanaRoot', scene);

    // 3. Cyber-Katana Blade (Folded cyber-steel with razor polished edge)
    this.bladeMesh = MeshBuilder.CreateBox('katanaBlade', {
      width: 0.04,
      height: 1.1,
      depth: 0.015
    }, scene);
    this.bladeMesh.parent = this.rootNode;
    this.bladeMesh.position.y = 0.58;

    const bladeMat = new PBRMaterial('pbrKatanaBladeMat', scene);
    bladeMat.albedoColor = new Color3(0.85, 0.92, 0.98);
    bladeMat.metallic = 0.96;
    bladeMat.roughness = 0.14;
    bladeMat.emissiveColor = new Color3(0.05, 0.35, 0.45);
    this.bladeMesh.material = bladeMat;

    // Resonant jade fuller (energy canal along spine)
    const fuller = MeshBuilder.CreateBox('bladeFuller', {
      width: 0.012,
      height: 0.95,
      depth: 0.02
    }, scene);
    fuller.parent = this.bladeMesh;
    const fullerMat = new PBRMaterial('pbrFullerMat', scene);
    fullerMat.albedoColor = new Color3(0.0, 0.95, 0.65);
    fullerMat.emissiveColor = new Color3(0.0, 0.9, 0.6);
    fullerMat.metallic = 0.1;
    fullerMat.roughness = 0.2;
    fuller.material = fullerMat;

    // 3b. Habaki (Brass blade collar connecting blade to tsuba guard)
    const habaki = MeshBuilder.CreateBox('katanaHabaki', {
      width: 0.046,
      height: 0.08,
      depth: 0.022
    }, scene);
    habaki.parent = this.rootNode;
    habaki.position.y = 0.06;
    habaki.material = goldMat;

    // 4. Tsuba (Crossguard) - Ancient geometric octagonal plate
    this.guardMesh = MeshBuilder.CreateCylinder('tsuba', {
      height: 0.025,
      diameter: 0.18,
      tessellation: 8
    }, scene);
    this.guardMesh.parent = this.rootNode;
    this.guardMesh.position.y = 0.02;
    this.guardMesh.material = goldMat;

    // 5. Tsuka (Hilt) - Diamond-braided cyber wrap
    this.hiltMesh = MeshBuilder.CreateCylinder('tsuka', {
      height: 0.28,
      diameter: 0.035
    }, scene);
    this.hiltMesh.parent = this.rootNode;
    this.hiltMesh.position.y = -0.14;

    const hiltMat = new PBRMaterial('pbrTsukaMat', scene);
    hiltMat.albedoColor = new Color3(0.05, 0.07, 0.11);
    hiltMat.metallic = 0.15;
    hiltMat.roughness = 0.55;
    this.hiltMesh.material = hiltMat;

    // 6. Kashira (Pommel)
    this.pommelMesh = MeshBuilder.CreateSphere('kashira', {
      diameter: 0.048
    }, scene);
    this.pommelMesh.parent = this.rootNode;
    this.pommelMesh.position.y = -0.28;
    this.pommelMesh.material = goldMat;

    // 7. Slash trail tracking node at blade tip
    this.tipNode = new TransformNode('katanaTip', scene);
    this.tipNode.parent = this.bladeMesh;
    this.tipNode.position.y = 0.55;

    // Start sheathed without playing sound on init
    this.isDrawn = false;
    this.rootNode.parent = this.sheathNode;
    this.rootNode.position = new Vector3(0, 0.08, 0);
    this.rootNode.rotation = new Vector3(0, 0, 0);
  }

  public drawWeapon(playSound = true) {
    if (this.isDrawn) return;
    this.isDrawn = true;

    // Re-parent to right hand
    this.rootNode.parent = this.handNode;
    // Precise ergonomic katana grip alignment in hand
    this.rootNode.position = new Vector3(0, -0.05, 0.08);
    this.rootNode.rotation = new Vector3(Math.PI / 2.2, 0, 0);

    if (playSound) {
      try {
        SoundManager.getInstance().playKatanaDraw();
      } catch {
        // audio context safety
      }
    }
  }

  public sheathWeapon(playSound = true) {
    if (!this.isDrawn) return;
    this.isDrawn = false;
    this.deactivateTrail();

    // Re-parent to hip sheath node
    this.rootNode.parent = this.sheathNode;
    // Align hilt directly above the scabbard opening
    this.rootNode.position = new Vector3(0, 0.08, 0);
    this.rootNode.rotation = new Vector3(0, 0, 0);

    if (playSound) {
      try {
        SoundManager.getInstance().playSheathClick();
      } catch {
        // audio context safety
      }
    }
  }

  /** A short ribbon sampled from the moving blade, shown only during an attack swing. */
  public activateTrail() {
    if (this.trailFadeTimer !== null) {
      window.clearInterval(this.trailFadeTimer);
      this.trailFadeTimer = null;
    }
    if (!this.trailMesh) {
      // The blade's hilt-to-tip span is the ribbon width; its motion supplies the arc.
      this.trailMesh = new TrailMesh('weaponTrail', this.bladeMesh, this.scene, 0.45, 12, true);
      this.trailMaterial = new StandardMaterial('trailMat', this.scene);
      this.trailMaterial.emissiveColor = Color3.FromHexString('#00f0ff');
      this.trailMaterial.disableLighting = true;
      this.trailMesh.material = this.trailMaterial;
    }
    if (this.trailMaterial) this.trailMaterial.alpha = 0.82;
    this.trailMesh.isVisible = true;
  }

  /** Fade the ribbon after the active hit window rather than leaving it on while sheathed. */
  public deactivateTrail() {
    if (!this.trailMesh || !this.trailMaterial) return;
    if (this.trailFadeTimer !== null) window.clearInterval(this.trailFadeTimer);
    const start = performance.now();
    this.trailFadeTimer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / 180);
      this.trailMaterial!.alpha = 0.82 * (1 - progress);
      if (progress >= 1) {
        this.trailMesh!.isVisible = false;
        window.clearInterval(this.trailFadeTimer!);
        this.trailFadeTimer = null;
      }
    }, 16);
  }

  public getWorldTipPosition(): Vector3 {
    return this.tipNode.getAbsolutePosition();
  }

  public dispose() {
    if (this.trailFadeTimer !== null) window.clearInterval(this.trailFadeTimer);
    this.trailMesh?.dispose();
    this.bladeMesh.dispose();
    this.guardMesh.dispose();
    this.hiltMesh.dispose();
    this.pommelMesh.dispose();
    this.sayaMesh.dispose();
    this.rootNode.dispose();
  }
}

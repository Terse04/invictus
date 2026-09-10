import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TrailMesh,
  TransformNode
} from '@babylonjs/core';

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

    const sayaMat = new StandardMaterial('sayaMat', scene);
    sayaMat.diffuseColor = new Color3(0.04, 0.06, 0.10); // Lacquered obsidian
    sayaMat.specularColor = new Color3(0.5, 0.7, 0.9);
    sayaMat.emissiveColor = new Color3(0.03, 0.11, 0.06); // Subtle jade lacquer inlay
    this.sayaMesh.material = sayaMat;

    // Gold Sageo band on scabbard
    const bandMesh = MeshBuilder.CreateBox('sayaBand', {
      width: 0.06,
      height: 0.12,
      depth: 0.04
    }, scene);
    bandMesh.parent = this.sayaMesh;
    bandMesh.position.y = 0.35;
    const goldMat = new StandardMaterial('goldTrimMat', scene);
    goldMat.diffuseColor = new Color3(0.95, 0.75, 0.2);
    goldMat.emissiveColor = new Color3(0.4, 0.3, 0.05);
    bandMesh.material = goldMat;

    // 2. Weapon Root Node (holds the actual Katana: blade + guard + hilt)
    this.rootNode = new TransformNode('katanaRoot', scene);

    // 3. Cyber-Katana Blade (Curved, slender, razor-sharp edge)
    this.bladeMesh = MeshBuilder.CreateBox('katanaBlade', {
      width: 0.04,
      height: 1.1,
      depth: 0.015
    }, scene);
    this.bladeMesh.parent = this.rootNode;
    this.bladeMesh.position.y = 0.58;

    const bladeMat = new StandardMaterial('katanaBladeMat', scene);
    bladeMat.diffuseColor = new Color3(0.9, 0.95, 1.0);
    bladeMat.specularColor = new Color3(1, 1, 1);
    bladeMat.emissiveColor = new Color3(0.18, 0.42, 0.20); // Ancient jade edge, not neon plasma
    bladeMat.specularPower = 128;
    this.bladeMesh.material = bladeMat;

    // Glowing plasma fuller (energy canal along spine)
    const fuller = MeshBuilder.CreateBox('bladeFuller', {
      width: 0.012,
      height: 0.95,
      depth: 0.02
    }, scene);
    fuller.parent = this.bladeMesh;
    const fullerMat = new StandardMaterial('fullerMat', scene);
    fullerMat.emissiveColor = new Color3(0.62, 0.52, 0.18);
    fuller.material = fullerMat;

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

    const hiltMat = new StandardMaterial('tsukaMat', scene);
    hiltMat.diffuseColor = new Color3(0.06, 0.08, 0.12);
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

    // Start sheathed
    this.sheathWeapon();
  }

  public drawWeapon() {
    if (this.isDrawn) return;
    this.isDrawn = true;

    // Re-parent to right hand
    this.rootNode.parent = this.handNode;
    // Precise ergonomic katana grip alignment in hand
    this.rootNode.position = new Vector3(0, -0.05, 0.08);
    this.rootNode.rotation = new Vector3(Math.PI / 2.2, 0, 0);

    this.activateTrail();
  }

  public sheathWeapon() {
    this.isDrawn = false;
    this.deactivateTrail();

    // Re-parent to hip sheath node
    this.rootNode.parent = this.sheathNode;
    // Align hilt directly above the scabbard opening
    this.rootNode.position = new Vector3(0, 0.08, 0);
    this.rootNode.rotation = new Vector3(0, 0, 0);
  }

  public activateTrail() {
    if (!this.trailMesh) {
      this.trailMesh = new TrailMesh('weaponTrail', this.bladeMesh, this.scene, 0.45, 24, true);
      const trailMat = new StandardMaterial('trailMat', this.scene);
      trailMat.emissiveColor = new Color3(0.76, 0.62, 0.22);
      trailMat.alpha = 0.62;
      this.trailMesh.material = trailMat;
    }
    this.trailMesh.isVisible = true;
  }

  public deactivateTrail() {
    if (this.trailMesh) this.trailMesh.isVisible = false;
  }

  public getWorldTipPosition(): Vector3 {
    return this.tipNode.getAbsolutePosition();
  }

  public dispose() {
    this.trailMesh?.dispose();
    this.bladeMesh.dispose();
    this.guardMesh.dispose();
    this.hiltMesh.dispose();
    this.pommelMesh.dispose();
    this.sayaMesh.dispose();
    this.rootNode.dispose();
  }
}

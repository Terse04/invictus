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
  public hiltMesh: Mesh;
  public guardMesh: Mesh;
  public tipNode: TransformNode;
  public trailMesh: TrailMesh | null = null;
  private scene: Scene;

  constructor(scene: Scene, parentNode: TransformNode) {
    this.scene = scene;
    this.rootNode = new TransformNode('weaponRoot', scene);
    this.rootNode.parent = parentNode;

    // Relative transform to right hand
    this.rootNode.position = new Vector3(0.08, -0.05, 0.15);
    this.rootNode.rotation = new Vector3(Math.PI / 2, 0, 0);

    // 1. Blade: Slender Chinese Jian (Double-edged straight blade with cyan quantum core)
    this.bladeMesh = MeshBuilder.CreateBox('jianBlade', {
      width: 0.07,
      height: 1.15,
      depth: 0.02
    }, scene);
    this.bladeMesh.parent = this.rootNode;
    this.bladeMesh.position.y = 0.65;

    // Cyber-Quantum Blade Material (Luminous cyan glow)
    const bladeMat = new StandardMaterial('bladeMat', scene);
    bladeMat.diffuseColor = new Color3(0.9, 0.98, 1.0);
    bladeMat.emissiveColor = new Color3(0.0, 0.85, 1.0); // Cyan energy core
    bladeMat.specularColor = new Color3(1, 1, 1);
    bladeMat.specularPower = 64;
    this.bladeMesh.material = bladeMat;

    // 2. Guard: Ancient Chinese Winged Crossguard (Imperial Gold)
    this.guardMesh = MeshBuilder.CreateBox('jianGuard', {
      width: 0.26,
      height: 0.04,
      depth: 0.05
    }, scene);
    this.guardMesh.parent = this.rootNode;
    this.guardMesh.position.y = 0.08;

    const goldMat = new StandardMaterial('goldGuardMat', scene);
    goldMat.diffuseColor = new Color3(0.85, 0.65, 0.15);
    goldMat.emissiveColor = new Color3(0.35, 0.25, 0.05);
    this.guardMesh.material = goldMat;

    // 3. Hilt & Pommel: Cyber-woven grip & obsidian counterweight
    this.hiltMesh = MeshBuilder.CreateCylinder('jianHilt', {
      height: 0.22,
      diameter: 0.038
    }, scene);
    this.hiltMesh.parent = this.rootNode;
    this.hiltMesh.position.y = -0.06;

    const hiltMat = new StandardMaterial('hiltMat', scene);
    hiltMat.diffuseColor = new Color3(0.08, 0.12, 0.18);
    this.hiltMesh.material = hiltMat;

    // Tip node for slash trail tracking
    this.tipNode = new TransformNode('weaponTip', scene);
    this.tipNode.parent = this.bladeMesh;
    this.tipNode.position.y = 0.6;
  }

  public activateTrail() {
    if (!this.trailMesh) {
      this.trailMesh = new TrailMesh('weaponTrail', this.bladeMesh, this.scene, 0.35, 18, true);
      const trailMat = new StandardMaterial('trailMat', this.scene);
      trailMat.emissiveColor = new Color3(0.0, 0.95, 1.0);
      trailMat.alpha = 0.7;
      this.trailMesh.material = trailMat;
    }
  }

  public deactivateTrail() {
    if (this.trailMesh) {
      this.trailMesh.dispose();
      this.trailMesh = null;
    }
  }

  public getWorldTipPosition(): Vector3 {
    return this.tipNode.getAbsolutePosition();
  }

  public dispose() {
    this.deactivateTrail();
    this.bladeMesh.dispose();
    this.guardMesh.dispose();
    this.hiltMesh.dispose();
    this.rootNode.dispose();
  }
}

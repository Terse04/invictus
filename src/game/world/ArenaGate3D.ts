import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3
} from '@babylonjs/core';

export class ArenaGate3D {
  public barrierMesh: Mesh;
  private mat: StandardMaterial;
  public isLocked = false;

  constructor(scene: Scene, position: Vector3, width: number = 14, height: number = 5) {
    this.barrierMesh = MeshBuilder.CreateBox('barrierGate', {
      width,
      height,
      depth: 0.35
    }, scene);

    this.barrierMesh.position = position.clone();
    this.barrierMesh.position.y += height / 2;
    this.barrierMesh.checkCollisions = false;
    this.barrierMesh.visibility = 0;

    this.mat = new StandardMaterial('barrierMat', scene);
    this.mat.emissiveColor = new Color3(0.0, 0.95, 1.0);
    this.mat.alpha = 0.55;
    this.barrierMesh.material = this.mat;
  }

  public lock() {
    this.isLocked = true;
    this.barrierMesh.checkCollisions = true;
    this.barrierMesh.visibility = 1;
  }

  public unlock() {
    this.isLocked = false;
    this.barrierMesh.checkCollisions = false;

    let a = 0.55;
    const interval = window.setInterval(() => {
      a -= 0.05;
      this.mat.alpha = a;
      if (a <= 0) {
        clearInterval(interval);
        this.barrierMesh.visibility = 0;
      }
    }, 30);
  }

  public dispose() {
    this.barrierMesh.dispose();
  }
}

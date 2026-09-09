import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3
} from '@babylonjs/core';

export class Telegraph3D {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  // 3D Circular Ground Telegraph (Expanding warning ring)
  public showCircle(pos: Vector3, radius: number, durationMs: number, onComplete?: () => void) {
    // Outer danger rim
    const outerRing = MeshBuilder.CreateTorus('telegraphOuter', {
      diameter: radius * 2,
      thickness: 0.08,
      tessellation: 32
    }, this.scene);
    outerRing.position = new Vector3(pos.x, pos.y + 0.04, pos.z);

    const rimMat = new StandardMaterial('telegraphRimMat', this.scene);
    rimMat.emissiveColor = new Color3(1.0, 0.15, 0.35); // Crimson danger glow
    rimMat.alpha = 0.85;
    outerRing.material = rimMat;

    // Expanding inner warning disc
    const innerDisc = MeshBuilder.CreateDisc('telegraphDisc', {
      radius: 0.1,
      tessellation: 32
    }, this.scene);
    innerDisc.position = new Vector3(pos.x, pos.y + 0.03, pos.z);
    innerDisc.rotation.x = Math.PI / 2;

    const discMat = new StandardMaterial('telegraphDiscMat', this.scene);
    discMat.emissiveColor = new Color3(1.0, 0.1, 0.25);
    discMat.alpha = 0.35;
    innerDisc.material = discMat;

    let elapsed = 0;
    const interval = window.setInterval(() => {
      elapsed += 16;
      const progress = Math.min(1.0, elapsed / durationMs);

      // Expand disc
      const currentRadius = radius * progress;
      innerDisc.scaling = new Vector3(currentRadius / 0.1, currentRadius / 0.1, 1);

      if (progress >= 1.0) {
        clearInterval(interval);
        outerRing.dispose();
        innerDisc.dispose();
        onComplete?.();
      }
    }, 16);

    return () => {
      clearInterval(interval);
      outerRing.dispose();
      innerDisc.dispose();
    };
  }

  // 3D Directional Cone Ground Telegraph
  public showCone(pos: Vector3, forward: Vector3, length: number, durationMs: number, onComplete?: () => void) {
    const angle = Math.atan2(forward.x, forward.z);

    const coneMesh = MeshBuilder.CreateCylinder('telegraphCone', {
      height: 0.04,
      diameterTop: length * 1.2,
      diameterBottom: 0.2,
      tessellation: 16
    }, this.scene);

    coneMesh.position = pos.add(forward.scale(length * 0.5));
    coneMesh.position.y += 0.04;
    coneMesh.rotation.y = angle;

    const coneMat = new StandardMaterial('coneMat', this.scene);
    coneMat.emissiveColor = new Color3(1.0, 0.2, 0.3);
    coneMat.alpha = 0.35;
    coneMesh.material = coneMat;

    window.setTimeout(() => {
      coneMesh.dispose();
      onComplete?.();
    }, durationMs);
  }

  // 3D Linear Beam Ground Telegraph
  public showLine(start: Vector3, end: Vector3, width: number, durationMs: number, onComplete?: () => void) {
    const dir = end.subtract(start);
    const length = dir.length();
    const mid = start.add(end).scale(0.5);

    const lineMesh = MeshBuilder.CreateBox('telegraphLine', {
      width: width,
      height: 0.04,
      depth: length
    }, this.scene);

    lineMesh.position = new Vector3(mid.x, mid.y + 0.04, mid.z);
    lineMesh.lookAt(new Vector3(end.x, mid.y + 0.04, end.z));

    const lineMat = new StandardMaterial('lineMat', this.scene);
    lineMat.emissiveColor = new Color3(1.0, 0.0, 0.35);
    lineMat.alpha = 0.4;
    lineMesh.material = lineMat;

    window.setTimeout(() => {
      lineMesh.dispose();
      onComplete?.();
    }, durationMs);
  }
}

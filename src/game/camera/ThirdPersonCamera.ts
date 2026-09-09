import {
  Scene,
  Vector3,
  ArcRotateCamera
} from '@babylonjs/core';

export class ThirdPersonCamera {
  public camera: ArcRotateCamera;
  private scene: Scene;
  private targetMesh: { position: Vector3 };

  // Damping and distance tuning
  public idealDistance = 4.8; // Character occupies ~25-30% of screen height
  public idealBeta = Math.PI / 2.35;
  private targetOffset = new Vector3(0.35, 1.35, 0); // Over-the-shoulder action framing

  // Shake state
  private isShaking = false;
  private shakeIntensity = 0;
  private shakeTimer = 0;

  constructor(scene: Scene, canvas: HTMLCanvasElement, targetMesh: { position: Vector3 }) {
    this.scene = scene;
    this.targetMesh = targetMesh;

    // Action Third-Person ArcRotateCamera
    this.camera = new ArcRotateCamera(
      'actionCamera',
      -Math.PI / 2, // alpha (facing forward)
      this.idealBeta, // beta (slight downward pitch)
      this.idealDistance,
      targetMesh.position.add(this.targetOffset),
      scene
    );

    // Tight action limits
    this.camera.lowerRadiusLimit = 2.8;
    this.camera.upperRadiusLimit = 7.5;
    this.camera.lowerBetaLimit = 0.35;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.08; // Prevent going through floor
    this.camera.fov = 0.84; // ~48 deg cinematic action FOV
    this.camera.wheelPrecision = 35;
    this.camera.angularSensibilityX = 1400;
    this.camera.angularSensibilityY = 1400;

    // Attach mouse controls
    this.camera.attachControl(canvas, true);

    // Smooth inertia
    this.camera.inertia = 0.68;
  }

  public update(delta: number) {
    if (!this.targetMesh) return;

    // Smoothly follow target position with slight lag
    const desiredTarget = this.targetMesh.position.add(this.targetOffset);
    Vector3.LerpToRef(this.camera.target, desiredTarget, 0.18, this.camera.target);

    // Handle screen shake on weapon impacts and abilities
    if (this.isShaking) {
      this.shakeTimer -= delta;
      if (this.shakeTimer <= 0) {
        this.isShaking = false;
      } else {
        const ox = (Math.random() - 0.5) * this.shakeIntensity;
        const oy = (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.target.x += ox;
        this.camera.target.y += oy;
      }
    }
  }

  public shake(intensity: number = 0.18, duration: number = 180) {
    this.isShaking = true;
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  public rotateBy(deltaAlpha: number, deltaBeta: number) {
    this.camera.alpha += deltaAlpha;
    this.camera.beta = Math.max(
      this.camera.lowerBetaLimit!,
      Math.min(this.camera.upperBetaLimit!, this.camera.beta + deltaBeta)
    );
  }

  public getForwardVector(): Vector3 {
    const alpha = this.camera.alpha;
    return new Vector3(Math.cos(alpha + Math.PI / 2), 0, Math.sin(alpha + Math.PI / 2)).normalize();
  }

  public getRightVector(): Vector3 {
    const forward = this.getForwardVector();
    return new Vector3(forward.z, 0, -forward.x);
  }
}

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
  public idealDistance = 7.5;
  public idealHeight = 2.4;
  private currentDistance = 7.5;
  private targetOffset = new Vector3(0, 1.4, 0);

  // Shake state
  private isShaking = false;
  private shakeIntensity = 0;
  private shakeTimer = 0;

  constructor(scene: Scene, canvas: HTMLCanvasElement, targetMesh: { position: Vector3 }) {
    this.scene = scene;
    this.targetMesh = targetMesh;

    // ArcRotateCamera positioned behind target
    this.camera = new ArcRotateCamera(
      'thirdPersonCamera',
      -Math.PI / 2, // alpha (horizontal rotation)
      Math.PI / 2.6, // beta (vertical pitch)
      this.idealDistance, // radius
      targetMesh.position.add(this.targetOffset),
      scene
    );

    this.camera.lowerRadiusLimit = 3.0;
    this.camera.upperRadiusLimit = 14.0;
    this.camera.lowerBetaLimit = 0.2;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.05; // Prevent camera going underground
    this.camera.wheelPrecision = 40;
    this.camera.angularSensibilityX = 1600;
    this.camera.angularSensibilityY = 1600;

    // Attach mouse controls
    this.camera.attachControl(canvas, true);

    // Damping / inertia
    this.camera.inertia = 0.75;
  }

  public update(delta: number) {
    if (!this.targetMesh) return;

    // Smoothly follow target position + offset
    const desiredTarget = this.targetMesh.position.add(this.targetOffset);
    Vector3.LerpToRef(this.camera.target, desiredTarget, 0.15, this.camera.target);

    // Handle screen shake
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

  public shake(intensity: number = 0.25, duration: number = 220) {
    this.isShaking = true;
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  public rotateBy(deltaAlpha: number, deltaBeta: number) {
    this.camera.alpha += deltaAlpha;
    this.camera.beta = Math.max(this.camera.lowerBetaLimit!, Math.min(this.camera.upperBetaLimit!, this.camera.beta + deltaBeta));
  }

  public setZoom(radius: number) {
    this.camera.radius = radius;
  }

  public getForwardVector(): Vector3 {
    // Return horizontal forward vector of camera
    const alpha = this.camera.alpha;
    return new Vector3(Math.cos(alpha + Math.PI / 2), 0, Math.sin(alpha + Math.PI / 2)).normalize();
  }

  public getRightVector(): Vector3 {
    const forward = this.getForwardVector();
    return new Vector3(forward.z, 0, -forward.x);
  }
}

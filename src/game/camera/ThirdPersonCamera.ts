import { Scene, Vector3, ArcRotateCamera, Scalar } from '@babylonjs/core';

export class ThirdPersonCamera {
  public camera: ArcRotateCamera;
  public idealDistance = 4.8;
  private readonly targetOffset = new Vector3(0.38, 1.28, 0);
  private readonly canvas: HTMLCanvasElement;
  private readonly targetMesh: { position: Vector3 };
  private isSprinting = false;
  private shakeIntensity = 0;
  private shakeTimer = 0;
  private cinematic: { target: Vector3; alpha: number; beta: number; radius: number; remaining: number } | null = null;
  private readonly onCanvasClick: () => void;
  private readonly onMouseMove: (event: MouseEvent) => void;
  private readonly onPointerLockChange: () => void;

  constructor(scene: Scene, canvas: HTMLCanvasElement, targetMesh: { position: Vector3 }) {
    this.canvas = canvas;
    this.targetMesh = targetMesh;
    this.camera = new ArcRotateCamera('actionCamera', -Math.PI / 2, Math.PI / 2.35, this.idealDistance, targetMesh.position.add(this.targetOffset), scene);
    this.camera.lowerRadiusLimit = 3.4;
    this.camera.upperRadiusLimit = 6.5;
    this.camera.lowerBetaLimit = Math.PI / 2 - 65 * Math.PI / 180;
    this.camera.upperBetaLimit = Math.PI / 2 + 15 * Math.PI / 180;
    this.camera.fov = 50 * Math.PI / 180;
    this.camera.inertia = 0;
    this.camera.panningSensibility = 0;

    this.onCanvasClick = () => {
      if (document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock();
    };
    this.onMouseMove = (event) => {
      if (document.pointerLockElement === this.canvas) this.rotateBy(-event.movementX * 0.0021, -event.movementY * 0.00165);
    };
    this.onPointerLockChange = () => {
      scene.metadata = { ...(scene.metadata ?? {}), pointerLocked: document.pointerLockElement === this.canvas };
    };
    canvas.addEventListener('click', this.onCanvasClick);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  public update(delta: number) {
    const desiredTarget = this.cinematic?.target ?? this.targetMesh.position.add(this.targetOffset);
    Vector3.LerpToRef(this.camera.target, desiredTarget, Math.min(1, delta * 0.012), this.camera.target);
    if (this.cinematic) {
      this.camera.alpha = Scalar.Lerp(this.camera.alpha, this.cinematic.alpha, Math.min(1, delta * 0.006));
      this.camera.beta = Scalar.Lerp(this.camera.beta, this.cinematic.beta, Math.min(1, delta * 0.006));
      this.camera.radius = Scalar.Lerp(this.camera.radius, this.cinematic.radius, Math.min(1, delta * 0.006));
      this.cinematic.remaining -= delta;
      if (this.cinematic.remaining <= 0) this.cinematic = null;
    }
    this.camera.fov = Scalar.Lerp(this.camera.fov, (this.isSprinting ? 58 : 50) * Math.PI / 180, Math.min(1, delta * 0.007));
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      const intensity = this.shakeIntensity * Math.max(0, this.shakeTimer / 180);
      this.camera.target.addInPlace(new Vector3((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity, 0));
    }
  }

  public setSprinting(value: boolean) { this.isSprinting = value; }
  public beginCinematic(target: Vector3, duration = 1800) {
    this.cinematic = { target: target.clone(), alpha: -Math.PI / 2.55, beta: Math.PI / 2.75, radius: 14, remaining: duration };
  }
  public shake(intensity = 0.18, duration = 180) { this.shakeIntensity = intensity; this.shakeTimer = duration; }
  public rotateBy(deltaAlpha: number, deltaBeta: number) {
    this.camera.alpha += deltaAlpha;
    this.camera.beta = Scalar.Clamp(this.camera.beta + deltaBeta, this.camera.lowerBetaLimit!, this.camera.upperBetaLimit!);
  }
  public getForwardVector(): Vector3 {
    const alpha = this.camera.alpha;
    return new Vector3(Math.cos(alpha + Math.PI / 2), 0, Math.sin(alpha + Math.PI / 2)).normalize();
  }
  public getRightVector(): Vector3 {
    const forward = this.getForwardVector();
    return new Vector3(forward.z, 0, -forward.x);
  }
  public dispose() {
    this.canvas.removeEventListener('click', this.onCanvasClick);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}

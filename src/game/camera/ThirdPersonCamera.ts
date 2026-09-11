import { Scene, Vector3, ArcRotateCamera, Scalar } from '@babylonjs/core';
import { loadSettings } from '../../utils/storage';

export class ThirdPersonCamera {
  public camera: ArcRotateCamera;
  public idealDistance = 4.8;
  private readonly targetOffset = new Vector3(0.38, 1.28, 0);
  private readonly canvas: HTMLCanvasElement;
  private readonly targetMesh: { position: Vector3 };
  private isSprinting = false;
  private shakeIntensity = 0;
  private shakeTimer = 0;
  private targetFreezeTimer = 0;
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
      if (document.pointerLockElement === this.canvas) {
        const sens = loadSettings().cameraSensitivity || 1.0;
        this.rotateBy(-event.movementX * 0.0021 * sens, -event.movementY * 0.00165 * sens);
      }
    };
    this.onPointerLockChange = () => {
      scene.metadata = { ...(scene.metadata ?? {}), pointerLocked: document.pointerLockElement === this.canvas };
    };
    canvas.addEventListener('click', this.onCanvasClick);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private keyframes: { target: Vector3; alpha: number; beta: number; radius: number; duration: number }[] = [];
  private keyframeIndex = 0;
  private keyframeElapsed = 0;
  private keyframeCompleteCallback: (() => void) | null = null;
  private isOrbitalActive = false;
  private orbitalRemaining = 0;
  private orbitalTotalDuration = 0;
  private orbitalCenter = new Vector3(0, 0, 0);
  private orbitalStartAlpha = 0;
  private orbitalCallback: (() => void) | null = null;

  public update(delta: number) {
    // 1. Orbital Cinematic Sweep (Victory Outro)
    if (this.isOrbitalActive) {
      this.orbitalRemaining -= delta;
      const progress = 1 - Math.max(0, this.orbitalRemaining / this.orbitalTotalDuration);
      this.camera.target = this.orbitalCenter.clone().add(this.targetOffset);
      this.camera.alpha = this.orbitalStartAlpha + progress * Math.PI * 2;
      this.camera.beta = Scalar.Lerp(this.camera.beta, Math.PI / 2.3, Math.min(1, delta * 0.005));
      this.camera.radius = Scalar.Lerp(this.camera.radius, 4.2, Math.min(1, delta * 0.005));

      if (this.orbitalRemaining <= 0) {
        this.isOrbitalActive = false;
        const cb = this.orbitalCallback;
        this.orbitalCallback = null;
        cb?.();
      }
      return;
    }

    // 2. Multi-Keyframe Cinematic Sequence (Chapter Entry)
    if (this.keyframes.length > 0 && this.keyframeIndex < this.keyframes.length) {
      const kf = this.keyframes[this.keyframeIndex];
      this.keyframeElapsed += delta;
      const t = Math.min(1, this.keyframeElapsed / kf.duration);
      // Smooth cubic ease
      const easeT = t * t * (3 - 2 * t);

      Vector3.LerpToRef(this.camera.target, kf.target, Math.min(1, delta * 0.008), this.camera.target);
      this.camera.alpha = Scalar.Lerp(this.camera.alpha, kf.alpha, Math.min(1, delta * 0.008));
      this.camera.beta = Scalar.Lerp(this.camera.beta, kf.beta, Math.min(1, delta * 0.008));
      this.camera.radius = Scalar.Lerp(this.camera.radius, kf.radius, Math.min(1, delta * 0.008));

      if (this.keyframeElapsed >= kf.duration) {
        this.keyframeIndex++;
        this.keyframeElapsed = 0;
        if (this.keyframeIndex >= this.keyframes.length) {
          this.keyframes = [];
          const cb = this.keyframeCompleteCallback;
          this.keyframeCompleteCallback = null;
          cb?.();
        }
      }
      return;
    }

    // 3. Standard Third-Person Gameplay Follow
    const desiredTarget = this.cinematic?.target ?? this.targetMesh.position.add(this.targetOffset);
    if (this.targetFreezeTimer > 0) {
      this.targetFreezeTimer -= delta;
    } else {
      Vector3.LerpToRef(this.camera.target, desiredTarget, Math.min(1, delta * 0.012), this.camera.target);
    }
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

  public playCinematicSequence(
    keyframes: { target: Vector3; alpha: number; beta: number; radius: number; duration: number }[],
    onComplete?: () => void
  ) {
    this.keyframes = keyframes;
    this.keyframeIndex = 0;
    this.keyframeElapsed = 0;
    this.keyframeCompleteCallback = onComplete ?? null;
    this.cinematic = null;
    this.isOrbitalActive = false;

    if (keyframes.length > 0) {
      const first = keyframes[0];
      this.camera.target = first.target.clone();
      this.camera.alpha = first.alpha;
      this.camera.beta = first.beta;
      this.camera.radius = first.radius;
    }
  }

  public playOrbitalSweep(center: Vector3, duration = 4000, onComplete?: () => void) {
    this.isOrbitalActive = true;
    this.orbitalRemaining = duration;
    this.orbitalTotalDuration = duration;
    this.orbitalCenter = center.clone();
    this.orbitalStartAlpha = this.camera.alpha;
    this.orbitalCallback = onComplete ?? null;
    this.keyframes = [];
    this.cinematic = null;
  }

  public setSprinting(value: boolean) { this.isSprinting = value; }
  public beginCinematic(target: Vector3, duration = 1800) {
    this.cinematic = { target: target.clone(), alpha: -Math.PI / 2.55, beta: Math.PI / 2.75, radius: 14, remaining: duration };
  }
  public shake(intensity = 0.18, duration = 180) { this.shakeIntensity = intensity; this.shakeTimer = duration; }
  public freezeTarget(duration = 50) { this.targetFreezeTimer = Math.max(this.targetFreezeTimer, duration); }
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

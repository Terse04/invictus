import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  ShadowGenerator,
  Camera,
  DefaultRenderingPipeline
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { QualityProfile, resolveQuality } from './QualitySettings';
import { loadSettings } from '../utils/storage';

export class GameEngine {
  public engine: Engine;
  public scene: Scene;
  public shadowGenerator: ShadowGenerator;
  public dirLight: DirectionalLight;
  public hemiLight: HemisphericLight;
  public readonly quality: QualityProfile;
  public renderingPipeline: DefaultRenderingPipeline | null = null;
  private handleResize: () => void;
  private handleContextLost: (e: Event) => void;
  private handleContextRestored: () => void;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.quality = resolveQuality();

    if (!Engine.isSupported()) {
      throw new Error('WebGL is not supported on this browser/device. Please enable hardware acceleration.');
    }

    // Context loss handlers to prevent unrecoverable WebGL aborts
    this.handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('[GameEngine] WebGL context lost - preventing default to allow auto-recovery.');
    };
    this.handleContextRestored = () => {
      console.info('[GameEngine] WebGL context restored successfully.');
      this.engine.resize();
    };
    canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);

    // Initialize Babylon.js Engine (Antialiasing enabled, preserveDrawingBuffer false for performance)
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      powerPreference: 'high-performance'
    });
    this.engine.setHardwareScalingLevel(this.quality.hardwareScaling);

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.12, 0.18, 0.22, 1.0);

    // Atmospheric 3D Exponential Fog for cinematic spatial depth
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.0025;
    this.scene.fogColor = new Color3(0.12, 0.18, 0.22);

    // Collisions setup
    this.scene.collisionsEnabled = true;

    // Ambient Celestial Hemispheric Light (Cool midnight blue ambient)
    this.hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), this.scene);
    this.hemiLight.intensity = 0.85;
    this.hemiLight.diffuse = new Color3(0.85, 0.90, 0.95);
    this.hemiLight.groundColor = new Color3(0.2, 0.25, 0.22);

    // Key Directional Moonlight (Crisp silvery light casting sharp shadows)
    this.dirLight = new DirectionalLight('dirLight', new Vector3(-0.5, -1.4, 0.8), this.scene);
    this.dirLight.position = new Vector3(35, 75, -35);
    this.dirLight.intensity = 1.6;
    this.dirLight.diffuse = new Color3(1.0, 0.95, 0.85);

    // Dynamic Rim Light (Illuminates silhouette edges from behind)
    const rimLight = new DirectionalLight('rimLight', new Vector3(0.5, 0.6, -1.0), this.scene);
    rimLight.intensity = 0.4;
    rimLight.diffuse = new Color3(0.36, 0.68, 0.45);

    // Dynamic Shadow Generator
    this.shadowGenerator = new ShadowGenerator(this.quality.shadowMapSize, this.dirLight);
    this.shadowGenerator.useBlurExponentialShadowMap = this.quality.blurShadows;
    this.shadowGenerator.blurKernel = this.quality.level === 'high' ? 16 : 8;
    this.shadowGenerator.setDarkness(0.45);

    // Render loop
    this.engine.runRenderLoop(() => {
      if (this.scene.activeCamera) {
        this.scene.render();
      }
    });

    // Handle window resize
    this.handleResize = () => {
      this.engine.resize();
    };
    window.addEventListener('resize', this.handleResize);
  }

  public configureRendering(camera: Camera) {
    this.renderingPipeline?.dispose();
    const settings = loadSettings();
    const pipeline = new DefaultRenderingPipeline('celestialRenderingPipeline', true, this.scene, [camera]);
    pipeline.bloomEnabled = settings.bloomEnabled;
    pipeline.bloomThreshold = 0.7;
    pipeline.bloomWeight = 0.35;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
    pipeline.samples = this.quality.level === 'low' ? 1 : 4;
    pipeline.fxaaEnabled = this.quality.level !== 'low';
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.contrast = 1.0;
    pipeline.imageProcessing.exposure = 1.15;
    this.renderingPipeline = pipeline;

    if (!settings.fogEnabled) {
      this.scene.fogMode = Scene.FOGMODE_NONE;
    }
  }

  public dispose() {
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.scene.dispose();
    this.engine.dispose();
  }
}

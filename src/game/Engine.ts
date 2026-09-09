import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  ShadowGenerator
} from '@babylonjs/core';

export class GameEngine {
  public engine: Engine;
  public scene: Scene;
  public shadowGenerator: ShadowGenerator;
  public dirLight: DirectionalLight;
  public hemiLight: HemisphericLight;
  private handleResize: () => void;
  private handleContextLost: (e: Event) => void;
  private handleContextRestored: () => void;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

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

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.04, 0.07, 0.12, 1.0); // Deep celestial indigo

    // Atmospheric 3D Exponential Fog
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.0055;
    this.scene.fogColor = new Color3(0.04, 0.07, 0.12);

    // Collisions setup
    this.scene.collisionsEnabled = true;

    // Ambient Celestial Hemispheric Light
    this.hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), this.scene);
    this.hemiLight.intensity = 0.65;
    this.hemiLight.diffuse = new Color3(0.85, 0.95, 1.0);
    this.hemiLight.groundColor = new Color3(0.12, 0.16, 0.22);

    // Key Directional Sunlight for dramatic shadows
    this.dirLight = new DirectionalLight('dirLight', new Vector3(-0.6, -1.2, 0.8), this.scene);
    this.dirLight.position = new Vector3(30, 60, -30);
    this.dirLight.intensity = 1.6;
    this.dirLight.diffuse = new Color3(1.0, 0.96, 0.88);

    // Dynamic Shadow Generator
    this.shadowGenerator = new ShadowGenerator(2048, this.dirLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 16;
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

  public dispose() {
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.scene.dispose();
    this.engine.dispose();
  }
}

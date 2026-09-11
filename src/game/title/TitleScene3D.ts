import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  PointLight,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Mesh,
  ParticleSystem,
  DefaultRenderingPipeline,
  ArcRotateCamera
} from '@babylonjs/core';

export class TitleScene3D {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private pipeline: DefaultRenderingPipeline | null = null;
  private linYunNode: TransformNode;
  private spineNode: TransformNode;
  private headNode: TransformNode;
  private coatTails: Mesh[] = [];
  private shenlongEyes: Mesh[] = [];
  private isDisposed = false;
  private handleResize: () => void;
  private handleMouseMove: (e: MouseEvent) => void;
  private targetAlpha: number;
  private targetBeta: number;

  constructor(canvas: HTMLCanvasElement) {
    // 1. Initialize High-Performance Lightweight Engine
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    this.engine.setHardwareScalingLevel(window.devicePixelRatio > 1.5 ? 1.2 : 1.0);

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.03, 0.05, 0.08, 1.0);

    // Deep Atmospheric Exponential Fog for Cinematic Depth
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.016;
    this.scene.fogColor = new Color3(0.04, 0.07, 0.10);

    // 2. Cinematic Camera (Frames Lin Yun on the right 3/4, looking into the depth)
    this.targetAlpha = -Math.PI / 2.32;
    this.targetBeta = Math.PI / 2.18;
    this.camera = new ArcRotateCamera(
      'titleCam',
      this.targetAlpha,
      this.targetBeta,
      3.45,
      new Vector3(0.35, 1.15, 0.2),
      this.scene
    );
    this.camera.fov = 44 * (Math.PI / 180);
    this.camera.lowerRadiusLimit = 2.8;
    this.camera.upperRadiusLimit = 4.2;

    // 3. Cinematic Lighting (Midnight Ambient + Warm Moonlight + Vivid Cyan Rim Light)
    const hemiLight = new HemisphericLight('titleHemi', new Vector3(0, 1, 0), this.scene);
    hemiLight.intensity = 0.65;
    hemiLight.diffuse = new Color3(0.42, 0.65, 0.62);
    hemiLight.groundColor = new Color3(0.05, 0.08, 0.07);

    // Key Moonlight (Silvery white-gold)
    const keyMoon = new DirectionalLight('titleKeyMoon', new Vector3(-0.6, -1.2, 0.8), this.scene);
    keyMoon.position = new Vector3(12, 24, -15);
    keyMoon.intensity = 1.35;
    keyMoon.diffuse = new Color3(0.92, 0.95, 1.0);

    // Dramatic Cyan Rim Light (Hits Lin Yun from behind-left to carve her silhouette)
    const rimLight = new DirectionalLight('titleRim', new Vector3(0.8, 0.2, -0.9), this.scene);
    rimLight.position = new Vector3(-10, 8, 12);
    rimLight.intensity = 2.1;
    rimLight.diffuse = Color3.FromHexString('#00f0ff');

    // Soft Gold Conduit Fill Light
    const conduitLight = new PointLight('titleConduitGlow', new Vector3(0.5, 0.4, 0.2), this.scene);
    conduitLight.intensity = 1.2;
    conduitLight.range = 6.0;
    conduitLight.diffuse = Color3.FromHexString('#00ff88');

    // 4. Build Environment: Celestial Sanctuary Dais & Ancient Ruins
    this.buildRuinsEnvironment();

    // 5. Build Hero: 3D Lin Yun (Calm, dangerous, cyber-katana in hand)
    const { root, spine, head, tails } = this.buildLinYun();
    this.linYunNode = root;
    this.spineNode = spine;
    this.headNode = head;
    this.coatTails = tails;

    // 6. Build Far Distant Threat: Colossal Shenlong-09 Silhouette in Fog
    this.buildShenlongSilhouette();

    // 7. Atmosphere Particles (Rising jade and amber motes)
    this.spawnMotes();

    // 8. Post-Processing Pipeline (Cyan & Gold Neon Bloom)
    this.setupPostProcessing();

    // 9. Subtle Mouse Parallax Interaction
    this.handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      this.targetAlpha = -Math.PI / 2.32 + normX * 0.045;
      this.targetBeta = Math.PI / 2.18 + normY * 0.035;
    };
    window.addEventListener('mousemove', this.handleMouseMove);

    this.handleResize = () => {
      this.engine.resize();
      // On mobile / narrow screens, adjust camera target slightly to keep Lin Yun in frame
      const isNarrow = window.innerWidth < 768;
      this.camera.target.x = isNarrow ? 0.45 : 0.35;
      this.camera.radius = isNarrow ? 3.8 : 3.45;
    };
    window.addEventListener('resize', this.handleResize);
    this.handleResize();

    // 10. Render Loop with Cinematic Subtle Motion
    let lastTime = performance.now();
    this.engine.runRenderLoop(() => {
      if (this.isDisposed) return;
      const now = performance.now();
      const delta = (now - lastTime) * 0.001;
      lastTime = now;

      // Smooth camera parallax interpolation
      this.camera.alpha += (this.targetAlpha - this.camera.alpha) * Math.min(1, delta * 3.5);
      this.camera.beta += (this.targetBeta - this.camera.beta) * Math.min(1, delta * 3.5);

      // Hero breathing & coat idle motion
      const breath = Math.sin(now * 0.0018);
      this.spineNode.rotation.x = breath * 0.015;
      this.headNode.rotation.x = -breath * 0.01;
      this.coatTails.forEach((tail, idx) => {
        tail.rotation.x = 0.12 + Math.sin(now * 0.0022 + idx * 0.8) * 0.035;
      });

      // Distant dragon eyes slow pulse
      const eyePulse = 0.65 + Math.sin(now * 0.0012) * 0.35;
      this.shenlongEyes.forEach(eye => {
        const mat = eye.material as StandardMaterial;
        if (mat) {
          mat.emissiveColor = new Color3(0, 0.95 * eyePulse, 1.0 * eyePulse);
        }
      });

      this.scene.render();
    });
  }

  private buildLinYun() {
    // Parent root on the right side of the dais, angled 3/4 towards the misty horizon
    const root = new TransformNode('titleLinYun', this.scene);
    root.position = new Vector3(0.72, 0.22, 0.15);
    root.rotation = new Vector3(0, -Math.PI / 5.2, 0);

    // --- Premium Stylized Materials ---
    // Deep Midnight Navy Armor
    const armorMat = new StandardMaterial('titleLinYunArmor', this.scene);
    armorMat.diffuseColor = Color3.FromHexString('#0f172a');
    armorMat.specularColor = new Color3(0.45, 0.65, 0.85);
    armorMat.specularPower = 48;

    // Glowing Jade/Cyan Circuit Trim
    const circuitMat = new StandardMaterial('titleLinYunCircuit', this.scene);
    circuitMat.diffuseColor = new Color3(0.01, 0.14, 0.18);
    circuitMat.emissiveColor = Color3.FromHexString('#00f0ff');
    circuitMat.specularColor = new Color3(0.6, 0.9, 0.8);

    // Imperial Gold Accents
    const goldMat = new StandardMaterial('titleLinYunGold', this.scene);
    goldMat.diffuseColor = new Color3(0.85, 0.68, 0.22);
    goldMat.emissiveColor = new Color3(0.32, 0.22, 0.04);
    goldMat.specularColor = new Color3(1.0, 0.85, 0.4);

    // Porcelain Skin
    const skinMat = new StandardMaterial('titleLinYunSkin', this.scene);
    skinMat.diffuseColor = new Color3(0.95, 0.88, 0.83);

    // Raven Black Hair
    const hairMat = new StandardMaterial('titleLinYunHair', this.scene);
    hairMat.diffuseColor = new Color3(0.04, 0.05, 0.08);

    // --- Hierarchy ---
    // Pelvis
    const hipsNode = new TransformNode('titleHips', this.scene);
    hipsNode.parent = root;
    hipsNode.position.y = 0.92;

    const pelvis = MeshBuilder.CreateBox('titlePelvis', { width: 0.35, height: 0.22, depth: 0.24 }, this.scene);
    pelvis.parent = hipsNode;
    pelvis.material = armorMat;

    const sash = MeshBuilder.CreateBox('titleSash', { width: 0.37, height: 0.08, depth: 0.26 }, this.scene);
    sash.parent = hipsNode;
    sash.position.y = 0.07;
    sash.material = goldMat;

    // Spine & Chest
    const spine = new TransformNode('titleSpine', this.scene);
    spine.parent = hipsNode;
    spine.position.y = 0.14;

    const chest = new TransformNode('titleChest', this.scene);
    chest.parent = spine;
    chest.position.y = 0.22;

    const cuirass = MeshBuilder.CreateCylinder('titleCuirass', {
      height: 0.44,
      diameterTop: 0.45,
      diameterBottom: 0.32,
      tessellation: 16
    }, this.scene);
    cuirass.parent = chest;
    cuirass.position.y = 0.14;
    cuirass.material = armorMat;

    const chestCore = MeshBuilder.CreateBox('titleChestCore', { width: 0.07, height: 0.16, depth: 0.04 }, this.scene);
    chestCore.parent = chest;
    chestCore.position = new Vector3(0, 0.14, 0.18);
    chestCore.material = circuitMat;

    // Head, Visor & Anime Styled Bun
    const head = new TransformNode('titleHead', this.scene);
    head.parent = chest;
    head.position.y = 0.42;

    const headMesh = MeshBuilder.CreateSphere('titleHeadMesh', { diameter: 0.24, segments: 16 }, this.scene);
    headMesh.parent = head;
    headMesh.material = skinMat;

    const visor = MeshBuilder.CreateBox('titleVisor', { width: 0.22, height: 0.038, depth: 0.11 }, this.scene);
    visor.parent = head;
    visor.position = new Vector3(0, 0.04, 0.09);
    visor.material = circuitMat;

    // Anime styled dual buns, ponytail & crossed golden hairpins
    const hairTop = MeshBuilder.CreateSphere('titleHairTop', { diameter: 0.27, segments: 14 }, this.scene);
    hairTop.parent = head;
    hairTop.position = new Vector3(0, 0.07, -0.04);
    hairTop.material = hairMat;

    const hairBunL = MeshBuilder.CreateSphere('titleHairBunL', { diameter: 0.13, segments: 10 }, this.scene);
    hairBunL.parent = head;
    hairBunL.position = new Vector3(-0.12, 0.14, -0.08);
    hairBunL.material = hairMat;

    const hairBunR = MeshBuilder.CreateSphere('titleHairBunR', { diameter: 0.13, segments: 10 }, this.scene);
    hairBunR.parent = head;
    hairBunR.position = new Vector3(0.12, 0.14, -0.08);
    hairBunR.material = hairMat;

    const ponytail = MeshBuilder.CreateCylinder('titlePonytail', { height: 0.38, diameterTop: 0.08, diameterBottom: 0.02, tessellation: 10 }, this.scene);
    ponytail.parent = head;
    ponytail.position = new Vector3(0, -0.08, -0.16);
    ponytail.rotation.x = -0.32;
    ponytail.material = hairMat;

    // Crossed Imperial Gold Hairpins
    const hairPin1 = MeshBuilder.CreateCylinder('titleHairPin1', { height: 0.34, diameter: 0.016 }, this.scene);
    hairPin1.parent = head;
    hairPin1.position = new Vector3(0, 0.17, -0.08);
    hairPin1.rotation = new Vector3(0.1, 0, Math.PI / 3.2);
    hairPin1.material = goldMat;

    const hairPin2 = MeshBuilder.CreateCylinder('titleHairPin2', { height: 0.34, diameter: 0.016 }, this.scene);
    hairPin2.parent = head;
    hairPin2.position = new Vector3(0, 0.17, -0.08);
    hairPin2.rotation = new Vector3(-0.1, 0, -Math.PI / 3.2);
    hairPin2.material = goldMat;

    [-1, 1].forEach(side => {
      const pinOrb = MeshBuilder.CreateSphere(`titlePinOrb_${side}`, { diameter: 0.04 }, this.scene);
      pinOrb.parent = head;
      pinOrb.position = new Vector3(side * 0.16, 0.24, -0.08);
      pinOrb.material = circuitMat;
    });

    // Asymmetric Armor Shoulder (Left)
    const leftShoulder = new TransformNode('titleLShoulder', this.scene);
    leftShoulder.parent = chest;
    leftShoulder.position = new Vector3(-0.28, 0.24, 0);

    const leftPauldron = MeshBuilder.CreateBox('titleLPauldron', { width: 0.28, height: 0.12, depth: 0.2 }, this.scene);
    leftPauldron.parent = leftShoulder;
    leftPauldron.position.y = 0.06;
    leftPauldron.material = goldMat;

    const leftArm = MeshBuilder.CreateCylinder('titleLArm', { height: 0.52, diameter: 0.1, tessellation: 12 }, this.scene);
    leftArm.parent = leftShoulder;
    leftArm.position = new Vector3(0, -0.22, 0.04);
    leftArm.rotation = new Vector3(0.2, 0.15, 0.1);
    leftArm.material = armorMat;

    // Right Weapon Arm & Cyber-Katana (Held low, angled dangerous & calm)
    const rightShoulder = new TransformNode('titleRShoulder', this.scene);
    rightShoulder.parent = chest;
    rightShoulder.position = new Vector3(0.28, 0.22, 0);

    const rightArm = MeshBuilder.CreateCylinder('titleRArm', { height: 0.54, diameter: 0.1, tessellation: 12 }, this.scene);
    rightArm.parent = rightShoulder;
    rightArm.position = new Vector3(0.04, -0.24, 0.08);
    rightArm.rotation = new Vector3(0.32, -0.12, -0.15);
    rightArm.material = armorMat;

    const hand = new TransformNode('titleHand', this.scene);
    hand.parent = rightShoulder;
    hand.position = new Vector3(0.06, -0.52, 0.16);
    hand.rotation = new Vector3(0.4, 0.25, -0.3);

    // Cyber Katana
    const bladeMat = new StandardMaterial('titleBladeMat', this.scene);
    bladeMat.diffuseColor = new Color3(0.65, 0.95, 1.0);
    bladeMat.emissiveColor = Color3.FromHexString('#00f0ff');
    bladeMat.specularPower = 128;

    const blade = MeshBuilder.CreateBox('titleBlade', { width: 0.032, height: 1.15, depth: 0.015 }, this.scene);
    blade.parent = hand;
    blade.position.y = 0.54;
    blade.material = bladeMat;

    const guard = MeshBuilder.CreateCylinder('titleGuard', { height: 0.02, diameter: 0.16, tessellation: 8 }, this.scene);
    guard.parent = hand;
    guard.material = goldMat;

    const hilt = MeshBuilder.CreateCylinder('titleHilt', { height: 0.26, diameter: 0.034 }, this.scene);
    hilt.parent = hand;
    hilt.position.y = -0.14;
    hilt.material = hairMat;

    // Legs (Planted firmly on dais)
    [-0.12, 0.12].forEach((x, idx) => {
      const leg = MeshBuilder.CreateCylinder(`titleLeg_${idx}`, { height: 0.88, diameter: 0.14, tessellation: 12 }, this.scene);
      leg.parent = root;
      leg.position = new Vector3(x, 0.44, 0);
      leg.material = armorMat;
    });

    // Flowing Coat Tails
    const tails: Mesh[] = [];
    [-1, 1].forEach(side => {
      const tail = MeshBuilder.CreatePlane(`titleCoatTail_${side}`, { width: 0.28, height: 0.75 }, this.scene);
      tail.parent = hipsNode;
      tail.position = new Vector3(side * 0.14, -0.36, -0.11);
      tail.rotation = new Vector3(0.12, side * 0.2, 0);
      tail.material = armorMat;
      tails.push(tail);
    });

    return { root, spine, head, tails };
  }

  private buildRuinsEnvironment() {
    const stoneMat = new StandardMaterial('titleStoneMat', this.scene);
    stoneMat.diffuseColor = new Color3(0.16, 0.20, 0.22);
    stoneMat.specularColor = new Color3(0.15, 0.2, 0.2);
    stoneMat.specularPower = 24;

    const darkBasalt = new StandardMaterial('titleBasaltMat', this.scene);
    darkBasalt.diffuseColor = new Color3(0.08, 0.10, 0.12);

    const runeMat = new StandardMaterial('titleRuneMat', this.scene);
    runeMat.diffuseColor = new Color3(0.02, 0.20, 0.14);
    runeMat.emissiveColor = Color3.FromHexString('#00ff88');

    // Central Ancient Dais (Lin Yun stands atop it)
    const dais = MeshBuilder.CreateCylinder('titleDais', {
      height: 0.45,
      diameter: 7.5,
      tessellation: 36
    }, this.scene);
    dais.position = new Vector3(0.6, 0, 0);
    dais.material = stoneMat;

    // Glowing Jade Ring embedded in Dais
    const runicRing = MeshBuilder.CreateTorus('titleDaisRing', {
      diameter: 4.8,
      thickness: 0.08,
      tessellation: 36
    }, this.scene);
    runicRing.position = new Vector3(0.6, 0.23, 0);
    runicRing.material = runeMat;

    // Ancient Weathered Torii Gateway (Left Midground)
    const toriiRoot = new TransformNode('titleTorii', this.scene);
    toriiRoot.position = new Vector3(-2.8, 0, 3.8);
    toriiRoot.rotation.y = 0.28;

    [-1.8, 1.8].forEach((x, idx) => {
      const column = MeshBuilder.CreateCylinder(`toriiCol_${idx}`, { height: 5.6, diameter: 0.55, tessellation: 12 }, this.scene);
      column.parent = toriiRoot;
      column.position = new Vector3(x, 2.8, 0);
      column.material = darkBasalt;
    });

    const lintel = MeshBuilder.CreateBox('toriiLintel', { width: 5.2, height: 0.42, depth: 0.65 }, this.scene);
    lintel.parent = toriiRoot;
    lintel.position.y = 5.4;
    lintel.material = darkBasalt;

    const toriiRune = MeshBuilder.CreateBox('toriiRune', { width: 3.4, height: 0.06, depth: 0.68 }, this.scene);
    toriiRune.parent = toriiRoot;
    toriiRune.position = new Vector3(0, 4.9, 0);
    toriiRune.material = runeMat;

    // Broken Stone Relics & Monoliths
    const monolith = MeshBuilder.CreateBox('titleMonolith', { width: 0.9, height: 3.8, depth: 0.75 }, this.scene);
    monolith.position = new Vector3(-1.6, 1.8, 1.8);
    monolith.rotation = new Vector3(0.1, 0.4, -0.15);
    monolith.material = stoneMat;

    // Distant Sky Monoliths (Floating fractured remnants of celestial architecture)
    for (let i = 0; i < 5; i++) {
      const shard = MeshBuilder.CreateBox(`skyShard_${i}`, { width: 1.8, height: 7.2, depth: 1.2 }, this.scene);
      shard.position = new Vector3(-18 + i * 9, 14 + (i % 3) * 5, 24 + i * 6);
      shard.rotation = new Vector3(0.2, i * 0.7, 0.15);
      shard.material = darkBasalt;
    }
  }

  private buildShenlongSilhouette() {
    // Shenlong-09: Colossal, shrouded in distance & fog
    const dragonRoot = new TransformNode('titleShenlong', this.scene);
    dragonRoot.position = new Vector3(-7.5, 12.0, 36.0);
    dragonRoot.rotation = new Vector3(0.12, 0.42, -0.08);

    const dragonMat = new StandardMaterial('titleDragonMat', this.scene);
    dragonMat.diffuseColor = new Color3(0.02, 0.04, 0.07);
    dragonMat.emissiveColor = new Color3(0.01, 0.03, 0.05);

    const hornMat = new StandardMaterial('titleDragonHornMat', this.scene);
    hornMat.diffuseColor = new Color3(0.45, 0.35, 0.12);
    hornMat.emissiveColor = new Color3(0.15, 0.11, 0.03);

    const eyeMat = new StandardMaterial('titleDragonEyeMat', this.scene);
    eyeMat.diffuseColor = new Color3(0, 0.9, 1.0);
    eyeMat.emissiveColor = Color3.FromHexString('#00f0ff');
    eyeMat.disableLighting = true;

    // Colossal Skull & Muzzle
    const skull = MeshBuilder.CreatePolyhedron('titleDragonSkull', { type: 2, size: 6.2 }, this.scene);
    skull.parent = dragonRoot;
    skull.scaling = new Vector3(1.1, 0.8, 1.4);
    skull.material = dragonMat;

    const muzzle = MeshBuilder.CreateBox('titleDragonMuzzle', { width: 3.8, height: 1.8, depth: 4.2 }, this.scene);
    muzzle.parent = dragonRoot;
    muzzle.position = new Vector3(0, -0.8, 3.8);
    muzzle.material = dragonMat;

    // Horns
    [-2.2, 2.2].forEach((x, idx) => {
      const horn = MeshBuilder.CreateCylinder(`titleDHorn_${idx}`, { height: 7.5, diameterTop: 0.2, diameterBottom: 1.1 }, this.scene);
      horn.parent = dragonRoot;
      horn.position = new Vector3(x, 3.8, -1.2);
      horn.rotation = new Vector3(-0.6, 0, (idx === 0 ? -1 : 1) * 0.45);
      horn.material = hornMat;
    });

    // Glowing Cyan Eyes Piercing the Mist
    [-1.6, 1.6].forEach((x, idx) => {
      const eye = MeshBuilder.CreateSphere(`titleDEye_${idx}`, { diameter: 0.95 }, this.scene);
      eye.parent = dragonRoot;
      eye.position = new Vector3(x, 0.6, 2.8);
      eye.material = eyeMat;
      this.shenlongEyes.push(eye);
    });

    // Sinuous Serpentine Body Arc extending into upper mist
    for (let i = 1; i <= 6; i++) {
      const seg = MeshBuilder.CreateCylinder(`titleDSeg_${i}`, { height: 4.5, diameter: 4.2 - i * 0.35, tessellation: 12 }, this.scene);
      seg.parent = dragonRoot;
      seg.position = new Vector3(-i * 2.8, Math.sin(i * 0.8) * 3.2, -i * 4.8);
      seg.rotation = new Vector3(0.4, i * 0.3, 0.2);
      seg.material = dragonMat;
    }
  }

  private spawnMotes() {
    const motes = new ParticleSystem('titleMotes', 75, this.scene);
    motes.createPointEmitter(new Vector3(-6, -0.5, -4), new Vector3(8, 6, 16));
    motes.color1 = new Color4(0.0, 0.95, 1.0, 0.65);
    motes.color2 = new Color4(0.95, 0.78, 0.25, 0.45);
    motes.colorDead = new Color4(0, 0, 0, 0);
    motes.minSize = 0.03;
    motes.maxSize = 0.12;
    motes.minLifeTime = 4.5;
    motes.maxLifeTime = 8.5;
    motes.emitRate = 14;
    motes.direction1 = new Vector3(-0.15, 0.35, 0.1);
    motes.direction2 = new Vector3(0.25, 0.75, 0.3);
    motes.start();
  }

  private setupPostProcessing() {
    try {
      this.pipeline = new DefaultRenderingPipeline('titlePipeline', true, this.scene, [this.camera]);
      this.pipeline.bloomEnabled = true;
      this.pipeline.bloomThreshold = 0.65;
      this.pipeline.bloomWeight = 0.42;
      this.pipeline.bloomKernel = 64;
      this.pipeline.bloomScale = 0.5;
      this.pipeline.fxaaEnabled = true;
      this.pipeline.imageProcessingEnabled = true;
      this.pipeline.imageProcessing.contrast = 1.1;
      this.pipeline.imageProcessing.exposure = 1.15;
    } catch (e) {
      console.warn('[TitleScene3D] Post-processing pipeline unavailable:', e);
    }
  }

  public dispose() {
    this.isDisposed = true;
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('resize', this.handleResize);
    this.pipeline?.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}

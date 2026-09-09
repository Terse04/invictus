import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  ShadowGenerator
} from '@babylonjs/core';

export class Environment3D {
  private scene: Scene;
  private shadowGenerator: ShadowGenerator;
  public groundMeshes: Mesh[] = [];

  constructor(scene: Scene, shadowGenerator: ShadowGenerator) {
    this.scene = scene;
    this.shadowGenerator = shadowGenerator;

    this.buildCelestialRuins();
  }

  private buildCelestialRuins() {
    // 1. Materials
    const stoneMat = new StandardMaterial('ancientStoneMat', this.scene);
    stoneMat.diffuseColor = new Color3(0.12, 0.16, 0.22); // Deep slate stone
    stoneMat.specularColor = new Color3(0.2, 0.3, 0.4);
    stoneMat.emissiveColor = new Color3(0.01, 0.03, 0.06);

    const circuitMat = new StandardMaterial('circuitMat', this.scene);
    circuitMat.diffuseColor = new Color3(0.08, 0.12, 0.18);
    circuitMat.emissiveColor = new Color3(0.0, 0.45, 0.65); // Cyan energy vein

    const sanctumMat = new StandardMaterial('sanctumMat', this.scene);
    sanctumMat.diffuseColor = new Color3(0.07, 0.10, 0.16);
    sanctumMat.emissiveColor = new Color3(0.35, 0.25, 0.05); // Imperial Gold Circuit

    // 2. Zone 1: Awakening Terrace (Circular Plaza at 0, 0, 0)
    const terrace = MeshBuilder.CreateCylinder('terraceGround', {
      height: 1.0,
      diameter: 28,
      tessellation: 32
    }, this.scene);
    terrace.position = new Vector3(0, -0.5, 0);
    terrace.checkCollisions = true;
    terrace.receiveShadows = true;
    terrace.material = stoneMat;
    this.groundMeshes.push(terrace);

    // Columns around Zone 1
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.createPillar(new Vector3(Math.cos(angle) * 12, 0, Math.sin(angle) * 12), stoneMat, circuitMat);
    }

    // Pathway 1 -> 2
    this.createBridge(new Vector3(0, -0.5, 17.5), 6.0, 15.0, stoneMat);

    // 3. Zone 2: Archivist's Sanctuary (Shrine at 0, 0, 35)
    const sanctuary = MeshBuilder.CreateBox('sanctuaryGround', {
      width: 22,
      height: 1.0,
      depth: 22
    }, this.scene);
    sanctuary.position = new Vector3(0, -0.5, 35);
    sanctuary.checkCollisions = true;
    sanctuary.receiveShadows = true;
    sanctuary.material = stoneMat;
    this.groundMeshes.push(sanctuary);

    // Shrine Pagoda Pillars
    this.createPillar(new Vector3(-9, 0, 26), stoneMat, circuitMat);
    this.createPillar(new Vector3(9, 0, 26), stoneMat, circuitMat);
    this.createPillar(new Vector3(-9, 0, 44), stoneMat, circuitMat);
    this.createPillar(new Vector3(9, 0, 44), stoneMat, circuitMat);

    // Pathway 2 -> 3
    this.createBridge(new Vector3(0, -0.5, 54), 6.0, 16.0, stoneMat);

    // 4. Zone 3: The Sunken Colonnade (Tiered Platform at 0, 0, 75)
    const colonnade = MeshBuilder.CreateBox('colonnadeGround', {
      width: 32,
      height: 1.0,
      depth: 32
    }, this.scene);
    colonnade.position = new Vector3(0, -0.5, 75);
    colonnade.checkCollisions = true;
    colonnade.receiveShadows = true;
    colonnade.material = stoneMat;
    this.groundMeshes.push(colonnade);

    // Colonnade Pillars
    for (let z = 62; z <= 88; z += 8) {
      this.createPillar(new Vector3(-14, 0, z), stoneMat, circuitMat);
      this.createPillar(new Vector3(14, 0, z), stoneMat, circuitMat);
    }

    // Pathway 3 -> 4
    this.createBridge(new Vector3(0, -0.5, 98), 7.0, 16.0, stoneMat);

    // 5. Zone 4: The Thunder Gate (Mini-Boss Courtyard at 0, 0, 120)
    const thunderCourt = MeshBuilder.CreateBox('thunderCourtGround', {
      width: 36,
      height: 1.0,
      depth: 36
    }, this.scene);
    thunderCourt.position = new Vector3(0, -0.5, 120);
    thunderCourt.checkCollisions = true;
    thunderCourt.receiveShadows = true;
    thunderCourt.material = stoneMat;
    this.groundMeshes.push(thunderCourt);

    // Courtyard perimeter battlements
    this.createWall(new Vector3(-18, 1.5, 120), 1.0, 3.0, 36, stoneMat);
    this.createWall(new Vector3(18, 1.5, 120), 1.0, 3.0, 36, stoneMat);

    // Pathway 4 -> 5
    this.createBridge(new Vector3(0, -0.5, 145), 7.0, 16.0, stoneMat);

    // 6. Zone 5: The Dragon Sanctum (Massive Grand Arena at 0, 0, 180)
    const sanctum = MeshBuilder.CreateCylinder('dragonSanctumGround', {
      height: 1.5,
      diameter: 54,
      tessellation: 48
    }, this.scene);
    sanctum.position = new Vector3(0, -0.75, 180);
    sanctum.checkCollisions = true;
    sanctum.receiveShadows = true;
    sanctum.material = sanctumMat;
    this.groundMeshes.push(sanctum);

    // Spire Obelisks overlooking the void
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.cos(angle) * 25;
      const z = 180 + Math.sin(angle) * 25;
      this.createPillar(new Vector3(x, 0, z), stoneMat, sanctumMat, 6.5);
    }

    // Distant 3D Mountain Silhouettes in Background
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const mx = Math.cos(angle) * 120;
      const mz = 90 + Math.sin(angle) * 120;
      const mountain = MeshBuilder.CreateCylinder(`mountain_${i}`, {
        height: 60 + Math.random() * 30,
        diameterTop: 0,
        diameterBottom: 45 + Math.random() * 20,
        tessellation: 5
      }, this.scene);
      mountain.position = new Vector3(mx, -10, mz);
      const mMat = new StandardMaterial(`mMat_${i}`, this.scene);
      mMat.diffuseColor = new Color3(0.04, 0.06, 0.10);
      mountain.material = mMat;
    }
  }

  private createPillar(pos: Vector3, baseMat: StandardMaterial, energyMat: StandardMaterial, height = 4.5) {
    const pillar = MeshBuilder.CreateCylinder('pillar', {
      height,
      diameterTop: 0.8,
      diameterBottom: 0.95,
      tessellation: 16
    }, this.scene);
    pillar.position = pos.clone();
    pillar.position.y += height / 2;
    pillar.checkCollisions = true;
    pillar.material = baseMat;
    this.shadowGenerator.addShadowCaster(pillar);

    // Energy Conduit Ring
    const ring = MeshBuilder.CreateTorus('pillarRing', {
      diameter: 1.1,
      thickness: 0.15,
      tessellation: 16
    }, this.scene);
    ring.position = pos.clone();
    ring.position.y += height * 0.65;
    ring.material = energyMat;
  }

  private createBridge(pos: Vector3, width: number, depth: number, mat: StandardMaterial) {
    const bridge = MeshBuilder.CreateBox('bridge', {
      width,
      height: 1.0,
      depth
    }, this.scene);
    bridge.position = pos.clone();
    bridge.checkCollisions = true;
    bridge.receiveShadows = true;
    bridge.material = mat;
    this.groundMeshes.push(bridge);
  }

  private createWall(pos: Vector3, width: number, height: number, depth: number, mat: StandardMaterial) {
    const wall = MeshBuilder.CreateBox('wall', {
      width,
      height,
      depth
    }, this.scene);
    wall.position = pos.clone();
    wall.checkCollisions = true;
    wall.material = mat;
  }
}

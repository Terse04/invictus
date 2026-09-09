import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
  ShadowGenerator,
  ParticleSystem,
  Texture
} from '@babylonjs/core';

export class Environment3D {
  private scene: Scene;
  private shadowGenerator: ShadowGenerator;
  public groundMeshes: Mesh[] = [];
  public floatingElements: Mesh[] = [];

  constructor(scene: Scene, shadowGenerator: ShadowGenerator) {
    this.scene = scene;
    this.shadowGenerator = shadowGenerator;

    this.buildCelestialRuins();
    this.spawnAtmosphericParticles();
  }

  private buildCelestialRuins() {
    // --- 1. Distinct Material Hierarchy ---
    // Dark Weathered Slate Stone
    const stoneMat = new StandardMaterial('slateStoneMat', this.scene);
    stoneMat.diffuseColor = new Color3(0.11, 0.14, 0.19);
    stoneMat.specularColor = new Color3(0.25, 0.35, 0.45);
    stoneMat.specularPower = 32;

    // Inlaid Cyan Plasma Conduits
    const conduitMat = new StandardMaterial('conduitMat', this.scene);
    conduitMat.diffuseColor = new Color3(0.02, 0.25, 0.35);
    conduitMat.emissiveColor = new Color3(0.0, 0.88, 1.0);
    conduitMat.specularColor = new Color3(0.8, 1.0, 1.0);

    // Imperial Gold Carved Filigree
    const goldMat = new StandardMaterial('goldMat', this.scene);
    goldMat.diffuseColor = new Color3(0.8, 0.65, 0.18);
    goldMat.emissiveColor = new Color3(0.35, 0.24, 0.05);

    // Weathered Dark Obsidian Metal
    const metalMat = new StandardMaterial('metalMat', this.scene);
    metalMat.diffuseColor = new Color3(0.06, 0.08, 0.12);
    metalMat.specularColor = new Color3(0.6, 0.7, 0.85);

    // Distant Atmospheric Mountain Silhouette
    const mountainMat = new StandardMaterial('mountainMat', this.scene);
    mountainMat.diffuseColor = new Color3(0.03, 0.05, 0.09);
    mountainMat.emissiveColor = new Color3(0.02, 0.03, 0.06);

    // --- 2. Zone 1: Awakening Terrace (Grand Inlaid Plaza) ---
    const terrace = MeshBuilder.CreateCylinder('terraceGround', {
      height: 1.2,
      diameter: 28,
      tessellation: 32
    }, this.scene);
    terrace.position = new Vector3(0, -0.6, 0);
    terrace.checkCollisions = true;
    terrace.receiveShadows = true;
    terrace.material = stoneMat;
    this.groundMeshes.push(terrace);

    // Inlaid Cyan Energy Mandala in Floor
    const innerPlaza = MeshBuilder.CreateCylinder('innerMandala', {
      height: 1.22,
      diameter: 14,
      tessellation: 32
    }, this.scene);
    innerPlaza.position = new Vector3(0, -0.59, 0);
    innerPlaza.receiveShadows = true;
    innerPlaza.material = metalMat;
    this.groundMeshes.push(innerPlaza);

    // Radial Energy Conduits
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI;
      const conduitLine = MeshBuilder.CreateBox(`terraceConduit_${i}`, {
        width: 0.35,
        height: 1.24,
        depth: 26
      }, this.scene);
      conduitLine.position = new Vector3(0, -0.58, 0);
      conduitLine.rotation.y = angle;
      conduitLine.material = conduitMat;
    }

    // Broken Balustrades around perimeter
    for (let i = 0; i < 12; i++) {
      if (i === 5 || i === 6 || i === 7) continue; // Gap for the bridge exit
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.cos(angle) * 13.2;
      const z = Math.sin(angle) * 13.2;

      const post = MeshBuilder.CreateBox(`balustrade_${i}`, {
        width: 0.6,
        height: 1.4,
        depth: 0.6
      }, this.scene);
      post.position = new Vector3(x, 0.7, z);
      post.rotation.y = -angle;
      post.material = stoneMat;
      post.checkCollisions = true;
      this.shadowGenerator.addShadowCaster(post);
    }

    // Torii Archway over Awakening Terrace Exit
    this.createToriiGate(new Vector3(0, 0, 14.5), stoneMat, metalMat, conduitMat, goldMat);

    // --- 3. Pathway 1 -> 2: Suspended Bridge over Abyss ---
    this.createSuspendedBridge(new Vector3(0, 0, 24), 5.5, 16.0, stoneMat, conduitMat);

    // --- 4. Zone 2: Archivist's Sanctuary (Shrine of Elder Yan) ---
    // Multi-tier stepped dais
    const tier1 = MeshBuilder.CreateBox('sanctuaryTier1', { width: 22, height: 1.0, depth: 22 }, this.scene);
    tier1.position = new Vector3(0, -0.5, 42);
    tier1.checkCollisions = true;
    tier1.receiveShadows = true;
    tier1.material = stoneMat;
    this.groundMeshes.push(tier1);

    const tier2 = MeshBuilder.CreateBox('sanctuaryTier2', { width: 14, height: 0.8, depth: 14 }, this.scene);
    tier2.position = new Vector3(0, 0.4, 42);
    tier2.checkCollisions = true;
    tier2.receiveShadows = true;
    tier2.material = metalMat;
    this.groundMeshes.push(tier2);

    // 4 Grand Carved Shrine Columns with glowing crowns
    const shrinePillarCoords = [
      new Vector3(-8.5, 0, 34),
      new Vector3(8.5, 0, 34),
      new Vector3(-8.5, 0, 50),
      new Vector3(8.5, 0, 50)
    ];
    shrinePillarCoords.forEach(pos => {
      this.createGrandPillar(pos, 8.5, stoneMat, conduitMat, goldMat);
    });

    // Floating Stele Array around Sanctuary
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const stele = MeshBuilder.CreateBox(`floatingStele_${i}`, { width: 0.7, height: 2.8, depth: 0.2 }, this.scene);
      stele.position = new Vector3(Math.cos(angle) * 8.5, 3.2, 42 + Math.sin(angle) * 8.5);
      stele.rotation.y = angle;
      stele.material = conduitMat;
      this.floatingElements.push(stele);
    }

    // --- 5. Pathway 2 -> 3: Fractured Chasm & Stepping Stones ---
    this.createFracturedChasm(new Vector3(0, 0, 62), stoneMat, conduitMat);

    // --- 6. Zone 3: The Sunken Colonnade (Elevated Battlegrounds) ---
    const colonnade = MeshBuilder.CreateBox('colonnadeGround', { width: 34, height: 1.2, depth: 36 }, this.scene);
    colonnade.position = new Vector3(0, -0.6, 88);
    colonnade.checkCollisions = true;
    colonnade.receiveShadows = true;
    colonnade.material = stoneMat;
    this.groundMeshes.push(colonnade);

    // Double row of Ruined & Asymmetrical Pillars along the walkway
    for (let z = 74; z <= 102; z += 7) {
      const heightL = 6.0 + (z % 3) * 1.5;
      const heightR = 7.0 - (z % 2) * 1.8;
      this.createGrandPillar(new Vector3(-13, 0, z), heightL, stoneMat, conduitMat, goldMat);
      this.createGrandPillar(new Vector3(13, 0, z), heightR, stoneMat, conduitMat, goldMat);
    }

    // Central Energy Conduit leading towards the boss arenas
    const centralVein = MeshBuilder.CreateBox('centralVein', { width: 1.2, height: 1.24, depth: 36 }, this.scene);
    centralVein.position = new Vector3(0, -0.58, 88);
    centralVein.material = conduitMat;

    // --- 7. Pathway 3 -> 4: Grand Viaduct Bridge ---
    this.createSuspendedBridge(new Vector3(0, 0, 114), 7.0, 16.0, stoneMat, conduitMat);

    // --- 8. Zone 4: Thunder Gate (Mini-Boss Arena - Centurion Lei-Guan) ---
    const thunderArena = MeshBuilder.CreateCylinder('thunderArena', {
      height: 1.4,
      diameter: 36,
      tessellation: 36
    }, this.scene);
    thunderArena.position = new Vector3(0, -0.7, 138);
    thunderArena.checkCollisions = true;
    thunderArena.receiveShadows = true;
    thunderArena.material = stoneMat;
    this.groundMeshes.push(thunderArena);

    // Octagonal Thunder Ring Monoliths
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 16.5;
      const z = 138 + Math.sin(angle) * 16.5;
      this.createGrandPillar(new Vector3(x, 0, z), 10.5, metalMat, conduitMat, goldMat);
    }

    // Torii Gate to Sanctum
    this.createToriiGate(new Vector3(0, 0, 155), stoneMat, metalMat, conduitMat, goldMat);

    // --- 9. Zone 5: Dragon Sanctum (Main Boss Arena - Shenlong-09) ---
    const sanctum = MeshBuilder.CreateCylinder('sanctumGround', {
      height: 1.6,
      diameter: 54,
      tessellation: 48
    }, this.scene);
    sanctum.position = new Vector3(0, -0.8, 192);
    sanctum.checkCollisions = true;
    sanctum.receiveShadows = true;
    sanctum.material = stoneMat;
    this.groundMeshes.push(sanctum);

    // Concentric Inlaid Celestial Sigils in Dragon Arena
    for (let r = 10; r <= 22; r += 6) {
      const ring = MeshBuilder.CreateTorus(`sanctumRing_${r}`, {
        diameter: r * 2,
        thickness: 0.35,
        tessellation: 48
      }, this.scene);
      ring.position = new Vector3(0, 0.02, 192);
      ring.material = conduitMat;
    }

    // Colossal Dragon-Horn Monoliths surrounding Sanctum
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * 24.5;
      const z = 192 + Math.sin(angle) * 24.5;

      const hornPillar = MeshBuilder.CreateCylinder(`hornPillar_${i}`, {
        height: 16.0,
        diameterTop: 0.8,
        diameterBottom: 2.6,
        tessellation: 12
      }, this.scene);
      hornPillar.position = new Vector3(x, 8.0, z);
      hornPillar.rotation.z = Math.cos(angle) * 0.15;
      hornPillar.material = stoneMat;
      this.shadowGenerator.addShadowCaster(hornPillar);
    }

    // --- 10. Distant Background Layer (Epic Sense of Scale) ---
    this.buildBackgroundScenery(mountainMat, conduitMat);
  }

  private createGrandPillar(pos: Vector3, height: number, stoneMat: StandardMaterial, conduitMat: StandardMaterial, goldMat: StandardMaterial) {
    // Column Shaft
    const shaft = MeshBuilder.CreateCylinder('pillarShaft', {
      height: height,
      diameter: 1.3,
      tessellation: 16
    }, this.scene);
    shaft.position = pos.add(new Vector3(0, height / 2, 0));
    shaft.material = stoneMat;
    shaft.checkCollisions = true;
    this.shadowGenerator.addShadowCaster(shaft);

    // Ornate Capital / Crown
    const capital = MeshBuilder.CreateBox('pillarCap', {
      width: 1.8,
      height: 0.6,
      depth: 1.8
    }, this.scene);
    capital.parent = shaft;
    capital.position.y = height / 2 - 0.3;
    capital.material = goldMat;

    // Glowing Conduit Collar
    const collar = MeshBuilder.CreateCylinder('pillarCollar', {
      height: 0.25,
      diameter: 1.45,
      tessellation: 16
    }, this.scene);
    collar.parent = shaft;
    collar.position.y = height / 2 - 0.8;
    collar.material = conduitMat;
  }

  private createToriiGate(pos: Vector3, stoneMat: StandardMaterial, metalMat: StandardMaterial, conduitMat: StandardMaterial, goldMat: StandardMaterial) {
    const gateNode = new Mesh('toriiRoot', this.scene);
    gateNode.position = pos;

    // Left & Right Pillars
    const leftPillar = MeshBuilder.CreateCylinder('toriiLeft', { height: 7.5, diameter: 0.9 }, this.scene);
    leftPillar.parent = gateNode;
    leftPillar.position = new Vector3(-4.2, 3.75, 0);
    leftPillar.material = metalMat;
    leftPillar.checkCollisions = true;

    const rightPillar = MeshBuilder.CreateCylinder('toriiRight', { height: 7.5, diameter: 0.9 }, this.scene);
    rightPillar.parent = gateNode;
    rightPillar.position = new Vector3(4.2, 3.75, 0);
    rightPillar.material = metalMat;
    rightPillar.checkCollisions = true;

    // Curved Upper Kasagi Lintelle
    const kasagi = MeshBuilder.CreateBox('toriiKasagi', { width: 11.0, height: 0.65, depth: 1.1 }, this.scene);
    kasagi.parent = gateNode;
    kasagi.position = new Vector3(0, 7.3, 0);
    kasagi.material = stoneMat;

    // Glowing Cyber-Rune Core in Arch
    const core = MeshBuilder.CreateBox('toriiCore', { width: 8.5, height: 0.15, depth: 0.3 }, this.scene);
    core.parent = gateNode;
    core.position = new Vector3(0, 6.2, 0);
    core.material = conduitMat;

    this.shadowGenerator.addShadowCaster(leftPillar);
    this.shadowGenerator.addShadowCaster(rightPillar);
    this.shadowGenerator.addShadowCaster(kasagi);
  }

  private createSuspendedBridge(pos: Vector3, width: number, length: number, stoneMat: StandardMaterial, conduitMat: StandardMaterial) {
    const bridge = MeshBuilder.CreateBox('bridge', { width: width, height: 0.8, depth: length }, this.scene);
    bridge.position = pos.add(new Vector3(0, -0.4, 0));
    bridge.checkCollisions = true;
    bridge.receiveShadows = true;
    bridge.material = stoneMat;
    this.groundMeshes.push(bridge);

    // Glowing edge guide rails
    const railL = MeshBuilder.CreateBox('railL', { width: 0.2, height: 0.6, depth: length }, this.scene);
    railL.parent = bridge;
    railL.position = new Vector3(-width / 2 + 0.1, 0.5, 0);
    railL.material = conduitMat;

    const railR = MeshBuilder.CreateBox('railR', { width: 0.2, height: 0.6, depth: length }, this.scene);
    railR.parent = bridge;
    railR.position = new Vector3(width / 2 - 0.1, 0.5, 0);
    railR.material = conduitMat;
  }

  private createFracturedChasm(pos: Vector3, stoneMat: StandardMaterial, conduitMat: StandardMaterial) {
    // Suspended stepping stone platforms across the abyss
    const platformOffsets = [
      new Vector3(-1.8, 0, -4),
      new Vector3(1.6, 0.3, 0),
      new Vector3(-1.4, 0.6, 4)
    ];

    platformOffsets.forEach((offset, idx) => {
      const plat = MeshBuilder.CreateBox(`steppingStone_${idx}`, { width: 4.8, height: 0.9, depth: 3.5 }, this.scene);
      plat.position = pos.add(offset);
      plat.checkCollisions = true;
      plat.receiveShadows = true;
      plat.material = stoneMat;
      this.groundMeshes.push(plat);

      // Glowing underglow plate
      const underglow = MeshBuilder.CreateBox(`underglow_${idx}`, { width: 4.6, height: 0.1, depth: 3.3 }, this.scene);
      underglow.parent = plat;
      underglow.position.y = -0.46;
      underglow.material = conduitMat;

      this.floatingElements.push(plat);
    });
  }

  private buildBackgroundScenery(mountainMat: StandardMaterial, conduitMat: StandardMaterial) {
    // 1. Massive Distant Mountain Silhouettes
    const mountainPositions = [
      new Vector3(-110, 20, 140),
      new Vector3(110, 25, 150),
      new Vector3(-80, 18, 240),
      new Vector3(80, 22, 230),
      new Vector3(0, 30, 290)
    ];

    mountainPositions.forEach((pos, idx) => {
      const mountain = MeshBuilder.CreateCylinder(`distantMountain_${idx}`, {
        height: 90,
        diameterTop: 0,
        diameterBottom: 110,
        tessellation: 5
      }, this.scene);
      mountain.position = pos;
      mountain.material = mountainMat;
    });

    // 2. Colossal Celestial Sky Ring (Suspended in the heavens)
    const skyRing = MeshBuilder.CreateTorus('skyRing', {
      diameter: 160,
      thickness: 4.5,
      tessellation: 64
    }, this.scene);
    skyRing.position = new Vector3(0, 75, 260);
    skyRing.rotation.x = Math.PI / 4;
    skyRing.material = conduitMat;
    this.floatingElements.push(skyRing);

    // 3. Floating Island Fragments Drifting in Sky
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const island = MeshBuilder.CreatePolyhedron(`floatingIsland_${i}`, {
        type: 1,
        size: 5 + (i % 3) * 2
      }, this.scene);
      island.position = new Vector3(
        Math.cos(angle) * 75,
        18 + (i % 4) * 5,
        100 + Math.sin(angle) * 75
      );
      island.material = mountainMat;
      this.floatingElements.push(island);
    }
  }

  private spawnAtmosphericParticles() {
    // Ambient Floating Cyan Energy Embers / Motes
    const emberParticles = new ParticleSystem('celestialEmbers', 180, this.scene);
    emberParticles.createPointEmitter(new Vector3(-25, -2, -10), new Vector3(25, 12, 240));
    emberParticles.color1 = new Color4(0.0, 0.85, 1.0, 0.85);
    emberParticles.color2 = new Color4(0.4, 0.95, 1.0, 0.85);
    emberParticles.colorDead = new Color4(0, 0, 0, 0);
    emberParticles.minSize = 0.08;
    emberParticles.maxSize = 0.22;
    emberParticles.minLifeTime = 3.5;
    emberParticles.maxLifeTime = 7.0;
    emberParticles.emitRate = 25;
    emberParticles.gravity = new Vector3(0, 0.45, 0);
    emberParticles.minEmitPower = 0.3;
    emberParticles.maxEmitPower = 0.9;
    emberParticles.start();
  }
}

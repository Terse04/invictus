import {
  Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Color4, Vector3,
  ShadowGenerator, ParticleSystem, VertexBuffer
} from '@babylonjs/core';
import { QualityProfile } from '../QualitySettings';

/** A single traversable sanctuary: terrain first, ruins and jade technology second. */
export class Environment3D {
  public groundMeshes: Mesh[] = [];
  public floatingElements: Mesh[] = [];
  public summonBeamMesh: Mesh | null = null;
  public awakeningSealMesh: Mesh | null = null;
  private readonly scene: Scene;
  private readonly shadows: ShadowGenerator;
  private readonly quality: QualityProfile;
  private readonly chapter: 1 | 2;

  constructor(scene: Scene, shadowGenerator: ShadowGenerator, quality: QualityProfile, chapter: 1 | 2 = 1) {
    this.scene = scene;
    this.shadows = shadowGenerator;
    this.quality = quality;
    this.chapter = chapter;
    this.buildSanctuary();
    this.spawnAtmosphere();
  }

  private buildSanctuary() {
    if (this.chapter === 2) { this.buildAbyssalFoundry(); return; }
    const grass = this.material('terrainGrass', new Color3(0.13, 0.21, 0.14), new Color3(0.015, 0.03, 0.02));
    const path = this.material('weatheredPath', new Color3(0.28, 0.27, 0.21), new Color3(0.03, 0.025, 0.015));
    const stone = this.material('mossStone', new Color3(0.24, 0.28, 0.23), new Color3(0.015, 0.025, 0.015));
    const darkStone = this.material('ruinObsidian', new Color3(0.105, 0.13, 0.13), new Color3(0.008, 0.012, 0.011));
    const jade = this.material('jadeRune', new Color3(0.03, 0.23, 0.15), new Color3(0.02, 0.48, 0.27));
    const amber = this.material('amberRune', new Color3(0.28, 0.17, 0.05), new Color3(0.36, 0.16, 0.02));

    // One uninterrupted terrain mesh replaces isolated platforms and chasms.
    const terrain = MeshBuilder.CreateGround('celestialSanctuaryTerrain', { width: 150, height: 270, subdivisions: 100 }, this.scene);
    const vertices = terrain.getVerticesData(VertexBuffer.PositionKind)!;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      const roadFalloff = Math.min(1, Math.abs(x) / 12);
      vertices[i + 1] = roadFalloff * (Math.sin(x * 0.22 + z * 0.03) * 0.8 + Math.cos(z * 0.075) * 0.45) - Math.pow(Math.abs(x) / 75, 3) * 2.1;
    }
    terrain.updateVerticesData(VertexBuffer.PositionKind, vertices);
    terrain.position.z = 100;
    terrain.checkCollisions = true;
    terrain.receiveShadows = true;
    terrain.material = grass;
    this.groundMeshes.push(terrain);
    this.createSafetyBounds();

    // A stone road visually grounds the intended traversal route while terrain remains continuous underneath.
    const road = MeshBuilder.CreateGround('ancientStoneRoad', { width: 8.2, height: 245, subdivisions: 48 }, this.scene);
    road.position = new Vector3(0, 0.035, 100);
    road.receiveShadows = true;
    road.material = path;
    this.groundMeshes.push(road);
    for (let z = -10; z < 218; z += 7) {
      const seam = MeshBuilder.CreateBox(`roadSeam_${z}`, { width: 7.9, height: 0.06, depth: 0.14 }, this.scene);
      seam.position = new Vector3(0, 0.08, z);
      seam.material = darkStone;
    }

    this.createTerrace(new Vector3(0, 0.18, 0), 25, 0.5, stone);
    this.createAwakeningSeal(stone, darkStone, jade);
    this.createTorii(new Vector3(0, 0.3, 16), darkStone, jade);
    this.createTerrace(new Vector3(0, 0.18, 42), 19, 0.42, stone);
    this.createTorii(new Vector3(0, 0.3, 64), darkStone, jade);
    this.createColonnade(stone, jade);
    this.createTerrace(new Vector3(0, 0.18, 138), 32, 0.48, stone);
    this.createTorii(new Vector3(0, 0.3, 158), darkStone, jade);
    this.createTerrace(new Vector3(0, 0.18, 192), 50, 0.5, darkStone, jade, true);
    this.createTransmutationLandmarks(darkStone, jade, amber);

    this.scatterNature(stone, grass);
    this.buildSky(amber);
  }

  private buildAbyssalFoundry() {
    const basalt = this.material('foundryBasalt', Color3.FromHexString('#181517'), new Color3(0.006, 0.004, 0.004));
    const bronze = this.material('foundryBronze', new Color3(0.23, 0.10, 0.035), new Color3(0.07, 0.018, 0.004));
    const magma = this.material('foundryMagma', new Color3(0.34, 0.025, 0.002), Color3.FromHexString('#ff3b00'));
    const ground = MeshBuilder.CreateGround('abyssalFoundryFloor', { width: 100, height: 250, subdivisions: 32 }, this.scene);
    ground.position.z = 100; ground.material = basalt; ground.receiveShadows = true; ground.checkCollisions = true; this.groundMeshes.push(ground);
    this.createSafetyBounds();
    const road = MeshBuilder.CreateGround('foundryCauseway', { width: 10, height: 240 }, this.scene);
    road.position = new Vector3(0, 0.04, 100); road.material = bronze; road.receiveShadows = true; this.groundMeshes.push(road);
    [-6.2, 6.2].forEach(side => {
      const conduit = MeshBuilder.CreateBox(`magmaConduit_${side}`, { width: 1.1, height: 0.16, depth: 238 }, this.scene);
      conduit.position = new Vector3(side, 0.08, 100); conduit.material = magma;
    });
    [24, 80, 142, 192].forEach((z, index) => {
      this.createTerrace(new Vector3(0, 0.22, z), index === 3 ? 48 : 25, 0.55, basalt, magma, index === 3);
      [-1, 1].forEach(side => {
        const pylon = MeshBuilder.CreateCylinder(`foundryPylon_${z}_${side}`, { height: 8, diameterTop: 0.45, diameterBottom: 1.2, tessellation: 12 }, this.scene);
        pylon.position = new Vector3(side * 12, 4, z); pylon.material = bronze; this.shadows.addShadowCaster(pylon);
        const exhaust = MeshBuilder.CreateSphere(`slagCauldron_${z}_${side}`, { diameter: 1.2, segments: 12 }, this.scene);
        exhaust.position = new Vector3(side * 12, 1.1, z + 2); exhaust.material = magma;
      });
    });
    this.buildSky(magma);
  }

  private createSafetyBounds() {
    const catchFloor = MeshBuilder.CreateGround('sanctuaryCatchFloor', { width: 54, height: 250 }, this.scene);
    catchFloor.position = new Vector3(0, -2, 100);
    catchFloor.checkCollisions = true;
    catchFloor.visibility = 0;

    const walls = [
      { name: 'sanctuaryWallWest', position: new Vector3(-26, 3, 100), width: 0.5, depth: 250 },
      { name: 'sanctuaryWallEast', position: new Vector3(26, 3, 100), width: 0.5, depth: 250 },
      { name: 'sanctuaryWallSouth', position: new Vector3(0, 3, -21), width: 52, depth: 0.5 },
      { name: 'sanctuaryWallNorth', position: new Vector3(0, 3, 221), width: 52, depth: 0.5 }
    ];
    walls.forEach(wall => {
      const mesh = MeshBuilder.CreateBox(wall.name, { width: wall.width, height: 8, depth: wall.depth }, this.scene);
      mesh.position = wall.position;
      mesh.checkCollisions = true;
      mesh.visibility = 0;
    });
  }

  /** Large landmarks are sparse on purpose: they create a civilization, not prop noise. */
  private createTransmutationLandmarks(ruin: StandardMaterial, jade: StandardMaterial, amber: StandardMaterial) {
    // A shattered guardian on the approach — Chinese influence is dominant.
    const statue = new Mesh('fallenCelestialGuardian', this.scene);
    statue.position = new Vector3(-22, 0, 48);
    const torso = MeshBuilder.CreateCylinder('guardianTorso', { height: 9, diameterTop: 3.3, diameterBottom: 4.3, tessellation: 9 }, this.scene);
    torso.parent = statue; torso.position.y = 4.2; torso.rotation.z = -0.34; torso.material = ruin;
    const head = MeshBuilder.CreatePolyhedron('guardianMask', { type: 1, size: 3.1 }, this.scene);
    head.parent = statue; head.position = new Vector3(-1.1, 8.4, 0.2); head.material = ruin;
    const halo = MeshBuilder.CreateTorus('guardianBrokenHalo', { diameter: 6.2, thickness: 0.2, tessellation: 24 }, this.scene);
    halo.parent = statue; halo.position = new Vector3(-1.3, 8.7, -0.2); halo.rotation.x = Math.PI / 2; halo.material = jade;
    this.shadows.addShadowCaster(torso); this.shadows.addShadowCaster(head);

    // Ancient power conduits make the technology physical rather than a surface glow.
    [-1, 1].forEach((side) => {
      const conduit = MeshBuilder.CreateTube(`jadeConduit_${side}`, {
        path: [new Vector3(side * 6, 0.25, 108), new Vector3(side * 8, 1.4, 124), new Vector3(side * 5, 0.5, 142)],
        radius: 0.18, tessellation: 8
      }, this.scene);
      conduit.material = jade;
      const housing = MeshBuilder.CreateCylinder(`conduitHousing_${side}`, { height: 1.8, diameter: 1.2, tessellation: 8 }, this.scene);
      housing.position = new Vector3(side * 6, 0.8, 108); housing.material = ruin; this.shadows.addShadowCaster(housing);
    });

    // Restrained convergence clues: a distant bronze arch and buried solar relic, never a theme park.
    const bronzeHint = this.material('distantBronzeConvergence', new Color3(0.25, 0.14, 0.05), new Color3(0.03, 0.012, 0.002));
    const arch = MeshBuilder.CreateTorus('distantBronzeArch', { diameter: 12, thickness: 0.55, tessellation: 18 }, this.scene);
    arch.position = new Vector3(34, 6.5, 136); arch.rotation.x = Math.PI / 2; arch.material = bronzeHint;
    const solarRelic = MeshBuilder.CreateDisc('buriedSolarRelic', { radius: 3.4, tessellation: 12 }, this.scene);
    solarRelic.position = new Vector3(-29, 0.35, 112); solarRelic.rotation.x = Math.PI / 2; solarRelic.material = amber;

    // Dragon Sanctum: deliberately circular, tall, and mechanically alive.
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const pylon = MeshBuilder.CreateCylinder(`sanctumPylon_${i}`, { height: 8 + (i % 2) * 2.2, diameterTop: 0.24, diameterBottom: 1.1, tessellation: 7 }, this.scene);
      pylon.position = new Vector3(Math.cos(angle) * 19, 4, 192 + Math.sin(angle) * 19); pylon.material = ruin; this.shadows.addShadowCaster(pylon);
      const emitter = MeshBuilder.CreateSphere(`sanctumEmitter_${i}`, { diameter: 0.42, segments: 8 }, this.scene);
      emitter.parent = pylon; emitter.position.y = 4.1; emitter.material = jade;
    }
    const reactor = MeshBuilder.CreateCylinder('sanctumReactor', { height: 0.6, diameter: 9, tessellation: 32 }, this.scene);
    reactor.position = new Vector3(0, 0.35, 192); reactor.material = amber;
  }

  private material(name: string, diffuse: Color3, emissive: Color3) {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = diffuse;
    material.emissiveColor = emissive;
    material.specularColor = new Color3(0.12, 0.15, 0.12);
    material.specularPower = 24;
    return material;
  }

  private createTerrace(pos: Vector3, diameter: number, height: number, stone: StandardMaterial, rune?: StandardMaterial, hasRunicRing = false) {
    const terrace = MeshBuilder.CreateCylinder(`terrace_${pos.z}`, { height, diameter, tessellation: 40 }, this.scene);
    terrace.position = pos.subtract(new Vector3(0, height / 2, 0));
    terrace.checkCollisions = true;
    terrace.receiveShadows = true;
    terrace.material = stone;
    this.groundMeshes.push(terrace);
    if (hasRunicRing && rune) {
      const ring = MeshBuilder.CreateTorus(`runeRing_${pos.z}`, { diameter: diameter * 0.58, thickness: 0.12, tessellation: 40 }, this.scene);
      ring.position = pos.add(new Vector3(0, 0.04, 0));
      ring.material = rune;
    }
  }

  private createAwakeningSeal(stone: StandardMaterial, darkStone: StandardMaterial, jade: StandardMaterial) {
    const sealRoot = new Mesh('awakeningSealRoot', this.scene);
    sealRoot.position = new Vector3(0, 0.19, -5);
    this.awakeningSealMesh = sealRoot;

    // 1. Concentric Runic Dais
    const dais = MeshBuilder.CreateCylinder('awakeningDais', { height: 0.18, diameter: 7.2, tessellation: 36 }, this.scene);
    dais.parent = sealRoot;
    dais.material = darkStone;
    dais.receiveShadows = true;
    dais.checkCollisions = true;
    this.groundMeshes.push(dais);

    // Inner and Outer Jade Conduit Rings
    const outerRing = MeshBuilder.CreateTorus('sealOuterRing', { diameter: 6.2, thickness: 0.08, tessellation: 36 }, this.scene);
    outerRing.parent = sealRoot;
    outerRing.position.y = 0.1;
    outerRing.material = jade;

    const innerRing = MeshBuilder.CreateTorus('sealInnerRing', { diameter: 3.4, thickness: 0.06, tessellation: 28 }, this.scene);
    innerRing.parent = sealRoot;
    innerRing.position.y = 0.1;
    innerRing.material = jade;

    // 6 Perimeter Jade Circuit Relic Nodes
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const nodeX = Math.cos(angle) * 3.1;
      const nodeZ = Math.sin(angle) * 3.1;

      const pylon = MeshBuilder.CreateCylinder(`sealPylon_${i}`, { height: 0.75, diameter: 0.42, tessellation: 8 }, this.scene);
      pylon.parent = sealRoot;
      pylon.position = new Vector3(nodeX, 0.4, nodeZ);
      pylon.material = stone;
      this.shadows.addShadowCaster(pylon);

      const orb = MeshBuilder.CreateSphere(`sealOrb_${i}`, { diameter: 0.22 }, this.scene);
      orb.parent = pylon;
      orb.position.y = 0.45;
      orb.material = jade;
    }

    // 2. Vertical Celestial Quantum Summoning Beam
    const beamMat = new StandardMaterial('summonBeamMat', this.scene);
    beamMat.diffuseColor = new Color3(0.0, 0.8, 0.6);
    beamMat.emissiveColor = Color3.FromHexString('#00f0ff');
    beamMat.alpha = 0;
    beamMat.backFaceCulling = false;

    this.summonBeamMesh = MeshBuilder.CreateCylinder('celestialSummonBeam', {
      height: 38,
      diameterTop: 2.8,
      diameterBottom: 2.2,
      tessellation: 24
    }, this.scene);
    this.summonBeamMesh.position = new Vector3(0, 19, -5);
    this.summonBeamMesh.material = beamMat;
    this.summonBeamMesh.isVisible = false;
  }

  public triggerSummonBeam(duration = 2600) {
    if (!this.summonBeamMesh) return;
    this.summonBeamMesh.isVisible = true;
    const mat = this.summonBeamMesh.material as StandardMaterial;
    if (!mat) return;

    const start = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const t = elapsed / duration;

      if (t < 0.25) {
        // Rapid flash in
        mat.alpha = (t / 0.25) * 0.82;
      } else if (t < 0.7) {
        // Holding celestial column
        mat.alpha = 0.82;
      } else if (t < 1.0) {
        // Dissipating into celestial atmosphere
        mat.alpha = 0.82 * (1 - (t - 0.7) / 0.3);
      } else {
        mat.alpha = 0;
        this.summonBeamMesh!.isVisible = false;
        window.clearInterval(timer);
      }
    }, 16);
  }

  private createTorii(pos: Vector3, stone: StandardMaterial, rune: StandardMaterial) {
    const root = new Mesh(`weatheredTorii_${pos.z}`, this.scene);
    root.position = pos;

    const goldMat = this.material('toriiGold', new Color3(0.3, 0.22, 0.08), new Color3(0.85, 0.65, 0.15));

    [-1, 1].forEach((side) => {
      const post = MeshBuilder.CreateCylinder(`toriiPost_${pos.z}_${side}`, { height: 6.2, diameter: 0.76, tessellation: 12 }, this.scene);
      post.parent = root;
      post.position = new Vector3(side * 3.65, 3.1, 0);
      post.material = stone;
      post.checkCollisions = true;
      this.shadows.addShadowCaster(post);

      // Stone base plinths
      const plinth = MeshBuilder.CreateBox(`toriiPlinth_${pos.z}_${side}`, { width: 1.1, height: 0.45, depth: 1.1 }, this.scene);
      plinth.parent = root;
      plinth.position = new Vector3(side * 3.65, 0.22, 0);
      plinth.material = stone;

      // Hanging Bronze Celestial Lanterns
      const lantern = MeshBuilder.CreateCylinder(`toriiLantern_${pos.z}_${side}`, { height: 0.75, diameterTop: 0.35, diameterBottom: 0.25, tessellation: 6 }, this.scene);
      lantern.parent = root;
      lantern.position = new Vector3(side * 2.8, 4.4, 0);
      lantern.material = goldMat;

      const lanternCore = MeshBuilder.CreateSphere(`lanternCore_${pos.z}_${side}`, { diameter: 0.22 }, this.scene);
      lanternCore.parent = lantern;
      lanternCore.position.y = 0;
      lanternCore.material = rune;
    });

    // Main Lintel beam
    const lintel = MeshBuilder.CreateBox(`toriiLintel_${pos.z}`, { width: 10.4, height: 0.55, depth: 0.85 }, this.scene);
    lintel.parent = root;
    lintel.position.y = 5.95;
    lintel.material = stone;
    this.shadows.addShadowCaster(lintel);

    // Sweeping Winged Eaves (Chinese Temple Roof Cornice)
    [-1, 1].forEach((side) => {
      const eaveWing = MeshBuilder.CreateBox(`toriiEaveWing_${pos.z}_${side}`, { width: 1.6, height: 0.35, depth: 0.9 }, this.scene);
      eaveWing.parent = root;
      eaveWing.position = new Vector3(side * 5.2, 6.35, 0);
      eaveWing.rotation.z = side * -0.28;
      eaveWing.material = stone;
    });

    // Glowing Jade Inscribed Rune Bar
    const runeBand = MeshBuilder.CreateBox(`toriiRune_${pos.z}`, { width: 6.2, height: 0.1, depth: 0.88 }, this.scene);
    runeBand.parent = root;
    runeBand.position = new Vector3(0, 5.25, 0.02);
    runeBand.material = rune;
  }

  private createColonnade(stone: StandardMaterial, rune: StandardMaterial) {
    for (let z = 76; z <= 103; z += 6.5) {
      [-1, 1].forEach((side) => {
        const column = MeshBuilder.CreateCylinder(`buriedColumn_${z}_${side}`, { height: 4.3 + (z % 3), diameter: 0.9, tessellation: 10 }, this.scene);
        column.position = new Vector3(side * 10.5, column.getBoundingInfo().boundingBox.extendSize.y, z);
        column.rotation.z = side * 0.09;
        column.material = stone;
        column.checkCollisions = true;
        this.shadows.addShadowCaster(column);
        const glyph = MeshBuilder.CreateCylinder(`columnGlyph_${z}_${side}`, { height: 0.12, diameter: 1.01, tessellation: 10 }, this.scene);
        glyph.parent = column;
        glyph.position.y = 0.45;
        glyph.material = rune;
      });
    }
  }

  private scatterNature(stone: StandardMaterial, grass: StandardMaterial) {
    const rock = MeshBuilder.CreatePolyhedron('boulderSource', { type: 2, size: 1.7 }, this.scene);
    rock.material = stone;
    rock.isVisible = false;
    const grassBladeA = MeshBuilder.CreatePlane('grassBladeSourceA', { width: 0.16, height: 0.62 }, this.scene);
    grassBladeA.material = grass;
    grassBladeA.isVisible = false;
    const grassBladeB = MeshBuilder.CreatePlane('grassBladeSourceB', { width: 0.16, height: 0.62 }, this.scene);
    grassBladeB.material = grass;
    grassBladeB.isVisible = false;
    for (let i = 0; i < 72; i++) {
      const x = ((i * 37) % 120) - 60;
      const z = ((i * 53) % 245) - 18;
      if (Math.abs(x) < 10) continue;
      const boulder = rock.createInstance(`boulder_${i}`);
      boulder.position = new Vector3(x, 0.55, z);
      boulder.scaling = new Vector3(0.55 + (i % 3) * 0.18, 0.45 + (i % 2) * 0.22, 0.65 + (i % 4) * 0.1);
      boulder.rotation = new Vector3(0.1 * (i % 4), i * 0.7, 0.15 * (i % 2));
      const grassX = x + (i % 2 ? 1.2 : -1.2);
      const grassZ = z + 1;
      const grassPatchA = grassBladeA.createInstance(`grassA_${i}`);
      grassPatchA.position = new Vector3(grassX, 0.55, grassZ);
      grassPatchA.rotation.y = i * 0.43;
      const grassPatchB = grassBladeB.createInstance(`grassB_${i}`);
      grassPatchB.position = new Vector3(grassX, 0.55, grassZ);
      grassPatchB.rotation.y = i * 0.43 + Math.PI / 2;
    }
  }

  private buildSky(amber: StandardMaterial) {
    const sky = MeshBuilder.CreateSphere('celestialSky', { diameter: 900, segments: 16, sideOrientation: Mesh.BACKSIDE }, this.scene);
    const skyMat = this.material('cloudedDawnSky', new Color3(0.13, 0.20, 0.28), new Color3(0.025, 0.045, 0.075));
    skyMat.backFaceCulling = false;
    sky.material = skyMat;
    const moon = MeshBuilder.CreateDisc('distantMoon', { radius: 16, tessellation: 40 }, this.scene);
    moon.position = new Vector3(-58, 48, 190);
    moon.billboardMode = Mesh.BILLBOARDMODE_ALL;
    moon.material = amber;

    // Sparse distant ruins add mythic depth without expensive sky geometry or heavy particles.
    const ruinStone = this.material('celestialRuinStone', new Color3(0.12, 0.17, 0.18), new Color3(0.012, 0.025, 0.026));
    const runeStone = this.material('celestialRuinRune', new Color3(0.03, 0.13, 0.14), new Color3(0, 0.2, 0.19));
    for (let i = 0; i < 7; i++) {
      const root = new Mesh(`floatingSkyRuin_${i}`, this.scene);
      const x = -46 + i * 15;
      const y = 18 + (i % 4) * 7;
      const z = 68 + i * 16;
      root.position = new Vector3(x, y, z);
      root.rotation = new Vector3((i % 2) * 0.12, i * 0.58, (i % 3 - 1) * 0.16);
      root.metadata = { baseY: y, bobPhase: i * 0.91 };
      this.floatingElements.push(root);

      if (i % 2 === 0) {
        const monolith = MeshBuilder.CreateBox(`skyMonolith_${i}`, { width: 1.4, height: 5.8, depth: 1.05 }, this.scene);
        monolith.parent = root;
        monolith.position.y = 0.6;
        monolith.rotation.z = 0.18;
        monolith.material = ruinStone;
        const shard = MeshBuilder.CreateBox(`skyMonolithShard_${i}`, { width: 0.85, height: 2.0, depth: 0.8 }, this.scene);
        shard.parent = root;
        shard.position = new Vector3(0.95, -2.1, 0.2);
        shard.rotation.z = -0.38;
        shard.material = runeStone;
      } else {
        [-1, 1].forEach(side => {
          const post = MeshBuilder.CreateCylinder(`skyToriiPost_${i}_${side}`, { height: 3.5, diameter: 0.38, tessellation: 10 }, this.scene);
          post.parent = root;
          post.position = new Vector3(side * 1.65, 0, 0);
          post.material = ruinStone;
        });
        const lintel = MeshBuilder.CreateBox(`skyToriiLintel_${i}`, { width: 4.4, height: 0.35, depth: 0.6 }, this.scene);
        lintel.parent = root;
        lintel.position = new Vector3(0, 1.55, 0);
        lintel.rotation.z = 0.11;
        lintel.material = runeStone;
      }
    }
    this.scene.onBeforeRenderObservable.add(() => {
      const time = performance.now() * 0.001;
      this.floatingElements.forEach(element => {
        const metadata = element.metadata as { baseY: number; bobPhase: number };
        element.position.y = metadata.baseY + Math.sin(time * 0.45 + metadata.bobPhase) * 0.65;
      });
    });
  }

  private spawnAtmosphere() {
    const motes = new ParticleSystem('windborneMotes', this.quality.particleCapacity, this.scene);
    motes.createPointEmitter(new Vector3(-50, 0, -20), new Vector3(50, 14, 235));
    motes.color1 = this.chapter === 2 ? new Color4(1.0, 0.45, 0.1, 0.8) : new Color4(0.68, 0.78, 0.55, 0.55);
    motes.color2 = this.chapter === 2 ? new Color4(1.0, 0.12, 0.02, 0.55) : new Color4(0.96, 0.69, 0.28, 0.38);
    motes.colorDead = new Color4(0, 0, 0, 0);
    motes.minSize = 0.025; motes.maxSize = 0.11;
    motes.minLifeTime = 4; motes.maxLifeTime = 8;
    motes.emitRate = this.quality.particleRate;
    motes.direction1 = this.chapter === 2 ? new Vector3(-0.15, 1.1, -0.1) : new Vector3(-0.2, 0.2, 0.1);
    motes.direction2 = this.chapter === 2 ? new Vector3(0.15, 2.0, 0.15) : new Vector3(0.2, 0.7, 0.5);
    motes.start();
  }
}

import {
  Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Color4, Vector3,
  ShadowGenerator, ParticleSystem, VertexBuffer
} from '@babylonjs/core';
import { QualityProfile } from '../QualitySettings';

/** A single traversable sanctuary: terrain first, ruins and jade technology second. */
export class Environment3D {
  public groundMeshes: Mesh[] = [];
  public floatingElements: Mesh[] = [];
  private readonly scene: Scene;
  private readonly shadows: ShadowGenerator;
  private readonly quality: QualityProfile;

  constructor(scene: Scene, shadowGenerator: ShadowGenerator, quality: QualityProfile) {
    this.scene = scene;
    this.shadows = shadowGenerator;
    this.quality = quality;
    this.buildSanctuary();
    this.spawnAtmosphere();
  }

  private buildSanctuary() {
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

    this.createTerrace(new Vector3(0, 0.18, 0), 25, 0.5, stone, jade);
    this.createTorii(new Vector3(0, 0.3, 16), darkStone, jade);
    this.createTerrace(new Vector3(0, 0.18, 42), 19, 0.42, stone, amber);
    this.createTorii(new Vector3(0, 0.3, 64), darkStone, jade);
    this.createColonnade(stone, jade);
    this.createTerrace(new Vector3(0, 0.18, 138), 32, 0.48, stone, amber);
    this.createTorii(new Vector3(0, 0.3, 158), darkStone, jade);
    this.createTerrace(new Vector3(0, 0.18, 192), 50, 0.5, stone, jade);
    this.createTransmutationLandmarks(darkStone, jade, amber);

    this.scatterNature(stone, grass);
    this.buildSky(amber);
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
    return material;
  }

  private createTerrace(pos: Vector3, diameter: number, height: number, stone: StandardMaterial, rune: StandardMaterial) {
    const terrace = MeshBuilder.CreateCylinder(`terrace_${pos.z}`, { height, diameter, tessellation: 40 }, this.scene);
    terrace.position = pos.subtract(new Vector3(0, height / 2, 0));
    terrace.checkCollisions = true;
    terrace.receiveShadows = true;
    terrace.material = stone;
    this.groundMeshes.push(terrace);
    const ring = MeshBuilder.CreateTorus(`runeRing_${pos.z}`, { diameter: diameter * 0.58, thickness: 0.12, tessellation: 40 }, this.scene);
    ring.position = pos.add(new Vector3(0, 0.04, 0));
    ring.material = rune;
  }

  private createTorii(pos: Vector3, stone: StandardMaterial, rune: StandardMaterial) {
    const root = new Mesh(`weatheredTorii_${pos.z}`, this.scene);
    root.position = pos;
    [-1, 1].forEach((side) => {
      const post = MeshBuilder.CreateCylinder(`toriiPost_${pos.z}_${side}`, { height: 5.6, diameter: 0.7, tessellation: 10 }, this.scene);
      post.parent = root;
      post.position = new Vector3(side * 3.45, 2.8, 0);
      post.material = stone;
      post.checkCollisions = true;
      this.shadows.addShadowCaster(post);
    });
    const lintel = MeshBuilder.CreateBox(`toriiLintel_${pos.z}`, { width: 9.1, height: 0.5, depth: 0.8 }, this.scene);
    lintel.parent = root;
    lintel.position.y = 5.45;
    lintel.rotation.z = 0.035;
    lintel.material = stone;
    const runeBand = MeshBuilder.CreateBox(`toriiRune_${pos.z}`, { width: 5.2, height: 0.08, depth: 0.84 }, this.scene);
    runeBand.parent = root;
    runeBand.position = new Vector3(0, 4.8, 0.02);
    runeBand.material = rune;
    this.shadows.addShadowCaster(lintel);
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
    const tuft = MeshBuilder.CreateCylinder('grassTuftSource', { height: 0.55, diameterTop: 0, diameterBottom: 0.35, tessellation: 4 }, this.scene);
    tuft.material = grass;
    tuft.isVisible = false;
    for (let i = 0; i < 72; i++) {
      const x = ((i * 37) % 120) - 60;
      const z = ((i * 53) % 245) - 18;
      if (Math.abs(x) < 10) continue;
      const boulder = rock.createInstance(`boulder_${i}`);
      boulder.position = new Vector3(x, 0.55, z);
      boulder.scaling = new Vector3(0.55 + (i % 3) * 0.18, 0.45 + (i % 2) * 0.22, 0.65 + (i % 4) * 0.1);
      boulder.rotation = new Vector3(0.1 * (i % 4), i * 0.7, 0.15 * (i % 2));
      const grassPatch = tuft.createInstance(`grass_${i}`);
      grassPatch.position = new Vector3(x + (i % 2 ? 1.2 : -1.2), 0.28, z + 1);
      grassPatch.rotation.y = i * 0.43;
      grassPatch.scaling = new Vector3(1 + (i % 3) * 0.3, 1, 1 + (i % 2) * 0.25);
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
    for (let i = 0; i < 7; i++) {
      const ridge = MeshBuilder.CreateCylinder(`mistMountain_${i}`, { height: 48 + i * 4, diameterTop: 0, diameterBottom: 45 + i * 8, tessellation: 5 }, this.scene);
      ridge.position = new Vector3(-100 + i * 34, 14 + i * 2, 150 + (i % 2) * 55);
      ridge.material = this.material(`mountainMat_${i}`, new Color3(0.12, 0.16, 0.17), new Color3(0.01, 0.02, 0.02));
    }
  }

  private spawnAtmosphere() {
    const motes = new ParticleSystem('windborneMotes', this.quality.particleCapacity, this.scene);
    motes.createPointEmitter(new Vector3(-50, 0, -20), new Vector3(50, 14, 235));
    motes.color1 = new Color4(0.68, 0.78, 0.55, 0.55);
    motes.color2 = new Color4(0.96, 0.69, 0.28, 0.38);
    motes.colorDead = new Color4(0, 0, 0, 0);
    motes.minSize = 0.025; motes.maxSize = 0.11;
    motes.minLifeTime = 4; motes.maxLifeTime = 8;
    motes.emitRate = this.quality.particleRate;
    motes.direction1 = new Vector3(-0.2, 0.2, 0.1); motes.direction2 = new Vector3(0.2, 0.7, 0.5);
    motes.start();
  }
}

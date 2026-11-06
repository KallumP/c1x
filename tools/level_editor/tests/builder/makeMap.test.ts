import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { LevelObject } from "../../src/objects";
import { BASE_LEVEL } from "../../builder/baseLevel";
import { readWords } from "../../builder/bytes";
import { BOX_HEIGHT, BOX_TYPE, ENEMY_ENTITIES, entityId, entityPath, entityPosition, entityType, WARP_PAD } from "../../builder/entities";
import { EID_NONE, stringToEid } from "../../builder/entryIds";
import type { RgbImage } from "../../builder/images";
import { ENTRY_SLST, ENTRY_WGEO, ENTRY_ZDAT, entriesById, PAGE_SOUNDS, PAGE_TEXTURE, readLevel, type Entry, type Level } from "../../builder/levelFiles";
import { CORE_EXEC_SLOTS } from "../../builder/cutLevel";
import type { Vec3 } from "../../builder/vectors";
import { LID_TEST, makeMap, type MapOptions } from "../../builder/makeMap";
import { textureWorlds } from "../../builder/mapTextures";
import { FOLLOW_CAM_MODE } from "../../builder/paths";
import { colour5551 } from "../../builder/tpage";
import { levelEntity, STONE_TRACK_LIFT, stoneTrack } from "../../builder/templates";
import { readWorldHeader, readWorldPolygon, readWorldVertex, TEXINFOS_AT } from "../../builder/worldGeometry";
import type { TileRegion, WorldMesh, WorldVertex } from "../../builder/worldMeshes";
import { ZONE_LOADLIST, ZONE_NEIGHBORS, ZONE_PATHS_IDX, zoneEntities, zoneOrigin, zoneWorldEids } from "../../builder/zones";

const STONE_RGB: [number, number, number] = [90, 90, 100];
const stone = (): RgbImage => ({ width: 32, height: 32, rgb: new Uint8Array(32 * 32 * 3).map((_, index) => STONE_RGB[index % 3]) });

describe("texturing world meshes", () => {
  test("each mesh holds only the texture regions it uses", () => {
    // a mesh header's texinfos are indexed by 12 bits of words, so each mesh lists its own
    const template = Buffer.concat([Buffer.from(new Uint32Array([0, 0, 0, 0, 0, 2, 1, 0]).buffer), Buffer.alloc(32), Buffer.from("TEX!TEX?")]);
    const a: TileRegion = { material: "stone", x: 0, y: 0, w: 32, h: 32, layout: 0 };
    const b: TileRegion = { material: "stone", x: 32, y: 0, w: 32, h: 32, layout: 0 };
    const vertices: WorldVertex[] = Array(3).fill({ at: [0, 0, 0], colour: [128, 128, 128] });
    const worlds: WorldMesh[] = [
      { vertices, polygons: [{ corners: [0, 1, 2], texture: a }, { corners: [0, 1, 2], texture: { ...a } }] },
      { vertices, polygons: [{ corners: [0, 1, 2], texture: b }] },
    ];
    const textured = textureWorlds(worlds, new Map([["stone", stone()]]), template);
    expect(textured.texinfos.map((texinfos) => texinfos.length)).toEqual([8, 8]); // one region (2 words) each
    expect(textured.worlds[0].polygons.map(({ texinfo }) => texinfo)).toEqual([2, 2]); // after the template's 2 words
    expect(textured.worlds[1].polygons.map(({ texinfo }) => texinfo)).toEqual([2]);
    expect(textured.texinfos[0].equals(textured.texinfos[1])).toBe(false);
  });
});

// a map as blender exports it: a floor 8 m by 16 m, a wall, and a spawn marker
const MAP_OBJ = `o Floor
v -4 0 -8
v -4 0 8
v 4 0 8
v 4 0 -8
f 1 2 3 4
o Wall
v 4 0 -8
v 4 2 -8
v 4 2 8
v 4 0 8
f 5 6 7 8
o Spawn
v 0 1 5
v 0.1 1 5
v 0 1.1 5
f 9 10 11
`;
const TEXTURED_OBJ = MAP_OBJ.replace("o Floor\n", "o Floor\nusemtl stone\n").replace("o Wall\n", "o Wall\nusemtl plain\n");
// a floor 100 m long: 40000 units at the default scale, so 3 zones of 16384
const LONG_OBJ = "o Floor\nv -4 0 -50\nv -4 0 50\nv 4 0 50\nv 4 0 -50\nf 1 2 3 4\n";

const STREAMS = fileURLToPath(new URL("../../../../streams", import.meta.url));
const hasBase = existsSync(`${STREAMS}/${BASE_LEVEL.file}.nsd`);
const N_SANITY_BEACH = 0x9;
const hasBeach = existsSync(`${STREAMS}/s0000009.nsd`);

const object = (kind: LevelObject["kind"], at: [number, number, number], more: Partial<LevelObject> = {}): LevelObject =>
  ({ kind, at, raise: 0, stack: 1, ...more });
const box = (at: [number, number, number], subtype: number, more: Partial<LevelObject> = {}) => object("box", at, { box: subtype, ...more });

interface Built {
  level: Level;
  entries: Map<number, Entry>;
  zone: Entry;
}

describe.skipIf(!hasBase)("making a level from a map", () => {
  const base = hasBase ? readLevel(STREAMS, BASE_LEVEL.lid) : null!;

  function make(text = MAP_OBJ, options: MapOptions = {}): Built {
    const level = makeMap(base, text, options);
    const entries = entriesById(level);
    return { level, entries, zone: entries.get(level.nsd.ldat.zoneSpawn)! };
  }

  const zoneCounts = (zone: Entry) => readWords(zone.items[0], ZONE_PATHS_IDX, 4);
  const crashAt = (zone: Entry) => entityPosition(zoneEntities(zone)[0]);
  const zonesOf = ({ entries }: Built) => [...entries.values()].filter((entry) => entry.type === ENTRY_ZDAT)
    .sort((first, second) => second.items[1].readInt32LE(8) - first.items[1].readInt32LE(8)); // from the start (+z)
  const warpPads = (built: Built) => zonesOf(built).flatMap((zone) =>
    zoneEntities(zone).filter((item) => entityType(item).join() === WARP_PAD.join()).map((item) => ({ zone, at: entityPosition(item) })));
  const boxes = (zone: Entry) => zoneEntities(zone).filter((item) => entityType(item)[0] === BOX_TYPE)
    .map((item) => ({ subtype: entityType(item)[1], id: entityId(item), at: entityPosition(item) }));
  const texturePages = (level: Level) => level.pages.filter((page) => page.type === PAGE_TEXTURE);
  const firstWorld = ({ entries, zone }: Built) => entries.get(zoneWorldEids(zone)[0])!;

  test("a map is one zone with its geometry and crash only", () => {
    const built = make();
    const { level, zone } = built;
    expect(level.nsd.ldat.lid).toBe(LID_TEST);
    const [pathsIndex, pathCount, entityCount] = zoneCounts(zone);
    expect([pathCount, entityCount]).toEqual([1, 1]);
    expect(entityType(zone.items[pathsIndex + 1])).toEqual([0, 0]); // crash
    expect(level.nsd.ldat.execMap.filter((eid) => eid !== EID_NONE).length).toBe(CORE_EXEC_SLOTS.length);
    const entriesOfType = (type: number) => [...built.entries.values()].filter((entry) => entry.type === type).length;
    expect([entriesOfType(ENTRY_ZDAT), entriesOfType(ENTRY_SLST)]).toEqual([1, 1]);
    expect(entriesOfType(ENTRY_WGEO)).toBe(zone.items[0].readUInt32LE(0));
  });

  test("its world meshes are its faces", () => {
    const header = readWorldHeader(firstWorld(make()).items[0]);
    expect(header.polygonCount).toBeGreaterThan(4); // floor and wall, sliced
  });

  test("its path uses the follow camera", () => {
    const { zone } = make();
    expect(zone.items[zoneCounts(zone)[0]].readUInt16LE(32)).toBe(FOLLOW_CAM_MODE);
  });

  test("crash starts on the ground at the spawn marker", () => {
    const [x, y, z] = crashAt(make(MAP_OBJ, { scale: 256 }).zone);
    // the floor's corner is at the zone's corner plus a cell of margin
    expect(Math.abs(x - (128 + 4 * 256))).toBeLessThanOrEqual(16); // the marker's middle, on multiples of 8
    expect(z).toBe(128 + 5 * 256 + 8 * 256);
    expect(y).toBeGreaterThan(128);
    expect(y).toBeLessThanOrEqual(128 + 128);
  });

  test("a spawn object puts crash where it is", () => {
    // blender (2, -3, 0) is the .obj's (2, 0, 3): on the floor, away from the marker
    const [x, y, z] = crashAt(make(MAP_OBJ, { scale: 256, objects: [object("spawn", [2, -3, 0])] }).zone);
    expect(Math.abs(x - (128 + 6 * 256))).toBeLessThanOrEqual(16);
    expect(Math.abs(z - (128 + 11 * 256))).toBeLessThanOrEqual(16);
    expect(y).toBeGreaterThan(128);
    expect(y).toBeLessThanOrEqual(128 + 128);
  });

  test("a raised spawn object puts crash in the air", () => {
    const [, y] = crashAt(make(MAP_OBJ, { scale: 256, objects: [object("spawn", [2, -3, 1.5], { raise: 0.25 })] }).zone);
    expect(Math.abs(y - (128 + 1.75 * 256 + 100))).toBeLessThanOrEqual(8); // the floor's at 128; crash is kept 100 up
  });

  test("an end object puts a warp pad where it is, with its code", () => {
    // blender (-2, 4, 0) is the .obj's (-2, 0, -4)
    const built = make(MAP_OBJ, { scale: 256, objects: [object("end", [-2, 4, 0])] });
    const [pad] = warpPads(built);
    expect(warpPads(built).length).toBe(1);
    expect(pad.zone.eid).toBe(built.zone.eid);
    expect(Math.abs(pad.at[0] - (128 + 2 * 256))).toBeLessThanOrEqual(16);
    expect(Math.abs(pad.at[2] - (128 + 4 * 256))).toBeLessThanOrEqual(16);
    expect(pad.at[1]).toBe(128); // on the floor's top
    expect(entityType(zoneEntities(built.zone)[0])).toEqual([0, 0]); // crash stays first
    expect(built.entries.has(built.level.nsd.ldat.execMap[WARP_PAD[0]])).toBe(true);
  });

  test("raise lifts the warp pad", () => {
    const [pad] = warpPads(make(MAP_OBJ, { scale: 256, objects: [object("end", [-2, 4, 0], { raise: 0.25 })] }));
    expect(pad.at[1]).toBe(128 + 64);
  });

  test("without an end object there's no warp pad", () => {
    expect(warpPads(make(MAP_OBJ, { scale: 256 }))).toEqual([]);
  });

  test("an end object has the warp pad's base under it", () => {
    const built = make(MAP_OBJ, { scale: 256, objects: [object("end", [-2, 4, 0.5])] });
    const header = readWorldHeader(firstWorld(built).items[0]);
    const basePage = header.pages.find((page) => !readWorldHeader(firstWorld(make(MAP_OBJ, { scale: 256 })).items[0]).pages.includes(page));
    expect(basePage).toBeDefined();
    expect(texturePages(built.level).map(({ eid }) => eid)).toContain(basePage);
  });

  test("a box goes where it is", () => {
    // blender (1, 2, 0) is the .obj's (1, 0, -2); the game draws a box half a box along +x and +z
    // from where it's kept, so it's kept that far back for its middle to be at at
    const [placed] = boxes(make(MAP_OBJ, { scale: 256, objects: [box([1, 2, 0], 6)] }).zone);
    expect(placed.subtype).toBe(6);
    expect(Math.abs(placed.at[0] - (128 + 5 * 256 - BOX_HEIGHT / 2))).toBeLessThanOrEqual(16);
    expect(Math.abs(placed.at[2] - (128 + 6 * 256 - BOX_HEIGHT / 2))).toBeLessThanOrEqual(16);
    expect(placed.at[1]).toBe(128);
  });

  const enemies = (zone: Entry) => zoneEntities(zone)
    .filter((item) => Object.values(ENEMY_ENTITIES).some((entity) => entity.join() === entityType(item).join()))
    .map((item) => ({ type: entityType(item), id: entityId(item), path: entityPath(item) }));

  test("an enemy goes where it is, as its entity, with an id of its own", () => {
    // blender (1, 2, 0) is the .obj's (1, 0, -2)
    const built = make(MAP_OBJ, { scale: 256, objects: [object("enemy", [1, 2, 0], { enemy: "plant" }), box([2, 2, 0], 2)] });
    const [plant] = enemies(built.zone);
    expect(plant.type).toEqual(ENEMY_ENTITIES.plant);
    expect(plant.path.length).toBe(1);
    expect(Math.abs(plant.path[0][0] - (128 + 5 * 256))).toBeLessThanOrEqual(16);
    expect(Math.abs(plant.path[0][2] - (128 + 6 * 256))).toBeLessThanOrEqual(16);
    expect(plant.path[0][1]).toBe(128);
    expect(plant.id).not.toBe(boxes(built.zone)[0].id);
  });

  test("rolling stones' tracks have a world mesh of their own in their zone, so they fit however full the map's meshes are", () => {
    const track = stoneTrack(base);
    const stones = [object("enemy", [1, 2, 0], { enemy: "rolling_stone" }), object("enemy", [-1, 4, 0], { enemy: "rolling_stone" })];
    const withStones = make(MAP_OBJ, { scale: 256, objects: stones });
    const without = make(MAP_OBJ, { scale: 256 });
    expect(worldsOf(withStones).length).toBe(worldsOf(without).length + 1);
    const tracksMesh = readWorldHeader(worldsOf(withStones).at(-1)!.items[0]);
    expect(tracksMesh.polygonCount).toBe(2 * track.polygons.length);
  });

  test("a rolling stone rolls jungle rollers' path along its track, its middle over the stone's spot, lifted a box's height", () => {
    const track = stoneTrack(base);
    const [placed] = enemies(make(MAP_OBJ, { scale: 256, objects: [object("enemy", [1, 2, 0], { enemy: "rolling_stone" })] }).zone);
    expect(placed.type).toEqual(ENEMY_ENTITIES.rolling_stone);
    // blender (1, 2, 0) is (1408, 128, 1664) in the zone; the track's floor is a box's height over it, under the path's middle
    expect(STONE_TRACK_LIFT).toBe(BOX_HEIGHT);
    const start = [1408 - track.path[5][0], 128 + STONE_TRACK_LIFT - track.floor, 1664 - track.path[5][2]];
    expect(placed.path.length).toBe(track.path.length);
    placed.path.forEach((point, index) => point.forEach((value, axis) =>
      expect(Math.abs(value - (start[axis] + track.path[index][axis]))).toBeLessThanOrEqual(8)));
  });

  describe.skipIf(!hasBeach)("crabs, from n. sanity beach", () => {
    const readOtherLevel = (lid: number) => readLevel(STREAMS, lid);
    const crab = () => object("enemy", [1, 2, 0], { enemy: "crab" });
    const withCrab = (more: Partial<MapOptions> = {}) => make(MAP_OBJ, { scale: 256, objects: [crab()], readOtherLevel, ...more });

    test("a crab walks n. sanity beach's first crab's path, its middle at the crab's spot", () => {
      const beachPath = entityPath(levelEntity(readLevel(STREAMS, N_SANITY_BEACH), ...ENEMY_ENTITIES.crab));
      const middle = beachPath[Math.floor(beachPath.length / 2)];
      const [placed] = enemies(withCrab().zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.crab);
      expect(placed.path.length).toBe(beachPath.length);
      // blender (1, 2, 0) is (1408, 128, 1664) in the zone
      const spot = [1408, 128, 1664];
      placed.path.forEach((point, index) => point.forEach((value, axis) =>
        expect(Math.abs(value - (spot[axis] + beachPath[index][axis] - middle[axis]))).toBeLessThanOrEqual(8)));
    });

    test("a level with a crab has its code, model, texture page and sounds", () => {
      const { level, entries } = withCrab();
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.crab[0]]).toBe(stringToEid("CrabC"));
      expect(entries.has(stringToEid("Cr19G"))).toBe(true);
      expect(level.pages.some((page) => page.type === PAGE_TEXTURE && page.eid === stringToEid("Ju49T"))).toBe(true);
      const sounds = level.pages.filter((page) => page.type === PAGE_SOUNDS).flatMap((page) => page.entries.map(({ eid }) => eid));
      expect(sounds).toContain(stringToEid("CC19A"));
    });

    test("crabs bring their code once, however many there are", () => {
      const twoCrabs = make(MAP_OBJ, { scale: 256, objects: [crab(), object("enemy", [-1, 4, 0], { enemy: "crab" })], readOtherLevel });
      expect(enemies(twoCrabs.zone).length).toBe(2);
      const everyEid = twoCrabs.level.pages.flatMap((page) => (page.type === PAGE_TEXTURE ? [page.eid] : page.entries.map(({ eid }) => eid)));
      expect(everyEid.length).toBe(new Set(everyEid).size);
    });

    test("a level without crabs has none of their code", () => {
      expect(make(MAP_OBJ, { scale: 256, readOtherLevel }).level.nsd.ldat.execMap[ENEMY_ENTITIES.crab[0]]).toBe(EID_NONE);
    });

    test("a crab walks its own path, raised with it, in equal steps about 100 apart", () => {
      const built = make(MAP_OBJ, { scale: 256, objects: [object("enemy", [1, 2, 0], { enemy: "crab", raise: 0.5, path: [[0, 0, 0], [2, 0, 0.25]] })], readOtherLevel });
      const [placed] = enemies(built.zone);
      const steps = placed.path.slice(1).map((point, index) => Math.hypot(...point.map((value, axis) => value - placed.path[index][axis])));
      expect(placed.path.length).toBe(6); // 516 units (2 m across, 0.25 m up) in 5 steps
      steps.forEach((step) => expect(Math.abs(step - 103.2)).toBeLessThanOrEqual(8));
      // blender (1, 2, 0) is (1408, 128, 1664) in the zone; raised 0.5 m is 128 higher, its end 64 higher again
      [1408, 256, 1664].forEach((value, axis) => expect(Math.abs(placed.path[0][axis] - value)).toBeLessThanOrEqual(8));
      [1920, 320, 1664].forEach((value, axis) => expect(Math.abs(placed.path[5][axis] - value)).toBeLessThanOrEqual(8));
    });

    test("a crab, with no other levels to take it from, is an error saying so", () => {
      expect(() => withCrab({ readOtherLevel: undefined })).toThrow(/crab/);
    });
  });

  describe.skipIf(!hasBeach)("turtles, from n. sanity beach", () => {
    const readOtherLevel = (lid: number) => readLevel(STREAMS, lid);
    const turtle = () => object("enemy", [1, 2, 0], { enemy: "turtle" });
    const withTurtle = (more: Partial<MapOptions> = {}) => make(MAP_OBJ, { scale: 256, objects: [turtle()], readOtherLevel, ...more });
    const soundsOf = (level: Level) => level.pages.filter((page) => page.type === PAGE_SOUNDS).flatMap((page) => page.entries.map(({ eid }) => eid));

    test("without a path of its own, a turtle walks n. sanity beach's first turtle's path straightened, along the route (z) and flat, its middle at the turtle's spot", () => {
      const beachPath = entityPath(levelEntity(readLevel(STREAMS, N_SANITY_BEACH), ...ENEMY_ENTITIES.turtle));
      const middle = beachPath[Math.floor(beachPath.length / 2)];
      const [placed] = enemies(withTurtle().zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.turtle);
      expect(placed.path.length).toBe(beachPath.length);
      // blender (1, 2, 0) is (1408, 128, 1664) in the zone; it walks back and forth, so either way round
      const [x, y, z] = [1408, 128, 1664];
      const alongTheRoute = [...placed.path].sort((first, second) => first[2] - second[2]);
      alongTheRoute.forEach((point, index) => {
        expect(point[0]).toBe(placed.path[0][0]);
        expect(point[1]).toBe(placed.path[0][1]);
        expect(Math.abs(point[0] - x)).toBeLessThanOrEqual(8);
        expect(Math.abs(point[1] - y)).toBeLessThanOrEqual(8);
        expect(Math.abs(point[2] - (z + beachPath[index][2] - middle[2]))).toBeLessThanOrEqual(8);
      });
    });

    test("a level with a turtle has its code, models, texture page and sounds", () => {
      const { level, entries } = withTurtle();
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.turtle[0]]).toBe(stringToEid("TurtC"));
      expect(["Tu19G", "Tu49G", "Tu19V", "Tu59V"].every((name) => entries.has(stringToEid(name)))).toBe(true);
      expect(level.pages.some((page) => page.type === PAGE_TEXTURE && page.eid === stringToEid("Ju49T"))).toBe(true);
      expect(soundsOf(level)).toEqual(expect.arrayContaining(["Tbo9A", "Tup9A", "Tfl9A"].map(stringToEid)));
    });

    test("a level with a crab and a turtle has both, and what they share (texture page, sound) once", () => {
      const both = make(MAP_OBJ, { scale: 256, objects: [turtle(), object("enemy", [-1, 4, 0], { enemy: "crab" })], readOtherLevel });
      expect(enemies(both.zone).map(({ type }) => type)).toEqual(expect.arrayContaining([ENEMY_ENTITIES.turtle, ENEMY_ENTITIES.crab]));
      const everyEid = both.level.pages.flatMap((page) => (page.type === PAGE_TEXTURE ? [page.eid] : page.entries.map(({ eid }) => eid)));
      expect(everyEid.filter((eid) => eid === stringToEid("Ju49T")).length).toBe(1);
      expect(everyEid.filter((eid) => eid === stringToEid("fli0A")).length).toBe(1);
      expect(everyEid.length).toBe(new Set(everyEid).size);
    });

    test("a turtle walks its own path: through its nodes, in equal steps about as long as n. sanity beach's (100)", () => {
      const lPath: Vec3[] = [[0, 0, 0], [0, 2, 0], [2, 2, 0]]; // 2 m along the route, then 2 m across: 1024 units at scale 256
      const built = make(MAP_OBJ, { scale: 256, objects: [object("enemy", [1, 2, 0], { enemy: "turtle", path: lPath })], readOtherLevel });
      const [placed] = enemies(built.zone);
      expect(placed.path.length).toBe(11); // 10 steps of 102.4
      const [start, corner, end] = [placed.path[0], placed.path[5], placed.path[10]];
      // blender (1, 2, 0) is (1408, 128, 1664) in the zone
      [1408, 128, 1664].forEach((value, axis) => expect(Math.abs(start[axis] - value)).toBeLessThanOrEqual(8));
      expect(Math.abs(corner[0] - start[0])).toBeLessThanOrEqual(8);
      expect(Math.abs(Math.abs(corner[2] - start[2]) - 512)).toBeLessThanOrEqual(8);
      expect(Math.abs(Math.abs(end[0] - corner[0]) - 512)).toBeLessThanOrEqual(8);
      expect(Math.abs(end[2] - corner[2])).toBeLessThanOrEqual(8);
      placed.path.forEach((point) => expect(Math.abs(point[1] - 128)).toBeLessThanOrEqual(8));
    });

    test("a turtle's speed spaces its path's points: twice as fast, twice as far apart, the same distance along", () => {
      const path: Vec3[] = [[0, 0, 0], [4, 0, 0]]; // 4 m across: 1024 units at scale 256
      const placedAt = (speed?: number) =>
        enemies(make(MAP_OBJ, { scale: 256, objects: [object("enemy", [1, 2, 0], { enemy: "turtle", path, speed })], readOtherLevel }).zone)[0].path;
      const steps = (points: Vec3[]) => points.slice(1).map((point, index) => Math.hypot(...point.map((value, axis) => value - points[index][axis])));
      const [normal, fast, slow] = [placedAt(), placedAt(2), placedAt(0.5)];
      expect([normal.length, fast.length, slow.length]).toEqual([11, 6, 21]); // steps of 102.4, 204.8 and 51.2
      steps(fast).forEach((step) => expect(Math.abs(step - 204.8)).toBeLessThanOrEqual(8));
      steps(slow).forEach((step) => expect(Math.abs(step - 51.2)).toBeLessThanOrEqual(8));
      expect(Math.abs(fast[5][0] - normal[10][0])).toBeLessThanOrEqual(8);
    });

    test("a turtle, with no other levels to take it from, is an error saying so", () => {
      expect(() => withTurtle({ readOtherLevel: undefined })).toThrow(/turtle/);
    });
  });

  const worldsOf = ({ entries, zone }: Built) => zoneWorldEids(zone).map((eid) => entries.get(eid)!);
  const polygonCount = (built: Built) => worldsOf(built).reduce((sum, world) => sum + readWorldHeader(world.items[0]).polygonCount, 0);
  // every world vertex, relative to the zone
  const worldVertices = (built: Built) => worldsOf(built).flatMap((world) => {
    const header = readWorldHeader(world.items[0]);
    const origin = zoneOrigin(built.zone);
    return Array.from({ length: header.vertexCount }, (_, index) =>
      readWorldVertex(world.items[2].subarray(8 * index, 8 * index + 8)).at.map((value, axis) => value + header.origin[axis] - origin[axis]));
  });

  test("a rolling stone comes with jungle rollers' track, its floor under the middle of the path a box's height over the stone's spot", () => {
    const track = stoneTrack(base);
    const withStone = make(MAP_OBJ, { scale: 256, objects: [object("enemy", [1, 2, 0], { enemy: "rolling_stone" })] });
    const withPlant = make(MAP_OBJ, { scale: 256, objects: [object("enemy", [1, 2, 0], { enemy: "plant" })] });
    expect(polygonCount(withStone) - polygonCount(withPlant)).toBe(track.polygons.length);
    // blender (1, 2, 0) is (1408, 128, 1664) in the zone. the track's floor under the middle of its
    // path has a corner 58 across (+z) from it, a box's height over the floor, so crash jumps up to it
    const middle = track.path[5];
    const corner = [1408, 128 + BOX_HEIGHT, 1664 + 58];
    expect(worldVertices(withStone).some((vertex) => vertex.every((value, axis) => Math.abs(value - corner[axis]) <= 16))).toBe(true);
    expect(track.vertices.some(({ at }) => at[0] === middle[0] && at[1] === track.floor && at[2] === 58)).toBe(true);
  });

  test("a stack is boxes one on another, one after another", () => {
    const stack = boxes(make(MAP_OBJ, { scale: 256, objects: [box([1, 2, 0.5], 2, { stack: 3 })] }).zone);
    expect(stack.length).toBe(3);
    stack.slice(1).forEach((above, index) => {
      expect([above.at[0], above.at[2]]).toEqual([stack[index].at[0], stack[index].at[2]]);
      expect(above.at[1]).toBe(stack[index].at[1] + BOX_HEIGHT);
    });
  });

  test("every object has its own id", () => {
    const objects = [box([1, 2, 0.5], 2, { stack: 2 }), box([-1, 2, 0.5], 13), object("end", [-2, 4, 0.5])];
    const { zone } = make(MAP_OBJ, { scale: 256, objects });
    const ids = zoneEntities(zone).map(entityId);
    expect(ids.length).toBe(5); // crash, 3 boxes and the warp pad
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the level header has how many boxes can be broken", () => {
    const objects = [box([1, 2, 0.5], 2, { stack: 2 }), box([-1, 2, 0.5], 13), box([1, 3, 0.5], 5), box([-1, 3, 0.5], 7)];
    expect(make(MAP_OBJ, { scale: 256, objects }).level.nsd.ldat.boxTotal).toBe(3); // not the iron or switch boxes
    expect(make(MAP_OBJ, { scale: 256 }).level.nsd.ldat.boxTotal).toBe(0);
  });

  test("both tnts count towards the total, but not the iron arrow or iron outline", () => {
    const objects = [box([1, 2, 0.5], 0), box([-1, 2, 0.5], 11), box([1, 3, 0.5], 15), box([-1, 3, 0.5], 19)];
    expect(make(MAP_OBJ, { scale: 256, objects }).level.nsd.ldat.boxTotal).toBe(2);
  });

  // zone_header's gfx (src/formats/zdat.h), after its 8 worlds, counts, neighbours, load list and display flags
  const GFX = 4 + 8 * 64 + 16 + 32 + 168 + 4;
  const skyIn = (zone: Entry) => {
    const header = zone.items[0];
    const rgb = (at: number) => [header[GFX + at], header[GFX + at + 1], header[GFX + at + 2]];
    return { split: header.readUInt32LE(GFX), top: rgb(44), bottom: rgb(48), visibility: header.readUInt32LE(GFX + 8) };
  };

  test("every zone has the level's sky, and n. sanity beach's visibility depth", () => {
    const sky = { top: [10, 20, 30] as [number, number, number], bottom: [40, 50, 60] as [number, number, number], split: 100 };
    const built = make(LONG_OBJ, { sky });
    const zones = [...built.entries.values()].filter((entry) => entry.type === ENTRY_ZDAT);
    expect(zones.length).toBeGreaterThan(1);
    for (const zone of zones) {
      expect(skyIn(zone)).toEqual({ split: 100, top: [10, 20, 30], bottom: [40, 50, 60], visibility: 6144000 });
    }
  });

  test("without a sky given, n. sanity beach's", () => {
    expect(skyIn(make().zone)).toEqual({ split: 20, top: [59, 62, 216], bottom: [54, 50, 0], visibility: 6144000 });
  });

  test("turn runs the map along z", () => {
    // turned a quarter, the 16 m long floor runs along x
    const rect = make(MAP_OBJ, { scale: 256, turn: 90 }).zone.items[1];
    expect(rect.readUInt32LE(12)).toBeGreaterThan(rect.readUInt32LE(20));
  });

  test("material images become a texture page the zone loads", () => {
    const plain = make(TEXTURED_OBJ);
    const built = make(TEXTURED_OBJ, { images: new Map([["stone", stone()]]) });
    expect(texturePages(built.level).length).toBe(texturePages(plain.level).length + 1);
    const plainEids = texturePages(plain.level).map(({ eid }) => eid);
    const added = texturePages(built.level).find(({ eid }) => !plainEids.includes(eid))!;
    expect(readWorldHeader(firstWorld(built).items[0]).pages).toContain(added.eid);
    expect(built.zone.items[0].readInt32LE(ZONE_LOADLIST + 4)).toBe(texturePages(built.level).length);
  });

  test("textured polygons use their material's tile", () => {
    const built = make(TEXTURED_OBJ, { images: new Map([["stone", stone()]]) });
    const world = firstWorld(built);
    const header = readWorldHeader(world.items[0]);
    const page = texturePages(built.level).find(({ eid }) => eid === header.pages[header.pageCount - 1])!;
    const polygons = Array.from({ length: header.polygonCount }, (_, index) => readWorldPolygon(world.items[1].subarray(8 * index, 8 * index + 8)));
    const onPage = polygons.filter((polygon) => header.pages[polygon.page] === page.eid);
    expect(onPage.length).toBeGreaterThan(0);
    for (const { texinfo } of onPage) {
      expect(texinfo + 1).toBeLessThan(header.texinfoWords); // within the mesh's texture infos
      const paletteRow = (world.items[0].readUInt32LE(TEXINFOS_AT + 4 * texinfo + 4) >> 6) & 127;
      const palette = Array.from({ length: 16 }, (_, colour) => page.data.readUInt16LE(paletteRow * 512 + 2 * colour));
      expect(palette).toContain(colour5551(STONE_RGB));
    }
  });

  describe("a long map", () => {
    const built = hasBase ? make(LONG_OBJ) : null!;
    const zones = hasBase ? zonesOf(built) : [];
    const neighbours = (zone: Entry) => readWords(zone.items[0], ZONE_NEIGHBORS, zone.items[0].readUInt32LE(ZONE_PATHS_IDX + 12));

    test("is a chain of zones along the route", () => {
      expect(zones.length).toBe(3);
      const rects = zones.map((zone) => [0, 4, 8].map((offset) => zone.items[1].readInt32LE(offset)).concat([12, 16, 20].map((offset) => zone.items[1].readUInt32LE(offset))));
      rects.slice(1).forEach((next, index) => {
        const [x, y, z, w, h, d] = rects[index];
        expect(d).toBe(16384);
        expect(next[2]).toBe(z - 16384); // the next one along -z, touching
        expect([next[0], next[1], next[3], next[4]]).toEqual([x, y, w, h]);
      });
    });

    test("each zone lists itself, then the zones either side", () => {
      const [a, b, c] = zones.map(({ eid }) => eid);
      expect(zones.map(neighbours)).toEqual([[a, b], [b, a, c], [c, b]]);
    });

    test("its paths lead on to the next zones and back", () => {
      const links = zones.map((zone) => {
        const [pathsIndex] = zoneCounts(zone);
        const path = zone.items[pathsIndex];
        return Array.from({ length: path.readUInt32LE(8) }, (_, index) => [...path.subarray(12 + 4 * index, 16 + 4 * index)]);
      });
      expect(links).toEqual([[[2, 1, 0, 1]], [[1, 1, 0, 2], [2, 2, 0, 1]], [[1, 1, 0, 2]]]);
    });

    test("crash is in the zone the level spawns in", () => {
      expect(zones.map((zone) => zoneCounts(zone)[2])).toEqual([1, 0, 0]);
      expect(built.level.nsd.ldat.zoneSpawn).toBe(zones[0].eid);
      const z = crashAt(zones[0])[2];
      expect(z >= 0 && z < 16384).toBe(true); // relative to its zone
    });

    test("every zone loads the texture pages", () => {
      for (const zone of zones) {
        expect(zone.items[0].readInt32LE(ZONE_LOADLIST + 4)).toBe(texturePages(built.level).length);
      }
    });

    test("a zone draws its own and the next zone's meshes", () => {
      const worlds = zones.map(zoneWorldEids);
      for (let index = 0; index < 2; index++) {
        expect(worlds[index].some((eid) => worlds[index + 1].includes(eid))).toBe(true);
      }
      expect(Math.max(...worlds.map((listed) => listed.length))).toBeLessThanOrEqual(8);
    });

    test("an end object far along it is in the last zone", () => {
      // blender y 45 is the .obj's z -45: 5 m from the far end, in the third zone
      const withEnd = make(LONG_OBJ, { objects: [object("end", [0, 45, 0])] });
      const [pad] = warpPads(withEnd);
      expect(pad.zone.eid).toBe(zonesOf(withEnd)[2].eid);
      expect(Math.abs(pad.at[2] - (128 + 2000))).toBeLessThanOrEqual(16);
    });
  });
});

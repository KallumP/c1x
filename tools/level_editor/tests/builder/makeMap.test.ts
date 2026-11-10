import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { LAB_ASSISTANT_REACH, throwFlags } from "../../src/labAssistantThrow";
import { BAT_SWOOP, FISH_LEAP, LEADER_BATS_FLIGHT, leaderBatsGap } from "../../src/coords";
import type { EnemyType, LevelObject } from "../../src/objects";
import { DEFAULT_SKY, type Sky } from "../../src/sky";
import { enemyObject, expectNear } from "../helpers";
import { readCameraPath, readZoneHeader, readZoneRect } from "./zoneReaders";
import { BASE_LEVEL } from "../../builder/baseLevel";
import { BOX_HEIGHT, BOX_TYPE, ENEMY_ENTITIES, LEADER_BAT, ENTITY_INIT_FLAGS, entityId, entityPath, entityPosition, entityType, STONE_FAR_END, WARP_PAD } from "../../builder/entities";
import { EID_NONE, stringToEid } from "../../builder/entryIds";
import type { RgbImage } from "../../builder/images";
import { ENTRY_SLST, ENTRY_WGEO, ENTRY_ZDAT, entriesById, PAGE_SOUNDS, PAGE_TEXTURE, readLevel, type Entry, type Level } from "../../builder/levelFiles";
import { CORE_EXEC_SLOTS } from "../../builder/cutLevel";
import { donorObject, ENEMY_DONORS, enemyDonorObjects } from "../../builder/donorObjects";
import type { Vec3 } from "../../builder/vectors";
import { LID_TEST, makeMap, type MapOptions } from "../../builder/makeMap";
import { FOLLOW_CAM_MODE } from "../../builder/paths";
import { colour5551 } from "../../builder/tpage";
import { levelEntity, STONE_TRACK_LIFT, stoneTrack } from "../../builder/templates";
import { readWorldHeader, readWorldPolygon, readWorldVertex, TEXINFOS_AT } from "../../builder/worldGeometry";
import { zoneEntities, zoneOrigin, zoneWorldEids } from "../../builder/zones";

const STONE_RGB: [number, number, number] = [90, 90, 100];
const stone = (): RgbImage => ({ width: 32, height: 32, rgb: new Uint8Array(32 * 32 * 3).map((_, index) => STONE_RGB[index % 3]) });

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
const hasGreatGate = existsSync(`${STREAMS}/s0000012.nsd`); // the great gate (0x12)
const hasRoadToNowhere = existsSync(`${STREAMS}/s0000014.nsd`); // road to nowhere (0x14)
const hasFumbling = existsSync(`${STREAMS}/s000002a.nsd`); // fumbling in the dark (0x2a)
const hasUpTheCreek = existsSync(`${STREAMS}/s0000018.nsd`); // up the creek (0x18)
const hasSunsetVista = existsSync(`${STREAMS}/s0000023.nsd`); // sunset vista (0x23)
const hasLostCity = existsSync(`${STREAMS}/s0000020.nsd`); // the lost city (0x20)
const hasStormyAscent = existsSync(`${STREAMS}/s0000022.nsd`); // stormy ascent (0x22)
const hasTempleRuins = existsSync(`${STREAMS}/s000001c.nsd`); // temple ruins (0x1c)
const hasHeavyMachinery = existsSync(`${STREAMS}/s0000006.nsd`); // heavy machinery (0x6)
const hasToxicWaste = existsSync(`${STREAMS}/s0000007.nsd`); // toxic waste (0x7)
const hasCortexPower = existsSync(`${STREAMS}/s0000003.nsd`); // cortex power (0x3)

const readOtherLevel = (lid: number) => readLevel(STREAMS, lid);

// a reader of other levels that notes which it reads
function recordingReader() {
  const read: number[] = [];
  const readEach = (lid: number) => {
    read.push(lid);
    return readLevel(STREAMS, lid);
  };
  return { read, readOtherLevel: readEach };
}

const object = (kind: LevelObject["kind"], at: [number, number, number], more: Partial<LevelObject> = {}): LevelObject =>
  ({ kind, at, raise: 0, stack: 1, ...more });
const box = (at: [number, number, number], subtype: number, more: Partial<LevelObject> = {}) => object("box", at, { box: subtype, ...more });
// an enemy at blender (1, 2, 0), on the floor, unless more moves it
const enemy = (type: EnemyType, more: Partial<LevelObject> = {}) => enemyObject(type, { at: [1, 2, 0], ...more });

// blender (1, 2, 0), where enemy() puts an enemy, in the zone at scale 256: the floor's
// corner is a cell (128) in from the zone's, and its top is at 128
const SPOT_IN_ZONE: Vec3 = [1408, 128, 1664];
const [SPOT_X, FLOOR_Y, SPOT_Z] = SPOT_IN_ZONE;

// how far each point of a path is from the one before
const stepLengths = (points: Vec3[]) => points.slice(1).map((point, index) => Math.hypot(...point.map((value, axis) => value - points[index][axis])));

const soundEidsOf = (level: Level) => level.pages.filter((page) => page.type === PAGE_SOUNDS).flatMap((page) => page.entries.map(({ eid }) => eid));
// every texture page's and every entry's eid in the level, as often as it's there
const everyEidOf = (level: Level) => level.pages.flatMap((page) => (page.type === PAGE_TEXTURE ? [page.eid] : page.entries.map(({ eid }) => eid)));

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

  // the test map at scale 256 with objects, reading other levels from the streams
  const build = (objects: LevelObject[] = [], more: MapOptions = {}) => make(MAP_OBJ, { scale: 256, objects, readOtherLevel, ...more });

  const headerOf = (zone: Entry) => readZoneHeader(zone.items[0]);
  const cameraPathOf = (zone: Entry) => readCameraPath(zone.items[headerOf(zone).pathsIndex]);
  const zoneZ = (zone: Entry) => readZoneRect(zone.items[1]).at[2];
  const crashAt = (zone: Entry) => entityPosition(zoneEntities(zone)[0]);
  const zonesOf = ({ entries }: Built) => [...entries.values()].filter((entry) => entry.type === ENTRY_ZDAT)
    .sort((first, second) => zoneZ(second) - zoneZ(first)); // from the start (+z)
  const warpPads = (built: Built) => zonesOf(built).flatMap((zone) =>
    zoneEntities(zone).filter((item) => entityType(item).join() === WARP_PAD.join()).map((item) => ({ zone, at: entityPosition(item) })));
  const boxes = (zone: Entry) => zoneEntities(zone).filter((item) => entityType(item)[0] === BOX_TYPE)
    .map((item) => ({ subtype: entityType(item)[1], id: entityId(item), at: entityPosition(item) }));
  const texturePages = (level: Level) => level.pages.filter((page) => page.type === PAGE_TEXTURE);
  const firstWorld = ({ entries, zone }: Built) => entries.get(zoneWorldEids(zone)[0])!;

  const isOfType = (item: Buffer, type: readonly number[]) => entityType(item).join() === type.join();
  const enemies = (zone: Entry) => zoneEntities(zone)
    .filter((item) => Object.values(ENEMY_ENTITIES).some((type) => isOfType(item, type)))
    .map((item) => ({ type: entityType(item), id: entityId(item), path: entityPath(item), initFlagA: item.readInt16LE(ENTITY_INIT_FLAGS) }));
  const enemyOfType = (zone: Entry, type: readonly number[]) => enemies(zone).find((placed) => placed.type.join() === type.join())!;
  // the init flags a, b and c of the zone's first entity of a type
  const initFlagsOf = (zone: Entry, type: readonly number[]) => {
    const item = zoneEntities(zone).find((entity) => isOfType(entity, type))!;
    return [0, 1, 2].map((flag) => item.readInt16LE(ENTITY_INIT_FLAGS + 2 * flag));
  };

  const worldsOf = ({ entries, zone }: Built) => zoneWorldEids(zone).map((eid) => entries.get(eid)!);
  // every world vertex, relative to the zone
  const worldVertices = (built: Built) => worldsOf(built).flatMap((world) => {
    const header = readWorldHeader(world.items[0]);
    const origin = zoneOrigin(built.zone);
    return Array.from({ length: header.vertexCount }, (_, index) =>
      readWorldVertex(world.items[2].subarray(8 * index, 8 * index + 8)).at.map((value, axis) => value + header.origin[axis] - origin[axis]));
  });

  test("a plain map is one zone holding only crash", () => {
    const built = make();
    const { level, zone } = built;
    expect(level.nsd.ldat.lid).toBe(LID_TEST);
    const { pathsIndex, pathCount, entityCount } = headerOf(zone);
    expect([pathCount, entityCount]).toEqual([1, 1]);
    expect(entityType(zone.items[pathsIndex + 1])).toEqual([0, 0]); // crash
    expect(level.nsd.ldat.execMap.filter((eid) => eid !== EID_NONE).length).toBe(CORE_EXEC_SLOTS.length);
    const entriesOfType = (type: number) => [...built.entries.values()].filter((entry) => entry.type === type).length;
    expect([entriesOfType(ENTRY_ZDAT), entriesOfType(ENTRY_SLST)]).toEqual([1, 1]);
    expect(entriesOfType(ENTRY_WGEO)).toBe(zone.items[0].readUInt32LE(0));
  });

  test("the map's faces become its world meshes", () => {
    const built = build();
    expect(readWorldHeader(firstWorld(built).items[0]).polygonCount).toBeGreaterThan(4); // floor and wall, sliced
    const vertices = worldVertices(built);
    const extentAlong = (axis: number) => Math.max(...vertices.map((vertex) => vertex[axis])) - Math.min(...vertices.map((vertex) => vertex[axis]));
    // as wide and long as the floor (8 m by 16 m) and as high as the wall (2 m), at scale 256
    expect([0, 1, 2].map(extentAlong)).toEqual([8 * 256, 2 * 256, 16 * 256]);
  });

  test("a level has jungle rollers' music and its instruments", () => {
    const { entries } = make();
    expect(["So0cM", "I00cN", "I01cN", "I02cN", "I03cN"].every((name) => entries.has(stringToEid(name)))).toBe(true);
  });

  // the camera's path as level.cfg's camera settings make it (route.test.ts has the sums)
  const cameraPathFor = (camera?: MapOptions["camera"]) => cameraPathOf(build([], { camera }).zone);

  test("a larger camera distance puts the camera further back and higher", () => {
    const usual = cameraPathFor();
    const far = cameraPathFor({ distance: 2, angle: 42 });
    expect(far.followHeight).toBeGreaterThan(usual.followHeight);
    expect(far.points[0][1]).toBeGreaterThan(usual.points[0][1]); // higher above the floor
    expect(far.zoom).toBeGreaterThan(usual.zoom); // further behind crash along its path
  });

  test("a steeper camera angle keeps the camera nearer behind crash", () => {
    expect(cameraPathFor({ distance: 1, angle: 70 }).zoom).toBeLessThan(cameraPathFor().zoom); // and higher up
  });

  test("a steeper camera angle tilts the camera further down", () => {
    const USUAL_ANGLE = 42;
    const USUAL_TILT = -181; // n. sanity beach's
    const ANGLE_UNITS = 4096; // a whole turn, in the game's angles
    const tiltOf = (angle: number) => cameraPathFor({ distance: 1, angle }).points[0][3];
    expect(tiltOf(USUAL_ANGLE)).toBe(USUAL_TILT);
    expect(tiltOf(USUAL_ANGLE + 18)).toBe(USUAL_TILT - Math.round((18 * ANGLE_UNITS) / 360));
  });

  test("the camera path uses the follow camera", () => {
    const { zone } = make();
    expect(cameraPathOf(zone).camMode).toBe(FOLLOW_CAM_MODE);
  });

  test("crash starts on the ground at the spawn marker", () => {
    const [x, y, z] = crashAt(build().zone);
    // the floor's corner is at the zone's corner plus a cell of margin
    expectNear(x, 128 + 4 * 256, 16); // the marker's middle, on multiples of 8
    expect(z).toBe(128 + 5 * 256 + 8 * 256);
    expect(y).toBeGreaterThan(128);
    expect(y).toBeLessThanOrEqual(128 + 128);
  });

  test("a spawn object puts crash where it is", () => {
    // blender (2, -3, 0) is the .obj's (2, 0, 3): on the floor, away from the marker
    const [x, y, z] = crashAt(build([object("spawn", [2, -3, 0])]).zone);
    expectNear([x, z], [128 + 6 * 256, 128 + 11 * 256], 16);
    expect(y).toBeGreaterThan(128);
    expect(y).toBeLessThanOrEqual(128 + 128);
  });

  test("a raised spawn object puts crash in the air", () => {
    const [, y] = crashAt(build([object("spawn", [2, -3, 1.5], { raise: 0.25 })]).zone);
    expectNear(y, 128 + 1.75 * 256 + 100, 8); // the floor's at 128; crash is kept 100 up
  });

  test("an end object puts a warp pad where it is, with its code", () => {
    // blender (-2, 4, 0) is the .obj's (-2, 0, -4)
    const built = build([object("end", [-2, 4, 0])]);
    const [pad] = warpPads(built);
    expect(warpPads(built).length).toBe(1);
    expect(pad.zone.eid).toBe(built.zone.eid);
    expectNear([pad.at[0], pad.at[2]], [128 + 2 * 256, 128 + 4 * 256], 16);
    expect(pad.at[1]).toBe(128); // on the floor's top
    expect(entityType(zoneEntities(built.zone)[0])).toEqual([0, 0]); // crash stays first
    expect(built.entries.has(built.level.nsd.ldat.execMap[WARP_PAD[0]])).toBe(true);
  });

  test("raise lifts the warp pad", () => {
    const [pad] = warpPads(build([object("end", [-2, 4, 0], { raise: 0.25 })]));
    expect(pad.at[1]).toBe(128 + 64);
  });

  test("without an end object there's no warp pad", () => {
    expect(warpPads(build())).toEqual([]);
  });

  test("an end object has the warp pad's base under it", () => {
    const built = build([object("end", [-2, 4, 0.5])]);
    const pages = readWorldHeader(firstWorld(built).items[0]).pages;
    const plainPages = readWorldHeader(firstWorld(build()).items[0]).pages;
    const basePage = pages.find((page) => !plainPages.includes(page));
    expect(basePage).toBeDefined();
    expect(texturePages(built.level).map(({ eid }) => eid)).toContain(basePage);
  });

  test("a box goes where it is", () => {
    // blender (1, 2, 0) is the .obj's (1, 0, -2); the game draws a box half a box along +x and +z
    // from where it's kept, so it's kept that far back for its middle to be at at
    const [placed] = boxes(build([box([1, 2, 0], 6)]).zone);
    expect(placed.subtype).toBe(6);
    expectNear([placed.at[0], placed.at[2]], [SPOT_X - BOX_HEIGHT / 2, SPOT_Z - BOX_HEIGHT / 2], 16);
    expect(placed.at[1]).toBe(FLOOR_Y);
  });

  test("a rolling stone's start and reverse set where in its cycle it starts", () => {
    // its init flag a counts through its cycle there and back (seen in the game): STONE_FAR_END
    // x start rolling forward, twice that less it rolling back; its path is the same either
    // way (rolling -x, so it spins the right way)
    const placed = (more: Partial<LevelObject>) => enemies(build([enemy("rolling_stone", more)]).zone)[0];
    const flags = [{}, { start: 1 }, { start: 0.5 }, { start: 0.5, reverse: true }, { start: 1, reverse: true }, { reverse: true }]
      .map((more) => placed(more).initFlagA);
    const halfWay = STONE_FAR_END / 2;
    expect(flags).toEqual([0, STONE_FAR_END, halfWay, 2 * STONE_FAR_END - halfWay, STONE_FAR_END, 0]);
    expect(placed({ start: 0.5, reverse: true }).path).toEqual(placed({}).path);
  });

  test("an enemy is placed where it is, with an id of its own", () => {
    const built = build([enemy("plant"), box([2, 2, 0], 2)]);
    const [plant] = enemies(built.zone);
    expect(plant.type).toEqual(ENEMY_ENTITIES.plant);
    expect(plant.path.length).toBe(1);
    expectNear(plant.path[0], SPOT_IN_ZONE, 16);
    expect(plant.path[0][1]).toBe(FLOOR_Y);
    expect(plant.id).not.toBe(boxes(built.zone)[0].id);
  });

  describe.skipIf(!hasTempleRuins)("snakes, from temple ruins", () => {
    test("a snake is temple ruins' cobra, in its own exec slot, at its spot", () => {
      const [snake] = enemies(build([enemy("snake")]).zone);
      expect(snake.type).toEqual([ENEMY_ENTITIES.snake[0], 1]);
      expect(snake.path.length).toBe(1);
      expectNear(snake.path[0], SPOT_IN_ZONE, 16);
    });

    test("a level with a snake has temple ruins' cobra and its models, and jungle rollers' plant", () => {
      const { level, entries } = build([enemy("snake"), enemy("plant", { at: [-1, 4, 0] })]);
      const { execMap } = level.nsd.ldat;
      expect([execMap[ENEMY_ENTITIES.plant[0]], execMap[ENEMY_ENTITIES.snake[0]]]).toEqual([stringToEid("PlanC"), stringToEid("SnakC")]);
      expect(["JuPsG", "JuPsV", "JupsV", "JuPcG"].every((name) => entries.has(stringToEid(name)))).toBe(true);
    });
  });

  describe("badgers", () => {
    const placedPath = (more: Partial<LevelObject> = {}) => enemies(build([enemy("badger", more)]).zone)[0].path;
    const JUNGLE_ROLLERS_BADGER_STEP = 400;

    test("a badger is jungle rollers' badger spawner", () => {
      const [placed] = enemies(build([enemy("badger")]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.badger);
      expect(placed.initFlagA).toBe(levelEntity(base, ...ENEMY_ENTITIES.badger).readInt16LE(ENTITY_INIT_FLAGS));
    });

    test("by default badgers run along the route towards the spawn, centred on their spot, in jungle rollers' steps", () => {
      const run = placedPath().slice(0, -1);
      run.forEach(([x, y]) => expectNear([x, y], [SPOT_X, FLOOR_Y], 8));
      expect(run[0][2]).toBeLessThan(run.at(-1)![2]); // the spawn is the +z way
      expectNear((run[0][2] + run.at(-1)![2]) / 2, SPOT_Z, 8);
      stepLengths(run).forEach((step) => expectNear(step, JUNGLE_ROLLERS_BADGER_STEP, 8));
    });

    test("a badger's count goes into its init flag c", () => {
      expect(initFlagsOf(build([enemy("badger", { count: 6 })]).zone, ENEMY_ENTITIES.badger)[2]).toBe(6);
    });

    test("badgers dive away below the end of their path", () => {
      const BADGER_DIVE = 1160; // as jungle rollers' badgers
      const [last, dive] = placedPath().slice(-2);
      expect(dive).toEqual([last[0], last[1] - BADGER_DIVE, last[2]]);
    });

    test("badgers run their own path in jungle rollers' steps, longer the faster they are", () => {
      const path: Vec3[] = [[0, 2, 0], [0, -2, 0]]; // 4 m: 1024 units at scale 256
      const [normal, fast] = [placedPath({ path }), placedPath({ path, speed: 2.5 })].map((points) => points.slice(0, -1));
      expect([normal.length, fast.length]).toEqual([4, 2]); // steps of 341 and 1024
      stepLengths(normal).forEach((step) => expectNear(step, 1024 / 3, 8));
      stepLengths(fast).forEach((step) => expectNear(step, 1024, 8));
    });
  });

  test("a level with a badger has jungle rollers' badger code, model and animation", () => {
    const { level, entries } = build([enemy("badger")]);
    expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.badger[0]]).toBe(stringToEid("PillC"));
    expect(["Pi10G", "Pi10V"].every((name) => entries.has(stringToEid(name)))).toBe(true);
  });

  test("rolling stones' tracks get a world mesh of their own", () => {
    const track = stoneTrack(base);
    const withStones = build([enemy("rolling_stone"), enemy("rolling_stone", { at: [-1, 4, 0] })]);
    const without = build();
    expect(worldsOf(withStones).length).toBe(worldsOf(without).length + 1);
    const tracksMesh = readWorldHeader(worldsOf(withStones).at(-1)!.items[0]);
    expect(tracksMesh.polygonCount).toBe(2 * track.polygons.length);
  });

  test("a rolling stone rolls jungle rollers' path, centred over its spot on its lifted track", () => {
    const track = stoneTrack(base);
    const [placed] = enemies(build([enemy("rolling_stone")]).zone);
    expect(placed.type).toEqual(ENEMY_ENTITIES.rolling_stone);
    // the track's floor is lifted over the spot, under the path's middle
    const start = [SPOT_X - track.path[5][0], FLOOR_Y + STONE_TRACK_LIFT - track.floor, SPOT_Z - track.path[5][2]];
    expect(placed.path.length).toBe(track.path.length);
    placed.path.forEach((point, index) => expectNear(point, track.path[index].map((value, axis) => start[axis] + value), 8));
  });

  describe.skipIf(!hasBeach)("crabs, from n. sanity beach", () => {
    test("by default a crab walks n. sanity beach's crab path, centred on its spot", () => {
      const beachPath = entityPath(levelEntity(readLevel(STREAMS, N_SANITY_BEACH), ...ENEMY_ENTITIES.crab));
      const middle = beachPath[Math.floor(beachPath.length / 2)];
      const [placed] = enemies(build([enemy("crab")]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.crab);
      expect(placed.path.length).toBe(beachPath.length);
      placed.path.forEach((point, index) => expectNear(point, SPOT_IN_ZONE.map((value, axis) => value + beachPath[index][axis] - middle[axis]), 8));
    });

    test("a level with a crab has its code, model, texture page and sounds", () => {
      const { level, entries } = build([enemy("crab")]);
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.crab[0]]).toBe(stringToEid("CrabC"));
      expect(entries.has(stringToEid("Cr19G"))).toBe(true);
      expect(texturePages(level).some((page) => page.eid === stringToEid("Ju49T"))).toBe(true);
      expect(soundEidsOf(level)).toContain(stringToEid("CC19A"));
    });

    test("two crabs bring each of their entries once", () => {
      const twoCrabs = build([enemy("crab"), enemy("crab", { at: [-1, 4, 0] })]);
      expect(enemies(twoCrabs.zone).length).toBe(2);
      const everyEid = everyEidOf(twoCrabs.level);
      expect(everyEid.length).toBe(new Set(everyEid).size);
    });

    test("a level without crabs has none of their code", () => {
      expect(build().level.nsd.ldat.execMap[ENEMY_ENTITIES.crab[0]]).toBe(EID_NONE);
    });

    test("a crab walks its own path, raised with it, in equal steps", () => {
      const [placed] = enemies(build([enemy("crab", { raise: 0.5, path: [[0, 0, 0], [2, 0, 0.25]] })]).zone);
      expect(placed.path.length).toBe(6); // 516 units (2 m across, 0.25 m up) in 5 steps
      stepLengths(placed.path).forEach((step) => expectNear(step, 103.2, 8));
      // raised 0.5 m is 128 higher, its end 64 higher again
      expectNear(placed.path[0], [SPOT_X, FLOOR_Y + 128, SPOT_Z], 8);
      expectNear(placed.path[5], [SPOT_X + 512, FLOOR_Y + 192, SPOT_Z], 8);
    });

    test("a crab without other levels to take it from is an error", () => {
      expect(() => build([enemy("crab")], { readOtherLevel: undefined })).toThrow(/crab/);
    });
  });

  describe.skipIf(!hasBeach)("turtles, from n. sanity beach", () => {
    test("by default a turtle walks n. sanity beach's turtle path, straightened along the route and centred on its spot", () => {
      const beachPath = entityPath(levelEntity(readLevel(STREAMS, N_SANITY_BEACH), ...ENEMY_ENTITIES.turtle));
      const middle = beachPath[Math.floor(beachPath.length / 2)];
      const [placed] = enemies(build([enemy("turtle")]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.turtle);
      expect(placed.path.length).toBe(beachPath.length);
      // it walks back and forth, so either way round
      const alongTheRoute = [...placed.path].sort((first, second) => first[2] - second[2]);
      alongTheRoute.forEach((point, index) => {
        expect(point[0]).toBe(placed.path[0][0]);
        expect(point[1]).toBe(placed.path[0][1]);
        expectNear(point, [SPOT_X, FLOOR_Y, SPOT_Z + beachPath[index][2] - middle[2]], 8);
      });
    });

    test("a level with a turtle has its code, models, texture page and sounds", () => {
      const { level, entries } = build([enemy("turtle")]);
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.turtle[0]]).toBe(stringToEid("TurtC"));
      expect(["Tu19G", "Tu49G", "Tu19V", "Tu59V"].every((name) => entries.has(stringToEid(name)))).toBe(true);
      expect(texturePages(level).some((page) => page.eid === stringToEid("Ju49T"))).toBe(true);
      expect(soundEidsOf(level)).toEqual(expect.arrayContaining(["Tbo9A", "Tup9A", "Tfl9A"].map(stringToEid)));
    });

    test("a level with a crab and a turtle has what they share once", () => {
      const both = build([enemy("turtle"), enemy("crab", { at: [-1, 4, 0] })]);
      expect(enemies(both.zone).map(({ type }) => type)).toEqual(expect.arrayContaining([ENEMY_ENTITIES.turtle, ENEMY_ENTITIES.crab]));
      const everyEid = everyEidOf(both.level);
      expect(everyEid.filter((eid) => eid === stringToEid("Ju49T")).length).toBe(1);
      expect(everyEid.filter((eid) => eid === stringToEid("fli0A")).length).toBe(1);
      expect(everyEid.length).toBe(new Set(everyEid).size);
    });

    test("a turtle walks through its own path's nodes in equal steps", () => {
      const lPath: Vec3[] = [[0, 0, 0], [0, 2, 0], [2, 2, 0]]; // 2 m along the route, then 2 m across: 1024 units at scale 256
      const [placed] = enemies(build([enemy("turtle", { path: lPath })]).zone);
      expect(placed.path.length).toBe(11); // 10 steps of 102.4
      const [start, corner, end] = [placed.path[0], placed.path[5], placed.path[10]];
      expectNear(start, SPOT_IN_ZONE, 8);
      expectNear(corner[0], start[0], 8);
      expectNear(Math.abs(corner[2] - start[2]), 512, 8);
      expectNear(Math.abs(end[0] - corner[0]), 512, 8);
      expectNear(end[2], corner[2], 8);
      placed.path.forEach((point) => expectNear(point[1], FLOOR_Y, 8));
    });

    test("a faster turtle's path points are further apart", () => {
      const path: Vec3[] = [[0, 0, 0], [4, 0, 0]]; // 4 m across: 1024 units at scale 256
      const placedAt = (speed?: number) => enemies(build([enemy("turtle", { path, speed })]).zone)[0].path;
      const [normal, fast, slow] = [placedAt(), placedAt(2), placedAt(0.5)];
      expect([normal.length, fast.length, slow.length]).toEqual([11, 6, 21]); // steps of 102.4, 204.8 and 51.2
      stepLengths(fast).forEach((step) => expectNear(step, 204.8, 8));
      stepLengths(slow).forEach((step) => expectNear(step, 51.2, 8));
      expectNear(fast[5][0], normal[10][0], 8);
    });

    test("a turtle without other levels to take it from is an error", () => {
      expect(() => build([enemy("turtle")], { readOtherLevel: undefined })).toThrow(/turtle/);
    });
  });

  // a piece of code's instructions (by its name) in the level built with objects
  const builtCode = (objects: LevelObject[], code: string) => build(objects).entries.get(stringToEid(code))!.items[1];
  // and in the level an enemy is taken from, as patched for custom levels (donorObjects.test.ts has the patches)
  const patchedDonorCode = (type: EnemyType, code: string) => {
    const donor = readOtherLevel(ENEMY_DONORS[type]!.lid);
    const entries = enemyDonorObjects(new Map([[type, donor]])).flatMap((object) => object.entries);
    return entries.find(({ eid }) => eid === stringToEid(code))!.items[1];
  };

  describe.skipIf(!hasUpTheCreek)("river plants and fish, from up the creek", () => {
    test("a level with a river plant has up the creek's river code, models, animations and sounds", () => {
      const { level, entries } = build([enemy("blue_river_plant")]);
      const { execMap } = level.nsd.ldat;
      expect([execMap[ENEMY_ENTITIES.blue_river_plant[0]], execMap[55]]).toEqual([stringToEid("RivOC"), stringToEid("WateC")]);
      expect(["RV1fG", "Rv1fG", "RF1fG", "RV1fV", "Rv1fV", "RF1fV"].every((name) => entries.has(stringToEid(name)))).toBe(true);
      expect(soundEidsOf(level)).toEqual(expect.arrayContaining(["FJufA", "FSpfA"].map(stringToEid)));
    });

    test.each(["blue_river_plant", "green_river_plant"] as const)("a %s stands at its spot", (type) => {
      const [placed] = enemies(build([enemy(type)]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES[type]);
      expect(placed.path.length).toBe(1);
      expectNear(placed.path[0], SPOT_IN_ZONE, 16);
    });

    test("a fish leaps from its spot", () => {
      const [placed] = enemies(build([enemy("fish")]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.fish);
      expectNear(placed.path[0], SPOT_IN_ZONE, 16);
    });

    test("a reversed fish leaps the other way across the map", () => {
      const [placed] = enemies(build([enemy("fish", { reverse: true })]).zone);
      const [first, last] = [placed.path[0], placed.path.at(-1)!];
      expect(last.map((value, axis) => value - first[axis])).toEqual([-1600, 0, 0]);
    });

    test("a fish's leap is the one the editor draws", () => {
      const [placed] = enemies(build([enemy("fish")]).zone);
      const [x0, y0] = placed.path[0];
      expect(placed.path.map(([x, y]) => [x - x0, y - y0])).toEqual(FISH_LEAP);
    });

    test("a level's river code is up the creek's as patched for custom levels", () => {
      expect(builtCode([enemy("green_river_plant")], "RivOC")).toEqual(patchedDonorCode("green_river_plant", "RivOC"));
    });

    test("a level with both river plants and a fish reads up the creek once", () => {
      const reader = recordingReader();
      const objects = [enemy("blue_river_plant"), enemy("green_river_plant", { at: [-1, 4, 0] }), enemy("fish", { at: [1, 6, 0] })];
      build(objects, { readOtherLevel: reader.readOtherLevel });
      expect(reader.read).toEqual([0x18]);
    });
  });

  describe.skipIf(!hasStormyAscent)("lab assistants, from stormy ascent", () => {
    // a placed lab assistant's init flags: its facing, and its vials' speeds along the game's x and z
    const assistantFlags = (more: Partial<LevelObject> = {}) => initFlagsOf(build([enemy("lab_assistant", more)]).zone, ENEMY_ENTITIES.lab_assistant);

    test("a lab assistant stands at its spot", () => {
      const [placed] = enemies(build([enemy("lab_assistant")]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.lab_assistant);
      expect(placed.path.length).toBe(1);
      expectNear(placed.path[0], SPOT_IN_ZONE, 16);
    });

    test("without a landing spot, a lab assistant throws to its default landing spot", () => {
      // back along the game's x, as far as stormy ascent's first throws (labAssistantThrow.test.ts)
      const defaultLanding: Vec3 = [-Math.round(LAB_ASSISTANT_REACH), 0, 0];
      expect(assistantFlags()).toEqual(throwFlags([0, 0, 0], defaultLanding));
    });

    // a landing spot 6 m back along the route towards the spawn, from the assistant in
    // game units at scale 256: 1536 along the game's z
    const BACK_6_M: Vec3 = [0, 0, 1536];

    test("a lab assistant throws to its landing spot", () => {
      const [facing, ...speeds] = assistantFlags({ path: [[0, -6, 0]] });
      expect(facing).toBe(0); // facing along the game's +z
      expect([facing, ...speeds]).toEqual(throwFlags([0, 0, 0], BACK_6_M));
    });

    test("a lab assistant aims at a lower or angled landing spot", () => {
      const twoMetresLower: Vec3 = [0, -512, 1536];
      expect(assistantFlags({ path: [[0, -6, -2]] })).toEqual(throwFlags([0, 0, 0], twoMetresLower));
      const sixMetresAcross: Vec3 = [-1536, 0, 1536];
      const angled = assistantFlags({ path: [[-6, -6, 0]] });
      expect(angled[0]).toBe(-512); // an eighth of a turn (4096)
      expect(angled).toEqual(throwFlags([0, 0, 0], sixMetresAcross));
    });

    test("a level's lab assistant code is stormy ascent's as patched for custom levels", () => {
      expect(builtCode([enemy("lab_assistant")], "LabAC")).toEqual(patchedDonorCode("lab_assistant", "LabAC"));
    });

    test("a level with a lab assistant has stormy ascent's lab assistant code, models and sounds", () => {
      const { level, entries } = build([enemy("lab_assistant")]);
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.lab_assistant[0]]).toBe(stringToEid("LabAC"));
      expect(["LW1EG", "LW1EV", "Vi1KG", "Vi1KV"].every((name) => entries.has(stringToEid(name)))).toBe(true);
      const donor = donorObject(readLevel(STREAMS, 0x22), ENEMY_ENTITIES.lab_assistant[0]);
      expect(donor.sounds.length).toBeGreaterThan(0);
      expect(soundEidsOf(level)).toEqual(expect.arrayContaining(donor.sounds.map(({ eid }) => eid)));
    });
  });

  describe.skipIf(!hasLostCity)("lizards, from the lost city", () => {
    test("a level with a lizard has the lost city's lizard code, models, texture pages and sounds", () => {
      const { level, entries } = build([enemy("lizard")]);
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.lizard[0]]).toBe(stringToEid("LizaC"));
      expect(["LizgG", "LizgV", "LizrG", "LizrV"].every((name) => entries.has(stringToEid(name)))).toBe(true);
      const donor = donorObject(readLevel(STREAMS, 0x20), ENEMY_ENTITIES.lizard[0]);
      const pageEids = texturePages(level).map((page) => page.eid);
      expect(pageEids).toEqual(expect.arrayContaining(donor.texturePages.map((page) => page.eid)));
      expect(donor.sounds.length).toBeGreaterThan(0);
      expect(soundEidsOf(level)).toEqual(expect.arrayContaining(donor.sounds.map(({ eid }) => eid)));
    });

    // the lost city's steps: green lizards leap 1600, red lizards hop 800
    test.each([["lizard", 1600], ["red_lizard", 800]] as const)("by default a %s goes across the map, centred on its spot, in the lost city's steps", (type, step) => {
      const [placed] = enemies(build([enemy(type)]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES[type]);
      placed.path.forEach(([, y, z]) => expectNear([y, z], [FLOOR_Y, SPOT_Z], 8));
      expectNear((placed.path[0][0] + placed.path.at(-1)![0]) / 2, SPOT_X, 8);
      stepLengths(placed.path).forEach((length) => expectNear(length, step, 8));
    });

    test("a level with a walking lizard has the lost city's ruins code and its walk, keeping jungle rollers' own shadow", () => {
      const { level, entries } = build([enemy("walking_lizard")]);
      const { execMap } = level.nsd.ldat;
      expect(execMap[ENEMY_ENTITIES.walking_lizard[0]]).toBe(stringToEid("RWaOC"));
      expect(["Ig1wG", "Ig1wV"].every((name) => entries.has(stringToEid(name)))).toBe(true);
      expect(execMap[29]).toBe(stringToEid("ShadC")); // the shadow it spawns, jungle rollers' as well as the lost city's
    });

    test("by default a walking lizard paces across the map, centred on its spot, in the lost city's steps", () => {
      const [placed] = enemies(build([enemy("walking_lizard")]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.walking_lizard);
      placed.path.forEach(([, y, z]) => expectNear([y, z], [FLOOR_Y, SPOT_Z], 8));
      expectNear((placed.path[0][0] + placed.path.at(-1)![0]) / 2, SPOT_X, 8);
      stepLengths(placed.path).forEach((length) => expectNear(length, 400, 8));
    });

    test("a level with both lizards reads the lost city once", () => {
      const reader = recordingReader();
      build([enemy("lizard"), enemy("red_lizard", { at: [-1, 4, 0] })], { readOtherLevel: reader.readOtherLevel });
      expect(reader.read).toEqual([0x20]);
    });
  });

  describe.skipIf(!hasSunsetVista)("bats, from sunset vista", () => {
    const bat = (more: Partial<LevelObject> = {}) => enemy("bat", { raise: 3, ...more });
    const leaderBats = (more: Partial<LevelObject> = {}) => bat({ enemy: "leader_bats", ...more });

    test("a level with a bat has sunset vista's ruins code, models, texture page and sounds", () => {
      const { level, entries } = build([bat()]);
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.bat[0]]).toBe(stringToEid("RuiOC"));
      expect(["Ba1wG", "Ba1wV", "Ba2wG", "Ba2wV"].every((name) => entries.has(stringToEid(name)))).toBe(true);
      expect(texturePages(level).some((page) => page.eid === stringToEid("Ru6wT"))).toBe(true);
      const sounds = donorObject(readLevel(STREAMS, 0x23), ENEMY_ENTITIES.bat[0]).sounds.map(({ eid }) => eid);
      expect(sounds.length).toBeGreaterThan(0);
      expect(soundEidsOf(level)).toEqual(expect.arrayContaining(sounds));
    });

    // sunset vista's code reaches only its bats and leader bats, not temple ruins' three pages
    test("bats add two texture pages", () => {
      const pageCount = (built: Built) => texturePages(built.level).length;
      expect(pageCount(build([bat(), bat({ at: [-1, 4, 0] })])) - pageCount(build())).toBe(2);
    });

    test("a bat roost's first flock waits its code's default time", () => {
      const [, , firstWait] = initFlagsOf(build([bat()]).zone, ENEMY_ENTITIES.bat);
      expect(firstWait).toBe(0);
    });

    test("a bat roost's and leader bats' delay goes into their init flag b in frames", () => {
      // 30 frames a second, rounded
      const delayFlag = (roost: LevelObject) => initFlagsOf(build([roost]).zone, ENEMY_ENTITIES[roost.enemy!])[1];
      expect([delayFlag(bat({ delay: 3 })), delayFlag(bat({ delay: 2.25 }))]).toEqual([90, 68]);
      expect(delayFlag(leaderBats({ delay: 12 }))).toBe(360);
    });

    test("a bat roost is at its spot, raised", () => {
      const [placed] = enemies(build([bat()]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.bat);
      expectNear(placed.path[0], [SPOT_X, FLOOR_Y + 768, SPOT_Z], 16); // raise 3 is 768 more at scale 256
    });

    test("a bat roost's swoop is the one the editor draws", () => {
      const [placed] = enemies(build([bat()]).zone);
      const [, y0, z0] = placed.path[0];
      expect(placed.path.map(([, y, z]) => [z - z0, y - y0])).toEqual(BAT_SWOOP);
    });

    test("a bat roost swoops to its path's node, keeping its dip", () => {
      const TEN_METRES_ACROSS = [2560, 0, 0]; // along the game's x at scale 256
      const SWOOP_POINTS = 14; // temple ruins'
      const SWOOP_DIP = -1336; // its lowest, from where it starts
      const [placed] = enemies(build([bat({ path: [[10, 0, 0]] })]).zone);
      expect(placed.path.length).toBe(SWOOP_POINTS);
      const [first, last] = [placed.path[0], placed.path.at(-1)!];
      expect(last.map((value, axis) => value - first[axis])).toEqual(TEN_METRES_ACROSS);
      expect(Math.min(...placed.path.map(([, y]) => y)) - first[1]).toBe(SWOOP_DIP);
    });

    test("a bat roost's count goes into its init flag a", () => {
      expect(enemies(build([bat({ count: 6 })]).zone)[0].initFlagA).toBe(6);
    });

    test("leader bats' roost is where their flight starts", () => {
      const placed = enemyOfType(build([leaderBats()]).zone, ENEMY_ENTITIES.leader_bats);
      // 200 before the first leader (at, raised 3: 768 more at scale 256), 1700 over it and 400 behind
      expectNear(placed.path[0], [SPOT_X + 200, FLOOR_Y + 768 + 1700, SPOT_Z + 400], 16);
    });

    // leader bats' roost and leaders, each with where it is in the level, and
    // the leaders' positions from the roost
    function leaderBatsLayout(built: Built) {
      const items = zonesOf(built).flatMap((zone) => zoneEntities(zone).map((item) => ({ item, origin: zoneOrigin(zone) })));
      const placedAt = ({ item, origin }: (typeof items)[number]) => entityPosition(item).map((value, axis) => value + origin[axis]);
      const roost = items.find(({ item }) => isOfType(item, ENEMY_ENTITIES.leader_bats))!;
      const leaders = items.filter(({ item }) => isOfType(item, LEADER_BAT));
      const offsets = leaders.map((leader) => placedAt(leader).map((value, axis) => value - placedAt(roost)[axis]));
      return { roost: roost.item, leaders: leaders.map(({ item }) => item), offsets };
    }

    // as sunset vista's: the leaders 200 and 6200 back along the game's x from where
    // their flight starts and 400 back along z, but down at its lowest (1700), where crash can spin them
    const FIRST_LEADER = [-200, -1700, -400];
    const SECOND_LEADER = [-6200, -1700, -400];

    test("leader bats' two leaders are where the flock comes in and goes out, each pointing at the roost", () => {
      const { roost, leaders, offsets } = leaderBatsLayout(build([leaderBats()]));
      expect(leaders.length).toBe(2);
      leaders.forEach((leader) => expect(leader.readInt16LE(ENTITY_INIT_FLAGS)).toBe(entityId(roost))); // init flag a
      expect(offsets).toEqual([FIRST_LEADER, SECOND_LEADER]);
      expect(new Set([roost, ...leaders].map(entityId)).size).toBe(3);
    });

    test("leader bats' second leader and their flight's end follow their path's node", () => {
      const METRE_UP = 256; // at scale 256
      const FLIGHT = [-6400, 0, 0]; // from its start to its end, back along the game's x
      const gap = leaderBatsGap(0, 256);
      const path = [[gap[0], gap[1], gap[2] + 1]] as Vec3[]; // the second leader's usual node, a metre up
      const { roost, offsets } = leaderBatsLayout(build([leaderBats({ path })]));
      expect(offsets[1]).toEqual([SECOND_LEADER[0], SECOND_LEADER[1] + METRE_UP, SECOND_LEADER[2]]);
      const flight = entityPath(roost);
      expect(flight.at(-1)!.map((value, axis) => value - flight[0][axis])).toEqual([FLIGHT[0], METRE_UP, FLIGHT[2]]);
    });

    test("leader bats' flight is the one the editor draws", () => {
      const placed = enemyOfType(build([leaderBats()]).zone, ENEMY_ENTITIES.leader_bats);
      const [x0, y0] = placed.path[0];
      expect(placed.path.map(([x, y]) => [x - x0, y - y0])).toEqual(LEADER_BATS_FLIGHT);
    });

    test("a leader bats roost's count goes into its init flag a", () => {
      expect(enemyOfType(build([leaderBats({ count: 6 })]).zone, ENEMY_ENTITIES.leader_bats).initFlagA).toBe(6);
    });

    test.skipIf(!hasFumbling)("bats and spiders together fit in the texture pages the game holds", () => {
      const GAME_TEXTURE_PAGES = 16; // texture_pages in src/ns.c
      const { level } = build([bat(), bat({ at: [-1, 4, 0] }), enemy("walking_spider", { at: [1, 6, 0] })]);
      expect(texturePages(level).length).toBeLessThanOrEqual(GAME_TEXTURE_PAGES);
    });
  });

  describe.skipIf(!hasFumbling)("spiders, from fumbling in the dark", () => {
    test("a level with a spider has fumbling in the dark's spider code, models and animations", () => {
      const { level, entries } = build([enemy("spider")]);
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.spider[0]]).toBe(stringToEid("SpidC"));
      expect(["SpSsG", "SpDsG", "SpdsG", "Sp1sG", "SpSsV", "SpDsV", "SpdsV", "Sp1sV"].every((name) => entries.has(stringToEid(name)))).toBe(true);
    });

    test("a spider hangs over its spot", () => {
      const [placed] = enemies(build([enemy("spider")]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.spider);
      expect(placed.path.length).toBe(1);
      expectNear(placed.path[0], SPOT_IN_ZONE, 16);
    });

    test("by default a walking spider runs along the route towards the spawn, centred on its spot, in fumbling in the dark's steps, then drops", () => {
      const FUMBLING_STEP = 800;
      const [placed] = enemies(build([enemy("walking_spider")]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.walking_spider);
      const run = placed.path.slice(0, -1);
      run.forEach(([x, y]) => expectNear([x, y], [SPOT_X, FLOOR_Y], 8));
      expect(run[0][2]).toBeLessThan(run.at(-1)![2]); // starting ahead, running back towards the spawn (+z)
      expectNear((run[0][2] + run.at(-1)![2]) / 2, SPOT_Z, 8);
      stepLengths(run).forEach((step) => expectNear(step, FUMBLING_STEP, 8));
      const [last, drop] = placed.path.slice(-2);
      expect(drop).toEqual([last[0], last[1] - 1600, last[2]]);
    });

    test("a walking spider's count goes into its init flag c", () => {
      expect(initFlagsOf(build([enemy("walking_spider", { count: 3 })]).zone, ENEMY_ENTITIES.walking_spider)[2]).toBe(3);
    });

    test("a level with both kinds of spider reads fumbling in the dark once", () => {
      const reader = recordingReader();
      build([enemy("spider"), enemy("walking_spider", { at: [-1, 4, 0] })], { readOtherLevel: reader.readOtherLevel });
      expect(reader.read).toEqual([0x2a]);
    });
  });

  describe.skipIf(!hasRoadToNowhere)("warthogs, from road to nowhere", () => {
    const withWarthog = (more: Partial<LevelObject> = {}) => build([enemy("warthog", more)]);

    test("a level with a warthog has road to nowhere's warthog code, model, animations and grunts", () => {
      const { level, entries } = withWarthog();
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.warthog[0]]).toBe(stringToEid("WartC"));
      expect(["WartG", "WarHV", "WarRV"].every((name) => entries.has(stringToEid(name)))).toBe(true);
      expect(soundEidsOf(level).filter((eid) => ["WH1kA", "WH2kA", "WH3kA"].map(stringToEid).includes(eid)).length).toBe(3);
    });

    test("by default a warthog charges along the route, centred on its spot, in road to nowhere's steps", () => {
      const ROAD_TO_NOWHERE_STEP = 5200 / 7; // its run in 7 steps of about 743
      const [placed] = enemies(withWarthog().zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.warthog);
      placed.path.forEach(([x, y]) => expectNear([x, y], [SPOT_X, FLOOR_Y], 8));
      expectNear((placed.path[0][2] + placed.path.at(-1)![2]) / 2, SPOT_Z, 8);
      stepLengths(placed.path).forEach((step) => expectNear(step, ROAD_TO_NOWHERE_STEP, 8));
    });

    test("a faster warthog has longer steps", () => {
      const firstStep = (more: Partial<LevelObject>) => stepLengths(enemies(withWarthog(more).zone)[0].path)[0];
      expect(firstStep({ speed: 2 })).toBeGreaterThan(firstStep({}));
    });

    test("a level without warthogs has none of their code", () => {
      expect(build().level.nsd.ldat.execMap[ENEMY_ENTITIES.warthog[0]]).toBe(EID_NONE);
    });
  });

  describe.skipIf(!hasHeavyMachinery)("robot dogs, from heavy machinery", () => {
    const withRobotDog = (more: Partial<LevelObject> = {}) => build([enemy("robot_dog", more)]);

    test("a level with a robot dog has heavy machinery's robot code, models and sounds", () => {
      const { level, entries } = withRobotDog();
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.robot_dog[0]]).toBe(stringToEid("PoRoC"));
      expect(["PRS1G", "PRSSV", "Psr5G"].every((name) => entries.has(stringToEid(name)))).toBe(true);
      expect(soundEidsOf(level)).toEqual(expect.arrayContaining(["sv26A", "sv16A", "srh3A"].map(stringToEid)));
    });

    test("by default a robot dog walks along the route, centred on its spot, in heavy machinery's steps", () => {
      const HEAVY_MACHINERY_STEP = 400;
      const [placed] = enemies(withRobotDog().zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.robot_dog);
      placed.path.forEach(([x, y]) => expectNear([x, y], [SPOT_X, FLOOR_Y], 8));
      expectNear((placed.path[0][2] + placed.path.at(-1)![2]) / 2, SPOT_Z, 8);
      stepLengths(placed.path).forEach((step) => expectNear(step, HEAVY_MACHINERY_STEP, 8));
    });

    test("a robot dog has heavy machinery's robot dogs' init flags", () => {
      // flag b its size (12 x 256: 0.75)
      expect(initFlagsOf(withRobotDog().zone, ENEMY_ENTITIES.robot_dog)).toEqual([200, 12, 0]);
    });
  });

  describe.skipIf(!hasToxicWaste)("barrel rollers, from toxic waste", () => {
    const withBarrelRoller = (more: Partial<LevelObject> = {}) => build([enemy("barrel_roller", more)]);

    test("a level with a barrel roller has toxic waste's barrel roller and barrels, their models and sounds", () => {
      const { level, entries } = withBarrelRoller();
      const { execMap } = level.nsd.ldat;
      expect([execMap[ENEMY_ENTITIES.barrel_roller[0]], execMap[16]]).toEqual([stringToEid("FatsC"), stringToEid("BaraC")]);
      expect(["Fat1G", "Fat2G", "BaV7G", "BaD7G"].every((name) => entries.has(stringToEid(name)))).toBe(true);
      expect(soundEidsOf(level)).toEqual(expect.arrayContaining(["laf7A", "brl7A", "bnc7A"].map(stringToEid)));
    });

    test("a barrel roller's barrels have their ends capped, as toxic waste's are open tubes", () => {
      // their 20 side polygons, and a fan of 8 over each end's ring of 10 vertices
      const { entries } = withBarrelRoller();
      const polygonCount = (name: string) => entries.get(stringToEid(name))!.items[0].readUInt32LE(0);
      expect([polygonCount("BaV7G"), polygonCount("BaD7G")]).toEqual([36, 36]);
    });

    test("a level with a barrel roller doesn't have toxic waste's water code", () => {
      const { level, entries } = withBarrelRoller();
      expect(entries.has(stringToEid("WateC"))).toBe(false);
      expect(level.nsd.ldat.execMap[55]).toBe(EID_NONE);
    });

    test("by default a barrel roller stands half his barrels' path from his spot, away from the spawn, and they roll back past it in toxic waste's steps", () => {
      const TOXIC_WASTE_STEP = 400;
      const [placed] = enemies(withBarrelRoller().zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.barrel_roller);
      placed.path.forEach(([x, y]) => expectNear([x, y], [SPOT_X, FLOOR_Y], 8));
      expect(placed.path[0][2]).toBeLessThan(placed.path.at(-1)![2]); // the spawn is the +z way
      expectNear((placed.path[0][2] + placed.path.at(-1)![2]) / 2, SPOT_Z, 8);
      stepLengths(placed.path).forEach((step) => expectNear(step, TOXIC_WASTE_STEP, 8));
    });
  });

  describe.skipIf(!hasCortexPower)("gunmen, from cortex power", () => {
    test("a level with a gunman has cortex power's gunman code, models and sounds", () => {
      const { level, entries } = build([enemy("gunman")]);
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.gunman[0]]).toBe(stringToEid("MafiC"));
      expect(["SlimG", "MTraG", "SliMV"].every((name) => entries.has(stringToEid(name)))).toBe(true);
      expect(soundEidsOf(level)).toEqual(expect.arrayContaining(["gun3A", "laf3A"].map(stringToEid)));
    });

    test("a gunman stands at his spot", () => {
      const [placed] = enemies(build([enemy("gunman")]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.gunman);
      expect(placed.path.length).toBe(1);
      expectNear(placed.path[0], SPOT_IN_ZONE, 16);
    });

    test("a gunman isn't linked to another object, as cortex power's first is (by its init flag a)", () => {
      expect(initFlagsOf(build([enemy("gunman")]).zone, ENEMY_ENTITIES.gunman)[0]).toBe(0);
    });

    test("a gunman's range goes into his init flag c, in game units", () => {
      // 16 m without one; at scale 256
      const rangeFlag = (gunman: LevelObject) => initFlagsOf(build([gunman]).zone, ENEMY_ENTITIES.gunman)[2];
      expect(rangeFlag(enemy("gunman"))).toBe(4096);
      expect(rangeFlag(enemy("gunman", { range: 30.5 }))).toBe(7808);
    });

    test("a gunman's range is at most what his init flag c holds", () => {
      const placed = initFlagsOf(build([enemy("gunman", { range: 40 })], { scale: 1000 }).zone, ENEMY_ENTITIES.gunman);
      expect(placed[2]).toBe(32767);
    });

    test("a level's gunman code is cortex power's as patched for custom levels", () => {
      expect(builtCode([enemy("gunman")], "MafiC")).toEqual(patchedDonorCode("gunman", "MafiC"));
    });
  });

  describe.skipIf(!hasGreatGate)("monkeys, from the great gate", () => {
    test("a level with a monkey has the great gate's monkey code, model, animations and chatter", () => {
      const { level, entries } = build([enemy("monkey")]);
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.monkey[0]]).toBe(stringToEid("MonkC"));
      expect(["Mo1fG", "Mo1fV", "Mo2fV", "Mo3fV"].every((name) => entries.has(stringToEid(name)))).toBe(true);
      expect(soundEidsOf(level)).toEqual(expect.arrayContaining(["Mp1iA", "Mp2iA", "chmiA"].map(stringToEid)));
    });

    test("by default a monkey walks across the map, centred on its spot, in the great gate's steps", () => {
      const GREAT_GATE_MONKEY_STEP = 480;
      const [placed] = enemies(build([enemy("monkey")]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.monkey);
      placed.path.forEach(([, y, z]) => expectNear([y, z], [FLOOR_Y, SPOT_Z], 8));
      expectNear((placed.path[0][0] + placed.path.at(-1)![0]) / 2, SPOT_X, 8);
      stepLengths(placed.path).forEach((step) => expectNear(step, GREAT_GATE_MONKEY_STEP, 8));
    });

    test("a monkey's path starts at the editor's first node", () => {
      const path: Vec3[] = [[-3, 0, 0], [3, 0, 0]]; // from -x to +x
      const [placed] = enemies(build([enemy("monkey", { path })]).zone);
      // the game starts a monkey at its path's far end, so its path goes into the level the other
      // way round: its last point is the path's first node, 3 m to -x, 768 to -x at scale 256
      expectNear(placed.path.at(-1)![0], SPOT_X - 768, 8);
      expectNear(placed.path[0][0], SPOT_X + 768, 8);
    });

    test("a level with a monkey and a native reads the great gate once", () => {
      const reader = recordingReader();
      build([enemy("monkey"), enemy("native", { at: [-1, 4, 0] })], { readOtherLevel: reader.readOtherLevel });
      expect(reader.read).toEqual([0x12]);
    });
  });

  describe.skipIf(!hasGreatGate)("natives, from the great gate", () => {
    test("by default a native walks across the map, centred on its spot, in the great gate's steps", () => {
      const GREAT_GATE_NATIVE_STEP = 1972 / 4; // its walk in 4 steps
      const [placed] = enemies(build([enemy("native")]).zone);
      expect(placed.type).toEqual(ENEMY_ENTITIES.native);
      placed.path.forEach(([, y, z]) => expectNear([y, z], [FLOOR_Y, SPOT_Z], 8));
      expectNear((placed.path[0][0] + placed.path.at(-1)![0]) / 2, SPOT_X, 8);
      stepLengths(placed.path).forEach((step) => expectNear(step, GREAT_GATE_NATIVE_STEP, 8));
    });

    test("natives walk their own path in the great gate's steps, longer the faster they are", () => {
      const path: Vec3[] = [[0, 0, 0], [8, 0, 0]]; // 8 m across: 2048 units at scale 256
      const placedAt = (speed?: number) => enemies(build([enemy("native", { path, speed })]).zone)[0].path;
      const [normal, fast] = [placedAt(), placedAt(2)];
      expect([normal.length, fast.length]).toEqual([5, 3]); // steps of 512 and 1024
      stepLengths(normal).forEach((step) => expectNear(step, 512, 8));
      stepLengths(fast).forEach((step) => expectNear(step, 1024, 8));
    });

    test("a level with a native has the great gate's native code, model and animations", () => {
      const { level, entries, zone } = build([enemy("native")]);
      expect(enemies(zone).map(({ type }) => type)).toEqual([ENEMY_ENTITIES.native]);
      expect(level.nsd.ldat.execMap[ENEMY_ENTITIES.native[0]]).toBe(stringToEid("SheNC"));
      expect(["Na1iG", "Na1iV", "Na2iV"].every((name) => entries.has(stringToEid(name)))).toBe(true);
    });

    test("a level without natives has none of their code", () => {
      expect(build().level.nsd.ldat.execMap[ENEMY_ENTITIES.native[0]]).toBe(EID_NONE);
    });

    test.skipIf(!hasBeach)("a level with a crab and a native reads both their levels and has nothing twice", () => {
      const reader = recordingReader();
      const both = build([enemy("native"), enemy("crab", { at: [-1, 4, 0] })], { readOtherLevel: reader.readOtherLevel });
      expect(reader.read.sort((first, second) => first - second)).toEqual([0x9, 0x12]);
      expect(enemies(both.zone).map(({ type }) => type)).toEqual(expect.arrayContaining([ENEMY_ENTITIES.native, ENEMY_ENTITIES.crab]));
      const everyEid = everyEidOf(both.level);
      expect(everyEid.filter((eid) => eid === stringToEid("fli0A")).length).toBe(1);
      expect(everyEid.length).toBe(new Set(everyEid).size);
    });

    test.skipIf(!hasBeach)("a native adds no texture pages", () => {
      const pageEids = (objects: LevelObject[]) => texturePages(build(objects).level).map(({ eid }) => eid);
      const crabAndTurtle = [enemy("crab", { at: [-1, 4, 0] }), enemy("turtle", { at: [0, 3, 0] })];
      expect(pageEids([...crabAndTurtle, enemy("native")])).toEqual(pageEids(crabAndTurtle));
    });

    test("a native without other levels to take it from is an error", () => {
      expect(() => build([enemy("native")], { readOtherLevel: undefined })).toThrow(/native/);
    });
  });

  test("a rolling stone's track is placed with its floor under the middle of its path, lifted over the stone's spot", () => {
    const track = stoneTrack(base);
    const middle = track.path[5];
    const offset = [SPOT_X - middle[0], FLOOR_Y + STONE_TRACK_LIFT - track.floor, SPOT_Z - middle[2]];
    const placedVertices = worldVertices(build([enemy("rolling_stone")]));
    const isPlaced = (wanted: number[]) => placedVertices.some((vertex) => vertex.every((value, axis) => Math.abs(value - wanted[axis]) <= 16));
    const floorVertices = track.vertices.filter(({ at }) => at[1] === track.floor);
    expect(floorVertices.length).toBeGreaterThan(0);
    floorVertices.forEach(({ at }) => expect(isPlaced(at.map((value, axis) => value + offset[axis]))).toBe(true));
  });

  test("a stack is boxes one on another, one after another", () => {
    const stack = boxes(build([box([1, 2, 0.5], 2, { stack: 3 })]).zone);
    expect(stack.length).toBe(3);
    stack.slice(1).forEach((above, index) => {
      expect([above.at[0], above.at[2]]).toEqual([stack[index].at[0], stack[index].at[2]]);
      expect(above.at[1]).toBe(stack[index].at[1] + BOX_HEIGHT);
    });
  });

  test("every object has its own id", () => {
    const { zone } = build([box([1, 2, 0.5], 2, { stack: 2 }), box([-1, 2, 0.5], 13), object("end", [-2, 4, 0.5])]);
    const ids = zoneEntities(zone).map(entityId);
    expect(ids.length).toBe(5); // crash, 3 boxes and the warp pad
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the level header counts the boxes that can be broken", () => {
    const objects = [box([1, 2, 0.5], 2, { stack: 2 }), box([-1, 2, 0.5], 13), box([1, 3, 0.5], 5), box([-1, 3, 0.5], 7)];
    expect(build(objects).level.nsd.ldat.boxTotal).toBe(3); // not the iron or switch boxes
    expect(build().level.nsd.ldat.boxTotal).toBe(0);
  });

  test("tnts count towards the box total, iron arrows and outlines don't", () => {
    const objects = [box([1, 2, 0.5], 0), box([-1, 2, 0.5], 11), box([1, 3, 0.5], 15), box([-1, 3, 0.5], 19)];
    expect(build(objects).level.nsd.ldat.boxTotal).toBe(2);
  });

  const skyIn = (zone: Entry) => headerOf(zone).sky;
  const VISIBILITY_DEPTH = 6144000; // how far away objects are drawn, n. sanity beach's

  test("every zone has the level's sky", () => {
    const sky: Sky = { top: [10, 20, 30], bottom: [40, 50, 60], split: 100 };
    const zones = zonesOf(make(LONG_OBJ, { sky }));
    expect(zones.length).toBeGreaterThan(1);
    for (const zone of zones) {
      expect(skyIn(zone)).toEqual({ ...sky, visibility: VISIBILITY_DEPTH });
    }
  });

  test("a level without a sky uses n. sanity beach's", () => {
    expect(skyIn(make().zone)).toEqual({ ...DEFAULT_SKY, visibility: VISIBILITY_DEPTH });
  });

  test("turning the map a quarter swaps its length and width", () => {
    // the floor is 16 m long and 8 m wide: turned a quarter, its length runs along x
    const rectOf = (turn: number) => readZoneRect(build([], { turn }).zone.items[1]);
    const [plain, turned] = [rectOf(0), rectOf(90)];
    expect(plain.depth).toBeGreaterThan(plain.width);
    expect(turned.width).toBeGreaterThan(turned.depth);
  });

  test("material images become a texture page the map's mesh uses", () => {
    const plain = make(TEXTURED_OBJ);
    const built = make(TEXTURED_OBJ, { images: new Map([["stone", stone()]]) });
    expect(texturePages(built.level).length).toBe(texturePages(plain.level).length + 1);
    const plainEids = texturePages(plain.level).map(({ eid }) => eid);
    const added = texturePages(built.level).find(({ eid }) => !plainEids.includes(eid))!;
    expect(readWorldHeader(firstWorld(built).items[0]).pages).toContain(added.eid);
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
    const neighbours = (zone: Entry) => headerOf(zone).neighbours;
    const ZONE_LENGTH = 16384; // along z, the most a zone holds

    test("is a chain of zones along the route", () => {
      expect(zones.length).toBe(3);
      const rects = zones.map((zone) => readZoneRect(zone.items[1]));
      rects.slice(1).forEach((next, index) => {
        const { at: [x, y, z], width, height, depth } = rects[index];
        expect(depth).toBe(ZONE_LENGTH);
        expect(next.at[2]).toBe(z - ZONE_LENGTH); // the next one along -z, touching
        expect([next.at[0], next.at[1], next.width, next.height]).toEqual([x, y, width, height]);
      });
    });

    test("each zone lists itself, then the zones either side", () => {
      const [a, b, c] = zones.map(({ eid }) => eid);
      expect(zones.map(neighbours)).toEqual([[a, b], [b, a, c], [c, b]]);
    });

    test("its paths lead on to the next zones and back", () => {
      // a link is (relation, the zone's index in the zone's neighbours, its path's index there, goal)
      const [BEFORE, AFTER] = [1, 2]; // the path before or after this one
      const [ITS_START, ITS_END] = [1, 2]; // arriving at that path's start or end
      // a zone's neighbours are itself, then the zone before it if there is one, then the zone after
      const [FIRST_OTHER, SECOND_OTHER] = [1, 2];
      const links = zones.map((zone) => cameraPathOf(zone).links);
      expect(links).toEqual([
        [[AFTER, FIRST_OTHER, 0, ITS_START]],
        [[BEFORE, FIRST_OTHER, 0, ITS_END], [AFTER, SECOND_OTHER, 0, ITS_START]],
        [[BEFORE, FIRST_OTHER, 0, ITS_END]],
      ]);
    });

    test("crash is in the zone the level spawns in", () => {
      expect(zones.map((zone) => headerOf(zone).entityCount)).toEqual([1, 0, 0]);
      expect(built.level.nsd.ldat.zoneSpawn).toBe(zones[0].eid);
      const z = crashAt(zones[0])[2]; // relative to its zone
      expect(z).toBeGreaterThanOrEqual(0);
      expect(z).toBeLessThan(ZONE_LENGTH);
    });

    test("every zone loads the texture pages", () => {
      for (const zone of zones) {
        expect(headerOf(zone).loadList.pageCount).toBe(texturePages(built.level).length);
      }
    });

    test("a zone draws its own and the next zone's meshes", () => {
      const ZONE_WORLDS_MAX = 8; // the most world meshes a zone lists
      const worlds = zones.map(zoneWorldEids);
      worlds.slice(0, -1).forEach((listed, index) => {
        expect(listed.some((eid) => worlds[index + 1].includes(eid))).toBe(true);
      });
      worlds.forEach((listed) => expect(listed.length).toBeLessThanOrEqual(ZONE_WORLDS_MAX));
    });

    test("an end object far along it is in the last zone", () => {
      // blender y 45 is the .obj's z -45: 5 m from the far end, in the third zone
      const withEnd = make(LONG_OBJ, { objects: [object("end", [0, 45, 0])] });
      const [pad] = warpPads(withEnd);
      expect(pad.zone.eid).toBe(zonesOf(withEnd)[2].eid);
      expectNear(pad.at[2], 128 + 2000, 16);
    });
  });
});

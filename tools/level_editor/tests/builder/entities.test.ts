import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { ByteWriter, padTo4 } from "../../builder/bytes";
import {
  BOX_TYPE, ENEMY_ENTITIES, ENTITY_IDS_MAX, ENTITY_INIT_FLAGS, entityId, entityPath, entityType, linkSwitches, newEntityIds, withEntityId,
  withPath, type PlacedBox,
} from "../../builder/entities";
import { BASE_LEVEL } from "../../builder/baseLevel";
import { readLevel } from "../../builder/levelFiles";
import { pieceMesh, readTemplates, stoneTrack, warpPadBase, withLongerSkirts, type MapPiece } from "../../builder/templates";

// an entity as a zone stores it: parent zone, spawn flags, group, id, point count,
// 3 init flags, type, subtype, then the points (units of 4)
function entity(type: number, subtype: number, id: number, points: [number, number, number][]): Buffer {
  const writer = new ByteWriter().u32(0).u16(0x18).u16(3).u16(id).u16(points.length).s16(1).s16(2).s16(3).u8(type).u8(subtype);
  points.forEach((point) => point.forEach((coordinate) => writer.s16(coordinate)));
  return padTo4(writer.toBuffer());
}

describe("entities", () => {
  test("their type and subtype", () => {
    expect(entityType(entity(34, 6, 1, [[0, 0, 0]]))).toEqual([34, 6]);
  });

  test("their id", () => {
    expect(entityId(entity(34, 6, 77, [[0, 0, 0]]))).toBe(77);
    expect(entityId(withEntityId(entity(34, 6, 77, [[0, 0, 0]]), 78))).toBe(78);
  });

  test("new ids skip the main object's and ones taken", () => {
    // spawns[] in src/gool.c is indexed by id; ids 1 to 4 make the main object (crash)
    expect(newEntityIds(5, new Set([9, 5]))).toEqual([6, 7, 8, 10, 11]);
  });

  test("ids stay in the game's spawn table", () => {
    const goolH = readFileSync(fileURLToPath(new URL("../../../../src/gool.h", import.meta.url)), "utf8");
    const line = goolH.split(/\r?\n/).find((candidate) => candidate.startsWith("#define GOOL_SPAWN_COUNT"))!;
    expect(Number(line.split(/\s+/)[2]) - 1).toBe(ENTITY_IDS_MAX);
  });

  test("there are only so many ids", () => {
    expect(Math.max(...newEntityIds(ENTITY_IDS_MAX - 4, new Set()))).toBe(ENTITY_IDS_MAX);
    expect(() => newEntityIds(ENTITY_IDS_MAX - 3, new Set())).toThrow(/objects/);
  });
});

describe("enemies", () => {
  test("are jungle rollers' plant, rolling stone and badger, n. sanity beach's crab and turtle, the great gate's native, road to nowhere's warthog, fumbling in the dark's two spiders, the great gate's monkey, up the creek's two river plants and fish, and temple ruins' bat roost", () => {
    expect(ENEMY_ENTITIES).toEqual({ plant: [25, 0], rolling_stone: [22, 6], crab: [31, 0], turtle: [19, 0], native: [38, 0], badger: [35, 0], warthog: [7, 1], spider: [43, 1], walking_spider: [43, 3], monkey: [1, 2],
      blue_river_plant: [28, 6], green_river_plant: [28, 7], fish: [28, 5], bat: [42, 9] });
  });
});

describe("entity paths", () => {
  test("are their points, in zone units", () => {
    expect(entityPath(entity(25, 0, 1, [[1, 2, 3], [4, 5, -6]]))).toEqual([[4, 8, 12], [16, 20, -24]]);
  });

  test("written into an entity, replace its points and keep the rest", () => {
    const written = withPath(entity(22, 6, 7, [[0, 0, 0], [1, 1, 1], [2, 2, 2]]), [[400, 800, -1200], [804, 0, 0]]);
    expect(entityPath(written)).toEqual([[400, 800, -1200], [804, 0, 0]]);
    expect(entityType(written)).toEqual([22, 6]);
    expect(entityId(written)).toBe(7);
    expect(written.readInt16LE(ENTITY_INIT_FLAGS)).toBe(1);
    expect(written.length).toBe(32); // 20, then 6 a point
  });

  test("are kept on units of 4, and padded to a multiple of 4 bytes as the game's", () => {
    const written = withPath(entity(25, 0, 1, [[0, 0, 0], [1, 1, 1]]), [[5, -5, 9]]);
    expect(entityPath(written)).toEqual([[4, -8, 8]]);
    expect(written.length).toBe(28);
  });
});

describe("switches", () => {
  const initFlags = (item: Buffer) => [item.readInt16LE(ENTITY_INIT_FLAGS + 2), item.readInt16LE(ENTITY_INIT_FLAGS + 4)];

  test("a switch makes the level's outline boxes solid, along a chain of their ids", () => {
    // on n. sanity beach, the ! box's third init flag is the id of the first outline box, and each
    // outline box's is the next one's (0 for the last); the first is also marked 12, the rest 4
    const entities = [[entity(BOX_TYPE, 13, 10, []), entity(BOX_TYPE, 7, 11, [])], [entity(BOX_TYPE, 13, 12, []), entity(BOX_TYPE, 13, 13, [])]];
    const placed: PlacedBox[] = [
      { subtype: 13, zone: 0, index: 0, id: 10 }, { subtype: 7, zone: 0, index: 1, id: 11 },
      { subtype: 13, zone: 1, index: 0, id: 12 }, { subtype: 13, zone: 1, index: 1, id: 13 },
    ];
    linkSwitches(entities, placed);
    expect(initFlags(entities[0][1])[1]).toBe(10);
    expect([entities[0][0], entities[1][0], entities[1][1]].map(initFlags)).toEqual([[12, 12], [4, 13], [4, 0]]);
  });

  test("iron outlines are in the same chain as outlines, in the order they're placed", () => {
    // as in generator room, where the ! box's chain goes outline, iron outline, iron outline, outline, ...
    const entities = [[entity(BOX_TYPE, 7, 10, []), entity(BOX_TYPE, 13, 11, []), entity(BOX_TYPE, 19, 12, []), entity(BOX_TYPE, 13, 13, [])]];
    const placed: PlacedBox[] = [
      { subtype: 7, zone: 0, index: 0, id: 10 }, { subtype: 13, zone: 0, index: 1, id: 11 },
      { subtype: 19, zone: 0, index: 2, id: 12 }, { subtype: 13, zone: 0, index: 3, id: 13 },
    ];
    linkSwitches(entities, placed);
    expect(initFlags(entities[0][0])[1]).toBe(11);
    expect(entities[0].slice(1).map(initFlags)).toEqual([[12, 12], [4, 13], [4, 0]]);
  });

  test("a switch without outline boxes links to none", () => {
    const entities = [[entity(BOX_TYPE, 7, 10, [])]];
    linkSwitches(entities, [{ subtype: 7, zone: 0, index: 0, id: 10 }]);
    expect(initFlags(entities[0][0])[1]).toBe(0);
  });
});

const STREAMS = fileURLToPath(new URL("../../../../streams", import.meta.url));
const hasBase = existsSync(`${STREAMS}/${BASE_LEVEL.file}.nsd`);

describe.skipIf(!hasBase)("what custom levels take from the base level", () => {
  const base = hasBase ? readLevel(STREAMS, BASE_LEVEL.lid) : null!;

  test("crash, and an entity of each type", () => {
    const templates = readTemplates(base);
    expect(entityType(templates.crash)).toEqual([0, 0]);
    expect(entityType(templates.entity(BOX_TYPE, 2))).toEqual([BOX_TYPE, 2]);
    expect(templates.textures.length).toBeGreaterThan(1);
  });

  test("every box holds nothing extra, though the level's own may hold a token", () => {
    // the first init flag is what a box holds beyond the usual (jungle rollers' ? boxes all hold
    // something, such as tawna's token); 0, the plain box, is what most boxes of every subtype have
    const templates = readTemplates(base);
    for (const subtype of [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 19]) {
      expect(templates.entity(BOX_TYPE, subtype).readInt16LE(ENTITY_INIT_FLAGS)).toBe(0);
    }
  });

  test("a box of a subtype the level has none of is its basic box with that subtype", () => {
    const templates = readTemplates(base);
    const basic = templates.entity(BOX_TYPE, 2);
    for (const subtype of [7, 13, 19]) {
      const box = templates.entity(BOX_TYPE, subtype);
      expect(entityType(box)).toEqual([BOX_TYPE, subtype]);
      expect(box.length).toBe(basic.length);
    }
    expect(entityType(templates.entity(BOX_TYPE, 2))).toEqual([BOX_TYPE, 2]); // the basic box itself is unchanged
  });

  test("the warp pad's base is in the base level's terrain under it", () => {
    const padBase = warpPadBase(base);
    expect(padBase.polygons.length).toBeGreaterThan(20);
    const [xs, ys, zs] = [0, 1, 2].map((axis) => padBase.vertices.map(({ at }) => at[axis]));
    // relative to the pad: around it, and from its top down
    expect(Math.max(...[...xs, ...zs].map(Math.abs))).toBeLessThanOrEqual(700);
    expect(Math.max(...ys)).toBeLessThanOrEqual(16);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-600);
    expectTexturedFromBase(padBase);
  });

  // each polygon's texinfo (2 words) and texture page, from the base level
  function expectTexturedFromBase(piece: MapPiece) {
    expect(piece.polygons.every(({ texinfo }) => piece.texinfos.get(texinfo)!.length === 8)).toBe(true);
    const pageEids = base.pages.map(({ eid }) => eid);
    expect(piece.polygons.every(({ page }) => pageEids.includes(page))).toBe(true);
  }

  // a polygon's corners, if it lies more flat than upright (the groove's floor, not its skirts)
  const flatCorners = (piece: MapPiece) => piece.polygons.map(({ corners }) => corners.map((corner) => piece.vertices[corner].at))
    .filter(([a, b, c]) => {
      const [u, v] = [b.map((value, axis) => value - a[axis]), c.map((value, axis) => value - a[axis])];
      const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      return Math.abs(normal[1]) > 0.7 * Math.hypot(...normal);
    });

  test("a rolling stone's track is the groove in the base level's terrain along its path", () => {
    const track = stoneTrack(base);
    expect(track.polygons.length).toBeGreaterThan(40);
    expect(track.polygons.length).toBeLessThan(400);
    const [xs, ys, zs] = [0, 1, 2].map((axis) => track.vertices.map(({ at }) => at[axis]));
    // relative to the path's first point: along the path (-x) and a little past its ends, across it, and down
    expect(Math.min(...xs)).toBeLessThan(-3600);
    expect(Math.max(...xs)).toBeGreaterThan(0);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-4640);
    expect(Math.max(...xs)).toBeLessThanOrEqual(1030);
    expect(Math.min(...zs)).toBeGreaterThanOrEqual(-350);
    expect(Math.max(...zs)).toBeLessThanOrEqual(60);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-1900);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expectTexturedFromBase(track);
  });

  test("a rolling stone's track stops at its groove's side wall, leaving out the grassy banks beside it", () => {
    const track = stoneTrack(base);
    expect(Math.max(...track.vertices.map(({ at }) => at[2]))).toBe(58);
  });

  test("a lifted track's skirts reach down as far again: only its corners below its floor, in the ground, go lower", () => {
    const track = stoneTrack(base);
    const lifted = withLongerSkirts(track, 400);
    expect(lifted.polygons).toEqual(track.polygons);
    expect([lifted.floor, lifted.path]).toEqual([track.floor, track.path]);
    track.vertices.forEach(({ at: [x, y, z] }, index) =>
      expect(lifted.vertices[index].at).toEqual([x, y < track.floor ? y - 400 : y, z]));
    expect(track.vertices.some(({ at }) => at[1] < track.floor)).toBe(true);
  });

  test("a rolling stone's track comes with its path, from its first point, rolling -x and dipping in the middle", () => {
    const { path } = stoneTrack(base);
    expect(path.length).toBe(11);
    expect(path[0]).toEqual([0, 0, 0]);
    expect(path[10]).toEqual([-3600, 0, 0]);
    expect(path[5]).toEqual([-1800, -472, 0]);
  });

  test("a piece of terrain as a mesh, moved to where it goes, for the collision", () => {
    const track = stoneTrack(base);
    const mesh = pieceMesh(track, [1000, 2000, 3000]);
    expect(mesh.triangles.length).toBe(track.polygons.length);
    expect(mesh.vertices[track.polygons[0].corners[1]]).toEqual(track.vertices[track.polygons[0].corners[1]].at.map((value, axis) => value + [1000, 2000, 3000][axis]));
    expect(mesh.triangles.every(({ object, material }) => object === null && material === null)).toBe(true);
    // faces up, so the collision makes the groove's floor a floor whichever way the base level winds its corners
    const facingUp = mesh.triangles.map(({ corners }) => corners.map((corner) => mesh.vertices[corner])).map(([p, q, r]) =>
      (q[2] - p[2]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[2] - p[2]));
    expect(facingUp.every((y) => y >= 0)).toBe(true);
  });

  test("the track's floor under the middle of its path, where the stone rolls, is its highest flat face there", () => {
    const track = stoneTrack(base);
    const middle = track.path[5];
    const floorUnderMiddle = flatCorners(track).flat().filter(([x, , z]) => Math.abs(x - middle[0]) <= 300 && Math.abs(z) <= 300);
    expect(track.floor).toBe(Math.max(...floorUnderMiddle.map(([, y]) => y)));
    expect(track.floor).toBe(-1177); // the ground beside the groove is lower, at -1385
  });
});

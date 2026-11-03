import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { ByteWriter, padTo4 } from "../../builder/bytes";
import {
  BOX_TYPE, ENTITY_IDS_MAX, ENTITY_INIT_FLAGS, entityId, entityType, linkSwitches, newEntityIds, withEntityId, type PlacedBox,
} from "../../builder/entities";
import { BASE_LEVEL } from "../../builder/baseLevel";
import { readLevel } from "../../builder/levelFiles";
import { readTemplates, warpPadBase } from "../../builder/templates";

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
    expect(padBase.polygons.every(({ texinfo }) => padBase.texinfos.get(texinfo)!.length === 8)).toBe(true); // 2 words each
    expect(base.pages.map(({ eid }) => eid)).toContain(padBase.page);
  });
});

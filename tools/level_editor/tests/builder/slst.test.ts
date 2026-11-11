import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { PAGE_SIZE } from "../../builder/levelFiles";
import { POLY_IDS_MAX, polyId, slstChange, slstItems, zoneSlstItems } from "../../builder/slst";
import type { BuiltPolygon } from "../../builder/worldGeometry";
import type { WorldVertex } from "../../builder/worldMeshes";
import type { Vec3 } from "../../builder/vectors";
import { slstDecode, slstWalk, slstWords } from "./slstDecoder";

const range = (start: number, end: number, step = 1) => {
  const values = [];
  for (let value = start; step > 0 ? value < end : value > end; value += step) {
    values.push(value);
  }
  return values;
};

// a world mesh of one triangle with these corners, not offset
function triangleMesh(corners: Vec3[]): { vertices: WorldVertex[]; polygons: BuiltPolygon[]; zOffset: number } {
  const vertices = corners.map((at): WorldVertex => ({ at, colour: [0, 0, 0] }));
  return { vertices, polygons: [{ corners: [0, 1, 2], texinfo: 0, page: 0 }], zOffset: 0 };
}

describe("sort lists", () => {
  // three polygons whose far edges (towards +z) are at z 100, 500 and 900; the
  // camera moves along -z from 1000 to 600 in steps of 200
  const POLY_ZMAX = [100, 500, 900];
  const CAMERA_ZS = [1000, 800, 600];

  test("full lists at the ends, and changes between", () => {
    // LevelUpdate copies item 0 at the first point and item N at the last (N points), and steps between with items 1..N-1
    const items = slstItems([POLY_ZMAX], CAMERA_ZS, 200, 50);
    expect(items.length).toBe(CAMERA_ZS.length + 1);
    expect(items.map((item) => slstWords(item).type & 1)).toEqual([0, 1, 1, 0]);
  });

  test("each point lists only polygons in front of the camera", () => {
    // in front for the whole step to the next point: zmax < cam z - step - near
    const items = slstItems([POLY_ZMAX], CAMERA_ZS, 200, 50);
    const ids = [0, 1, 2].map((index) => polyId(0, index));
    const expected = [ids.slice(0, 2), ids.slice(0, 2), ids.slice(0, 1)];
    expect(slstWalk(items)).toEqual(expected);
    expect(slstWalk(items, false)).toEqual(expected);
  });

  test("walking the path either way gives each point's list", () => {
    // polygons coming into view and leaving it, in runs longer than a node holds (16)
    const zmax = range(0, 300).map((z) => z * 10);
    const zmid = range(0, 300).map((z) => (z * 37) % 300);
    const cameras = range(3500, 600, -170);
    const items = slstItems([zmax, zmax.slice(0, 40)], cameras, 170, 50, [zmid, zmid.slice(0, 40)]);
    const expected = cameras.map((camera) => slstWords(slstItems([zmax, zmax.slice(0, 40)], [camera], 170, 50, [zmid, zmid.slice(0, 40)])[0]).words);
    expect(slstWalk(items)).toEqual(expected);
    expect(slstWalk(items, false)).toEqual(expected);
  });

  test("changes go both ways", () => {
    const ids = range(1, 200);
    const everyOther = (step: number) => ids.filter((_, index) => index % step === 0);
    const cases = [
      [[], ids.slice(0, 30)], [ids.slice(0, 30), []], [ids.slice(0, 50), ids.slice(10, 60)], [everyOther(2), everyOther(3)],
      [[...ids.slice(5, 40), ...ids.slice(90, 120)], [...ids.slice(0, 20), ...ids.slice(30, 100), ...ids.slice(150)]], [ids, ids],
    ];
    for (const [before, after] of cases) {
      const item = slstChange(before, after);
      expect(slstDecode(item, before, true)).toEqual(after);
      expect(slstDecode(item, after, false)).toEqual(before);
    }
  });

  test("a long path fits in a page", () => {
    const zmax = range(0, 4000).map((z) => z * 8);
    const items = slstItems([zmax], range(32000, 0, -128), 128, 50);
    expect(items.reduce((sum, item) => sum + item.length, 0)).toBeLessThan(PAGE_SIZE / 2);
  });

  test("it lists polygons farthest first", () => {
    // the game draws a list in order with no depth test, so a near wall has to come after what's behind it
    const items = slstItems([[500, 100], [500]], [1000], 200, 50, [[250, 50], [500]]);
    expect(slstWords(items[0]).words).toEqual([polyId(0, 1), polyId(0, 0), polyId(1, 0)]);
  });

  test("it keeps the nearest polygons the game can list", () => {
    // custom levels' lists hold at most POLY_IDS_MAX polygons; the farthest (smallest z) are left out
    const ids = slstWords(slstItems([Array(3000).fill(0), Array(3000).fill(500)], [1000], 200, 50)[0]).words;
    expect(ids.length).toBe(POLY_IDS_MAX);
    expect(ids.filter((id) => id >> 12 === 1).length).toBe(3000); // all of the nearer world
  });

  test("it lists as many polygons as the game holds", () => {
    const slstH = readFileSync(fileURLToPath(new URL("../../../../src/slst.h", import.meta.url)), "utf8");
    const line = slstH.split(/\r?\n/).find((candidate) => candidate.startsWith("#define SLST_CUSTOM_POLY_IDS"))!;
    expect(Number(line.split(/\s+/)[2])).toBe(POLY_IDS_MAX);
  });

  test("a change at the end of a full list fits its node", () => {
    // a remove node holds the first place + 1 in 12 bits, and the run's length above them
    const full = range(0, POLY_IDS_MAX);
    const node = slstWords(slstChange(full, full.slice(0, -1))).words[2]; // the first remove node, after split and swaps
    expect(node & 0xfff).toBe(full.length);
    expect(node >> 12).toBe(0);
  });

  test("a zone's list takes in the next zone's meshes", () => {
    // the next zone is further along -z, so its meshes are offset by -16384 in this zone's frame, and come first
    const triangle = triangleMesh([[0, 0, 1000], [8, 0, 1000], [0, 0, 1008]]);
    const items = zoneSlstItems([triangle, { ...triangle, zOffset: -16384 }], [[0, 0, 3000]], 200);
    expect(slstWords(items[0]).words).toEqual([polyId(1, 0), polyId(0, 0)]);
  });

  test("a mesh drawn nearer (a mossy slide's plank) comes after polygons a little in front of it, as if it were nearer", () => {
    // the floor's middle at z 1300, the plank's at 1000: farthest first, the plank comes first,
    // but drawn 512 nearer it comes after the floor, which can't then cover it
    const floor = triangleMesh([[0, 0, 1200], [800, 0, 1200], [0, 0, 1500]]);
    const plank = triangleMesh([[0, 200, 990], [8, 200, 990], [0, 200, 1020]]);
    expect(slstWords(zoneSlstItems([floor, plank], [[0, 0, 3000]], 200)[0]).words).toEqual([polyId(1, 0), polyId(0, 0)]);
    expect(slstWords(zoneSlstItems([floor, { ...plank, nearer: 512 }], [[0, 0, 3000]], 200)[0]).words).toEqual([polyId(0, 0), polyId(1, 0)]);
  });

  test("a camera looking steeply down lists the floor reaching back under it", () => {
    // a floor triangle from z 2000 to 3500, the camera 1930 above it at z 3000:
    // level, the triangle reaches behind it; tilted 54 degrees down, it's all in front
    const meshes = [triangleMesh([[0, 0, 2000], [800, 0, 2000], [0, 0, 3500]])];
    const cameras: [number, number, number][] = [[0, 1930, 3000]];
    expect(slstWords(zoneSlstItems(meshes, cameras, 128)[0]).words).toEqual([]);
    expect(slstWords(zoneSlstItems(meshes, cameras, 128, (54 * Math.PI) / 180)[0]).words).toEqual([polyId(0, 0)]);
  });

  test("a camera looking down leaves out what is above and behind it", () => {
    const items = zoneSlstItems([triangleMesh([[0, 2400, 3200], [800, 2400, 3200], [0, 2400, 3500]])], [[0, 1930, 3000]], 128, (54 * Math.PI) / 180);
    expect(slstWords(items[0]).words).toEqual([]);
  });
});

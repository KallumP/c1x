import { describe, expect, test } from "vitest";
import type { CutEntity, CutLevel } from "../../../scripts/cutLevel/readCutLevel";
import { cutLevelObjects, platformPads } from "../../../scripts/cutLevel/objects";
import { cross, subtract, type Vec3 } from "../../../builder/vectors";

const entity = (type: number, subtype: number, at: Vec3, flags: [number, number, number] = [0, 0, 0]): CutEntity => ({ type, subtype, zone: "k0_4Z", at, flags });
const levelOf = (entities: CutEntity[]): CutLevel => ({ worlds: [], texturePages: new Map(), entities, solids: [] });
const OPTIONS = { centre: [0, 0, 0] as Vec3, halfWidth: 8000, scale: 400 };

describe("a cut level's objects", () => {
  const level = levelOf([
    entity(0, 0, [400, 800, 0]),       // crash
    entity(3, 2, [800, 400, -4000]),   // a basic box
    entity(3, 0, [800, 400, -8000]),   // a tnt box, the last along the route (-z)
  ]);

  test("crash's spawn is where his entity is, in blender", () => {
    expect(cutLevelObjects(level, OPTIONS).find(({ kind }) => kind === "spawn")!.at).toEqual([1, 0, 2]);
  });

  test("boxes are by their subtype, at their middles", () => {
    // a box's entity is its corner: half a box on across and along
    const boxes = cutLevelObjects(level, OPTIONS).filter(({ kind }) => kind === "box");
    expect(boxes.map(({ box }) => box)).toEqual(["basic", "tnt"]);
    expect(boxes[0].at).toEqual([(800 + 200) / 400, -(-4000 + 200) / 400, 1]);
  });

  test("the end is past the last box along the route, level with it", () => {
    const end = cutLevelObjects(level, OPTIONS).find(({ kind }) => kind === "end")!;
    const lastBox = cutLevelObjects(level, OPTIONS).filter(({ kind }) => kind === "box").at(-1)!;
    expect(end.at[1]).toBeGreaterThan(lastBox.at[1]);
    expect(end.at[2]).toBe(lastBox.at[2]);
  });
});

describe("a cut level's platforms (type 11, a box on each)", () => {
  const level = levelOf([entity(0, 0, [0, 0, 0]), entity(11, 0, [800, 340, -4000], [-70, 0, 0]), entity(3, 2, [800, 400, -4000])]);

  test("are fixed pads under their boxes", () => {
    // their tops where their boxes stand, under the boxes' middles
    const pads = platformPads(level, OPTIONS, "stone");
    const corners = pads.faces.flatMap((face) => face.corners);
    expect(Math.max(...corners.map(([, , z]) => z))).toBeCloseTo(400 / 400);
    const middle = [(800 + 200) / 400, -(-4000 + 200) / 400];
    const tops = corners.filter(([, , z]) => Math.abs(z - 1) < 1e-9);
    expect(tops.reduce((sum, [x]) => sum + x, 0) / tops.length).toBeCloseTo(middle[0]);
    expect(tops.reduce((sum, [, y]) => sum + y, 0) / tops.length).toBeCloseTo(middle[1]);
    expect(pads.faces.every(({ material }) => material === "stone")).toBe(true);
  });

  test("their tops face up, so crash can stand on them", () => {
    const tops = platformPads(level, OPTIONS, "stone").faces.filter(({ corners }) => corners.every(([, , z]) => Math.abs(z - 1) < 1e-9));
    expect(tops.length).toBeGreaterThan(0);
    tops.forEach(({ corners: [a, b, c] }) => expect(cross(subtract(b, a), subtract(c, a))[2]).toBeGreaterThan(0));
  });
});

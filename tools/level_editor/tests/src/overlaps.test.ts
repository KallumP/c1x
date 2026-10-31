import { describe, expect, test } from "vitest";
import { newObject } from "../../src/editor";
import type { LevelObject, Vec3 } from "../../src/objects";
import { overlappingBoxes, triangleTouchesBox } from "../../src/overlaps";

const SCALE = 400; // 1 m boxes
const box = (at: Vec3, extra: Partial<LevelObject> = {}): LevelObject => ({ ...newObject("basic", at), ...extra });
type Tri = [Vec3, Vec3, Vec3];

// a 1 m box from (0, 0, 0) to (1, 1, 1)
const MIN: Vec3 = [0, 0, 0];
const MAX: Vec3 = [1, 1, 1];

describe("triangleTouchesBox", () => {
  test("a triangle through the box does", () => {
    expect(triangleTouchesBox([[-1, 0.5, -1], [2, 0.5, -1], [0.5, 0.5, 3]], MIN, MAX)).toBe(true);
  });

  test("a triangle wholly inside it does", () => {
    expect(triangleTouchesBox([[0.2, 0.2, 0.2], [0.8, 0.2, 0.2], [0.5, 0.8, 0.5]], MIN, MAX)).toBe(true);
  });

  test("a triangle beside it doesn't", () => {
    expect(triangleTouchesBox([[2, 0, 0], [3, 0, 0], [2, 1, 1]], MIN, MAX)).toBe(false);
  });

  test("a triangle past a corner, though its bounds overlap the box's, doesn't", () => {
    expect(triangleTouchesBox([[1.5, -0.5, 0.5], [2.5, 0.5, 0.5], [1.5, 0.5, 0.5]], MIN, MAX)).toBe(false);
    expect(triangleTouchesBox([[0.8, 1.9, 0.5], [1.9, 0.8, 0.5], [1.9, 1.9, 0.5]], MIN, MAX)).toBe(false);
  });
});

describe("overlappingBoxes", () => {
  const floor: Tri[] = [[[-50, -50, 0], [50, -50, 0], [-50, 50, 0]], [[50, -50, 0], [50, 50, 0], [-50, 50, 0]]];

  test("a box standing on the floor is fine", () => {
    expect(overlappingBoxes([box([0, 0, 0])], SCALE, floor)).toEqual(new Set());
  });

  test("boxes side by side, touching, are fine", () => {
    expect(overlappingBoxes([box([0, 0, 0]), box([1, 0, 0])], SCALE, floor)).toEqual(new Set());
  });

  test("boxes in each other are both flagged", () => {
    expect(overlappingBoxes([box([0, 0, 0]), box([0.5, 0, 0]), box([5, 0, 0])], SCALE, [])).toEqual(new Set([0, 1]));
  });

  test("a box raised above another's stack is fine, and one raised into it isn't", () => {
    expect(overlappingBoxes([box([0, 0, 0], { stack: 2 }), box([0, 0, 0], { raise: 2 })], SCALE, [])).toEqual(new Set());
    expect(overlappingBoxes([box([0, 0, 0], { stack: 2 }), box([0, 0, 0], { raise: 1.5 })], SCALE, [])).toEqual(new Set([0, 1]));
  });

  test("a box in a wall is flagged", () => {
    const wall: Tri[] = [[[0.2, -5, 0], [0.2, 5, 0], [0.2, -5, 5]]];
    expect(overlappingBoxes([box([0, 0, 0]), box([3, 0, 0])], SCALE, wall)).toEqual(new Set([0]));
  });

  test("a box against a wall is fine", () => {
    const wall: Tri[] = [[[0.5, -5, 0], [0.5, 5, 0], [0.5, -5, 5]]];
    expect(overlappingBoxes([box([0, 0, 0])], SCALE, wall)).toEqual(new Set());
  });

  test("the spawn and end aren't boxes", () => {
    const objects = [newObject("spawn", [0, 0, 0]), newObject("end", [0, 0, 0]), box([0, 0, 0])];
    expect(overlappingBoxes(objects, SCALE, [])).toEqual(new Set());
  });
});

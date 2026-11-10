import { describe, expect, test } from "vitest";
import { newObject } from "../../src/editor";
import type { LevelObject, Vec3 } from "../../src/objects";
import { dropToFloor, floorAbove, overlappingBoxes, triangleTouchesBox } from "../../src/overlaps";

const SCALE = 400; // 1 m boxes
const box = (at: Vec3, extra: Partial<LevelObject> = {}): LevelObject => ({ ...newObject("basic", at), ...extra });
type Tri = [Vec3, Vec3, Vec3];

// a 1 m box from (0, 0, 0) to (1, 1, 1)
const MIN: Vec3 = [0, 0, 0];
const MAX: Vec3 = [1, 1, 1];

// a floor 100 m square at height 0, and a 2 m square step 1 m up in its middle
const FLOOR: Tri[] = [[[-50, -50, 0], [50, -50, 0], [-50, 50, 0]], [[50, -50, 0], [50, 50, 0], [-50, 50, 0]]];
const STEP: Tri[] = [[[-1, -1, 1], [1, -1, 1], [-1, 1, 1]], [[1, -1, 1], [1, 1, 1], [-1, 1, 1]]];

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

  test("a box standing on the floor is fine", () => {
    expect(overlappingBoxes([box([0, 0, 0])], SCALE, FLOOR)).toEqual(new Set());
  });

  test("boxes side by side, touching, are fine", () => {
    expect(overlappingBoxes([box([0, 0, 0]), box([1, 0, 0])], SCALE, FLOOR)).toEqual(new Set());
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

  // a pillar from (2, 2, 0) to (4, 4, 3), its top facing up (wound anticlockwise from above)
  const pillarTop: Tri[] = [[[2, 2, 3], [4, 2, 3], [4, 4, 3]], [[2, 2, 3], [4, 4, 3], [2, 4, 3]]];

  test("a box wholly inside a solid, touching none of its faces, is flagged", () => {
    expect(overlappingBoxes([box([3, 3, 0])], SCALE, pillarTop)).toEqual(new Set([0]));
  });

  test("a box under an overhang (a face looking down at it) is fine", () => {
    const overhang: Tri[] = pillarTop.map(([a, b, c]) => [a, c, b]);
    expect(overlappingBoxes([box([3, 3, 0])], SCALE, overhang)).toEqual(new Set());
  });

  test("a box beside a solid is fine", () => {
    expect(overlappingBoxes([box([6, 3, 0])], SCALE, pillarTop)).toEqual(new Set());
  });

  test("the spawn and end aren't checked", () => {
    const objects = [newObject("spawn", [0, 0, 0]), newObject("end", [0, 0, 0]), box([0, 0, 0])];
    expect(overlappingBoxes(objects, SCALE, [])).toEqual(new Set());
  });

  test("a box in the middle of a long wall is flagged", () => {
    const longWall: Tri[] = [[[0.2, -100, -1], [0.2, 100, -1], [0.2, 100, 3]], [[0.2, -100, -1], [0.2, 100, 3], [0.2, -100, 3]]];
    expect(overlappingBoxes([box([0, 0, 0]), box([0, 60, 0]), box([3, 60, 0])], SCALE, longWall)).toEqual(new Set([0, 1]));
  });

  test("a box deep inside a wide solid, far from its top's corners, is flagged", () => {
    const wideTop: Tri[] = [[[-100, -100, 3], [100, -100, 3], [100, 100, 3]], [[-100, -100, 3], [100, 100, 3], [-100, 100, 3]]];
    expect(overlappingBoxes([box([0, 0, 0]), box([40, -70, 0])], SCALE, wideTop)).toEqual(new Set([0, 1]));
  });
});

// a rolling floor of small triangles, 30 m across and 250 m along, and a box every 2.5 m along it:
// over 18000 triangles, the size of sunset_canyon
const BIG_LEVEL_WIDTH = 30;
const BIG_LEVEL_LENGTH = 250;
const CELL_ACROSS = 0.64; // each grid cell is two triangles
const CELL_ALONG = 1.28;
const BOX_COUNT = 100;
const BOX_SPACING = 2.5;

function bigLevel(): { triangles: Tri[]; boxes: LevelObject[] } {
  const height = (x: number, y: number) => 0.3 * Math.sin(x * 0.7) + 0.3 * Math.cos(y * 0.4);
  const point = (x: number, y: number): Vec3 => [x, y, height(x, y)];
  const triangles: Tri[] = [];
  for (let y = 0; y < BIG_LEVEL_LENGTH; y += CELL_ALONG) {
    for (let x = -BIG_LEVEL_WIDTH / 2; x < BIG_LEVEL_WIDTH / 2; x += CELL_ACROSS) {
      const [a, b, c, d] = [point(x, y), point(x + CELL_ACROSS, y), point(x + CELL_ACROSS, y + CELL_ALONG), point(x, y + CELL_ALONG)];
      triangles.push([a, b, c], [a, c, d]);
    }
  }
  const boxes = Array.from({ length: BOX_COUNT }, (_, k) => box([(k % 5) * 2 - 4, k * BOX_SPACING, 1]));
  return { triangles, boxes };
}

describe("overlappingBoxes on a big level", () => {
  const { triangles, boxes } = bigLevel();

  test("checks every box fast enough to keep up with a drag", () => {
    overlappingBoxes(boxes, SCALE, triangles); // the level's triangles are worked out once, as they load
    const start = performance.now();
    const flagged = overlappingBoxes(boxes, SCALE, triangles);
    // it takes a few milliseconds; testing every box against every triangle takes about two
    // seconds. the limit is far above the first, so a busy machine doesn't fail it, and far below the second
    expect(performance.now() - start).toBeLessThan(200);
    expect(flagged).toEqual(new Set());
  });

  test("flags boxes sunk into its floor", () => {
    const sunk = boxes.map((object, k) => (k % 10 === 0 ? { ...object, at: [object.at[0], object.at[1], -0.5] as Vec3 } : object));
    expect(overlappingBoxes(sunk, SCALE, triangles)).toEqual(new Set(Array.from({ length: 10 }, (_, k) => k * 10)));
  });
});

describe("dropToFloor", () => {
  const clips = (object: LevelObject, z: number, triangles: Tri[]) =>
    overlappingBoxes([{ ...object, at: [object.at[0], object.at[1], z] }], SCALE, triangles).size > 0;

  // the z it lands at doesn't clip, and 0.01 m lower does
  function expectJustAbove(object: LevelObject, triangles: Tri[]) {
    const z = dropToFloor(object, SCALE, triangles);
    expect(z).not.toBeNull();
    expect(clips(object, z!, triangles)).toBe(false);
    expect(clips(object, z! - 0.01, triangles)).toBe(true);
    return z!;
  }

  test("lowers a box above the floor until it's just above it", () => {
    expect(expectJustAbove(box([0, 0, 2]), FLOOR)).toBeCloseTo(0, 1);
  });

  test("raises a box in the floor until it's just above it", () => {
    expect(expectJustAbove(box([0, 0, -0.5]), FLOOR)).toBeCloseTo(0, 1);
  });

  test("lands on the highest floor below it", () => {
    expect(expectJustAbove(box([0, 0, 3]), [...FLOOR, ...STEP])).toBeCloseTo(1, 1);
  });

  test("counts the box's raise", () => {
    expect(expectJustAbove(box([0, 0, 2], { raise: 0.5 }), FLOOR)).toBeCloseTo(-0.5, 1);
  });

  test("goes past a wall through the box", () => {
    const wall: Tri[] = [[[0, -5, -5], [0, 5, -5], [0, -5, 5]], [[0, 5, -5], [0, 5, 5], [0, -5, 5]]];
    const z = dropToFloor(box([0, 0, 2]), SCALE, [...FLOOR, ...wall]);
    expect(z).toBeCloseTo(0, 1);
  });

  test("is null with no floor below it", () => {
    expect(dropToFloor(box([100, 100, 2]), SCALE, FLOOR)).toBeNull();
  });

  test("is rounded to the millimetre", () => {
    const z = dropToFloor(box([0, 0, 1.2345]), SCALE, FLOOR)!;
    expect(Math.round(z * 1000) / 1000).toBe(z);
  });
});

describe("floorAbove", () => {

  test("is how far a point under the ground is below the floor's surface", () => {
    expect(floorAbove([0, 0, -0.5], FLOOR)).toBeCloseTo(0.5);
  });

  test("is the nearest floor above: a step's top over the floor", () => {
    expect(floorAbove([0, 0, 0.25], [...FLOOR, ...STEP])).toBeCloseTo(0.75);
  });

  test("is null for a point above the ground", () => {
    expect(floorAbove([0, 0, 2], FLOOR)).toBeNull();
    expect(floorAbove([5, 5, 0.5], [...FLOOR, ...STEP])).toBeNull();
  });

  test("is null under an overhang: the face above is the underside of something", () => {
    const overhang: Tri[] = STEP.map(([a, b, c]) => [a, c, b]);
    expect(floorAbove([0, 0, 0.5], overhang)).toBeNull();
  });
});

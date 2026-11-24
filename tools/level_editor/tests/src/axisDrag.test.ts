import { describe, expect, test } from "vitest";
import {
  alongAxis,
  axisDragChanges,
  axisHandlesSpot,
  movedAlong,
  movedNodeAlong,
  type DragSettings,
} from "../../src/axisDrag";
import { newObject } from "../../src/editor";
import type { Triangle } from "../../src/overlaps";
import type { LevelObject } from "../../src/objects";
import { enemyObject, noMinusZero } from "../helpers";

describe("alongAxis", () => {
  test("a ray straight down onto the axis comes closest right under it", () => {
    expect(alongAxis([0, 0, 0], [1, 0, 0], [3, 5, 0], [0, -1, 0])).toBeCloseTo(3);
  });

  test("it's measured from the axis's origin", () => {
    expect(alongAxis([2, 0, 0], [1, 0, 0], [3, 5, 0], [0, -1, 0])).toBeCloseTo(1);
  });

  test("behind the origin is less than 0", () => {
    expect(alongAxis([0, 0, 0], [0, 0, 1], [1, 1, -4], [-1, -1, 0])).toBeCloseTo(-4);
  });

  test("a slanted ray that misses the axis comes closest where it passes over it", () => {
    expect(alongAxis([0, 0, 0], [0, 1, 0], [5, 2, 3], [-1, 0, 0])).toBeCloseTo(2);
  });

  test("a ray along the axis has no closest point", () => {
    expect(alongAxis([0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 0, 0])).toBeNull();
  });
});

describe("movedAlong", () => {
  const box = (more: Partial<LevelObject> = {}): LevelObject => ({ kind: "box", at: [1, 2, 3], raise: 0.5, stack: 1, box: "basic", ...more });

  test("along x moves its spot's x", () => {
    expect(movedAlong(box(), "x", 1.5, 0)).toEqual({ at: [2.5, 2, 3] });
  });

  test("along y moves its spot's y", () => {
    expect(movedAlong(box(), "y", -3, 0)).toEqual({ at: [1, -1, 3] });
  });

  test("up raises it, leaving its spot on the floor", () => {
    expect(movedAlong(box(), "up", 2, 0)).toEqual({ raise: 2.5 });
  });

  test("with a grid, it snaps to it", () => {
    expect(movedAlong(box(), "x", 1.3, 0.5)).toEqual({ at: [2.5, 2, 3] });
    expect(movedAlong(box(), "up", 0.8, 0.5)).toEqual({ raise: 1.5 });
  });

  test("it's rounded to the millimetre", () => {
    expect(movedAlong(box(), "x", 0.12345, 0)).toEqual({ at: [1.123, 2, 3] });
  });
});

describe("movedNodeAlong", () => {
  const crab = enemyObject("crab", { at: [1, 2, 3], raise: 0.5, path: [[0, 0, 0], [2, 0, 0]] });

  test("along x moves the node's x, and only that node", () => {
    expect(movedNodeAlong(crab, 1, "x", 1, 0, 0, 400)).toEqual({ path: [[0, 0, 0], [3, 0, 0]] });
  });

  test("along y moves the node's y", () => {
    expect(movedNodeAlong(crab, 0, "y", -2, 0, 0, 400)).toEqual({ path: [[0, -2, 0], [2, 0, 0]] });
  });

  test("up lifts the node", () => {
    expect(movedNodeAlong(crab, 1, "up", 0.25, 0, 0, 400)).toEqual({ path: [[0, 0, 0], [2, 0, 0.25]] });
  });

  test("with a grid, the node's spot in the level snaps to it", () => {
    expect(movedNodeAlong(crab, 1, "x", 1.3, 0.5, 0, 400)).toEqual({ path: [[0, 0, 0], [3.5, 0, 0]] });
  });

  test("an enemy without a path of its own gets its default path, with the node moved", () => {
    const { path } = movedNodeAlong(enemyObject("crab", { at: [0, 0, 0] }), 1, "x", 1, 0, 0, 400);
    expect(path?.map(noMinusZero)).toEqual([[-2, 0, 0], [3, 0, 0]]);
  });
});

describe("axisDragChanges", () => {
  // a flat floor 0.5 up, under everything near the origin
  const FLOOR: Triangle[] = [
    [[-5, -5, 0.5], [5, -5, 0.5], [5, 5, 0.5]],
    [[-5, -5, 0.5], [5, 5, 0.5], [-5, 5, 0.5]],
  ];
  const settings: DragSettings = { grid: 0, turn: 0, scale: 400, triangles: FLOOR };

  test("an object's drag moves the object", () => {
    const box = newObject("basic", [1, 2, 3]);
    expect(axisDragChanges({ object: box, node: null }, "x", 1, settings)).toEqual({ at: [2, 2, 3] });
  });

  test("an end pad's drag across the floor raises it over the floor where it lands", () => {
    const pad = newObject("end", [0, 0, 0]);
    expect(axisDragChanges({ object: pad, node: null }, "x", 1, settings).raise).toBeGreaterThan(0.5);
  });

  test("a path node's drag moves only that node", () => {
    const crab = enemyObject("crab", { path: [[0, 0, 0], [2, 0, 0]] });
    const changes = axisDragChanges({ object: crab, node: 1 }, "y", 1, settings);
    expect(changes).toEqual({ path: [[0, 0, 0], [2, 1, 0]] });
  });
});

describe("axisHandlesSpot", () => {
  test("an object's arrows are where it stands, raised", () => {
    const box = newObject("basic", [1, 2, 3]);
    expect(axisHandlesSpot({ ...box, raise: 0.5 }, null, 0, 400)).toEqual([1, 2, 3.5]);
  });

  test("a path node's arrows are at that node, in the level", () => {
    const crab = enemyObject("crab", { at: [1, 2, 3], path: [[0, 0, 0], [2, 0, 0]] });
    expect(axisHandlesSpot(crab, 1, 0, 400)).toEqual([3, 2, 3]);
  });
});

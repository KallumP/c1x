import { describe, expect, test } from "vitest";
import { DEFAULT_PATH_NODES, defaultPath, enemyPath, pathLength, pathPositions, respaced, withNodeAt } from "../../src/enemyPaths";
import type { LevelObject, Vec3 } from "../../src/objects";

const noMinusZero = (nodes: Vec3[]) => nodes.map((node) => node.map((value) => Math.round(value * 1000) / 1000 + 0));
const enemy = (type: "crab" | "turtle", more: Partial<LevelObject> = {}): LevelObject =>
  ({ kind: "enemy", enemy: type, at: [1, 2, 3], raise: 0, stack: 1, ...more });

describe("a crab's or turtle's default path", () => {
  test("a crab's: 1600 game units across the map, its middle where it stands, in equal steps", () => {
    expect(DEFAULT_PATH_NODES).toBe(5);
    expect(noMinusZero(defaultPath("crab", 0, 400))).toEqual([[-2, 0, 0], [-1, 0, 0], [0, 0, 0], [1, 0, 0], [2, 0, 0]]);
  });

  test("a turtle's: 2000 game units along the route, the way the camera faces", () => {
    expect(noMinusZero(defaultPath("turtle", 0, 400))).toEqual([[0, -2.5, 0], [0, -1.25, 0], [0, 0, 0], [0, 1.25, 0], [0, 2.5, 0]]);
  });

  test("turns with the level, and is longer in metres at a smaller scale", () => {
    expect(noMinusZero(defaultPath("turtle", 90, 200))).toEqual([[-5, 0, 0], [-2.5, 0, 0], [0, 0, 0], [2.5, 0, 0], [5, 0, 0]]);
    expect(noMinusZero(defaultPath("crab", 90, 400))).toEqual([[0, 2, 0], [0, 1, 0], [0, 0, 0], [0, -1, 0], [0, -2, 0]]);
  });
});

describe("an enemy's path", () => {
  test("is its own, or its default without one", () => {
    expect(enemyPath(enemy("crab", { path: [[0, 0, 0], [3, 0, 0]] }), 0, 400)).toEqual([[0, 0, 0], [3, 0, 0]]);
    expect(enemyPath(enemy("crab"), 0, 400)).toEqual(defaultPath("crab", 0, 400));
  });

  test("its nodes' places in blender: from where the enemy stands, raised", () => {
    expect(pathPositions(enemy("turtle", { raise: 0.5, path: [[0, -1, 0], [2, 1, 0.25]] }), 0, 400)).toEqual([[1, 1, 3.5], [3, 3, 3.75]]);
  });

  test("its length, along all its nodes", () => {
    expect(pathLength([[0, 0, 0], [3, 0, 0], [3, 4, 0]])).toBe(7);
  });
});

describe("respacing a path's nodes", () => {
  test("puts the given number evenly along it, from its first node to its last, keeping its shape", () => {
    expect(noMinusZero(respaced([[0, 0, 0], [3, 0, 0], [3, 3, 0]], 3))).toEqual([[0, 0, 0], [3, 0, 0], [3, 3, 0]]);
    expect(noMinusZero(respaced([[0, 0, 0], [3, 0, 0], [3, 3, 0]], 4))).toEqual([[0, 0, 0], [2, 0, 0], [3, 1, 0], [3, 3, 0]]);
    expect(noMinusZero(respaced([[0, 0, 0], [4, 0, 0]], 5))).toEqual([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0]]);
  });

  test("fewer nodes than it had: still from end to end", () => {
    expect(noMinusZero(respaced([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0]], 2))).toEqual([[0, 0, 0], [4, 0, 0]]);
  });

  test("a path with no length (all its nodes in one place) keeps them there", () => {
    expect(respaced([[1, 1, 0], [1, 1, 0]], 3)).toEqual([[1, 1, 0], [1, 1, 0], [1, 1, 0]]);
  });
});

describe("moving a node", () => {
  test("puts it at a place in blender, from where the enemy stands (raised), the rest of its path as it was", () => {
    const turtle = enemy("turtle", { raise: 0.5, path: [[0, -1, 0], [0, 1, 0]] });
    expect(withNodeAt(turtle, 1, [4, 5, 3.5], 0, 400)).toEqual([[0, -1, 0], [3, 3, 0]]);
  });

  test("an enemy without a path of its own gets its default path, with that node moved", () => {
    const moved = withNodeAt(enemy("crab"), 0, [1, 4, 3], 0, 400);
    expect(noMinusZero(moved)).toEqual([[0, 2, 0], [-1, 0, 0], [0, 0, 0], [1, 0, 0], [2, 0, 0]]);
  });
});

import { describe, expect, test } from "vitest";
import { newObject } from "../../src/editor";
import type { LevelObject, Vec3 } from "../../src/objects";
import { strayingPaths } from "../../src/pathWarnings";

const SCALE = 400;
type Tri = [Vec3, Vec3, Vec3];

// a floor from -5 to 5 m each way, facing up
const floor: Tri[] = [[[-5, -5, 0], [5, -5, 0], [-5, 5, 0]], [[5, -5, 0], [5, 5, 0], [-5, 5, 0]]];
// a wall across the floor at x 2.5
const wall: Tri[] = [[[2.5, -5, 0], [2.5, 5, 0], [2.5, -5, 5]]];
// a raised floor, 1 m up, from y 3 to 5
const ledge: Tri[] = [[[-5, 3, 1], [5, 3, 1], [-5, 5, 1]], [[5, 3, 1], [5, 5, 1], [-5, 5, 1]]];

const turtle = (path: Vec3[], at: Vec3 = [0, 0, 0]): LevelObject => ({ ...newObject("turtle", at), path });

describe("crabs' and turtles' paths that leave the floor or run through a wall", () => {
  test("a path on the floor, clear of walls, is fine", () => {
    expect(strayingPaths([turtle([[-2, 0, 0], [2, 0, 0], [2, 2, 0]])], 0, SCALE, [...floor, ...wall])).toEqual(new Set());
  });

  test("a path running off the edge of the floor is flagged", () => {
    expect(strayingPaths([turtle([[0, 0, 0], [7, 0, 0]])], 0, SCALE, floor)).toEqual(new Set([0]));
  });

  test("a path through a wall is flagged", () => {
    expect(strayingPaths([turtle([[0, 0, 0], [4, 0, 0]])], 0, SCALE, [...floor, ...wall])).toEqual(new Set([0]));
  });

  test("a path onto a raised floor, its nodes on each, is fine", () => {
    expect(strayingPaths([turtle([[0, 4, 1], [3, 4, 1]])], 0, SCALE, [...floor, ...ledge])).toEqual(new Set());
  });

  test("a path under a raised floor is flagged", () => {
    expect(strayingPaths([turtle([[0, 4, 0], [3, 4, 0]])], 0, SCALE, [...floor, ...ledge])).toEqual(new Set([0]));
  });

  test("a crab or turtle without a path of its own is checked along its default path", () => {
    const crab = newObject("crab", [4, 0, 0]); // 2 m each way across the map: off the floor at x 6
    expect(strayingPaths([crab, newObject("crab", [0, 0, 0])], 0, SCALE, floor)).toEqual(new Set([0]));
  });

  test("a camera robot's path rising off the floor is fine: it hovers", () => {
    const robot: LevelObject = { ...newObject("camera_robot", [0, 0, 0]), path: [[0, 0, 0], [0, 0, 3]] };
    expect(strayingPaths([robot], 0, SCALE, floor)).toEqual(new Set());
  });

  test("a camera robot's path through a wall is flagged", () => {
    const robot: LevelObject = { ...newObject("camera_robot", [0, 0, 0]), path: [[0, 0, 1], [4, 0, 1]] };
    expect(strayingPaths([robot], 0, SCALE, [...floor, ...wall])).toEqual(new Set([0]));
  });

  test("a bird's path rising off the floor is fine: it flies", () => {
    const bird: LevelObject = { ...newObject("bird", [0, 0, 0]), path: [[0, 0, 0], [0, 0, 3]] };
    expect(strayingPaths([bird], 0, SCALE, floor)).toEqual(new Set());
  });

  test("a flying camera's path rising off the floor is fine: it hovers", () => {
    const camera: LevelObject = { ...newObject("flying_camera", [0, 0, 0]), path: [[0, 0, 0], [0, 0, 3]] };
    expect(strayingPaths([camera], 0, SCALE, floor)).toEqual(new Set());
  });

  test("other objects aren't checked here", () => {
    expect(strayingPaths([newObject("plant", [9, 0, 0]), newObject("basic", [9, 0, 0])], 0, SCALE, floor)).toEqual(new Set());
  });
});

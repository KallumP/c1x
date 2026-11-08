import { describe, expect, test } from "vitest";
import { shapeBounds } from "../../src/enemyShapes";
import { CRASH_SHAPE, WARP_PAD_SHAPE } from "../../src/markerShapes";

describe("crash's shape, for the spawn", () => {
  test("stands on the floor, as tall as crash in the game (665), about a third as wide", () => {
    const { min, max } = shapeBounds(CRASH_SHAPE);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeCloseTo(665, -1);
    expect(max[0] - min[0]).toBeGreaterThan(180);
    expect(max[0] - min[0]).toBeLessThan(330);
    expect(min[0] + max[0]).toBeCloseTo(0); // the same both sides
  });

  test("faces +z: his nose is in front of his middle", () => {
    const noses = CRASH_SHAPE.filter((part) => part.name === "nose");
    expect(noses.length).toBeGreaterThan(0);
    expect(noses.every((part) => part.at[2] > 0)).toBe(true);
  });
});

describe("the warp pad's shape, for the end", () => {
  test("lies flat on the floor, as wide as the game's pad (radius 400)", () => {
    const { min, max } = shapeBounds(WARP_PAD_SHAPE);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeLessThan(200);
    expect(max[0] - min[0]).toBeCloseTo(800, -1);
    expect(max[2] - min[2]).toBeCloseTo(800, -1);
  });
});

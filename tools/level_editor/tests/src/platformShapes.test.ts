import { describe, expect, test } from "vitest";
import { shapeBounds } from "../../src/enemyShapes";
import { PLATFORM_SHAPES } from "../../src/platformShapes";
import { OBSTACLE_TYPES } from "../../src/objects";

type Range = readonly [number, number];

function expectWithin(value: number, [low, high]: Range): void {
  expect(value).toBeGreaterThan(low);
  expect(value).toBeLessThan(high);
}

describe("platform shapes", () => {
  // the sizes of up the creek's models, in game units: its lily pad Rl1fG (its
  // first frame in Rl1fV) and its floating leaf RB1fG (its first frame in RB1fV)
  test.each([
    { platform: "lily_pad", top: [80, 130], across: [1000, 1130], long: [1000, 1130] },
    { platform: "leaf", top: [280, 460], across: [800, 920], long: [1200, 1360] },
  ] as const)("a $platform is as big as the game's, on its spot", ({ platform, top, across, long }) => {
    const { min, max } = shapeBounds(PLATFORM_SHAPES[platform]);
    expect(Math.round(min[1])).toBe(0);
    expectWithin(max[1], top);
    expectWithin(max[0] - min[0], across);
    expectWithin(max[2] - min[2], long);
  });

  test("every platform has a shape", () => {
    OBSTACLE_TYPES.forEach((platform) => expect(PLATFORM_SHAPES[platform].length).toBeGreaterThan(0));
  });
});

import { describe, expect, test } from "vitest";
import { shapeBounds } from "../../src/enemyShapes";
import { OBSTACLE_SHAPES } from "../../src/obstacleShapes";
import { OBSTACLE_TYPES } from "../../src/objects";

type Range = readonly [number, number];

function expectWithin(value: number, [low, high]: Range): void {
  expect(value).toBeGreaterThan(low);
  expect(value).toBeLessThan(high);
}

describe("obstacle shapes", () => {
  // the sizes of the game's models, in game units: up the creek's lily pad Rl1fG
  // (its first frame in Rl1fV) and floating leaf RB1fG (its first frame in
  // RB1fV), and the great gate's wooden peg WP1iG, flipped out as a step (WP1iV), its spot its middle
  test.each([
    { obstacle: "lily_pad", bottom: 0, top: [80, 130], across: [1000, 1130], long: [1000, 1130] },
    { obstacle: "leaf", bottom: 0, top: [280, 460], across: [800, 920], long: [1200, 1360] },
    { obstacle: "wooden_peg", bottom: -119, top: [90, 140], across: [690, 800], long: [1060, 1200] },
  ] as const)("a $obstacle is as big as the game's, about its spot as the game's", ({ obstacle, bottom, top, across, long }) => {
    const { min, max } = shapeBounds(OBSTACLE_SHAPES[obstacle]);
    expectWithin(min[1], [bottom - 15, bottom + 15]);
    expectWithin(max[1], top);
    expectWithin(max[0] - min[0], across);
    expectWithin(max[2] - min[2], long);
  });

  test("every obstacle but the rolling stone and mossy slide (drawn as their track and slope) has a shape", () => {
    OBSTACLE_TYPES.filter((obstacle) => obstacle !== "rolling_stone" && obstacle !== "mossy_slide")
      .forEach((obstacle) => expect(OBSTACLE_SHAPES[obstacle].length).toBeGreaterThan(0));
  });
});

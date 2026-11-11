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
  // RB1fV), and the great gate's wooden peg WP1iG, flipped out as a step (WP1iV), its spot its middle,
  // and its spiked log SL1iG (800 across, 738 long, 2800 tall), at the far end
  // of its push: a rising one's top 1700 up out of the floor (by a stack of boxes
  // in the game), a falling one down on the floor (the arrows over them left out)
  test.each([
    { obstacle: "lily_pad", bottom: 0, top: [80, 130], across: [1000, 1130], long: [1000, 1130] },
    { obstacle: "leaf", bottom: 0, top: [280, 460], across: [800, 920], long: [1200, 1360] },
    { obstacle: "wooden_peg", bottom: -119, top: [90, 140], across: [690, 800], long: [1060, 1200] },
    { obstacle: "rising_spiked_log", bottom: 0, top: [1650, 1850], across: [740, 860], long: [680, 800] },
    { obstacle: "falling_spiked_log", bottom: 0, top: [2700, 2900], across: [740, 860], long: [680, 800] },
    { obstacle: "fire_pit", bottom: -68, top: [220, 260], across: [460, 530], long: [760, 830] },
    // boulder dash's pillar PlPeG: 1209 across, 1148 long, its top at its spot and 2407 down
    { obstacle: "dropping_pillar", bottom: -2407, top: [-10, 30], across: [1150, 1260], long: [1100, 1200] },
    { obstacle: "sliding_pillar", bottom: -2407, top: [-10, 30], across: [1150, 1260], long: [1100, 1200] },
  ] as const)("a $obstacle is as big as the game's, about its spot as the game's", ({ obstacle, bottom, top, across, long }) => {
    const { min, max } = shapeBounds(OBSTACLE_SHAPES[obstacle].filter((part) => part.name !== "arrow"));
    expectWithin(min[1], [bottom - 15, bottom + 15]);
    expectWithin(max[1], top);
    expectWithin(max[0] - min[0], across);
    expectWithin(max[2] - min[2], long);
  });

  // a part's height: its middle, up from the floor
  const partHeight = (obstacle: "rising_spiked_log" | "falling_spiked_log", name: string) => OBSTACLE_SHAPES[obstacle].find((part) => part.name === name)!.at[1];

  test("a rising spiked log's point is at its top, and a falling one's at its bottom, on the floor it comes down on", () => {
    expect(partHeight("rising_spiked_log", "point")).toBeGreaterThan(1500);
    expect(partHeight("falling_spiked_log", "point")).toBeLessThan(200);
  });

  test("an arrow over each spiked log points the way it pushes: up out of the floor, or down onto it", () => {
    const arrowTurn = (obstacle: "rising_spiked_log" | "falling_spiked_log") =>
      OBSTACLE_SHAPES[obstacle].filter((part) => part.name === "arrow" && part.kind === "rod" && part.radiusTop === 0).map((part) => part.turn?.[0] ?? 0);
    expect(arrowTurn("rising_spiked_log")).toEqual([0]);
    expect(arrowTurn("falling_spiked_log")).toEqual([Math.PI]);
    expect(partHeight("rising_spiked_log", "arrow")).toBeGreaterThan(1850);
    expect(partHeight("falling_spiked_log", "arrow")).toBeGreaterThan(2900);
  });

  test("a fire pit's bowl is out towards the player from its spot, as the game's (WT1iG, 8 to 801 along z)", () => {
    const { min, max } = shapeBounds(OBSTACLE_SHAPES.fire_pit);
    expectWithin(min[2], [-10, 30]);
    expectWithin(max[2], [780, 820]);
  });

  test("every obstacle but the rolling stone and mossy slide (drawn as their track and slope) has a shape", () => {
    OBSTACLE_TYPES.filter((obstacle) => obstacle !== "rolling_stone" && obstacle !== "mossy_slide")
      .forEach((obstacle) => expect(OBSTACLE_SHAPES[obstacle].length).toBeGreaterThan(0));
  });
});

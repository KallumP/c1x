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
    // and its gates: JB4eG, 903 across and 1554 tall, and JB3eG, 2377 across and 437 tall, standing on its spot
    { obstacle: "tall_thin_gate", bottom: 0, top: [1500, 1600], across: [860, 950], long: [200, 290] },
    { obstacle: "low_wide_gate", bottom: 0, top: [400, 480], across: [2300, 2450], long: [240, 330] },
    // sunset vista's pushing block, Rp7wG (800 across, 1600 tall, 2000 out towards the player; two panels on its face), and its
    // pushing platform Rw3wG (741 across, 178 thick, 1838 out), each pushed out
    { obstacle: "pushing_block", bottom: 0, top: [1550, 1650], across: [760, 840], long: [1950, 2050] },
    { obstacle: "pushing_platform", bottom: -206, top: [-60, 0], across: [700, 780], long: [1790, 1890] },
    // sunset vista's dropping platform Rw2wG: a slab 742 across, 172 thick, just under its spot, 1039 out towards the player
    { obstacle: "dropping_platform", bottom: -203, top: [-45, -15], across: [700, 780], long: [1000, 1080] },
    // the lost city's falling platform PlDwG: a carved slab 969 x 969 across, its top at its spot, 444 deep
    { obstacle: "falling_platform", bottom: -444, top: [-10, 30], across: [930, 1010], long: [930, 1010] },
    // sunset vista's seesaw: four blocks (Rp4wG, 600 x 600, 800 out), two either side of its spot at 800 and 1600
    { obstacle: "seesaw", bottom: -600, top: [-10, 30], across: [3700, 3900], long: [760, 840] },
    // road to nowhere's plank BD1kG: 1200 across, 350 deep, 50 thick, its top at its spot
    { obstacle: "timed_plank", bottom: -50, top: [-10, 30], across: [1160, 1240], long: [320, 380] },
    // and its plank BE1kG, the same size
    { obstacle: "breaking_plank", bottom: -50, top: [-10, 30], across: [1160, 1240], long: [320, 380] },
    // temple ruins' rotating peg Ra1sG: a stone column 953 across, its top at its spot and 3203 down
    { obstacle: "rotating_pegs", bottom: -3203, top: [-10, 30], across: [900, 1000], long: [900, 1000] },
    // slippery climb's lift platform PlUyG: a slab 802 x 797 across, its top at its spot, 338 thick
    { obstacle: "lift_platform", bottom: -338, top: [-10, 30], across: [760, 840], long: [760, 840] },
    // temple ruins' slamming walls, its two halves (RcRsG, RcLsG: 1200 across, 1031 tall, 606 deep) shut, meeting at its spot
    { obstacle: "slamming_walls", bottom: 0, top: [1000, 1060], across: [2350, 2450], long: [580, 640] },
    // temple ruins' rising pillar PlUsG: 953 across, its top at its spot and 3203 down
    { obstacle: "rising_pillar", bottom: -3203, top: [-10, 30], across: [900, 1000], long: [900, 1000] },
    // and its carrying platform PlPsG: 794 across, its top at its spot and 481 down
    { obstacle: "carrying_platform", bottom: -481, top: [-10, 30], across: [750, 840], long: [750, 840] },
    // castle machinery's bounce pad PoSpG: a spring 719 x 725 across, 175 tall on its spot
    { obstacle: "bounce_pad", bottom: 0, top: [160, 190], across: [690, 750], long: [690, 750] },
    // castle machinery's steam vent has no model (its pipe is its level's): a grate 500 across on its spot, its steam 1600 up
    { obstacle: "steam_vent", bottom: 0, top: [1550, 1650], across: [450, 550], long: [450, 550] },
    // slippery climb's moving platform PlPyG: a slab 802 x 797 across, its top at its spot, 403 thick
    { obstacle: "moving_platform", bottom: -403, top: [-10, 30], across: [760, 840], long: [760, 840] },
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

  test.each(["tall_thin_gate", "low_wide_gate"] as const)("a %s has an arrow on the floor in front of it, pointing the way it falls: towards the player", (gate) => {
    const arrow = OBSTACLE_SHAPES[gate].filter((part) => part.name === "arrow");
    const { min, max } = shapeBounds(arrow);
    expect(arrow.length).toBeGreaterThan(0);
    expect(min[2]).toBeGreaterThan(100); // in front of the gate
    expect(max[1]).toBeLessThan(60);     // flat on the floor
    const head = arrow.find((part) => part.kind === "rod" && part.radiusTop === 0)!;
    expect(head.turn).toEqual([Math.PI / 2, 0, 0]); // its point along +z
    expect(head.at[2]).toBe(max[2] - (head.kind === "rod" ? head.length / 2 : 0));
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

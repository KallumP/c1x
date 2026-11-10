import { describe, expect, test } from "vitest";
import { framesToLand, handOffset, LAB_ASSISTANT_REACH, throwFlags, vialHeights } from "../../src/labAssistantThrow";
import { expectNear } from "../helpers";

// these tests mirror the game's vial physics on purpose: it's what the throw is worked out from
const STEP = 34 / 1024; // how far a vial goes each frame, of its speed

// facings: an angle, 4096 a turn, 0 along the game's +z
const FACING_MINUS_X = -1024;
const FACING_PLUS_Z = 0;
const FACING_135_DEGREES = 1536;

describe("a lab assistant's vials (as seen in the game)", () => {
  test("land sooner on higher ground and later on lower", () => {
    // 21 frames after they're thrown on flat ground
    expect(framesToLand(0)).toBe(21);
    expect(framesToLand(1000)).toBeLessThan(21);
    expect(framesToLand(-1000)).toBeGreaterThan(21);
  });

  test("the vial leaves its hand, turning with its facing", () => {
    // 148 in front of it and 234 to its side, then 200 back along the game's z, as seen in the game
    const seen = [
      { facing: FACING_MINUS_X, hand: [-148.4, 34.4] },
      { facing: FACING_PLUS_Z, hand: [234.4, -51.6] },
      { facing: FACING_135_DEGREES, hand: [-60.8, -470.8] },
    ];
    seen.forEach(({ facing, hand }) => expectNear(handOffset(facing), hand, 1));
  });

  test("fly up from its hand and down until they're below the landing spot", () => {
    // a height each frame, from 1211 over its feet
    const heights = vialHeights(0);
    expect(heights.length).toBe(framesToLand(0) + 1);
    expect(heights[0]).toBe(1211);
    expect(Math.max(...heights)).toBeGreaterThan(1500);
    expect(heights.at(-1)!).toBeLessThan(0);
    expect(heights.at(-2)!).toBeGreaterThanOrEqual(0);
  });
});

describe("a lab assistant's init flags to throw to a landing spot", () => {
  // where a vial thrown with flags from spot lands on ground at landing's height, as the game moves it
  const landsAt = (spot: [number, number, number], landing: [number, number, number]) => {
    const [facing, alongX, alongZ] = throwFlags(spot, landing);
    const [handX, handZ] = handOffset(facing);
    const frames = framesToLand(landing[1] - spot[1]);
    return [spot[0] + handX + alongX * frames * STEP, spot[2] + handZ + alongZ * frames * STEP];
  };

  test("face the landing spot", () => {
    expect(throwFlags([0, 0, 0], [0, 0, 2000])[0]).toBe(FACING_PLUS_Z);
    expect(throwFlags([0, 0, 0], [-2000, 0, 0])[0]).toBe(FACING_MINUS_X);
    expect(throwFlags([0, 0, 0], [1000, 0, -1000])[0]).toBe(FACING_135_DEGREES);
  });

  test("throw from its hand to land there, on flat ground or lower", () => {
    // near enough: within 40 game units
    const spots: [number, number, number][] = [[0, 0, 2000], [-1878, 0, 0], [1600, 0, -1600], [3000, -800, 500]];
    spots.forEach((landing) => {
      const [x, z] = landsAt([100, 0, 200], [landing[0] + 100, landing[1], landing[2] + 200]);
      expect(Math.abs(x - (landing[0] + 100))).toBeLessThan(40);
      expect(Math.abs(z - (landing[2] + 200))).toBeLessThan(40);
    });
  });

  test("throw as far as the game's own throw", () => {
    // stormy ascent's first: about 2480 along -x
    const [facing, alongX, alongZ] = throwFlags([0, 0, 0], [-LAB_ASSISTANT_REACH, 0, 0]);
    expect(facing).toBe(FACING_MINUS_X);
    expect(Math.abs(alongX + 2480)).toBeLessThanOrEqual(2);
    expect(Math.abs(alongZ)).toBeLessThan(60);
  });

  test("don't throw at a landing spot right under it", () => {
    // facing as stormy ascent's first
    expect(throwFlags([5, 0, 5], [5, 0, 5])).toEqual([FACING_MINUS_X, 0, 0]);
  });
});

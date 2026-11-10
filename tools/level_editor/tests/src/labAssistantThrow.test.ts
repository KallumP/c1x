import { describe, expect, test } from "vitest";
import { framesToLand, handOffset, LAB_ASSISTANT_REACH, throwFlags, vialHeights } from "../../src/labAssistantThrow";

const STEP = 34 / 1024; // how far a vial goes each frame, of its speed

describe("a lab assistant's vials (as seen in the game)", () => {
  test("land 21 frames after they're thrown on flat ground, sooner on higher ground and later on lower", () => {
    expect(framesToLand(0)).toBe(21);
    expect(framesToLand(1000)).toBeLessThan(21);
    expect(framesToLand(-1000)).toBeGreaterThan(21);
  });

  test("leave its hand 148 in front of it and 234 to its side, turning as it faces, then 200 back along the game's z (as seen facing -x, +z and 135 degrees round)", () => {
    const seen: [number, [number, number]][] = [[-1024, [-148.4, 34.4]], [0, [234.4, -51.6]], [1536, [-60.8, -470.8]]];
    seen.forEach(([facing, [x, z]]) => {
      const [handX, handZ] = handOffset(facing);
      expect(Math.abs(handX - x)).toBeLessThan(1);
      expect(Math.abs(handZ - z)).toBeLessThan(1);
    });
  });

  test("fly up from its hand (1211 over its feet) and down, a height each frame, until they're below the landing spot", () => {
    const heights = vialHeights(0);
    expect(heights.length).toBe(framesToLand(0) + 1);
    expect(heights[0]).toBe(1211);
    expect(Math.max(...heights)).toBeGreaterThan(1500);
    expect(heights.at(-1)!).toBeLessThan(0);
    expect(heights.at(-2)!).toBeGreaterThanOrEqual(0);
  });

  test("thrown as stormy ascent's first (2480 along -x) land about 1878 off on flat ground", () => {
    expect(Math.round(LAB_ASSISTANT_REACH)).toBe(1878);
  });
});

describe("a lab assistant's init flags to throw to a landing spot", () => {
  // where a vial thrown with flags from spot lands on ground at landing's height
  const landsAt = (spot: [number, number, number], landing: [number, number, number]) => {
    const [facing, alongX, alongZ] = throwFlags(spot, landing);
    const [handX, handZ] = handOffset(facing);
    const frames = framesToLand(landing[1] - spot[1]);
    return [spot[0] + handX + alongX * frames * STEP, spot[2] + handZ + alongZ * frames * STEP];
  };

  test("face it (an angle, 4096 a turn, 0 along the game's +z)", () => {
    expect(throwFlags([0, 0, 0], [0, 0, 2000])[0]).toBe(0);
    expect(throwFlags([0, 0, 0], [-2000, 0, 0])[0]).toBe(-1024);
    expect(throwFlags([0, 0, 0], [1000, 0, -1000])[0]).toBe(1536);
  });

  test("throw from its hand to land there, near enough, on flat ground or lower", () => {
    const spots: [number, number, number][] = [[0, 0, 2000], [-1878, 0, 0], [1600, 0, -1600], [3000, -800, 500]];
    spots.forEach((landing) => {
      const [x, z] = landsAt([100, 0, 200], [landing[0] + 100, landing[1], landing[2] + 200]);
      expect(Math.abs(x - (landing[0] + 100))).toBeLessThan(40);
      expect(Math.abs(z - (landing[2] + 200))).toBeLessThan(40);
    });
  });

  test("throw as stormy ascent's first to land where its vials land: about 2480 along -x", () => {
    const [facing, alongX, alongZ] = throwFlags([0, 0, 0], [-LAB_ASSISTANT_REACH, 0, 0]);
    expect(facing).toBe(-1024);
    expect(Math.abs(alongX + 2480)).toBeLessThanOrEqual(2);
    expect(Math.abs(alongZ)).toBeLessThan(60);
  });

  test("a landing spot right under it: facing as stormy ascent's first, not throwing", () => {
    expect(throwFlags([5, 0, 5], [5, 0, 5])).toEqual([-1024, 0, 0]);
  });
});
